import { MappingTemplate } from 'aws-cdk-lib/aws-appsync';
import { getSlotName, parseUserDefinedSlots } from '../../internal/user-defined-slots';
import { FunctionSlot } from '../../types';

describe('user-defined-slots', () => {
  describe('getSlotName', () => {
    it('generates given the input params for a mutation slot', () => {
      expect(getSlotName({
        typeName: 'Mutation',
        fieldName: 'createTodo',
        slotName: 'postUpdate',
        slotIndex: 1,
        function: {
          requestMappingTemplate: MappingTemplate.fromString(''),
        },
      })).toEqual('Mutation.createTodo.postUpdate.1.req.vtl');
    });

    it('generates given the input params for a query slot', () => {
      expect(getSlotName({
        typeName: 'Query',
        fieldName: 'getTodo',
        slotName: 'preDataLoad',
        slotIndex: 2,
        function: {
          requestMappingTemplate: MappingTemplate.fromString(''),
        },
      })).toEqual('Query.getTodo.preDataLoad.2.req.vtl');
    });

    it('generates given the input params for a subscription slot', () => {
      expect(getSlotName({
        typeName: 'Subscription',
        fieldName: 'onUpdateTodo',
        slotName: 'preSubscribe',
        slotIndex: 3,
        function: {
          responseMappingTemplate: MappingTemplate.fromString(''),
        },
      })).toEqual('Subscription.onUpdateTodo.preSubscribe.3.res.vtl');
    });
  });

  describe('parseUserDefinedSlots', () => {
    it('passes on a input', () => {
      const requestResolverVtl = '$utils.toJson({})';
      const functionSlot: FunctionSlot = {
        typeName: 'Mutation',
        fieldName: 'createTodo',
        slotName: 'preAuth',
        slotIndex: 1,
        function: {
          requestMappingTemplate: MappingTemplate.fromString(requestResolverVtl),
        },
      };
      const parsedSlots = parseUserDefinedSlots([functionSlot]);
      expect(Object.keys(parsedSlots).length).toEqual(1);
      expect(parsedSlots['Mutation.createTodo'].length).toEqual(1);
      expect(parsedSlots['Mutation.createTodo'][0]).toMatchObject({
        requestResolver: {
          fileName: 'Mutation.createTodo.preAuth.1.req.vtl',
          template: requestResolverVtl,
        }
      });
    });
  });
});