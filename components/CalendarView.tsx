import React, { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 1024;
  const isSmallMobile = windowWidth < 768; // 3일 뷰를 위한 임계값
  const initialView = 'listMonth'; // 모바일과 데스크탑 모두 초기 뷰를 일정뷰로 설정
  const weekViewName = isSmallMobile ? 'timeGridThreeDay' : 'timeGridWeek';

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
  // 캘린더 컨테이너 및 API 제어 상태
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<any>(null);
  const [activeView, setActiveView] = useState(initialView);
  const [currentTitle, setCurrentTitle] = useState('');

  // 뷰 전환 핸들러
  const handleViewChange = (view: string) => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(view);
      setActiveView(view);
    }
  };

  // 네비게이션 핸들러
  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

  // FullCalendar 뷰 변경 감지
  const handleDatesSet = (dateInfo: any) => {
    setCurrentTitle(dateInfo.view.title);
    setActiveView(dateInfo.view.type);
  };

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
            title: `미팅: ${customer.name}`,
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
          title: `계약: ${customer.name}`,
          start: customer.contractDate,
          backgroundColor: '#dcfce7', // soft green
          borderColor: '#4ade80',
          textColor: '#15803d',
          allDay: !customer.contractDate.includes('T'),
          extendedProps: { customer, type: 'contract' }
        });
      }

      // 3. 잔금일
      if (customer.paymentDate) {
        allEvents.push({
          id: `payment-${customer.id}`,
          title: `잔금: ${customer.name}`,
          start: customer.paymentDate,
          backgroundColor: '#fee2e2', // soft red
          borderColor: '#f87171',
          textColor: '#b91c1c',
          allDay: !customer.paymentDate.includes('T'),
          extendedProps: { customer, type: 'payment' }
        });
      }


      // 6. 접수일
      if (customer.registrationDate) {
        allEvents.push({
          id: `reg-${customer.id}`,
          title: `접수: ${customer.name}`,
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
      // 종일 일정은 녹색 테마, 시간 지정 일정은 파란색 테마 (불렛 색상을 위한 borderColor)
      const isAllDay = me.allDay === true;
      const bg = isAllDay ? '#dcfce7' : '#eff6ff'; // green-100 : blue-50
      const border = isAllDay ? '#22c55e' : '#3b82f6'; // green-500 : blue-500
      const text = isAllDay ? '#15803d' : '#1e3a8a'; // green-700 : blue-900

      allEvents.push({
        id: `manual-${me.id}`,
        title: me.title,
        start: me.start,
        end: me.end,
        allDay: me.allDay,
        backgroundColor: bg,
        borderColor: border,
        textColor: text,
        editable: true,             // 캘린더 드래그앤드롭 활성화
        order: me.order || 0,       // 정렬 순서 적용
        classNames: me.isCompleted ? ['completed-event'] : [],
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

  const handleToggleComplete = async () => {
    if (!viewEvent || !onUpdateManualEvent) return;
    await onUpdateManualEvent(viewEvent.id, {
      isCompleted: !viewEvent.isCompleted
    });
    setViewEvent(null);
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

  // 종일 라벨 또는 날짜 클릭 시 해당 날짜의 종일 일정만 모달로 표시
  const openDayReorderModal = (dateStr: string) => {
    const targetEvents = events.filter(e => {
      if (!e.allDay) return false;
      // Convert start back to local date string matching dateStr format
      const eDate = e.start.length > 10 ? e.start.substring(0, 10) : e.start;
      return eDate === dateStr;
    }).sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title, 'ko');
    });

    if (targetEvents.length > 0) {
      setAllDayModalEvents(targetEvents);
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
          const currentViewDate = calendarRef.current?.getApi().getDate();
          if (currentViewDate) {
            // Handle timezone offset to ensure safe string comparison for local date
            const localDate = new Date(currentViewDate.getTime() - (currentViewDate.getTimezoneOffset() * 60000));
            const dateStr = localDate.toISOString().split('T')[0];
            openDayReorderModal(dateStr);
          }
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

  // 모바일 스와이프 제스처 (왼쪽/오른쪽으로 스와이프 시 이전/다음 이동)
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null || touchStartY.current === null || touchEndY.current === null) return;

    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;

    // X축 이동이 Y축 이동보다 크고, 최소 50px 이상 이동했을 때만 가로 스와이프로 인식
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // 왼쪽으로 스와이프 (다음)
        calendarRef.current?.getApi().next();
      } else {
        // 오른쪽으로 스와이프 (이전)
        calendarRef.current?.getApi().prev();
      }
    }

    // 상태 초기화
    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm z-10 min-h-[56px] lg:h-14">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 shrink-0">
              <i className="fas fa-calendar-alt text-blue-600"></i>
              {currentTitle || '캘린더 일정'}
            </h2>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-md text-slate-500 transition-all"
              aria-label="이전"
            >
              <i className="fas fa-chevron-left text-xs"></i>
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm rounded-md text-xs font-bold transition-all mx-0.5"
            >
              오늘
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-md text-slate-500 transition-all"
              aria-label="다음"
            >
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </div>

        {/* 뷰 전환 세그먼트 탭 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'dayGridMonth', label: '월간', color: 'bg-rose-50 text-rose-700 ring-rose-200' },
            { id: weekViewName, label: '주간', color: 'bg-sky-50 text-sky-700 ring-sky-200' },
            { id: 'timeGridDay', label: '일간', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
            { id: 'listMonth', label: '일정', color: 'bg-amber-50 text-amber-700 ring-amber-200' }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewChange(view.id)}
              className={`
                flex-1 md:flex-none px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                ${activeView === view.id
                  ? `${view.color} shadow-sm ring-1`
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }
              `}
            >
              {view.label}
            </button>
          ))}
        </div>
      </header>

      {/* 캘린더 메인 영역 */}
      <div className="flex-1 p-4 overflow-hidden">
        <div
          className="bg-white rounded-xl shadow-lg border border-slate-200 h-full p-2 lg:p-4 calendar-container"
          ref={calendarContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <FullCalendar
            key={isSmallMobile ? 'mobile-calendar' : 'desktop-calendar'}
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={initialView}
            customButtons={{
              customToday: {
                text: '오늘',
                click: () => {
                  calendarRef.current?.getApi().today();
                }
              }
            }}
            headerToolbar={false}
            datesSet={handleDatesSet}
            events={events}
            eventOrder="order,title,start"
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            selectable={true}
            select={handleDateSelect}
            selectLongPressDelay={50}
            eventLongPressDelay={50}
            views={{
              dayGridMonth: {
                titleFormat: { year: 'numeric', month: 'long' }
              },
              timeGridWeek: {
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderFormat: { month: 'numeric', day: 'numeric', weekday: 'short' }
              },
              timeGridThreeDay: {
                type: 'timeGrid',
                duration: { days: 3 },
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderFormat: { month: 'numeric', day: 'numeric', weekday: 'short' }
              },
              timeGridDay: {
                titleFormat: { year: 'numeric', month: 'long' },
                dayHeaderFormat: { month: 'numeric', day: 'numeric', weekday: 'short' }
              },
              listMonth: {
                displayEventEnd: false
              }
            }}
            allDayText="종일"
            locale="ko"
            height="100%"
            dayMaxEvents={true}
            navLinks={true}
            slotDuration="00:30:00"
            slotLabelInterval="00:30:00"
            slotLabelContent={(arg) => {
              const hour = arg.date.getHours();
              const minute = arg.date.getMinutes();
              return `${hour}:${minute === 0 ? '00' : minute}`;
            }}
            navLinkDayClick={(date) => {
              // Handle timezone offset to ensure safe string comparison for local date
              const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
              const dateStr = localDate.toISOString().split('T')[0];

              // 해당 날짜의 종일 일정이 2개 이상이면 순서 변경 모달 열기, 아니면 일간 뷰로 이동
              const targetEvents = events.filter(e => {
                if (!e.allDay) return false;
                const eDate = e.start.length > 10 ? e.start.substring(0, 10) : e.start;
                return eDate === dateStr;
              }).sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                if (orderA !== orderB) return orderA - orderB;
                return a.title.localeCompare(b.title, 'ko');
              });

              if (targetEvents.length > 1) {
                setAllDayModalEvents(targetEvents);
              } else {
                calendarRef.current?.getApi().changeView('timeGridDay', date);
              }
            }}
            buttonText={{
              today: '오늘',
              month: '월간',
              week: '주간',
              timeGridWeek: '주간',
              timeGridThreeDay: '주간',
              day: '일간',
              listMonth: '일정'
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
                    <div className={`flex-1 flex justify-between items-center ${isManual && ev.extendedProps?.manualEvent?.isCompleted ? 'opacity-50 line-through' : ''}`}>
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
                onClick={handleToggleComplete}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewEvent.isCompleted ? 'text-blue-600 hover:bg-blue-50' : 'text-green-600 hover:bg-green-50'}`}
              >
                <i className={`fas ${viewEvent.isCompleted ? 'fa-undo' : 'fa-check'}`}></i>{viewEvent.isCompleted ? '완료 취소' : '완료'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={openEditFromView}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  <i className="fas fa-pencil-alt"></i>수정
                </button>
                <button
                  onClick={handleDeleteFromView}
                  className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-sm font-bold transition-colors"
                >
                  <i className="fas fa-trash-alt"></i>삭제
                </button>
              </div>
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
                  className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  <i className="fas fa-check"></i>저장하기
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
        /* 종일 영역 배경색: 항상 노란색 */
        .calendar-container .fc-timegrid-allday,
        .calendar-container .fc-timegrid-allday .fc-timegrid-col {
          background-color: #fef9c3 !important; /* yellow-100 */
        }
        .calendar-container .fc-timegrid-axis.fc-scrollgrid-shrink {
          background-color: #fef9c3 !important;
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
          --fc-today-bg-color: #f0fdf4;
          font-family: inherit;
        }
        .calendar-container .fc-scrollgrid {
          border: 1px solid #cbd5e1 !important;
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

        .calendar-container .completed-event {
          opacity: 0.5 !important;
        }
        .calendar-container .completed-event .fc-event-title,
        .calendar-container .completed-event .fc-event-time,
        .calendar-container .completed-event .fc-list-event-title,
        .calendar-container .completed-event .fc-list-event-time {
          text-decoration: line-through !important;
        }

      `}</style>
    </div>
  );
};
