import { useState } from 'react';
import { isSignedIn, getAccessToken } from '../common/auth.js';
import { Button } from './buttons/Button.jsx';

/**
 * Shows a "Sign in with Google" card until a valid token exists, then
 * renders children.
 */
export function SignInGate({ children }) {
  const [signedIn, setSignedIn] = useState(isSignedIn());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    setPending(true);
    setError('');
    try {
      await getAccessToken();
      setSignedIn(true);
    } catch (err) {
      setError(`Sign-in failed: ${err.message}`);
    } finally {
      setPending(false);
    }
  }

  if (!signedIn) {
    return (
      <section className="card sign-in-card">
        <h2>Sign in required</h2>
        <p>Your data lives in a Google Sheet. Sign in with Google to load it.</p>
        <Button disabled={pending} onClick={handleSignIn}>
          Sign in with Google
        </Button>
        {error && <p className="message error" role="status">{error}</p>}
      </section>
    );
  }

  return children;
}
