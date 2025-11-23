// src/utils/uuid.ts
// 안전한 UUID 생성 (브라우저 crypto.randomUUID 지원/미지원 모두 대응)

export function safeUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36)
  );
}
