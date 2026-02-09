export interface ChecklistItem {
  id: string;
  text: string;
  createdAt: number; // timestamp
  memo: string;
}

export interface Property {
  id: string;
  rawInput: string;           // 원본 입력 (TEN/네이버/정리본)
  roomName: string;           // 호실명/건물명
  jibun: string;              // 지번 주소
  agency: string;             // 부동산명
  agencyPhone: string;        // 부동산 연락처
  photos: string[];           // Base64 data URLs
  parsedText?: string;        // 정리본 텍스트 (선택사항)
  unit?: string;              // 호실 정보
  memo?: string;              // 매물 메모 (선택사항)

  // 상태 관리
  status?: '확인전' | '확인중' | '볼수있음' | '현장방문완료';  // 매물 상태
  visitTime?: string;         // 방문 시간 (HH:mm 형식)
}

export interface Meeting {
  id: string;
  round: number; // 1차, 2차...
  date: string; // ISO string for datetime-local
  properties: Property[];
  meetingHistory: ChecklistItem[]; // 미팅 진행 체크리스트
  createdAt: number;
}

export type CustomerStage = '접수고객' | '연락대상' | '약속확정' | '미팅진행' | '미팅진행함';
export type CustomerCheckpoint = '은행방문중' | '재미팅잡기' | '약속확정' | '미팅진행';
export type CustomerContractStatus = '계약서작성예정' | '잔금예정' | '잔금일' | '입주완료';

export interface Customer {
  id: string;
  name: string;
  contact: string;
  moveInDate: string;
  priceType: 'sale' | 'jeonse' | 'rent'; // Simple classification
  price: string; // 매매가 or 보증금
  rentPrice?: string; // 월세 (optional)
  memo: string;
  registrationDate?: string; // 접수일 (optional)
  stage?: CustomerStage; // New field for customer journey stage
  checkpoint?: CustomerCheckpoint; // New field for detailed status checkpoint
  contractStatus?: CustomerContractStatus; // New field for contract status (계약진행, 잔금대기, 계약완료)
  contractDate?: string; // 계약서작성일 (optional)
  contractUnitName?: string; // 계약호실명 (optional)
  contractPrice?: string; // 매매가/보증금 (optional)
  contractMonthlyRent?: string; // 월차임 (optional)
  contractPeriod?: string; // 계약기간 (optional)
  paymentDate?: string; // 잔금일 (optional)
  enterExitSchedule?: string; // 입퇴실일정 (optional)
  depositReturnAccount?: string; // 보증금반환계좌번호 (optional)
  paymentAccount?: string; // 잔금입금계좌번호 (optional)
  managementFeeSettlementDate?: string; // 관리비정산 요청일 (optional)

  // Favorites
  isFavorite?: boolean;
  favoritedAt?: number; // Timestamp for sorting

  // Relations
  checklists: ChecklistItem[];
  meetings: Meeting[]; // Changed from meeting: MeetingInfo to meetings: Meeting[]
  contractHistory: ChecklistItem[]; // 계약 진행 히스토리
  paymentHistory?: ChecklistItem[]; // 잔금 진행 히스토리
}

export type ViewState = 'LIST' | 'DETAIL';
export type TabState = 'BASIC' | 'MEETING' | 'GANTT' | 'CONTRACT' | 'PAYMENT' | 'REPORT';

// 클립보드 하위 항목
export interface ClipboardItem {
  id: string;
  title: string;          // 제목 (리스트에 표시)
  content: string;        // 내용 (70vh 모달에서 편집)
  createdAt: number;
}

// 클립보드 카테고리
export interface ClipboardCategory {
  id: string;
  title: string;          // 카테고리명
  isExpanded: boolean;    // 펼침/접힘 (초기값 false)
  items: ClipboardItem[]; // 하위 항목 배열
  createdAt: number;
}

export interface AppSettings {
  contractClipboard: ClipboardCategory[];
  paymentClipboard: ClipboardCategory[];
  updatedAt?: number;
  createdAt?: number;
}