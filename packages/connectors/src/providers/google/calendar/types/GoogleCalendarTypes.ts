import type { Metadata } from '../../../../types/index';

export interface GoogleCalendarInfo {
  readonly id: string;
  readonly summary: string;
  readonly primary: boolean;
  readonly accessRole: string;
  readonly timeZone: string | null;
  readonly colorId: string | null;
  readonly metadata?: Metadata;
}

export interface GoogleCalendarEvent {
  readonly id: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly location: string | null;
  readonly start: GoogleCalendarEventTime;
  readonly end: GoogleCalendarEventTime;
  readonly attendees: readonly GoogleCalendarEventAttendee[];
  readonly organizer: GoogleCalendarEventAttendee | null;
  readonly status: 'confirmed' | 'tentative' | 'cancelled';
  readonly htmlLink: string | null;
  readonly created: string | null;
  readonly updated: string | null;
  readonly reminders: GoogleCalendarEventReminders | null;
  readonly metadata?: Metadata;
}

export interface GoogleCalendarEventTime {
  readonly dateTime: string | null;
  readonly date: string | null;
  readonly timeZone: string | null;
}

export interface GoogleCalendarEventAttendee {
  readonly email: string;
  readonly displayName: string | null;
  readonly responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted' | null;
  readonly organizer: boolean;
  readonly self: boolean;
}

export interface GoogleCalendarEventReminders {
  readonly useDefault: boolean;
  readonly overrides: readonly { readonly method: string; readonly minutes: number }[];
}

export interface GoogleFreeBusyResult {
  readonly timeMin: string;
  readonly timeMax: string;
  readonly calendars: readonly GoogleFreeBusyCalendar[];
}

export interface GoogleFreeBusyCalendar {
  readonly calendarId: string;
  readonly busy: readonly { readonly start: string; readonly end: string }[];
}

export interface GoogleCalendarListResponse {
  readonly items: readonly GoogleCalendarInfoResponse[];
}

export interface GoogleCalendarInfoResponse {
  readonly id: string;
  readonly summary: string;
  readonly primary?: boolean;
  readonly accessRole?: string;
  readonly timeZone?: string;
  readonly colorId?: string;
}

export interface GoogleCalendarEventListResponse {
  readonly items: readonly GoogleCalendarEventResponse[];
  readonly nextPageToken?: string;
}

export interface GoogleCalendarEventResponse {
  readonly id: string;
  readonly summary?: string;
  readonly description?: string;
  readonly location?: string;
  readonly start?: { readonly dateTime?: string; readonly date?: string; readonly timeZone?: string };
  readonly end?: { readonly dateTime?: string; readonly date?: string; readonly timeZone?: string };
  readonly attendees?: readonly {
    readonly email: string;
    readonly displayName?: string;
    readonly responseStatus?: string;
    readonly organizer?: boolean;
    readonly self?: boolean;
  }[];
  readonly organizer?: {
    readonly email: string;
    readonly displayName?: string;
    readonly self?: boolean;
  };
  readonly status?: string;
  readonly htmlLink?: string;
  readonly created?: string;
  readonly updated?: string;
  readonly reminders?: {
    readonly useDefault?: boolean;
    readonly overrides?: readonly { readonly method: string; readonly minutes: number }[];
  };
}

export interface GoogleFreeBusyRequestResponse {
  readonly timeMin: string;
  readonly timeMax: string;
  readonly calendars: Readonly<Record<string, { readonly busy: readonly { readonly start: string; readonly end: string }[] }>>;
}
