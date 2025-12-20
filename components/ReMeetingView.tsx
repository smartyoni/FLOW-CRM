import React, { useMemo } from 'react';
import { Customer } from '../types';
import { DashboardCard } from './DashboardCard';

interface ReMeetingViewProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onMenuClick: () => void;
}

export const ReMeetingView: React.FC<ReMeetingViewProps> = ({ customers, onSelectCustomer, onMenuClick }) => {
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

  // 계약진행 필터링
  const contractInProgressCustomers = useMemo(() => {
    return customers.filter(c => c.checkpoint === '계약진행');
  }, [customers]);

  // 재미팅잡기 필터링
  const reMeetingSchedulingCustomers = useMemo(() => {
    return customers.filter(c => c.checkpoint === '재미팅잡기');
  }, [customers]);

  // 약속확정(재미팅) 필터링
  const confirmedCustomers = useMemo(() => {
    return customers.filter(c => c.checkpoint === '약속확정');
  }, [customers]);

  // 미팅진행 필터링
  const meetingInProgressCustomers = useMemo(() => {
    return customers.filter(c => c.checkpoint === '미팅진행');
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
        <h2 className="text-lg font-bold text-gray-800">재미팅 고객현황</h2>
        <div className="w-10"></div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 md:p-6">
        {/* Dashboard Header */}
        <div className="mb-14 hidden md:block">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">재미팅 고객현황</h1>
              <p className="text-gray-500 text-sm mt-1">재미팅 약속 확정</p>
            </div>
            <p className="text-red-500 font-semibold text-lg">{dateString}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 max-w-full mx-auto">
          {/* 카드 1: 계약진행 */}
          <DashboardCard
            title="계약진행"
            icon="fa-file-contract"
            customers={contractInProgressCustomers}
            onSelectCustomer={onSelectCustomer}
            maxDisplay={10}
            emptyMessage="진행 중인 계약이 없습니다"
            color="yellow"
          />

          {/* 카드 2: 재미팅잡기 */}
          <DashboardCard
            title="재미팅잡기"
            icon="fa-calendar-plus"
            customers={reMeetingSchedulingCustomers}
            onSelectCustomer={onSelectCustomer}
            maxDisplay={10}
            emptyMessage="재미팅 대상이 없습니다"
            color="blue"
          />

          {/* 카드 3: 약속확정(재미팅) */}
          <DashboardCard
            title="약속확정(재미팅)"
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
