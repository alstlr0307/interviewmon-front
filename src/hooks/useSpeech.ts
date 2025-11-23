/**
 * hooks/useSpeech.ts
 * - Web Speech API (TTS/STT)
 */
import { useCallback, useEffect, useRef, useState } from "react";

type RecType = any;

export function useSpeech(){
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const SpeechRecognition = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const recRef = useRef<RecType | null>(null);
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState<boolean>(!!SpeechRecognition);

  useEffect(()=>{ setSupported(!!SpeechRecognition); }, [SpeechRecognition]);

  const speak = useCallback((text:string)=>{
    if (!synth) return;
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = "ko-KR";
    synth.cancel();
    synth.speak(uttr);
  }, [synth]);

  const start = useCallback((onText:(t:string)=>void)=>{
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    recRef.current = rec;
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e:any)=>{
      let str = "";
      for (let i=e.resultIndex; i<e.results.length; i++){
        str += e.results[i][0].transcript;
      }
      onText(str);
    };
    rec.onend = ()=> setRecording(false);
    rec.onerror = ()=> setRecording(false);
    rec.start();
    setRecording(true);
  }, [SpeechRecognition]);

  const stop = useCallback(()=>{
    recRef.current?.stop?.();
    setRecording(false);
  }, []);

  return { supported, recording, start, stop, speak };
}
