import { MultiTenantDirectiveConfiguration } from '../types';
import { generateVTL } from '../utils/helpers';
import { VTL_CROSS_TENANT_CHECK_TEMPLATE, VTL_TENANT_VALIDATION_TEMPLATE } from '../utils/constants';

/**
 * Generate tenant validation VTL snippet
 */
export function generateTenantValidation(config: MultiTenantDirectiveConfiguration): string {
  const { tenantIdClaim } = config;

  return generateVTL(VTL_TENANT_VALIDATION_TEMPLATE, {
    tenantIdClaim,
    errorType: 'Unauthorized',
  });
}

/**
 * Generate cross-tenant access check VTL snippet
 */
export function generateCrossTenantCheck(config: MultiTenantDirectiveConfiguration): string {
  const { tenantField, tenantIdClaim } = config;

  return generateVTL(VTL_CROSS_TENANT_CHECK_TEMPLATE, {
    tenantField,
    tenantIdClaim,
  });
}

/**
 * Wrap resolver template with tenant validation
 */
export function wrapWithTenantValidation(
  originalTemplate: string,
  config: MultiTenantDirectiveConfiguration,
): string {
  const validation = generateTenantValidation(config);
  return `${validation}\n${originalTemplate}`;
}

/**
 * Wrap resolver response template with cross-tenant check
 */
export function wrapWithCrossTenantCheck(
  originalTemplate: string,
  config: MultiTenantDirectiveConfiguration,
): string {
  const check = generateCrossTenantCheck(config);
  return `${check}\n${originalTemplate}`;
}
