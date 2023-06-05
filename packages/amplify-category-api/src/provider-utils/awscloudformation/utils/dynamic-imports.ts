import * as path from 'path';

/**
 *
 * @param service
 */
export const serviceMetadataFor = async (service: string) => (await import(path.join('..', '..', 'supported-services'))).supportedServices[service];

/**
 *
 * @param datasource
 */
export const datasourceMetadataFor = async (datasource: string) => (await import(path.join('..', '..', 'supported-datasources'))).supportedDataSources[datasource];

/**
 *
 * @param walkthroughFilename
 */
export const getServiceWalkthrough = async (walkthroughFilename: string) => (await import(path.join('..', 'service-walkthroughs', walkthroughFilename))).serviceWalkthrough;
