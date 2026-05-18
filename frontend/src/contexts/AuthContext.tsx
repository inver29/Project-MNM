import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiRequest } from "@/lib/api";
import { Account } from "@/types/domain";

interface RegisterPayload {
  email_address: string;
  password: string;
  display_name: string;
  mobile_phone?: string;
  address_line?: string;
}

interface AuthContextValue {
  user: Account | null;
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: Account;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_SESSION_KEY = "mnm_auth_session_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(AUTH_SESSION_KEY);
  });
  const [user, setUser] = useState<Account | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (token) {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, token);
      return;
    }

    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  }, [token]);

  useEffect(() => {
    if (!token || !isReady) {
      return;
    }

    let isCancelled = false;
    apiRequest<Account>("/auth/me", { token })
      .then((profile) => {
        if (isCancelled) {
          return;
        }
        setUser(profile);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }
        setToken(null);
        setUser(null);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(AUTH_SESSION_KEY);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [token, isReady]);

  async function login(email: string, password: string) {
    const payload = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: {
        email_address: email,
        password,
      },
    });
    setToken(payload.access_token);
    setUser(payload.user);
  }

  async function register(payload: RegisterPayload) {
    await apiRequest<Account>("/auth/register", {
      method: "POST",
      body: payload,
    });
    await login(payload.email_address, payload.password);
  }

  async function refreshProfile() {
    if (!token) {
      return;
    }
    const profile = await apiRequest<Account>("/auth/me", { token });
    setUser(profile);
  }

  function logout() {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isReady,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
