import { isSignedIn, getAccessToken } from './auth.js';

/**
 * Wires up the standard sign-in-gate markup (#sign-in-card, #sign-in-btn,
 * #auth-message, #app-content) present on every page and calls onReady()
 * once a valid Google session exists.
 */
export function initAuthGate(onReady) {
  const signInCard = document.getElementById('sign-in-card');
  const signInBtn = document.getElementById('sign-in-btn');
  const authMessage = document.getElementById('auth-message');
  const appContent = document.getElementById('app-content');

  async function unlock() {
    signInCard.hidden = true;
    appContent.hidden = false;
    await onReady();
  }

  signInBtn.addEventListener('click', async () => {
    signInBtn.disabled = true;
    authMessage.textContent = '';
    try {
      await getAccessToken();
      await unlock();
    } catch (err) {
      authMessage.textContent = `Sign-in failed: ${err.message}`;
      authMessage.className = 'message error';
    } finally {
      signInBtn.disabled = false;
    }
  });

  if (isSignedIn()) {
    unlock();
  } else {
    signInCard.hidden = false;
    appContent.hidden = true;
  }
}
