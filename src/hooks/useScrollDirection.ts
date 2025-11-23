/**
 * hooks/useScrollDirection.ts
 */
import { useEffect, useState } from "react";

export default function useScrollDirection(){
  const [dir, setDir] = useState<"up" | "down">("up");

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          const d = y > lastY ? "down" : "up";
          if (Math.abs(y - lastY) > 4 && d !== dir) setDir(d);
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dir]);

  return dir;
}
