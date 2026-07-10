import React, { useState } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';

type PublicPage = 'landing' | 'login' | 'register' | 'forgot-password';

function AppRouter() {
  const { session, loading, signOut } = useAuth();
  const [publicPage, setPublicPage] = useState<PublicPage>('landing');

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

  // Always show Dashboard for preview (bypass auth)
  return <Dashboard onLogout={() => {}} />;
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
