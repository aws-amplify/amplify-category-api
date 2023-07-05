import { JSONUtilities } from '@aws-amplify/amplify-cli-core';
import { printer } from '@aws-amplify/amplify-prompts';
import { CrudOperation, PermissionSetting } from './cdk-stack-builder/types';

export function convertDeperecatedRestApiPaths(
  deprecatedParametersFileName: string,
  deprecatedParametersFilePath: string,
  resourceName: string,
) {
  let deprecatedParameters: Record<string, any>;
  try {
    deprecatedParameters = JSONUtilities.readJson<Record<string, any>>(deprecatedParametersFilePath);
  } catch (e) {
    printer.error(`Error reading ${deprecatedParametersFileName} file for ${resourceName} resource`);
    throw e;
  }

  let paths = {};

  if (!Array.isArray(deprecatedParameters.paths) || deprecatedParameters.paths.length < 1) {
    throw new Error(`Expected paths to be defined in "${deprecatedParametersFilePath}", but none found.`);
  }

  deprecatedParameters.paths.forEach((path: Record<string, any>) => {
    let pathPermissionSetting =
      path.privacy?.open === true
        ? PermissionSetting.OPEN
        : path.privacy?.private === true
        ? PermissionSetting.PRIVATE
        : PermissionSetting.PROTECTED;

    let auth;
    let guest;
    let groups;
    // convert deprecated permissions to CRUD structure
    if (typeof path.privacy?.auth === 'string' && ['r', 'rw'].includes(path.privacy.auth)) {
      auth = _convertDeprecatedPermissionStringToCRUD(path.privacy.auth);
    } else if (Array.isArray(path.privacy?.auth)) {
      auth = _convertDeprecatedPermissionArrayToCRUD(path.privacy.auth);
    }

    if (typeof path.privacy?.unauth === 'string' && ['r', 'rw'].includes(path.privacy.unauth)) {
      guest = _convertDeprecatedPermissionStringToCRUD(path.privacy.unauth);
    } else if (Array.isArray(path.privacy?.unauth)) {
      guest = _convertDeprecatedPermissionArrayToCRUD(path.privacy.unauth);
    }

    if (path.privacy?.userPoolGroups) {
      groups = {};
      for (const [userPoolGroupName, crudOperations] of Object.entries(path.privacy.userPoolGroups)) {
        if (typeof crudOperations === 'string' && ['r', 'rw'].includes(crudOperations)) {
          groups[userPoolGroupName] = _convertDeprecatedPermissionStringToCRUD(crudOperations);
        } else if (Array.isArray(crudOperations)) {
          groups[userPoolGroupName] = _convertDeprecatedPermissionArrayToCRUD(crudOperations);
        }
      }
    }

    paths[path.name] = {
      permissions: {
        setting: pathPermissionSetting,
        auth,
        guest,
        groups,
      },
      lambdaFunction: path.lambdaFunction,
    };
  });

  return paths;
}

function _convertDeprecatedPermissionStringToCRUD(deprecatedPrivacy: string): CrudOperation[] {
  let privacyList: CrudOperation[];
  if (deprecatedPrivacy === 'r') {
    privacyList = [CrudOperation.READ];
  } else if (deprecatedPrivacy === 'rw') {
    privacyList = [CrudOperation.CREATE, CrudOperation.READ, CrudOperation.UPDATE, CrudOperation.DELETE];
  }
  return privacyList;
}

function _convertDeprecatedPermissionArrayToCRUD(deprecatedPrivacyArray: string[]): CrudOperation[] {
  const opMap: Record<string, CrudOperation> = {
    '/POST': CrudOperation.CREATE,
    '/GET': CrudOperation.READ,
    '/PUT': CrudOperation.UPDATE,
    '/PATCH': CrudOperation.UPDATE,
    '/DELETE': CrudOperation.DELETE,
  };
  return Array.from(new Set(deprecatedPrivacyArray.map((op) => opMap[op])));
}
