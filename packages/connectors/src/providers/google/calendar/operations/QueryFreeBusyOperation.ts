import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleCalendarMapper } from '../mappers/GoogleCalendarMapper';
import type { GoogleFreeBusyResult } from '../types/GoogleCalendarTypes';

export interface QueryFreeBusyInput {
  readonly organizationId: string;
  readonly timeMin: string;
  readonly timeMax: string;
  readonly calendarIds: string[];
  readonly timeZone?: string;
}

export interface QueryFreeBusyOutput {
  readonly freeBusyResult: GoogleFreeBusyResult;
}

export function createQueryFreeBusyOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.calendar.queryFreeBusy',
    requiredCapabilities: ['calendar.events.read'],
    retryable: true,
    idempotent: true,
    timeoutMs: 15_000,
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (!Array.isArray(input['calendarIds']) || (input['calendarIds'] as unknown[]).length === 0) {
        errors.push('calendarIds is required and must be a non-empty array');
      } else {
        for (const id of input['calendarIds'] as unknown[]) {
          if (typeof id !== 'string' || (id as string).length === 0) {
            errors.push('each calendarId must be a non-empty string');
          }
        }
      }
      if (typeof input['timeMin'] !== 'string' || (input['timeMin'] as string).length === 0) {
        errors.push('timeMin is required');
      } else if (!GoogleCalendarMapper.validateDateTime(input['timeMin'] as string)) {
        errors.push('timeMin must be a valid date/time string');
      }
      if (typeof input['timeMax'] !== 'string' || (input['timeMax'] as string).length === 0) {
        errors.push('timeMax is required');
      } else if (!GoogleCalendarMapper.validateDateTime(input['timeMax'] as string)) {
        errors.push('timeMax must be a valid date/time string');
      }
      if (
        input['timeZone'] !== undefined &&
        (typeof input['timeZone'] !== 'string' || !GoogleCalendarMapper.validateTimeZone(input['timeZone'] as string))
      ) {
        errors.push('timeZone must be a valid time zone');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<QueryFreeBusyOutput> {
      const typedInput = input as unknown as QueryFreeBusyInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const body: Record<string, unknown> = {
        timeMin: typedInput.timeMin,
        timeMax: typedInput.timeMax,
        items: typedInput.calendarIds.map((id) => ({ id })),
      };
      if (typedInput.timeZone !== undefined) body['timeZone'] = typedInput.timeZone;

      const response = await client.post<unknown>(
        'calendar',
        'freeBusy',
        body,
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const freeBusyResult = GoogleCalendarMapper.mapFreeBusy(response.data as never);
      return { freeBusyResult };
    },
  };
}
