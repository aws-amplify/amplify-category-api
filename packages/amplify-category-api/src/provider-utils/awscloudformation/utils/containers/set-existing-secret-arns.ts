import * as cdk from 'aws-cdk-lib';
import _ from 'lodash';

/**
 * Check if the template contains existing secret configuration and if so, add it to the secretsMap
 * The secrets configuration is stored in the template in the following format
 * {
 *   "Resources": {
      "TaskDefinition": {
        "Type": "AWS::ECS::TaskDefinition",
        "Properties": {
          "ContainerDefinitions": [
            {
              "Secrets": [
                {
                  "Name": "SECRETNAME",
                  "ValueFrom": "<some secrets manager arn>"
                }
              }
            }
          ]
        }
      }
    }
  */
export const setExistingSecretArns = (secretsMap: Map<string, string>, cfnObj: any) => {
  if (_.isEmpty(cfnObj)) {
    return;
  }
  const taskDef = Object.values(cfnObj?.Resources) // get all the resources
    .find((value: any) => value?.Type === 'AWS::ECS::TaskDefinition') as any; // find the task definition
  const containerDefs = taskDef?.Properties?.ContainerDefinitions as any[]; // pull out just the container definitions
  if (!Array.isArray(containerDefs)) {
    return;
  }
  containerDefs
    .map((def) => def?.Secrets) // get the secrets array
    .filter((secrets) => !_.isEmpty(secrets)) // filter out defs that don't contain secrets
    .flat(1) // merge nested secrets array into one array
    .filter((secretDef) => !!secretDef?.Name) // make sure the name is defined
    .filter((secretDef) => !!secretDef.ValueFrom) // make sure the arn is defined
    .forEach((secretDef) => {
      if (typeof secretDef.ValueFrom === 'object' && secretDef.ValueFrom['Fn::Join']) {
        const [delimiter, values] = secretDef.ValueFrom['Fn::Join'];
        secretsMap.set(
          secretDef.Name,
          cdk.Fn.join(
            delimiter,
            values.map((val) => (val.Ref ? cdk.Fn.ref(val.Ref) : val)),
          ),
        );
      } else {
        secretsMap.set(secretDef.Name, secretDef.ValueFrom);
      }
    }); // add it to the secretsMap map
};
