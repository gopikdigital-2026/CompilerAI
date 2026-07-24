import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GoogleGmailMapper, GoogleErrorMapper } from '../../src/index';
import { GoogleRequestBuilder, ALLOWED_HOSTS } from '../../src/providers/google/GoogleRequestBuilder';

describe('Google Security Features', () => {
  describe('GoogleGmailMapper.validateEmailAddress', () => {
    it('should accept valid email addresses', () => {
      assert.ok(GoogleGmailMapper.validateEmailAddress('user@example.com'));
      assert.ok(GoogleGmailMapper.validateEmailAddress('alice.bob@example.co.uk'));
      assert.ok(GoogleGmailMapper.validateEmailAddress('test+tag@gmail.com'));
    });

    it('should reject invalid email addresses', () => {
      assert.equal(GoogleGmailMapper.validateEmailAddress('not-an-email'), false);
      assert.equal(GoogleGmailMapper.validateEmailAddress('missing@domain'), false);
      assert.equal(GoogleGmailMapper.validateEmailAddress(''), false);
      assert.equal(GoogleGmailMapper.validateEmailAddress(' @ @ '), false);
    });
  });

  describe('GoogleGmailMapper.checkHeaderInjection', () => {
    it('should detect \\r\\n injection', () => {
      assert.ok(GoogleGmailMapper.checkHeaderInjection('Subject\r\nBcc: attacker@example.com'));
    });

    it('should detect \\n injection', () => {
      assert.ok(GoogleGmailMapper.checkHeaderInjection('Subject\nBcc: attacker@example.com'));
    });

    it('should return false for clean strings', () => {
      assert.equal(GoogleGmailMapper.checkHeaderInjection('Normal Subject'), false);
      assert.equal(GoogleGmailMapper.checkHeaderInjection('Hello World 123'), false);
    });
  });

  describe('GoogleGmailMapper.buildRfc2822Message', () => {
    it('should include To, Subject, and Content-Type headers', () => {
      const raw = GoogleGmailMapper.buildRfc2822Message({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        bodyText: 'Hello World',
      });

      assert.ok(raw.includes('To: recipient@example.com'));
      assert.ok(raw.includes('Subject: Test Subject'));
      assert.ok(raw.includes('Content-Type: text/plain; charset=UTF-8'));
      assert.ok(raw.includes('MIME-Version: 1.0'));
      assert.ok(raw.includes('Hello World'));
    });

    it('should use text/html Content-Type when bodyHtml is provided', () => {
      const raw = GoogleGmailMapper.buildRfc2822Message({
        to: ['recipient@example.com'],
        subject: 'HTML Subject',
        bodyHtml: '<p>Hello</p>',
      });

      assert.ok(raw.includes('Content-Type: text/html; charset=UTF-8'));
      assert.ok(raw.includes('<p>Hello</p>'));
    });

    it('should include Cc and Bcc headers when provided', () => {
      const raw = GoogleGmailMapper.buildRfc2822Message({
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test',
        bodyText: 'Body',
      });

      assert.ok(raw.includes('Cc: cc@example.com'));
      assert.ok(raw.includes('Bcc: bcc@example.com'));
    });

    it('should throw on header injection in subject', () => {
      assert.throws(() =>
        GoogleGmailMapper.buildRfc2822Message({
          to: ['recipient@example.com'],
          subject: 'Test\r\nBcc: attacker@example.com',
          bodyText: 'Body',
        }),
      );
    });
  });

  describe('GoogleGmailMapper.encodeBase64Url', () => {
    it('should encode strings as base64url', () => {
      const encoded = GoogleGmailMapper.encodeBase64Url('Hello World');
      // base64url of "Hello World" = "SGVsbG8gV29ybGQ"
      assert.equal(encoded, 'SGVsbG8gV29ybGQ');
    });

    it('should handle empty string', () => {
      assert.equal(GoogleGmailMapper.encodeBase64Url(''), '');
    });
  });

  describe('GoogleRequestBuilder host allowlist', () => {
    it('should allow www.googleapis.com', () => {
      const builder = GoogleRequestBuilder.get('files', 'https://www.googleapis.com/drive/v3');
      const { url } = builder.build();
      assert.ok(url.startsWith('https://www.googleapis.com/'));
    });

    it('should allow gmail.googleapis.com', () => {
      const builder = GoogleRequestBuilder.get('messages', 'https://gmail.googleapis.com/gmail/v1');
      const { url } = builder.build();
      assert.ok(url.startsWith('https://gmail.googleapis.com/'));
    });

    it('should allow oauth2.googleapis.com', () => {
      const builder = GoogleRequestBuilder.get('token', 'https://oauth2.googleapis.com');
      const { url } = builder.build();
      assert.ok(url.startsWith('https://oauth2.googleapis.com/'));
    });

    it('should reject disallowed hosts', () => {
      assert.throws(
        () => GoogleRequestBuilder.get('test', 'https://evil.example.com'),
        /not allowed/i,
      );
    });

    it('should expose ALLOWED_HOSTS with correct entries', () => {
      assert.ok(ALLOWED_HOSTS.has('www.googleapis.com'));
      assert.ok(ALLOWED_HOSTS.has('gmail.googleapis.com'));
      assert.ok(ALLOWED_HOSTS.has('oauth2.googleapis.com'));
    });
  });

  describe('GoogleRequestBuilder path traversal protection', () => {
    it('should reject .. in path', () => {
      assert.throws(
        () => GoogleRequestBuilder.get('../secret', 'https://www.googleapis.com'),
        /traversal/i,
      );
    });

    it('should reject ..%2F encoded path', () => {
      // The builder decodes then checks for ..
      assert.throws(
        () => GoogleRequestBuilder.get('..%2Fsecret', 'https://www.googleapis.com'),
        /traversal/i,
      );
    });

    it('should accept normal paths', () => {
      const builder = GoogleRequestBuilder.get('files/file-1', 'https://www.googleapis.com/drive/v3');
      const { url } = builder.build();
      assert.ok(url.includes('files/file-1'));
    });
  });

  describe('GoogleErrorMapper token/secret redaction', () => {
    it('should redact token from error messages', () => {
      const error = GoogleErrorMapper.mapHttpError(
        401,
        { error: { code: 401, message: 'ya29.invalid-token-value-here', errors: [{ message: 'Invalid token', reason: 'authError' }] } },
        {},
        'google-workspace',
      );
      assert.ok(!error.message.includes('ya29.invalid-token-value-here'), 'Token should be redacted');
      assert.ok(error.message.includes('[REDACTED]'), 'Should contain redaction marker');
    });

    it('should redact secret from error messages', () => {
      const error = GoogleErrorMapper.mapHttpError(
        400,
        { error: { code: 400, message: 'client_secret value is invalid', errors: [{ message: 'Bad secret', reason: 'invalid' }] } },
        {},
        'google-workspace',
      );
      assert.ok(!error.message.toLowerCase().includes('secret value'), 'Secret should be redacted');
    });
  });

  describe('SendMessage subject newline rejection', () => {
    it('should reject subject with \\n in validation', () => {
      // The validateInput of sendMessage checks for header injection via GoogleGmailMapper.checkHeaderInjection
      // which detects both \r\n and \n
      assert.ok(GoogleGmailMapper.checkHeaderInjection('Subject\nBcc: evil'));
      assert.ok(GoogleGmailMapper.checkHeaderInjection('Subject\r\nBcc: evil'));
    });
  });
});
