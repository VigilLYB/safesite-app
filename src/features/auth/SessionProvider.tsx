import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { authApi, authBridge, isApiError, type User } from "@/lib/api";
import { clock } from "@/lib/clock";
import { runSignOutCleanups } from "@/lib/session-hooks";
import { queryClient } from "@/providers";
import {
  clearSession,
  isExpired,
  loadSession,
  saveSession,
  type Session,
} from "./lib/session-storage";

/** Why the person is signed out, so the login page can say so. */
export type SignedOutReason = "expired" | "disabled" | null;

type SessionState =
  | { status: "loading" }
  | { status: "signedOut"; reason: SignedOutReason }
  /** Boot `/auth/me` hit a 5xx, 429 or network error. An outage is not a logout. */
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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useReducer((_previous: SessionState, next: SessionState) => next, {
    status: "loading",
  } as SessionState);
  const [bootNonce, setBootNonce] = useState(0);

  const signOut = useCallback(async (reason: SignedOutReason = null) => {
    authBridge.setToken(null);
    setState({ status: "signedOut", reason });
    queryClient.clear();
    runSignOutCleanups();
    await clearSession();
  }, []);

  useEffect(() => {
    // Single flight: the first 401 signs out; later ones are ignored by the bridge.
    authBridge.setUnauthorizedHandler(() => void signOut("expired"));
    return () => authBridge.setUnauthorizedHandler(null);
  }, [signOut]);

  /** Resolves the state to show at boot. null = already handled (signed out via the 401 bridge). */
  const resolveBoot = useCallback(async (): Promise<SessionState | null> => {
    const stored = await loadSession();
    if (!stored) return { status: "signedOut", reason: null };
    if (isExpired(stored, clock.nowMs())) {
      await clearSession();
      return { status: "signedOut", reason: "expired" };
    }
    authBridge.setToken(stored.accessToken);
    try {
      const me = await authApi.me();
      if (!me.isActive) {
        await signOut("disabled");
        return null;
      }
      return { status: "signedIn", session: { ...stored, user: me } };
    } catch (error) {
      if (isApiError(error) && error.kind === "unauthorized") return null; // bridge signed out
      // A role outside WORKER | SUPERVISOR | MANAGER fails the schema: deny by default.
      if (isApiError(error) && error.code === "RESPONSE_INVALID") {
        await signOut(null);
        return null;
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

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const session: Session = {
      accessToken: response.accessToken,
      expiresAt: response.expiresAt,
      user: response.user,
    };
    authBridge.setToken(session.accessToken);
    await saveSession(session);
    setState({ status: "signedIn", session });
    return response.user;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      user: state.status === "signedIn" ? state.session.user : null,
      expiresAt: state.status === "signedIn" ? state.session.expiresAt : null,
      signIn,
      signOut,
      retryBoot: () => {
        setState({ status: "loading" });
        setBootNonce((n) => n + 1);
      },
    }),
    [state, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
