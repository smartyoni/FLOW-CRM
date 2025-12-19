import React, { useMemo } from 'react';
import { Customer } from '../types';
import { DashboardCard } from './DashboardCard';

interface DashboardProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ customers, onSelectCustomer }) => {
  // 집중고객 (즐겨찾기) 필터링
  const favoriteCustomers = useMemo(() => {
    return customers
      .filter(c => c.isFavorite)
      .sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
      .slice(0, 10);
  }, [customers]);

  // 오늘 미팅 고객 필터링
  const todayMeetingCustomers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return customers.filter(customer => {
      if (!customer.meetings || customer.meetings.length === 0) {
        return false;
      }

      return customer.meetings.some(meeting => {
        const meetingDate = new Date(meeting.date);

        if (isNaN(meetingDate.getTime())) {
          return false;
        }

        return meetingDate >= today && meetingDate < tomorrow;
      });
    });
  }, [customers]);

  return (
    <div className="w-full h-full bg-gray-100 overflow-y-auto p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-7xl mx-auto">
        {/* 카드 1: 집중고객 */}
        <DashboardCard
          title="집중고객"
          icon="fa-star"
          customers={favoriteCustomers}
          onSelectCustomer={onSelectCustomer}
          maxDisplay={10}
          emptyMessage="즐겨찾기된 고객이 없습니다"
          color="yellow"
        />

        {/* 카드 2: 오늘미팅 */}
        <DashboardCard
          title="오늘미팅"
          icon="fa-calendar-day"
          customers={todayMeetingCustomers}
          onSelectCustomer={onSelectCustomer}
          maxDisplay={10}
          emptyMessage="오늘 예정된 미팅이 없습니다"
          color="blue"
        />

        {/* 카드 3: 추가1 */}
        <DashboardCard
          title="추가1"
          icon="fa-plus-circle"
          customers={[]}
          onSelectCustomer={onSelectCustomer}
          emptyMessage="곧 추가될 기능입니다"
          isEmpty={true}
          color="gray"
        />

        {/* 카드 4: 추가2 */}
        <DashboardCard
          title="추가2"
          icon="fa-plus-circle"
          customers={[]}
          onSelectCustomer={onSelectCustomer}
          emptyMessage="곧 추가될 기능입니다"
          isEmpty={true}
          color="gray"
        />
      </div>
    </div>
  );
};
