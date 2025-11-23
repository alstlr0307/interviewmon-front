// src/ai/evaluator.ts
import http from "../api/http";

export type GradeLetter = "S" | "A" | "B" | "C" | "D" | "F";
export interface AiResult {
  score: number; grade: GradeLetter; summary: string; tips: string[]; keywords: string[]; rewrite: string;
}
export interface GradeAPIResponse { ok: boolean; ai: AiResult; }

export interface GradeOptions {
  signal?: AbortSignal; skipCache?: boolean; minChars?: number; debounceMs?: number;
}

function hashString(s: string){ let h=5381; for(let i=0;i<s.length;i++) h=(h*33)^s.charCodeAt(i); return (h>>>0).toString(36); }
const cache = new Map<string, AiResult>();

export async function gradeAnswerOnce(sessionId:number, sqid:number, answer:string, opts:GradeOptions = {}) {
  const minChars = opts.minChars ?? 20;
  const trimmed = (answer||"").trim();
  if (!trimmed || trimmed.length<minChars) throw new Error(`answer too short (>= ${minChars} chars)`);
  const key = `${sessionId}:${sqid}:${hashString(trimmed)}`;
  if (!opts.skipCache && cache.has(key)) return cache.get(key)!;

  const res = await http.post<GradeAPIResponse>(`/api/sessions/${sessionId}/questions/${sqid}/grade`, { answer: trimmed }, { signal: opts.signal });
  if (!res.data?.ok || !res.data?.ai) throw new Error("AI grade failed");
  cache.set(key, res.data.ai);
  return res.data.ai;
}

export function createDebouncedGrader(sessionId:number, sqid:number, base:GradeOptions = {}) {
  const debounceMs = base.debounceMs ?? 800;
  let timer:any=null, ctrl:AbortController|null=null;

  function cancel(){ if(timer){clearTimeout(timer);timer=null;} if(ctrl){ctrl.abort();ctrl=null;} }

  function run(answer:string, overrides:GradeOptions={}):Promise<AiResult|null>{
    cancel();
    const opts={...base,...overrides};
    return new Promise((resolve,reject)=>{
      timer=setTimeout(async ()=>{
        timer=null; ctrl=new AbortController();
        const signal = opts.signal ? link(ctrl.signal, opts.signal) : ctrl.signal;
        try{ const r=await gradeAnswerOnce(sessionId,sqid,answer,{...opts,signal}); resolve(r); }
        catch(e:any){ if(isAbort(e)) resolve(null); else reject(e); }
        finally{ ctrl=null; }
      }, debounceMs);
    });
  }
  return { run, cancel };
}
function link(a:AbortSignal,b:AbortSignal){ const c=new AbortController(); const f=()=>c.abort(); a.addEventListener("abort",f); b.addEventListener("abort",f); if(a.aborted||b.aborted) c.abort(); return c.signal; }
function isAbort(e:any){ return e?.name==="AbortError" || e?.code==="ERR_CANCELED"; }
