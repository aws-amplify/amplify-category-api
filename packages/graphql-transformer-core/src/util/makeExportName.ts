/**
 *
 * @param api
 * @param logicalId
 */
const makeExportName = (api: string, logicalId: string) => `${api}:${logicalId}`;
export default makeExportName;
