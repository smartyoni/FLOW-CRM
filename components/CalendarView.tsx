import React, { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Customer, ManualEvent } from '../types';
import { storage } from '../services/firebase';

interface CalendarViewProps {
  customers: Customer[];
  manualEvents?: ManualEvent[];
  onSelectCustomer: (customer: Customer) => void;
  onMenuClick?: () => void;
  onCreateManualEvent?: (event: ManualEvent) => Promise<void>;
  onUpdateManualEvent?: (id: string, updates: Partial<ManualEvent>) => Promise<void>;
  onDeleteManualEvent?: (id: string) => Promise<void>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  customers,
  manualEvents = [],
  onSelectCustomer,
  onMenuClick,
  onCreateManualEvent,
  onUpdateManualEvent,
  onDeleteManualEvent
}) => {
  // 화면 크기에 따른 초기 뷰 설정
  const isMobile = window.innerWidth < 1024;
  const initialView = isMobile ? 'timeGridDay' : 'dayGridMonth';

  // 수동 일정 편집 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ id?: string, title: string, start: string, end: string, description: string }>({
    title: '', start: '', end: '', description: ''
  });
  // 수동 일정 보기 모달 상태
  const [viewEvent, setViewEvent] = useState<ManualEvent | null>(null);
  // 종일 일정 전체 보기 모달
  const [allDayModalEvents, setAllDayModalEvents] = useState<any[]>([]);
  // 종일 일정 모달 드래그 앤 드롭 상태
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  // 캘린더 컨테이너 ref
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // 고객 데이터를 FullCalendar 이벤트 형식으로 변환
  const events = useMemo(() => {
    const allEvents: any[] = [];

    customers.forEach(customer => {
      // ... (이벤트 매핑 로직은 동일)
      // 1. 미팅 일정
      customer.meetings?.forEach(meeting => {
        if (meeting.date) {
          allEvents.push({
            id: `meeting-${meeting.id}`,
            title: `🤝 미팅: ${customer.name}`,
            start: meeting.date,
            backgroundColor: '#f3e8ff', // soft purple
            borderColor: '#c084fc',
            textColor: '#7e22ce',
            extendedProps: { customer, type: 'meeting' }
          });
        }
      });

      // 2. 계약서 작성일
      if (customer.contractDate) {
        allEvents.push({
          id: `contract-${customer.id}`,
          title: `📝 계약: ${customer.name}`,
          start: customer.contractDate,
          backgroundColor: '#dcfce7', // soft green
          borderColor: '#4ade80',
          textColor: '#15803d',
          allDay: true,
          extendedProps: { customer, type: 'contract' }
        });
      }

      // 3. 잔금일
      if (customer.paymentDate) {
        allEvents.push({
          id: `payment-${customer.id}`,
          title: `💰 잔금: ${customer.name}`,
          start: customer.paymentDate,
          backgroundColor: '#fee2e2', // soft red
          borderColor: '#f87171',
          textColor: '#b91c1c',
          allDay: true,
          extendedProps: { customer, type: 'payment' }
        });
      }

      // 4. 입주예정일
      if (customer.moveInDate) {
        allEvents.push({
          id: `movein-${customer.id}`,
          title: `🏠 입주: ${customer.name}`,
          start: customer.moveInDate,
          backgroundColor: '#ede9fe', // soft violet
          borderColor: '#a78bfa',
          textColor: '#5b21b6',
          allDay: true,
          extendedProps: { customer, type: 'movein' }
        });
      }

      // 6. 접수일
      if (customer.registrationDate) {
        allEvents.push({
          id: `reg-${customer.id}`,
          title: `📋 접수: ${customer.name}`,
          start: customer.registrationDate,
          backgroundColor: '#dbeafe', // soft blue
          borderColor: '#60a5fa',
          textColor: '#1e40af',
          allDay: true,
          extendedProps: { customer, type: 'registration' }
        });
      }
    });

    // 수동 일정 추가
    manualEvents.forEach(me => {
      allEvents.push({
        id: `manual-${me.id}`,
        title: me.title,
        start: me.start,
        end: me.end,
        backgroundColor: '#eff6ff', // 은은한 파란색 (blue-50)
        borderColor: '#000000',     // 검정 외곽선
        textColor: '#1e3a8a',       // 진한 파란색 텍스트 (blue-900)
        editable: true,             // 캘린더 드래그앤드롭 활성화
        order: me.order || 0,       // 정렬 순서 적용
        extendedProps: { isManual: true, manualEvent: me }
      });
    });

    return allEvents;
  }, [customers, manualEvents]);

  const handleEventClick = (info: any) => {
    const { isManual, manualEvent, customer } = info.event.extendedProps;

    if (isManual && manualEvent) {
      // 수동 일정 클릭 시: 보기 모달 열기
      setViewEvent(manualEvent);
    } else if (customer) {
      // 기존 자동 일정 클릭 시: 고객 상세로 이동
      onSelectCustomer(customer);
    }
  };

  const openEditFromView = () => {
    if (!viewEvent) return;
    setModalData({
      id: viewEvent.id,
      title: viewEvent.title,
      start: viewEvent.start.length > 10 ? viewEvent.start.substring(0, 16) : viewEvent.start,
      end: viewEvent.end ? (viewEvent.end.length > 10 ? viewEvent.end.substring(0, 16) : viewEvent.end) : '',
      description: viewEvent.description || ''
    });
    setViewEvent(null);
    setIsModalOpen(true);
  };

  const handleDeleteFromView = async () => {
    if (!viewEvent || !onDeleteManualEvent) return;
    if (window.confirm('이 일정을 삭제하시겠습니까?')) {
      await onDeleteManualEvent(viewEvent.id);
      setViewEvent(null);
    }
  };

  const handleEventDrop = async (info: any) => {
    const { isManual, manualEvent } = info.event.extendedProps;
    if (!isManual || !onUpdateManualEvent) {
      info.revert();
      return;
    }

    const newStart = info.event.allDay ? info.event.startStr : info.event.startStr.substring(0, 16);
    const newEnd = info.event.end ? (info.event.allDay ? info.event.endStr : info.event.endStr.substring(0, 16)) : undefined;

    try {
      await onUpdateManualEvent(manualEvent.id, {
        start: newStart,
        end: newEnd,
        allDay: info.event.allDay
      });
    } catch {
      info.revert();
    }
  };

  const handleEventResize = async (info: any) => {
    const { isManual, manualEvent } = info.event.extendedProps;
    if (!isManual || !onUpdateManualEvent) {
      info.revert();
      return;
    }

    const newStart = info.event.allDay ? info.event.startStr : info.event.startStr.substring(0, 16);
    const newEnd = info.event.end ? (info.event.allDay ? info.event.endStr : info.event.endStr.substring(0, 16)) : undefined;

    try {
      await onUpdateManualEvent(manualEvent.id, {
        start: newStart,
        end: newEnd,
        allDay: info.event.allDay
      });
    } catch {
      info.revert();
    }
  };

  const handleDateSelect = (info: any) => {
    // 날짜/시간 선택 시: 새 수동 일정 추가 모달 열기
    // allDay 선택이면 날짜만 (YYYY-MM-DD), 아니면 datetime-local 형식
    const startStr = info.allDay
      ? info.startStr  // YYYY-MM-DD
      : info.startStr.substring(0, 16); // YYYY-MM-DDTHH:mm
    const endStr = info.allDay
      ? ''
      : info.endStr.substring(0, 16);
    setModalData({
      id: undefined,
      title: '',
      start: startStr,
      end: endStr,
      description: ''
    });
    setIsModalOpen(true);
  };

  // 종일 라벨 클릭 시 현재 캘린더 날짜의 종일 일정만 모달로 표시
  const handleAllDayLabelClick = () => {
    const todayEvents = events.filter(e => {
      if (!e.allDay) return false;
      return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0)); // 정렬 적용

    if (todayEvents.length > 0) {
      setAllDayModalEvents(todayEvents);
    }
  };

  // 모달 내 순서 변경을 위한 드래그 핸들러
  const handleModalDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox fallback
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 드롭 허용
    e.dataTransfer.dropEffect = 'move';
  };

  const handleModalDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex || !onUpdateManualEvent) {
      setDraggedIdx(null);
      return;
    }

    const eventsCopy = [...allDayModalEvents];
    const item = eventsCopy.splice(draggedIdx, 1)[0];
    eventsCopy.splice(targetIndex, 0, item);

    setAllDayModalEvents(eventsCopy);
    setDraggedIdx(null);

    // 새 순서대로 order 부여하며 DB 업데이트
    for (let i = 0; i < eventsCopy.length; i++) {
      const ev = eventsCopy[i];
      const manualEvent = ev.extendedProps?.manualEvent;
      if (manualEvent) {
        await onUpdateManualEvent(manualEvent.id, { order: i });
      }
    }
  };

  // 컴플리트 후 종일 라벨에 클릭 이벤트 연결
  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;

    const attachListener = () => {
      // timeGrid 뷰의 종일 라벨 셀 (.fc-timegrid-axis)
      const allDayLabel = container.querySelector('.fc-timegrid-axis');
      if (allDayLabel) {
        const handler = (e: Event) => {
          e.stopPropagation();
          handleAllDayLabelClick();
        };
        allDayLabel.addEventListener('click', handler);
        return () => allDayLabel.removeEventListener('click', handler);
      }
    };

    // 랜더링 완료 후 연결
    const timer = setTimeout(attachListener, 500);
    return () => clearTimeout(timer);
  }, [events]);


  const handleSaveModal = async () => {
    if (!modalData.title) return;

    // 시간 미입력 시 종일 일정으로 처리
    const hasTime = modalData.start && modalData.start.includes('T');
    const today = new Date().toISOString().split('T')[0];
    const eventStart = modalData.start || today; // 시간 없으면 오늘 날짜
    const isAllDay = !hasTime;

    const eventPayload: any = {
      title: modalData.title,
      start: eventStart,
      end: (!isAllDay && modalData.end) ? modalData.end : undefined,
      description: modalData.description,
      allDay: isAllDay
    };

    if (modalData.id && onUpdateManualEvent) {
      // 업데이트
      await onUpdateManualEvent(modalData.id, eventPayload);
    } else if (onCreateManualEvent) {
      // 생성
      await onCreateManualEvent({
        id: Math.random().toString(36).substr(2, 9),
        ...eventPayload,
        createdAt: Date.now()
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteModal = async () => {
    if (modalData.id && onDeleteManualEvent) {
      if (window.confirm('이 일정을 삭제하시겠습니까?')) {
        await onDeleteManualEvent(modalData.id);
        setIsModalOpen(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-calendar-alt text-blue-600"></i>
            캘린더 일정
          </h2>
        </div>
      </header>

      {/* 캘린더 메인 영역 */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-full p-2 lg:p-4 calendar-container" ref={calendarContainerRef}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            eventOrder="order,start"
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            selectable={true}
            select={handleDateSelect}
            views={{
              dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'long' }
              },
              timeGridWeek: {
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderFormat: { month: 'numeric', day: 'numeric', weekday: 'short' }
              },
              timeGridDay: {
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderFormat: { month: 'numeric', day: 'numeric', weekday: 'short' }
              }
            }}
            allDayText="종일"
            locale="ko"
            height="100%"
            dayMaxEvents={true}
            navLinks={true}
            buttonText={{
              today: '오늘',
              month: '월간',
              week: '주간',
              day: '일간'
            }}
          />
        </div>
      </div>

      {/* 종일 일정 전체 보기 모달 */}
      {allDayModalEvents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAllDayModalEvents([])}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideDown" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <i className="fas fa-calendar-day text-blue-500"></i>종일 일정 전체 보기
              </h3>
              <button onClick={() => setAllDayModalEvents([])} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {allDayModalEvents.map((ev, idx) => {
                const isManual = ev.extendedProps?.isManual;
                return (
                  <div
                    key={ev.id || idx}
                    draggable={isManual}
                    onDragStart={isManual ? (e) => handleModalDragStart(e, idx) : undefined}
                    onDragOver={isManual ? handleModalDragOver : undefined}
                    onDrop={isManual ? (e) => handleModalDrop(e, idx) : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isManual
                        ? 'cursor-move hover:bg-slate-100 bg-white ring-1 ring-slate-200 shadow-sm'
                        : 'bg-slate-50 opacity-90'
                      } ${draggedIdx === idx ? 'opacity-50' : ''}`}
                    style={{ borderLeft: `3px solid ${ev.borderColor || ev.backgroundColor || '#3b82f6'}` }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ev.borderColor || ev.backgroundColor || '#3b82f6' }}
                    ></div>
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                        <p className="text-xs text-slate-400">{ev.start}</p>
                      </div>
                      {isManual && <i className="fas fa-grip-lines text-slate-300"></i>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 수동 일정 보기 모달 (Google Calendar 스타일) */}
      {viewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewEvent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideDown" onClick={e => e.stopPropagation()}>
            {/* 상단 컬러 바 & 닫기 */}
            <div className="h-2 bg-blue-500 rounded-t-2xl"></div>
            <div className="px-5 pt-4 pb-2 flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h3 className="text-xl font-bold text-slate-800 leading-tight">{viewEvent.title}</h3>
              </div>
              <button onClick={() => setViewEvent(null)} className="text-slate-400 hover:text-slate-600 transition-colors mt-0.5">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* 일정 상세 정보 */}
            <div className="px-5 pb-4 space-y-3">
              {/* 시간 */}
              <div className="flex items-start gap-3 text-slate-600">
                <i className="fas fa-clock mt-0.5 text-slate-400 w-4 shrink-0"></i>
                <div className="text-sm">
                  {viewEvent.allDay ? (
                    <span>{viewEvent.start} (종일)</span>
                  ) : (
                    <span>
                      {viewEvent.start?.replace('T', ' ')}
                      {viewEvent.end ? ` ~ ${viewEvent.end.replace('T', ' ')}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* 설명 */}
              {viewEvent.description && (
                <div className="flex items-start gap-3 text-slate-600">
                  <i className="fas fa-align-left mt-0.5 text-slate-400 w-4 shrink-0"></i>
                  <p className="text-sm whitespace-pre-wrap">{viewEvent.description}</p>
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleDeleteFromView}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
              >
                <i className="fas fa-trash-alt"></i>삭제
              </button>
              <button
                onClick={openEditFromView}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <i className="fas fa-pencil-alt"></i>수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수동 일정 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideDown">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {modalData.id ? '일정 수정' : '새 일정 추가'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">일정 제목 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={modalData.title}
                  onChange={e => setModalData({ ...modalData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="일정 제목을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">시작 시간 <span className="text-xs font-normal text-slate-400">(미입력 시 종일)</span></label>
                  <input
                    type="datetime-local"
                    value={modalData.start}
                    onChange={e => setModalData({ ...modalData, start: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">종료 시간</label>
                  <input
                    type="datetime-local"
                    value={modalData.end}
                    onChange={e => setModalData({ ...modalData, end: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">설명</label>
                <textarea
                  value={modalData.description}
                  onChange={e => setModalData({ ...modalData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  rows={3}
                  placeholder="일정에 대한 상세 설명을 입력하세요"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {modalData.id ? (
                <button
                  onClick={handleDeleteModal}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  <i className="fas fa-trash-alt mr-2"></i>삭제
                </button>
              ) : <div></div>}

              <div className="flex gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveModal}
                  disabled={!modalData.title}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <i className="fas fa-check"></i>저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .calendar-container .fc-timegrid-axis {
          cursor: pointer;
          user-select: none;
        }
        .calendar-container .fc-timegrid-axis:hover {
          background-color: #eff6ff;
          color: #2563eb;
        }
        .calendar-container .fc-timegrid-axis-frame {
          font-weight: 600;
        }
        .calendar-container .fc {
          --fc-button-bg-color: #f8fafc;
          --fc-button-border-color: #e2e8f0;
          --fc-button-text-color: #475569;
          --fc-button-hover-bg-color: #f1f5f9;
          --fc-button-active-bg-color: #cbd5e1;
          --fc-border-color: #cbd5e1; /* 진해진 테두리 색상 */
          --fc-today-bg-color: #fff1f2;
          font-family: inherit;
        }
        .calendar-container .fc-scrollgrid {
          border: 1px solid #cbd5e1 !important;
        }
        .calendar-container .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #1e293b;
        }
        .calendar-container .fc-button {
          font-weight: 500 !important;
          text-transform: none !important;
          padding: 0.5rem 0.75rem !important;
        }
        .calendar-container .fc-button-primary:not(:disabled).fc-button-active,
        .calendar-container .fc-button-primary:not(:disabled):active {
          background-color: #2563eb !important;
          border-color: #2563eb !important;
          color: white !important;
        }
        .calendar-container .fc-event {
          cursor: pointer;
          border: 1px solid var(--fc-event-border-color) !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          font-size: 0.85rem !important;
          font-weight: 600 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
        }
        .calendar-container .fc-event-main {
          color: inherit !important;
        }
        .calendar-container .fc-col-header-cell {
          padding: 10px 0 !important;
          background-color: #f8fafc;
          border-bottom: 2px solid #e2e8f0 !important;
        }
        .calendar-container .fc-daygrid-day-number {
          padding: 8px !important;
          font-weight: 500;
          color: #64748b;
          text-decoration: none !important;
        }
        .calendar-container .fc-daygrid-day-number:hover {
          color: #2563eb;
          text-decoration: underline !important;
        }
        .calendar-container .fc-day-today .fc-daygrid-day-number {
          color: #dc2626;
          background-color: #fee2e2;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px;
          padding: 0 !important;
        }

        /* 모바일 헤더 최적화 */
        @media (max-width: 768px) {
          .calendar-container .fc-header-toolbar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 2px !important;
            margin-bottom: 0.75rem !important;
            padding: 0 4px !important;
          }
          .calendar-container .fc-toolbar-chunk {
            display: flex !important;
            align-items: center !important;
            gap: 2px !important;
          }
          .calendar-container .fc-toolbar-title {
            font-size: 0.95rem !important;
            font-weight: 700 !important;
            margin: 0 !important;
            max-width: 80px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: center;
          }
          .calendar-container .fc-button {
            padding: 4px 6px !important;
            font-size: 0.75rem !important;
            height: 32px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .calendar-container .fc-toolbar-chunk:nth-child(2) {
            flex: 1;
            justify-content: center;
          }
          /* 버튼 그룹 간격 조정 */
          .calendar-container .fc-button-group {
            gap: 1px !important;
          }
        }
        /* 시간구분선 뚜렷하게 */
        .calendar-container .fc-timegrid-slot {
          height: 3em !important;
          border-bottom: 1px solid #cbd5e1 !important; /* 더 진하게 변경 */
        }
        .calendar-container .fc-timegrid-slot-minor {
          border-top-style: dashed !important;
          border-top-color: #cbd5e1 !important; /* 더 진하게 변경 */
        }
        /* 날짜 칸 구분 */
        .calendar-container .fc-daygrid-day, 
        .calendar-container .fc-timegrid-col {
          border: 1px solid #cbd5e1 !important;
        }

        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }

      `}</style>
    </div>
  );
};
