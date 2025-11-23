// src/api/auth.tsx
// -----------------------------------------------------------------------------
// - 앱 시작 시 /auth/me로 세션 확인 → ready=true (성공/실패 무관)
// - 로그인: 토큰 저장, 사용자 상태 설정, WS 재연결, /auth/me 재조회로 동기화
// - 로그아웃: 서버 호출 후 토큰/사용자 초기화, WS 해제
// - 화면 진입은 ready만 보고 결정(WS/세션은 백그라운드)
// -----------------------------------------------------------------------------

import React, { createContext, useContext, useEffect, useState } from "react";
import http, { setTokens, clearTokens } from "./http";
import { connectWS, disconnectWS } from "../utils/ws";

export type AuthUser = { id: string; email: string; name: string; role: "user" | "admin" };

type Ctx = {
  user: AuthUser | null;
  ready: boolean;
  signup(email: string, password: string, name: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  updateProfile(p: { name?: string; email?: string }): Promise<void>;
  changePassword(p: { current: string; next: string }): Promise<void>;
  deleteAccount(): Promise<void>;
  getCurrentPassword(): string | null;
};

const AuthContext = createContext<Ctx>(null!);

const URLS = {
  me: "/auth/me",
  login: "/auth/login",
  logout: "/auth/logout",
  register: "/auth/register",
  signup: "/auth/signup",
  changePassword: "/auth/password",
};

function toAuthUser(raw: any): AuthUser {
  return {
    id: String(raw.id),
    email: raw.email,
    name: raw.displayName ?? raw.name ?? "",
    role: (raw.role ?? "user") as "user" | "admin",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await http.get(URLS.me, { params: { _ts: Date.now() } });
        const u = (data as any)?.user ?? data;
        if (!cancelled && u) setUser(toAuthUser(u));
      } catch {
        // not logged in
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ready) connectWS(); // 화면과 분리
  }, [ready]);

  async function signup(email: string, password: string, name: string) {
    try {
      await http.post(URLS.register, { email, password, displayName: name });
    } catch (e: any) {
      if (e?.response?.status === 404) {
        await http.post(URLS.signup, { email, password, displayName: name });
      } else { throw e; }
    }
    await login(email, password);
  }

  async function login(email: string, password: string) {
    const { data } = await http.post(URLS.login, { email, password });
    const payload = (data || {}) as any;

    const access  = payload.accessToken  ?? payload.access  ?? null;
    const refresh = payload.refreshToken ?? payload.refresh ?? null;
    const u       = payload.user ?? payload;

    setTokens({ access, refresh });
    setUser(toAuthUser(u));

    connectWS(); // 권한 컨텍스트 변경 → 재연결

    try {
      const me = await http.get(URLS.me, { params: { _ts: Date.now() } });
      const u2 = (me.data as any)?.user ?? me.data;
      if (u2) setUser(toAuthUser(u2));
    } catch {}
  }

  async function logout() {
    try { await http.post(URLS.logout, {}); } catch {}
    clearTokens();
    setUser(null);
    disconnectWS();
  }

  async function updateProfile(_: { name?: string; email?: string }) {
    const { data } = await http.get(URLS.me, { params: { _ts: Date.now() } });
    const u = (data as any)?.user ?? data;
    if (u) setUser(toAuthUser(u));
  }

  async function changePassword(p: { current: string; next: string }) {
    await http.patch(URLS.changePassword, {
      currentPassword: p.current, newPassword: p.next,
    });
  }

  async function deleteAccount() { await logout(); }
  function getCurrentPassword() { return ""; }

  return (
    <AuthContext.Provider
      value={{ user, ready, signup, login, logout, updateProfile, changePassword, deleteAccount, getCurrentPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
