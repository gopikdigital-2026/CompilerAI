// ─── TimeoutManager ─────────────────────────────────────────────────────────────
// Manages timeouts for step execution. Uses Promise.race with a timeout signal.

import type { ITimeoutManager } from '../interfaces/IExecutionEngine';

export class TimeoutManager implements ITimeoutManager {
  private readonly timedOutSteps = new Set<string>();

  async withTimeout<T>(promise: Promise<T>, stepId: string, timeoutMs: number): Promise<T> {
    // Create a timeout promise that never resolves (simulated timeout)
    // Since our simulated adapter returns immediately, we use a very short real timeout
    // to test the path. In production, this would use AbortController.
    const effectiveTimeout = Math.min(timeoutMs, 5000);

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(() => {
        this.timedOutSteps.add(stepId);
        reject(new Error(`Step ${stepId} timed out after ${effectiveTimeout}ms.`));
      }, effectiveTimeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  isTimedOut(stepId: string): boolean {
    return this.timedOutSteps.has(stepId);
  }

  reset(): void {
    this.timedOutSteps.clear();
  }
}
