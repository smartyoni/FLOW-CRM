import React, { useState } from 'react';
import { Customer, CustomerStage, CustomerCheckpoint } from '../types';

interface Props {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onAddClick: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string) => void;
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
    label: '약속확정', 
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
    label: '약속확정',
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

export const CustomerList: React.FC<Props> = ({ customers, onSelect, onAddClick, onDelete, onToggleFavorite }) => {
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  const handleSearchChange = (key: string, value: string) => {
    setSearchQueries(prev => ({ ...prev, [key]: value }));
  };

  const handleRightClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent default browser context menu
    onToggleFavorite(id);
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

        // 2. Sort by Favorited Time (Latest first)
        if (a.isFavorite && b.isFavorite) {
          return (b.favoritedAt || 0) - (a.favoritedAt || 0);
        }

        // 3. Sort by Name (Default)
        return a.name.localeCompare(b.name);
      });
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
      <div className="w-[320px] md:w-[380px] bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full mr-4 last:mr-0 shrink-0">
        {/* Column Header */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <i className={`fas ${config.icon} ${config.color} text-sm`}></i>
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm leading-tight">{title}</h2>
                <p className="text-gray-400 text-[10px] mt-0.5">{desc}</p>
              </div>
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

          {/* Stats */}
          <div className="flex gap-4 mb-2">
            <div>
              <span className="text-lg font-bold text-gray-800">{items.length}</span>
              <span className="text-[10px] text-gray-400 ml-1">명</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input 
              type="text"
              placeholder="검색..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-2 pr-14 text-xs focus:outline-none focus:ring-1 focus:ring-blue-100 transition-all"
              value={searchQueries[searchKey] || ''}
              onChange={(e) => handleSearchChange(searchKey, e.target.value)}
            />
            {searchQueries[searchKey] && (
              <button 
                onClick={() => handleSearchChange(searchKey, '')}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                title="검색어 삭제"
              >
                <i className="fas fa-times-circle text-xs"></i>
              </button>
            )}
            <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
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
              
              {/* Delete Button */}
              <button 
                onClick={(e) => onDelete(customer.id, e)}
                className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
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
      <div className="bg-white border-b p-3 flex justify-between items-center shadow-sm shrink-0 md:hidden">
        <h1 className="text-lg font-bold text-gray-800">부동산 고객관리</h1>
      </div>

      {/* Row 1: Stages (Pre-meeting) */}
      <div className="flex-1 overflow-x-auto p-3 border-b border-gray-200">
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

      {/* Row 2: Checkpoints (Post-meeting) */}
      <div className="flex-1 overflow-x-auto p-3 bg-gray-50">
         <div className="flex h-full">
          {CHECKPOINT_ORDER.map(checkpoint => {
            const config = CHECKPOINT_CONFIG[checkpoint];
            // Filter logic: Only show customers who have this checkpoint selected.
            // Note: Customers with '미팅진행함' stage will usually have a checkpoint.
            const cpCustomers = customers.filter(c => c.checkpoint === checkpoint);
            const filtered = filterAndSortCustomers(cpCustomers, searchQueries[checkpoint] || '');

            return (
              <React.Fragment key={checkpoint}>
                {renderColumn(
                  config.label, 
                  config.desc, 
                  filtered, 
                  config, 
                  checkpoint, 
                  false
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};