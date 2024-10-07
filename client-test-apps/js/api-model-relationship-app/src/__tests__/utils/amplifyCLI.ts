/* eslint-disable testing-library/await-async-utils */
import path from 'path';
import { EOL } from 'os';
import * as fs from 'fs-extra';
import _ from 'lodash';
import { spawn, singleSelect } from './execUtils';
import { homedir } from 'os';
import * as ini from 'ini';
import { JSONUtilities } from './jsonUtilities';

/**
 * NEW MESS
 */

export interface Tag {
  Key: string;
  Value: string;
}

export function ReadTags(tagsFilePath: string): Tag[] {
  const tags = JSONUtilities.readJson<Tag[]>(tagsFilePath, {
    throwIfNotExist: false,
    preserveComments: false,
  });

  if (!tags) return [];

  return tags;
}

const constructPath = (projectPath: string, segments: string[] = []): string => path.normalize(path.join(projectPath, ...segments));

const getTagFilePath = (projectPath: string): string => constructPath(
  projectPath, [PathConstants.AmplifyDirName, PathConstants.BackendDirName, PathConstants.TagsFileName],
);

const getProjectTags = (projectPath: string): Tag[] => ReadTags(getTagFilePath(projectPath));

const setProjectFileTags = (projectPath: string, tags: Tag[]): void => {
  const tagFilePath = getTagFilePath(projectPath);
  JSONUtilities.writeJson(tagFilePath, tags);
};

const addCITags = (projectPath: string): void => {
  if (process.env && process.env['CODEBUILD']) {
    const tags = getProjectTags(projectPath);

    const addTagIfNotExist = (key: string, value: string): void => {
      if (!tags.find(t => t.Key === key)) {
        tags.push({
          Key: key,
          Value: value,
        });
      }
    };

    const sanitizeTagValue = (value: string): string => {
      return value.replace(/[^ a-z0-9_.:/=+\-@]/gi, '');
    };
    if (process.env['CODEBUILD']) {
      addTagIfNotExist('codebuild', sanitizeTagValue(process.env['CODEBUILD'] || 'N/A'));
      addTagIfNotExist('codebuild:batch_build_identifier', sanitizeTagValue(process.env['CODEBUILD_BATCH_BUILD_IDENTIFIER'] || 'N/A'));
      addTagIfNotExist('codebuild:build_id', sanitizeTagValue(process.env['CODEBUILD_BUILD_ID'] || 'N/A'));
    }


    setProjectFileTags(projectPath, tags);
  }
};

/**
 * END TAG STUFF
 */


export const PathConstants = {
  DotAWSDirName: '.aws',
  AWSCredentials: 'credentials',
  AmplifyDirName: 'amplify',
  BackendDirName: 'backend',
  TagsFileName: 'tags.json',
}

const getDotAWSDirPath = (): string => path.normalize(path.join(homedir(), PathConstants.DotAWSDirName));
const getAWSCredentialsFilePath = (): string => path.normalize(path.join(getDotAWSDirPath(), PathConstants.AWSCredentials));

const injectSessionToken = (profileName: string) => {
  const credentialsContents = ini.parse(fs.readFileSync(getAWSCredentialsFilePath()).toString());
  credentialsContents[profileName] = credentialsContents[profileName] || {};
  credentialsContents[profileName].aws_session_token = process.env.AWS_SESSION_TOKEN;
  fs.writeFileSync(getAWSCredentialsFilePath(), ini.stringify(credentialsContents));
};

type AmplifyConfiguration = {
  accessKeyId: string;
  secretAccessKey: string;
  profileName?: string;
  region?: string;
};

const defaultConfigureSettings = {
  profileName: 'amplify-integ-test-user',
  region: 'us-east-2',
  userName: EOL,
};

const amplifyRegions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-north-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ca-central-1',
  'me-south-1',
  'sa-east-1',
];

const MANDATORY_PARAMS = ['accessKeyId', 'secretAccessKey', 'region'];

const amplifyConfigure = (settings: AmplifyConfiguration): Promise<void> => {
  console.log('Executing Amplify Configure');
  const s = { ...defaultConfigureSettings, ...settings };
  const missingParam = MANDATORY_PARAMS.filter(p => !Object.keys(s).includes(p));
  if (missingParam.length) {
    throw new Error(`mandatory params ${missingParam.join(' ')} are missing`);
  }

  const chain = spawn(getCLIPath(), ['configure'])
    .wait('Sign in to your AWS administrator account:')
    .wait('Press Enter to continue')
    .sendCarriageReturn()
    .wait('Specify the AWS Region');

  singleSelect(chain, s.region, amplifyRegions);

  return chain
    .wait('Press Enter to continue')
    .sendCarriageReturn()
    .wait('accessKeyId')
    .pauseRecording()
    .sendLine(s.accessKeyId)
    .wait('secretAccessKey')
    .sendLine(s.secretAccessKey)
    .resumeRecording()
    .wait('Profile Name:')
    .sendLine(s.profileName)
    .wait('Successfully set up the new user.')
    .runAsync();
};

const isCI = () => process.env.CI && process.env.CODEBUILD;

 async function setupAmplify() {
  if (isCI()) {
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const REGION = process.env.CLI_REGION;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !REGION) {
      throw new Error('Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and CLI_REGION in .env');
    }
    await amplifyConfigure({
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      profileName: 'amplify-integ-test-user',
      region: REGION,
    });
    if (process.env.AWS_SESSION_TOKEN) {
      injectSessionToken('amplify-integ-test-user');
    }
  } else {
    console.log('AWS Profile is already configured');
  }
}
/**
 * END NEW MESS
 */

const pushTimeoutMS = 1000 * 60 * 10; // 10 minutes;

const defaultSettings = {
  name: EOL,
  envName: 'integtest',
  editor: EOL,
  appType: EOL,
  framework: EOL,
  srcDir: EOL,
  distDir: EOL,
  buildCmd: EOL,
  startCmd: EOL,
  useProfile: EOL,
  profileName: EOL,
  region: process.env.CLI_REGION,
  local: false,
  disableAmplifyAppCreation: true,
  disableCIDetection: false,
  providerConfig: undefined,
  permissionsBoundaryArn: undefined,
};

export const getCLIPath = (testingWithLatestCodebase = false) => {
  if (!testingWithLatestCodebase) {
    if (process.env.AMPLIFY_PATH && fs.existsSync(process.env.AMPLIFY_PATH)) {
      return process.env.AMPLIFY_PATH;
    }

    return process.platform === 'win32' ? 'amplify.exe' : 'amplify';
  }

  return path.join(__dirname, '..', '..', '..', 'node_modules', 'amplify-cli-internal', 'bin', 'amplify');
};

interface AddApiOptions {
  apiName: string;
  testingWithLatestCodebase: boolean;
}

const defaultAddApi: AddApiOptions = {
  apiName: '\r',
  testingWithLatestCodebase: false,
};

export class AmplifyCLI {
  isAmplifySetup: boolean
  projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.isAmplifySetup = false;
  }

  setupAmplifyIfNecessary (): Promise<void> {
    if (this.isAmplifySetup) return Promise.resolve();

    return setupAmplify();
  }

  async initializeProject (settings?: Partial<typeof defaultSettings>): Promise<void> {
    console.log('Initializing Project');
    await this.setupAmplifyIfNecessary();
    const s = { ...defaultSettings, ...settings };
    let env: any;

    addCITags(this.projectRoot);

    if (s.disableAmplifyAppCreation === true) {
      env = {
        CLI_DEV_INTERNAL_DISABLE_AMPLIFY_APP_CREATION: '1',
      };
    }

    const cliArgs = ['init'];
    const providerConfigSpecified = !!s.providerConfig && typeof s.providerConfig === 'object';
    if (providerConfigSpecified) {
      cliArgs.push('--providers', JSON.stringify(s.providerConfig));
    }

    if (s.permissionsBoundaryArn) {
      cliArgs.push('--permissions-boundary', s.permissionsBoundaryArn);
    }

    if (s?.name?.length > 20) console.warn('Project names should not be longer than 20 characters. This may cause tests to break.');

    const cliPath = getCLIPath();
    console.log(`Using CLI path '${cliPath}'`);
    console.log(`Project root: '${this.projectRoot}'`);
    const chain = spawn(cliPath, cliArgs, { cwd: this.projectRoot, env, disableCIDetection: s.disableCIDetection })
      .wait('Do you want to continue with Amplify Gen 1?')
      .sendConfirmYes()
      .wait('Why would you like to use Amplify Gen 1?')
      .sendCarriageReturn()
      .wait('Enter a name for the project')
      .sendLine(s.name)
      .wait('Initialize the project with the above configuration?')
      .sendConfirmNo()
      .wait('Enter a name for the environment')
      .sendLine(s.envName)
      .wait('Choose your default editor:')
      .sendLine(s.editor)
      .wait("Choose the type of app that you're building")
      .sendLine(s.appType)
      .wait('What javascript framework are you using')
      .sendLine(s.framework)
      .wait('Source Directory Path:')
      .sendLine(s.srcDir)
      .wait('Distribution Directory Path:')
      .sendLine(s.distDir)
      .wait('Build Command:')
      .sendLine(s.buildCmd)
      .wait('Start Command:')
      .sendCarriageReturn();

    if (!providerConfigSpecified) {
      chain
        .wait('Using default provider  awscloudformation')
        .wait('Select the authentication method you want to use:')
        .sendCarriageReturn()
        .wait('Please choose the profile you want to use')
        .sendLine(s.profileName);
    }

    chain
      .wait('Help improve Amplify CLI')
      .sendYes()
      .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/);

    return chain.runAsync();
  }

  addApiWithoutSchema(opts: Partial<AddApiOptions & { apiKeyExpirationDays: number }> = {}) {
    console.log('Adding Amplify API');
    const options = _.assign(defaultAddApi, opts);
    return spawn(getCLIPath(options.testingWithLatestCodebase), ['add', 'api'], { cwd: this.projectRoot })
      .wait('Select from one of the below mentioned services')
      .sendCarriageReturn()
      .wait('Here is the GraphQL API that we will create. Select a setting to edit or continue')
      .sendKeyUp(3)
      .sendCarriageReturn()
      .wait('Provide API name:')
      .sendLine(options.apiName)
      .wait('Here is the GraphQL API that we will create. Select a setting to edit or continue')
      .sendCarriageReturn()
      .wait('Choose a schema template')
      .sendCarriageReturn()
      .wait('Do you want to edit the schema now?')
      .sendConfirmNo()
      .wait('"amplify publish" will build all your local backend and frontend resources (if you have hosting category added) and provision it in the cloud')
      .runAsync();
  }

  updateSchema(projectName: string, schemaText: string, forceUpdate: boolean = false) {
    console.log('Updating Amplify Schema');
    if (forceUpdate) {
      schemaText += '  ';
    }
    const schemaPath = path.join(this.projectRoot, 'amplify', 'backend', 'api', projectName, 'schema.graphql');
    fs.writeFileSync(schemaPath, schemaText);
  }

  delete(profileConfig?: any, usingLatestCodebase = false): Promise<void> {
    console.log('Executing Amplify Delete');
    return spawn(getCLIPath(usingLatestCodebase), ['delete'], { cwd: this.projectRoot, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait('Project deleted locally.')
      .runAsync();
  }

  push(testingWithLatestCodebase = false): Promise<void> {
    console.log('Executing Amplify Push');
    return spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd: this.projectRoot, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait('Do you want to generate code for your newly created GraphQL API')
      .sendConfirmNo()
      .wait(/.*/)
      .runAsync();
  }

  codegen (opts?: { statementDepth?: number }, usingLatestCodebase = false): Promise<void> {
    console.log('Executing Amplify Codegen');
    const chain = spawn(getCLIPath(usingLatestCodebase), ['codegen', 'add'], { cwd: this.projectRoot, noOutputTimeout: pushTimeoutMS })
      .wait('Choose the code generation language target')
      .sendKeyDown()
      .sendCarriageReturn()
      .wait('Enter the file name pattern of graphql queries, mutations and subscriptions')
      .sendCarriageReturn()
      .wait('Do you want to generate/update all possible GraphQL operations - queries, mutations and subscriptions')
      .sendConfirmYes()
      .wait('Enter maximum statement depth');

      if (opts?.statementDepth) {
        chain.sendLine(String(opts.statementDepth));
      }

      return chain.sendCarriageReturn()
      .wait('Enter the file name for the generated code')
      .sendCarriageReturn()
      .wait('Do you want to generate code for your newly created GraphQL API')
      .sendConfirmYes()
      .wait('Code generated successfully')
      .runAsync();
  }

  addAuth (): Promise<void> {
    console.log('Executing Add Auth');
    return spawn(getCLIPath(), ['add', 'auth'], { cwd: this.projectRoot, noOutputTimeout: pushTimeoutMS })
      .wait('Do you want to use the default authentication and security configuration?')
      .sendCarriageReturn()
      .wait('How do you want users to be able to sign in?')
      .sendCarriageReturn()
      .wait('Do you want to configure advanced settings?')
      .sendCarriageReturn()
      .runAsync();
  }
};
