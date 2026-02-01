<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+KR&size=32&pause=1200&color=111111&center=true&vCenter=true&width=1000&lines=Interviewmon+Frontend;Mock+Interview+UI+%26+Flow" alt="Menjupmon Frontend Typing" />
</p>

<p align="center">
  <a href="https://github.com/alstlr0307/interviewmon-api"><img src="https://img.shields.io/badge/Backend-Repo-181717?style=for-the-badge&logo=github&logoColor=white" /></a>
</p>

<br/>

## 📚 목차
1. [프론트엔드 역할](#1-프론트엔드-역할)  
2. [기술 스택](#2-기술-스택)  
3. [프로젝트 구조](#3-프로젝트-구조)  
4. [주요 화면/흐름](#4-주요-화면흐름)  
5. [STT/TTS](#5-stttts)  
6. [실행 방법](#6-실행-방법)  

<br/>

## <a id="1-프론트엔드-역할"></a> 1. 프론트엔드 역할
- 라우팅/페이지 구성 및 UI 렌더링
- 모의면접 진행(타이머/문항 진행/답변 입력)
- 세션 기반 답변 저장 및 결과 화면 제공
- STT/TTS(브라우저 Web Speech API)로 음성 연습 흐름 제공
- 백엔드 REST API 연동(인증/세션/피드백/질문)

<br/>

## <a id="2-기술-스택"></a> 2. 기술 스택
- React (Create React App)
- TypeScript
- react-router-dom
- axios
- framer-motion
- recharts

<pre>
Menjupmon-front
└─ interviewmon-front-main
   ├─ public/
   ├─ src/
   │  ├─ ai/            # 평가/피드백 관련 클라이언트 로직
   │  ├─ api/           # axios/http, API 래퍼
   │  ├─ components/    # 공용 컴포넌트(피드백, 차트 등)
   │  ├─ contexts/      # 전역 컨텍스트(인증/세션 등)
   │  ├─ hooks/         # useSpeech, 세션/문항 훅
   │  ├─ pages/         # 라우팅 단위 화면(Interview/Result 등)
   │  ├─ utils/         # 공용 유틸
   │  ├─ App.tsx
   │  └─ index.tsx
   └─ package.json
</pre>

<br/>

## <a id="4-주요-화면흐름"></a> 4. 주요 화면/흐름
- Home → Companies(기업 선택) → Interview(진행) → Result(결과/피드백)
- MyPage에서 기록/세션 기반 복습 흐름 확인
- AdminQuestions에서 질문 관리(프로젝트 구성 기준)

<br/>

## <a id="5-stttts"></a> 5. STT/TTS
- `src/hooks/useSpeech.ts`에서 Web Speech API 기반 STT/TTS를 다룹니다.
- 브라우저 지원 여부에 따라 기능이 달라질 수 있어, 화면에서 지원 여부를 체크하도록 구성했습니다.

<br/>

## <a id="6-실행-방법"></a> 6. 실행 방법
<pre>
git clone https://github.com/alstlr0307/interviewmon-front.git
cd interviewmon-front
npm install
npm start
</pre>

<br/>

### 참고
- CRA 기반이며 기본 스크립트는 `start / build / test`를 사용합니다.
- 백엔드 API 주소는 프로젝트의 API 설정 파일(axios/http) 기준으로 맞춰주세요.


