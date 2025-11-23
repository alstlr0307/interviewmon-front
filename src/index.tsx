/**
 * index.tsx
 * - 전역 스타일 import
 * - AuthProvider + ReadyGate만 감싸고, Router는 ‘App’ 안에서만 사용
 */
import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css"; // 전역 스타일/Tailwind 등 프로젝트에 맞게

import App from "./App";
import { AuthProvider } from "./api/auth";
import ReadyGate from "./components/ReadyGate";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ReadyGate>
        <App />
      </ReadyGate>
    </AuthProvider>
  </React.StrictMode>
);
