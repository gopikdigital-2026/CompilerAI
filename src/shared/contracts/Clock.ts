export type Timestamp = string;

export type Clock = () => Timestamp;

export interface ClockWithMath extends Clock {
  addMs(ms: number): Timestamp;
  nowEpochMs(): number;
}

export function createSystemClock(): ClockWithMath {
  return Object.assign(
    () => new Date().toISOString(),
    {
      addMs: (ms: number) => new Date(Date.now() + ms).toISOString(),
      nowEpochMs: () => Date.now(),
    },
  );
}

export function createDeterministicClock(
  startEpochMs: number = 1_700_000_000_000,
  stepMs: number = 1000,
): ClockWithMath {
  let current = startEpochMs;
  return Object.assign(
    () => {
      const iso = new Date(current).toISOString();
      current += stepMs;
      return iso;
    },
    {
      addMs: (ms: number) => new Date(current + ms).toISOString(),
      nowEpochMs: () => current,
    },
  );
}

export function createFixedClock(iso: string = '2025-01-01T00:00:00.000Z'): ClockWithMath {
  const epoch = new Date(iso).getTime();
  return Object.assign(
    () => iso,
    {
      addMs: (ms: number) => new Date(epoch + ms).toISOString(),
      nowEpochMs: () => epoch,
    },
  );
}
