export interface ChecklistItem {
  id: string;
  text: string;
  createdAt: number; // timestamp
  memo: string;
}

export interface Property {
  id: string;
  description: string; // The "parsed" or manual info
  rawInput: string;
  photos: string[]; // Base64 data URLs
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
export type TabState = 'BASIC' | 'MEETING' | 'GANTT';