"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from "react";

type AuthUser = {
    id: string;
    email: string;
    name?: string;
    [key: string]: unknown;
} | null;

interface LoginPayload {
    token: string;
    user: NonNullable<AuthUser>;
}

interface AuthContextValue {
    user: AuthUser;
    token: string | null;
    isAuthenticated: boolean;
    login: (payload: LoginPayload) => void;
    logout: () => void;
}

const TOKEN_STORAGE_KEY = "pairup_token";
const USER_STORAGE_KEY = "pairup_user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

        if (storedToken) {
            setToken(storedToken);
        }

        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
            } catch (error) {
                console.error("Failed to parse stored user", error);
                window.localStorage.removeItem(USER_STORAGE_KEY);
            }
        }
    }, []);

    const login = useCallback(({ token: nextToken, user: nextUser }: LoginPayload) => {
        setToken(nextToken);
        setUser(nextUser);
        window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(USER_STORAGE_KEY);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token,
            isAuthenticated: Boolean(token),
            login,
            logout,
        }),
        [user, token, login, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
