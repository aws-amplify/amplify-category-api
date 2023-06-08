/**
 * Common slot parameters.
 */
export type CreateSlotOverrideBaseParams = {
  fieldName: string;
  slotIndex: number;
  templateType: 'req' | 'res';
};

/**
 * Slot types for Mutation Resolvers.
 */
export type CreateSlotOverrideMutationParams = CreateSlotOverrideBaseParams & {
  typeName: 'Mutation';
  slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preUpdate' | 'postUpdate' | 'finish';
};

/**
 * Slot types for Query Resolvers.
 */
export type CreateSlotOverrideQueryParams = CreateSlotOverrideBaseParams & {
  typeName: 'Query';
  slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preDataLoad' | 'postDataLoad' | 'finish';
};

/**
 * Slot types for Subscription Resolvers.
 */
export type CreateSlotOverrideSubscriptionParams = CreateSlotOverrideBaseParams & {
  typeName: 'Subscription';
  slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preSubscribe';
};

/**
 * Input params to uniquely identify the slot which is being overridden.
 */
export type CreateSlotOverrideParams =
  | CreateSlotOverrideMutationParams
  | CreateSlotOverrideQueryParams
  | CreateSlotOverrideSubscriptionParams;

/**
 * Given a set of strongly typed input params, generate a valid transformer slot name.
 * @param params the slot configuration
 * @returns the slot id
 */
export const slotName = (params: CreateSlotOverrideParams): string => [
  params.typeName,
  params.fieldName,
  params.slotName,
  params.slotIndex,
  params.templateType,
  'vtl',
].join('.');
