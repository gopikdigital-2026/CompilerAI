import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleCalendarMapper } from '../mappers/GoogleCalendarMapper';
import type { GoogleCalendarInfo } from '../types/GoogleCalendarTypes';

export interface GetCalendarInput {
  readonly organizationId: string;
  readonly calendarId: string;
}

export interface GetCalendarOutput {
  readonly calendar: GoogleCalendarInfo;
}

export function createGetCalendarOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.calendar.getCalendar',
    requiredCapabilities: ['calendar.calendars.read'],
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
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<GetCalendarOutput> {
      const typedInput = input as unknown as GetCalendarInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const response = await client.get<unknown>(
        'calendar',
        `users/me/calendarList/${typedInput.calendarId}`,
        {},
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const calendar = GoogleCalendarMapper.mapCalendar(response.data as never);
      return { calendar };
    },
  };
}
