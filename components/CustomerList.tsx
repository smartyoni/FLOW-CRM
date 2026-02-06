import React, { useState } from 'react';
import { Customer, CustomerStage, CustomerCheckpoint } from '../types';

interface Props {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onAddClick: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string) => void;
  onMenuClick: () => void;
}

const STAGE_CONFIG: Record<CustomerStage, { label: string; desc: string; color: string; icon: string; bg: string }> = {
  '접수고객': { 
    label: '접수고객', 
    desc: '신규 등록된 고객 리스트', 
    color: 'text-blue-600', 
    icon: 'fa-search',
    bg: 'bg-blue-100'
  },
  '연락대상': { 
    label: '연락대상', 
    desc: '첫 연락을 위해 준비하는 고객', 
    color: 'text-orange-600', 
    icon: 'fa-phone-alt',
    bg: 'bg-orange-100'
  },
  '약속확정': {
    label: '약속확정(첫미팅)',
    desc: '만날 약속을 잡은 고객들',
    color: 'text-purple-600',
    icon: 'fa-calendar-check',
    bg: 'bg-purple-100'
  },
  '미팅진행': { 
    label: '미팅진행', 
    desc: '현재 미팅 및 계약 진행 중', 
    color: 'text-green-600', 
    icon: 'fa-handshake',
    bg: 'bg-green-100'
  },
  '미팅진행함': {
    label: '완료',
    desc: '첫 미팅 완료',
    color: 'text-gray-600',
    icon: 'fa-check-circle',
    bg: 'bg-gray-100'
  }
};

const CHECKPOINT_CONFIG: Record<CustomerCheckpoint, { label: string; desc: string; color: string; icon: string; bg: string }> = {
  '계약진행': {
    label: '계약진행',
    desc: '계약 절차 진행 중',
    color: 'text-indigo-600',
    icon: 'fa-file-signature',
    bg: 'bg-indigo-100'
  },
  '재미팅잡기': {
    label: '재미팅잡기',
    desc: '추가 미팅 필요',
    color: 'text-amber-600',
    icon: 'fa-redo',
    bg: 'bg-amber-100'
  },
  '약속확정': {
    label: '약속확정(재미팅)',
    desc: '재미팅 약속 확정',
    color: 'text-purple-600',
    icon: 'fa-calendar-check',
    bg: 'bg-purple-100'
  },
  '미팅진행': {
    label: '미팅진행',
    desc: '재미팅 진행 중',
    color: 'text-green-600',
    icon: 'fa-handshake',
    bg: 'bg-green-100'
  }
};

const STAGE_ORDER: CustomerStage[] = ['접수고객', '연락대상', '약속확정', '미팅진행'];
const CHECKPOINT_ORDER: CustomerCheckpoint[] = ['계약진행', '재미팅잡기', '약속확정', '미팅진행'];

export const CustomerList: React.FC<Props> = ({ customers, onSelect, onAddClick, onDelete, onToggleFavorite, onMenuClick }) => {
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [activeStageTab, setActiveStageTab] = useState<CustomerStage>('접수고객');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleSearchChange = (key: string, value: string) => {
    setSearchQueries(prev => ({ ...prev, [key]: value }));
  };

  const handleRightClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent default browser context menu
    onToggleFavorite(id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    setTouchEnd(e.changedTouches[0].clientX);

    const distance = touchStart - e.changedTouches[0].clientX;
    const minSwipeDistance = 50;

    if (Math.abs(distance) < minSwipeDistance) {
      return;
    }

    const currentIndex = STAGE_ORDER.indexOf(activeStageTab);

    if (distance > 0) {
      // 오른쪽에서 왼쪽으로 스와이프 -> 다음 탭
      if (currentIndex < STAGE_ORDER.length - 1) {
        setActiveStageTab(STAGE_ORDER[currentIndex + 1]);
      }
    } else {
      // 왼쪽에서 오른쪽으로 스와이프 -> 이전 탭
      if (currentIndex > 0) {
        setActiveStageTab(STAGE_ORDER[currentIndex - 1]);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const filterAndSortCustomers = (list: Customer[], query: string) => {
    const q = query.toLowerCase();
    return list
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.contact.includes(q)
      )
      .sort((a, b) => {
        // 1. Sort by Favorites
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        // 2. Sort by Registration Date (Latest first - descending)
        const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
        const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
        if (dateA !== dateB) {
          return dateB - dateA; // Descending order (latest first)
        }

        // 3. Sort by Name (Default)
        return a.name.localeCompare(b.name);
      });
  };

  const renderMobileColumn = (key: string, items: Customer[]) => {
    const filtered = filterAndSortCustomers(items, searchQueries[key] || '');

    return (
      <div className="h-full flex flex-col bg-white">
        {/* 검색바 */}
        <div className="p-3 border-b shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="검색..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQueries[key] || ''}
              onChange={(e) => handleSearchChange(key, e.target.value)}
            />
            {searchQueries[key] && (
              <button
                onClick={() => handleSearchChange(key, '')}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
              >
                <i className="fas fa-times-circle text-sm"></i>
              </button>
            )}
            <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          </div>
        </div>

        {/* 고객 카드 목록 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filtered.map(customer => (
            <div
              key={customer.id}
              onClick={() => onSelect(customer)}
              onContextMenu={(e) => handleRightClick(e, customer.id)}
              className="bg-white border rounded-lg p-4 cursor-pointer shadow-sm active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {customer.isFavorite && (
                    <i className="fas fa-star text-yellow-400 text-sm"></i>
                  )}
                  <h3 className="font-bold text-base text-gray-800">{customer.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {customer.contact && (
                    <a
                      href={`sms:${customer.contact.replace(/\D/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800 p-2 transition-colors font-bold"
                      title="문자 메시지 보내기"
                    >
                      <i className="fas fa-comments text-sm"></i>
                    </a>
                  )}
                  <button
                    onClick={(e) => onDelete(customer.id, e)}
                    className="text-red-600 hover:text-red-800 p-2 transition-colors font-bold"
                  >
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                </div>
              </div>
              {customer.contact && (
                <p className="text-sm text-gray-600">{customer.contact}</p>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <i className="fas fa-user text-gray-300 text-2xl"></i>
              </div>
              <p className="text-gray-400 text-sm">고객 없음</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderColumn = (
    title: string,
    desc: string,
    items: Customer[],
    config: any,
    searchKey: string,
    showAddButton: boolean = false
  ) => {
    return (
      <div className="flex-1 min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full mr-4 last:mr-0">
        {/* Column Header */}
        <div className="p-3 border-b-2 border-gray-300">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <i className={`fas ${config.icon} ${config.color} text-sm`}></i>
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm leading-tight">{title}</h2>
                <p className="text-gray-400 text-[10px] mt-0.5">{desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <span className="text-lg font-bold text-gray-800">{items.length}</span>
                <span className="text-[10px] text-gray-400 ml-1">명</span>
              </div>
              {showAddButton && (
                <button
                  onClick={onAddClick}
                  className="w-6 h-6 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
                >
                  <i className="fas fa-plus text-xs"></i>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {items.map((customer, idx) => (
            <div 
              key={customer.id} 
              onClick={() => onSelect(customer)}
              onContextMenu={(e) => handleRightClick(e, customer.id)}
              className={`bg-white border rounded-lg px-3 py-2 cursor-pointer transition-all shadow-sm group relative flex justify-between items-center ${
                customer.isFavorite ? 'border-yellow-300 ring-1 ring-yellow-100' : 'border-gray-200 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                {/* Favorite Star (Inline) */}
                {customer.isFavorite && (
                  <i className="fas fa-star text-yellow-400 text-[10px]"></i>
                )}
                {/* Name */}
                <h3 className="font-bold text-sm text-gray-700 truncate">{customer.name}</h3>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-1 ml-2 shrink-0">
                {customer.contact && (
                  <a
                    href={`sms:${customer.contact.replace(/\D/g, '')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:text-blue-800 p-1 transition-colors font-bold"
                    title="문자 메시지 보내기"
                  >
                    <i className="fas fa-comments text-xs"></i>
                  </a>
                )}
                <button
                  onClick={(e) => onDelete(customer.id, e)}
                  className="text-red-600 hover:text-red-800 p-1 transition-colors font-bold"
                >
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center mb-1">
                <i className="fas fa-user text-gray-300 text-xs"></i>
              </div>
              <p className="text-gray-400 text-xs">고객 없음</p>
              {showAddButton && (
                <button 
                  onClick={onAddClick}
                  className="mt-2 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                >
                  추가
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full bg-gray-100 overflow-hidden">
      {/* Top Bar - Mobile Header */}
      <div className="bg-white border-b p-3 flex items-center gap-3 shadow-sm shrink-0 md:hidden">
        {/* Hamburger Button */}
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          aria-label="메뉴 열기"
        >
          <i className="fas fa-bars text-lg"></i>
        </button>

        {/* Title */}
        <h1 className="flex-1 text-lg font-bold text-gray-800">부동산 고객관리</h1>

        {/* Add Customer FAB */}
        <button
          onClick={onAddClick}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-blue-600 transition-colors"
          aria-label="고객 추가"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* Top Stage Tabs - 미팅 전 (Always Visible) */}
      <div className="md:hidden bg-white border-b shrink-0 overflow-x-auto">
        <div className="flex p-2 gap-2 min-w-max">
          {STAGE_ORDER.map(stage => {
            const config = STAGE_CONFIG[stage];
            const count = customers.filter(c => (c.stage || '접수고객') === stage).length;
            const isActive = activeStageTab === stage;

            return (
              <button
                key={stage}
                onClick={() => {
                  setActiveStageTab(stage);
                }}
                className={`flex-shrink-0 px-2 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Single Column View */}
      <div
        className="flex-1 overflow-hidden md:hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {renderMobileColumn(
          activeStageTab,
          customers.filter(c => (c.stage || '접수고객') === activeStageTab)
        )}
      </div>

      {/* Desktop View - Hidden on Mobile */}
      <div className="hidden md:flex md:flex-col w-full h-full">
        {/* Stages (Pre-meeting) */}
        <div className="flex-1 overflow-x-auto p-3">
        <div className="flex h-full">
          {STAGE_ORDER.map(stage => {
            const config = STAGE_CONFIG[stage];
            const stageCustomers = customers.filter(c => (c.stage || '접수고객') === stage);
            const filtered = filterAndSortCustomers(stageCustomers, searchQueries[stage] || '');

            return (
              <React.Fragment key={stage}>
                {renderColumn(
                  config.label,
                  config.desc,
                  filtered,
                  config,
                  stage,
                  stage === '접수고객'
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
};