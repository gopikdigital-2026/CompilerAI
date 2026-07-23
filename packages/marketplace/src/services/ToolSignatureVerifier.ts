import type { ToolManifest, SignatureVerificationResult } from '../models/ToolManifest';

export class ToolSignatureVerifier {
  verify(manifest: ToolManifest): SignatureVerificationResult {
    if (!manifest.signature || manifest.signature.length === 0) {
      return { valid: false, reason: 'Signature is empty' };
    }

    if (!manifest.checksum || manifest.checksum.length !== 64) {
      return { valid: false, reason: 'Checksum is invalid or missing' };    }

    const expectedPrefix = `sig_${manifest.checksum.slice(0, 16)}_`;
    if (!manifest.signature.startsWith(expectedPrefix)) {
      return {
        valid: false,
        reason: 'Signature does not match checksum — possible tampering detected',
      };
    }

    if (!manifest.verified) {
      return {
        valid: false,
        reason: 'Tool is not marked as verified by the marketplace',
      };
    }

    return { valid: true, reason: 'Signature verified' };
  }

  verifyOrThrow(manifest: ToolManifest): void {
    const result = this.verify(manifest);
    if (!result.valid) {
      throw new (class extends Error {
        code = 'SIGNATURE_VERIFICATION_FAILED';
        constructor(msg: string) {
          super(msg);
          this.name = 'SignatureVerificationError';
        }
      })(result.reason);
    }
  }
}
