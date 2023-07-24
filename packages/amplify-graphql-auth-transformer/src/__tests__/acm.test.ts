import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { AuthTransformer } from '..';
import { AcmTest, acmTests } from './acm-test-library';

const testSchemaACM = (test: AcmTest): void => {
  const authTransformer = new AuthTransformer();
  testTransform({
    schema: test.sdl,
    authConfig: test.authConfig,
    transformers: [new ModelTransformer(), new IndexTransformer(), new PrimaryKeyTransformer(), authTransformer],
  });

  test.models.forEach((model) => {
    const acm = (authTransformer as any).authModelConfig.get(model.name);
    expect(acm).toBeDefined();
    const resourceFields = acm.getResources();

    model.validations.forEach((validation) => {
      Object.entries(validation.operations).forEach(([operation, fields]) => {
        const role = acm.getRolesPerOperation(operation).find((it: string) => it === validation.roleType);
        expect(role || (!role && fields.length === 0)).toBeTruthy();

        if (role) {
          const allowedFields = resourceFields.filter((resource: any) => acm.isAllowed(role, resource, operation));
          expect(allowedFields).toEqual(fields);
        }
      });
    });
  });
};

describe('acm tests', () => {
  Object.entries(acmTests).forEach(([name, test]) => {
    it(`ACM test '${name}' passes as expected`, () => {
      testSchemaACM(test);
    });
  });
});
