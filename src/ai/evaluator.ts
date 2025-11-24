// src/ai/evaluator.ts
// 인터뷰 세션 문항에 대한 AI 채점 헬퍼 (캐시 + 디바운스)

import type { AiResult } from "../api/interview";
import { gradeAnswerAPI } from "../api/interview";

export type GradeLetter = AiResult["grade"];

export interface GradeOptions {
  signal?: AbortSignal;
  skipCache?: boolean;
  minChars?: number;
  debounceMs?: number;
}

function hashString(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const cache = new Map<string, AiResult>();

// 한 번만 호출하는 버전 (캐시 + 최소 길이 체크)
export async function gradeAnswerOnce(
  sessionId: number,
  sqid: number,
  answer: string,
  opts: GradeOptions = {}
): Promise<AiResult> {
  const minChars = opts.minChars ?? 20;
  const trimmed = (answer || "").trim();
  if (!trimmed || trimmed.length < minChars) {
    throw new Error(`answer too short (>= ${minChars} chars)`);
  }

  const key = `${sessionId}:${sqid}:${hashString(trimmed)}`;
  if (!opts.skipCache && cache.has(key)) return cache.get(key)!;

  // 실제 API 호출은 interview 클라이언트 재사용
  const ai = await gradeAnswerAPI(sessionId, sqid, trimmed);

  cache.set(key, ai);
  return ai;
}

// 디바운스 래퍼 (필요한 화면에서만 사용)
export function createDebouncedGrader(
  sessionId: number,
  sqid: number,
  base: GradeOptions = {}
) {
  const debounceMs = base.debounceMs ?? 800;
  let timer: any = null;
  let ctrl: AbortController | null = null;

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (ctrl) {
      ctrl.abort();
      ctrl = null;
    }
  }

  function run(answer: string, overrides: GradeOptions = {}): Promise<AiResult | null> {
    cancel();
    const opts = { ...base, ...overrides };

    return new Promise((resolve, reject) => {
      timer = setTimeout(async () => {
        timer = null;
        ctrl = new AbortController();
        const signal = opts.signal
          ? link(ctrl.signal, opts.signal)
          : ctrl.signal;

        try {
          const r = await gradeAnswerOnce(sessionId, sqid, answer, {
            ...opts,
            signal,
          });
          resolve(r);
        } catch (e: any) {
          if (isAbort(e)) resolve(null);
          else reject(e);
        } finally {
          ctrl = null;
        }
      }, debounceMs);
    });
  }

  return { run, cancel };
}

function link(a: AbortSignal, b: AbortSignal) {
  const c = new AbortController();
  const f = () => c.abort();
  a.addEventListener("abort", f);
  b.addEventListener("abort", f);
  if (a.aborted || b.aborted) c.abort();
  return c.signal;
}

function isAbort(e: any) {
  return e?.name === "AbortError" || e?.code === "ERR_CANCELED";
}
