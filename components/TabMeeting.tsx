import React, { useState, useRef, useEffect } from 'react';
import { Customer, Property, Meeting } from '../types';
import { generateId } from '../services/storage';
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

    const newProperty: Property = {
      id: generateId(),
      description: propertyText,
      rawInput: propertyText,
      photos: []
    };

    updateMeeting(activeMeeting.id, {
      properties: [...activeMeeting.properties, newProperty]
    });
    
    setPropertyText('');
    setIsAddingProperty(false);
  };

  const handleDeleteProperty = (propId: string) => {
    if (!window.confirm('매물을 삭제하시겠습니까?') || !activeMeeting) return;
    
    updateMeeting(activeMeeting.id, {
      properties: activeMeeting.properties.filter(p => p.id !== propId)
    });
  };

  const updatePropertyDescription = (propId: string, text: string) => {
    if (!activeMeeting) return;
    updateMeeting(activeMeeting.id, {
      properties: activeMeeting.properties.map(p => 
        p.id === propId ? { ...p, description: text } : p
      )
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    if (!e.target.files || !activeMeeting) return;
    
    const files = Array.from(e.target.files);
    const currentProp = activeMeeting.properties.find(p => p.id === propId);
    if (!currentProp) return;

    const remainingSlots = 4 - currentProp.photos.length;
    if (remainingSlots <= 0) {
      alert('사진은 최대 4장까지만 등록 가능합니다.');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    Promise.all(filesToProcess.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file as Blob);
      });
    })).then(base64Images => {
      updateMeeting(activeMeeting.id, {
        properties: activeMeeting.properties.map(p => 
          p.id === propId ? { ...p, photos: [...p.photos, ...base64Images] } : p
        )
      });
    });
  };

  const removePhoto = (propId: string, photoIndex: number) => {
    if (!activeMeeting) return;
    const currentProp = activeMeeting.properties.find(p => p.id === propId);
    if (!currentProp) return;

    updateMeeting(activeMeeting.id, {
      properties: activeMeeting.properties.map(p => 
        p.id === propId ? { ...p, photos: p.photos.filter((_, i) => i !== photoIndex) } : p
      )
    });
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
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm cursor-pointer whitespace-nowrap flex items-center gap-2 transition-all ${
                activeMeetingId === meeting.id 
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
                className={`ml-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white ${
                    activeMeetingId === meeting.id ? 'text-blue-200' : 'text-gray-300'
                }`}
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

            {/* Property List */}
            <div className="space-y-4">
              {activeMeeting.properties.map((prop, idx) => (
                <div key={prop.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-sm text-gray-800 flex items-center">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mr-2">매물 {idx + 1}</span>
                    </h3>
                    <button 
                      onClick={() => handleDeleteProperty(prop.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <i className="fas fa-trash text-sm"></i>
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <textarea 
                      className="w-full mt-1 border rounded p-2 text-sm h-24 resize-y focus:ring-1 focus:ring-primary outline-none"
                      value={prop.description}
                      onChange={(e) => updatePropertyDescription(prop.id, e.target.value)}
                      placeholder="매물 상세 정보를 입력하세요..."
                    />
                  </div>

                  {/* Photos */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500">사진 ({prop.photos.length}/4)</span>
                      {prop.photos.length < 4 && (
                        <label className="cursor-pointer text-primary hover:text-blue-700 text-sm font-medium">
                          <i className="fas fa-camera mr-1"></i>사진추가
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={(e) => handlePhotoUpload(e, prop.id)}
                          />
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {prop.photos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative aspect-square bg-gray-100 rounded overflow-hidden group border">
                          <img src={photo} alt="prop" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removePhoto(prop.id, pIdx)}
                            className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

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
                  <h3 className="font-bold mb-2 text-sm text-primary">새 매물 정보 입력</h3>
                  <textarea 
                    autoFocus
                    className="w-full border p-2 rounded mb-3 h-32 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="매물 정보를 붙여넣으세요..."
                    value={propertyText}
                    onChange={(e) => setPropertyText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setIsAddingProperty(false)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm"
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleAddProperty}
                      className="px-4 py-1.5 bg-primary text-white rounded hover:bg-blue-600 text-sm"
                    >
                      등록
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
                <p className="whitespace-pre-wrap mb-6 text-gray-700 leading-relaxed">{prop.description}</p>
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
    </div>
  );
};