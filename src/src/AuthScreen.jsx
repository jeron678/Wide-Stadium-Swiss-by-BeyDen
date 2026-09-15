import React, { useState } from 'react';
import { signIn, signUp } from './authService.js';

export default function AuthScreen({ onAuthenticated, initialMessage = '' }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        const session = await signIn(email, password);
        onAuthenticated(session);
      } else {
        const result = await signUp(email, password);
        if (result.session) onAuthenticated(result.session);
        else setMessage('Account created. Check your email to confirm your account, then sign in here.');
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">BEYDEN</div>
        <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
        <p className="auth-subtitle">Tournament control is protected by your BeyDen account.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}
          <button disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(initialMessage); }}>
          {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
