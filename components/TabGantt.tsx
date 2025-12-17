import React, { useState } from 'react';
import { Customer, ChecklistItem, Meeting } from '../types';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

// Unified interface for rendering
interface TimelineEvent {
  id: string;
  type: 'CHECKLIST' | 'MEETING';
  date: Date;
  title: string;
  subText?: string;
  originalItem: ChecklistItem | Meeting;
}

export const TabGantt: React.FC<Props> = ({ customer, onUpdate }) => {
  // Memo Modal State
  const [memoModalItem, setMemoModalItem] = useState<ChecklistItem | null>(null);
  const [memoModalMode, setMemoModalMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [memoText, setMemoText] = useState('');

  // 1. Merge Checklists and Meetings
  const events: TimelineEvent[] = [];

  // Add Checklists
  customer.checklists.forEach(item => {
    events.push({
      id: item.id,
      type: 'CHECKLIST',
      date: new Date(item.createdAt),
      title: item.text,
      originalItem: item
    });
  });

  // Add Meetings
  if (customer.meetings) {
    customer.meetings.forEach(meeting => {
      // Use meeting date if set, otherwise createdAt
      const date = meeting.date ? new Date(meeting.date) : new Date(meeting.createdAt);
      events.push({
        id: meeting.id,
        type: 'MEETING',
        date: date,
        title: `${meeting.round}차 미팅 ${meeting.date ? (new Date() < new Date(meeting.date) ? '(예정)' : '(완료)') : '(일자 미정)'}`,
        subText: `매물 ${meeting.properties.length}건`,
        originalItem: meeting
      });
    });
  }

  // 2. Sort by Date Descending (Newest first)
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  // 3. Group by Date String
  const grouped: Record<string, TimelineEvent[]> = {};
  
  events.forEach(event => {
    const dateKey = event.date.toLocaleDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });

  // Open Memo (Only for Checklist items currently, could extend to meetings)
  const openMemo = (item: ChecklistItem) => {
    setMemoModalItem(item);
    setMemoText(item.memo);
    setMemoModalMode(item.memo ? 'VIEW' : 'EDIT');
  };

  // Save Memo
  const saveMemo = () => {
    if (memoModalItem) {
      const updatedChecklists = customer.checklists.map(item =>
        item.id === memoModalItem.id ? { ...item, memo: memoText } : item
      );
      
      onUpdate({
        ...customer,
        checklists: updatedChecklists
      });
      
      setMemoModalItem({ ...memoModalItem, memo: memoText });
      setMemoModalMode('VIEW');
    }
  };

  return (
    <div className="h-full bg-white p-4 overflow-y-auto custom-scrollbar">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <i className="fas fa-history mr-2 text-primary"></i>
        여정 관리 (History)
      </h2>
      
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <i className="fas fa-stream text-4xl mb-2 opacity-20"></i>
          <p>기록된 여정이 없습니다.</p>
        </div>
      ) : (
        <div className="relative pl-2 md:pl-4">
            {/* Main Vertical Timeline Line */}
            <div className="absolute left-[19px] top-2 bottom-0 w-0.5 bg-gray-200"></div>

            {Object.entries(grouped).map(([date, items]) => (
                <div key={date} className="mb-8 relative">
                    {/* Date Header Group */}
                    <div className="flex items-center mb-4 relative z-10">
                        <div className="w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm shrink-0 mr-3 box-content"></div>
                        <span className="bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-full text-sm shadow-sm border border-gray-200">
                            {date}
                        </span>
                    </div>

                    {/* Items for this date */}
                    <div className="space-y-3 pl-10">
                        {items.map(event => {
                          const isMeeting = event.type === 'MEETING';
                          const checklistItem = !isMeeting ? (event.originalItem as ChecklistItem) : null;
                          
                          return (
                            <div key={event.id} className={`border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow relative group ${isMeeting ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
                                {/* Connector Line (Horizontal) */}
                                <div className={`absolute -left-6 top-5 w-4 h-px ${isMeeting ? 'bg-blue-300' : 'bg-gray-200'}`}></div>
                                {/* Connector Dot on Timeline */}
                                <div className={`absolute -left-[23px] top-[18px] w-1.5 h-1.5 rounded-full ${isMeeting ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                      <h4 className={`font-bold text-sm leading-snug break-all ${isMeeting ? 'text-blue-800' : 'text-gray-800'}`}>
                                          {isMeeting && <i className="fas fa-handshake mr-1.5"></i>}
                                          {event.title}
                                      </h4>
                                      {event.subText && (
                                        <p className="text-xs text-gray-500 mt-1 pl-0.5">{event.subText}</p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-[10px] text-gray-400 shrink-0 bg-white bg-opacity-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                                          {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {!isMeeting && (
                                        <button 
                                          onClick={() => openMemo(checklistItem!)}
                                          className="text-gray-300 hover:text-blue-500 transition-colors p-1"
                                          title="메모 관리"
                                        >
                                          <i className="fas fa-sticky-note text-xs"></i>
                                        </button>
                                      )}
                                    </div>
                                </div>
                                
                                {/* Show Memo for Checklist Items */}
                                {!isMeeting && checklistItem?.memo && (
                                    <div 
                                      className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-100 cursor-pointer hover:bg-yellow-100 transition-colors"
                                      onClick={() => openMemo(checklistItem)}
                                      title="클릭하여 메모 수정"
                                    >
                                        <i className="fas fa-sticky-note mr-1 text-yellow-500"></i>
                                        {checklistItem.memo}
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Memo Modal (Only for Checklists currently) */}
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
                <div className="min-h-[120px] whitespace-pre-wrap text-gray-700">
                  {memoText || <span className="text-gray-400 italic">메모가 없습니다.</span>}
                </div>
              ) : (
                <textarea 
                  className="w-full h-40 border p-2 rounded resize-none focus:ring-1 focus:ring-primary outline-none"
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
    </div>
  );
};