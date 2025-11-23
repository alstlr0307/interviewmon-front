// src/api/mockStories.ts
import { safeUUID } from "../utils/uuid";

export type Story = {
  id: string;
  userId: string;
  title: string;
  content: string;
  companyId?: string | null;
  topic?: string | null;
  tags?: string[];
  aiScore?: number | null;
  aiFeedback?: string | null;
  createdAt: string;
  updatedAt: string;
};

const KEY = "im-stories";

function loadAll(): Story[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Story[]) : [];
  } catch {
    return [];
  }
}
function saveAll(arr: Story[]) {
  localStorage.setItem(KEY, JSON.stringify(arr));
}

export function loadStories(userId: string): Story[] {
  return loadAll().filter((s) => s.userId === userId);
}

export function createStory(userId: string, s: Partial<Story>): Story {
  const now = new Date().toISOString();
  const story: Story = {
    id: safeUUID(),
    userId,
    title: s.title || "제목 없음",
    content: s.content || "",
    companyId: s.companyId ?? null,
    topic: s.topic ?? null,
    tags: s.tags ?? [],
    aiScore: s.aiScore ?? null,
    aiFeedback: s.aiFeedback ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const all = loadAll();
  all.unshift(story);
  saveAll(all);
  return story;
}

export function updateStory(userId: string, id: string, patch: Partial<Story>) {
  const all = loadAll();
  const idx = all.findIndex((s) => s.id === id && s.userId === userId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    saveAll(all);
  }
}

export function deleteStory(userId: string, id: string) {
  const next = loadAll().filter((s) => !(s.userId === userId && s.id === id));
  saveAll(next);
}

export function exportStoriesJSON(userId: string) {
  const items = loadStories(userId);
  const blob = new Blob([JSON.stringify({ userId, items }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stories_${userId}_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
