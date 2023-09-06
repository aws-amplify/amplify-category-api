const path = require('path');
const fs = require('fs-extra');

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
class FailedTestNameReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  onRunComplete(contexts, results) {
    const failedTests = this.getFailedTestRegEx(results);
    const result = failedTests.map((title) => escapeRegex(title)).join('|');
    const { reportPath, publicPath = process.cwd() } = this._options;
    const failedTestReportPath = reportPath || './amplify-e2e-reports/amplify-e2e-failed-test.txt';
    fs.ensureDirSync(publicPath);
    fs.writeFileSync(path.resolve(failedTestReportPath), result);
  }

  getFailedTestRegEx(results) {
    let failedTestNames = [];
    if (results.testResults) {
      for (let result of results.testResults) {
        failedTestNames = [...failedTestNames, ...this.getFailedTestRegEx(result)];
      }
    } else if (results.status === 'failed') {
      failedTestNames.push(results.title);
    }

    return failedTestNames;
  }
}

module.exports = FailedTestNameReporter;
