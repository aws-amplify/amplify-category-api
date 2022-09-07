/* eslint-disable testing-library/await-async-utils */
import path from 'path';
import { EOL } from 'os';
import * as fs from 'fs-extra';
import _ from 'lodash';
import { spawn } from './execUtils';

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
  projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  initializeProject (settings?: Partial<typeof defaultSettings>): Promise<void> {
    const s = { ...defaultSettings, ...settings };
    let env: any;
  
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
  
    const chain = spawn(getCLIPath(), cliArgs, { cwd: this.projectRoot, env, disableCIDetection: s.disableCIDetection })
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
      .wait('Help improve Amplify CLI by sharing non sensitive configurations on failures')
      .sendYes()
      .wait(/Try "amplify add api" to create a backend API and then "amplify (push|publish)" to deploy everything/);
    
    return chain.runAsync();
  }

  addApiWithoutSchema(opts: Partial<AddApiOptions & { apiKeyExpirationDays: number }> = {}) {
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
    if (forceUpdate) {
      schemaText += '  ';
    }
    const schemaPath = path.join(this.projectRoot, 'amplify', 'backend', 'api', projectName, 'schema.graphql');
    fs.writeFileSync(schemaPath, schemaText);
  }

  delete(profileConfig?: any, usingLatestCodebase = false): Promise<void> {
    return spawn(getCLIPath(usingLatestCodebase), ['delete'], { cwd: this.projectRoot, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait('Project deleted locally.')
      .runAsync();
  }

  push(testingWithLatestCodebase = false): Promise<void> {
    return spawn(getCLIPath(testingWithLatestCodebase), ['push'], { cwd: this.projectRoot, noOutputTimeout: pushTimeoutMS })
      .wait('Are you sure you want to continue?')
      .sendConfirmYes()
      .wait('Do you want to generate code for your newly created GraphQL API')
      .sendConfirmNo()
      .wait(/.*/)
      .runAsync();
  }

  codegen (usingLatestCodebase = false): Promise<void> {
    return spawn(getCLIPath(usingLatestCodebase), ['codegen', 'add'], { cwd: this.projectRoot, noOutputTimeout: pushTimeoutMS })
      .wait('Choose the code generation language target')
      .sendKeyDown()
      .sendCarriageReturn()
      .wait('Enter the file name pattern of graphql queries, mutations and subscriptions')
      .sendCarriageReturn()
      .wait('Do you want to generate/update all possible GraphQL operations - queries, mutations and subscriptions')
      .sendConfirmYes()
      .wait('Enter maximum statement depth')
      .sendCarriageReturn()
      .wait('Enter the file name for the generated code')
      .sendCarriageReturn()
      .wait('Do you want to generate code for your newly created GraphQL API')
      .sendConfirmYes()
      .wait('Code generated successfully')
      .runAsync();
  }
};
