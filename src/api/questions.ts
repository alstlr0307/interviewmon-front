// src/api/questions.ts
import http from "./http";

/** 프론트에서 쓰는 공통 타입 */
export type Question = { id: string; q: string; category?: string; tag?: string };

/** 서버가 배열만 주거나 {ok,items}로 줄 수도 있어 둘 다 대응 */
type QuestionsResponse = { ok: true; items: Question[] } | Question[];

/* ─────────────────────────────────────────
 * 1) 기존 호환: 회사 기반 로드 (기본 로직 유지)
 * ───────────────────────────────────────── */
export async function getQuestions(company: string): Promise<Question[]> {
  const { data } = await http.get<QuestionsResponse>("/api/interview/questions", {
    params: { company, scope: "company" },
  });
  if (Array.isArray(data)) return data;
  if (data && "items" in data && Array.isArray((data as any).items)) {
    return (data as any).items as Question[];
  }
  return [];
}

/* ─────────────────────────────────────────
 * 2) 신버전: 다양한 필터
 * ───────────────────────────────────────── */
export type GetQuestionsOpts = {
  scope?: "all" | "common" | "company";  // 기본 all
  company?: string;                       // scope=company일 때 권장
  take?: number;                          // 기본 12
  shuffle?: boolean;                      // true면 랜덤
  tags?: string[];                        // ANY 매칭
  q?: string;                             // 키워드
  lang?: string;                          // 기본 ko
};

export async function getQuestionsV2(opts: GetQuestionsOpts = {}): Promise<Question[]> {
  const {
    scope = "all",
    company,
    take = 12,
    shuffle = false,
    tags = [],
    q,
    lang = "ko",
  } = opts;

  const params: any = {
    scope,
    take,
    shuffle: shuffle ? "1" : "0",
    lang,
  };
  if (company) params.company = company;
  if (tags.length) params.tags = tags.join(",");
  if (q && q.trim()) params.q = q.trim();

  const { data } = await http.get<QuestionsResponse>("/api/interview/questions", { params });
  if (Array.isArray(data)) return data;
  if (data && "items" in data && Array.isArray((data as any).items)) {
    return (data as any).items as Question[];
  }
  return [];
}

/* ─────────────────────────────────────────
 * 3) (관리/도구) JD → 문항 추천
 *    - 서버에 /api/interview/suggest 가 있으면 우선 사용
 *    - 없으면 키워드 검색으로 폴백
 * ───────────────────────────────────────── */
export async function suggestQuestions(opts: {
  jd: string;
  company?: string;
  take?: number;
  lang?: string;
}): Promise<Question[]> {
  const { jd, company, take = 10, lang = "ko" } = opts;

  try {
    const { data } = await http.post<QuestionsResponse>("/api/interview/suggest", {
      jd,
      company,
      take,
      lang,
    });
    if (Array.isArray(data)) return data;
    if (data && "items" in data && Array.isArray((data as any).items)) {
      return (data as any).items as Question[];
    }
  } catch {
    // 폴백: JD에서 간단 키워드 뽑아 검색
    const kw = (jd || "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .join(" ");
    return getQuestionsV2({
      scope: company ? "company" : "all",
      company,
      take,
      q: kw,
      lang,
    });
  }
  return [];
}

/* ─────────────────────────────────────────
 * 4) 세션에 문항 부착/조회
 *    - 서버 라우트:
 *      POST /api/sessions/:id/questions  { items:[{questionId?, text, category?, orderNo}] }
 *      GET  /api/sessions/:id/questions  → [{id:?, q: text, category?}, ...]
 * ───────────────────────────────────────── */
export async function attachQuestions(sessionId: number, items: Question[]): Promise<void> {
  const payload = {
    items: items.map((it, idx) => ({
      questionId: /^\d+$/.test(String(it.id)) ? Number(it.id) : null,
      text: it.q,
      category: it.category ?? null,
      orderNo: idx + 1,
    })),
  };
  await http.post(`/api/sessions/${sessionId}/questions`, payload);
}

export async function getSessionQuestions(sessionId: number): Promise<Question[]> {
  const { data } = await http.get<QuestionsResponse>(`/api/sessions/${sessionId}/questions`);
  if (Array.isArray(data)) return data as Question[];
  if (data && "items" in data && Array.isArray((data as any).items)) {
    return (data as any).items as Question[];
  }
  // 서버가 session_questions 스키마 그대로 돌려줄 수도 있음 → 안전 매핑
  if (Array.isArray((data as any))) {
    return (data as any).map((r: any) => ({ id: String(r.id ?? r.question_id ?? r.order_no), q: r.text }));
  }
  return [];
}
