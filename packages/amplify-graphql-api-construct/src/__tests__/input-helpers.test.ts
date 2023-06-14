import { slotName } from '../input-helpers';

describe('slotName', () => {
  it('generates given the input params for a mutation slot', () => {
    expect(slotName({
      typeName: 'Mutation',
      fieldName: 'createTodo',
      slotName: 'postUpdate',
      slotIndex: 1,
      templateType: 'req'
    })).toEqual('Mutation.createTodo.postUpdate.1.req.vtl');
  });

  it('generates given the input params for a query slot', () => {
    expect(slotName({
      typeName: 'Query',
      fieldName: 'getTodo',
      slotName: 'preDataLoad',
      slotIndex: 2,
      templateType: 'req'
    })).toEqual('Query.getTodo.preDataLoad.2.req.vtl');
  });

  it('generates given the input params for a subscription slot', () => {
    expect(slotName({
      typeName: 'Subscription',
      fieldName: 'onUpdateTodo',
      slotName: 'preSubscribe',
      slotIndex: 3,
      templateType: 'res'
    })).toEqual('Subscription.onUpdateTodo.preSubscribe.3.res.vtl');
  });
});
