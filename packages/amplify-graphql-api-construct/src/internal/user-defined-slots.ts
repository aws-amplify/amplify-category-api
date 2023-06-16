import { UserDefinedSlot, UserDefinedResolver } from '@aws-amplify/graphql-transformer-core';
import { FunctionSlot } from '../types';

/**
 * Given a set of strongly typed input params, generate a valid transformer slot name.
 * @param params the slot configuration
 * @returns the slot id
 */
export const getSlotName = (params: FunctionSlot): string => [
  params.typeName,
  params.fieldName,
  params.slotName,
  params.slotIndex,
  params.templateType,
  'vtl',
].join('.');

/**
 * Utility to avoid using lodash.
 * @param obj the object to deeply set values in.
 * @param path the access path.
 * @param val the value to set.
 */
const setIn = (obj: Record<any, any>, path: any[], val: any): void => {
  if (path.length === 0) {
    throw new Error('expected path length >=1 for setIn');
  }
  if (path.length === 1) {
    // eslint-disable-next-line no-param-reassign
    obj[path[0]] = val;
  }
  setIn(obj[path[0]], path.slice(1), val);
};

export const parseUserDefinedSlots = (userDefinedTemplates: FunctionSlot[]): Record<string, UserDefinedSlot[]> => {
  type ResolverKey = string;
  type ResolverOrder = number;
  const groupedResolversMap: Record<ResolverKey, Record<ResolverOrder, UserDefinedSlot>> = {};

  userDefinedTemplates.map((slot) => [getSlotName(slot), slot.resolverCode]).forEach(([fileName, template]) => {
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
