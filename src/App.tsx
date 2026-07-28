import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
import { ToastProvider } from './components/ui/Toast';
import { FeedbackButton } from './components/ui/FeedbackButton';
import { initObservability } from './lib/observability';
import { useAuth } from './hooks/useAuth';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { LegalPage } from './pages/LegalPage';
import { useState, useEffect } from 'react';

function AppRouter() {
  const { loading, user, signOut } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'terms' | 'privacy'>('login');

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash;
      if (hash === '#register') setAuthView('register');
      else if (hash === '#forgot') setAuthView('forgot');
      else if (hash === '#terms') setAuthView('terms');
      else if (hash === '#privacy') setAuthView('privacy');
      else if (hash === '' || hash === '#') setAuthView('login');
    };
    handler();
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <p className="text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  const handleAuthNavigate = (page: string) => {
    if (page === 'register') { setAuthView('register'); window.location.hash = '#register'; }
    else if (page === 'forgot-password') { setAuthView('forgot'); window.location.hash = '#forgot'; }
    else if (page === 'terms') { setAuthView('terms'); window.location.hash = '#terms'; }
    else if (page === 'privacy') { setAuthView('privacy'); window.location.hash = '#privacy'; }
    else if (page === 'landing') { setAuthView('login'); window.location.hash = ''; }
    else setAuthView('login');
  };

  if (!user) {
    if (authView === 'register') return <Register onNavigate={handleAuthNavigate} />;
    if (authView === 'forgot') return <ForgotPassword onNavigate={handleAuthNavigate} />;
    if (authView === 'terms') return <LegalPage type="terms" onNavigate={handleAuthNavigate} />;
    if (authView === 'privacy') return <LegalPage type="privacy" onNavigate={handleAuthNavigate} />;
    return <Login onNavigate={handleAuthNavigate} />;
  }

  const handleLogout = async () => {
    await signOut();
    // Clear any cached state
    try { sessionStorage.clear(); } catch {}
    try { localStorage.removeItem('rc-lang'); } catch {}
    setAuthView('login');
    window.location.hash = '';
  };

  return (
    <>
      <Dashboard onLogout={handleLogout} />
      <FeedbackButton />
    </>
  );
}

function App() {
  useEffect(() => { initObservability(); }, []);
  return (
    <LanguageProvider>
      <AuthProvider>
        <FeatureFlagsProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </FeatureFlagsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
