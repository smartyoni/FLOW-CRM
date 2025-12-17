import React from 'react';

export const Sidebar: React.FC = () => {
  return (
    <div className="hidden md:flex w-[250px] shrink-0 bg-white border-r border-gray-200 flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800">인사이트고객관리</h1>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          <li>
            <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              <i className="fas fa-home text-gray-600 w-5"></i>
              <span className="text-gray-700 text-sm">대시보드</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-50 text-blue-600 transition-colors">
              <i className="fas fa-users w-5"></i>
              <span className="font-medium text-sm">고객 관리</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              <i className="fas fa-calendar-alt text-gray-600 w-5"></i>
              <span className="text-gray-700 text-sm">미팅 일정</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors">
              <i className="fas fa-chart-bar text-gray-600 w-5"></i>
              <span className="text-gray-700 text-sm">통계</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* 하단 - 설정 */}
      <div className="p-4 border-t border-gray-200">
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100 w-full transition-colors">
          <i className="fas fa-cog text-gray-600 w-5"></i>
          <span className="text-gray-700 text-sm">설정</span>
        </button>
      </div>
    </div>
  );
};
