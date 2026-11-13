import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, authBridge, isApiError, type User } from "@/lib/api";
import { clock } from "@/lib/clock";
import { isOnline } from "@/lib/offline/network";
import { clearQueryCache, persistQueryCache, restoreQueryCache } from "@/lib/offline/query-cache";
import { runSignOutCleanups } from "@/lib/session-hooks";
import { queryClient } from "@/providers";
import {
  clearSession,
  isPastGrace,
  loadSession,
  saveSession,
  type Session,
} from "./lib/session-storage";

/** Why the person is signed out, so the login page can say so. */
export type SignedOutReason = "expired" | "disabled" | null;

type SessionState =
  | { status: "loading" }
  | { status: "signedOut"; reason: SignedOutReason }
  /** Boot `/auth/me` hit a 5xx or 429. An outage is not a logout. */
  | { status: "unavailable" }
  | { status: "signedIn"; session: Session };

interface SessionContextValue {
  state: SessionState;
  user: User | null;
  expiresAt: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: (reason?: SignedOutReason) => Promise<void>;
  /** Re-run the boot check after "Service unavailable". */
  retryBoot: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Refresh this long before the token ends, so a working session never runs out. */
const REFRESH_AHEAD_MS = 10 * 60_000;
/** setTimeout overflows past ~24.8 days; nothing needs scheduling that far ahead. */
const MAX_TIMER_MS = 24 * 60 * 60_000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useReducer((_previous: SessionState, next: SessionState) => next, {
    status: "loading",
  } as SessionState);
  const [bootNonce, setBootNonce] = useState(0);
  /** The newest session, including one a token refresh saved while boot was still running. */
  const current = useRef<Session | null>(null);

  const signOut = useCallback(async (reason: SignedOutReason = null) => {
    authBridge.setToken(null);
    current.current = null;
    setState({ status: "signedOut", reason });
    queryClient.clear();
    runSignOutCleanups();
    await Promise.all([clearSession(), clearQueryCache()]);
  }, []);

  useEffect(() => {
    // Single flight: the first 401 that a refresh cannot fix signs out; later ones are ignored.
    authBridge.setUnauthorizedHandler(() => void signOut("expired"));
    authBridge.setRefreshHandler(async (stale) => {
      try {
        const response = await authApi.refresh(stale);
        const next: Session = {
          accessToken: response.accessToken,
          expiresAt: response.expiresAt,
          user: response.user,
        };
        if (current.current === null) return null; // signed out while refreshing
        authBridge.setToken(next.accessToken);
        current.current = next;
        await saveSession(next);
        setState({ status: "signedIn", session: next });
        return next.accessToken;
      } catch (error) {
        // 401: too old, or the account was disabled. 404: a server without refresh (older
        // deploy), so sign in again as before. Anything else (offline) is not a sign-out.
        if (isApiError(error) && (error.kind === "unauthorized" || error.kind === "notFound")) {
          return null;
        }
        throw error;
      }
    });
    return () => {
      authBridge.setUnauthorizedHandler(null);
      authBridge.setRefreshHandler(null);
    };
  }, [signOut]);

  /** Resolves the state to show at boot. null = already handled (signed out via the 401 bridge). */
  const resolveBoot = useCallback(async (): Promise<SessionState | null> => {
    const stored = await loadSession();
    if (!stored) return { status: "signedOut", reason: null };
    // An expired token is fine inside the grace period: it is refreshed once online.
    if (isPastGrace(stored, clock.nowMs())) {
      await Promise.all([clearSession(), clearQueryCache()]);
      return { status: "signedOut", reason: "expired" };
    }
    current.current = stored;
    authBridge.setToken(stored.accessToken);
    // Saved reads first, so screens open with data even if the check below cannot reach the server.
    await restoreQueryCache(queryClient, stored.user.id);
    try {
      const me = await authApi.me(); // a 401 here refreshes the token, then retries
      if (!me.isActive) {
        await signOut("disabled");
        return null;
      }
      const latest = current.current ?? stored;
      return { status: "signedIn", session: { ...latest, user: me } };
    } catch (error) {
      if (isApiError(error) && error.kind === "unauthorized") return null; // bridge signed out
      // A role outside WORKER | SUPERVISOR | MANAGER fails the schema: deny by default.
      if (isApiError(error) && error.code === "RESPONSE_INVALID") {
        await signOut(null);
        return null;
      }
      // No connection: open with the saved session and data. Reports and changes made now are
      // kept on the device and sent when the connection returns.
      if (isApiError(error) && (error.kind === "network" || error.kind === "timeout")) {
        return { status: "signedIn", session: current.current ?? stored };
      }
      return { status: "unavailable" };
    }
  }, [signOut]);

  useEffect(() => {
    let active = true;
    void resolveBoot().then((next) => {
      if (active && next) setState(next);
    });
    return () => {
      active = false;
    };
  }, [resolveBoot, bootNonce]);

  const userId = state.status === "signedIn" ? state.session.user.id : null;
  const expiresAt = state.status === "signedIn" ? state.session.expiresAt : null;

  // Save what the person reads, so the next launch without signal still has it.
  useEffect(() => {
    if (!userId) return;
    return persistQueryCache(queryClient, userId);
  }, [userId]);

  // Refresh the token shortly before it ends while online. A failure is not a sign-out: the next
  // request's 401 decides that.
  useEffect(() => {
    if (!expiresAt) return;
    const delay = new Date(expiresAt).getTime() - REFRESH_AHEAD_MS - clock.nowMs();
    if (Number.isNaN(delay) || delay > MAX_TIMER_MS) return;
    const timer = setTimeout(
      () => {
        const token = authBridge.getToken();
        if (token && isOnline()) void authBridge.refresh(token).catch(() => undefined);
      },
      Math.max(delay, 0),
    );
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const session: Session = {
      accessToken: response.accessToken,
      expiresAt: response.expiresAt,
      user: response.user,
    };
    authBridge.setToken(session.accessToken);
    current.current = session;
    await saveSession(session);
    await restoreQueryCache(queryClient, session.user.id);
    setState({ status: "signedIn", session });
    return response.user;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      user: state.status === "signedIn" ? state.session.user : null,
      expiresAt,
      signIn,
      signOut,
      retryBoot: () => {
        setState({ status: "loading" });
        setBootNonce((n) => n + 1);
      },
    }),
    [state, expiresAt, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
