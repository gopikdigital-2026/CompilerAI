import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  ConnectorRuntime,
  registerGoogleConnector,
  GOOGLE_CONNECTOR_ID,
} from '../../src/index';
import { TestTokenRefreshProvider } from '../../src/providers/google/auth/GoogleTokenRefreshProvider';
import { createMockFetch } from './mocks/MockFetch';
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  TOKEN_REFRESH_RESPONSE,
  FIXTURE_CALENDAR_LIST,
  FIXTURE_CALENDAR_INFO,
  FIXTURE_CALENDAR_EVENT,
  FIXTURE_CALENDAR_EVENT_LIST,
  FIXTURE_CALENDAR_CREATE_EVENT_RESPONSE,
  FIXTURE_FREEBUSY_RESPONSE,
} from './fixtures';

const CREDENTIALS = {
  accessToken: VALID_ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

function setup(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', CREDENTIALS);

  const runtime = new ConnectorRuntime();
  const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);

  const { authAdapter } = registerGoogleConnector({
    runtime,
    credentialResolver: resolver,
    refreshProvider,
    transport: mockFetch,
  });

  return { store, encryption, resolver, runtime, authAdapter, mockFetch };
}

function context(mockFetch: ReturnType<typeof createMockFetch>) {
  return {
    organizationId: 'org-1',
    userId: null,
    requestId: 'r-1',
    correlationId: 'c-1',
    traceId: 't-1',
    metadata: { fetchImpl: mockFetch },
  };
}

describe('Google Calendar Operations', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      // Get calendar (must come before listCalendars since it's more specific)
      {
        method: 'GET',
        urlPattern: /calendar\/v3\/users\/me\/calendarList\/cal-1/,
        response: { status: 200, body: FIXTURE_CALENDAR_INFO, headers: {} },
      },
      // List calendars
      {
        method: 'GET',
        urlPattern: /calendar\/v3\/users\/me\/calendarList/,
        response: { status: 200, body: FIXTURE_CALENDAR_LIST, headers: {} },
      },
      // Get event (must come before listEvents)
      {
        method: 'GET',
        urlPattern: /calendar\/v3\/calendars\/cal-1\/events\/evt-1/,
        response: { status: 200, body: FIXTURE_CALENDAR_EVENT, headers: {} },
      },
      // List events
      {
        method: 'GET',
        urlPattern: /calendar\/v3\/calendars\/cal-1\/events(\?|$)/,
        response: { status: 200, body: FIXTURE_CALENDAR_EVENT_LIST, headers: {} },
      },
      // Create event (POST)
      {
        method: 'POST',
        urlPattern: /calendar\/v3\/calendars\/cal-1\/events(\?|$)/,
        response: { status: 200, body: FIXTURE_CALENDAR_CREATE_EVENT_RESPONSE, headers: {} },
      },
      // Update event (PATCH)
      {
        method: 'PATCH',
        urlPattern: /calendar\/v3\/calendars\/cal-1\/events\/evt-1/,
        response: { status: 200, body: FIXTURE_CALENDAR_EVENT, headers: {} },
      },
      // FreeBusy
      {
        method: 'POST',
        urlPattern: /calendar\/v3\/freeBusy/,
        response: { status: 200, body: FIXTURE_FREEBUSY_RESPONSE, headers: {} },
      },
    ]);
  });

  it('should list calendars and return calendars array', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.listCalendars',
      input: { organizationId: 'org-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'listCalendars should succeed');
    assert.ok(result.data);
    const data = result.data as { calendars: { id: string; summary: string }[] };
    assert.equal(data.calendars.length, 1);
    assert.equal(data.calendars[0].id, 'cal-1');
    assert.equal(data.calendars[0].summary, 'My Calendar');
  });

  it('should get a calendar and return calendar info', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.getCalendar',
      input: { organizationId: 'org-1', calendarId: 'cal-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'getCalendar should succeed');
    assert.ok(result.data);
    const data = result.data as { calendar: { id: string; summary: string; timeZone: string } };
    assert.equal(data.calendar.id, 'cal-1');
    assert.equal(data.calendar.summary, 'My Calendar');
    assert.equal(data.calendar.timeZone, 'America/New_York');
  });

  it('should list events and return events array', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.listEvents',
      input: { organizationId: 'org-1', calendarId: 'cal-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'listEvents should succeed');
    assert.ok(result.data);
    const data = result.data as { events: { id: string; summary: string }[] };
    assert.equal(data.events.length, 1);
    assert.equal(data.events[0].id, 'evt-1');
    assert.equal(data.events[0].summary, 'Team Meeting');
  });

  it('should get an event and return event with id', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.getEvent',
      input: { organizationId: 'org-1', calendarId: 'cal-1', eventId: 'evt-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'getEvent should succeed');
    assert.ok(result.data);
    const data = result.data as { event: { id: string; summary: string } };
    assert.equal(data.event.id, 'evt-1');
    assert.equal(data.event.summary, 'Team Meeting');
  });

  it('should create an event and return created event', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.createEvent',
      input: {
        organizationId: 'org-1',
        calendarId: 'cal-1',
        summary: 'New Meeting',
        start: { dateTime: '2026-01-15T10:00:00Z' },
        end: { dateTime: '2026-01-15T11:00:00Z' },
      },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'createEvent should succeed');
    assert.ok(result.data);
    const data = result.data as { event: { id: string; summary: string } };
    assert.equal(data.event.id, 'evt-1');
  });

  it('should have retryable=false for createEvent', () => {
    const { runtime } = setup(mockFetch);
    const ops = runtime.listOperations(GOOGLE_CONNECTOR_ID);
    const createEvent = ops.find((o) => o.name === 'google.calendar.createEvent');
    assert.ok(createEvent, 'createEvent operation should be registered');
    assert.equal(createEvent!.retryable, false);
  });

  it('should update an event and return updated event', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.updateEvent',
      input: {
        organizationId: 'org-1',
        calendarId: 'cal-1',
        eventId: 'evt-1',
        summary: 'Updated Meeting',
      },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'updateEvent should succeed');
    assert.ok(result.data);
    const data = result.data as { event: { id: string } };
    assert.equal(data.event.id, 'evt-1');
  });

  it('should query freeBusy and return freeBusyResult with calendars', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.queryFreeBusy',
      input: {
        organizationId: 'org-1',
        timeMin: '2026-01-01T00:00:00Z',
        timeMax: '2026-01-02T00:00:00Z',
        calendarIds: ['cal-1'],
      },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'queryFreeBusy should succeed');
    assert.ok(result.data);
    const data = result.data as {
      freeBusyResult: {
        timeMin: string;
        timeMax: string;
        calendars: { calendarId: string; busy: { start: string; end: string }[] }[];
      };
    };
    assert.equal(data.freeBusyResult.timeMin, '2026-01-01T00:00:00Z');
    assert.equal(data.freeBusyResult.timeMax, '2026-01-02T00:00:00Z');
    assert.equal(data.freeBusyResult.calendars.length, 1);
    assert.equal(data.freeBusyResult.calendars[0].calendarId, 'cal-1');
    assert.equal(data.freeBusyResult.calendars[0].busy.length, 1);
    assert.equal(data.freeBusyResult.calendars[0].busy[0].start, '2026-01-01T10:00:00Z');
  });

  it('should reject createEvent without summary', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.createEvent',
      input: {
        organizationId: 'org-1',
        calendarId: 'cal-1',
        start: { dateTime: '2026-01-15T10:00:00Z' },
        end: { dateTime: '2026-01-15T11:00:00Z' },
      },
      context: context(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should reject queryFreeBusy without calendarIds', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.calendar.queryFreeBusy',
      input: {
        organizationId: 'org-1',
        timeMin: '2026-01-01T00:00:00Z',
        timeMax: '2026-01-02T00:00:00Z',
      },
      context: context(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});
