// src/api/sessions.ts
import http from "./http";

export type SessionItem = {
  id: number;
  company: string;
  jobTitle?: string | null;
  score?: number | null;
  level?: string | null;
  feedback?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  createdAt: string;
};

export async function createSession(p: {
  company: string;
  jobTitle?: string | null;
  score?: number | null;
  level?: string | null;
  feedback?: string | null;
  startedAt?: string;
  finishedAt?: string | null;
}) {
  const { data } = await http.post("/sessions", p); // ← baseURL=/api
  return data.id as number;
}

export async function getSession(id: number) {
  const { data } = await http.get(`/sessions/${id}`);
  return data.item as SessionItem;
}

export async function listSessions(page = 1, size = 10) {
  const { data } = await http.get("/sessions", { params: { page, size } });
  return data as { items: SessionItem[]; page: number; size: number; total: number; totalPages: number };
}

export async function listRecent(limit = 10) {
  const { data } = await http.get("/sessions/recent", { params: { limit } });
  return data.items as SessionItem[];
}

export async function updateSession(id: number, patch: Partial<Omit<SessionItem, "id" | "createdAt">>) {
  await http.patch(`/sessions/${id}`, patch);
}

export async function deleteSession(id: number) {
  await http.delete(`/sessions/${id}`);
}

export async function clearSessions(_userId?: string) {
  const first = await listSessions(1, 100);
  await Promise.all(first.items.map((s) => deleteSession(s.id)));
}
