import { DeploymentResources } from '@aws-amplify/graphql-transformer-test-utils';
import { DocumentNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';

/**
 * Gets a type from Doc Node
 */
export const getObjectType = (doc: DocumentNode, type: string): ObjectTypeDefinitionNode | undefined =>
  doc.definitions.find((def) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === type) as
    | ObjectTypeDefinitionNode
    | undefined;

/**
 * Gets a field from a Def Node
 */
export const getField = (obj: ObjectTypeDefinitionNode, fieldName: string): FieldDefinitionNode | void =>
  obj.fields?.find((f) => f.name.value === fieldName);

export const expectStashValueLike = (out: DeploymentResources, stackName: string, expectedStashRecord: string): void => {
  const resolverLogicalId = `Create${stackName}Resolver`;
  const serializedBeforeTemplate = JSON.stringify(out.stacks[stackName].Resources![resolverLogicalId].Properties.RequestMappingTemplate);
  expect(serializedBeforeTemplate).toContain(expectedStashRecord);
};

export const expectNoStashValueLike = (out: DeploymentResources, stackName: string, expectedStashRecord: string): void => {
  const resolverLogicalId = `Create${stackName}Resolver`;
  const serializedBeforeTemplate = JSON.stringify(out.stacks[stackName].Resources![resolverLogicalId].Properties.RequestMappingTemplate);
  expect(serializedBeforeTemplate).not.toContain(expectedStashRecord);
};
