import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleCalendarMapper } from '../mappers/GoogleCalendarMapper';
import type { GoogleCalendarEvent } from '../types/GoogleCalendarTypes';

export interface ListEventsInput {
  readonly organizationId: string;
  readonly calendarId: string;
  readonly timeMin?: string;
  readonly timeMax?: string;
  readonly pageToken?: string;
  readonly maxResults?: number;
  readonly singleEvents?: boolean;
  readonly orderBy?: 'startTime' | 'updated';
  readonly q?: string;
}

export interface ListEventsOutput {
  readonly events: GoogleCalendarEvent[];
  readonly nextPageToken?: string;
}

export function createListEventsOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.calendar.listEvents',
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
      if (input['timeMin'] !== undefined && typeof input['timeMin'] !== 'string') {
        errors.push('timeMin must be a string');
      }
      if (input['timeMax'] !== undefined && typeof input['timeMax'] !== 'string') {
        errors.push('timeMax must be a string');
      }
      if (input['pageToken'] !== undefined && typeof input['pageToken'] !== 'string') {
        errors.push('pageToken must be a string');
      }
      if (
        input['maxResults'] !== undefined &&
        (typeof input['maxResults'] !== 'number' ||
          (input['maxResults'] as number) < 1 ||
          (input['maxResults'] as number) > 2500)
      ) {
        errors.push('maxResults must be a number between 1 and 2500');
      }
      if (input['singleEvents'] !== undefined && typeof input['singleEvents'] !== 'boolean') {
        errors.push('singleEvents must be a boolean');
      }
      if (
        input['orderBy'] !== undefined &&
        (input['orderBy'] !== 'startTime' && input['orderBy'] !== 'updated')
      ) {
        errors.push('orderBy must be either "startTime" or "updated"');
      }
      if (input['q'] !== undefined && typeof input['q'] !== 'string') {
        errors.push('q must be a string');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<ListEventsOutput> {
      const typedInput = input as unknown as ListEventsInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const response = await client.get<unknown>(
        'calendar',
        `calendars/${typedInput.calendarId}/events`,
        {
          timeMin: typedInput.timeMin,
          timeMax: typedInput.timeMax,
          pageToken: typedInput.pageToken,
          maxResults: typedInput.maxResults ?? 250,
          singleEvents: typedInput.singleEvents,
          orderBy: typedInput.orderBy,
          q: typedInput.q,
        },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const events = [...GoogleCalendarMapper.mapEventList(response.data as never)];
      const raw = response.data as { nextPageToken?: string } | null;
      return {
        events,
        nextPageToken: raw?.nextPageToken,
      };
    },
  };
}
