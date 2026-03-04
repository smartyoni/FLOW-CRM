# FLOW-CRM 아키텍처 가이드

## 프로젝트 구조

```
App.tsx                    ← 오케스트레이터 (조립만 수행, 로직 금지)
hooks/                     ← 비즈니스 로직 (Custom Hooks)
  useCustomerData.ts       ← 고객 데이터 구독 + CRUD
components/
  layout/                  ← 레이아웃 셸
    MainLayout.tsx
    MobileBottomTab.tsx
  views/                   ← 뷰 전환
    ContentSwitcher.tsx
  common/                  ← 공통 재사용 컴포넌트
  (기타 도메인 컴포넌트)
contexts/                  ← 전역 상태 (Context API)
services/                  ← 외부 서비스 연결 (Firebase 등)
types.ts                   ← 공유 타입 정의
```

## 핵심 원칙

### 1. App.tsx 보호
- App.tsx에 직접 비즈니스 로직 추가 금지
- 새 기능은 반드시 별도 Hook/Component로 작성 후 App.tsx에서 조립
- App.tsx 수정이 필요하면: Hook 추가 → ContentSwitcher case 추가 → overlays에 모달 추가

### 2. 계층 구조 (위→아래 단방향만 허용)
```
UI (components/) → Logic (hooks/) → Data (services/) → Firebase
```
- 컴포넌트가 직접 Firestore를 호출하면 안 됨
- 반드시 Hook 또는 Service를 통해 접근

### 3. 파일 크기 규칙
- 100줄 이하: 이상적
- 200줄 이하: 허용
- 300줄 초과: 반드시 분리 검토

### 4. 새 뷰(탭) 추가 절차
1. `components/` 하위에 새 뷰 컴포넌트 생성
2. `types.ts`의 `ViewMode`에 새 값 추가
3. `ContentSwitcher.tsx`에 `case` 추가
4. `MobileBottomTab.tsx`에 탭 버튼 추가
5. App.tsx는 수정하지 않음

### 5. 새 데이터 로직 추가 절차
1. `services/firestore.ts`에 Firestore 함수 추가
2. `hooks/useCustomerData.ts`에서 import하여 사용
3. 훅이 300줄을 초과하면 `useCustomerCrud.ts`, `useCustomerSubscription.ts` 등으로 분리

## 코딩 컨벤션

- **언어**: TypeScript 필수, `any` 타입 사용 금지
- **주석**: 한국어로 작성
- **네이밍**: 컴포넌트는 PascalCase, 훅은 use- prefix, 서비스 함수는 camelCase
- **상태 관리**: 로컬 상태는 useState, 전역 공유는 Context API
- **Optimistic Update**: CRUD 시 UI를 먼저 업데이트한 뒤 Firestore에 반영
- **에러 처리**: try-catch로 감싸고, 실패 시 Optimistic Update 롤백

## 컴포넌트 사용 지침

### 확인 모달 (Confirmation)
- 삭제, 저장, 취소 등 사용자 확인이 필요한 모든 동작은 **앱 자체 모달**(`ConfirmModal` 또는 `AppContext.showConfirm`)을 사용한다
- `window.confirm()`, `window.alert()` 등 브라우저 기본 다이얼로그 사용 금지

### 입력 모달
- URL 입력, 텍스트 입력 등은 **앱 자체 모달 컴포넌트**를 사용한다 (예: `UrlInputModal`)
- `window.prompt()` 사용 금지

### 디자인 및 타이포그래피
- **기본 폰트**: **Pretendard (프리텐다드)**를 기본으로 사용하며, 한글 가독성을 위해 `letter-spacing: -0.01em`을 권장한다.
- **색상 체계**:
    - Primary: `#2563eb` (Indigo Blue 계열)
    - 텍스트: 완전한 검정 대신 `#1e293b` (Slate 800) 사용 권장
    - 배경: 연한 그레이(`#f8fafc`) 배경과 흰색 카드의 조합 사용
- **UI 스타일**:
    - **둥근 모서리**: 모든 카드와 버튼은 `rounded-xl` (12px) 이상의 곡률을 기본으로 한다.
    - **그림자**: 강한 테두리 대신 부드러운 `shadow-sm` 또는 `shadow-md`를 사용하여 입체감을 부여한다.
    - **여백**: 컴포넌트 간 충분한 여백(공간)을 두어 정보의 밀집도를 낮춘다.

### 레이아웃 및 UX 원칙
- **전체 브라우저 사용**: 앱은 항상 브라우저의 전체 너비와 높이를 사용하며, 페이지 전체 스크롤이 아닌 내부 컴포넌트별 스크롤을 권장한다 (`h-full`, `w-full` 기반 레이아웃).
- **모바일 우선**: 모든 핵심 기능은 모바일 환경에서 한 손으로 조작 가능해야 한다.
- **다크 모드 배려**: 현재 스타일가이드 계열이 다크 모드에서도 가독성이 좋은지 항상 고려한다.

## 업무 수행 지침 (Operational Principles)

### 1. 엄격한 범위 준수 (Strict Scope)
- 요청받은 작업만 수행한다. 추가적인 UI 개선, 리팩토링, 기능 확장은 사용자가 명시적으로 요청하기 전에는 절대 먼저 수행하지 않는다.
- "확인해줘", "체크해줘"라는 요청에는 확인 결과(확인되었는지여부)만 보고하며, 이 과정에서 코드를 수정하거나 기능을 덧붙이지 않는다.

### 2. 제안 및 승인 절차
- 도움이 될 것 같은 추가 작업이 있다면, 코드를 수정하기 전에 반드시 먼저 질문을 통해 의사를 묻고 승인을 얻는다. (예: "수정 중 배지를 추가하면 더 좋을 것 같은데 진행할까요?")

### 3. 브라우저 시뮬레이션 지양
- "확인해줘", "체크해줘" 등의 요청 시 우선적으로 **코드 분석**을 통해 빠르게 응답한다.
- 시간이 오래 걸리는 브라우저 시뮬레이션(브라우저 도구 사용)은 시각적 확인이 반드시 필요한 경우나 사용자가 명시적으로 요청한 경우에만 제한적으로 사용한다.

## 배포

- GitHub Pages로 배포 (`npm run deploy`)
- 배포 전 `npx tsc --noEmit`으로 타입 체크 필수
