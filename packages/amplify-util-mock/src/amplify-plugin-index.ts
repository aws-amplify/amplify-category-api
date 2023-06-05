import * as path from 'path';

const pluginName = 'mock';

/**
 *
 * @param context
 */
export async function executeAmplifyCommand(context: any) {
  const commandPath = path.normalize(path.join(__dirname, 'commands', pluginName, context.input.command));
  const commandModule = await import(commandPath);
  await commandModule.run(context);
}

/**
 *
 * @param context
 * @param args
 */
export async function handleAmplifyEvent(context: any, args: any) {
  context.print.info(`${pluginName} handleAmplifyEvent to be implemented`);
  context.print.info(`Received event args ${args}`);
}
