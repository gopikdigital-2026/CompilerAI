import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleCalendarMapper } from '../mappers/GoogleCalendarMapper';
import type { GoogleCalendarEvent } from '../types/GoogleCalendarTypes';

interface EventTimeInput {
  readonly dateTime?: string;
  readonly date?: string;
  readonly timeZone?: string;
}

interface EventAttendeeInput {
  readonly email: string;
  readonly displayName?: string;
}

interface EventRemindersInput {
  readonly useDefault?: boolean;
  readonly overrides?: readonly { readonly method: string; readonly minutes: number }[];
}

export interface UpdateEventInput {
  readonly organizationId: string;
  readonly calendarId: string;
  readonly eventId: string;
  readonly summary?: string;
  readonly start?: EventTimeInput;
  readonly end?: EventTimeInput;
  readonly attendees?: readonly EventAttendeeInput[];
  readonly location?: string;
  readonly description?: string;
  readonly reminders?: EventRemindersInput;
}

export interface UpdateEventOutput {
  readonly event: GoogleCalendarEvent;
}

function validateOptionalEventTime(
  field: unknown,
  fieldName: string,
  errors: string[],
): void {
  if (field === undefined) return;
  if (field === null || typeof field !== 'object') {
    errors.push(`${fieldName} must be an object`);
    return;
  }
  const time = field as Record<string, unknown>;
  if (time['dateTime'] !== undefined) {
    if (typeof time['dateTime'] !== 'string' || !GoogleCalendarMapper.validateDateTime(time['dateTime'] as string)) {
      errors.push(`${fieldName}.dateTime must be a valid date/time string`);
    }
  }
  if (time['date'] !== undefined) {
    if (typeof time['date'] !== 'string' || !GoogleCalendarMapper.validateDateTime(time['date'] as string)) {
      errors.push(`${fieldName}.date must be a valid date string`);
    }
  }
  if (time['timeZone'] !== undefined) {
    if (typeof time['timeZone'] !== 'string' || !GoogleCalendarMapper.validateTimeZone(time['timeZone'] as string)) {
      errors.push(`${fieldName}.timeZone must be a valid time zone`);
    }
  }
  if (time['dateTime'] === undefined && time['date'] === undefined) {
    errors.push(`${fieldName} must have either dateTime or date`);
  }
}

export function createUpdateEventOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.calendar.updateEvent',
    requiredCapabilities: ['calendar.events.write'],
    retryable: true,
    idempotent: true,
    timeoutMs: 30_000,
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
      if (input['summary'] !== undefined && (typeof input['summary'] !== 'string' || (input['summary'] as string).length === 0)) {
        errors.push('summary must be a non-empty string');
      }
      validateOptionalEventTime(input['start'], 'start', errors);
      validateOptionalEventTime(input['end'], 'end', errors);
      if (input['attendees'] !== undefined) {
        if (!Array.isArray(input['attendees'])) {
          errors.push('attendees must be an array');
        } else {
          for (const attendee of input['attendees'] as unknown[]) {
            if (typeof attendee !== 'object' || attendee === null ||
              typeof (attendee as Record<string, unknown>)['email'] !== 'string' ||
              ((attendee as Record<string, unknown>)['email'] as string).length === 0) {
              errors.push('each attendee must be an object with a non-empty email string');
            }
          }
        }
      }
      if (input['location'] !== undefined && typeof input['location'] !== 'string') {
        errors.push('location must be a string');
      }
      if (input['description'] !== undefined && typeof input['description'] !== 'string') {
        errors.push('description must be a string');
      }
      if (input['reminders'] !== undefined) {
        if (typeof input['reminders'] !== 'object' || input['reminders'] === null) {
          errors.push('reminders must be an object');
        } else {
          const reminders = input['reminders'] as Record<string, unknown>;
          if (reminders['useDefault'] !== undefined && typeof reminders['useDefault'] !== 'boolean') {
            errors.push('reminders.useDefault must be a boolean');
          }
          if (reminders['overrides'] !== undefined) {
            if (!Array.isArray(reminders['overrides'])) {
              errors.push('reminders.overrides must be an array');
            } else {
              for (const override of reminders['overrides'] as unknown[]) {
                if (typeof override !== 'object' || override === null ||
                  typeof (override as Record<string, unknown>)['method'] !== 'string' ||
                  typeof (override as Record<string, unknown>)['minutes'] !== 'number') {
                  errors.push('each reminders.override must be an object with method (string) and minutes (number)');
                }
              }
            }
          }
        }
      }
      const hasUpdate =
        input['summary'] !== undefined ||
        input['start'] !== undefined ||
        input['end'] !== undefined ||
        input['attendees'] !== undefined ||
        input['location'] !== undefined ||
        input['description'] !== undefined ||
        input['reminders'] !== undefined;
      if (!hasUpdate) {
        errors.push('at least one updatable field must be provided');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<UpdateEventOutput> {
      const typedInput = input as unknown as UpdateEventInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const body: Record<string, unknown> = {};
      if (typedInput.summary !== undefined) body['summary'] = typedInput.summary;
      if (typedInput.start !== undefined) body['start'] = typedInput.start;
      if (typedInput.end !== undefined) body['end'] = typedInput.end;
      if (typedInput.attendees !== undefined) body['attendees'] = [...typedInput.attendees];
      if (typedInput.location !== undefined) body['location'] = typedInput.location;
      if (typedInput.description !== undefined) body['description'] = typedInput.description;
      if (typedInput.reminders !== undefined) body['reminders'] = typedInput.reminders;

      const response = await client.patch<unknown>(
        'calendar',
        `calendars/${typedInput.calendarId}/events/${typedInput.eventId}`,
        body,
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const event = GoogleCalendarMapper.mapEvent(response.data as never);
      return { event };
    },
  };
}
