// src/api/http.ts
// -----------------------------------------------------------------------------
// Railway 배포용 최종 버전
// - API_BASE: Railway API URL
// - API_PREFIX: "/api"
// - Authorization 자동 부착
// - 401 자동 refresh
// - withCredentials 활성화
// -----------------------------------------------------------------------------

import axios, { AxiosError, AxiosRequestConfig } from "axios";

// 🚀 Railway API URL (프론트 .env에서 가져옴)
const API_BASE_RAW = String(
  (process.env as any)?.REACT_APP_API_BASE || ""
).trim();

// 프리픽스
const API_PREFIX_RAW = String(
  (process.env as any)?.REACT_APP_API_PREFIX || ""
).trim();

const API_BASE = API_BASE_RAW.replace(/\/+$/, ""); // trailing slash 제거
const API_PREFIX = API_PREFIX_RAW
  ? "/" + API_PREFIX_RAW.replace(/^\/+|\/+$/g, "")
  : "";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

let accessToken: string | null = localStorage.getItem(ACCESS_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);

export function setTokens(p: { access?: string | null; refresh?: string | null }) {
  if ("access" in p) {
    accessToken = p.access ?? null;
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    else localStorage.removeItem(ACCESS_KEY);
  }
  if ("refresh" in p) {
    refreshToken = p.refresh ?? null;
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens() {
  setTokens({ access: null, refresh: null });
}

// Axios 인스턴스
const http = axios.create({
  baseURL: API_BASE || "/api",
  withCredentials: true,
  timeout: 15000,
});

// prefix 자동 부착
function applyPrefix(cfg: AxiosRequestConfig) {
  if (!API_PREFIX || !cfg.url) return;

  let url = String(cfg.url);

  // 절대 URL → 그대로 둠
  if (/^https?:\/\//i.test(url)) return;

  url = url.startsWith("/") ? url : `/${url}`;

  if (url === API_PREFIX || url.startsWith(`${API_PREFIX}/`)) {
    cfg.url = url;
    return;
  }

  cfg.url = `${API_PREFIX}${url}`;
}

// /auth/me 캐시 방지
function addCacheBuster(cfg: AxiosRequestConfig) {
  const isGet = (cfg.method || "get").toLowerCase() === "get";
  if (!isGet) return;

  const url = cfg.url || "";
  const needs =
    url.includes("/auth/me") ||
    url.includes("/sessions") ||
    url.includes("/profile");

  if (!needs) return;

  const params = new URLSearchParams();
  const raw = typeof cfg.params === "object" && cfg.params !== null
    ? (cfg.params as Record<string, unknown>)
    : {};

  for (const [k, v] of Object.entries(raw)) {
    if (v != null) params.set(k, String(v));
  }
  params.set("_ts", Date.now().toString());
  cfg.params = params;
}

http.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers ?? {};

  applyPrefix(cfg);
  addCacheBuster(cfg);

  const url = cfg.url || "";
  const authFree = /\/auth\/(login|register|signup|refresh)/.test(url);

  if (accessToken && !authFree) {
    (cfg.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  return cfg;
});

let refreshing: Promise<void> | null = null;

async function ensureRefreshed() {
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
        const at = data?.accessToken ?? null;
        const rt = data?.refreshToken ?? null;

        if (at) setTokens({ access: at });
        if (rt) setTokens({ refresh: rt });

        console.log("[TOKEN] refresh OK");
      })
      .catch((err) => {
        console.error("[TOKEN] refresh failed", err);
        clearTokens();
      })
      .finally(() => {
        refreshing = null;
      });
  }

  await refreshing;
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const resp = error.response;
    const orig = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!resp || !orig) throw error;

    if (resp.status === 401 && refreshToken && !orig._retry) {
      await ensureRefreshed();

      if (accessToken) {
        orig._retry = true;
        orig.headers = orig.headers ?? {};
        (orig.headers as Record<string, string>).Authorization =
          `Bearer ${accessToken}`;
        addCacheBuster(orig);
        return http(orig);
      }
    }

    throw error;
  }
);

export default http;
