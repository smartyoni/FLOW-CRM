import React, { useState } from 'react';
import { Customer, CustomerCheckpoint } from '../types';

interface Props {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onMenuClick: () => void;
}

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

const CHECKPOINT_ORDER: CustomerCheckpoint[] = ['계약진행', '재미팅잡기', '약속확정', '미팅진행'];

export const ManagingCustomerView: React.FC<Props> = ({
  customers,
  onSelect,
  onDelete,
  onMenuClick
}) => {
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [activeCheckpointTab, setActiveCheckpointTab] = useState<CustomerCheckpoint>('계약진행');

  const handleSearchChange = (key: string, value: string) => {
    setSearchQueries(prev => ({ ...prev, [key]: value }));
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const filterAndSortCustomers = (list: Customer[], query: string) => {
    const q = query.toLowerCase();
    return list
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.contact.includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const renderMobileColumn = (checkpoint: CustomerCheckpoint, items: Customer[]) => {
    const filtered = filterAndSortCustomers(items, searchQueries[checkpoint] || '');
    const config = CHECKPOINT_CONFIG[checkpoint];

    return (
      <div className="h-full flex flex-col bg-white">
        {/* 헤더 */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
              <i className={`fas ${config.icon} ${config.color} text-sm`}></i>
            </div>
            <div>
              <h2 className="font-bold text-gray-800">{config.label}</h2>
              <p className="text-gray-400 text-xs">{config.desc}</p>
            </div>
          </div>
          <div className="text-sm">
            <span className="font-bold text-gray-800">{items.length}</span>
            <span className="text-gray-400 ml-1">명</span>
          </div>
        </div>

        {/* 검색바 */}
        <div className="p-3 border-b shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="검색..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQueries[checkpoint] || ''}
              onChange={(e) => handleSearchChange(checkpoint, e.target.value)}
            />
            {searchQueries[checkpoint] && (
              <button
                onClick={() => handleSearchChange(checkpoint, '')}
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
              onContextMenu={handleRightClick}
              className="bg-white border rounded-lg p-4 cursor-pointer shadow-sm active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
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

  const renderColumn = (checkpoint: CustomerCheckpoint, items: Customer[]) => {
    const filtered = filterAndSortCustomers(items, searchQueries[checkpoint] || '');
    const config = CHECKPOINT_CONFIG[checkpoint];

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
                <h2 className="font-bold text-gray-800 text-sm leading-tight">{config.label}</h2>
                <p className="text-gray-400 text-[10px] mt-0.5">{config.desc}</p>
              </div>
            </div>

            <div className="flex items-center">
              <span className="text-lg font-bold text-gray-800">{items.length}</span>
              <span className="text-[10px] text-gray-400 ml-1">명</span>
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {filtered.map(customer => (
            <div
              key={customer.id}
              onClick={() => onSelect(customer)}
              onContextMenu={handleRightClick}
              className="bg-white border rounded-lg px-3 py-2 cursor-pointer transition-all shadow-sm group relative flex justify-between items-center border-gray-200 hover:border-blue-400"
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
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

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center mb-1">
                <i className="fas fa-user text-gray-300 text-xs"></i>
              </div>
              <p className="text-gray-400 text-xs">고객 없음</p>
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
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          aria-label="메뉴 열기"
        >
          <i className="fas fa-bars text-lg"></i>
        </button>
        <h1 className="flex-1 text-lg font-bold text-gray-800">관리중인 고객</h1>
      </div>

      {/* Mobile Checkpoint Tabs */}
      <div className="md:hidden bg-white border-b shrink-0 overflow-x-auto">
        <div className="flex p-2 gap-2 min-w-max">
          {CHECKPOINT_ORDER.map(checkpoint => {
            const config = CHECKPOINT_CONFIG[checkpoint];
            const count = customers.filter(c => c.checkpoint === checkpoint).length;
            const isActive = activeCheckpointTab === checkpoint;

            return (
              <button
                key={checkpoint}
                onClick={() => setActiveCheckpointTab(checkpoint)}
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
      <div className="flex-1 overflow-hidden md:hidden">
        {renderMobileColumn(
          activeCheckpointTab,
          customers.filter(c => c.checkpoint === activeCheckpointTab)
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex md:flex-col w-full h-full">
        <div className="flex-1 overflow-x-auto p-3">
          <div className="flex h-full">
            {CHECKPOINT_ORDER.map(checkpoint => {
              const cpCustomers = customers.filter(c => c.checkpoint === checkpoint);
              return (
                <React.Fragment key={checkpoint}>
                  {renderColumn(checkpoint, cpCustomers)}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
