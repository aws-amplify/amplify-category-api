/* eslint-disable testing-library/await-async-utils */
import { join, parse } from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { types } from 'util';
import retimer from 'retimer';
import * as pty from 'node-pty';
import chalk from 'chalk';
import _ from 'lodash';
import strip from 'strip-ansi';


// https://notes.burke.libbey.me/ansi-escape-codes/
const KEY_UP_ARROW = '\x1b[A';
const KEY_DOWN_ARROW = '\x1b[B';
// https://donsnotes.com/tech/charsets/ascii.html
const CONTROL_C = '\x03';
const CONTROL_A = '\x01';
const SPACE_BAR = '\x20';
const DEFAULT_NO_OUTPUT_TIMEOUT = process.env.AMPLIFY_TEST_TIMEOUT_SEC
  ? Number.parseInt(process.env.AMPLIFY_TEST_TIMEOUT_SEC, 10) * 1000
  : 1 * 60 * 1000; // 30s
const EXIT_CODE_TIMEOUT = 2;
const EXIT_CODE_GENERIC_ERROR = 3;

const RETURN = os.EOL;

type RecordingHeader = {
  version: 2;
  width: number;
  height: number;
  timestamp: number | null;
  title: string;
  env: any;
};

type RecordingFrame = [number, 'o' | 'i', string];

type Recording = {
  header: RecordingHeader;
  frames: RecordingFrame[];
};

class Recorder {
  private isPaused: boolean = false;
  private childProcess: pty.IPty;
  private onDataHandlers: ((data: string) => void)[] = [];
  private onExitHandlers: ((exitCode: number, signal: string | number) => void)[] = [];
  private startTime: number;
  private recording: Recording;
  private cwd: string;
  private exitCode: number | undefined;
  constructor(
    private cmd: string,
    private args: string[],
    private options: any,
    cwd?: string,
    private cols: number = 120,
    private rows: number = 30,
  ) {
    this.exitCode = undefined;
    this.cwd = options.cwd || process.cwd();
    this.recording = {
      header: {
        version: 2,
        width: cols,
        height: rows,
        timestamp: null,
        title: 'Recording',
        env: {},
      },
      frames: [],
    };
  }

  run() {
    this.startTime = Date.now();
    if (this.exitCode !== undefined) {
      throw new Error('Already executed. Please start a new instance');
    }
    this.childProcess = pty.spawn(this.cmd, this.args, {
      name: 'xterm-color',
      cols: this.cols,
      rows: this.rows,
      cwd: this.cwd,
      shell: true,
      // Do not set useConpty. node-pty is smart enough to set it to true only on versions of Windows that support it.
      // useConpty: true,
      ...this.options,
    });
    this.addFrame(this.renderPrompt(this.cwd, this.cmd, this.args));
    this.childProcess.onData(this.onData.bind(this));
    this.childProcess.onExit(this.onExit.bind(this));
  }

  write(data: string): void {
    if (this.childProcess && this.exitCode === undefined) {
      this.childProcess.write(data);
      return;
    }
    throw new Error('Can not write data. Program is either already executed or has not been run');
  }

  addOnDataHandler(fn: (content: string) => void) {
    this.onDataHandlers.push(fn);
  }

  addOnExitHandlers(fn: (code: number, signal: string | number) => void) {
    this.onExitHandlers.push(fn);
  }
  removeOnExitHandlers(fn: (code: number, signal: string | number) => void): boolean {
    const idx = this.onExitHandlers.indexOf(fn);
    if (idx === -1) {
      return false;
    }
    this.onExitHandlers.splice(idx, 1);
    return true;
  }

  getRecording(): string {
    return [JSON.stringify(this.recording.header), ...this.recording.frames.map(frame => JSON.stringify(frame))].join('\n');
  }

  getRecordingFrames(): Readonly<RecordingFrame[]> {
    return [...this.recording.frames];
  }

  pauseRecording(): void {
    this.isPaused = true;
  }

  kill() {
    this.childProcess.kill();
  }

  sendEof() {
    this.childProcess.write('\x04'); // ^D
  }

  resumeRecording(): void {
    this.isPaused = false;
  }

  private onData(data: string) {
    if (!this.isPaused) {
      this.addFrame(data);
    }
    for (let handler of this.onDataHandlers) {
      try {
        handler(data);
      } catch (e) {
        // swallow
      }
    }
  }

  private onExit(status: { exitCode: number; signal: string | number }) {
    this.exitCode = status.exitCode;
    const length = (Date.now() - this.startTime) / 1000;
    this.addFrame(this.renderPrompt(this.cwd));
    this.recording.header.timestamp = length;
    for (let handler of this.onExitHandlers) {
      try {
        handler(this.exitCode, status.signal);
      } catch (e) {
        // don't crash the recorder
      }
    }
  }

  private addFrame(data: string) {
    this.recording.frames.push([(Date.now() - this.startTime) / 1000, 'o', data]);
  }

  private renderPrompt(cwd: string, cmd?: string, args?: string[]) {
    const separator = '\u2b80';
    const basePrompt = `${chalk.bgBlack('user@host') + chalk.black(separator)}${chalk.bgBlue(cwd) + chalk.blue(separator)}`;
    const cmdPrompt = cmd ? `${cmd} ${args?.length ? args?.join(' ') : ''}` : '';
    return `${basePrompt} ${cmdPrompt}\r\n`;
  }
}

type ExecutionStep = {
  fn: (data: string) => boolean;
  shift: boolean;
  description: string;
  requiresInput: boolean;
  name: string;
  expectation?: any;
};

type Context = {
  command: string;
  cwd: string | undefined;
  env: any | undefined;
  ignoreCase: boolean;
  params: string[];
  queue: ExecutionStep[];
  stripColors: boolean;
  process: Recorder | undefined;
  noOutputTimeout: number;
  getRecording: () => string;
};

type ExecutionContext = {
  expect: (expectation: string | RegExp) => ExecutionContext;
  pauseRecording: () => ExecutionContext;
  resumeRecording: () => ExecutionContext;
  wait: (expectation: string | RegExp, cb?: (data: string) => void) => ExecutionContext;
  sendLine: (line: string) => ExecutionContext;
  sendCarriageReturn: () => ExecutionContext;
  send: (line: string) => ExecutionContext;
  sendKeyDown: (repeat?: number) => ExecutionContext;
  sendKeyUp: (repeat?: number) => ExecutionContext;
  /**
   * @deprecated If using `@aws-amplify/amplify-prompts` sending a newline after 'y' is not required and could cause problems. Use `sendYes` instead.
   */
  sendConfirmYes: () => ExecutionContext;
  sendYes: () => ExecutionContext;
  /**
   * @deprecated If using `@aws-amplify/amplify-prompts` sending a newline after 'n' is not required and could cause problems. Use `sendNo` instead.
   */
  sendConfirmNo: () => ExecutionContext;
  sendNo: () => ExecutionContext;
  sendCtrlC: () => ExecutionContext;
  sendCtrlA: () => ExecutionContext;
  sendEof: () => ExecutionContext;
  delay: (milliseconds: number) => ExecutionContext;
  /**
   * @deprecated Use runAsync
   */
  run: (cb: (err: any, signal?: any) => void) => ExecutionContext;
  runAsync: () => Promise<void>;
};

type SpawnOptions = {
  noOutputTimeout?: number;
  cwd?: string | undefined;
  env?: object | any;
  stripColors?: boolean;
  ignoreCase?: boolean;
  disableCIDetection?: boolean;
};

const isTestingWithLatestCodebase = (scriptRunnerPath: string) => {
  return scriptRunnerPath === process.execPath;
}

const testExpectation = (data: string, expectation: string | RegExp, context: Context): boolean => {
  if (types.isRegExp(expectation)) {
    return expectation.test(data);
  } else if (context.ignoreCase) {
    return data.toLowerCase().indexOf(expectation.toLowerCase()) > -1;
  } else {
    return data.indexOf(expectation) > -1;
  }
};

const chain = (context: Context): ExecutionContext => {
  const partialExecutionContext = {
    pauseRecording: (): ExecutionContext => {
      let _pauseRecording: ExecutionStep = {
        fn: () => {
          context.process?.pauseRecording();
          return true;
        },
        name: '_pauseRecording',
        shift: true,
        description: '[pauseRecording]',
        requiresInput: true,
      };
      context.queue.push(_pauseRecording);

      return chain(context);
    },
    resumeRecording: (): ExecutionContext => {
      let _resumeRecording: ExecutionStep = {
        fn: data => {
          context.process?.resumeRecording();
          return true;
        },
        name: '_resumeRecording',
        shift: true,
        description: '[resumeRecording]',
        requiresInput: false,
      };
      context.queue.push(_resumeRecording);

      return chain(context);
    },
    expect: function (expectation: string | RegExp): ExecutionContext {
      let _expect: ExecutionStep = {
        fn: data => {
          return testExpectation(data, expectation, context);
        },
        name: '_expect',
        shift: true,
        description: `[expect] ${expectation}`,
        requiresInput: true,
        expectation: expectation,
      };
      context.queue.push(_expect);

      return chain(context);
    },

    wait: function (expectation: string | RegExp, callback = (data: string) => {}): ExecutionContext {
      let _wait: ExecutionStep = {
        fn: data => {
          var val = testExpectation(data, expectation, context);
          if (val === true && typeof callback === 'function') {
            callback(data);
          }
          return val;
        },
        name: '_wait',
        shift: false,
        description: `[wait] ${expectation}`,
        requiresInput: true,
        expectation: expectation,
      };
      context.queue.push(_wait);
      return chain(context);
    },
    sendLine: function (line: string): ExecutionContext {
      let _sendline: ExecutionStep = {
        fn: () => {
          context.process?.write(`${line}${RETURN}`);
          return true;
        },
        name: '_sendline',
        shift: true,
        description: `[sendline] ${line}`,
        requiresInput: false,
      };
      context.queue.push(_sendline);
      return chain(context);
    },
    sendCarriageReturn: function (): ExecutionContext {
      let _sendline: ExecutionStep = {
        fn: () => {
          context.process?.write(RETURN);
          return true;
        },
        name: '_sendline',
        shift: true,
        description: '[sendline] <CR>',
        requiresInput: false,
      };
      context.queue.push(_sendline);
      return chain(context);
    },
    send: function (line: string): ExecutionContext {
      var _send: ExecutionStep = {
        fn: () => {
          context.process?.write(line);
          return true;
        },
        name: '_send',
        shift: true,
        description: `[send] ${line}`,
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendKeyDown: function (repeat?: number): ExecutionContext {
      const repetitions = repeat ? Math.max(1, repeat) : 1;
      var _send: ExecutionStep = {
        fn: () => {
          for (let i = 0; i < repetitions; ++i) {
            context.process?.write(KEY_DOWN_ARROW);
          }
          return true;
        },
        name: '_send',
        shift: true,
        description: `'[send] <Down> (${repetitions})`,
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendKeyUp: function (repeat?: number): ExecutionContext {
      const repetitions = repeat ? Math.max(1, repeat) : 1;
      var _send: ExecutionStep = {
        fn: () => {
          for (let i = 0; i < repetitions; ++i) {
            context.process?.write(KEY_UP_ARROW);
          }
          return true;
        },
        name: '_send',
        shift: true,
        description: `'[send] <Up> (${repetitions})`,
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendConfirmYes: function (): ExecutionContext {
      var _send: ExecutionStep = {
        fn: () => {
          context.process?.write(`Y${RETURN}`);
          return true;
        },
        name: '_send',
        shift: true,
        description: `'[send] Y <CR>`,
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendYes: function (): ExecutionContext {
      var _send: ExecutionStep = {
        fn: () => {
          context.process?.write(`Y`);
          return true;
        },
        name: '_send',
        shift: true,
        description: `'[send] Y <CR>`,
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendConfirmNo: function (): ExecutionContext {
      var _send: ExecutionStep = {
        fn: () => {
          context.process?.write(`N${RETURN}`);
          return true;
        },
        name: '_send',
        shift: true,
        description: `'[send] N <CR>`,
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendNo: function (): ExecutionContext {
      var _send: ExecutionStep = {
        fn: () => {
          context.process?.write(`N`);
          return true;
        },
        name: '_send',
        shift: true,
        description: `'[send] Y <CR>`,
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendCtrlC: function (): ExecutionContext {
      var _send: ExecutionStep = {
        fn: () => {
          context.process?.write(`${CONTROL_C}${RETURN}`);
          return true;
        },
        name: '_send',
        shift: true,
        description: '[send] Ctrl+C',
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendCtrlA: function (): ExecutionContext {
      var _send: ExecutionStep = {
        fn: () => {
          context.process?.write(`${CONTROL_A}`);
          return true;
        },
        name: '_send',
        shift: true,
        description: '[send] Ctrl+A',
        requiresInput: false,
      };
      context.queue.push(_send);
      return chain(context);
    },
    sendEof: function (): ExecutionContext {
      var _sendEof: ExecutionStep = {
        fn: () => {
          context.process?.sendEof();
          return true;
        },
        shift: true,
        name: '_sendEof',
        description: '[sendEof]',
        requiresInput: false,
      };
      context.queue.push(_sendEof);
      return chain(context);
    },
    delay: function (milliseconds: number): ExecutionContext {
      var _delay: ExecutionStep = {
        fn: () => {
          const startCallback = Date.now();

          while (Date.now() - startCallback < milliseconds) {}

          return true;
        },
        shift: true,
        name: '_delay',
        description: `'[delay] (${milliseconds})`,
        requiresInput: false,
      };
      context.queue.push(_delay);
      return chain(context);
    },
  };
  const run = (callback: (err: any, code?: number, signal?: string | number) => void): ExecutionContext => {
    let errState: any = null;
    let responded = false;
    let stdout: string[] = [];
    let options;
    let noOutputTimer;

    let logDumpFile: fs.WriteStream;

    if (process.env.VERBOSE_LOGGING_DO_NOT_USE_IN_CI_OR_YOU_WILL_BE_FIRED) {
      const rand = Math.floor(Math.random() * 10000);
      const logdir = join(os.tmpdir(), 'amplify_e2e_logs');
      fs.ensureDirSync(logdir);
      const filename = join(logdir, `amplify_e2e_log_${rand}`);
      logDumpFile = fs.createWriteStream(filename);
      console.log(`CLI test logs at [${filename}]`);
    }

    const exitHandler = (code: number, signal: any) => {
      noOutputTimer.clear();
      context.process?.removeOnExitHandlers(exitHandler);
      if (logDumpFile) {
        logDumpFile.close();
      }
      if (code !== 0) {
        if (code === EXIT_CODE_TIMEOUT) {
          const recordings = context.process?.getRecordingFrames() || [];
          const lastScreen = recordings.length
            ? recordings
                .filter(f => f[1] === 'o')
                .map(f => f[2])
                .slice(-10)
                .join('\n')
            : 'No output';
          const err = new Error(
            `Killed the process as no output receive for ${context.noOutputTimeout / 1000} Sec. The no output timeout is set to ${
              context.noOutputTimeout / 1000
            } seconds.\n\nLast 10 lines:👇🏽👇🏽👇🏽👇🏽\n\n\n\n\n${lastScreen}\n\n\n👆🏼👆🏼👆🏼👆🏼`,
          );
          err.stack = undefined;
          return onError(err, true);
        } else if (code === 127) {
          // XXX(sam) Not how node works (anymore?), 127 is what /bin/sh returns,
          // but it appears node does not, or not in all conditions, blithely
          // return 127 to user, it emits an 'error' from the child_process.

          //
          // If the response code is `127` then `context.command` was not found.
          //
          return onError(new Error('Command not found: ' + context.command), false);
        }
        return onError(new Error(`Process exited with non zero exit code ${code}`), false);
      } else {
        if (context.queue.length && !flushQueue()) {
          // if flushQueue returned false, onError was called
          return;
        }
        recordOutputs(code);
        callback(null, signal || code);
      }
    };
    //
    // **onError**
    //
    // Helper function to respond to the callback with a
    // specified error. Kills the child process if necessary.
    //
    function onError(err: any, kill: boolean, errorCode: number = EXIT_CODE_GENERIC_ERROR) {
      if (errState || responded) {
        return;
      }

      recordOutputs(errorCode);
      errState = err;
      responded = true;

      if (kill) {
        try {
          context.process?.kill();
        } catch (ex) {}
      }

      callback(err, errorCode);
    }

    //
    // **validateFnType**
    //
    // Helper function to validate the `currentFn` in the
    // `context.queue` for the target chain.
    //
    function validateFnType(step: ExecutionStep): boolean {
      const currentFn = step.fn;
      const currentFnName = step.name;
      if (typeof currentFn !== 'function') {
        //
        // If the `currentFn` is not a function, short-circuit with an error.
        //
        onError(new Error('Cannot process non-function on nexpect stack.'), true);
        return false;
      } else if (
        ['_expect', '_sendline', '_send', '_wait', '_sendEof', '_delay', '_pauseRecording', '_resumeRecording'].indexOf(currentFnName) ===
        -1
      ) {
        //
        // If the `currentFn` is a function, but not those set by `.sendline()` or
        // `.expect()` then short-circuit with an error.
        //
        onError(new Error('Unexpected context function name: ' + currentFn.name), true);
        return false;
      }

      return true;
    }

    //
    // **evalContext**
    //
    // Core evaluation logic that evaluates the next function in
    // `context.queue` against the specified `data` where the last
    // function run had `name`.
    //
    function evalContext(data: string, name?: string): void {
      var step = context.queue[0];
      const { fn: currentFn, name: currentFnName, shift } = step;

      if (!currentFn || (name === '_expect' && currentFnName === '_expect')) {
        //
        // If there is nothing left on the context or we are trying to
        // evaluate two consecutive `_expect` functions, return.
        //
        return;
      }

      if (shift) {
        context.queue.shift();
      }

      if (!validateFnType(step)) {
        return;
      }

      if (currentFnName === '_expect') {
        //
        // If this is an `_expect` function, then evaluate it and attempt
        // to evaluate the next function (in case it is a `_sendline` function).
        //
        return currentFn(data) === true ? evalContext(data, '_expect') : onError(createExpectationError(step.expectation, data), true);
      } else if (currentFnName === '_wait') {
        //
        // If this is a `_wait` function, then evaluate it and if it returns true,
        // then evaluate the function (in case it is a `_sendline` function).
        //
        if (currentFn(data) === true) {
          context.queue.shift();
          evalContext(data, '_expect');
        }
      } else {
        //
        // If the `currentFn` is any other function then evaluate it
        //
        if (currentFn(data)) {
          // Evaluate the next function if it does not need input
          var nextFn = context.queue[0];
          if (nextFn && !nextFn.requiresInput) evalContext(data);
        }
      }
    }

    const spinnerRegex = new RegExp(/.*(⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏).*/);

    //
    // **onLine**
    //
    // Preprocesses the `data` from `context.process` on the
    // specified `context.stream` and then evaluates the processed lines:
    //
    // 1. Stripping ANSI colors (if necessary)
    // 2. Removing case sensitivity (if necessary)
    // 3. Splitting `data` into multiple lines.
    //
    function onLine(data: string) {
      noOutputTimer.reschedule(context.noOutputTimeout);
      data = data.toString();
      if (logDumpFile && spinnerRegex.test(data) === false && strip(data).trim().length > 0) {
        logDumpFile.write(`${data}${os.EOL}`);
      }

      if (context.stripColors) {
        data = strip(data);
      }

      var lines = data.split(os.EOL).filter(function (line) {
        return line.length > 0 && line !== '\r';
      });
      stdout = stdout.concat(lines);

      while (lines.length > 0) {
        evalContext(lines.shift(), null);
      }
    }

    //
    // **flushQueue**
    //
    // Helper function which flushes any remaining functions from
    // `context.queue` and responds to the `callback` accordingly.
    //
    function flushQueue() {
      const remainingQueue = context.queue.slice().map(item => {
        const description = ['_sendline', '_send'].includes(item.name) ? `[${item.name}] **redacted**` : item.description;
        return {
          ...item,
          description,
        };
      });
      const step = context.queue.shift();
      const { fn: currentFn, name: currentFnName } = step;
      const nonEmptyLines = stdout.map(line => line.replace('\r', '').trim()).filter(line => line !== '');

      var lastLine = nonEmptyLines[nonEmptyLines.length - 1];

      if (!lastLine) {
        onError(createUnexpectedEndError('No data from child with non-empty queue.', remainingQueue), false);
        return false;
      } else if (context.queue.length > 0) {
        onError(createUnexpectedEndError('Non-empty queue on spawn exit.', remainingQueue), true);
        return false;
      } else if (!validateFnType(step)) {
        // onError was called
        return false;
      } else if (currentFnName === '_sendline') {
        onError(new Error('Cannot call sendline after the process has exited'), false);
        return false;
      } else if (currentFnName === '_wait' || currentFnName === '_expect') {
        if (currentFn(lastLine) !== true) {
          onError(createExpectationError(step.expectation, lastLine), false);
          return false;
        }
      }

      return true;
    }

    options = {
      cwd: context.cwd,
      env: context.env,
    };

    const recordOutputs = (code: number) => {
      if (global.storeCLIExecutionLog) {
        global.storeCLIExecutionLog({
          cmd: context.command,
          cwd: context.cwd,
          exitCode: code,
          params: context.params,
          recording: context.getRecording(),
        });
      }
    };

    try {
      context.process = new Recorder(context.command, context.params, options);

      context.process.addOnDataHandler(onLine);

      context.process.addOnExitHandlers(exitHandler);

      context.process.run();
      noOutputTimer = retimer(() => {
        exitHandler(EXIT_CODE_TIMEOUT, 'SIGTERM');
      }, context.noOutputTimeout);
      return chain(context);
    } catch (e) {
      onError(e, true);
    }
  };
  return {
    ...partialExecutionContext,
    run,
    runAsync: () => new Promise<void>((resolve, reject) => run(err => (err ? reject(err) : resolve()))),
  };
};

export const spawn = (command: string | string[], params: string[] = [], options: SpawnOptions = {}) => {
  if (Array.isArray(command)) {
    params = command;
    command = params.shift();
  } else if (typeof command === 'string') {
    const parsedPath = parse(command);
    const parsedArgs = parsedPath.base.split(' ');
    command = join(parsedPath.dir, parsedArgs[0]);
    params = params || parsedArgs.slice(1);
  }

  const testingWithLatestCodebase = isTestingWithLatestCodebase(command);
  if (testingWithLatestCodebase || (process.platform === 'win32' && !command.endsWith('.exe'))) {
    params.unshift(command);
    command = getScriptRunnerPath(testingWithLatestCodebase);
  }

  if (process.platform === 'win32' && !command.endsWith('powershell.exe')) {
    params.unshift(command);
    command = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  }

  let childEnv = undefined;
  let pushEnv = undefined;

  // For push operations in E2E we have to explicitly disable the Amplify Console App creation
  // as for the tests that need it, it is already enabled for init, setting the env var here
  // disables the post push check we have in the CLI.
  if (params.length > 0 && params[0].toLowerCase() === 'push') {
    pushEnv = {
      CLI_DEV_INTERNAL_DISABLE_AMPLIFY_APP_CREATION: '1',
    };
  }

  // If we have an environment passed in we've to add the current process' environment, otherwised the forked
  // process would not have $PATH and others that is required to run amplify-cli successfully.
  // to be able to disable CI detection we do need to pass in a childEnv
  if (options.env || pushEnv || options.disableCIDetection === true) {
    childEnv = {
      ...process.env,
      ...pushEnv,
      ...options.env,
      NODE_OPTIONS: '--max_old_space_size=4096',
    };

    // Undo ci-info detection, required for some tests
    if (options.disableCIDetection === true) {
      delete childEnv.CI;
      delete childEnv.CONTINUOUS_INTEGRATION;
      delete childEnv.BUILD_NUMBER;
      delete childEnv.TRAVIS;
      delete childEnv.GITHUB_ACTIONS;
      delete childEnv.CIRCLECI;
      delete childEnv.CIRCLE_PULL_REQUEST;
    }
  }

  let context: Context = {
    command: command,
    cwd: options.cwd || undefined,
    env: childEnv || undefined,
    ignoreCase: options.ignoreCase || true,
    noOutputTimeout: options.noOutputTimeout || DEFAULT_NO_OUTPUT_TIMEOUT,
    params: params,
    queue: [],
    stripColors: options.stripColors,
    process: undefined,
    getRecording: () => {
      if (context.process) {
        return context.process.getRecording();
      }
    },
  };

  return chain(context);
};

export const moveDown = (chain: ExecutionContext, nMoves: number) =>
  Array.from(Array(nMoves).keys()).reduce((chain, _idx) => chain.send('j'), chain);
  
export const singleSelect = <T>(chain: ExecutionContext, item: T, allChoices: T[]) => multiSelect(chain, [item], allChoices);

export const multiSelect = <T>(chain: ExecutionContext, items: T[] = [], allChoices: T[]) => {
  items
    .map(item => allChoices.indexOf(item))
    .filter(idx => idx > -1)
    .sort()
    // calculate the diff with the latest, since items are sorted, always positive
    // represents the numbers of moves down we need to make to selection
    .reduce((diffs, move) => (diffs.length > 0 ? [...diffs, move - diffs[diffs.length - 1]] : [move]), [] as number[])
    .reduce((chain, move) => moveDown(chain, move).send(' '), chain);
  chain.sendCarriageReturn();
  return chain;
};
