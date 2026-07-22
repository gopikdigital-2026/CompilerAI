// ─── RuntimeRequestValidator ────────────────────────────────────────────────────

import type { IRuntimeRequestValidator } from '../interfaces/RuntimeInterfaces';
import type { RuntimeRequest } from '../models/RuntimeRequest';
import { validateRequest, checkTenantAccess } from '../policies/RuntimePolicies';

export class RuntimeRequestValidator implements IRuntimeRequestValidator {
  validate(request: RuntimeRequest): { valid: boolean; errors: string[] } {
    const errors = validateRequest(request);
    if (request.intelligenceRequest) {
      const intelReq = request.intelligenceRequest;
      if (!checkTenantAccess(intelReq.contextRequest.organizationId, request.organizationId)) {
        errors.push('Organization mismatch between runtime request and intelligence request.');
      }
    } else {
      errors.push('intelligenceRequest is required.');
    }
    return { valid: errors.length === 0, errors };
  }
}
