/**
 * api/mockSessions.ts
 * - 세션 로컬 저장/조회/삭제/초기화
 */
import { SessionRecord } from "../types";

const key = (userId: string) => `im-sessions-${userId || "guest"}`;

export function saveSession(userId: string, s: SessionRecord) {
  const list = loadSessions(userId);
  list.unshift(s);
  localStorage.setItem(key(userId), JSON.stringify(list));
}

export function loadSessions(userId: string): SessionRecord[] {
  const raw = localStorage.getItem(key(userId));
  try {
    return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function deleteSession(userId: string, sessionId: string) {
  const list = loadSessions(userId).filter((s) => s.id !== sessionId);
  localStorage.setItem(key(userId), JSON.stringify(list));
}

export function clearSessions(userId: string) {
  localStorage.removeItem(key(userId));
}

export function exportSessionJSON(s: SessionRecord) {
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `myeonjeopmon-session-${s.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
