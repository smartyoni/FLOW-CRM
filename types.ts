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

  // 상태 관리
  status?: '확인전' | '확인중' | '볼수있음' | '현장방문완료';  // 매물 상태
  visitTime?: string;         // 방문 시간 (HH:mm 형식)
}

export interface Meeting {
  id: string;
  round: number; // 1차, 2차...
  date: string; // ISO string for datetime-local
  properties: Property[];
  createdAt: number;
}

export type CustomerStage = '접수고객' | '연락대상' | '약속확정' | '미팅진행' | '미팅진행함';
export type CustomerCheckpoint = '계약진행' | '재미팅잡기' | '약속확정' | '미팅진행';

export interface Customer {
  id: string;
  name: string;
  contact: string;
  moveInDate: string;
  priceType: 'sale' | 'jeonse' | 'rent'; // Simple classification
  price: string; // 매매가 or 보증금
  rentPrice?: string; // 월세 (optional)
  memo: string;
  stage?: CustomerStage; // New field for customer journey stage
  checkpoint?: CustomerCheckpoint; // New field for detailed status checkpoint
  
  // Favorites
  isFavorite?: boolean;
  favoritedAt?: number; // Timestamp for sorting

  // Relations
  checklists: ChecklistItem[];
  meetings: Meeting[]; // Changed from meeting: MeetingInfo to meetings: Meeting[]
}

export type ViewState = 'LIST' | 'DETAIL';
export type TabState = 'BASIC' | 'MEETING' | 'GANTT' | 'REPORT';