import { useSyncExternalStore } from "react";
import { toast } from "@ws/components/ui";

/*
 * The WorldStore UI's session, backed by Clerk.
 *
 * The reference kept a device-local demo session behind this API. The API stays:
 * components ask useSession() whether someone is signed in, and gated actions go
 * through requireAuth(), which asks a guest to sign in first (R-004). ClerkSession
 * (features/auth/ClerkSession.tsx) pushes Clerk's state in here.
 *
 * Signing in leaves the page: WorldStore is a Clerk satellite of worldstreetgold.com,
 * whose sign-in comes back to the page the buyer was on. The tapped action does not
 * survive that round trip, so the buyer taps it again on return.
 */

export type Session = { signedIn: boolean; loaded: boolean; firstName: string | null };

let current: Session = { signedIn: false, loaded: false, firstName: null };
const sessionListeners = new Set<() => void>();

export function setSession(next: Session) {
  if (next.signedIn === current.signedIn && next.loaded === current.loaded && next.firstName === current.firstName) return;
  current = next;
  sessionListeners.forEach((l) => l());
}

let prompt: string | null = null;
const promptListeners = new Set<() => void>();

export function useAuthPrompt() {
  return useSyncExternalStore(
    (listener) => {
      promptListeners.add(listener);
      return () => {
        promptListeners.delete(listener);
      };
    },
    () => prompt,
    () => null,
  );
}

function setPrompt(value: string | null) {
  prompt = value;
  promptListeners.forEach((listener) => listener());
}

export function requestSignIn() {
  setPrompt("continue");
}

export function cancelSignIn() {
  setPrompt(null);
}

export function useSession(): Session {
  return useSyncExternalStore(
    (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    () => current,
    () => current,
  );
}

/** Runs `action` now if signed in; otherwise asks the guest to sign in first. */
export function requireAuth(reason: string, action: () => void) {
  if (current.signedIn) {
    action();
    return;
  }
  setPrompt(reason);
  if (!document.getElementById("sign-in-sheet")) toast({ message: `Sign in to ${reason}`, action: { label: "Sign in", onClick: signIn } });
}

/** Hands off to the WorldStreet sign-in, which returns to this page. */
export function signIn() {
  setPrompt(null);
  const back = window.location.pathname + window.location.search;
  window.location.assign(`/auth/login?returnUrl=${encodeURIComponent(back)}`);
}

let signOutImpl: (() => Promise<unknown>) | null = null;

export function registerSignOut(fn: () => Promise<unknown>) {
  signOutImpl = fn;
}

export function signOut() {
  cancelSignIn();
  void signOutImpl?.();
}
