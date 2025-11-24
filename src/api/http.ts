// src/api/http.ts
// -----------------------------------------------------------------------------
// InterviewMon Front-End HTTP Client (Final Stable Version)
// - API_BASE (Railway URL)
// - API_PREFIX (/api)
// - Authorization 자동 첨부
// - Refresh Token 자동 재발급
// - Prefix 적용 규칙 통일
// - CacheBuster 적용
// -----------------------------------------------------------------------------

import axios, { AxiosError, AxiosRequestConfig } from "axios";

// =====================================================
// 0) 환경변수에서 API 주소 / Prefix 읽기
// =====================================================
const RAW_BASE = String((process.env as any)?.REACT_APP_API_BASE || "").trim();
const RAW_PREFIX = String((process.env as any)?.REACT_APP_API_PREFIX || "").trim();

const API_BASE = RAW_BASE.replace(/\/+$/, "");
const API_PREFIX = RAW_PREFIX
  ? "/" + RAW_PREFIX.replace(/^\/+|\/+$/g, "")
  : "";

// =====================================================
// 1) 로컬 저장 토큰
// =====================================================
const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

let accessToken: string | null = localStorage.getItem(ACCESS_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);

export function setTokens(n: { access?: string | null; refresh?: string | null }) {
  if ("access" in n) {
    accessToken = n.access ?? null;
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    else localStorage.removeItem(ACCESS_KEY);
  }
  if ("refresh" in n) {
    refreshToken = n.refresh ?? null;
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens() {
  setTokens({ access: null, refresh: null });
}

// =====================================================
// 2) Axios 인스턴스
// =====================================================
const http = axios.create({
  baseURL: API_BASE || "/api",
  withCredentials: true,
  timeout: 15000,
});

// =====================================================
// 3) URL Prefix 자동 삽입
// =====================================================
function applyPrefix(cfg: AxiosRequestConfig) {
  if (!API_PREFIX || !cfg.url) return;

  const original = cfg.url;
  let url = String(original);

  if (/^https?:\/\//i.test(url)) return; // 절대 경로면 무시

  url = url.startsWith("/") ? url : `/${url}`;

  if (url.startsWith(API_PREFIX)) return;

  cfg.url = `${API_PREFIX}${url}`;
}

// =====================================================
// 4) GET 요청 Cache Busting (auth/me, sessions 관련)
// =====================================================
function addCacheBuster(cfg: AxiosRequestConfig) {
  if (!cfg.url) return;

  const isGet = (cfg.method || "").toLowerCase() === "get";
  if (!isGet) return;

  const must =
    cfg.url.includes("/auth/me") ||
    cfg.url.includes("/sessions") ||
    cfg.url.includes("/profile");

  if (!must) return;

  const params = new URLSearchParams();

  const raw = typeof cfg.params === "object" && cfg.params
    ? (cfg.params as Record<string, unknown>)
    : {};

  for (const [k, v] of Object.entries(raw)) {
    if (v != null) params.set(k, String(v));
  }

  params.set("_ts", Date.now().toString());
  cfg.params = params;
}

// =====================================================
// 5) Request 인터셉터 — Authorization 자동 첨부
// =====================================================
http.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {};

  applyPrefix(cfg);
  addCacheBuster(cfg);

  const url = cfg.url || "";
  const skip = /\/auth\/(login|register|signup|refresh)/.test(url);

  if (accessToken && !skip) {
    (cfg.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  return cfg;
});

// =====================================================
// 6) Refresh Token 자동 재발급
// =====================================================
let refreshing: Promise<void> | null = null;

async function ensureFresh() {
  if (!refreshing) {
    const raw = axios.create({
      baseURL: API_BASE || "/api",
      withCredentials: true,
    });

    refreshing = raw
      .post(`${API_PREFIX}/auth/refresh`, {}, {
        headers: { "X-Refresh-Token": refreshToken ?? "" },
      })
      .then(({ data }) => {
        const at = data?.accessToken || null;
        const rt = data?.refreshToken || null;

        if (at) setTokens({ access: at });
        if (rt) setTokens({ refresh: rt });

        console.log("[REFRESH] OK");
      })
      .catch((e) => {
        console.error("[REFRESH] FAILED", e);
        clearTokens();
      })
      .finally(() => {
        refreshing = null;
      });
  }

  await refreshing;
}

// =====================================================
// 7) Response 인터셉터 — 401 자동 재시도
// =====================================================
http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const resp = err.response;
    const orig = err.config as AxiosRequestConfig & { _retry?: boolean };

    if (!resp || !orig) throw err;

    if (resp.status === 401 && refreshToken && !orig._retry) {
      await ensureFresh();

      if (accessToken) {
        orig._retry = true;
        orig.headers = orig.headers ?? {};
        (orig.headers as Record<string, string>).Authorization =
          `Bearer ${accessToken}`;
        addCacheBuster(orig);
        return http(orig);
      }
    }

    throw err;
  }
);

export default http;
