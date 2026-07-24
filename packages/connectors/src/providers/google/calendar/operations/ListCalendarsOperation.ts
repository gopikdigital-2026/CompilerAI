import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleCalendarMapper } from '../mappers/GoogleCalendarMapper';
import type { GoogleCalendarInfo } from '../types/GoogleCalendarTypes';

export interface ListCalendarsInput {
  readonly organizationId: string;
  readonly pageToken?: string;
  readonly maxResults?: number;
}

export interface ListCalendarsOutput {
  readonly calendars: GoogleCalendarInfo[];
  readonly nextPageToken?: string;
}

export function createListCalendarsOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.calendar.listCalendars',
    requiredCapabilities: ['calendar.calendars.read'],
    retryable: true,
    idempotent: true,
    timeoutMs: 15_000,
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (input['pageToken'] !== undefined && typeof input['pageToken'] !== 'string') {
        errors.push('pageToken must be a string');
      }
      if (
        input['maxResults'] !== undefined &&
        (typeof input['maxResults'] !== 'number' ||
          (input['maxResults'] as number) < 1 ||
          (input['maxResults'] as number) > 250)
      ) {
        errors.push('maxResults must be a number between 1 and 250');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<ListCalendarsOutput> {
      const typedInput = input as unknown as ListCalendarsInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const response = await client.get<unknown>(
        'calendar',
        'users/me/calendarList',
        {
          pageToken: typedInput.pageToken,
          maxResults: typedInput.maxResults ?? 100,
        },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const calendars = GoogleCalendarMapper.mapCalendarList(response.data as never);
      const raw = response.data as { nextPageToken?: string } | null;
      return {
        calendars,
        nextPageToken: raw?.nextPageToken,
      };
    },
  };
}
