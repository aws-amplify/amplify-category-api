import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { removeSync } from 'fs-extra';
import { promisify } from 'util';
import { cdkSynth, initMinimalCDKProject } from '../commands';
import { DURATION_1_HOUR } from '../utils/duration-constants';

jest.setTimeout(DURATION_1_HOUR);

const execFileAsync = promisify(execFile);

type CloudFormationTemplate = {
  Description?: string;
  Resources?: Record<string, { Type?: string }>;
};

const FUNCTION_DIRECTIVE_STACK_TEMPLATE_PATTERN = /FunctionDirectiveStack(?:Iam)?[0-9A-Fa-f]*\.nested\.template\.json$/;

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

const readTemplate = (templatePath: string): CloudFormationTemplate =>
  JSON.parse(fs.readFileSync(templatePath, 'utf8')) as CloudFormationTemplate;

const initFunctionDirectiveFixture = async (projRoot: string): Promise<void> => {
  const templatePath = path.resolve(path.join(__dirname, 'backends', 'function-directive-stack-limits'));
  await initMinimalCDKProject(projRoot, templatePath, { construct: 'Data' });
};

const synthFunctionDirectiveFixture = async (projRoot: string, fieldCount: number): Promise<string> => {
  const previousFunctionFieldCount = process.env.FUNCTION_DIRECTIVE_FIELD_COUNT;
  process.env.FUNCTION_DIRECTIVE_FIELD_COUNT = String(fieldCount);
  try {
    return await cdkSynth(projRoot);
  } finally {
    if (previousFunctionFieldCount === undefined) {
      delete process.env.FUNCTION_DIRECTIVE_FIELD_COUNT;
    } else {
      process.env.FUNCTION_DIRECTIVE_FIELD_COUNT = previousFunctionFieldCount;
    }
  }
};

const synthFunctionDirectiveFixtureFailure = async (projRoot: string, fieldCount: number): Promise<string> => {
  try {
    await execFileAsync('npx', ['cdk', 'synth', '--all', '--quiet'], {
      cwd: projRoot,
      env: {
        ...process.env,
        FUNCTION_DIRECTIVE_FIELD_COUNT: String(fieldCount),
        npm_config_registry: 'https://registry.npmjs.org/',
      },
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    const execError = error as Error & { stdout?: string; stderr?: string };
    return [execError.message, execError.stdout, execError.stderr].filter(Boolean).join('\n');
  }

  throw new Error('Expected CDK synth to fail for pinned @function AppSync resources over the stack limit.');
};

const resourceCountsByType = (templates: CloudFormationTemplate[]): Map<string, number> => {
  const countsByType = new Map<string, number>();

  templates.forEach((template) => {
    Object.values(template.Resources ?? {}).forEach((resource) => {
      if (!resource.Type) {
        return;
      }

      countsByType.set(resource.Type, (countsByType.get(resource.Type) ?? 0) + 1);
    });
  });

  return countsByType;
};

const resourceTemplateNamesByType = (templatePaths: string[]): Map<string, Set<string>> => {
  const templatesByType = new Map<string, Set<string>>();

  templatePaths.forEach((templatePath) => {
    const template = readTemplate(templatePath);
    const templateName = path.basename(templatePath);

    Object.values(template.Resources ?? {}).forEach((resource) => {
      if (!resource.Type) {
        return;
      }

      const templateNames = templatesByType.get(resource.Type) ?? new Set<string>();
      templateNames.add(templateName);
      templatesByType.set(resource.Type, templateNames);
    });
  });

  return templatesByType;
};

describe('Function directive stack limits', () => {
  let projRoot: string;

  beforeAll(async () => {
    projRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'functionstacklimits-'));
    await initFunctionDirectiveFixture(projRoot);
  });

  afterAll(() => {
    if (projRoot) {
      removeSync(projRoot);
    }
  });

  test('shards large Data construct @function stacks with IAM field auth during CDK synth', async () => {
    const synthOutputPath = await synthFunctionDirectiveFixture(projRoot, 86);
    const functionDirectiveTemplatePaths = findTemplatePaths(synthOutputPath).filter((templatePath) =>
      FUNCTION_DIRECTIVE_STACK_TEMPLATE_PATTERN.test(path.basename(templatePath)),
    );
    const functionDirectiveTemplates = functionDirectiveTemplatePaths.map(readTemplate);
    const functionDirectiveResourceCounts = functionDirectiveTemplates.map((template) => Object.keys(template.Resources ?? {}).length);
    const templateNamesByType = resourceTemplateNamesByType(functionDirectiveTemplatePaths);
    const dataSourceTemplateNames = templateNamesByType.get('AWS::AppSync::DataSource') ?? new Set<string>();
    const iamRoleTemplateNames = templateNamesByType.get('AWS::IAM::Role') ?? new Set<string>();
    const iamPolicyTemplateNames = templateNamesByType.get('AWS::IAM::Policy') ?? new Set<string>();

    expect(functionDirectiveTemplates.length).toBeGreaterThan(1);
    expect(functionDirectiveResourceCounts.reduce((sum, resourceCount) => sum + resourceCount, 0)).toBeGreaterThan(500);
    expect(Math.max(...functionDirectiveResourceCounts)).toBeLessThan(500);
    expect(dataSourceTemplateNames.size).toBe(1);
    expect(templateNamesByType.get('AWS::AppSync::FunctionConfiguration')).toEqual(dataSourceTemplateNames);
    expect(templateNamesByType.get('AWS::AppSync::Resolver')).toEqual(dataSourceTemplateNames);
    expect(iamRoleTemplateNames.size).toBeGreaterThanOrEqual(1);
    expect(iamPolicyTemplateNames.size).toBeGreaterThanOrEqual(1);
    expect(Array.from(iamRoleTemplateNames).some((templateName) => dataSourceTemplateNames.has(templateName))).toBe(false);
    expect(Array.from(iamPolicyTemplateNames).some((templateName) => dataSourceTemplateNames.has(templateName))).toBe(false);
  });

  test('keeps pinned @function AppSync resources under the stack limit while moving IAM resources separately', async () => {
    const synthOutputPath = await synthFunctionDirectiveFixture(projRoot, 124);
    const functionDirectiveTemplatePaths = findTemplatePaths(synthOutputPath).filter((templatePath) =>
      FUNCTION_DIRECTIVE_STACK_TEMPLATE_PATTERN.test(path.basename(templatePath)),
    );
    const functionDirectiveTemplates = functionDirectiveTemplatePaths.map(readTemplate);
    const functionDirectiveResourceCounts = functionDirectiveTemplates.map((template) => Object.keys(template.Resources ?? {}).length);
    const templateNamesByType = resourceTemplateNamesByType(functionDirectiveTemplatePaths);
    const functionDirectiveResourceCountsByType = resourceCountsByType(functionDirectiveTemplates);
    const dataSourceTemplateNames = templateNamesByType.get('AWS::AppSync::DataSource') ?? new Set<string>();
    const iamRoleTemplateNames = templateNamesByType.get('AWS::IAM::Role') ?? new Set<string>();
    const iamPolicyTemplateNames = templateNamesByType.get('AWS::IAM::Policy') ?? new Set<string>();

    expect(functionDirectiveTemplates.length).toBeGreaterThan(1);
    expect(Math.max(...functionDirectiveResourceCounts)).toBeLessThanOrEqual(500);
    expect(functionDirectiveResourceCountsByType.get('AWS::AppSync::DataSource')).toBe(124);
    expect(functionDirectiveResourceCountsByType.get('AWS::AppSync::FunctionConfiguration')).toBe(248);
    expect(functionDirectiveResourceCountsByType.get('AWS::AppSync::Resolver')).toBe(124);
    expect(dataSourceTemplateNames.size).toBe(1);
    expect(templateNamesByType.get('AWS::AppSync::FunctionConfiguration')).toEqual(dataSourceTemplateNames);
    expect(templateNamesByType.get('AWS::AppSync::Resolver')).toEqual(dataSourceTemplateNames);
    expect(iamRoleTemplateNames.size).toBeGreaterThanOrEqual(1);
    expect(iamPolicyTemplateNames.size).toBeGreaterThanOrEqual(1);
    expect(Array.from(iamRoleTemplateNames).some((templateName) => dataSourceTemplateNames.has(templateName))).toBe(false);
    expect(Array.from(iamPolicyTemplateNames).some((templateName) => dataSourceTemplateNames.has(templateName))).toBe(false);
  });

  test('reports when pinned @function AppSync resources cannot be safely sharded', async () => {
    const synthOutput = await synthFunctionDirectiveFixtureFailure(projRoot, 125);

    expect(synthOutput).toMatch(/pinned AppSync resources/);
    expect(synthOutput).toMatch(/Automatic sharding cannot safely move AppSync/);
  });
});
