import React, { useState, useRef, useEffect } from 'react';
import { Customer, Property, Meeting, ChecklistItem } from '../types';
import { generateId } from '../services/firestore';
import {
  parsePropertyDetails,
  generateStructuredPropertyInfo,
  parsePropertyDetailsByPlatform,
  generateStructuredPropertyInfoByPlatform
} from '../utils/textParser';
import { isValidPhoneNumber, generateSmsLink } from '../utils/phoneUtils';
import { useAppContext } from '../contexts/AppContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

export const TabMeeting: React.FC<Props> = ({ customer, onUpdate }) => {
  const { showConfirm, openSmsTemplateModal, getSmsTemplateText } = useAppContext();
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [propertyText, setPropertyText] = useState('');
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // 자동 파싱된 필드들
  const [parsedRoomName, setParsedRoomName] = useState('');
  const [parsedJibun, setParsedJibun] = useState('');
  const [parsedAgency, setParsedAgency] = useState('');
  const [parsedAgencyPhone, setParsedAgencyPhone] = useState('');
  const [parsedText, setParsedText] = useState('');

  // 플랫폼 선택 (TEN 주거, TEN 상업용, 또는 NAVER)
  const [selectedPlatform, setSelectedPlatform] = useState<'TEN' | 'TEN_COMMERCIAL' | 'NAVER'>('TEN');


  // ⭐ 로컬 미팅 상태 (즉시 미리보기를 위함)
  const [localMeeting, setLocalMeeting] = useState<Meeting | null>(null);

  // 매물 메모 편집 상태
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');

  // 미팅 삭제 확인 모달 상태
  const [deleteMeetingConfirmation, setDeleteMeetingConfirmation] = useState<string | null>(null);

  // 미팅히스토리 상태 관리
  const [newHistoryText, setNewHistoryText] = useState('');
  const [editingHistoryItemId, setEditingHistoryItemId] = useState<string | null>(null);
  const [editingHistoryText, setEditingHistoryText] = useState('');
  const [historyMemoItem, setHistoryMemoItem] = useState<ChecklistItem | null>(null);
  const [historyMemoMode, setHistoryMemoMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [historyMemoText, setHistoryMemoText] = useState('');

  // 인라인 필드 편집 상태 (형식: "propId-fieldName")
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');

  // 볼 수 있는 매물 필터 상태
  const [showRegisteredOnly, setShowRegisteredOnly] = useState(false);

  // 보고서 프리뷰 모달 상태
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [reportFileName, setReportFileName] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // 보고서 미리보기 메모 편집 상태
  const [reportMemos, setReportMemos] = useState<{ [propId: string]: string }>({});
  const [reportProperties, setReportProperties] = useState<Property[]>([]);
  const [editingPropertyIdx, setEditingPropertyIdx] = useState<number | null>(null);
  const [editingPropertyText, setEditingPropertyText] = useState('');

  // 모바일 탭 상태
  const [mobileMeetingTab, setMobileMeetingTab] = useState<'WORK' | 'HISTORY'>('WORK');
  const workAreaRef = useRef<HTMLDivElement>(null);
  const historyAreaRef = useRef<HTMLDivElement>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const propertyRefsMap = useRef<{ [key: string]: HTMLDivElement }>({});

  // 터치 기반 더블탭 감지
  const lastTouchRef = useRef<{ time: number; target: string }>({ time: 0, target: '' });

  // Initialize active meeting
  useEffect(() => {
    // Legacy support: if meetings is undefined (old data), init as empty
    if (!customer.meetings) {
      onUpdate({ ...customer, meetings: [] });
      return;
    }

    if (activeMeetingId === null && customer.meetings.length > 0) {
      // Select the latest meeting by default
      setActiveMeetingId(customer.meetings[customer.meetings.length - 1].id);
    }
  }, [customer.meetings]);

  // 탭 전환 시 스크롤 리셋
  useEffect(() => {
    if (workAreaRef.current && mobileMeetingTab === 'WORK') {
      workAreaRef.current.scrollTop = 0;
    }
    if (historyAreaRef.current && mobileMeetingTab === 'HISTORY') {
      historyAreaRef.current.scrollTop = 0;
    }
  }, [mobileMeetingTab]);

  // ⭐ Props에서 받은 activeMeeting과 로컬 상태 동기화
  const propsActiveMeeting = customer.meetings?.find(m => m.id === activeMeetingId);
  useEffect(() => {
    if (propsActiveMeeting) {
      setLocalMeeting(propsActiveMeeting);
    }
  }, [propsActiveMeeting?.id]);

  // ⭐ 미팅 히스토리 통합 마이그레이션 및 동기화
  // 기존 각 차수별로 흩어져 있던 히스토리를 고객 레벨의 통합 히스토리로 모읍니다.
  useEffect(() => {
    if (customer.meetings && customer.meetings.length > 0 && (!customer.meetingHistory || customer.meetingHistory.length === 0)) {
      const allHistories: ChecklistItem[] = [];
      const seenIds = new Set<string>();

      // 모든 차수의 히스토리를 수집 (중복 방지)
      customer.meetings.forEach(m => {
        if (m.meetingHistory) {
          m.meetingHistory.forEach(h => {
            if (!seenIds.has(h.id)) {
              allHistories.push(h);
              seenIds.add(h.id);
            }
          });
        }
      });

      if (allHistories.length > 0) {
        // 최신순 정렬
        allHistories.sort((a, b) => b.createdAt - a.createdAt);

        onUpdate({
          ...customer,
          meetingHistory: allHistories
        });
      }
    }
  }, [customer.id]); // 고객이 바뀔 때 한 번만 체크

  // ⭐ 렌더링할 때는 로컬 상태를 사용 (Firebase 저장 대기 없이 즉시 표시)
  const activeMeeting = (localMeeting || propsActiveMeeting) ? {
    ...(localMeeting || propsActiveMeeting),
    meetingHistory: (localMeeting || propsActiveMeeting)?.meetingHistory || []
  } : null;

  // 터치 기반 더블탭 감지 함수
  const handleTouchDoubleTap = (targetId: string, callback: () => void) => {
    const now = Date.now();
    const lastTouch = lastTouchRef.current;

    // 300ms 내에 같은 타겟을 다시 터치하면 더블탭으로 인식
    if (lastTouch.target === targetId && now - lastTouch.time < 300) {
      callback();
      lastTouchRef.current = { time: 0, target: '' }; // 리셋
    } else {
      lastTouchRef.current = { time: now, target: targetId };
    }
  };

  // --- Meeting Management ---

  const handleAddMeeting = () => {
    const nextRound = customer.meetings ? customer.meetings.length + 1 : 1;
    const newMeeting: Meeting = {
      id: generateId(),
      round: nextRound,
      date: '',
      properties: [],
      meetingHistory: [],
      createdAt: Date.now()
    };

    // ⭐ 1. 로컬 상태 먼저 설정 (즉시 UI 반영)
    setLocalMeeting(newMeeting);
    setActiveMeetingId(newMeeting.id);

    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate({
      ...customer,
      meetings: [...(customer.meetings || []), newMeeting]
    });
  };

  const handleDeleteMeeting = (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation();
    setDeleteMeetingConfirmation(meetingId);
  };

  const confirmDeleteMeeting = () => {
    if (!deleteMeetingConfirmation) return;

    const meetingId = deleteMeetingConfirmation;
    const updatedMeetings = customer.meetings.filter(m => m.id !== meetingId);
    // Re-calculate rounds
    const reorderedMeetings = updatedMeetings.map((m, index) => ({
      ...m,
      round: index + 1
    }));

    // ⭐ 1. 활성 미팅 ID 먼저 변경 (즉시 UI 반영)
    if (activeMeetingId === meetingId) {
      const newActiveMeetingId = reorderedMeetings.length > 0 ? reorderedMeetings[reorderedMeetings.length - 1].id : null;
      setActiveMeetingId(newActiveMeetingId);
      setLocalMeeting(reorderedMeetings.find(m => m.id === newActiveMeetingId) || null);
    }

    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate({
      ...customer,
      meetings: reorderedMeetings
    });

    setDeleteMeetingConfirmation(null);
  };

  const cancelDeleteMeeting = () => {
    setDeleteMeetingConfirmation(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeMeeting) return;
    const newDate = e.target.value;

    const updatedLocalMeeting = { ...activeMeeting, date: newDate };
    // 로컬 상태 먼저 업데이트 (즉시 입력창에 반영)
    setLocalMeeting(updatedLocalMeeting);

    // Firebase에 저장
    onUpdate({
      ...customer,
      meetings: customer.meetings.map(m =>
        m.id === activeMeeting.id ? updatedLocalMeeting : m
      )
    });
  };

  const updateMeeting = (meetingId: string, updates: Partial<Meeting>) => {
    // ⭐ activeMeeting(로컬 상태)를 기준으로 업데이트
    // localMeeting이 이미 업데이트되었으므로, 전체 meetings 배열을 올바르게 구성
    const updatedMeetings = (customer.meetings || []).map(m =>
      m.id === meetingId ? { ...m, ...updates } : m
    );

    onUpdate({
      ...customer,
      meetings: updatedMeetings
    });
  };

  // --- Meeting History Management ---

  const handleAddMeetingHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHistoryText.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      text: newHistoryText,
      createdAt: Date.now(),
      memo: ''
    };

    // ⭐ 고객 레벨의 통합 히스토리에 추가
    onUpdate({
      ...customer,
      meetingHistory: [newItem, ...(customer.meetingHistory || [])]
    });

    setNewHistoryText('');
  };

  const handleDeleteMeetingHistory = async (id: string) => {
    const confirmed = await showConfirm('삭제', '삭제하시겠습니까?');
    if (!confirmed) return;

    // ⭐ 고객 레벨의 통합 히스토리에서 삭제
    onUpdate({
      ...customer,
      meetingHistory: (customer.meetingHistory || []).filter(item => item.id !== id)
    });
  };

  const openHistoryMemo = (item: ChecklistItem) => {
    setHistoryMemoItem(item);
    setHistoryMemoText(item.memo);
    setHistoryMemoMode(item.memo ? 'VIEW' : 'EDIT');
  };

  const saveHistoryMemo = () => {
    if (!historyMemoItem) return;

    // ⭐ 고객 레벨의 통합 히스토리 메모 업데이트
    const updatedHistory = (customer.meetingHistory || []).map(item =>
      item.id === historyMemoItem.id ? { ...item, memo: historyMemoText } : item
    );

    onUpdate({
      ...customer,
      meetingHistory: updatedHistory
    });

    setHistoryMemoMode('VIEW');
  };

  // 미팅히스토리 인라인 편집
  const startEditingHistory = (item: ChecklistItem) => {
    setEditingHistoryItemId(item.id);
    setEditingHistoryText(item.text);
  };

  const saveEditingHistory = () => {
    if (!editingHistoryItemId) return;

    // ⭐ 고객 레벨의 통합 히스토리 텍스트 업데이트
    const updatedHistory = (customer.meetingHistory || []).map(item =>
      item.id === editingHistoryItemId ? { ...item, text: editingHistoryText } : item
    );

    onUpdate({
      ...customer,
      meetingHistory: updatedHistory
    });

    setEditingHistoryItemId(null);
  };

  // --- Property Management (within Active Meeting) ---

  const handleAddProperty = async () => {
    // propertyText 또는 parsedText 중 하나라도 있으면 등록 가능
    if ((!propertyText.trim() && !parsedText.trim()) || !activeMeeting) return;

    // 필수 필드 검증 (선택적)
    if (!parsedRoomName && !parsedJibun && !parsedAgency && !parsedAgencyPhone) {
      const confirmed = await showConfirm('매물 등록', '자동 파싱되지 않은 매물입니다. 그대로 등록하시겠습니까?');
      if (!confirmed) {
        return;
      }
    }

    let updatedProperties;

    if (editingPropertyId) {
      // 수정 모드: 기존 매물 업데이트
      updatedProperties = activeMeeting.properties.map(p =>
        p.id === editingPropertyId
          ? {
            ...p,
            // ⭐ rawInput: 원본 텍스트 (parsedText가 있으면 그걸 사용, 없으면 propertyText)
            rawInput: parsedText || propertyText,
            unit: parsedRoomName,
            jibun: parsedJibun,
            agency: parsedAgency,
            agencyPhone: parsedAgencyPhone,
            parsedText: parsedText || propertyText
          }
          : p
      );
    } else {
      // 신규 등록 모드: 새로운 매물 추가
      const newProperty: Property = {
        id: generateId(),
        // ⭐ rawInput: 원본 텍스트 (parsedText가 있으면 그걸 사용, 없으면 propertyText)
        rawInput: parsedText || propertyText,
        unit: parsedRoomName,
        jibun: parsedJibun,
        agency: parsedAgency,
        agencyPhone: parsedAgencyPhone,
        parsedText: parsedText || propertyText
      };

      updatedProperties = [...activeMeeting.properties, newProperty];
    }

    // ⭐ 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    const updatedLocalMeeting = {
      ...activeMeeting,
      properties: updatedProperties
    };
    setLocalMeeting(updatedLocalMeeting);

    // Firebase에 저장 (백그라운드)
    // 전체 고객 데이터와 함께 미팅 업데이트
    onUpdate({
      ...customer,
      meetings: customer.meetings.map(m =>
        m.id === activeMeeting.id ? updatedLocalMeeting : m
      )
    });

    // 상태 초기화
    setPropertyText('');
    setParsedRoomName('');
    setParsedJibun('');
    setParsedAgency('');
    setParsedAgencyPhone('');
    setParsedText('');
    setIsAddingProperty(false);
    setEditingPropertyId(null);
  };

  const handleDeleteProperty = async (propId: string) => {
    const confirmed = await showConfirm('삭제', '매물을 삭제하시겠습니까?');
    if (!confirmed || !activeMeeting) return;

    const updatedProperties = activeMeeting.properties.filter(p => p.id !== propId);

    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    const updatedLocalMeeting = {
      ...activeMeeting,
      properties: updatedProperties
    };
    setLocalMeeting(updatedLocalMeeting);

    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate({
      ...customer,
      meetings: customer.meetings.map(m =>
        m.id === activeMeeting.id ? updatedLocalMeeting : m
      )
    });
  };

  // 매물의 구조화된 필드를 업데이트합니다
  const updatePropertyField = (propId: string, field: keyof Property, value: string) => {
    if (!activeMeeting) return;

    const updatedProperties = activeMeeting.properties.map(p =>
      p.id === propId ? { ...p, [field]: value } : p
    );

    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    const updatedLocalMeeting = {
      ...activeMeeting,
      properties: updatedProperties
    };
    setLocalMeeting(updatedLocalMeeting);

    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate({
      ...customer,
      meetings: customer.meetings.map(m =>
        m.id === activeMeeting.id ? updatedLocalMeeting : m
      )
    });
  };

  // 인라인 필드 저장 (소재지, 지번, 부동산, 연락처, 정리본 텍스트)
  const savePropertyInlineField = (propId: string, fieldName: 'roomName' | 'jibun' | 'agency' | 'agencyPhone' | 'parsedText') => {
    updatePropertyField(propId, fieldName, editingFieldValue);
    setEditingField(null);
    setEditingFieldValue('');
  };

  // 매물정보를 자동으로 파싱합니다
  const handleAutoParse = () => {
    if (!propertyText.trim()) {
      alert('매물정보를 먼저 입력해주세요.');
      return;
    }

    try {
      // 1. 선택된 플랫폼으로 필드 추출
      const fields = parsePropertyDetailsByPlatform(propertyText, selectedPlatform);
      setParsedRoomName(fields.roomName);
      setParsedJibun(fields.jibun);
      setParsedAgency(fields.agency);
      setParsedAgencyPhone(fields.agencyPhone);

      // 2. 선택된 플랫폼 형식의 정리본 생성
      const structured = generateStructuredPropertyInfoByPlatform(propertyText, selectedPlatform);
      setParsedText(structured);
      // ⭐ 원본 텍스트는 비우고 생성된 정리본만 유지
      setPropertyText('');

      // 파싱 성공 여부 피드백
      const parsedCount = [fields.roomName, fields.jibun, fields.agency, fields.agencyPhone]
        .filter(f => f).length;

      const platformName = selectedPlatform === 'TEN' ? '텐(주거)' : selectedPlatform === 'TEN_COMMERCIAL' ? '텐(상업용)' : '네이버부동산';

      if (parsedCount === 0) {
        alert(`${platformName} 형식 파싱에 실패했습니다.\n입력 형식을 확인해주세요.`);
      } else if (parsedCount < 4) {
        alert(`${parsedCount}/4개 필드가 자동 입력되었습니다.\n비어있는 필드는 직접 입력해주세요.`);
      }
    } catch (error) {
      console.error('파싱 오류:', error);
      alert('매물정보 파싱 중 오류가 발생했습니다. 수동으로 입력해주세요.');
    }
  };



  // 매물 메모 저장
  const saveMemo = (propId: string) => {
    if (!activeMeeting) return;

    const updatedProperties = activeMeeting.properties.map(p =>
      p.id === propId ? { ...p, memo: memoText } : p
    );

    // ⭐ 로컬 상태 먼저 업데이트
    const updatedLocalMeeting = {
      ...activeMeeting,
      properties: updatedProperties
    };
    setLocalMeeting(updatedLocalMeeting);

    // Firebase에 저장
    onUpdate({
      ...customer,
      meetings: customer.meetings.map(m =>
        m.id === activeMeeting.id ? updatedLocalMeeting : m
      )
    });

    setEditingMemoId(null);
    setMemoText('');
  };

  // --- PDF Generation ---

  // 미리보기 이미지 생성
  const generateReportPreview = async () => {
    if (!activeMeeting || activeMeeting.properties.length === 0) {
      alert('등록된 매물이 없습니다.');
      return;
    }

    setReportLoading(true);
    try {
      // 시간순으로 정렬된 매물 처리
      const sortedProperties = [...activeMeeting.properties].sort((a, b) => {
        const timeA = a.visitTime || '99:99';
        const timeB = b.visitTime || '99:99';
        return timeA.localeCompare(timeB);
      });

      // reportProperties에 정렬된 매물 저장
      setReportProperties(sortedProperties);

      // reportMemos 초기화: 각 매물의 기존 메모를 reportMemos에 저장
      const initialMemos: { [propId: string]: string } = {};
      for (const prop of sortedProperties) {
        initialMemos[prop.id] = prop.memo || '';
      }
      setReportMemos(initialMemos);

      setReportFileName(`${customer.name}_${activeMeeting.round}차미팅_매물보고서`);
      setReportPreviewOpen(true);
    } catch (err) {
      console.error('미리보기 생성 오류:', err);
      alert('미리보기 생성 중 오류가 발생했습니다.');
    } finally {
      setReportLoading(false);
    }
  };

  // 최종 PDF 생성 및 다운로드
  const finalizeReportPDF = async () => {
    if (reportProperties.length === 0 || !reportFileName) {
      alert('파일명을 입력해주세요.');
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      // 상수 정의
      const PAGE_HEIGHT = 297;    // A4 세로 (mm)
      const PAGE_WIDTH = 210;     // A4 가로 (mm)
      const PADDING = 10;         // 페이지 패딩 (mm)
      const MARGIN_BETWEEN = 5;   // 매물 간 여백 (mm)
      const USABLE_HEIGHT = PAGE_HEIGHT - (PADDING * 2); // 277mm

      let currentY = PADDING; // 현재 페이지 내 Y 좌표

      // 각 매물을 연속으로 배치
      for (let i = 0; i < reportProperties.length; i++) {
        const prop = reportProperties[i];
        const memo = reportMemos[prop.id];

        // 매물정보 컨테이너 생성 (minHeight 제거하여 실제 내용 높이만 사용)
        const pageContainer = document.createElement('div');
        pageContainer.style.width = '210mm';
        pageContainer.style.padding = '10mm';
        pageContainer.style.backgroundColor = 'white';
        pageContainer.style.fontFamily = 'Arial, sans-serif';
        pageContainer.style.fontSize = '12px';
        pageContainer.style.color = '#333';
        pageContainer.style.position = 'absolute';
        pageContainer.style.left = '-9999px';
        pageContainer.style.top = '-9999px';
        pageContainer.style.boxSizing = 'border-box';

        let html = '';

        // 1. 매물정보
        if (prop.parsedText) {
          html += `<div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif; margin: 0 0 16px 0; color: #000; font-weight: 600;">${prop.parsedText}</div>`;
        }

        // 2. 메모 (메모가 없어도 필드 표시)
        html += '<div style="margin: 0 0 16px 0;">';
        html += '<h3 style="font-size: 12px; font-weight: bold; margin: 0 0 6px 0;">메모</h3>';
        if (memo) {
          html += `<div style="font-size: 11px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; background: #fff8f0; padding: 8px; border-radius: 4px; border: 1px solid #ffe0cc;">${memo}</div>`;
        } else {
          html += '<div style="font-size: 11px; line-height: 1.6; background: #f9f9f9; padding: 8px; border-radius: 4px; border: 1px solid #e0e0e0; color: #999;">(메모 없음)</div>';
        }
        html += '</div>';

        pageContainer.innerHTML = html;
        document.body.appendChild(pageContainer);

        // html2canvas로 캡처
        const canvas = await html2canvas(pageContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        document.body.removeChild(pageContainer);

        // 캔버스 픽셀 → mm 단위로 이미지 크기 계산
        const canvasHeightPx = canvas.height;
        const canvasWidthPx = canvas.width;
        const imgWidth = PAGE_WIDTH - (PADDING * 2);
        let imgHeight = (canvasHeightPx / canvasWidthPx) * imgWidth;

        // 엣지 케이스: 매물이 페이지 높이보다 긴 경우
        if (imgHeight > USABLE_HEIGHT) {
          // 페이지에 맞도록 축소
          imgHeight = USABLE_HEIGHT;

          // 현재 페이지에 충분한 공간이 없으면 새 페이지 추가
          if (currentY > PADDING) {
            pdf.addPage();
            currentY = PADDING;
          }

          pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            PADDING,
            PADDING,
            imgWidth,
            imgHeight
          );
          currentY = PADDING + imgHeight + MARGIN_BETWEEN;
        } else {
          // 정상 케이스: 남은 공간이 부족할 때만 새 페이지 추가
          if (currentY + imgHeight > PAGE_HEIGHT - PADDING) {
            pdf.addPage();
            currentY = PADDING;
          }

          pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            PADDING,
            currentY,
            imgWidth,
            imgHeight
          );

          currentY += imgHeight + MARGIN_BETWEEN;
        }
      }

      // PDF 다운로드
      const fileName = reportFileName.endsWith('.pdf') ? reportFileName : `${reportFileName}.pdf`;
      pdf.save(fileName);

      // 모달 닫기
      setReportPreviewOpen(false);
      setReportFileName('');
      setReportMemos({});
      setReportProperties([]);
    } catch (err) {
      console.error('PDF 저장 오류:', err);
      alert('PDF 저장 중 오류가 발생했습니다.');
    }
  };

  // 미리보기에서 메모 변경 처리
  const handleMemoChange = async (propIndex: number, newMemo: string) => {
    const propId = reportProperties[propIndex].id;

    // 메모 상태 업데이트
    setReportMemos(prev => ({ ...prev, [propId]: newMemo }));
  };

  const generatePropertyReport = generateReportPreview;

  const generatePDF = generatePropertyReport;

  // --- Report Preview Modal ---
  if (reportPreviewOpen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
            {/* 제목과 버튼 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">매물 보고서 미리보기</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setReportPreviewOpen(false);
                    setReportFileName('');
                    setReportMemos({});
                    setReportProperties([]);
                    setEditingPropertyIdx(null);
                    setEditingPropertyText('');
                  }}
                  className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors font-bold text-sm"
                >
                  취소
                </button>
                <button
                  onClick={finalizeReportPDF}
                  disabled={reportLoading || !reportFileName.trim()}
                  className="px-3 py-1.5 bg-primary text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-sm flex items-center gap-1.5"
                >
                  {reportLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      생성 중...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download"></i>
                      PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 파일명 입력 */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={reportFileName}
                onChange={(e) => setReportFileName(e.target.value)}
                placeholder="파일명을 입력하세요 (예: 매물보고서)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-gray-500">.pdf</span>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="p-6 space-y-6">
            {reportProperties.map((prop, idx) => (
              <div key={prop.id} className="space-y-4">
                {/* 1. 매물정보 텍스트 */}
                {prop.parsedText && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 group cursor-pointer" onDoubleClick={() => {
                    setEditingPropertyIdx(idx);
                    setEditingPropertyText(prop.parsedText);
                  }}>
                    {editingPropertyIdx === idx ? (
                      <div className="space-y-2">
                        <textarea
                          autoFocus
                          value={editingPropertyText}
                          onChange={(e) => setEditingPropertyText(e.target.value)}
                          className="w-full px-3 py-2 border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold resize-none"
                          rows={8}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const updatedProperties = [...reportProperties];
                              updatedProperties[idx] = {
                                ...updatedProperties[idx],
                                parsedText: editingPropertyText
                              };
                              setReportProperties(updatedProperties);
                              setEditingPropertyIdx(null);
                              setEditingPropertyText('');
                            }}
                            className="px-3 py-1 bg-primary text-white rounded text-xs hover:bg-blue-600"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingPropertyIdx(null);
                              setEditingPropertyText('');
                            }}
                            className="px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <pre className="text-xs whitespace-pre-wrap text-gray-800 font-semibold leading-relaxed group-hover:bg-gray-100 p-2 rounded transition-colors">{prop.parsedText}</pre>
                    )}
                  </div>
                )}

                {/* 2. 메모 입력 필드 */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <textarea
                    value={reportMemos[reportProperties[idx]?.id] || ''}
                    onChange={(e) => handleMemoChange(idx, e.target.value)}
                    placeholder="메모를 입력하세요..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [isFullScreenMode, setIsFullScreenMode] = useState(false);

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
            {/* 시간 선택 및 상태 셀렉터 */}
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
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}
                    </option>
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
                    <option key={i} value={String(i).padStart(2, '0')}>
                      {String(i).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={prop.status || '확인전'}
                onChange={(e) => {
                  updatePropertyField(prop.id, 'status', e.target.value as any);
                }}
                className="px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="확인전">확인전</option>
                <option value="확인중">확인중</option>
                <option value="볼수있음">볼수있음</option>
                <option value="현장방문완료">현장방문완료</option>
                <option value="오늘못봄">오늘못봄</option>
              </select>

              <div className="flex-1"></div>

              <button
                onClick={async () => {
                  const confirmed = await showConfirm('삭제', '이 매물을 삭제하시겠습니까?');
                  if (confirmed) {
                    if (activeMeeting) {
                      const updatedProperties = activeMeeting.properties.filter(p => p.id !== prop.id);
                      const updatedLocalMeeting = {
                        ...activeMeeting,
                        properties: updatedProperties
                      };
                      setLocalMeeting(updatedLocalMeeting);
                      onUpdate({
                        ...customer,
                        meetings: customer.meetings.map(m =>
                          m.id === activeMeeting.id ? updatedLocalMeeting : m
                        )
                      });
                    }
                  }
                }}
                className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 font-bold whitespace-nowrap"
              >
                매물삭제
              </button>
            </div>

            {/* 정리본 텍스트 표시 (매물정보) */}
            {prop.parsedText && (
              <div className="mb-4">
                {editingField === `${prop.id}-parsedText` ? (
                  <textarea
                    autoFocus
                    className="w-full p-2 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-primary outline-none text-sm font-semibold"
                    value={editingFieldValue}
                    onChange={(e) => setEditingFieldValue(e.target.value)}
                    onBlur={() => savePropertyInlineField(prop.id, 'parsedText')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        savePropertyInlineField(prop.id, 'parsedText');
                      }
                      if (e.key === 'Escape') {
                        setEditingField(null);
                        setEditingFieldValue('');
                      }
                    }}
                    rows={10}
                    placeholder="정리본 텍스트를 입력하세요.."
                  />
                ) : (
                  <div
                    className="p-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => {
                      setEditingField(`${prop.id}-parsedText`);
                      setEditingFieldValue(prop.parsedText || '');
                    }}
                    onTouchEnd={() => {
                      handleTouchDoubleTap(`parsed-${prop.id}`, () => {
                        setEditingField(`${prop.id}-parsedText`);
                        setEditingFieldValue(prop.parsedText || '');
                      });
                    }}
                    title="더블클릭 또는 두 번 탭하여 수정"
                  >
                    <pre className="whitespace-pre-wrap text-gray-700 text-sm font-semibold">
                      {prop.parsedText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 호실, 연락처, 지번 */}
            <div className="flex flex-col md:flex-row gap-1 md:gap-2 mb-4 items-start md:items-center">
              {/* 호실 */}
              <div className="w-full md:flex-[1.2] flex items-center gap-1">
                <span className="text-xs text-gray-600 font-bold whitespace-nowrap">호실:</span>
                {editingUnitId === prop.id ? (
                  <input
                    autoFocus
                    type="text"
                    placeholder="호실명을 입력해주세요"
                    value={prop.unit || ''}
                    onChange={(e) => updatePropertyField(prop.id, 'unit', e.target.value)}
                    onBlur={() => setEditingUnitId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingUnitId(null)}
                    className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <div
                    onDoubleClick={() => setEditingUnitId(prop.id)}
                    onTouchEnd={() => {
                      handleTouchDoubleTap(`unit-${prop.id}`, () => {
                        setEditingUnitId(prop.id);
                      });
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-blue-50 min-h-[28px] flex items-center"
                    title="더블클릭 또는 두 번 탭하여 수정"
                  >
                    {prop.unit ? (
                      prop.unit
                    ) : (
                      <span className="text-gray-400 font-normal">호실명을 입력해주세요</span>
                    )}
                  </div>
                )}
              </div>

              {/* 연락처 */}
              <div className="w-full md:flex-[1.2] flex items-center gap-1">
                <span className="text-xs text-gray-600 font-bold whitespace-nowrap">연락처:</span>
                {editingField === `${prop.id}-agencyPhone` ? (
                  <input
                    autoFocus
                    type="text"
                    placeholder="연락처를 입력해주세요"
                    className="w-full border border-blue-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                    value={editingFieldValue}
                    onChange={(e) => setEditingFieldValue(e.target.value)}
                    onBlur={() => savePropertyInlineField(prop.id, 'agencyPhone')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        savePropertyInlineField(prop.id, 'agencyPhone');
                      }
                      if (e.key === 'Escape') {
                        setEditingField(null);
                        setEditingFieldValue('');
                      }
                    }}
                  />
                ) : (
                  <div className="flex-1 flex items-center gap-0.5">
                    <div
                      className="flex-1 px-1 py-1 cursor-pointer hover:bg-yellow-100 rounded text-xs min-h-[28px] flex items-center truncate font-semibold"
                      onDoubleClick={() => {
                        setEditingField(`${prop.id}-agencyPhone`);
                        setEditingFieldValue(prop.agencyPhone || '');
                      }}
                      onTouchEnd={() => {
                        handleTouchDoubleTap(`phone-${prop.id}`, () => {
                          setEditingField(`${prop.id}-agencyPhone`);
                          setEditingFieldValue(prop.agencyPhone || '');
                        });
                      }}
                      title="더블클릭 또는 두 번 탭하여 수정"
                    >
                      {prop.agencyPhone ? (
                        prop.agencyPhone
                      ) : (
                        <span className="text-gray-400 font-normal">연락처를 입력해주세요</span>
                      )}
                    </div>
                    {prop.agencyPhone && isValidPhoneNumber(prop.agencyPhone) && (
                      <div className="flex items-center gap-1">
                        <a
                          href={generateSmsLink(prop.agencyPhone, getSmsTemplateText('meeting'))}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600 flex-shrink-0"
                          title="문자 보내기"
                          onClick={(e) => e.stopPropagation()}
                        >
                          SMS
                        </a>
                        <button
                          onClick={() => openSmsTemplateModal('meeting')}
                          className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                          title="미팅 SMS 템플릿 설정"
                        >
                          <i className="fas fa-cog text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 지번 */}
              <div className="w-full md:w-auto flex items-center gap-1 md:ml-4">
                <span className="text-xs text-gray-600 font-bold whitespace-nowrap">지번:</span>
                {editingField === `${prop.id}-jibun` ? (
                  <input
                    autoFocus
                    type="text"
                    className="w-full md:w-auto border rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                    value={editingFieldValue}
                    onChange={(e) => setEditingFieldValue(e.target.value)}
                    onBlur={() => savePropertyInlineField(prop.id, 'jibun')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        savePropertyInlineField(prop.id, 'jibun');
                      }
                      if (e.key === 'Escape') {
                        setEditingField(null);
                        setEditingFieldValue('');
                      }
                    }}
                  />
                ) : (
                  <span
                    className="font-semibold cursor-pointer hover:bg-yellow-100 px-1 rounded inline-block text-xs py-1"
                    onDoubleClick={() => {
                      setEditingField(`${prop.id}-jibun`);
                      setEditingFieldValue(prop.jibun || '');
                    }}
                    onTouchEnd={() => {
                      handleTouchDoubleTap(`jibun-${prop.id}`, () => {
                        setEditingField(`${prop.id}-jibun`);
                        setEditingFieldValue(prop.jibun || '');
                      });
                    }}
                    title="더블클릭 또는 두 번 탭하여 수정"
                  >
                    {prop.jibun ? (
                      prop.jibun
                    ) : (
                      <span className="text-gray-400 font-normal">지번을 입력해주세요</span>
                    )}
                  </span>
                )}
                {prop.jibun && (
                  <button
                    onClick={() => {
                      const mapUrl = `https://map.kakao.com/?q=${encodeURIComponent(prop.jibun)}`;
                      window.open(mapUrl, '_blank');
                    }}
                    className="px-2 py-1 bg-yellow-400 text-black rounded text-xs hover:bg-yellow-500 font-bold flex-shrink-0"
                  >
                    지도
                  </button>
                )}
              </div>
            </div>

            {/* 메모 영역 */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              {editingMemoId === prop.id ? (
                <>
                  {/* 반투명 오버레이 */}
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 9990,
                      cursor: 'pointer'
                    }}
                    onClick={() => saveMemo(prop.id)}
                  />

                  {/* 편집 모달 창 */}
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 9999,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '2rem',
                      pointerEvents: 'none'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        pointerEvents: 'auto',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>메모 수정</h3>
                        <button
                          onClick={() => saveMemo(prop.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                        >
                          저장
                        </button>
                      </div>
                      <textarea
                        autoFocus
                        style={{
                          flex: 1,
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          padding: '1rem',
                          fontSize: '0.875rem',
                          resize: 'none',
                          overflow: 'auto',
                          backgroundColor: 'white',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            saveMemo(prop.id);
                          }
                          if (e.key === 'Escape') {
                            saveMemo(prop.id);
                          }
                        }}
                        onFocus={(e) => e.currentTarget.style.outline = '2px solid #3b82f6'}
                        onBlur={(e) => e.currentTarget.style.outline = 'none'}
                        placeholder="메모를 입력하세요.. (Ctrl+Enter로 저장, Esc로 닫기)"
                      />
                    </div>
                  </div>
                </>
              ) : (
                // 조회 모드
                <div
                  onDoubleClick={() => {
                    setEditingMemoId(prop.id);
                    setMemoText(prop.memo || '');
                  }}
                  onTouchEnd={() => {
                    handleTouchDoubleTap(`memo-${prop.id}`, () => {
                      setEditingMemoId(prop.id);
                      setMemoText(prop.memo || '');
                    });
                  }}
                  className="w-full border rounded px-2 py-1 mt-1 min-h-[60px] bg-gray-50 whitespace-pre-wrap text-sm cursor-pointer hover:bg-gray-100"
                >
                  {prop.memo ? (
                    prop.memo
                  ) : (
                    <span className="text-gray-400 italic">메모를 입력해주세요</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="p-4 bg-white border-b shrink-0">
          {/* Meeting Navigation Tabs */}
          <div className="flex overflow-x-auto space-x-2 pb-1 no-scrollbar items-center">
            <button
              onClick={handleAddMeeting}
              className="flex-shrink-0 px-4 py-2 rounded border-2 border-gray-900 bg-yellow-300 text-gray-900 font-bold text-sm hover:bg-yellow-400 transition-colors"
            >
              추가
            </button>
            {customer.meetings?.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => {
                  setActiveMeetingId(meeting.id);
                  setMobileMeetingTab('WORK');
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm cursor-pointer whitespace-nowrap flex items-center gap-2 transition-all ${activeMeetingId === meeting.id
                  ? 'bg-primary border-primary text-white shadow-md'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <span className="font-bold">{meeting.round}차</span>
                <button
                  onClick={(e) => handleDeleteMeeting(e, meeting.id)}
                  className={`ml-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white ${activeMeetingId === meeting.id ? 'text-blue-200' : 'text-gray-300'}`}
                >
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 모바일 탭 네비게이션 */}
        <div className="md:hidden bg-white border-b shrink-0 overflow-x-auto">
          <div className="flex p-2 gap-2">
            <button
              onClick={() => setMobileMeetingTab('WORK')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${mobileMeetingTab === 'WORK'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <i className="fas fa-clipboard-list mr-2"></i>
              미팅매물관리
            </button>
            <button
              onClick={() => setMobileMeetingTab('HISTORY')}
              className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${mobileMeetingTab === 'HISTORY'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <i className="fas fa-history mr-2"></i>
              미팅히스토리
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 bg-white">
          {!activeMeeting ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <i className="fas fa-handshake text-4xl mb-2 opacity-20"></i>
              <p>등록된 미팅이 없습니다.</p>
              <p className="text-sm">상단 '+ 추가' 버튼을 눌러 미팅을 생성하세요.</p>
            </div>
          ) : (
            <>
              {/* 좌측: 기존 컨텐츠 */}
              <div
                ref={workAreaRef}
                className={`w-full md:w-[60%] min-h-0 overflow-y-auto md:pr-2 ${mobileMeetingTab === 'WORK' ? 'flex-1 block' : 'hidden md:block'
                  }`}
              >
                <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                  <i className="fas fa-home mr-2 text-primary"></i>
                  미팅매물관리
                </h3>
                <div className="space-y-6">
                  {/* Date Picker and Add Property Button Row */}
                  <div className="flex flex-col md:flex-row gap-2 items-start md:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    {/* Date Picker */}
                    <div className="flex gap-2 items-center w-full md:w-auto">
                      <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
                        <i className="far fa-calendar-alt mr-2 text-primary"></i>
                        미팅일시
                      </label>
                      <input
                        type="datetime-local"
                        value={activeMeeting.date}
                        onChange={handleDateChange}
                        className="flex-1 md:w-48 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
                      />
                    </div>

                    {/* Report Buttons and Add Property Button */}
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => generatePropertyReport()}
                        disabled={!activeMeeting?.properties || activeMeeting.properties.length === 0}
                        className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                        title="제안서 생성"
                      >
                        제안서
                      </button>

                      <button
                        onClick={() => {/* 미팅리포트 생성 함수 추후 구현 */ }}
                        disabled={!activeMeeting?.properties || activeMeeting.properties.length === 0}
                        className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                        title="미팅 후 생성"
                      >
                        미팅후
                      </button>

                      {/* Add Property Button */}
                      {!isAddingProperty && (
                        <button
                          onClick={() => setIsAddingProperty(true)}
                          className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors font-bold text-sm flex items-center gap-1"
                          title="매물 추가"
                        >
                          추가
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Add Property Form Section */}
                  {isAddingProperty && (
                    <div className="bg-white border border-primary rounded-lg p-4 shadow-md">

                      <div className="flex justify-between items-center mb-3">

                        <h3 className="font-bold text-sm text-primary">매물정보</h3>


                        <div className="flex items-center gap-2">

                          {/* 플랫폼 선택 토글 버튼 */}

                          <div className="flex border border-gray-300 rounded overflow-hidden text-xs">

                            <button

                              onClick={() => setSelectedPlatform('TEN')}

                              className={`px-3 py-1.5 transition-colors ${selectedPlatform === 'TEN' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}

                            >

                              텐(주거)

                            </button>

                            <button

                              onClick={() => setSelectedPlatform('TEN_COMMERCIAL')}

                              className={`px-3 py-1.5 transition-colors border-l border-gray-300 ${selectedPlatform === 'TEN_COMMERCIAL' ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}

                            >

                              텐(상업용)

                            </button>

                            <button

                              onClick={() => setSelectedPlatform('NAVER')}

                              className={`px-3 py-1.5 transition-colors border-l border-gray-300 ${selectedPlatform === 'NAVER' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}

                            >

                              네이버

                            </button>

                          </div>


                          {/* 자동 생성 버튼 */}

                          <button

                            onClick={handleAutoParse}

                            className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center gap-1"

                          >

                            생성

                          </button>

                        </div>

                      </div>


                      {/* 원본 입력 - parsedText가 없을 때만 표시 */}

                      {!parsedText && (

                        <div className="mb-3">

                          <label className="block text-xs text-gray-600 mb-1">원본 매물정보</label>

                          <textarea

                            autoFocus

                            className="w-full border p-2 rounded h-24 focus:outline-none focus:ring-1 focus:ring-primary text-sm"

                            placeholder="TEN, 네이버부동산, 또는 정리본 형식으로 붙여넣으세요..."

                            value={propertyText}

                            onChange={(e) => setPropertyText(e.target.value)}

                          />

                        </div>

                      )}



                      {/* 생성된 정리본 */}

                      {parsedText && (

                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">

                          <label className="block text-xs font-bold text-primary mb-2">생성된 매물정보</label>

                          <textarea

                            className="w-full border p-2 rounded h-32 bg-white focus:outline-none focus:ring-1 focus:ring-primary text-sm font-mono"

                            value={parsedText}

                            onChange={(e) => setParsedText(e.target.value)}

                            readOnly={false}

                          />

                        </div>

                      )}



                      {/* 자동 파싱된 필드들 */}

                      <div className="grid grid-cols-2 gap-3 mb-3">

                        <div>

                          <label className="block text-xs text-gray-600 mb-1">건물명</label>

                          <input

                            type="text"

                            className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"

                            placeholder="자동입력 또는 직접입력"

                            value={parsedRoomName}

                            onChange={(e) => setParsedRoomName(e.target.value)}

                          />

                        </div>

                        <div>

                          <label className="block text-xs text-gray-600 mb-1">지번</label>

                          <input

                            type="text"

                            className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"

                            placeholder="자동입력 또는 직접입력"

                            value={parsedJibun}

                            onChange={(e) => setParsedJibun(e.target.value)}

                          />

                        </div>

                        <div>

                          <label className="block text-xs text-gray-600 mb-1">부동산</label>

                          <input

                            type="text"

                            className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"

                            placeholder="자동입력 또는 직접입력"

                            value={parsedAgency}

                            onChange={(e) => setParsedAgency(e.target.value)}

                          />

                        </div>

                        <div>

                          <label className="block text-xs text-gray-600 mb-1">연락처</label>

                          <input

                            type="text"

                            className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"

                            placeholder="자동입력 또는 직접입력"

                            value={parsedAgencyPhone}

                            onChange={(e) => setParsedAgencyPhone(e.target.value)}

                          />

                        </div>

                      </div>


                      <div className="flex justify-end gap-2">

                        <button

                          onClick={() => {

                            setIsAddingProperty(false);

                            setPropertyText('');

                            setParsedRoomName('');

                            setParsedJibun('');

                            setParsedAgency('');

                            setParsedAgencyPhone('');

                            setParsedText('');

                            setEditingPropertyId(null);

                          }}

                          className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm"

                        >

                          취소

                        </button>

                        <button

                          onClick={handleAddProperty}

                          className="px-4 py-1.5 bg-primary text-white rounded hover:bg-blue-600 text-sm"

                        >

                          {editingPropertyId ? '수정' : '등록'}

                        </button>

                      </div>

                    </div>
                  )}

                  {/* 등록된 매물 미리보기 목록 */}
                  {activeMeeting?.properties && activeMeeting.properties.length > 0 && (
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm text-primary">등록된 매물 ({activeMeeting.properties.length}개)</h3>
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={showRegisteredOnly}
                              onChange={() => setShowRegisteredOnly(!showRegisteredOnly)}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${showRegisteredOnly ? 'bg-primary' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showRegisteredOnly ? 'transform translate-x-4' : ''}`}></div>
                          </div>
                          <div className="ml-2 text-sm text-gray-700 font-medium">✨ 볼 수 있는 매물만</div>
                        </label>
                        <button
                          onClick={() => setIsFullScreenMode(true)}
                          className="ml-3 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-bold transition-colors flex items-center shadow-sm border border-gray-300"
                        >
                          <span className="mr-1 text-base">⛶</span> 크게 보기
                        </button>
                      </div>
                      {/* 크게보기 모드에서는 일반 뷰의 매물 목록을 렌더링하지 않음 (인라인 편집 포커스 충돌 방지) */}
                      {!isFullScreenMode && renderPropertyList()}
                    </div>
                  )}
                </div>
              </div>

              {/* 우측: 미팅히스토리 */}
              <div
                ref={historyAreaRef}
                className={`w-full md:w-[40%] min-h-0 flex flex-col border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-4 ${mobileMeetingTab === 'HISTORY' ? 'flex-1' : 'hidden md:flex'
                  }`}
              >
                <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                  <i className="fas fa-history mr-2 text-primary"></i>
                  미팅히스토리
                </h3>

                {/* 체크리스트 입력 폼 */}
                <form onSubmit={handleAddMeetingHistory} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="미팅 진행사항 입력..."
                    value={newHistoryText}
                    onChange={(e) => setNewHistoryText(e.target.value)}
                    className="flex-1 border-2 border-blue-500 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
                  >
                    추가
                  </button>
                </form>

                {/* 체크리스트 목록 */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {(customer.meetingHistory || []).map((item, index, array) => (
                    <div key={item.id}>
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 mr-2 flex items-start gap-2" onDoubleClick={() => startEditingHistory(item)}>
                            {editingHistoryItemId === item.id ? (
                              <input
                                autoFocus
                                className="w-full border-b-2 border-primary outline-none"
                                value={editingHistoryText}
                                onChange={(e) => setEditingHistoryText(e.target.value)}
                                onBlur={saveEditingHistory}
                                onKeyDown={(e) => e.key === 'Enter' && saveEditingHistory()}
                              />
                            ) : (
                              <>
                                <i className="fas fa-circle text-xs text-purple-500 mt-1 flex-shrink-0"></i>
                                <span className="text-gray-800 font-medium cursor-pointer flex-1" title="더블클릭하여 수정">
                                  {item.text}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openHistoryMemo(item)} className="text-gray-400 hover:text-blue-500">
                              <i className="fas fa-sticky-note"></i>
                            </button>
                            <button onClick={() => handleDeleteMeetingHistory(item.id)} className="text-gray-400 hover:text-red-500">
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                          {item.memo && (
                            <span
                              onClick={() => openHistoryMemo(item)}
                              className="text-green-600 font-medium truncate max-w-xs ml-2 cursor-pointer hover:text-green-700 hover:underline"
                            >
                              {item.memo.split('\n')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      {index < array.length - 1 && (
                        <div className="h-px bg-red-500 my-3"></div>
                      )}
                    </div>
                  ))}
                  {(!customer.meetingHistory || customer.meetingHistory.length === 0) && (
                    <div className="text-center text-gray-400 py-10">
                      등록된 미팅히스토리가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden PDF Report Template - 매물별 개별 페이지 */}
      <div style={{ display: 'none' }}>
        {activeMeeting?.properties.map((prop, idx) => (
          <div
            key={prop.id}
            ref={(el) => {
              if (el) propertyRefsMap.current[prop.id] = el;
            }}
            style={{ width: '210mm', minHeight: '297mm', padding: '20mm', backgroundColor: 'white' }}
          >
            {/* 매물 헤더 */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-primary">매물 #{idx + 1}</h1>
            </div>

            {/* 호실, 지번, 연락처 */}
            <div className="mb-6 pb-6 border-b border-gray-300">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">호실</p>
                  <p className="text-base font-bold text-gray-800">{prop.unit || '미등록'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">연락처</p>
                  <p className="text-base font-bold text-gray-800">{prop.agencyPhone || '미등록'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">지번</p>
                  <p className="text-base font-bold text-gray-800">{prop.jibun || '미등록'}</p>
                </div>
              </div>
            </div>

            {/* 매물 정보 (정리본 텍스트) */}
            {prop.parsedText && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">매물정보</p>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm font-medium">
                    {prop.parsedText}
                  </p>
                </div>
              </div>
            )}

            {/* 메모 */}
            {prop.memo && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">메모</p>
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
                    {prop.memo}
                  </p>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* 미팅히스토리 메모 모달 */}
      {historyMemoItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h4 className="font-bold">메모 관리</h4>
              <button onClick={() => setHistoryMemoItem(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4">
              {historyMemoMode === 'VIEW' ? (
                <div className="h-44 overflow-y-auto whitespace-pre-wrap text-gray-700 border p-2 rounded bg-gray-50">
                  {historyMemoText || <span className="text-gray-400 italic">메모가 없습니다.</span>}
                </div>
              ) : (
                <textarea
                  className="w-full h-44 border p-2 rounded resize-none focus:ring-1 focus:ring-primary outline-none"
                  value={historyMemoText}
                  onChange={(e) => setHistoryMemoText(e.target.value)}
                  placeholder="메모를 입력하세요..."
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
              {historyMemoMode === 'VIEW' ? (
                <button
                  onClick={() => setHistoryMemoMode('EDIT')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  수정
                </button>
              ) : (
                <button
                  onClick={saveHistoryMemo}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  저장
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meeting Delete Confirmation Modal */}
      {deleteMeetingConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">미팅 삭제</h3>
              <p className="text-gray-600 mb-2">
                <span className="font-semibold">{customer.meetings?.find(m => m.id === deleteMeetingConfirmation)?.round}차 미팅</span>을 정말 삭제하시겠습니까?
              </p>
              <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-lg">
              <button
                onClick={cancelDeleteMeeting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteMeeting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Property Viewer Modal */}
      {isFullScreenMode && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex-shrink-0 bg-white border-b shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-bold flex items-center text-primary">
              <span className="mr-2">⛶</span>
              등록된 매물 크게 보기
              <span className="ml-3 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                총 {activeMeeting?.properties?.length || 0}개
              </span>
            </h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={showRegisteredOnly}
                    onChange={() => setShowRegisteredOnly(!showRegisteredOnly)}
                  />
                  <div className={`block w-12 h-7 rounded-full transition-colors ${showRegisteredOnly ? 'bg-primary' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${showRegisteredOnly ? 'transform translate-x-5' : ''}`}></div>
                </div>
                <div className="ml-2 text-sm md:text-base text-gray-700 font-bold whitespace-nowrap">✨ 볼 수 있는 매물만</div>
              </label>
              <button
                onClick={() => setIsFullScreenMode(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-bold transition-colors shadow-sm ml-2 md:ml-4 flex items-center"
              >
                <i className="fas fa-times mr-2"></i> 닫기
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
            <div className="max-w-6xl mx-auto">
              {renderPropertyList()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
