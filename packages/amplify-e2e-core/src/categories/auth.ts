import _ from 'lodash';
import { getCLIPath, KEY_DOWN_ARROW, KEY_UP_ARROW, nspawn as spawn, setTransformerVersionFlag } from '..';

export type AddAuthUserPoolOnlyNoOAuthSettings = {
  resourceName: string;
  userPoolName: string;
};

export type AddAuthUserPoolOnlyWithOAuthSettings = AddAuthUserPoolOnlyNoOAuthSettings & {
  domainPrefix: string;
  signInUrl1: string;
  signInUrl2: string;
  signOutUrl1: string;
  signOutUrl2: string;
  facebookAppId: string;
  facebookAppSecret: string;
  googleAppId: string;
  googleAppSecret: string;
  amazonAppId: string;
  amazonAppSecret: string;
  appleAppClientId: string;
  appleAppTeamId: string;
  appleAppKeyID: string;
  appleAppPrivateKey: string;
};

export type AddAuthIdentityPoolAndUserPoolWithOAuthSettings = AddAuthUserPoolOnlyWithOAuthSettings & {
  identityPoolName: string;
  allowUnauthenticatedIdentities: boolean;
  thirdPartyAuth: boolean;
  idpFacebookAppId: string;
  idpGoogleAppId: string;
  idpAmazonAppId: string;
  idpAppleAppId: string;
};

export function addAuthWithDefault(cwd: string, settings: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'auth'], { cwd, stripColors: true })
      .wait('Do you want to use the default authentication')
      .sendCarriageReturn()
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn()
      .wait('Do you want to configure advanced settings?')
      .sendCarriageReturn()
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

interface AddApiOptions {
  apiName: string;
  testingWithLatestCodebase: boolean;
  transformerVersion: number;
}

const defaultOptions: AddApiOptions = {
  apiName: '\r',
  testingWithLatestCodebase: false,
  transformerVersion: 2,
};

export function addAuthViaAPIWithTrigger(cwd: string, opts: Partial<AddApiOptions> = {}): Promise<void> {
  const options = _.assign(defaultOptions, opts);
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(options.testingWithLatestCodebase), ['add', 'api'], { cwd, stripColors: true })
      .wait('Select from one of the below mentioned services:')
      .sendCarriageReturn()
      .wait(/.*Here is the GraphQL API that we will create. Select a setting to edit or continue.*/)
      .sendKeyUp(2)
      .sendCarriageReturn()
      .wait('Choose the default authorization type for the API')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Do you want to use the default authentication and security configuration?')
      .sendCarriageReturn()
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn()
      .wait('Do you want to configure advanced settings?')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('What attributes are required for signing up?')
      .sendCarriageReturn()
      .wait('Do you want to enable any of the following capabilities?')
      .send(KEY_DOWN_ARROW)
      .send(KEY_DOWN_ARROW)
      .send(' ')
      .sendCarriageReturn()
      .wait('Enter the name of the group to which users will be added.')
      .sendLine('mygroup')
      .wait('Do you want to edit your add-to-group function now?')
      .sendConfirmNo()
      .wait(/.*Configure additional auth types.*/)
      .sendConfirmNo()
      .wait(/.*Here is the GraphQL API that we will create. Select a setting to edit or continue.*/)
      .sendCarriageReturn()
      .wait('Choose a schema template:')
      .sendCarriageReturn()
      .wait('Do you want to edit the schema now?')
      .sendConfirmNo()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });

    setTransformerVersionFlag(cwd, options.transformerVersion);
  });
}

export function addAuthwithUserPoolGroupsViaAPIWithTrigger(cwd: string, opts: Partial<AddApiOptions> = {}): Promise<void> {
  const options = _.assign(defaultOptions, opts);
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(options.testingWithLatestCodebase), ['add', 'api'], { cwd, stripColors: true })
      .wait('Select from one of the below mentioned services:')
      .sendCarriageReturn()
      .wait(/.*Here is the GraphQL API that we will create. Select a setting to edit or continue.*/)
      .sendKeyUp(2)
      .sendCarriageReturn()
      .wait('Choose the default authorization type for the API')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Do you want to use the default authentication and security configuration?')
      .send(KEY_DOWN_ARROW)
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Select the authentication/authorization services that you want to use:')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Provide a friendly name for your resource that will be used to label this category in the project:')
      .sendCarriageReturn()
      .wait('Provide a name for your user pool:')
      .sendCarriageReturn()
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn()
      .wait('Do you want to add User Pool Groups?')
      .sendCarriageReturn()
      .wait('Provide a name for your user pool group:')
      .sendLine('admin')
      .wait('Do you want to add another User Pool Group')
      .sendCarriageReturn()
      .wait('Sort the user pool groups in order of preference')
      .sendCarriageReturn()
      .wait('Do you want to add an admin queries API?')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Multifactor authentication (MFA) user login options:')
      .sendCarriageReturn()
      .wait('Email based user registration/forgot password:')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Specify an SMS verification message:')
      .sendCarriageReturn()
      .wait('Do you want to override the default password policy for this User Pool?')
      .sendCarriageReturn()
      .wait('What attributes are required for signing up?')
      .sendCarriageReturn()
      .wait(`Specify the app's refresh token expiration period (in days):`)
      .sendCarriageReturn()
      .wait('Do you want to specify the user attributes this app can read and write?')
      .sendCarriageReturn()
      .wait('Do you want to enable any of the following capabilities?')
      .send(KEY_DOWN_ARROW)
      .send(KEY_DOWN_ARROW)
      .send(' ')
      .sendCarriageReturn()
      .wait('Do you want to use an OAuth flow?')
      .send(KEY_DOWN_ARROW)
      .sendCarriageReturn()
      .wait('Do you want to configure Lambda Triggers for Cognito?')
      .sendCarriageReturn()
      .wait('Which triggers do you want to enable for Cognito')
      .sendCarriageReturn()
      .wait('What functionality do you want to use for Post Confirmation')
      .sendCarriageReturn()
      .wait('Enter the name of the group to which users will be added.')
      .sendLine('mygroup')
      .wait('Do you want to edit your add-to-group function now?')
      .sendConfirmNo()
      .wait(/.*Configure additional auth types.*/)
      .sendConfirmNo()
      .wait(/.*Here is the GraphQL API that we will create. Select a setting to edit or continue.*/)
      .sendCarriageReturn()
      .wait('Choose a schema template:')
      .sendCarriageReturn()
      .wait('Do you want to edit the schema now?')
      .sendConfirmNo()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });

    setTransformerVersionFlag(cwd, options.transformerVersion);
  });
}

// creates 2 groups: Admins, Users
export function addAuthWithGroups(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'auth'], { cwd, stripColors: true })
      .wait('Do you want to use the default authentication and security configuration')
      .sendKeyDown(2)
      .sendCarriageReturn() // Manual configuration
      .wait('Select the authentication/authorization services that you want to use')
      .sendCarriageReturn() // for sign-up/-in and IAM controls
      .wait('Provide a friendly name for your resource that will be used')
      .sendCarriageReturn() // Default
      .wait('Enter a name for your identity pool')
      .sendCarriageReturn() // Default
      .wait('Allow unauthenticated logins')
      .sendCarriageReturn() // No
      .wait('Do you want to enable 3rd party authentication providers')
      .sendKeyDown()
      .sendCarriageReturn() // No
      .wait('Provide a name for your user pool')
      .sendCarriageReturn() // Default
      .wait('Warning: you will not be able to edit these selections')
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn() // Username
      .wait('Do you want to add User Pool Groups')
      .sendCarriageReturn() // Yes
      .wait('Provide a name for your user pool group')
      .sendLine('Admins')
      .wait('Do you want to add another User Pool Group')
      .sendConfirmYes()
      .wait('Provide a name for your user pool group')
      .sendLine('Users')
      .wait('Do you want to add another User Pool Group')
      .sendConfirmNo()
      .wait('Sort the user pool groups in order of preference')
      .sendCarriageReturn() // As is, Admins, Users
      .wait('Do you want to add an admin queries API')
      .sendKeyDown()
      .sendCarriageReturn() // No
      .wait('Multifactor authentication (MFA) user login options')
      .sendCarriageReturn() // Select Off
      .wait('Email based user registration/forgot password')
      .sendCarriageReturn() // Enabled
      .wait('Specify an email verification subject')
      .sendCarriageReturn() // Your verification code
      .wait('Specify an email verification message')
      .sendCarriageReturn() // Your verification code is {####}
      .wait('Do you want to override the default password policy')
      .sendConfirmNo()
      .wait('What attributes are required for signing up')
      .sendCarriageReturn() // Email
      .wait("Specify the app's refresh token expiration period")
      .sendCarriageReturn() // 30
      .wait('Do you want to specify the user attributes this app can read and write')
      .sendConfirmNo()
      .wait('Do you want to enable any of the following capabilities')
      .sendCarriageReturn() // None
      .wait('Do you want to use an OAuth flow')
      .sendKeyDown()
      .sendCarriageReturn() // No
      .wait('Do you want to configure Lambda Triggers for Cognito')
      .sendConfirmNo()
      .sendEof()
      .run((err: Error) => (err ? reject(err) : resolve()));
  });
}

// creates 2 groups: Admins, Users
export function addAuthWithGroupsAndAdminAPI(cwd: string, settings?: any): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'auth'], { cwd, stripColors: true })
      .wait('Do you want to use the default authentication and security configuration')
      .sendKeyDown(2)
      .sendCarriageReturn() // Manual configuration
      .wait('Select the authentication/authorization services that you want to use')
      .sendCarriageReturn() // for sign-up/-in and IAM controls
      .wait('Provide a friendly name for your resource that will be used')
      .sendCarriageReturn() // Default
      .wait('Enter a name for your identity pool')
      .sendCarriageReturn() // Default
      .wait('Allow unauthenticated logins')
      .sendCarriageReturn() // No
      .wait('Do you want to enable 3rd party authentication providers')
      .sendKeyDown()
      .sendCarriageReturn() // No
      .wait('Provide a name for your user pool')
      .sendCarriageReturn() // Default
      .wait('Warning: you will not be able to edit these selections')
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn() // Username
      .wait('Do you want to add User Pool Groups')
      .sendCarriageReturn() // Yes
      .wait('Provide a name for your user pool group')
      .sendLine('Admins')
      .wait('Do you want to add another User Pool Group')
      .sendConfirmYes()
      .wait('Provide a name for your user pool group')
      .sendLine('Users')
      .wait('Do you want to add another User Pool Group')
      .sendConfirmNo()
      .wait('Sort the user pool groups in order of preference')
      .sendCarriageReturn() // As is, Admins, Users
      .wait('Do you want to add an admin queries API')
      .sendCarriageReturn() // Yes
      .wait('Do you want to restrict access to the admin queries API')
      .sendConfirmYes()
      .wait('Select the group to restrict access with')
      .sendCarriageReturn() // Admins
      .wait('Multifactor authentication (MFA) user login options')
      .sendCarriageReturn() // OFF
      .wait('Email based user registration/forgot password')
      .sendCarriageReturn() // Enabled
      .wait('Specify an email verification subject')
      .sendCarriageReturn() // Your verification code
      .wait('Specify an email verification message')
      .sendCarriageReturn() // Your verification code is {####}
      .wait('Do you want to override the default password policy')
      .sendConfirmNo()
      .wait('What attributes are required for signing up')
      .sendCarriageReturn() // Email
      .wait("Specify the app's refresh token expiration period")
      .sendCarriageReturn() // 30
      .wait('Do you want to specify the user attributes this app can read and write')
      .sendConfirmNo()
      .wait('Do you want to enable any of the following capabilities')
      .sendCarriageReturn() // None
      .wait('Do you want to use an OAuth flow')
      .sendKeyDown()
      .sendCarriageReturn() // No
      .wait('Do you want to configure Lambda Triggers for Cognito')
      .sendConfirmNo()
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

// add default auth with pre token generation trigger
export function addAuthWithPreTokenGenerationTrigger(projectDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'auth'], { cwd: projectDir, stripColors: true })
      .wait('Do you want to use the default authentication and security configuration')
      .sendCarriageReturn()
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn()
      .wait('Do you want to configure advanced settings')
      .sendLine(KEY_DOWN_ARROW)
      .wait('What attributes are required for signing up?')
      .sendCarriageReturn()
      .wait('Do you want to enable any of the following capabilities')
      .send(KEY_UP_ARROW) // Override ID Token Claims
      .sendLine(' ')
      .wait('Successfully added the Lambda function locally')
      .wait('Do you want to edit your alter-claims function now')
      .sendLine('n')
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function updateAuthAddUserGroups(projectDir: string, groupNames: string[], settings?: any): Promise<void> {
  if (groupNames.length == 0) {
    return;
  }
  const testingWithLatestCodebase = settings && settings.testingWithLatestCodebase ? settings.testingWithLatestCodebase : false;
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(testingWithLatestCodebase), ['update', 'auth'], { cwd: projectDir, stripColors: true });
    if (settings?.overrides?.category === 'auth') {
      chain.wait('A migration is needed to support latest updates on auth resources').sendConfirmYes();
    }
    chain.wait('What do you want to do?').send(KEY_DOWN_ARROW).send(KEY_DOWN_ARROW);
    if (settings?.useSocialProvider) {
      chain.send(KEY_DOWN_ARROW);
    }
    chain.sendCarriageReturn().wait('Provide a name for your user pool group').send(groupNames[0]).sendCarriageReturn();

    if (groupNames.length > 1) {
      let index = 1;
      while (index < groupNames.length) {
        chain
          .wait('Do you want to add another User Pool Group')
          .sendConfirmYes()
          .wait('Provide a name for your user pool group')
          .send(groupNames[index++])
          .sendCarriageReturn();
      }
    }

    chain
      .wait('Do you want to add another User Pool Group')
      .sendCarriageReturn()
      .wait('Sort the user pool groups in order of preference')
      .sendCarriageReturn()
      .wait('"amplify publish" will build all your local backend and frontend resources');

    chain.run((err: Error) => {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

export function addAuthUserPoolOnlyWithOAuth(cwd: string, settings: AddAuthUserPoolOnlyWithOAuthSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'auth'], { cwd, stripColors: true })
      .wait('Do you want to use the default authentication and security configuration?')
      .sendKeyDown(2)
      .sendCarriageReturn()
      .wait('Select the authentication/authorization services that you want to use')
      .sendKeyDown()
      .sendCarriageReturn()
      .wait('Provide a friendly name for your resource that will be used')
      .sendLine(settings.resourceName)
      .wait('Provide a name for your user pool')
      .sendLine(settings.userPoolName)
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn() // Username
      .wait('Do you want to add User Pool Groups?')
      .sendKeyDown() // No
      .sendCarriageReturn()
      .wait('Do you want to add an admin queries API?')
      .sendKeyDown() // No
      .sendCarriageReturn()
      .wait('Multifactor authentication (MFA) user login options')
      .sendCarriageReturn() // OFF
      .wait('Email based user registration/forgot password')
      .sendCarriageReturn() // Enabled
      .wait('Specify an email verification subject')
      .sendCarriageReturn()
      .wait('Specify an email verification message')
      .sendCarriageReturn()
      .wait('Do you want to override the default password policy')
      .sendConfirmNo()
      .wait('What attributes are required for signing up?')
      .sendCarriageReturn()
      .wait("Specify the app's refresh token expiration period (in days)")
      .sendCarriageReturn()
      .wait('Do you want to specify the user attributes this app can read and write')
      .sendConfirmNo()
      .wait('Do you want to enable any of the following capabilities?')
      .sendCarriageReturn()
      .wait('Do you want to use an OAuth flow')
      .sendCarriageReturn() // Yes
      .wait('What domain name prefix do you want to use?')
      .sendLine(settings.domainPrefix)
      .wait('Enter your redirect signin URI')
      .sendLine(settings.signInUrl1)
      .wait('Do you want to add another redirect signin URI')
      .sendConfirmYes()
      .wait('Enter your redirect signin URI')
      .sendLine(settings.signInUrl2)
      .wait('Do you want to add another redirect signin URI')
      .sendConfirmNo()
      .wait('Enter your redirect signout URI')
      .sendLine(settings.signOutUrl1)
      .wait('Do you want to add another redirect signout URI')
      .sendConfirmYes()
      .wait('Enter your redirect signout URI')
      .sendLine(settings.signOutUrl2)
      .wait('Do you want to add another redirect signout URI')
      .sendConfirmNo()
      .wait('Select the OAuth flows enabled for this project')
      .sendCarriageReturn() // Authorization Grant
      .wait('Select the OAuth scopes enabled for this project')
      .sendCarriageReturn() // All
      .wait('Select the social providers you want to configure for your user pool')
      .sendLine('a') // Select all
      .wait('Enter your Facebook App ID for your OAuth flow')
      .sendLine(settings.facebookAppId)
      .wait('Enter your Facebook App Secret for your OAuth flow')
      .sendLine(settings.facebookAppSecret)
      .wait('Enter your Google Web Client ID for your OAuth flow')
      .sendLine(settings.googleAppId)
      .wait('Enter your Google Web Client Secret for your OAuth flow')
      .sendLine(settings.googleAppSecret)
      .wait('Enter your Amazon App ID for your OAuth flow')
      .sendLine(settings.amazonAppId)
      .wait('Enter your Amazon App Secret for your OAuth flow')
      .sendLine(settings.amazonAppSecret)
      .wait('Enter your Services ID for your OAuth flow:')
      .sendLine(settings.appleAppClientId)
      .wait('Enter your Team ID for your OAuth flow:')
      .sendLine(settings.appleAppTeamId)
      .wait('Enter your Key ID for your OAuth flow:')
      .sendLine(settings.appleAppKeyID)
      .wait('Enter your Private Key for your OAuth flow:')
      .sendLine(settings.appleAppPrivateKey)
      .wait('Do you want to configure Lambda Triggers for Cognito')
      .sendConfirmNo()
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function addAuthIdentityPoolAndUserPoolWithOAuth(
  cwd: string,
  settings: AddAuthIdentityPoolAndUserPoolWithOAuthSettings,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let chain = spawn(getCLIPath(), ['add', 'auth'], { cwd, stripColors: true })
      .wait('Do you want to use the default authentication and security configuration?')
      .sendKeyDown(2)
      .sendCarriageReturn()
      .wait('Select the authentication/authorization services that you want to use')
      .sendCarriageReturn()
      .wait('Provide a friendly name for your resource that will be used')
      .sendLine(settings.resourceName)
      .wait('Enter a name for your identity pool')
      .sendLine(settings.identityPoolName)
      .wait('Allow unauthenticated logins');

    if (settings.allowUnauthenticatedIdentities) {
      chain.sendKeyUp().sendCarriageReturn();
    } else {
      chain.sendConfirmNo();
    }

    chain
      .wait('Do you want to enable 3rd party authentication providers')
      .sendConfirmYes()
      .wait('Select the third party identity providers you want to')
      .send('a')
      .sendCarriageReturn()
      .wait('Enter your Facebook App ID for your identity pool')
      .sendLine(settings.idpFacebookAppId)
      .wait('Enter your Google Web Client ID for your identity pool:')
      .sendLine(settings.idpGoogleAppId)
      .wait('Enter your Amazon App ID for your identity pool')
      .sendLine(settings.idpAmazonAppId)
      .wait('Enter your Bundle Identifier for your identity pool')
      .sendLine(settings.idpAppleAppId)
      .wait('Provide a name for your user pool')
      .sendLine(settings.userPoolName)
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn() // Username
      .wait('Do you want to add User Pool Groups?')
      .sendKeyDown() // No
      .sendCarriageReturn()
      .wait('Do you want to add an admin queries API?')
      .sendKeyDown() // No
      .sendCarriageReturn()
      .wait('Multifactor authentication (MFA) user login options')
      .sendCarriageReturn() // OFF
      .wait('Email based user registration/forgot password')
      .sendCarriageReturn() // Enabled
      .wait('Specify an email verification subject')
      .sendCarriageReturn()
      .wait('Specify an email verification message')
      .sendCarriageReturn()
      .wait('Do you want to override the default password policy')
      .sendConfirmNo()
      .wait('What attributes are required for signing up?')
      .sendCarriageReturn()
      .wait("Specify the app's refresh token expiration period (in days)")
      .sendCarriageReturn()
      .wait('Do you want to specify the user attributes this app can read and write')
      .sendConfirmNo()
      .wait('Do you want to enable any of the following capabilities?')
      .sendCarriageReturn()
      .wait('Do you want to use an OAuth flow')
      .sendCarriageReturn() // Yes
      .wait('What domain name prefix do you want to use?')
      .sendLine(settings.domainPrefix)
      .wait('Enter your redirect signin URI')
      .sendLine(settings.signInUrl1)
      .wait('Do you want to add another redirect signin URI')
      .sendConfirmYes()
      .wait('Enter your redirect signin URI')
      .sendLine(settings.signInUrl2)
      .wait('Do you want to add another redirect signin URI')
      .sendConfirmNo()
      .wait('Enter your redirect signout URI')
      .sendLine(settings.signOutUrl1)
      .wait('Do you want to add another redirect signout URI')
      .sendConfirmYes()
      .wait('Enter your redirect signout URI')
      .sendLine(settings.signOutUrl2)
      .wait('Do you want to add another redirect signout URI')
      .sendConfirmNo()
      .wait('Select the OAuth flows enabled for this project')
      .sendCarriageReturn() // Authorization Grant
      .wait('Select the OAuth scopes enabled for this project')
      .sendCarriageReturn() // All
      .wait('Select the social providers you want to configure for your user pool')
      .sendLine('a') // Select all
      .wait('Enter your Facebook App ID for your OAuth flow')
      .sendLine(settings.facebookAppId)
      .wait('Enter your Facebook App Secret for your OAuth flow')
      .sendLine(settings.facebookAppSecret)
      .wait('Enter your Google Web Client ID for your OAuth flow')
      .sendLine(settings.googleAppId)
      .wait('Enter your Google Web Client Secret for your OAuth flow')
      .sendLine(settings.googleAppSecret)
      .wait('Enter your Amazon App ID for your OAuth flow')
      .sendLine(settings.amazonAppId)
      .wait('Enter your Amazon App Secret for your OAuth flow')
      .sendLine(settings.amazonAppSecret)
      .wait('Enter your Services ID for your OAuth flow:')
      .sendLine(settings.appleAppClientId)
      .wait('Enter your Team ID for your OAuth flow:')
      .sendLine(settings.appleAppTeamId)
      .wait('Enter your Key ID for your OAuth flow:')
      .sendLine(settings.appleAppKeyID)
      .wait('Enter your Private Key for your OAuth flow:')
      .sendLine(settings.appleAppPrivateKey)
      .wait('Do you want to configure Lambda Triggers for Cognito')
      .sendConfirmNo()
      .sendEof()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}

export function updateAuthAddAdminQueries(projectDir: string, groupName: string = 'adminQueriesGroup', settings: any = {}): Promise<void> {
  const testingWithLatestCodebase = settings.testingWithLatestCodebase ?? false;
  return new Promise((resolve, reject) => {
    const chain = spawn(getCLIPath(testingWithLatestCodebase), ['update', 'auth'], { cwd: projectDir, stripColors: true });
    if (settings?.overrides?.category === 'auth') {
      chain.wait('A migration is needed to support latest updates on auth resources').sendYes();
    }
    chain
      .wait('What do you want to do?')
      .sendKeyUp()
      .sendCarriageReturn() // Create or update Admin queries API
      .wait('Do you want to restrict access to the admin queries API to a specific Group')
      .sendConfirmYes()
      .wait('Select the group to restrict access with')
      .sendCarriageReturn() // Enter a custom group
      .wait('Provide a group name')
      .send(groupName)
      .sendCarriageReturn()
      .sendEof()
      .run((err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
  });
}

export const enableUserPoolUnauthenticatedAccess = async (cwd: string, settings: any = {}): Promise<void> => {
  return spawn(getCLIPath(settings.testingWithLatestCodebase), ['update', 'auth'], { cwd, stripColors: true })
    .wait('What do you want to do')
    .sendKeyDown()
    .sendCarriageReturn() // Walkthrough all the auth configurations
    .wait('Select the authentication/authorization services that you want to use')
    .sendCarriageReturn()
    .wait('Allow unauthenticated logins')
    .sendKeyUp()
    .sendCarriageReturn() // Yes
    .wait('Do you want to enable 3rd party authentication providers in your identity pool')
    .sendKeyDown() // No
    .sendCarriageReturn()
    .wait('Do you want to add User Pool Groups')
    .sendKeyDown() // No
    .sendCarriageReturn()
    .wait('Do you want to add an admin queries API')
    .sendKeyDown() // No
    .sendCarriageReturn()
    .wait('Multifactor authentication (MFA) user login options')
    .sendCarriageReturn() // OFF
    .wait('Email based user registration/forgot password')
    .sendCarriageReturn() // Enabled
    .wait('Specify an email verification subject')
    .sendCarriageReturn()
    .wait('Specify an email verification message')
    .sendCarriageReturn()
    .wait('Do you want to override the default password policy for this User Pool')
    .sendCarriageReturn()
    .wait("Specify the app's refresh token expiration period (in days)")
    .sendCarriageReturn()
    .wait('Do you want to specify the user attributes this app can read and write')
    .sendCarriageReturn()
    .wait('Do you want to enable any of the following capabilities')
    .sendCarriageReturn()
    .wait('Do you want to use an OAuth flow')
    .sendKeyDown() // No
    .sendCarriageReturn()
    .wait('Do you want to configure Lambda Triggers for Cognito')
    .sendConfirmNo()
    .runAsync();
};
