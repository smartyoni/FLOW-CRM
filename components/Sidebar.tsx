import React from 'react';
import { Customer } from '../types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentView?: 'customerList' | 'managingCustomer' | 'contractCustomer';
  onViewChange?: (view: 'customerList' | 'managingCustomer' | 'contractCustomer') => void;
  customers?: Customer[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  currentView = 'customerList',
  onViewChange,
  customers = []
}) => {
  // 접수~첫미팅: checkpoint가 없는 고객
  const customerListCount = customers.filter(c => !c.checkpoint && !c.contractStatus).length;

  // 재미팅~계약: checkpoint가 있는 고객
  const managingCustomerCount = customers.filter(c => c.checkpoint && !c.contractStatus).length;

  // 계약~잔금: contractStatus가 있는 고객
  const contractCustomerCount = customers.filter(c => c.contractStatus).length;
  const handleMenuClick = () => {
    onClose?.();
  };

  const handleViewClick = (view: 'customerList' | 'managingCustomer' | 'contractCustomer') => {
    onViewChange?.(view);
    onClose?.();
  };

  return (
    <div className={`
      /* 공통 스타일 */
      w-[250px] shrink-0 bg-[#1e293b] border-r border-slate-700 flex-col h-full

      /* 모바일: 고정 오버레이 */
      fixed inset-y-0 left-0 z-30

      /* 데스크톱: 일반 플로우 */
      lg:flex lg:relative

      /* 애니메이션 */
      transform transition-transform duration-300 ease-in-out

      /* 모바일 상태 */
      flex
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* 모바일 닫기 버튼 */}
      <div className="lg:hidden absolute top-4 right-4">
        <button
          onClick={handleMenuClick}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-white/70 transition-colors"
          aria-label="메뉴 닫기"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* 헤더 */}
      <div className="p-4 border-b border-slate-700 pr-12 md:pr-4">
        <h1 className="text-lg font-bold text-white">인사이트고객관리</h1>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {/* 메뉴 항목 1: 접수~첫미팅 (CustomerList) */}
          <li>
            <button
              onClick={() => handleViewClick('customerList')}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all ${currentView === 'customerList'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-700/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-2xl leading-none ${currentView === 'customerList' ? 'text-white' : 'text-red-500'}`}>•</span>
                <span className="font-medium text-sm">접수~첫미팅</span>
              </div>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${currentView === 'customerList' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-200'}`}>{customerListCount}</span>
            </button>
          </li>

          {/* 메뉴 항목 2: 재미팅~계약 */}
          <li>
            <button
              onClick={() => handleViewClick('managingCustomer')}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all ${currentView === 'managingCustomer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-700/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-2xl leading-none ${currentView === 'managingCustomer' ? 'text-white' : 'text-red-500'}`}>•</span>
                <span className="font-medium text-sm">재미팅~계약</span>
              </div>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${currentView === 'managingCustomer' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-200'}`}>{managingCustomerCount}</span>
            </button>
          </li>

          {/* 메뉴 항목 3: 계약~잔금 */}
          <li>
            <button
              onClick={() => handleViewClick('contractCustomer')}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all ${currentView === 'contractCustomer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-700/50'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-2xl leading-none ${currentView === 'contractCustomer' ? 'text-white' : 'text-red-500'}`}>•</span>
                <span className="font-medium text-sm">계약~잔금</span>
              </div>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${currentView === 'contractCustomer' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-200'}`}>{contractCustomerCount}</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};
