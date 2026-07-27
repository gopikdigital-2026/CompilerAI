import type { Page, ConsoleMessage } from '@playwright/test';

const ALLOWED_ERRORS = [
  'favicon',
  'net::ERR_CONNECTION_REFUSED',
  'net::ERR_EMPTY_RESPONSE',
];

const criticalErrors: string[] = [];

export function attachConsoleErrorCapture(page: Page) {
  criticalErrors.length = 0;

  page.on('pageerror', (err: Error) => {
    const msg = err.message;
    if (!ALLOWED_ERRORS.some((a) => msg.includes(a))) {
      criticalErrors.push(`pageerror: ${msg}`);
    }
  });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!ALLOWED_ERRORS.some((a) => text.includes(a))) {
        criticalErrors.push(`console.error: ${text}`);
      }
    }
  });

  page.on('response', (res) => {
    if (res.status() >= 500) {
      criticalErrors.push(`HTTP ${res.status()}: ${res.url()}`);
    }
  });
}

export function getCriticalErrors(): string[] {
  return [...criticalErrors];
}

export function assertNoCriticalErrors() {
  const errors = getCriticalErrors();
  if (errors.length > 0) {
    throw new Error(
      `Critical console/network errors detected:\n${errors.join('\n')}`,
    );
  }
}
