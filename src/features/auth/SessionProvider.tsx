import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, authBridge, type User } from "@/lib/api";
import { clock } from "@/lib/clock";
import { queryClient } from "@/providers";
import {
  clearSession,
  isExpired,
  loadSession,
  saveSession,
  type Session,
} from "./lib/session-storage";

type SessionState =
  { status: "loading" } | { status: "signedOut" } | { status: "signedIn"; session: Session };

interface SessionContextValue {
  state: SessionState;
  user: User | null;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const signOut = useCallback(async () => {
    authBridge.setToken(null);
    setState({ status: "signedOut" });
    queryClient.clear();
    await clearSession();
  }, []);

  useEffect(() => {
    authBridge.setUnauthorizedHandler(() => void signOut());
    return () => authBridge.setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await loadSession();
      if (!active) return;
      if (stored && !isExpired(stored, clock.nowMs())) {
        authBridge.setToken(stored.accessToken);
        setState({ status: "signedIn", session: stored });
      } else {
        if (stored) await clearSession();
        setState({ status: "signedOut" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
      signIn,
      signOut,
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
