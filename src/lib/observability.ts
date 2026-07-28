import { useEffect } from 'react';
import { logger } from './logger';
import { track } from './telemetry';

interface ErrorEvent {
  type: string;
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: string;
}

const ERROR_BUFFER: ErrorEvent[] = [];
const MAX_BUFFER = 50;

function recordError(event: ErrorEvent) {
  ERROR_BUFFER.push(event);
  if (ERROR_BUFFER.length > MAX_BUFFER) ERROR_BUFFER.shift();
  logger.error(`js_${event.type}`, {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    stack: event.stack?.slice(0, 500),
  });
  track('js_error', { type: event.type, message: event.message.slice(0, 200) });
}

export function initObservability() {
  window.addEventListener('error', (e: ErrorEvent) => {
    recordError({
      type: 'uncaught_error',
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
      timestamp: new Date().toISOString(),
    });
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason = e.reason;
    recordError({
      type: 'unhandled_promise',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  });
}

export function getRecentErrors(): ErrorEvent[] {
  return [...ERROR_BUFFER];
}

export function clearErrorBuffer() {
  ERROR_BUFFER.length = 0;
}
