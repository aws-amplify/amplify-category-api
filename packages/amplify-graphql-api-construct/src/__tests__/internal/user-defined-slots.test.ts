import { getSlotName } from '../../internal/user-defined-slots';

describe('getSlotName', () => {
  it('generates given the input params for a mutation slot', () => {
    expect(getSlotName({
      typeName: 'Mutation',
      fieldName: 'createTodo',
      slotName: 'postUpdate',
      slotIndex: 1,
      templateType: 'req',
      resolverCode: '',
    })).toEqual('Mutation.createTodo.postUpdate.1.req.vtl');
  });

  it('generates given the input params for a query slot', () => {
    expect(getSlotName({
      typeName: 'Query',
      fieldName: 'getTodo',
      slotName: 'preDataLoad',
      slotIndex: 2,
      templateType: 'req',
      resolverCode: '',
    })).toEqual('Query.getTodo.preDataLoad.2.req.vtl');
  });

  it('generates given the input params for a subscription slot', () => {
    expect(getSlotName({
      typeName: 'Subscription',
      fieldName: 'onUpdateTodo',
      slotName: 'preSubscribe',
      slotIndex: 3,
      templateType: 'res',
      resolverCode: '',
    })).toEqual('Subscription.onUpdateTodo.preSubscribe.3.res.vtl');
  });
});
