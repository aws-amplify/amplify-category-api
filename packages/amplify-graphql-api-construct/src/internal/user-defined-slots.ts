import { UserDefinedSlot, UserDefinedResolver } from '@aws-amplify/graphql-transformer-core';
import { FunctionSlot } from '../types';

/**
 * Validate that only supported props are being passed into the funciton slots.
 * @param functionSlots the slot inputs to validate.
 */
export const validateFunctionSlots = (functionSlots: FunctionSlot[]): void => {
  functionSlots.forEach(({ function: { responseMappingTemplate, requestMappingTemplate } }) => {
    if (!requestMappingTemplate && !responseMappingTemplate) {
      throw new Error('Expected at least one of either requestMappingTemplate or responseMappingTemplate');
    }
  });
};

/**
 * We'll partition any slots have both a request and response mapping template into two to make the existing system work.
 * @param functionSlots the possibly consolidated slots.
 * @returns no longer consolidated slots.
 */
export const separateSlots = (functionSlots: FunctionSlot[]): FunctionSlot[] =>
  functionSlots.flatMap((slot) => {
    if (slot.function.requestMappingTemplate && slot.function.responseMappingTemplate) {
      return [
        {
          ...slot,
          function: {
            requestMappingTemplate: slot.function.requestMappingTemplate,
          },
        },
        {
          ...slot,
          function: {
            responseMappingTemplate: slot.function.responseMappingTemplate,
          },
        },
      ];
    }
    return [slot];
  });

/**
 * Given a set of strongly typed input params, generate a valid transformer slot name.
 * @param params the slot configuration
 * @returns the slot id
 */
export const getSlotName = (params: FunctionSlot): string =>
  [
    params.typeName,
    params.fieldName,
    params.slotName,
    params.slotIndex,
    params.function.requestMappingTemplate ? 'req' : 'res',
    'vtl',
  ].join('.');

/**
 * Utility to avoid using lodash.
 * @param obj the object to deeply set values in.
 * @param path the access path.
 * @param val the value to set.
 */
const setIn = (obj: Record<any, any>, path: any[], val: any): void => {
  if (path.length === 1) {
    // eslint-disable-next-line no-param-reassign
    obj[path[0]] = val;
    return;
  }
  if (!obj[path[0]]) {
    // eslint-disable-next-line no-param-reassign
    obj[path[0]] = {};
  }
  setIn(obj[path[0]], path.slice(1), val);
};

export const parseUserDefinedSlots = (userDefinedTemplates: FunctionSlot[]): Record<string, UserDefinedSlot[]> => {
  type ResolverKey = string;
  type ResolverOrder = number;
  const groupedResolversMap: Record<ResolverKey, Record<ResolverOrder, UserDefinedSlot>> = {};

  userDefinedTemplates
    .map((slot) => [
      getSlotName(slot),
      slot.function.requestMappingTemplate
        ? slot.function.requestMappingTemplate.renderTemplate()
        : slot.function.responseMappingTemplate?.renderTemplate() ?? '',
    ])
    .forEach(([fileName, template]) => {
      const slicedSlotName = fileName.split('.');
      const resolverType = slicedSlotName[slicedSlotName.length - 2] === 'res' ? 'responseResolver' : 'requestResolver';
      const resolverName = [slicedSlotName[0], slicedSlotName[1]].join('.');
      const slotName = slicedSlotName[2];
      const resolverOrder = `order${Number(slicedSlotName[3]) || 0}`;
      const resolver: UserDefinedResolver = {
        fileName,
        template,
      };
      const slotHash = `${resolverName}#${slotName}`;
      // because a slot can have a request and response resolver, we need to group corresponding request and response resolvers
      if (slotHash in groupedResolversMap && resolverOrder in groupedResolversMap[slotHash]) {
        setIn(groupedResolversMap, [slotHash, resolverOrder, resolverType], resolver);
      } else {
        const slot = {
          resolverTypeName: slicedSlotName[0],
          resolverFieldName: slicedSlotName[1],
          slotName,
          [resolverType]: resolver,
        };
        setIn(groupedResolversMap, [slotHash, resolverOrder], slot);
      }
    });

  return Object.entries(groupedResolversMap)
    .map(([resolverNameKey, numberedSlots]) => ({
      orderedSlots: Object.entries(numberedSlots)
        .sort(([i], [j]) => i.localeCompare(j))
        .map(([_, slot]) => slot),
      resolverName: resolverNameKey.split('#')[0],
    }))
    .reduce((acc, { orderedSlots, resolverName }) => {
      if (acc[resolverName]) {
        acc[resolverName].push(...orderedSlots);
      } else {
        acc[resolverName] = orderedSlots;
      }
      return acc;
    }, {} as Record<string, UserDefinedSlot[]>);
};
