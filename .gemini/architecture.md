# 아키텍처 및 구조 가이드

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
