import { addMockDataToGitIgnore } from '../utils';
import { APITest } from './api';

export async function start(context) {
  const testApi = new APITest();
  try {
    addMockDataToGitIgnore(context);
    await testApi.start(context);
  } catch (e) {
    console.log(e);
    // Sending term signal so we clean up after ourselves
    process.kill(process.pid, 'SIGTERM');
  }
}
