import { useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { registerSignOut, setSession } from "./session";

/** Feeds Clerk's sign-in state and the profile's first name into the WorldStore session. */
export function ClerkSession() {
  const { isAuthenticated, isInitialized, user, logout } = useAuth();
  const firstName = user?.firstName?.trim() || null;

  useEffect(() => {
    setSession({ signedIn: isAuthenticated, loaded: isInitialized, firstName });
  }, [isAuthenticated, isInitialized, firstName]);

  useEffect(() => {
    registerSignOut(logout);
  }, [logout]);

  return null;
}
