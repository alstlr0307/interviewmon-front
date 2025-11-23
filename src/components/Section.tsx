/**
 * components/Section.tsx
 * - 스르륵 등장 섹션 래퍼
 */
import { useEffect, useRef, useState, PropsWithChildren } from "react";

type Props = PropsWithChildren<{ className?: string }>

export default function Section({ children, className }: Props){
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.unobserve(el);
      }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className ?? ""}`.trim()}>
      {children}
    </div>
  );
}
