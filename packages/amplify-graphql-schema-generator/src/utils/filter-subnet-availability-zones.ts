import { SubnetAvailabilityZone } from 'graphql-transformer-common';

export const filterSubnetAvailabilityZones = (subnetAvailabilityZones: SubnetAvailabilityZone[]): SubnetAvailabilityZone[] => {
  const visitedAvailabilityZones = new Set<string>();
  const filteredResult = subnetAvailabilityZones.filter((saz) => {
    if (visitedAvailabilityZones.has(saz.availabilityZone)) {
      return false;
    } else {
      visitedAvailabilityZones.add(saz.availabilityZone);
      return true;
    }
  });

  return filteredResult;
};
