// src/components/ReadyGate.tsx
import React from "react";
import { useAuth } from "../api/auth";

export default function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth();
  if (!ready) {
    return (
      <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
        세션을 시작하는 중…
      </div>
    );
  }
  return <>{children}</>;
}
