import React, { useMemo } from 'react';
import { Customer } from '../types';
import { DashboardCard } from './DashboardCard';

interface DashboardProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onMenuClick: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ customers, onSelectCustomer, onMenuClick }) => {
  // 집중고객 (즐겨찾기) 필터링
  const favoriteCustomers = useMemo(() => {
    return customers
      .filter(c => c.isFavorite)
      .sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0))
      .slice(0, 10);
  }, [customers]);

  // 오늘 미팅 고객 필터링
  const todayMeetingCustomers = useMemo(() => {
    // 현재 날짜를 YYYY-MM-DD 형식 문자열로 가져오기 (타임존 무시)
    const todayString = new Date().toLocaleDateString('en-CA'); // 'en-CA' 형식: YYYY-MM-DD

    console.log('📅 오늘 미팅 필터링 시작:', {
      오늘: todayString,
      전체고객수: customers.length
    });

    const result = customers.filter(customer => {
      if (!customer.meetings || customer.meetings.length === 0) {
        return false;
      }

      const hasTodayMeeting = customer.meetings.some(meeting => {
        try {
          // 미팅 날짜를 Date로 변환
          const meetingDate = new Date(meeting.date);

          if (isNaN(meetingDate.getTime())) {
            console.warn('⚠️ 잘못된 날짜 형식:', customer.name, meeting.date);
            return false;
          }

          // 미팅 날짜를 YYYY-MM-DD 형식으로 변환
          const meetingDateString = meetingDate.toLocaleDateString('en-CA');

          console.log('🔍 미팅 날짜 비교:', {
            고객: customer.name,
            저장된미팅: meeting.date,
            파싱된미팅: meetingDateString,
            오늘: todayString,
            일치: meetingDateString === todayString
          });

          const isToday = meetingDateString === todayString;
          if (isToday) {
            console.log('✅ 오늘 미팅 고객 발견:', customer.name);
          }
          return isToday;
        } catch (error) {
          console.error('❌ 미팅 날짜 처리 오류:', customer.name, meeting.date, error);
          return false;
        }
      });

      return hasTodayMeeting;
    });

    console.log('📊 오늘미팅 필터링 결과:', result.length, '명');
    return result;
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
        <h2 className="text-lg font-bold text-gray-800">대시보드</h2>
        <div className="w-10"></div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-7xl mx-auto">
        {/* 카드 1: 관리중인 고객 */}
        <DashboardCard
          title="관리중인 고객"
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
    </div>
  );
};
