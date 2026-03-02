import React, { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Customer } from '../types';
import { storage } from '../services/firebase';

interface CalendarViewProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onMenuClick?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  customers,
  onSelectCustomer,
  onMenuClick
}) => {
  // 화면 크기에 따른 초기 뷰 설정
  const isMobile = window.innerWidth < 1024;
  const initialView = isMobile ? 'timeGridDay' : 'dayGridMonth';

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
          color: '#8b5cf6', // violet-500
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
          backgroundColor: '#f1f5f9', // soft slate
          borderColor: '#94a3b8',
          textColor: '#475569',
          allDay: true,
          extendedProps: { customer, type: 'registration' }
        });
      }
    });

    return allEvents;
  }, [customers]);

  const handleEventClick = (info: any) => {
    const customer = info.event.extendedProps.customer;
    if (customer) {
      onSelectCustomer(customer);
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
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 h-full p-2 lg:p-4 calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            eventClick={handleEventClick}
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

      <style>{`
        .calendar-container .fc {
          --fc-button-bg-color: #f8fafc;
          --fc-button-border-color: #e2e8f0;
          --fc-button-text-color: #475569;
          --fc-button-hover-bg-color: #f1f5f9;
          --fc-button-active-bg-color: #cbd5e1;
          --fc-border-color: #cbd5e1; /* 진해진 테두리 색상 */
          --fc-today-bg-color: #eff6ff;
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
          color: #2563eb;
          background-color: #dbeafe;
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

        @media (max-width: 640px) {
          .calendar-container .fc-toolbar {
            flex-direction: column;
            gap: 10px;
          }
          .calendar-container .fc-toolbar-chunk {
            width: 100%;
            display: flex;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
