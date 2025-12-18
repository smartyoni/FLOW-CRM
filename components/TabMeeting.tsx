import React, { useState, useRef, useEffect } from 'react';
import { Customer, Property, Meeting } from '../types';
import { generateId } from '../services/firestore';
import { uploadPhotos, fileToBase64, deletePhoto } from '../services/storage-firebase';
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

  // 플랫폼 선택 (TEN 또는 NAVER)
  const [selectedPlatform, setSelectedPlatform] = useState<'TEN' | 'NAVER'>('TEN');

  // 사진 모달
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUploadPropId, setPhotoUploadPropId] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

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

  const activeMeeting = customer.meetings?.find(m => m.id === activeMeetingId);

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

    onUpdate({
      ...customer,
      meetings: [...(customer.meetings || []), newMeeting]
    });
    setActiveMeetingId(newMeeting.id);
  };

  const handleDeleteMeeting = (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation();
    if (!window.confirm('해당 미팅 기록을 삭제하시겠습니까?')) return;

    const updatedMeetings = customer.meetings.filter(m => m.id !== meetingId);
    // Re-calculate rounds
    const reorderedMeetings = updatedMeetings.map((m, index) => ({
      ...m,
      round: index + 1
    }));

    onUpdate({
      ...customer,
      meetings: reorderedMeetings
    });

    if (activeMeetingId === meetingId) {
      setActiveMeetingId(reorderedMeetings.length > 0 ? reorderedMeetings[reorderedMeetings.length - 1].id : null);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeMeeting) return;
    updateMeeting(activeMeeting.id, { date: e.target.value });
  };

  const updateMeeting = (meetingId: string, updates: Partial<Meeting>) => {
    onUpdate({
      ...customer,
      meetings: customer.meetings.map(m => 
        m.id === meetingId ? { ...m, ...updates } : m
      )
    });
  };

  // --- Property Management (within Active Meeting) ---

  const handleAddProperty = () => {
    if (!propertyText.trim() || !activeMeeting) return;

    // 필수 필드 검증 (선택적)
    if (!parsedRoomName && !parsedJibun && !parsedAgency && !parsedAgencyPhone) {
      if (!window.confirm('자동 파싱되지 않은 매물입니다. 그대로 등록하시겠습니까?')) {
        return;
      }
    }

    if (editingPropertyId) {
      // 수정 모드: 기존 매물 업데이트
      updateMeeting(activeMeeting.id, {
        properties: activeMeeting.properties.map(p =>
          p.id === editingPropertyId
            ? {
                ...p,
                rawInput: propertyText,
                roomName: parsedRoomName,
                jibun: parsedJibun,
                agency: parsedAgency,
                agencyPhone: parsedAgencyPhone,
                parsedText: parsedText || propertyText
              }
            : p
        )
      });
    } else {
      // 신규 등록 모드: 새로운 매물 추가
      const newProperty: Property = {
        id: generateId(),
        rawInput: propertyText,
        roomName: parsedRoomName,
        jibun: parsedJibun,
        agency: parsedAgency,
        agencyPhone: parsedAgencyPhone,
        photos: [],
        parsedText: parsedText || propertyText
      };

      updateMeeting(activeMeeting.id, {
        properties: [...activeMeeting.properties, newProperty]
      });
    }

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
    
    updateMeeting(activeMeeting.id, {
      properties: activeMeeting.properties.filter(p => p.id !== propId)
    });
  };

  // 매물의 구조화된 필드를 업데이트합니다
  const updatePropertyField = (propId: string, field: keyof Property, value: string) => {
    if (!activeMeeting) return;
    updateMeeting(activeMeeting.id, {
      properties: activeMeeting.properties.map(p =>
        p.id === propId ? { ...p, [field]: value } : p
      )
    });
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

      // 파싱 성공 여부 피드백
      const parsedCount = [fields.roomName, fields.jibun, fields.agency, fields.agencyPhone]
        .filter(f => f).length;

      const platformName = selectedPlatform === 'TEN' ? 'TEN' : '네이버부동산';

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
    if (!photoUploadPropId || !activeMeeting) return;

    const currentProp = activeMeeting.properties.find(p => p.id === photoUploadPropId);
    if (!currentProp) return;

    const remainingSlots = 4 - currentProp.photos.length;
    if (remainingSlots <= 0) {
      alert('사진은 최대 4장까지만 등록 가능합니다.');
      return;
    }

    // File size validation (1MB max)
    const MAX_FILE_SIZE = 1024 * 1024;
    const validFiles: File[] = [];
    let invalidCount = 0;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        invalidCount++;
      } else {
        validFiles.push(file);
      }
    }

    if (invalidCount > 0) {
      alert(`${invalidCount}개의 파일이 1MB를 초과하여 제외되었습니다.`);
    }

    if (validFiles.length === 0) {
      return;
    }

    const filesToProcess = validFiles.slice(0, remainingSlots);

    try {
      // Step 1: Show Base64 previews immediately (optimistic UI)
      const base64Previews = await Promise.all(
        filesToProcess.map(file => fileToBase64(file))
      );

      const startIndex = currentProp.photos.length;
      updateMeeting(activeMeeting.id, {
        properties: activeMeeting.properties.map(p =>
          p.id === photoUploadPropId
            ? { ...p, photos: [...p.photos, ...base64Previews] }
            : p
        )
      });

      // Step 2: Upload to Firebase Storage in background
      const storageUrls = await uploadPhotos(
        filesToProcess,
        customer.id,
        activeMeeting.id,
        photoUploadPropId,
        startIndex
      );

      // Step 3: Replace Base64 with Storage URLs
      const updatedPhotos = [...currentProp.photos, ...storageUrls];

      updateMeeting(activeMeeting.id, {
        properties: activeMeeting.properties.map(p =>
          p.id === photoUploadPropId
            ? { ...p, photos: updatedPhotos }
            : p
        )
      });

      setPhotoUploadPropId(null);
    } catch (error) {
      console.error('사진 업로드 중 오류:', error);
      alert('사진 업로드 중 오류가 발생했습니다.');

      // Revert optimistic update
      updateMeeting(activeMeeting.id, {
        properties: activeMeeting.properties.map(p =>
          p.id === photoUploadPropId
            ? { ...p, photos: currentProp.photos }
            : p
        )
      });

      setPhotoUploadPropId(null);
    }
  };

  const removePhoto = async (propId: string, photoIndex: number) => {
    if (!activeMeeting) return;
    const currentProp = activeMeeting.properties.find(p => p.id === propId);
    if (!currentProp) return;

    try {
      const photoUrl = currentProp.photos[photoIndex];
      const updatedPhotos = currentProp.photos.filter((_, i) => i !== photoIndex);

      // Optimistic update
      updateMeeting(activeMeeting.id, {
        properties: activeMeeting.properties.map(p =>
          p.id === propId ? { ...p, photos: updatedPhotos } : p
        )
      });

      // Delete from Firebase Storage (don't await - fire and forget)
      deletePhoto(photoUrl).catch(() => {});
    } catch (error) {
      console.error('사진 삭제 중 오류:', error);
      alert('사진 삭제 중 오류가 발생했습니다.');
    }
  };

  // --- PDF Generation ---
  const generatePDF = async () => {
    if (!reportRef.current || !activeMeeting) return;
    
    const reportEl = reportRef.current;
    reportEl.style.display = 'block';

    try {
      const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${customer.name}_${activeMeeting.round}차미팅_매물보고서.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      reportEl.style.display = 'none';
    }
  };

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">미팅 관리</h2>
          <button 
            onClick={generatePDF}
            disabled={!activeMeeting}
            className={`px-3 py-1.5 rounded text-sm flex items-center ${activeMeeting ? 'bg-secondary text-white hover:bg-slate-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <i className="fas fa-file-pdf mr-2"></i>보고서
          </button>
        </div>

        {/* Meeting Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-2 pb-1 no-scrollbar items-center">
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
              <span className={`text-xs ${activeMeetingId === meeting.id ? 'text-blue-200' : 'text-gray-400'}`}>
                {meeting.date ? new Date(meeting.date).toLocaleDateString() : '미정'}
              </span>
              <button 
                onClick={(e) => handleDeleteMeeting(e, meeting.id)}
                className={`ml-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white ${activeMeetingId === meeting.id ? 'text-blue-200' : 'text-gray-300'}`}
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
            </div>
          ))}
          <button 
            onClick={handleAddMeeting}
            className="flex-shrink-0 px-3 py-2 rounded-full border border-dashed border-gray-400 text-gray-500 text-sm hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors"
          >
            <i className="fas fa-plus mr-1"></i>추가
          </button>
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
            {/* Date Picker */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                <i className="far fa-calendar-alt mr-2 text-primary"></i>
                {activeMeeting.round}차 미팅 일시
              </label>
              <input 
                type="datetime-local"
                value={activeMeeting.date}
                onChange={handleDateChange}
                className="w-full border border-gray-300 rounded p-2 focus:ring-primary focus:border-primary"
              />
            </div>

                        {/* Add Property Section */}

                        <div className="space-y-4">

                          {/* Add Property Button */}

                          {!isAddingProperty ? (

                            <button

                              onClick={() => setIsAddingProperty(true)}

                              className="w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary hover:text-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"

                            >

                              <i className="fas fa-home"></i> 매물 추가하기

                            </button>

                          ) : (

                            <div className="bg-white border border-primary rounded-lg p-4 shadow-md">

                              <div className="flex justify-between items-center mb-3">

                                <h3 className="font-bold text-sm text-primary">새 매물 정보 입력</h3>
            

                                <div className="flex items-center gap-2">

                                  {/* 플랫폼 선택 토글 버튼 */}

                                  <div className="flex border border-gray-300 rounded overflow-hidden text-xs">

                                    <button

                                      onClick={() => setSelectedPlatform('TEN')}

                                      className={`px-3 py-1.5 transition-colors ${selectedPlatform === 'TEN' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}

                                    >

                                      TEN

                                    </button>

                                    <button

                                      onClick={() => setSelectedPlatform('NAVER')}

                                      className={`px-3 py-1.5 transition-colors border-l border-gray-300 ${selectedPlatform === 'NAVER' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}

                                    >

                                      네이버

                                    </button>

                                  </div>
            

                                  {/* 자동 생성 버튼 */}

                                  <button

                                    onClick={handleAutoParse}

                                    className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs flex items-center gap-1"

                                  >

                                    <i className="fas fa-bolt"></i>

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

                                  <label className="block text-xs text-gray-600 mb-1">호실명</label>

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

                        </div>

            {/* 등록된 매물 미리보기 목록 */}
            {activeMeeting?.properties && activeMeeting.properties.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-sm text-primary mb-3">등록된 매물 ({activeMeeting.properties.length}개)</h3>
                <div className="space-y-3">
                  {activeMeeting.properties.map((prop, idx) => (
                    <div key={prop.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      {/* 소재지 및 호실 */}
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 font-bold mb-1">소재지</p>
                          <p className="text-sm font-semibold">{prop.roomName || '미등록'}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 font-bold mb-1">호실</p>
                          {editingUnitId === prop.id ? (
                            <input
                              autoFocus
                              type="text"
                              value={prop.unit || ''}
                              onChange={(e) => updatePropertyField(prop.id, 'unit', e.target.value)}
                              onBlur={() => setEditingUnitId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingUnitId(null)}
                              className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            <div
                              onDoubleClick={() => setEditingUnitId(prop.id)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer hover:bg-blue-50 min-h-[28px] flex items-center"
                            >
                              {prop.unit || '(호실)'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 시간 선택 및 상태 드롭다운 */}
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 flex gap-1 items-center">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="시"
                            value={prop.visitTime ? prop.visitTime.split(':')[0] : ''}
                            onChange={(e) => {
                              const hour = e.target.value || '00';
                              const minute = prop.visitTime ? prop.visitTime.split(':')[1] : '00';
                              updatePropertyField(prop.id, 'visitTime', `${hour.padStart(2, '0')}:${minute}`);
                            }}
                            className="w-12 px-2 py-1 border border-gray-300 rounded text-xs text-center"
                          />
                          <span className="text-xs text-gray-600">시</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="분"
                            value={prop.visitTime ? prop.visitTime.split(':')[1] : ''}
                            onChange={(e) => {
                              const hour = prop.visitTime ? prop.visitTime.split(':')[0] : '00';
                              const minute = e.target.value || '00';
                              updatePropertyField(prop.id, 'visitTime', `${hour}:${minute.padStart(2, '0')}`);
                            }}
                            className="w-12 px-2 py-1 border border-gray-300 rounded text-xs text-center"
                          />
                          <span className="text-xs text-gray-600">분</span>
                        </div>

                        <div className="flex-1">
                          <select
                            value={prop.status || '확인전'}
                            onChange={(e) => {
                              updatePropertyField(prop.id, 'status', e.target.value as any);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="확인전">확인전</option>
                            <option value="확인중">확인중</option>
                            <option value="볼수있음">볼수있음</option>
                            <option value="현장방문완료">현장방문완료</option>
                          </select>
                        </div>
                      </div>

                      {/* 미리보기 정보 */}
                      <div className="mb-3">
                        {/* 지번과 지도 버튼 */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm">
                            <span className="text-gray-600">지번:</span> <span className="font-semibold">{prop.jibun || '미등록'}</span>
                          </div>
                          {prop.jibun && (
                            <button
                              onClick={() => {
                                const mapUrl = `https://map.naver.com/index.nhn?query=${encodeURIComponent(prop.jibun)}`;
                                window.open(mapUrl, '_blank');
                              }}
                              className="px-3 py-1 bg-yellow-400 text-black rounded text-sm hover:bg-yellow-500 font-bold"
                            >
                              지도
                            </button>
                          )}
                        </div>

                        {/* 부동산과 연락처 */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">부동산:</span> <span className="font-semibold">{prop.agency || '미등록'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">연락처:</span>
                            {prop.agencyPhone && isValidPhoneNumber(prop.agencyPhone) ? (
                              <a
                                href={generateSmsLink(prop.agencyPhone)}
                                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                title="클릭하면 SMS로 연결됩니다"
                              >
                                {prop.agencyPhone}
                              </a>
                            ) : (
                              <span className="font-semibold">{prop.agencyPhone || '미등록'}</span>
                            )}
                          </div>
                        </div>

                        {/* 정리본 텍스트 미리보기 */}
                        {prop.parsedText && (
                          <div className="mt-2 p-2 bg-white border border-gray-300 rounded">
                            <pre className="whitespace-pre-wrap text-gray-700 text-sm font-semibold">
                              {prop.parsedText}
                            </pre>
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
                          <div className="grid grid-cols-4 gap-2">
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

                      {/* 수정/삭제 버튼 */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            // 수정 모드: 해당 매물 정보로 폼 채우기
                            setPropertyText(prop.rawInput || prop.parsedText || '');
                            setParsedRoomName(prop.roomName);
                            setParsedJibun(prop.jibun);
                            setParsedAgency(prop.agency);
                            setParsedAgencyPhone(prop.agencyPhone);
                            setParsedText(prop.parsedText || '');
                            setEditingPropertyId(prop.id);
                            setIsAddingProperty(true);
                          }}
                          className="flex-1 px-2 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 font-semibold"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('이 매물을 삭제하시겠습니까?')) {
                              if (activeMeeting) {
                                const updated = {
                                  ...activeMeeting,
                                  properties: activeMeeting.properties.filter(p => p.id !== prop.id)
                                };
                                onUpdate({ ...customer, meetings: customer.meetings.map(m => m.id === activeMeeting.id ? updated : m) });
                              }
                            }
                          }}
                          className="flex-1 px-2 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 font-semibold"
                        >
                          삭제
                        </button>
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

      {/* Hidden PDF Report Template */}
      <div 
        ref={reportRef} 
        style={{ display: 'none', width: '210mm', minHeight: '297mm', padding: '20mm', backgroundColor: 'white' }}
      >
        <div className="border-b-2 border-primary pb-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">매물 안내 보고서</h1>
          <p className="text-gray-500 mt-2">{activeMeeting?.round}차 미팅 자료</p>
        </div>
        
        <div className="mb-8 grid grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg">
          <div>
            <p className="text-sm text-gray-500 mb-1">고객명</p>
            <p className="font-bold text-lg">{customer.name} 고객님</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">미팅일시</p>
            <p className="font-bold text-lg">
              {activeMeeting?.date ? new Date(activeMeeting.date).toLocaleString() : '미정'}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {activeMeeting?.properties.map((prop, idx) => (
            <div key={prop.id} className="break-inside-avoid border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-3 border-b border-gray-200">
                 <h2 className="text-xl font-bold text-primary">매물 #{idx + 1}</h2>
              </div>
              <div className="p-5">
                {/* 구조화된 정보 표시 */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
                    <div>
                      <p className="text-sm text-gray-500">호실명</p>
                      <p className="font-bold text-lg">{prop.roomName || '미등록'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">지번</p>
                      <p className="font-bold text-lg">{prop.jibun || '미등록'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">부동산</p>
                      <p className="font-bold text-lg">{prop.agency || '미등록'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">연락처</p>
                      <p className="font-bold text-lg">{prop.agencyPhone || '미등록'}</p>
                    </div>
                  </div>

                  {/* 정리본 텍스트 (있으면 표시) */}
                  {prop.parsedText && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm text-gray-500 mb-2">상세 정보</p>
                      <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
                        {prop.parsedText}
                      </p>
                    </div>
                  )}
                </div>
                {prop.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {prop.photos.map((p, i) => (
                      <div key={i} className="aspect-video bg-gray-100 rounded overflow-hidden border">
                        <img src={p} className="w-full h-full object-cover" alt="property" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
