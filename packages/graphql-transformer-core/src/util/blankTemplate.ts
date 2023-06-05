import Template from 'cloudform-types/types/template';

/**
 *
 * @param def
 */
export default function blankTemplate(def: Template = {}): Template {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'description',
    Metadata: {},
    Parameters: {},
    Resources: {},
    Outputs: {},
    Mappings: {},
    ...def,
  };
}
