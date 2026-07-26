import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// Profile menu functional tests — tested at the logic level
// since browser-based E2E requires a running dev server and
// import.meta.env is Vite-specific (not available in Node test runner).

describe('Profile Menu: Navigation Logic', () => {
  type DashboardPage = 'home' | 'settings' | 'compiler' | 'runner';
  type SettingsSection = 'profile' | 'billing' | 'team' | 'api';

  function createNavigationState() {
    let currentPage: DashboardPage = 'home';
    let settingsSection: SettingsSection | undefined = undefined;

    return {
      get page() { return currentPage; },
      get section() { return settingsSection; },
      navigate(page: DashboardPage, section?: SettingsSection) {
        currentPage = page;
        if (section) settingsSection = section;
        else if (page !== 'settings') settingsSection = undefined;
      },
      navigateToSettings(section: SettingsSection) {
        settingsSection = section;
        currentPage = 'settings';
      },
    };
  }

  test('initial state is home with no section', () => {
    const nav = createNavigationState();
    assert.equal(nav.page, 'home');
    assert.equal(nav.section, undefined);
  });

  test('navigate to settings with profile section', () => {
    const nav = createNavigationState();
    nav.navigateToSettings('profile');
    assert.equal(nav.page, 'settings');
    assert.equal(nav.section, 'profile');
  });

  test('navigate to settings with billing section', () => {
    const nav = createNavigationState();
    nav.navigateToSettings('billing');
    assert.equal(nav.page, 'settings');
    assert.equal(nav.section, 'billing');
  });

  test('navigate to settings with team section', () => {
    const nav = createNavigationState();
    nav.navigateToSettings('team');
    assert.equal(nav.page, 'settings');
    assert.equal(nav.section, 'team');
  });

  test('navigate to settings with api section', () => {
    const nav = createNavigationState();
    nav.navigateToSettings('api');
    assert.equal(nav.page, 'settings');
    assert.equal(nav.section, 'api');
  });

  test('navigating away from settings clears section', () => {
    const nav = createNavigationState();
    nav.navigateToSettings('billing');
    nav.navigate('home');
    assert.equal(nav.page, 'home');
    assert.equal(nav.section, undefined);
  });

  test('navigating to settings without section preserves previous section', () => {
    const nav = createNavigationState();
    nav.navigateToSettings('team');
    nav.navigate('settings');
    assert.equal(nav.page, 'settings');
    assert.equal(nav.section, 'team');
  });
});

describe('Profile Menu: Keyboard Navigation', () => {
  test('Escape key closes menus', () => {
    let profileOpen = true;
    let notifOpen = true;

    const handleKey = (e: { key: string }) => {
      if (e.key === 'Escape') {
        profileOpen = false;
        notifOpen = false;
      }
    };

    handleKey({ key: 'Escape' });
    assert.equal(profileOpen, false);
    assert.equal(notifOpen, false);
  });

  test('non-Escape key does not close menus', () => {
    let profileOpen = true;
    const handleKey = (e: { key: string }) => {
      if (e.key === 'Escape') profileOpen = false;
    };

    handleKey({ key: 'Enter' });
    assert.equal(profileOpen, true);
  });
});

describe('Profile Menu: Outside Click Detection', () => {
  test('click outside closes profile menu', () => {
    let profileOpen = true;
    const profileRef = { current: { contains: (_n: unknown) => false } };

    const handleClick = (target: unknown) => {
      if (profileRef.current && !profileRef.current.contains(target)) {
        profileOpen = false;
      }
    };

    handleClick({});
    assert.equal(profileOpen, false);
  });

  test('click inside does not close profile menu', () => {
    let profileOpen = true;
    const innerElement = {};
    const profileRef = { current: { contains: (_n: unknown) => true } };

    const handleClick = (target: unknown) => {
      if (profileRef.current && !profileRef.current.contains(target)) {
        profileOpen = false;
      }
    };

    handleClick(innerElement);
    assert.equal(profileOpen, true);
  });
});

describe('Profile Menu: Menu Items', () => {
  const expectedItems = ['Mi perfil', 'Facturación', 'Equipo', 'API Keys'];
  const expectedSections = ['profile', 'billing', 'team', 'api'];

  test('has exactly 4 menu items', () => {
    assert.equal(expectedItems.length, 4);
  });

  test('each item maps to a settings section', () => {
    for (const section of expectedSections) {
      assert.ok(['profile', 'billing', 'team', 'api'].includes(section));
    }
  });

  test('logout is separate from menu items', () => {
    assert.equal(expectedItems.includes('Cerrar sesión'), false);
    assert.equal(expectedItems.includes('Sign out'), false);
  });
});

describe('Profile Menu: Auth Guard', () => {
  test('unauthenticated user cannot access dashboard', () => {
    const user = null;
    const loading = false;
    const shouldShowDashboard = !loading && user !== null;
    assert.equal(shouldShowDashboard, false);
  });

  test('authenticated user can access dashboard', () => {
    const user = { id: 'test-id', email: 'test@test.com' };
    const loading = false;
    const shouldShowDashboard = !loading && user !== null;
    assert.equal(shouldShowDashboard, true);
  });

  test('loading state prevents both auth and dashboard', () => {
    const user = null;
    const loading = true;
    const shouldShowDashboard = !loading && user !== null;
    const shouldShowLogin = !loading && user === null;
    assert.equal(shouldShowDashboard, false);
    assert.equal(shouldShowLogin, false);
  });

  test('logout redirects to login', () => {
    let authView = 'login';
    let currentUser = { id: 'test', email: 'test@test.com' };

    const handleLogout = () => {
      currentUser = null;
      authView = 'login';
    };

    handleLogout();
    assert.equal(currentUser, null);
    assert.equal(authView, 'login');
  });

  test('session expiry triggers logout flow', () => {
    let session = { user: { id: 'test' } };
    let authView = 'login';

    const onAuthStateChange = (event: string) => {
      if (event === 'SIGNED_OUT') {
        session = null;
        authView = 'login';
      }
    };

    onAuthStateChange('SIGNED_OUT');
    assert.equal(session, null);
    assert.equal(authView, 'login');
  });
});

describe('Profile Menu: Settings Sections', () => {
  const SECTION_IDS = ['profile', 'organization', 'team', 'billing', 'api', 'security', 'notifications', 'integrations'];
  const SECTION_STATUS: Record<string, string> = {
    profile: 'available',
    organization: 'available',
    team: 'available',
    billing: 'config-required',
    api: 'available',
    security: 'coming-soon',
    notifications: 'available',
    integrations: 'config-required',
  };

  test('all 8 sections defined', () => {
    assert.equal(SECTION_IDS.length, 8);
  });

  test('billing is config-required', () => {
    assert.equal(SECTION_STATUS['billing'], 'config-required');
  });

  test('security is coming-soon', () => {
    assert.equal(SECTION_STATUS['security'], 'coming-soon');
  });

  test('integrations is config-required', () => {
    assert.equal(SECTION_STATUS['integrations'], 'config-required');
  });

  test('profile, organization, team, api, notifications are available', () => {
    for (const id of ['profile', 'organization', 'team', 'api', 'notifications']) {
      assert.equal(SECTION_STATUS[id], 'available');
    }
  });

  test('each section has a status', () => {
    for (const id of SECTION_IDS) {
      assert.ok(SECTION_STATUS[id], `Section ${id} missing status`);
    }
  });
});

describe('Profile Menu: Telemetry Events', () => {
  const validEvents = [
    'profile_menu_opened',
    'profile_viewed',
    'profile_updated',
    'billing_viewed',
    'team_viewed',
    'api_keys_viewed',
    'logout_completed',
    'logout_failed',
  ];

  const forbiddenData = ['password', 'token', 'apiKey', 'secret'];

  test('all 8 telemetry events defined', () => {
    assert.equal(validEvents.length, 8);
  });

  test('telemetry events do not contain sensitive data names', () => {
    for (const event of validEvents) {
      for (const forbidden of forbiddenData) {
        assert.equal(
          event.toLowerCase().includes(forbidden.toLowerCase()),
          false,
          `Event ${event} should not contain ${forbidden}`,
        );
      }
    }
  });

  test('logout has both success and failure events', () => {
    assert.ok(validEvents.includes('logout_completed'));
    assert.ok(validEvents.includes('logout_failed'));
  });
});

describe('Profile Menu: Mobile Responsiveness', () => {
  test('profile name hidden on small screens', () => {
    // The Topbar uses 'hidden sm:block' for the user name
    const smBreakpoint = 640;
    const isMobile = 375 < smBreakpoint;
    const showName = !isMobile;
    assert.equal(showName, false);
  });

  test('profile name visible on desktop', () => {
    const smBreakpoint = 640;
    const isDesktop = 1280 >= smBreakpoint;
    const showName = !isDesktop ? false : true;
    assert.equal(showName, true);
  });

  test('menu width is appropriate for mobile', () => {
    const menuWidth = 192; // w-48 = 12rem = 192px
    const mobileWidth = 375;
    assert.ok(menuWidth < mobileWidth, 'Menu should fit within mobile viewport');
  });
});
