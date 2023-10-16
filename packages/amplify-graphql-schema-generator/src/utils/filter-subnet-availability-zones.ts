import { SubnetAvailabilityZone } from '@aws-amplify/graphql-transformer-interfaces';

export const filterSubnetAvailabilityZones = (subnetAvailabilityZones: SubnetAvailabilityZone[]): SubnetAvailabilityZone[] => {
  const visitedAvailabilityZones = new Set<string>();
  const filteredResult = subnetAvailabilityZones.filter((saz) => {
    if (visitedAvailabilityZones.has(saz.AvailabilityZone)) {
      return false;
    } else {
      visitedAvailabilityZones.add(saz.AvailabilityZone);
      return true;
    }
  });

  return filteredResult;
};
