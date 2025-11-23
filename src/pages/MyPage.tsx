// src/pages/MyPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../api/mockAuth";
import { useNavigate } from "react-router-dom";
import { COMPANIES } from "../data/companies";
import http from "../api/http";
import {
  loadStories, createStory, updateStory, deleteStory, exportStoriesJSON,
} from "../api/mockStories";
import type { Story as StoryModel } from "../api/mockStories";
import { useTheme } from "../contexts/ThemeContext";

const TOPIC_LABEL: Record<string, string> = {
  motivation: "지원동기", failure: "실패/교훈", leadership: "리더십", teamwork: "협업", project: "프로젝트",
  optimization: "최적화", traffic: "트래픽/스케일", security: "보안", testing: "테스트", architecture: "아키텍처",
  data: "데이터/지표", legacy: "레거시개선", incident: "장애대응", automation: "자동화",
  time_mgmt: "시간관리", learning: "학습/성장", general: "일반",
};

const companies = COMPANIES.map((c: any) => ({ id: c.id ?? c.key, name: c.name }));

export default function MyPage() {
  const nav = useNavigate();
  const { user, updateProfile, changePassword, deleteAccount, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const uid = user?.id || "guest";
  const [, refresh] = useState(0);

  // 최근 세션 ---------------------------------------------------
  const [recent, setRecent] = useState<any[]>([]);
  const [recentErr, setRecentErr] = useState<string>("");

  useEffect(() => {
    if (!user) { setRecent([]); setRecentErr(""); return; }

    const normalize = (items: any[]) =>
      (Array.isArray(items) ? items : []).map((s: any) => ({
        ...s,
        // 표시 기준 시간 보정
        createdAt: s?.createdAt || s?.finishedAt || s?.startedAt || null,
      }));

    (async () => {
      // 1차: /api/sessions/recent
      try {
        setRecentErr("");
        const r1 = await http.get("/api/sessions/recent?limit=10");
        const items = normalize(r1.data?.items || []);
        if (items.length > 0) { setRecent(items); return; }
      } catch {
        // 무시하고 폴백 시도
      }
      // 2차 폴백: /api/sessions
      try {
        const r2 = await http.get("/api/sessions?page=1&size=10");
        const items = normalize(r2.data?.items || []);
        setRecent(items);
        setRecentErr("");
      } catch (e: any) {
        setRecent([]);
        setRecentErr(e?.response?.data?.message || e?.message || "최근 세션을 불러오지 못했습니다.");
      }
    })();
  }, [user]);

  const stat = useMemo(() => {
    const total = recent.length;
    const scored = recent.filter((s) => typeof s.score === "number") as Array<{ score: number }>;
    const avgScore = scored.length ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
    return { total, avgScore };
  }, [recent]);

  // 약한 토픽(placeholder)
  const weakTopics: string[] = [];

  // 스토리뱅크 ---------------------------------------------------
  const stories = loadStories(uid);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | "">("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s: any) => (Array.isArray(s?.tags) ? s.tags : []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [stories]);

  const filteredStories = useMemo(() => {
    const query = q.trim().toLowerCase();
    return stories
      .filter((s: any) => (tagFilter ? (Array.isArray(s?.tags) ? s.tags.includes(tagFilter) : false) : true))
      .filter((s: any) => {
        if (!query) return true;
        const title = String(s?.title ?? "").toLowerCase();
        const content = String(s?.content ?? "").toLowerCase();
        const topic = String(s?.topic ?? "").toLowerCase();
        const topicLabel = String(TOPIC_LABEL[s?.topic as string] ?? "").toLowerCase();
        return title.includes(query) || content.includes(query) || topic.includes(query) || topicLabel.includes(query);
      })
      .sort((a: any, b: any) => {
        const ua = String(a?.updatedAt ?? a?.createdAt ?? "");
        const ub = String(b?.updatedAt ?? b?.createdAt ?? "");
        return ub.localeCompare(ua);
      });
  }, [stories, q, tagFilter]);

  function onDeleteStory(id: string) {
    if (!user) return;
    if (!window.confirm("이 스토리를 삭제할까요?")) return;
    deleteStory(uid, id);
    refresh((v) => v + 1);
  }
  function onSaveStoryInline(id: string, title: string, content: string, tagsInput: string) {
    if (!user) return;
    const tags = tagsInput.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
    updateStory(uid, id, { title, content, tags });
    refresh((v) => v + 1);
  }
  function onAddEmptyStory() {
    if (!user) return;
    createStory(uid, { title: "새 스토리", content: "", tags: ["임시"] });
    refresh((v) => v + 1);
  }

  // 프로필/비번/탈퇴 ----------------------------------------------
  const [name, setName] = useState((user as any)?.displayName ?? (user as any)?.name ?? "");
  const [email, setEmail] = useState(user?.email || "");
  const [pmsg, setPmsg] = useState("");

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault(); setPmsg("");
    try {
      // mockAuth 타입: { name?: string; email?: string }
      await updateProfile({ name, email });
      setPmsg("프로필이 저장되었습니다.");
    } catch (e: any) {
      setPmsg(e?.message || "저장 실패");
    }
  }

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwmsg, setPwmsg] = useState("");

  async function onChangePw(e: React.FormEvent) {
    e.preventDefault(); setPwmsg("");
    if (newPw.length < 8) return setPwmsg("새 비밀번호는 8자 이상이어야 합니다.");
    if (newPw !== newPw2) return setPwmsg("새 비밀번호 확인이 일치하지 않습니다.");
    try {
      // mockAuth 타입: { current: string; next: string }
      await changePassword({ current: curPw, next: newPw });
      setPwmsg("비밀번호가 변경되었습니다.");
      setCurPw(""); setNewPw(""); setNewPw2("");
    } catch (e: any) {
      setPwmsg(e?.message || "변경 실패");
    }
  }

  async function onDeleteAccount() {
    if (!window.confirm("정말 탈퇴하시겠습니까? 저장된 면접 기록이 모두 삭제됩니다.")) return;
    await deleteAccount();
    alert("탈퇴가 완료되었습니다.");
    nav("/");
  }

  function viewSession(id: number) {
    nav(`/result?sid=${id}`);
  }

  // UI -----------------------------------------------------------
  return (
    <div className="vstack" style={{ gap: 16 }}>
      <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>마이페이지</h1>
        <button className="btn" onClick={toggleTheme} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {theme === "dark" ? "🌞" : "🌙"} {theme === "dark" ? "라이트 모드" : "다크 모드"}
        </button>
      </div>

      <div className="grid3 section">
        <div className="kpi"><b>{stat.total}</b><span>세션 수</span></div>
        <div className="kpi"><b>{stat.avgScore}</b><span>평균 점수</span></div>
        <div className="kpi"><b>{weakTopics.length}</b><span>약한 영역</span></div>
      </div>

      <div className="card section" style={{ padding: 16 }}>
        <h2>약한 영역 추천</h2>
        <p className="small" style={{ color: "#9aa3b2" }}>
          최근 기록을 바탕으로 약한 영역을 골랐어요: {weakTopics.length ? weakTopics.join(", ") : "데이터가 부족합니다."}
        </p>
        <div className="hstack" style={{ gap: 8, alignItems: "center" }}>
          <label className="small" style={{ width: 80 }}>기업 선택</label>
          <select className="input" defaultValue={companies[0]?.id}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn brand" disabled>약한 영역 10문항 연습</button>
        </div>
      </div>

      {/* 스토리뱅크 */}
      <div className="card section" style={{ padding: 16 }}>
        <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2>스토리뱅크</h2>
          <div className="hstack" style={{ gap: 8 }}>
            <button className="btn" onClick={() => exportStoriesJSON(uid)}>JSON 내보내기</button>
            <button className="btn" onClick={onAddEmptyStory}>새 스토리</button>
          </div>
        </div>

        <div className="hstack" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <input className="input" placeholder="검색(제목/본문/토픽)" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 220 }} />
          <select className="input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">태그 전체</option>
            {allTags.map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="small" style={{ color: "#9aa3b2" }}>총 {filteredStories.length}개</span>
        </div>

        {filteredStories.length === 0 && <p className="small" style={{ marginTop: 10 }}>스토리가 없습니다. 결과 페이지에서 ☆ 버튼으로 저장해 보세요.</p>}

        <ul style={{ marginTop: 10 }}>
          {filteredStories.map((s: StoryModel) => (
            <StoryItem key={s.id} story={s} onDelete={(id) => onDeleteStory(id)} onSave={(id, t, c, tags) => onSaveStoryInline(id, t, c, tags)} />
          ))}
        </ul>
      </div>

      {/* 프로필 / 비번 */}
      <div className="grid2 section">
        <form className="card vstack" style={{ padding: 16, gap: 12 }} onSubmit={onSaveProfile}>
          <h2>프로필</h2>
          <label>이름</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <label>이메일</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label>현재 비밀번호</label>
          <input className="input" value={user ? "••••••••" : "로그인이 필요합니다"} readOnly style={{ backgroundColor: "#0a0b12", color: "#9aa3b2" }} />
          {pmsg && <div className="small" style={{ color: "#a3e2b0" }}>{pmsg}</div>}
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button className="btn" type="button" onClick={logout}>로그아웃</button>
            <button className="btn brand" type="submit">저장</button>
          </div>
        </form>

        <form className="card vstack" style={{ padding: 16, gap: 12 }} onSubmit={onChangePw}>
          <h2>비밀번호 변경</h2>
          <label>현재 비밀번호</label>
          <input className="input" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          <label>새 비밀번호</label>
          <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <label>새 비밀번호 확인</label>
          <input className="input" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
          {pwmsg && <div className="small" style={{ color: pwmsg.includes("완료") || pwmsg.includes("변경") ? "#a3e2b0" : "#ff9aa9" }}>{pwmsg}</div>}
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button className="btn brand" type="submit">비밀번호 변경</button>
          </div>
        </form>
      </div>

      {/* 최근 세션 */}
      <div className="card section" style={{ padding: 16 }}>
        <div className="hstack" style={{ justifyContent: "space-between" }}>
          <h2>최근 세션</h2>
          {recent.length > 0 && <span className="small" style={{ color: "#9aa3b2" }}>가장 최근 항목이 위에 표시됩니다.</span>}
        </div>
        {recentErr && <p className="small" style={{ color: "#ff9aa9" }}>{recentErr}</p>}
        {recent.length === 0 && !recentErr && <p className="small">아직 기록이 없습니다. 모의면접을 시작해보세요.</p>}
        <ul>
          {recent.map((s: any) => (
            <li key={s.id} className="hstack" style={{ justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed #20283a" }}>
              <div className="vstack" style={{ gap: 4 }}>
                <div className="small" style={{ color: "#9aa3b2" }}>
                  {new Date(s?.createdAt || s?.startedAt || Date.now()).toLocaleString()}
                </div>
                <div className="small">{String(s?.company ?? "")}</div>
              </div>
              <div className="hstack" style={{ gap: 8 }}>
                <button className="btn" onClick={() => viewSession(s.id)}>다시 보기</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ padding: 16, borderColor: "#3a1c22", background: "#171219" }}>
        <h2 style={{ color: "#ffb4be" }}>계정 관리 (주의)</h2>
        <p className="small" style={{ color: "#cba5ad" }}>회원탈퇴 시 로컬에 저장된 모든 면접 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <button className="btn" onClick={onDeleteAccount}>회원탈퇴</button>
        </div>
      </div>
    </div>
  );
}

function StoryItem({
  story, onDelete, onSave,
}: { story: StoryModel; onDelete: (id: string) => void; onSave: (id: string, title: string, content: string, tags: string) => void; }) {
  const [edit, setEdit] = useState(false);
  const [title, setTitle] = useState(story.title);
  const [content, setContent] = useState(story.content);
  const [tags, setTags] = useState((story.tags || []).join(", "));

  return (
    <li className="card" style={{ padding: 12, marginBottom: 10 }}>
      <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        {edit ? <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /> : <b>{title}</b>}
        <div className="hstack" style={{ gap: 8 }}>
          {edit ? (
            <>
              <button className="btn" onClick={() => { onSave(story.id, title, content, tags); setEdit(false); }}>저장</button>
              <button className="btn" onClick={() => { setEdit(false); setTitle(story.title); setContent(story.content); setTags((story.tags || []).join(", ")); }}>취소</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setEdit(true)}>편집</button>
              <button className="btn" onClick={() => onDelete(story.id)}>삭제</button>
            </>
          )}
        </div>
      </div>

      <div className="small" style={{ color: "#9aa3b2", marginTop: 4 }}>
        {story.companyId ? `회사: ${story.companyId} · ` : ""}{story.topic ? `토픽: ${story.topic}` : ""}
      </div>

      {edit ? (
        <>
          <label className="small" style={{ marginTop: 10 }}>본문</label>
          <textarea className="input" rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          <label className="small" style={{ marginTop: 8 }}>태그(쉼표로 구분)</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </>
      ) : (
        <details open style={{ marginTop: 8 }}>
          <summary className="small">본문 보기</summary>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{story.content}</div>
          {story.aiFeedback && (
            <>
              <div className="small" style={{ color: "#9aa3b2", marginTop: 6 }}>AI 피드백</div>
              <div className="card" style={{ padding: 12, background: "#0d1018", marginTop: 6, whiteSpace: "pre-wrap" }}>
                {story.aiFeedback}
              </div>
            </>
          )}
          {(story.tags || []).length > 0 && (
            <div className="hstack" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {(story.tags || []).map((t: string, i: number) => <span key={i} className="badge">{t}</span>)}
            </div>
          )}
          <div className="small" style={{ color: "#9aa3b2", marginTop: 6 }}>
            업데이트: {new Date(story.updatedAt).toLocaleString()}
          </div>
        </details>
      )}
    </li>
  );
}
