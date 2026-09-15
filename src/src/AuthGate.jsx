import React, { useEffect, useState } from 'react';
import AuthScreen from './AuthScreen.jsx';
import { authRequired, getSession, subscribeToAuth } from './authService.js';

function hasSignupConfirmationCallback() {
  const hash = window.location.hash || '';
  const query = window.location.search || '';
  return /(?:^|[&#])type=signup(?:&|$)/i.test(hash) || /(?:^|[?&])type=signup(?:&|$)/i.test(query);
}

function cleanAuthCallbackUrl() {
  if (!window.location.hash && !window.location.search) return;
  window.history.replaceState({}, document.title, window.location.pathname);
}

function EmailConfirmedScreen({ session, onContinue }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">BEYDEN</div>
        <div className="auth-confirmation-icon">✓</div>
        <h1>Email confirmed!</h1>
        <p className="auth-subtitle">Your BeyDen account has been successfully confirmed.</p>
        {session?.user?.email && <p className="auth-message">{session.user.email}</p>}
        <button type="button" onClick={onContinue}>Continue to BeyDen</button>
      </section>
    </main>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(authRequired());
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [confirmationNeedsLogin, setConfirmationNeedsLogin] = useState(false);

  useEffect(() => {
    if (!authRequired()) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    const callbackDetected = hasSignupConfirmationCallback();

    getSession().then(value => {
      if (!mounted) return;
      setSession(value);
      if (callbackDetected) {
        setEmailConfirmed(Boolean(value));
        setConfirmationNeedsLogin(!value);
      }
      cleanAuthCallbackUrl();
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      if (callbackDetected) setConfirmationNeedsLogin(true);
      cleanAuthCallbackUrl();
      setLoading(false);
    });

    const unsubscribe = subscribeToAuth(value => {
      if (!mounted) return;
      setSession(value);
      if (value && confirmationNeedsLogin) {
        setConfirmationNeedsLogin(false);
        setEmailConfirmed(true);
      }
    });

    return () => { mounted = false; unsubscribe(); };
  }, []);

  if (!authRequired()) return children;
  if (loading) return <main className="auth-shell"><section className="auth-card"><div className="auth-brand">BEYDEN</div><h1>Loading…</h1></section></main>;
  if (emailConfirmed && session) return <EmailConfirmedScreen session={session} onContinue={() => setEmailConfirmed(false)} />;
  if (!session) return <AuthScreen initialMessage={confirmationNeedsLogin ? 'Email confirmed successfully. Please sign in to continue.' : ''} onAuthenticated={value => { setSession(value); setConfirmationNeedsLogin(false); setEmailConfirmed(false); }} />;
  return React.cloneElement(children, { authSession: session });
}
