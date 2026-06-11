import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { removeSync } from 'fs-extra';
import { cdkSynth, initMinimalCDKProject } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

type CloudFormationTemplate = {
  Description?: string;
  Resources?: Record<string, unknown>;
};

const FUNCTION_DIRECTIVE_STACK_TEMPLATE_PATTERN = /FunctionDirectiveStack[0-9A-Fa-f]*\.nested\.template\.json$/;

const findTemplatePaths = (directoryPath: string): string[] => {
  const pendingPaths = [directoryPath];
  const templatePaths: string[] = [];

  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop()!;
    fs.readdirSync(currentPath, { withFileTypes: true }).forEach((dirent) => {
      const entryPath = path.join(currentPath, dirent.name);
      if (dirent.isDirectory()) {
        pendingPaths.push(entryPath);
      } else if (dirent.isFile() && dirent.name.endsWith('.template.json')) {
        templatePaths.push(entryPath);
      }
    });
  }

  return templatePaths;
};

const readTemplate = (templatePath: string): CloudFormationTemplate => JSON.parse(fs.readFileSync(templatePath, 'utf8')) as CloudFormationTemplate;

describe('Function directive stack limits', () => {
  let projRoot: string;

  beforeEach(async () => {
    projRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'functionstacklimits-'));
  });

  afterEach(() => {
    if (projRoot) {
      removeSync(projRoot);
    }
  });

  test('shards large Data construct @function stacks with IAM field auth during CDK synth', async () => {
    const templatePath = path.resolve(path.join(__dirname, 'backends', 'function-directive-stack-limits'));
    await initMinimalCDKProject(projRoot, templatePath, { construct: 'Data' });

    const synthOutputPath = await cdkSynth(projRoot);
    const functionDirectiveTemplates = findTemplatePaths(synthOutputPath)
      .filter((templatePath) => FUNCTION_DIRECTIVE_STACK_TEMPLATE_PATTERN.test(path.basename(templatePath)))
      .map(readTemplate);
    const functionDirectiveResourceCounts = functionDirectiveTemplates.map((template) => Object.keys(template.Resources ?? {}).length);

    expect(functionDirectiveTemplates.length).toBeGreaterThan(1);
    expect(functionDirectiveResourceCounts.reduce((sum, resourceCount) => sum + resourceCount, 0)).toBeGreaterThan(500);
    expect(Math.max(...functionDirectiveResourceCounts)).toBeLessThan(500);
  });
});
