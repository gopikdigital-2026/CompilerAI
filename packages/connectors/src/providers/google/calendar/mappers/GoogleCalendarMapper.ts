import type {
  GoogleCalendarInfo,
  GoogleCalendarInfoResponse,
  GoogleCalendarEvent,
  GoogleCalendarEventResponse,
  GoogleCalendarEventTime,
  GoogleCalendarEventAttendee,
  GoogleCalendarEventReminders,
  GoogleFreeBusyResult,
  GoogleFreeBusyCalendar,
  GoogleFreeBusyRequestResponse,
} from '../types/GoogleCalendarTypes';

export class GoogleCalendarMapper {
  static mapCalendar(raw: GoogleCalendarInfoResponse): GoogleCalendarInfo {
    return {
      id: raw.id,
      summary: raw.summary,
      primary: raw.primary ?? false,
      accessRole: raw.accessRole ?? 'reader',
      timeZone: raw.timeZone ?? null,
      colorId: raw.colorId ?? null,
    };
  }

  static mapCalendarList(raw: { readonly items: readonly GoogleCalendarInfoResponse[] }): GoogleCalendarInfo[] {
    return raw.items.map((c) => GoogleCalendarMapper.mapCalendar(c));
  }

  static mapEvent(raw: GoogleCalendarEventResponse): GoogleCalendarEvent {
    return {
      id: raw.id,
      summary: raw.summary ?? null,
      description: raw.description ?? null,
      location: raw.location ?? null,
      start: this.mapEventTime(raw.start),
      end: this.mapEventTime(raw.end),
      attendees: (raw.attendees ?? []).map((a) => this.mapAttendee(a)),
      organizer: raw.organizer ? this.mapAttendee({ ...raw.organizer, responseStatus: undefined }) : null,
      status: (raw.status === 'cancelled' || raw.status === 'tentative' ? raw.status : 'confirmed') as 'confirmed' | 'tentative' | 'cancelled',
      htmlLink: raw.htmlLink ?? null,
      created: raw.created ?? null,
      updated: raw.updated ?? null,
      reminders: this.mapReminders(raw.reminders),
    };
  }

  static mapEventList(raw: { readonly items: readonly GoogleCalendarEventResponse[] }): readonly GoogleCalendarEvent[] {
    return raw.items.map((e) => GoogleCalendarMapper.mapEvent(e));
  }

  static mapFreeBusy(raw: GoogleFreeBusyRequestResponse): GoogleFreeBusyResult {
    const calendars = Object.entries(raw.calendars).map(([calendarId, val]) => ({
      calendarId,
      busy: (val as GoogleFreeBusyCalendar).busy.map((b: { readonly start: string; readonly end: string }) => ({ start: b.start, end: b.end })),
    }));
    return {
      timeMin: raw.timeMin,
      timeMax: raw.timeMax,
      calendars,
    };
  }

  static validateDateTime(value: string): boolean {
    try {
      const d = new Date(value);
      return !Number.isNaN(d.getTime());
    } catch {
      return false;
    }
  }

  static validateTimeZone(tz: string | null | undefined): boolean {
    if (!tz) return true;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }

  private static mapEventTime(raw: { readonly dateTime?: string; readonly date?: string; readonly timeZone?: string } | undefined): GoogleCalendarEventTime {
    if (!raw) return { dateTime: null, date: null, timeZone: null };
    return {
      dateTime: raw.dateTime ?? null,
      date: raw.date ?? null,
      timeZone: raw.timeZone ?? null,
    };
  }

  private static mapAttendee(raw: {
    readonly email: string;
    readonly displayName?: string;
    readonly responseStatus?: string;
    readonly organizer?: boolean;
    readonly self?: boolean;
  }): GoogleCalendarEventAttendee {
    return {
      email: raw.email,
      displayName: raw.displayName ?? null,
      responseStatus: (raw.responseStatus === 'needsAction' || raw.responseStatus === 'declined' || raw.responseStatus === 'tentative' || raw.responseStatus === 'accepted'
        ? raw.responseStatus
        : null) as 'needsAction' | 'declined' | 'tentative' | 'accepted' | null,
      organizer: raw.organizer ?? false,
      self: raw.self ?? false,
    };
  }

  private static mapReminders(raw: { readonly useDefault?: boolean; readonly overrides?: readonly { readonly method: string; readonly minutes: number }[] } | undefined): GoogleCalendarEventReminders | null {
    if (!raw) return null;
    return {
      useDefault: raw.useDefault ?? false,
      overrides: raw.overrides ? [...raw.overrides] : [],
    };
  }
}
