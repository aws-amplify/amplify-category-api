import { MappingTemplate } from 'aws-cdk-lib/aws-appsync';
import { getSlotName, parseUserDefinedSlots, separateSlots, validateFunctionSlots } from '../../internal/user-defined-slots';
import { FunctionSlot } from '../../types';

describe('user-defined-slots', () => {
  describe('validateFunctionSlots', () => {
    it('throws on missing properties', () => {
      expect(() => {
        validateFunctionSlots([
          {
            typeName: 'Mutation',
            fieldName: 'createTodo',
            slotName: 'postUpdate',
            slotIndex: 1,
            function: {},
          },
        ]);
      }).toThrowErrorMatchingInlineSnapshot('"Expected at least one of either requestMappingTemplate or responseMappingTemplate"');
    });
  });

  describe('separateSlots', () => {
    it('splits a slot into if both request and response mapping are defined', () => {
      const potentiallySeparatedSlots = separateSlots([
        {
          typeName: 'Mutation',
          fieldName: 'createTodo',
          slotName: 'postUpdate',
          slotIndex: 1,
          function: {
            requestMappingTemplate: MappingTemplate.fromString('Request Template'),
            responseMappingTemplate: MappingTemplate.fromString('Response Template'),
          },
        },
      ]);
      expect(potentiallySeparatedSlots.length).toEqual(2);
    });

    it('does not split on just request mapping template', () => {
      const potentiallySeparatedSlots = separateSlots([
        {
          typeName: 'Mutation',
          fieldName: 'createTodo',
          slotName: 'postUpdate',
          slotIndex: 1,
          function: {
            requestMappingTemplate: MappingTemplate.fromString('Request Template'),
          },
        },
      ]);
      expect(potentiallySeparatedSlots.length).toEqual(1);
    });

    it('does not split on just response mapping template', () => {
      const potentiallySeparatedSlots = separateSlots([
        {
          typeName: 'Mutation',
          fieldName: 'createTodo',
          slotName: 'postUpdate',
          slotIndex: 1,
          function: {
            responseMappingTemplate: MappingTemplate.fromString('Response Template'),
          },
        },
      ]);
      expect(potentiallySeparatedSlots.length).toEqual(1);
    });
  });

  describe('getSlotName', () => {
    it('generates given the input params for a mutation slot', () => {
      expect(
        getSlotName({
          typeName: 'Mutation',
          fieldName: 'createTodo',
          slotName: 'postUpdate',
          slotIndex: 1,
          function: {
            requestMappingTemplate: MappingTemplate.fromString(''),
          },
        }),
      ).toEqual('Mutation.createTodo.postUpdate.1.req.vtl');
    });

    it('generates given the input params for a query slot', () => {
      expect(
        getSlotName({
          typeName: 'Query',
          fieldName: 'getTodo',
          slotName: 'preDataLoad',
          slotIndex: 2,
          function: {
            requestMappingTemplate: MappingTemplate.fromString(''),
          },
        }),
      ).toEqual('Query.getTodo.preDataLoad.2.req.vtl');
    });

    it('generates given the input params for a subscription slot', () => {
      expect(
        getSlotName({
          typeName: 'Subscription',
          fieldName: 'onUpdateTodo',
          slotName: 'preSubscribe',
          slotIndex: 3,
          function: {
            responseMappingTemplate: MappingTemplate.fromString(''),
          },
        }),
      ).toEqual('Subscription.onUpdateTodo.preSubscribe.3.res.vtl');
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
        },
      });
    });
  });

  it('support response mapping template', () => {
    const vtl = '$utils.toJson({})';
    const functionSlot: FunctionSlot = {
      typeName: 'Mutation',
      fieldName: 'createTodo',
      slotName: 'preAuth',
      slotIndex: 1,
      function: {
        responseMappingTemplate: MappingTemplate.fromString(vtl),
      },
    };
    const parsedSlots = parseUserDefinedSlots([functionSlot]);
    expect(Object.keys(parsedSlots).length).toEqual(1);
    expect(parsedSlots['Mutation.createTodo'].length).toEqual(1);
    expect(parsedSlots['Mutation.createTodo'][0]).toMatchObject({
      responseResolver: {
        fileName: 'Mutation.createTodo.preAuth.1.res.vtl',
        template: vtl,
      },
    });
  });

  it('supports multiple slots on the same resolver', () => {
    const vtl1 = '$utils.toJson({})';
    const vtl2 = '$utils.toJson({ hi: "there" })';
    const functionSlot: FunctionSlot = {
      typeName: 'Mutation',
      fieldName: 'createTodo',
      slotName: 'preAuth',
      slotIndex: 1,
      function: {
        responseMappingTemplate: MappingTemplate.fromString(vtl1),
      },
    };
    const functionSlot2: FunctionSlot = {
      typeName: 'Mutation',
      fieldName: 'createTodo',
      slotName: 'preAuth',
      slotIndex: 2,
      function: {
        responseMappingTemplate: MappingTemplate.fromString(vtl2),
      },
    };
    const parsedSlots = parseUserDefinedSlots([functionSlot, functionSlot2]);
    expect(Object.keys(parsedSlots).length).toEqual(1);
    expect(parsedSlots['Mutation.createTodo'].length).toEqual(2);
    expect(parsedSlots['Mutation.createTodo']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          responseResolver: {
            fileName: 'Mutation.createTodo.preAuth.1.res.vtl',
            template: vtl1,
          },
        }),
        expect.objectContaining({
          responseResolver: {
            fileName: 'Mutation.createTodo.preAuth.2.res.vtl',
            template: vtl2,
          },
        }),
      ]),
    );
  });
});
