import type { IdGenerator } from '../shared/contracts/Ids';
import type { ClockWithMath } from '../shared/contracts/Clock';
import type { IEventPublisher } from '../shared/contracts/EventPublisher';

export interface DependencyRegistry {
  readonly idGenerator: IdGenerator;
  readonly clock: ClockWithMath;
  readonly eventPublisher: IEventPublisher;
  readonly configuration: Readonly<Record<string, unknown>>;
}

export function createDependencyRegistry(
  idGenerator: IdGenerator,
  clock: ClockWithMath,
  eventPublisher: IEventPublisher,
  configuration?: Record<string, unknown>,
): DependencyRegistry {
  return {
    idGenerator,
    clock,
    eventPublisher,
    configuration: Object.freeze({ ...configuration }),
  };
}
