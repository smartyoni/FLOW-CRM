import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Customer, ChecklistItem, CustomerStage, CustomerCheckpoint, CustomerContractStatus, Property, Meeting } from '../types';
import { generateId } from '../services/storage';
import { formatPhoneNumber, generateSmsLink, isValidPhoneNumber } from '../utils/phoneUtils';
import { useAppContext } from '../contexts/AppContext';
import {
  parsePropertyDetailsByPlatform,
  generateStructuredPropertyInfoByPlatform
} from '../utils/textParser';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

const STAGES: CustomerStage[] = ['접수고객', '연락대상', '약속확정', '미팅진행'];
const CHECKPOINTS: CustomerCheckpoint[] = ['은행방문중', '재미팅잡기', '약속확정', '미팅진행'];
const CONTRACT_STATUSES: CustomerContractStatus[] = ['계약서작성예정', '잔금예정', '잔금일', '입주완료'];

export const TabBasicInfo: React.FC<Props> = ({ customer, onUpdate }) => {
  const { showConfirm, openSmsTemplateModal, getSmsTemplateText } = useAppContext();
  const [newChecklistText, setNewChecklistText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Inline Edit State
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Memo Modal State
  const [memoModalItem, setMemoModalItem] = useState<ChecklistItem | null>(null);
  const [memoModalMode, setMemoModalMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [memoText, setMemoText] = useState('');

  // 모바일 탭 상태
  const [mobileBasicInfoTab, setMobileBasicInfoTab] = useState<'INFO' | 'HISTORY' | 'MEETING'>('INFO');
  const basicInfoAreaRef = useRef<HTMLDivElement>(null);
  const historyAreaRef = useRef<HTMLDivElement>(null);
  const meetingAreaRef = useRef<HTMLDivElement>(null);

  // 미팅 관련 상태 (TabMeeting에서 가져옴)
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [draftProperties, setDraftProperties] = useState<{ id: string, text: string }[]>([]);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [localMeeting, setLocalMeeting] = useState<Meeting | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoTextMeeting, setMemoTextMeeting] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'ROUND' | 'PROPERTY';
    id: string;
    round?: number;
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [editingFieldMeeting, setEditingFieldMeeting] = useState<string | null>(null);
  const [editingFieldValueMeeting, setEditingFieldValueMeeting] = useState('');
  const [showRegisteredOnly, setShowRegisteredOnly] = useState(false);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [reportFileName, setReportFileName] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMemos, setReportMemos] = useState<{ [propId: string]: string }>({});
  const [reportProperties, setReportProperties] = useState<Property[]>([]);
  const [editingPropertyIdx, setEditingPropertyIdx] = useState<number | null>(null);
  const [editingPropertyText, setEditingPropertyText] = useState('');
  const [isTOCModalOpen, setIsTOCModalOpen] = useState(false);
  const [tocModalPos, setTocModalPos] = useState<{ top: number, left: number } | null>(null);
  const tocButtonRef = useRef<HTMLButtonElement>(null);

  const lastTouchRef = useRef<{ time: number; target: string }>({ time: 0, target: '' });

  // ⭐ 로컬 고객 상태 (즉시 미리보기를 위함)
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);

  // ⭐ Props 고객과 로컬 상태 동기화 및 미팅 초기화
  useEffect(() => {
    setLocalCustomer(customer);

    // 미팅 초기화 로직
    if (customer.meetings && customer.meetings.length > 0 && activeMeetingId === null) {
      setActiveMeetingId(customer.meetings[customer.meetings.length - 1].id);
    }
  }, [customer.id]);

  // 탭 전환 시 스크롤 리셋
  useEffect(() => {
    if (basicInfoAreaRef.current && mobileBasicInfoTab === 'INFO') {
      basicInfoAreaRef.current.scrollTop = 0;
    }
    if (historyAreaRef.current && mobileBasicInfoTab === 'HISTORY') {
      historyAreaRef.current.scrollTop = 0;
    }
    if (meetingAreaRef.current && mobileBasicInfoTab === 'MEETING') {
      meetingAreaRef.current.scrollTop = 0;
    }
  }, [mobileBasicInfoTab]);

  // Props에서 받은 활성 미팅 동기화
  const propsActiveMeeting = customer.meetings?.find(m => m.id === activeMeetingId);
  useEffect(() => {
    if (propsActiveMeeting) {
      setLocalMeeting(propsActiveMeeting);
    }
  }, [propsActiveMeeting?.id]);

  // ⭐ 렌더링할 때는 로컬 상태 우선 사용
  const activeCustomer = localCustomer || customer;

  // 전화번호를 찾아 클릭 가능한 SMS 링크로 변환하는 헬퍼 함수
  const linkifyPhoneNumbers = (text: string) => {
    if (!text) return text;
    // 휴대폰(010), 지역번호 포함 유선번호 감지 정규식
    const phoneRegex = /(01[016789]-?\d{3,4}-?\d{4}|0[2-6]\d-?\d{3,4}-?\d{4})/g;
    const parts = text.split(phoneRegex);

    return parts.map((part, i) => {
      if (i % 2 === 1) { // 정규식 매칭된 부분
        const digits = part.replace(/\D/g, '');
        return (
          <a
            key={i}
            href={`sms:${digits}`}
            className="text-blue-600 hover:text-blue-800 hover:underline font-extrabold px-0.5 rounded transition-all active:scale-95 inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Inline Edit Handlers
  const startInlineEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditingValue(value);
  };

  const saveInlineEdit = (field: string) => {
    const updates: Partial<Customer> = { [field]: editingValue };
    if (field === 'rentPrice') {
      updates.priceType = editingValue ? 'rent' : 'sale';
    }

    const updatedCustomer = { ...activeCustomer, ...updates } as Customer;
    setLocalCustomer(updatedCustomer);
    onUpdate(updatedCustomer);
    setEditingField(null);
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedCustomer = {
      ...activeCustomer,
      stage: e.target.value as CustomerStage,
      checkpoint: undefined, // 다른 드롭다운 초기화
      contractStatus: undefined // 다른 드롭다운 초기화
    };
    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  const handleCheckpointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCheckpoint = e.target.value as CustomerCheckpoint;
    const updates: Partial<Customer> = {
      checkpoint: newCheckpoint,
      contractStatus: undefined // 다른 드롭다운 초기화
    };

    // Automatically set stage to '미팅진행함' if a checkpoint is selected
    if (newCheckpoint) {
      updates.stage = '미팅진행함';
    }

    const updatedCustomer = { ...activeCustomer, ...updates };
    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  const handleContractStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newContractStatus = e.target.value as CustomerContractStatus;
    const updates: Partial<Customer> = {
      contractStatus: newContractStatus,
      checkpoint: undefined, // 다른 드롭다운 초기화
      stage: '미팅진행함' // stage도 함께 설정
    };

    const updatedCustomer = { ...activeCustomer, ...updates };
    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  // Add Checklist
  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      text: newChecklistText,
      createdAt: Date.now(),
      memo: ''
    };

    const updatedCustomer = {
      ...activeCustomer,
      checklists: [newItem, ...activeCustomer.checklists]
    };

    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);

    setNewChecklistText('');
  };

  // Delete Checklist
  const handleDeleteChecklist = async (id: string) => {
    const confirmed = await showConfirm('삭제', '삭제하시겠습니까?');
    if (!confirmed) return;

    const updatedCustomer = {
      ...activeCustomer,
      checklists: activeCustomer.checklists.filter(item => item.id !== id)
    };

    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  // Start Inline Edit
  const startEditing = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  // Save Inline Edit
  const saveEditing = () => {
    if (editingItemId) {
      const updatedCustomer = {
        ...activeCustomer,
        checklists: activeCustomer.checklists.map(item =>
          item.id === editingItemId ? { ...item, text: editingText } : item
        )
      };

      // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
      setLocalCustomer(updatedCustomer);
      // ⭐ 2. Firebase에 저장 (백그라운드)
      onUpdate(updatedCustomer);

      setEditingItemId(null);
    }
  };

  // Open Memo
  const openMemo = (item: ChecklistItem) => {
    setMemoModalItem(item);
    setMemoText(item.memo);
    setMemoModalMode(item.memo ? 'VIEW' : 'EDIT');
  };

  // Save Memo
  const saveMemo = () => {
    if (memoModalItem) {
      const updatedCustomer = {
        ...activeCustomer,
        checklists: activeCustomer.checklists.map(item =>
          item.id === memoModalItem.id ? { ...item, memo: memoText } : item
        )
      };

      setLocalCustomer(updatedCustomer);
      onUpdate(updatedCustomer);
      setMemoModalMode('VIEW');
    }
  };

  // --- Meeting Handlers (TabMeeting에서 가져옴) ---

  const handleTouchDoubleTap = (targetId: string, callback: () => void) => {
    const now = Date.now();
    const lastTouch = lastTouchRef.current;
    if (lastTouch.target === targetId && now - lastTouch.time < 300) {
      callback();
      lastTouchRef.current = { time: 0, target: '' };
    } else {
      lastTouchRef.current = { time: now, target: targetId };
    }
  };


  const handleDeleteClick = (e: React.MouseEvent, type: 'ROUND' | 'PROPERTY', id: string, round?: number) => {
    e.stopPropagation();
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      setDeleteConfirm({
        type,
        id,
        round,
        message: `미팅 정보와 해당 미팅의 모든 매물 정보를 삭제하시겠습니까?`,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }
      });
    } catch (err) {
      console.error('삭제 버튼 위치 계산 오류:', err);
      // Fallback: 위치 없이 가운데 띄우기 (또는 기본값)
      setDeleteConfirm({
        type,
        id,
        round,
        message: `미팅 정보와 해당 미팅의 모든 매물 정보를 삭제하시겠습니까?`,
        rect: { top: 200, left: 200, width: 0, height: 0 }
      });
    }
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'ROUND') {
      const updatedMeetings = (activeCustomer.meetings || []).filter(m => m.id !== deleteConfirm.id);
      
      const updatedCustomer = { ...activeCustomer, meetings: updatedMeetings };
      setLocalCustomer(updatedCustomer);
      onUpdate(updatedCustomer);
      
      if (activeMeetingId === deleteConfirm.id) {
        const newActiveMeetingId = updatedMeetings.length > 0 ? updatedMeetings[updatedMeetings.length - 1].id : null;
        setActiveMeetingId(newActiveMeetingId);
        setLocalMeeting(updatedMeetings.find(m => m.id === newActiveMeetingId) || null);
      }
    } else if (deleteConfirm.type === 'PROPERTY') {
      const activeM = (localMeeting || propsActiveMeeting);
      if (activeM) {
        const updatedProperties = activeM.properties.filter(p => p.id !== deleteConfirm.id);
        const updatedLocalMeeting = { ...activeM, properties: updatedProperties };
        
        const updatedCustomer = {
          ...activeCustomer,
          meetings: activeCustomer.meetings.map(m =>
            m.id === activeM.id ? updatedLocalMeeting : m
          )
        };
        
        setLocalMeeting(updatedLocalMeeting);
        setLocalCustomer(updatedCustomer);
        onUpdate(updatedCustomer);
      }
    }
    setDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const activeM = (localMeeting || propsActiveMeeting);
    
    if (!activeM) {
      // 미팅이 없는 경우 첫 번째 미팅 자동 생성
      const newMeeting: Meeting = {
        id: Date.now().toString(),
        round: 1,
        date: new Date().toISOString().substring(0, 16),
        properties: [],
        meetingHistory: [],
        createdAt: Date.now()
      };
      setLocalMeeting(newMeeting);
      setActiveMeetingId(newMeeting.id);
      const updatedCustomer = {
        ...activeCustomer,
        meetings: [newMeeting]
      };
      setLocalCustomer(updatedCustomer);
      onUpdate(updatedCustomer);
      return;
    }

    const updatedLocalMeeting = { ...activeM, date: newDate };
    const updatedCustomer = {
      ...activeCustomer,
      meetings: activeCustomer.meetings.map(m =>
        m.id === activeM.id ? updatedLocalMeeting : m
      )
    };

    setLocalMeeting(updatedLocalMeeting);
    setLocalCustomer(updatedCustomer);
    onUpdate(updatedCustomer);
  };

  const handleAddNewDraft = () => {
    setDraftProperties(prev => [...prev, { id: generateId(), text: '' }]);
  };

  const handleUpdateDraft = (id: string, text: string) => {
    setDraftProperties(prev => prev.map(d => d.id === id ? { ...d, text } : d));
  };

  const handleCancelDraft = (id: string) => {
    setDraftProperties(prev => prev.filter(d => d.id !== id));
  };

  const handleSaveDraft = async (draftId: string) => {
    const draft = draftProperties.find(d => d.id === draftId);
    if (!draft || !draft.text.trim()) return;
    
    let activeM = (localMeeting || propsActiveMeeting);
    let updatedCustomer = { ...activeCustomer };
    
    if (!activeM) {
      activeM = {
        id: generateId(),
        round: 1,
        date: '',
        properties: [],
        meetingHistory: [],
        createdAt: Date.now()
      };
      updatedCustomer.meetings = [activeM];
      setLocalMeeting(activeM);
      setActiveMeetingId(activeM.id);
    }

    const newProperty: Property = {
      id: generateId(),
      rawInput: draft.text,
      agency: '',
      agencyPhone: '',
      jibun: '',
      parsedText: draft.text
    };
    
    const updatedProperties = [...activeM.properties, newProperty];
    const updatedLocalMeeting = { ...activeM, properties: updatedProperties };
    
    updatedCustomer.meetings = updatedCustomer.meetings.map(m => 
      m.id === activeM.id ? updatedLocalMeeting : m
    );

    setLocalMeeting(updatedLocalMeeting);
    setLocalCustomer(updatedCustomer);
    onUpdate(updatedCustomer);

    // 저장 성공 시 해당 드래프트 제거
    setDraftProperties(prev => prev.filter(d => d.id !== draftId));
  };

  const updatePropertyField = (propId: string, field: keyof Property, value: string) => {
    const activeMeeting = (localMeeting || propsActiveMeeting);
    if (!activeMeeting) return;
    const updatedProperties = activeMeeting.properties.map(p =>
      p.id === propId ? { ...p, [field]: value } : p
    );
    const updatedLocalMeeting = { ...activeMeeting, properties: updatedProperties };
    const updatedCustomer = {
      ...activeCustomer,
      meetings: activeCustomer.meetings.map(m =>
        m.id === activeMeeting.id ? updatedLocalMeeting : m
      )
    };
    setLocalMeeting(updatedLocalMeeting);
    setLocalCustomer(updatedCustomer);
    onUpdate(updatedCustomer);
  };

  const savePropertyInlineField = (propId: string, fieldName: 'roomName' | 'jibun' | 'agency' | 'agencyPhone' | 'parsedText') => {
    updatePropertyField(propId, fieldName, editingFieldValueMeeting);
    setEditingFieldMeeting(null);
    setEditingFieldValueMeeting('');
  };



  const saveMemoMeeting = (propId: string) => {
    const activeMeeting = (localMeeting || propsActiveMeeting);
    if (!activeMeeting) return;
    const updatedProperties = activeMeeting.properties.map(p =>
      p.id === propId ? { ...p, memo: memoTextMeeting } : p
    );
    const updatedLocalMeeting = { ...activeMeeting, properties: updatedProperties };
    setLocalMeeting(updatedLocalMeeting);
    const updatedCustomer = {
      ...activeCustomer,
      meetings: activeCustomer.meetings.map(m => m.id === activeMeeting.id ? updatedLocalMeeting : m)
    };
    setLocalCustomer(updatedCustomer);
    onUpdate(updatedCustomer);
    setEditingMemoId(null);
    setMemoTextMeeting('');
  };

  const generateReportPreview = async () => {
    const activeMeeting = (localMeeting || propsActiveMeeting);
    const defaultFileName = activeMeeting ? 
      (activeMeeting.properties.length > 0 ? `미팅 제안서` : '검색결과') : '제안서';
    setReportLoading(true);
    try {
      const sortedProperties = [...activeMeeting.properties].sort((a, b) => (a.visitTime || '99:99').localeCompare(b.visitTime || '99:99'));
      setReportProperties(sortedProperties);
      const initialMemos: { [propId: string]: string } = {};
      for (const prop of sortedProperties) initialMemos[prop.id] = prop.memo || '';
      setReportMemos(initialMemos);
      setReportFileName(`${customer.name}_매물보고서`);
      setReportPreviewOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  const finalizeReportPDF = async () => {
    if (reportProperties.length === 0 || !reportFileName) return;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const PAGE_WIDTH = 210;
      const PADDING = 10;
      const MARGIN_BETWEEN = 5;
      let currentY = PADDING;

      for (let i = 0; i < reportProperties.length; i++) {
        const prop = reportProperties[i];
        const memo = reportMemos[prop.id];
        const pageContainer = document.createElement('div');
        pageContainer.style.width = '210mm';
        pageContainer.style.padding = '10mm';
        pageContainer.style.backgroundColor = 'white';
        pageContainer.style.fontFamily = 'Arial, sans-serif';
        pageContainer.style.position = 'absolute';
        pageContainer.style.left = '-9999px';
        pageContainer.innerHTML = `
          <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-weight: 600; margin-bottom: 16px; color: #000;">${prop.parsedText || ''}</div>
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">메모</h3>
            <div style="font-size: 11px; line-height: 1.6; white-space: pre-wrap; background: ${memo ? '#fff8f0' : '#f9f9f9'}; padding: 8px; border-radius: 4px; border: 1px solid ${memo ? '#ffe0cc' : '#e0e0e0'}; color: ${memo ? '#333' : '#999'};">
              ${memo || '(메모 없음)'}
            </div>
          </div>
        `;
        document.body.appendChild(pageContainer);
        const canvas = await html2canvas(pageContainer, { scale: 2, useCORS: true });
        document.body.removeChild(pageContainer);

        const imgWidth = PAGE_WIDTH - (PADDING * 2);
        const imgHeight = (canvas.height / canvas.width) * imgWidth;

        if (currentY + imgHeight > 280 && i > 0) {
          pdf.addPage();
          currentY = PADDING;
        }

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', PADDING, currentY, imgWidth, imgHeight);
        currentY += imgHeight + MARGIN_BETWEEN;
      }
      pdf.save(`${reportFileName}.pdf`);
      setReportPreviewOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportMemoChange = (idx: number, newMemo: string) => {
    const propId = reportProperties[idx].id;
    setReportMemos(prev => ({ ...prev, [propId]: newMemo }));
  };

  const activeMeeting = (localMeeting || propsActiveMeeting) ? {
    ...(localMeeting || propsActiveMeeting),
    meetingHistory: (localMeeting || propsActiveMeeting)?.meetingHistory || []
  } : null;

  const renderPropertyList = () => (
    <div className="space-y-3">
      {activeMeeting && activeMeeting.properties
        .filter(prop => showRegisteredOnly ? (prop.status !== '현장방문완료' && prop.status !== '오늘못봄') : true)
        .slice()
        .sort((a, b) => {
          const timeA = a.visitTime || '99:99';
          const timeB = b.visitTime || '99:99';
          return timeA.localeCompare(timeB);
        })
        .map((prop) => (
          <div key={prop.id} className="p-4 bg-gray-50 border border-black rounded-lg">
            {/* 시간 선택 및 상태 필터 */}
            <div className="flex gap-1 md:gap-3 mb-4 items-center">
              <div className="flex gap-1 md:gap-2 items-center">
                <span className="text-xs text-gray-600 font-bold whitespace-nowrap hidden sm:inline">방문시간:</span>
                <select
                  value={prop.visitTime ? prop.visitTime.split(':')[0] : ''}
                  onChange={(e) => {
                    const hour = e.target.value || '00';
                    const minute = prop.visitTime ? prop.visitTime.split(':')[1] : '00';
                    updatePropertyField(prop.id, 'visitTime', `${hour}:${minute}`);
                  }}
                  className="w-12 sm:w-16 px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">시</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={prop.visitTime ? prop.visitTime.split(':')[1] : ''}
                  onChange={(e) => {
                    const hour = prop.visitTime ? prop.visitTime.split(':')[0] : '00';
                    const minute = e.target.value || '00';
                    updatePropertyField(prop.id, 'visitTime', `${hour}:${minute}`);
                  }}
                  className="w-12 sm:w-16 px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">분</option>
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>

              <select
                value={prop.status || '확인전'}
                onChange={(e) => updatePropertyField(prop.id, 'status', e.target.value as any)}
                className="px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary font-bold"
              >
                <option value="확인전">확인전</option>
                <option value="확인중">확인중</option>
                <option value="볼수있음">볼수있음</option>
                <option value="현장방문완료">현장방문완료</option>
                <option value="오늘못봄">오늘못봄</option>
              </select>

              <div className="flex-1"></div>

              <button
                onClick={(e) => handleDeleteClick(e, 'PROPERTY', prop.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 font-bold whitespace-nowrap"
              >
                매물삭제
              </button>
            </div>

            {/* 정리본 텍스트 표시 */}
            {prop.parsedText && (
              <div className="mb-4">
                {editingFieldMeeting === `${prop.id}-parsedText` ? (
                  <textarea
                    autoFocus
                    className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-primary outline-none text-sm font-semibold"
                    value={editingFieldValueMeeting}
                    onChange={(e) => setEditingFieldValueMeeting(e.target.value)}
                    onBlur={() => savePropertyInlineField(prop.id, 'parsedText')}
                    rows={10}
                  />
                ) : (
                  <div
                    className="p-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => {
                      setEditingFieldMeeting(`${prop.id}-parsedText`);
                      setEditingFieldValueMeeting(prop.parsedText || '');
                    }}
                  >
                    <pre className="whitespace-pre-wrap text-gray-700 text-sm font-semibold leading-relaxed">
                      {linkifyPhoneNumbers(prop.parsedText)}
                    </pre>
                  </div>
                )}
              </div>
            )}

          </div>
        ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b-2 border-black bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          {/* Stage Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center bg-white rounded px-2 py-1 border border-gray-200 gap-1">
            <span className="text-gray-500 text-xs font-bold md:mr-2">고객상태</span>
            <select
              value={activeCustomer.stage || ''}
              onChange={handleStageChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="">선택</option>
              {STAGES.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Checkpoint Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center bg-white rounded px-2 py-1 border border-gray-200 gap-1">
            <span className="text-gray-500 text-xs font-bold md:mr-2">진행단계</span>
            <select
              value={activeCustomer.checkpoint || ''}
              onChange={handleCheckpointChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-purple-600 outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="">선택</option>
              {CHECKPOINTS.map(cp => (
                <option key={cp} value={cp}>{cp}</option>
              ))}
            </select>
          </div>

          {/* Contract Status Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center bg-white rounded px-2 py-1 border border-gray-200 gap-1">
            <span className="text-gray-500 text-xs font-bold md:mr-2">계약~잔금</span>
            <select
              value={activeCustomer.contractStatus || ''}
              onChange={handleContractStatusChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-green-600 outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="">선택</option>
              {CONTRACT_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 모바일 탭 네비게이션 */}
      <div className="md:hidden bg-white border-b shrink-0 overflow-x-auto">
        <div className="flex p-2 gap-2">
          <button
            onClick={() => setMobileBasicInfoTab('INFO')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${mobileBasicInfoTab === 'INFO'
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            기본정보
          </button>
          <button
            onClick={() => setMobileBasicInfoTab('HISTORY')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${mobileBasicInfoTab === 'HISTORY'
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            히스토리
          </button>
          <button
            onClick={() => setMobileBasicInfoTab('MEETING')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${mobileBasicInfoTab === 'MEETING'
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            미팅매물
          </button>
        </div>
      </div>

      {/* Main Content - Responsive Layout (Stack on mobile, 2-col on desktop) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 bg-white">
        {/* Left Column: Basic Info + Memo + History */}
        <div
          ref={basicInfoAreaRef}
          className={`w-full md:w-1/2 min-h-0 overflow-y-auto md:pr-4 ${mobileBasicInfoTab === 'INFO' || mobileBasicInfoTab === 'HISTORY' ? 'flex-1 block' : 'hidden md:block'
            }`}
        >
          {/* Customer Info & Memo */}
          <div className={`${mobileBasicInfoTab === 'INFO' ? 'block' : 'hidden md:block'}`}>
            <div className="space-y-3 text-sm">
              {/* 고객명, 연락처, 입주일, 가격 등 기존 필드들 ... */}
              <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('name', activeCustomer.name)}>
                <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 고객명:</span>
                {editingField === 'name' ? (
                  <input autoFocus type="text" className="flex-1 border border-primary px-1 py-0.5 outline-none" value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => saveInlineEdit('name')} onKeyDown={e => e.key === 'Enter' && saveInlineEdit('name')} />
                ) : (
                  <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{activeCustomer.name}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('contact', activeCustomer.contact)}>
                <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 연락처:</span>
                {editingField === 'contact' ? (
                  <input autoFocus type="text" className="flex-1 border border-primary px-1 py-0.5 outline-none" value={editingValue} onChange={e => setEditingValue(formatPhoneNumber(e.target.value))} onBlur={() => saveInlineEdit('contact')} onKeyDown={e => e.key === 'Enter' && saveInlineEdit('contact')} />
                ) : (
                  <div className="flex items-center gap-2">
                    <a href={generateSmsLink(customer.contact, getSmsTemplateText('basic'))} className="text-blue-600 font-semibold hover:text-blue-800 hover:underline group-hover:bg-yellow-100">{activeCustomer.contact}</a>
                    <button onClick={() => openSmsTemplateModal('basic')} className="p-1 text-slate-400 hover:text-blue-500"><i className="fas fa-cog text-xs"></i></button>
                  </div>
                )}
              </div>

              {/* ... 다른 필드들 생략 ... */}
              <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('moveInDate', activeCustomer.moveInDate)}>
                <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 입주일:</span>
                {editingField === 'moveInDate' ? (
                  <input autoFocus type="date" className="flex-1 border border-primary px-1 py-0.5 outline-none text-xs" value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => saveInlineEdit('moveInDate')} onKeyDown={e => e.key === 'Enter' && saveInlineEdit('moveInDate')} />
                ) : (
                  <span className="text-gray-800 font-bold">{activeCustomer.moveInDate || '-'}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('price', activeCustomer.price)}>
                <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 매매/보증금:</span>
                {editingField === 'price' ? (
                  <input autoFocus type="text" className="flex-1 border border-primary px-1 py-0.5 outline-none" value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => saveInlineEdit('price')} onKeyDown={e => e.key === 'Enter' && saveInlineEdit('price')} />
                ) : (
                  <span className="text-gray-800 font-bold">{activeCustomer.price || '-'}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('rentPrice', activeCustomer.rentPrice)}>
                <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 월세:</span>
                {editingField === 'rentPrice' ? (
                  <input autoFocus type="text" className="flex-1 border border-primary px-1 py-0.5 outline-none" value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => saveInlineEdit('rentPrice')} onKeyDown={e => e.key === 'Enter' && saveInlineEdit('rentPrice')} />
                ) : (
                  <span className="text-gray-800 font-bold">{activeCustomer.rentPrice || '-'}</span>
                )}
              </div>

              {/* 메모 */}
              <div className="mt-4 group cursor-pointer" onDoubleClick={() => startInlineEdit('memo', activeCustomer.memo)}>
                {editingField === 'memo' ? (
                  <textarea autoFocus rows={7} className="w-full border border-primary rounded px-2 py-1 outline-none resize-none" value={editingValue} onChange={e => setEditingValue(e.target.value)} onBlur={() => saveInlineEdit('memo')} />
                ) : (
                  <div className="bg-gray-50 p-2 rounded border-2 border-blue-500 text-xs text-gray-700 h-40 overflow-y-auto whitespace-pre-wrap">
                    {activeCustomer.memo || '-'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Section (Now in Left Column) */}
          <div
            ref={historyAreaRef}
            className={`mt-8 border-t-2 border-dashed border-gray-300 pt-6 ${mobileBasicInfoTab === 'HISTORY' ? 'block' : 'hidden md:block'}`}
          >
            <h3 className="font-bold text-gray-700 mb-3 flex items-center">
              <i className="fas fa-history mr-2 text-primary"></i>
              히스토리
            </h3>

            <form onSubmit={handleAddChecklist} className="flex gap-2 mb-4">
              <input
                type="text"
                className="flex-1 border-2 border-blue-500 rounded-md px-3 py-2 text-sm outline-none"
                placeholder="히스토리 입력..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
              />
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm font-bold">추가</button>
            </form>

            <div className="space-y-3">
              {activeCustomer.checklists.map((item, index) => (
                <div key={item.id}>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 mr-2 flex items-start gap-2" onDoubleClick={() => startEditing(item)}>
                        {editingItemId === item.id ? (
                          <input autoFocus className="w-full border-b-2 border-primary outline-none" value={editingText} onChange={(e) => setEditingText(e.target.value)} onBlur={saveEditing} onKeyDown={(e) => e.key === 'Enter' && saveEditing()} />
                        ) : (
                          <>
                            <i className="fas fa-circle text-[8px] text-blue-500 mt-1.5 flex-shrink-0"></i>
                            <span className="text-gray-800 font-medium text-xs">{item.text}</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openMemo(item)} className="text-gray-400 hover:text-blue-500"><i className="fas fa-sticky-note text-xs"></i></button>
                        <button onClick={() => handleDeleteChecklist(item.id)} className="text-gray-400 hover:text-red-500"><i className="fas fa-trash-alt text-xs"></i></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Meeting Practice */}
        <div
          ref={meetingAreaRef}
          className={`w-full md:w-1/2 min-h-0 flex flex-col border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-4 ${mobileBasicInfoTab === 'MEETING' ? 'flex-1' : 'hidden md:flex'
            }`}
        >

          {/* 미팅일시 선택 및 매물추가 (상시 노출) */}
          <div className="flex items-center gap-2 mb-2 shrink-0 pt-2">
            <input
              type="datetime-local"
              value={activeMeeting?.date || ''}
              onChange={handleDateChange}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
            />
            <button
              onClick={handleAddNewDraft}
              className="px-3 py-1.5 bg-primary text-white rounded hover:bg-blue-600 font-bold text-xs whitespace-nowrap"
            >
              매물추가
            </button>
            <button
              ref={tocButtonRef}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTocModalPos({ 
                  top: rect.bottom, 
                  left: rect.left - 320 // Modal width is 320px. Bottom-left of button (X=rect.left) matches top-right of modal.
                });
                setIsTOCModalOpen(true);
              }}
              className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 font-bold text-xs whitespace-nowrap flex items-center gap-1"
            >
              <i className="fas fa-list-ul"></i>
              목차
            </button>
          </div>

          {/* 다중 매물 등록 드래프트 리스트 */}
          {draftProperties.map((draft) => (
            <div key={draft.id} className="bg-white border-2 border-primary rounded-lg p-4 shadow-lg mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm text-primary">매물 등록</h3>
              </div>
              <textarea
                autoFocus
                className="w-full border-2 border-gray-200 p-2 rounded h-32 text-sm mb-3 focus:border-primary outline-none"
                placeholder="매물정보를 붙여넣으세요..."
                value={draft.text}
                onChange={(e) => handleUpdateDraft(draft.id, e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => handleCancelDraft(draft.id)} className="flex-1 py-2 bg-gray-400 text-white rounded font-bold text-sm">취소</button>
                <button onClick={() => handleSaveDraft(draft.id)} className="flex-1 py-2 bg-primary text-white rounded font-bold text-sm">저장</button>
              </div>
            </div>
          ))}

          {activeMeeting ? (
            <div className="flex-1 flex flex-col overflow-hidden">


              <div className="flex-1 overflow-y-auto pr-1">
                {renderPropertyList()}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center py-20">
              <i className="fas fa-handshake text-5xl mb-4 opacity-20"></i>
              <p className="font-bold">등록된 미팅이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {reportPreviewOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 transition-all">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 bg-orange-500 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <i className="fas fa-file-pdf text-xl"></i>
                <h4 className="font-bold text-lg">제안서 (PDF) 미리보기</h4>
              </div>
              <button 
                onClick={() => setReportPreviewOpen(false)}
                className="hover:bg-white/20 p-2 rounded-full transition-colors"
                title="닫기"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">파일 이름</label>
                <input 
                  type="text" 
                  className="w-full border-2 border-gray-100 rounded-lg px-4 py-2.5 text-sm font-bold focus:border-orange-500 outline-none transition-all shadow-sm" 
                  value={reportFileName} 
                  onChange={(e) => setReportFileName(e.target.value)} 
                />
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">포함될 매물 리스트</label>
                {reportProperties.map((prop, idx) => (
                  <div key={prop.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group/item">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter">PROPERTY #{idx + 1}</span>
                      <div className="text-[10px] text-gray-400 font-mono">ID: {prop.id.substring(0,6)}</div>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap font-bold text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3 leading-relaxed">
                      {(prop.parsedText || '').split('\n').slice(0, 3).join('\n')}...
                    </pre>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-2">담당자 의견 / 특이사항</label>
                      <textarea
                        className="w-full p-3 border-2 border-gray-100 rounded-lg text-sm h-24 focus:border-orange-500 outline-none transition-all resize-none shadow-inner"
                        placeholder="이 매물에 대한 담당자 브리핑을 입력하세요..."
                        value={reportMemos[prop.id] || ''}
                        onChange={(e) => handleReportMemoChange(idx, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-white border-t border-gray-100 flex gap-3 shrink-0">
              <button 
                onClick={() => setReportPreviewOpen(false)} 
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-[0.98]"
              >
                닫기
              </button>
              <button 
                onClick={finalizeReportPDF} 
                className="flex-[2] px-6 py-3 bg-orange-500 text-white rounded-xl font-black text-sm hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <i className="fas fa-download"></i>
                PDF 브리핑북 생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memo Modal */}
      {memoModalItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h4 className="font-bold">메모 관리</h4>
              <button onClick={() => setMemoModalItem(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4">
              {memoModalMode === 'VIEW' ? (
                <div className="h-44 overflow-y-auto whitespace-pre-wrap text-gray-700 border p-2 rounded bg-gray-50">
                  {memoText || <span className="text-gray-400 italic">메모가 없습니다.</span>}
                </div>
              ) : (
                <textarea
                  className="w-full h-44 border p-2 rounded resize-none focus:ring-1 focus:ring-primary outline-none"
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  placeholder="메모를 입력하세요..."
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
              {memoModalMode === 'VIEW' ? (
                <button
                  onClick={() => setMemoModalMode('EDIT')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  수정
                </button>
              ) : (
                <button
                  onClick={saveMemo}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  저장
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* TOC (Table of Contents) Modal */}
      {isTOCModalOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-transparent" onClick={() => setIsTOCModalOpen(false)} />
          <div 
            className="fixed z-[9999] bg-white rounded-xl w-[320px] shadow-2xl overflow-hidden flex flex-col border border-gray-200 animate-in fade-in zoom-in duration-200"
            style={{ 
              top: `${tocModalPos?.top || 0}px`, 
              left: `${tocModalPos?.left || 0}px`,
              maxHeight: 'calc(100vh - 100px)'
            }}
          >
            <div className="px-4 py-2 bg-gray-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <i className="fas fa-list-ul text-lg"></i>
                <h4 className="font-bold text-sm">매물 목차 (건물명 리스트)</h4>
              </div>
              <button onClick={() => setIsTOCModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] bg-gray-50/30">
              {localMeeting?.properties && localMeeting.properties.length > 0 ? (
                <div className="space-y-2">
                  {localMeeting.properties.map((prop, idx) => {
                    const lines = (prop.parsedText || '').split('\n');
                    const buildingLine = lines.find(line => line.trim().startsWith('건물명:'));
                    const buildingName = buildingLine ? buildingLine.replace('건물명:', '').trim() : '(건물명 정보 없음)';
                    
                    return (
                      <div key={prop.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm group hover:border-primary transition-colors">
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-[10px] shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-700 truncate">{buildingName}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <i className="fas fa-info-circle text-2xl mb-2 opacity-20"></i>
                  <p className="text-xs">등록된 매물이 없습니다.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setIsTOCModalOpen(false)}
                className="px-4 py-1.5 bg-gray-800 text-white rounded font-bold text-xs hover:bg-gray-900 transition-all active:scale-[0.98]"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      , document.body)}

      {/* Deletion Confirmation Popover */}
      {deleteConfirm && createPortal(
        <>
          <div className="fixed inset-0 z-[9998] bg-black/5" onClick={cancelDelete} />
          <div
            className="fixed bg-white border-2 border-red-500 rounded-lg shadow-2xl p-4 z-[9999] w-48 animate-in fade-in zoom-in duration-200"
            style={{
              top: `${deleteConfirm.rect.top - 100 > 0 ? deleteConfirm.rect.top - 100 : deleteConfirm.rect.top + (deleteConfirm.rect.height || 40)}px`,
              left: `${deleteConfirm.rect.left - 150 > 0 ? deleteConfirm.rect.left - 150 : deleteConfirm.rect.left - 100}px`
            }}
          >
            <div className="text-center">
              <p className="text-xs font-bold text-gray-800 mb-3">
                {deleteConfirm.type === 'ROUND' ? `미팅 정보를` : '해당 매물을'}
                <br />정말 삭제하시겠습니까?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={cancelDelete}
                  className="flex-1 py-1.5 px-2 bg-gray-100 text-gray-600 rounded text-[11px] font-bold hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-1.5 px-2 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700 shadow-md shadow-red-200"
                >
                  삭제
                </button>
              </div>
            </div>
            {/* Arrow */}
            <div 
              className={`absolute w-3 h-3 bg-white border-r-2 border-b-2 border-red-500 transform rotate-45 ${deleteConfirm.rect.top - 100 > 0 ? '-bottom-2' : '-top-2'}`}
              style={{ left: '50%', marginLeft: '-6px' }}
            />
          </div>
        </>
      , document.body)}
    </div>
  );
};