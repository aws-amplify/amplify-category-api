import * as execa from 'execa';

const main: () => void = () => {
  if (process.env.CODEBUILD) {
    console.log('Skipping config verification since this is already running in a CI environment.');
    return;
  }
  try {
    execa.commandSync('which git-secrets');
  } catch {
    console.error(
      "Please install awslabs git-secrets plugin to validate you've not checked in any application secrets. Installation information can be found at https://github.com/awslabs/git-secrets#installing-git-secrets",
    );
    process.exit(1);
  }
  execa.commandSync('git secrets --register-aws');
  const allowedSecrets = ['123456789012', '123123456456', 'undefined'];
  const allowed = execa.commandSync('git config --get secrets.allowed').stdout;
  allowedSecrets.forEach((allowedSecret) => {
    if (!allowed.includes(allowedSecret)) {
      execa.commandSync(`git config --add secrets.allowed ${allowedSecret}`);
    }
  });
  try {
    execa.commandSync('git secrets --scan');
  } catch {
    console.error('"git secrets --scan" command failed. Please check your project for application secrets.');
    process.exit(1);
  }
};
main();
