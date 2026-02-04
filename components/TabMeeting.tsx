import React, { useState, useRef, useEffect } from 'react';
import { Customer, Property, Meeting } from '../types';
import { generateId } from '../services/firestore';
import { fileToBase64, compressAndConvertToBase64 } from '../services/storage-firebase';
import {
  parsePropertyDetails,
  generateStructuredPropertyInfo,
  parsePropertyDetailsByPlatform,
  generateStructuredPropertyInfoByPlatform
} from '../utils/textParser';
import { isValidPhoneNumber, generateSmsLink } from '../utils/phoneUtils';
import { PhotoModal } from './PhotoModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

export const TabMeeting: React.FC<Props> = ({ customer, onUpdate }) => {
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

  // 사진 모달
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUploadPropId, setPhotoUploadPropId] = useState<string | null>(null);

  // ⭐ 로컬 미팅 상태 (즉시 미리보기를 위함)
  const [localMeeting, setLocalMeeting] = useState<Meeting | null>(null);

  // 매물 메모 편집 상태
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');

  // 미팅 삭제 확인 모달 상태
  const [deleteMeetingConfirmation, setDeleteMeetingConfirmation] = useState<string | null>(null);

  // 인라인 필드 편집 상태 (형식: "propId-fieldName")
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');

  // 보고서 프리뷰 모달 상태
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const [reportImages, setReportImages] = useState<string[]>([]);
  const [reportFileName, setReportFileName] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // 보고서 미리보기 메모 편집 상태
  const [reportMemos, setReportMemos] = useState<{ [propId: string]: string }>({});
  const [reportProperties, setReportProperties] = useState<Property[]>([]);

  const reportRef = useRef<HTMLDivElement>(null);
  const propertyRefsMap = useRef<{ [key: string]: HTMLDivElement }>({});

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

  // ⭐ Props에서 받은 activeMeeting과 로컬 상태 동기화
  const propsActiveMeeting = customer.meetings?.find(m => m.id === activeMeetingId);
  useEffect(() => {
    if (propsActiveMeeting) {
      setLocalMeeting(propsActiveMeeting);
    }
  }, [propsActiveMeeting?.id]);

  // ⭐ 렌더링할 때는 로컬 상태를 사용 (Firebase 저장 대기 없이 즉시 표시)
  const activeMeeting = localMeeting || propsActiveMeeting;

  // --- Meeting Management ---

  const handleAddMeeting = () => {
    const nextRound = customer.meetings ? customer.meetings.length + 1 : 1;
    const newMeeting: Meeting = {
      id: generateId(),
      round: nextRound,
      date: '',
      properties: [],
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

  // --- Property Management (within Active Meeting) ---

  const handleAddProperty = () => {
    // propertyText 또는 parsedText 중 하나라도 있으면 등록 가능
    if ((!propertyText.trim() && !parsedText.trim()) || !activeMeeting) return;

    // 필수 필드 검증 (선택적)
    if (!parsedRoomName && !parsedJibun && !parsedAgency && !parsedAgencyPhone) {
      if (!window.confirm('자동 파싱되지 않은 매물입니다. 그대로 등록하시겠습니까?')) {
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
              roomName: parsedRoomName,
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
        roomName: parsedRoomName,
        jibun: parsedJibun,
        agency: parsedAgency,
        agencyPhone: parsedAgencyPhone,
        photos: [],
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

  const handleDeleteProperty = (propId: string) => {
    if (!window.confirm('매물을 삭제하시겠습니까?') || !activeMeeting) return;

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

  const handlePhotoUpload = async (files: File[]) => {
    // ⭐ 함수 시작 시 상태 스냅샷 저장 (async 진행 중 상태 변경 방지)
    const propId = photoUploadPropId;
    const meeting = activeMeeting;

    console.log('🎬 handlePhotoUpload called with', files.length, 'files');
    console.log('📍 propId:', propId);
    console.log('📍 meeting:', meeting?.id);

    if (!propId) {
      console.error('❌ propId is not set');
      alert('매물이 선택되지 않았습니다.');
      return;
    }

    if (!meeting) {
      console.error('❌ meeting is not set');
      alert('미팅이 선택되지 않았습니다.');
      return;
    }

    const currentProp = meeting.properties.find(p => p.id === propId);
    console.log('🔍 currentProp found:', !!currentProp);

    if (!currentProp) {
      console.error('❌ currentProp not found for id:', propId);
      alert('해당 매물을 찾을 수 없습니다.');
      return;
    }

    const remainingSlots = 4 - currentProp.photos.length;
    console.log('📸 remainingSlots:', remainingSlots, 'currentPhotos:', currentProp.photos.length);

    if (remainingSlots <= 0) {
      alert('사진은 최대 4장까지만 등록 가능합니다.');
      return;
    }

    // File type validation
    const validFiles: File[] = [];
    const invalidTypes: string[] = [];

    for (const file of files) {
      console.log(`📄 File check: ${file.name}, type: ${file.type}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      } else {
        invalidTypes.push(file.name);
      }
    }

    if (invalidTypes.length > 0) {
      alert(`이미지 파일만 업로드 가능합니다: ${invalidTypes.join(', ')}`);
    }

    if (validFiles.length === 0) {
      console.warn('⚠️ No valid image files');
      return;
    }

    const filesToProcess = validFiles.slice(0, remainingSlots);
    console.log(`✅ Processing ${filesToProcess.length} valid files`);

    try {
      // ⭐ Step 1: 압축 시작 전에 즉시 UI 업데이트 (로딩 표시)
      console.log(`📸 Compressing ${filesToProcess.length} image(s)...`);

      const base64Images: string[] = [];

      // ⭐ Step 2: 압축 작업 (병렬 처리로 더 빠르게)
      const compressionPromises = filesToProcess.map(async (file) => {
        try {
          console.log(`📸 Processing: ${file.name}`);
          const base64 = await compressAndConvertToBase64(file);
          console.log(`✅ ${file.name} compressed successfully`);
          return base64;
        } catch (error) {
          console.error(`❌ Error processing ${file.name}:`, error);
          throw error;
        }
      });

      // 모든 압축 작업이 완료될 때까지 대기
      try {
        const results = await Promise.allSettled(compressionPromises);

        for (const result of results) {
          if (result.status === 'fulfilled') {
            base64Images.push(result.value);
          } else {
            const error = result.reason;
            console.error('❌ Compression failed:', error);
            alert(`사진 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
          }
        }
      } catch (error) {
        console.error('❌ Error in compression:', error);
      }

      if (base64Images.length === 0) {
        console.warn('⚠️ 압축된 이미지가 없습니다.');
        alert('압축에 실패한 사진이 있습니다. 다시 시도해주세요.');
        return;
      }

      // ⭐ Step 3: 로컬 상태 먼저 업데이트 (즉시 미리보기 표시)
      console.log(`✅ 로컬 상태 업데이트: ${base64Images.length}장의 사진 추가`);
      const updatedPhotos = [...currentProp.photos, ...base64Images];
      const updatedLocalMeeting = {
        ...meeting,
        properties: meeting.properties.map(p =>
          p.id === propId
            ? { ...p, photos: updatedPhotos }
            : p
        )
      };

      // 즉시 로컬 상태 반영 (렌더링 즉시 일어남)
      setLocalMeeting(updatedLocalMeeting);
      console.log(`📝 Updated photos count: ${updatedPhotos.length}`);

      // ⭐ Step 4: Firebase에 저장 (백그라운드, 시간 걸려도 상관없음)
      console.log('💾 Saving to Firebase in background...');
      updateMeeting(meeting.id, {
        properties: meeting.properties.map(p =>
          p.id === propId
            ? { ...p, photos: updatedPhotos }
            : p
        )
      });

      console.log(`✅ ${base64Images.length}장의 사진이 업로드되었습니다.`);
      setPhotoUploadPropId(null);
    } catch (error) {
      console.error('❌ 사진 업로드 중 오류:', error);
      alert('사진 업로드 중 오류가 발생했습니다.');
      setPhotoUploadPropId(null);
    }
  };

  const removePhoto = (propId: string, photoIndex: number) => {
    if (!activeMeeting) return;
    const currentProp = activeMeeting.properties.find(p => p.id === propId);
    if (!currentProp) return;

    const updatedPhotos = currentProp.photos.filter((_, i) => i !== photoIndex);

    // ⭐ 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    const updatedLocalMeeting = {
      ...activeMeeting,
      properties: activeMeeting.properties.map(p =>
        p.id === propId ? { ...p, photos: updatedPhotos } : p
      )
    };
    setLocalMeeting(updatedLocalMeeting);

    // Firebase에 저장 (백그라운드)
    updateMeeting(activeMeeting.id, {
      properties: activeMeeting.properties.map(p =>
        p.id === propId ? { ...p, photos: updatedPhotos } : p
      )
    });
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

  // 단일 매물 이미지 재생성 (사진만)
  const regeneratePropertyImage = async (propIndex: number) => {
    if (propIndex < 0 || propIndex >= reportProperties.length) return;

    const prop = reportProperties[propIndex];

    try {
      // HTML 요소 동적 생성
      const reportContainer = document.createElement('div');
      reportContainer.style.width = '210mm';
      reportContainer.style.padding = '10mm';
      reportContainer.style.backgroundColor = 'white';
      reportContainer.style.fontFamily = 'Arial, sans-serif';
      reportContainer.style.fontSize = '12px';
      reportContainer.style.color = '#333';
      reportContainer.style.position = 'absolute';
      reportContainer.style.left = '-9999px';
      reportContainer.style.top = '-9999px';

      let html = '';

      // 사진 섹션만
      if (prop.photos && prop.photos.length > 0) {
        html += `<h3 style="font-size: 13px; font-weight: bold; margin: 12px 0 8px 0;">사진 (${prop.photos.length}장):</h3>`;
        html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 0;">';
        for (const photoData of prop.photos) {
          html += `<img src="${photoData}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />`;
        }
        html += '</div>';
      }

      reportContainer.innerHTML = html;
      document.body.appendChild(reportContainer);

      // html2canvas로 캡처
      const canvas = await html2canvas(reportContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(reportContainer);

      // reportImages 배열의 해당 인덱스만 업데이트
      setReportImages(prev => {
        const newImages = [...prev];
        newImages[propIndex] = canvas.toDataURL('image/png');
        return newImages;
      });
    } catch (err) {
      console.error('이미지 재생성 오류:', err);
    }
  };

  // 모든 매물 이미지 생성 (사진만)
  const regenerateAllImages = async (properties: Property[], memos: { [propId: string]: string }) => {
    const images: string[] = [];

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];

      try {
        // HTML 요소 동적 생성
        const reportContainer = document.createElement('div');
        reportContainer.style.width = '210mm';
        reportContainer.style.padding = '10mm';
        reportContainer.style.backgroundColor = 'white';
        reportContainer.style.fontFamily = 'Arial, sans-serif';
        reportContainer.style.fontSize = '12px';
        reportContainer.style.color = '#333';
        reportContainer.style.position = 'absolute';
        reportContainer.style.left = '-9999px';
        reportContainer.style.top = '-9999px';

        let html = '';

        // 사진 섹션만
        if (prop.photos && prop.photos.length > 0) {
          html += `<h3 style="font-size: 13px; font-weight: bold; margin: 12px 0 8px 0;">사진 (${prop.photos.length}장):</h3>`;
          html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 0;">';
          for (const photoData of prop.photos) {
            html += `<img src="${photoData}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />`;
          }
          html += '</div>';
        }

        reportContainer.innerHTML = html;
        document.body.appendChild(reportContainer);

        // html2canvas로 캡처
        const canvas = await html2canvas(reportContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        document.body.removeChild(reportContainer);

        images.push(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error(`매물 ${i} 이미지 생성 오류:`, err);
      }
    }

    setReportImages(images);
  };

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

      // 모든 이미지 생성
      await regenerateAllImages(sortedProperties, initialMemos);

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
      let isFirstPage = true;

      // 각 매물마다 PDF 페이지 생성
      for (let i = 0; i < reportProperties.length; i++) {
        const prop = reportProperties[i];
        const memo = reportMemos[prop.id];

        // 매물정보, 메모, 사진을 모두 포함한 페이지 생성
        const pageContainer = document.createElement('div');
        pageContainer.style.width = '210mm';
        pageContainer.style.minHeight = '297mm';
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

        // 3. 사진
        if (prop.photos && prop.photos.length > 0) {
          html += `<h3 style="font-size: 12px; font-weight: bold; margin: 0 0 8px 0;">사진 (${prop.photos.length}장)</h3>`;
          html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">';
          for (const photoData of prop.photos) {
            html += `<img src="${photoData}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />`;
          }
          html += '</div>';
        }

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

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        if (!isFirstPage) {
          pdf.addPage();
        }

        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
        isFirstPage = false;
      }

      // PDF 다운로드
      const fileName = reportFileName.endsWith('.pdf') ? reportFileName : `${reportFileName}.pdf`;
      pdf.save(fileName);

      // 모달 닫기
      setReportPreviewOpen(false);
      setReportImages([]);
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

    // 해당 이미지 재생성
    await regeneratePropertyImage(propIndex);
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
                    setReportImages([]);
                    setReportFileName('');
                    setReportMemos({});
                    setReportProperties([]);
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
                      PDF 다운로드
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
            {reportImages.map((img, idx) => (
              <div key={idx} className="space-y-4">
                {/* 1. 매물정보 텍스트 */}
                {reportProperties[idx]?.parsedText && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-xs whitespace-pre-wrap text-gray-800 font-semibold leading-relaxed">{reportProperties[idx].parsedText}</pre>
                  </div>
                )}

                {/* 2. 메모 입력 필드 */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[200px] flex flex-col">
                  <textarea
                    value={reportMemos[reportProperties[idx]?.id] || ''}
                    onChange={(e) => handleMemoChange(idx, e.target.value)}
                    placeholder="메모를 입력하세요..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  />
                </div>

                {/* 3. 미리보기 이미지 (사진만) */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <img src={img} alt={`페이지 ${idx + 1}`} className="w-full rounded shadow-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PhotoModal
        isOpen={photoModalOpen}
        onClose={() => {
          setPhotoModalOpen(false);
          setPhotoUploadPropId(null);
        }}
        onPhotoCapture={handlePhotoUpload}
      />
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
              onClick={() => setActiveMeetingId(meeting.id)}
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

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {!activeMeeting ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <i className="fas fa-handshake text-4xl mb-2 opacity-20"></i>
            <p>등록된 미팅이 없습니다.</p>
            <p className="text-sm">상단 '+ 추가' 버튼을 눌러 미팅을 생성하세요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Date Picker and Add Property Button Row */}
            <div className="flex gap-2 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              {/* Date Picker */}
              <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
                <i className="far fa-calendar-alt mr-2 text-primary"></i>
                미팅일시
              </label>
              <input
                type="datetime-local"
                value={activeMeeting.date}
                onChange={handleDateChange}
                className="w-48 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-primary focus:border-primary"
              />

              <div className="flex-1"></div>

              {/* Report Button */}
              <button
                onClick={() => generatePropertyReport()}
                disabled={!activeMeeting?.properties || activeMeeting.properties.length === 0}
                className="flex-shrink-0 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-sm"
                title="매물 보고서 생성"
              >
                <i className="fas fa-file-pdf mr-1"></i>
                보고서
              </button>

              {/* Add Property Button */}
              {!isAddingProperty && (
                <button
                  onClick={() => setIsAddingProperty(true)}
                  className="flex-shrink-0 px-3 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors font-bold text-sm"
                  title="매물 추가"
                >
                  <i className="fas fa-plus"></i>
                </button>
              )}
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
                <h3 className="font-bold text-sm text-primary mb-3">등록된 매물 ({activeMeeting.properties.length}개)</h3>
                <div className="space-y-3">
                  {activeMeeting.properties
                    .slice()
                    .sort((a, b) => {
                      const timeA = a.visitTime || '99:99';
                      const timeB = b.visitTime || '99:99';
                      return timeA.localeCompare(timeB);
                    })
                    .map((prop, idx) => (
                    <div key={prop.id} className="p-4 bg-gray-50 border border-black rounded-lg">
                      {/* 시간 선택 및 상태 드롭다운 */}
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
                        </select>

                        <div className="flex-1"></div>

                        <button
                          onClick={() => {
                            if (window.confirm('이 매물을 삭제하시겠습니까?')) {
                              if (activeMeeting) {
                                const updatedProperties = activeMeeting.properties.filter(p => p.id !== prop.id);

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
                              }
                            }
                          }}
                          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 font-bold whitespace-nowrap"
                        >
                          매물삭제
                        </button>
                      </div>

                      {/* 정리본 텍스트 미리보기 (매물정보) */}
                      {prop.parsedText && (
                        <div className="mb-4">
                          {editingField === `${prop.id}-parsedText` ? (
                            <textarea
                              autoFocus
                              className="w-full border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none text-sm font-semibold"
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
                              rows={4}
                              placeholder="정리본 텍스트를 입력하세요..."
                            />
                          ) : (
                            <div
                              className="p-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
                              onDoubleClick={() => {
                                setEditingField(`${prop.id}-parsedText`);
                                setEditingFieldValue(prop.parsedText || '');
                              }}
                              title="더블클릭하여 편집"
                            >
                              <pre className="whitespace-pre-wrap text-gray-700 text-sm font-semibold">
                                {prop.parsedText}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 건물명 */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 font-bold whitespace-nowrap">건물명:</span>
                          {editingField === `${prop.id}-roomName` ? (
                            <input
                              autoFocus
                              type="text"
                              className="flex-1 border border-blue-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none text-xs"
                              value={editingFieldValue}
                              onChange={(e) => setEditingFieldValue(e.target.value)}
                              onBlur={() => savePropertyInlineField(prop.id, 'roomName')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  savePropertyInlineField(prop.id, 'roomName');
                                }
                                if (e.key === 'Escape') {
                                  setEditingField(null);
                                  setEditingFieldValue('');
                                }
                              }}
                            />
                          ) : (
                            <div
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-blue-50 min-h-[28px] flex items-center"
                              onDoubleClick={() => {
                                setEditingField(`${prop.id}-roomName`);
                                setEditingFieldValue(prop.roomName || '');
                              }}
                              title="더블클릭하여 편집"
                            >
                              {prop.roomName || '(건물명)'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 호실 및 지번 */}
                      <div className="flex flex-col md:flex-row gap-3 mb-4">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-gray-600 font-bold whitespace-nowrap">호실:</span>
                          {editingUnitId === prop.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={prop.unit || ''}
                              onChange={(e) => updatePropertyField(prop.id, 'unit', e.target.value)}
                              onBlur={() => setEditingUnitId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingUnitId(null)}
                              className="flex-1 px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            <div
                              onDoubleClick={() => setEditingUnitId(prop.id)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-blue-50 min-h-[28px] flex items-center"
                            >
                              {prop.unit || '(호실)'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-gray-600 font-bold whitespace-nowrap">지번:</span>
                          {editingField === `${prop.id}-jibun` ? (
                            <input
                              autoFocus
                              type="text"
                              className="flex-1 border rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none text-xs"
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
                              className="flex-1 font-semibold cursor-pointer hover:bg-yellow-100 px-1 rounded inline-block text-xs py-1"
                              onDoubleClick={() => {
                                setEditingField(`${prop.id}-jibun`);
                                setEditingFieldValue(prop.jibun || '');
                              }}
                              title="더블클릭하여 편집"
                            >
                              {prop.jibun || '미등록'}
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

                      {/* 미리보기 정보 */}
                      <div className="mb-3">
                        {/* 부동산과 연락처 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">부동산:</span>
                            {editingField === `${prop.id}-agency` ? (
                              <input
                                autoFocus
                                type="text"
                                className="border rounded px-2 py-1 ml-1 focus:ring-1 focus:ring-primary outline-none text-sm"
                                value={editingFieldValue}
                                onChange={(e) => setEditingFieldValue(e.target.value)}
                                onBlur={() => savePropertyInlineField(prop.id, 'agency')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    savePropertyInlineField(prop.id, 'agency');
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingField(null);
                                    setEditingFieldValue('');
                                  }
                                }}
                              />
                            ) : (
                              <span
                                className="font-semibold cursor-pointer hover:bg-blue-100 px-1 rounded inline-block"
                                onDoubleClick={() => {
                                  setEditingField(`${prop.id}-agency`);
                                  setEditingFieldValue(prop.agency || '');
                                }}
                                title="더블클릭하여 편집"
                              >
                                {prop.agency || '미등록'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">연락처:</span>
                            {editingField === `${prop.id}-agencyPhone` ? (
                              <input
                                autoFocus
                                type="text"
                                className="border rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none text-sm flex-1"
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
                              <>
                                <div className="flex-1">
                                  {prop.agencyPhone && isValidPhoneNumber(prop.agencyPhone) ? (
                                    <a
                                      href={generateSmsLink(prop.agencyPhone)}
                                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                      title="클릭하면 SMS로 연결됩니다"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {prop.agencyPhone}
                                    </a>
                                  ) : (
                                    <span className="font-semibold text-gray-800">
                                      {prop.agencyPhone || '미등록'}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingField(`${prop.id}-agencyPhone`);
                                    setEditingFieldValue(prop.agencyPhone || '');
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-600 rounded whitespace-nowrap"
                                  title="연락처 수정"
                                >
                                  <i className="fas fa-edit mr-1"></i>수정
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 메모 섹션 */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {editingMemoId === prop.id ? (
                          // 편집 모드
                          <textarea
                            autoFocus
                            className="w-full border rounded px-2 py-1 mt-1 focus:ring-1 focus:ring-primary outline-none text-sm"
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            onBlur={() => saveMemo(prop.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) {
                                saveMemo(prop.id);
                              }
                            }}
                            rows={3}
                            placeholder="메모를 입력하세요..."
                          />
                        ) : (
                          // 조회 모드
                          <div
                            onDoubleClick={() => {
                              setEditingMemoId(prop.id);
                              setMemoText(prop.memo || '');
                            }}
                            className="w-full border rounded px-2 py-1 mt-1 min-h-[60px] bg-gray-50 whitespace-pre-wrap text-sm cursor-pointer hover:bg-gray-100"
                          >
                            {prop.memo || '(메모 없음)'}
                          </div>
                        )}
                      </div>

                      {/* 사진 미리보기 섹션 */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-gray-600">사진 ({prop.photos.length}/4)</span>
                          {prop.photos.length < 4 && (
                            <button
                              onClick={() => {
                                setPhotoUploadPropId(prop.id);
                                setPhotoModalOpen(true);
                              }}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1 font-semibold"
                            >
                              <i className="fas fa-camera"></i>
                              추가
                            </button>
                          )}
                        </div>
                        {prop.photos.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {prop.photos.map((photo, pIdx) => (
                              <div key={pIdx} className="relative aspect-square bg-gray-200 rounded overflow-hidden group border border-gray-300">
                                <img src={photo} alt={`photo-${pIdx}`} className="w-full h-full object-cover" />
                                <button
                                  onClick={() => removePhoto(prop.id, pIdx)}
                                  className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="삭제"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-gray-400 text-xs">
                            사진이 없습니다. 위의 "추가" 버튼을 누르세요.
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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

            {/* 호실명과 지번 */}
            <div className="mb-6 pb-6 border-b border-gray-300">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-2">호실명</p>
                  <p className="text-lg font-bold text-gray-800">{prop.roomName || '미등록'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold mb-2">지번</p>
                  <p className="text-lg font-bold text-gray-800">{prop.jibun || '미등록'}</p>
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

            {/* 사진들 */}
            {prop.photos.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">첨부 사진</p>
                <div className="grid grid-cols-2 gap-4">
                  {prop.photos.map((p, i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded overflow-hidden border border-gray-300">
                      <img src={p} className="w-full h-full object-cover" alt={`property-photo-${i}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

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
    </>
  );
};
