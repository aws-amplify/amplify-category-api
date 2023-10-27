import { getCLIPath, nspawn as spawn } from '..';

export type AddStorageSettings = {
  resourceName?: string;
  bucketName?: string;
};

export type AddDynamoDBSettings = {
  resourceName: string;
  tableName: string;
  gsiName: string;
};

export function addSimpleDDB(cwd: string, settings: any): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true })
      .wait('Select from one of the below mentioned services')
      .sendKeyDown()
      .sendCarriageReturn()
      .wait('Provide a friendly name')
      .sendLine(settings.name || '\r')
      .wait('Provide table name')
      .sendCarriageReturn()
      .wait('What would you like to name this column')
      .sendLine('id')
      .wait('Choose the data type')
      .sendCarriageReturn()
      .wait('Would you like to add another column')
      .sendLine('y')
      .wait('What would you like to name this column')
      .sendLine('col2')
      .wait('Choose the data type')
      .sendCarriageReturn()
      .wait('Would you like to add another column')
      .sendLine('n')
      .wait('Choose partition key for the table')
      .sendCarriageReturn()
      .wait('Do you want to add a sort key to your table')
      .sendConfirmNo()
      .wait('Do you want to add global secondary indexes to your table')
      .sendConfirmNo()
      .wait('Do you want to add a Lambda Trigger for your Table')
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

export function addS3(cwd: string, settings: any): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true })
      .wait('Select from one of the below mentioned services')
      .sendCarriageReturn()
      .wait('Provide a friendly name')
      .sendCarriageReturn()
      .wait('Provide bucket name')
      .sendCarriageReturn()
      .wait('Who should have access')
      .sendCarriageReturn()
      .wait('What kind of access do you want')
      .sendLine(' ')
      .wait('Do you want to add a Lambda Trigger for your S3 Bucket')
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

// Adds auth and S3 to test case where user adds storage without adding auth first
export function addS3AndAuthWithAuthOnlyAccess(cwd: string, settings: any): Promise<void> {
  return new Promise((resolve, reject) => {
    spawn(getCLIPath(), ['add', 'storage'], { cwd, stripColors: true })
      .wait('Select from one of the below mentioned services')
      .sendCarriageReturn() // Content
      .wait('You need to add auth (Amazon Cognito) to your project in order to add storage')
      .sendConfirmYes()
      .wait('Do you want to use the default authentication and security configuration')
      .sendCarriageReturn() // Default config
      .wait('How do you want users to be able to sign in')
      .sendCarriageReturn() // Username
      .wait('Do you want to configure advanced settings')
      .sendCarriageReturn() // No, I am done.
      .wait('Provide a friendly name for your resource')
      .sendCarriageReturn() // Default name
      .wait('Provide bucket name')
      .sendCarriageReturn() // Default name
      .wait('Who should have access')
      .sendCarriageReturn() // Auth users only
      .wait('What kind of access do you want for Authenticated users?')
      .sendCtrlA()
      .sendCarriageReturn()
      .wait('Do you want to add a Lambda Trigger for your S3 Bucket')
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

export function addS3Storage(projectDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let chain = spawn(getCLIPath(), ['add', 'storage'], { cwd: projectDir, stripColors: true });
    chain
      .wait('Select from one of the below mentioned services:') // 'Content (Images, audio, video, etc.)'
      .sendCarriageReturn()
      .wait('Provide a friendly name for your resource that will be used to label this category in the project:')
      .sendCarriageReturn()
      .wait('Provide bucket name:')
      .sendCarriageReturn()
      .wait('Who should have access:')
      .sendKeyDown()
      .send(' ') // Auth and guest
      .sendCarriageReturn()
      .wait('What kind of access do you want for Authenticated users?') // Auth
      .sendCtrlA()
      .sendCarriageReturn()
      .wait('What kind of access do you want for Guest users?') // Guest
      .sendCtrlA()
      .sendCarriageReturn()
      .wait('Do you want to add a Lambda Trigger for your S3 Bucket?')
      .sendConfirmNo()
      .run((err: Error) => {
        if (!err) {
          resolve();
        } else {
          reject(err);
        }
      });
  });
}
