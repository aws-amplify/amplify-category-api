export type TypeName = 'Mutation' | 'Query' | 'Subscription';
export type QuerySlot = 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preDataLoad' | 'postDataLoad' | 'finish';
export type MutationSlot = 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preUpdate' | 'postUpdate' | 'finish';
export type SubscriptionSlot = 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preSubscribe';
export type TemplateType = 'req' | 'res';

export type CreateSlotOverrideNameProps = {
  typeName: TypeName;
  fieldName: string;
  slotName: QuerySlot | MutationSlot | SubscriptionSlot;
  slotIndex: number;
  templateType: TemplateType;
};

export const slotName = (p: CreateSlotOverrideNameProps): string => [
  p.typeName,
  p.fieldName,
  p.slotName,
  p.slotIndex,
  p.templateType,
  'vtl',
].join('.');
