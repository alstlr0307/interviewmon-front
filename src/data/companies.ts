// src/data/companies.ts
export type CompanyKey =
  | "samsung"
  | "apple"
  | "nvidia"
  | "nexon"
  | "amd"
  | "intel"
  | "custom";

export type Company = {
  key: CompanyKey;
  name: string;
  short?: string;
  color: string;
  /** public/ 기준 절대경로 */
  logo?: string;
};

export const COMPANIES: Company[] = [
  { key: "samsung", name: "삼성",    short: "SAMSUNG", color: "#0f63ff", logo: "/logos/samsung.svg" },
  { key: "apple",   name: "애플",    short: "APPLE",   color: "#1f2937", logo: "/logos/apple.svg"   },
  { key: "nvidia",  name: "엔비디아", short: "NVIDIA", color: "#76b900", logo: "/logos/nvidia.svg"  },
  { key: "nexon",   name: "넥슨",    short: "NEXON",   color: "#2f87ff", logo: "/logos/nexon.svg"   },
  { key: "amd",     name: "AMD",     short: "AMD",     color: "#ed1c24", logo: "/logos/amd.svg"     },
  { key: "intel",   name: "인텔",    short: "INTEL",   color: "#0071c5", logo: "/logos/intel.svg"   },
  { key: "custom",  name: "사용자 지정", short: "CUSTOM", color: "#7c3aed" }, // 로고 없음
];
