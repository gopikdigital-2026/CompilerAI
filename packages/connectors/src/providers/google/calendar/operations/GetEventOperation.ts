import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleCalendarMapper } from '../mappers/GoogleCalendarMapper';
import type { GoogleCalendarEvent } from '../types/GoogleCalendarTypes';

export interface GetEventInput {
  readonly organizationId: string;
  readonly calendarId: string;
  readonly eventId: string;
}

export interface GetEventOutput {
  readonly event: GoogleCalendarEvent;
}

export function createGetEventOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.calendar.getEvent',
    requiredCapabilities: ['calendar.events.read'],
    retryable: true,
    idempotent: true,
    timeoutMs: 15_000,
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (typeof input['calendarId'] !== 'string' || (input['calendarId'] as string).length === 0) {
        errors.push('calendarId is required');
      }
      if (typeof input['eventId'] !== 'string' || (input['eventId'] as string).length === 0) {
        errors.push('eventId is required');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<GetEventOutput> {
      const typedInput = input as unknown as GetEventInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const response = await client.get<unknown>(
        'calendar',
        `calendars/${typedInput.calendarId}/events/${typedInput.eventId}`,
        {},
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const event = GoogleCalendarMapper.mapEvent(response.data as never);
      return { event };
    },
  };
}
