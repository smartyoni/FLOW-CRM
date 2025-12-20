import React, { useMemo } from 'react';
import { Customer } from '../types';
import { DashboardCard } from './DashboardCard';

interface PreMeetingViewProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onMenuClick: () => void;
}

export const PreMeetingView: React.FC<PreMeetingViewProps> = ({ customers, onSelectCustomer, onMenuClick }) => {
  // 현재 날짜 및 시간 포맷
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = daysOfWeek[now.getDay()];
  const dateString = `${year}년 ${month}월 ${date}일 (${dayOfWeek}) ${hours}:${minutes}`;

  // 접수고객 필터링
  const receptionCustomers = useMemo(() => {
    return customers.filter(c => c.stage === '접수고객');
  }, [customers]);

  // 연락대상 필터링
  const contactTargetCustomers = useMemo(() => {
    return customers.filter(c => c.stage === '연락대상');
  }, [customers]);

  // 약속확정(첫미팅전) 필터링
  const confirmedCustomers = useMemo(() => {
    return customers.filter(c => c.stage === '약속확정');
  }, [customers]);

  // 미팅진행 필터링
  const meetingInProgressCustomers = useMemo(() => {
    return customers.filter(c => c.stage === '미팅진행');
  }, [customers]);

  return (
    <div className="w-full h-full bg-gray-100 overflow-y-auto">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          aria-label="메뉴 열기"
        >
          <i className="fas fa-bars text-lg"></i>
        </button>
        <h2 className="text-lg font-bold text-gray-800">첫미팅전 고객현황</h2>
        <div className="w-10"></div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 md:p-6">
        {/* Dashboard Header */}
        <div className="mb-14 hidden md:block">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">첫미팅전 고객현황</h1>
              <p className="text-gray-500 text-sm mt-1">만날 약속을 잡은 고객들</p>
            </div>
            <p className="text-red-500 font-semibold text-lg">{dateString}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 max-w-full mx-auto">
          {/* 카드 1: 접수고객 */}
          <DashboardCard
            title="접수고객"
            icon="fa-user-plus"
            customers={receptionCustomers}
            onSelectCustomer={onSelectCustomer}
            maxDisplay={10}
            emptyMessage="접수된 고객이 없습니다"
            color="yellow"
          />

          {/* 카드 2: 연락대상 */}
          <DashboardCard
            title="연락대상"
            icon="fa-phone"
            customers={contactTargetCustomers}
            onSelectCustomer={onSelectCustomer}
            maxDisplay={10}
            emptyMessage="연락 대상이 없습니다"
            color="blue"
          />

          {/* 카드 3: 약속확정(첫미팅) */}
          <DashboardCard
            title="약속확정(첫미팅)"
            icon="fa-check-circle"
            customers={confirmedCustomers}
            onSelectCustomer={onSelectCustomer}
            maxDisplay={10}
            emptyMessage="약속이 확정된 고객이 없습니다"
            color="gray"
          />

          {/* 카드 4: 미팅진행 */}
          <DashboardCard
            title="미팅진행"
            icon="fa-calendar-check"
            customers={meetingInProgressCustomers}
            onSelectCustomer={onSelectCustomer}
            maxDisplay={10}
            emptyMessage="진행 중인 미팅이 없습니다"
            color="green"
          />
        </div>
      </div>
    </div>
  );
};
