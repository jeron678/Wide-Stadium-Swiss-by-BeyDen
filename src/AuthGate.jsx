import React, { useEffect, useState } from 'react';
import AuthScreen from './AuthScreen.jsx';
import { authRequired, getSession, subscribeToAuth } from './authService.js';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(authRequired());

  useEffect(() => {
    if (!authRequired()) {
      setLoading(false);
      return undefined;
    }
    let mounted = true;
    getSession().then(value => { if (mounted) { setSession(value); setLoading(false); } }).catch(() => { if (mounted) setLoading(false); });
    const unsubscribe = subscribeToAuth(value => setSession(value));
    return () => { mounted = false; unsubscribe(); };
  }, []);

  if (!authRequired()) return children;
  if (loading) return <main className="auth-shell"><section className="auth-card"><div className="auth-brand">BEYDEN</div><h1>Loading…</h1></section></main>;
  if (!session) return <AuthScreen onAuthenticated={setSession} />;
  return React.cloneElement(children, { authSession: session });
}
