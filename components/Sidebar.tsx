import { Customer, SyncStatus } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentView?: 'customerList' | 'managingCustomer' | 'contractCustomer' | 'calendar';
  onViewChange?: (view: 'customerList' | 'managingCustomer' | 'contractCustomer' | 'calendar') => void;
  customers?: Customer[];
  syncStatus?: SyncStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  currentView = 'customerList',
  onViewChange,
  customers = [],
  syncStatus
}) => {
  const { openSmsTemplateModal } = useAppContext();

  // 접수~첫미팅: checkpoint가 없는 고객
  const customerListCount = customers.filter(c => !c.checkpoint && !c.contractStatus).length;

  // 재미팅~계약: checkpoint가 있는 고객
  const managingCustomerCount = customers.filter(c => c.checkpoint && !c.contractStatus).length;

  // 계약~잔금: contractStatus가 있는 고객
  const contractCustomerCount = customers.filter(c => c.contractStatus).length;
  const handleMenuClick = () => {
    onClose?.();
  };

  const handleViewClick = (view: 'customerList' | 'managingCustomer' | 'contractCustomer' | 'calendar') => {
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
      <div className="p-4 border-b border-slate-700 pr-12 md:pr-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="./고객관리.png" alt="고객관리 로고" className="w-8 h-8 rounded-lg object-contain" />
            {syncStatus?.isListening && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-[#1e293b]"></span>
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-white">고객관리</h1>
        </div>
        
        {syncStatus?.lastSync && (
          <div className="text-[10px] text-slate-500 whitespace-nowrap">
            <i className="fas fa-sync-alt mr-1 animate-spin-slow"></i>
            {new Date(syncStatus.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {/* 메뉴 항목 4: 캘린더 */}
          <li>
            <button
              onClick={() => handleViewClick('calendar')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${currentView === 'calendar'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-300 hover:bg-slate-700/50'
                }`}
            >
              <i className={`fas fa-calendar-alt w-5 text-center ${currentView === 'calendar' ? 'text-white' : 'text-slate-400'}`}></i>
              <span className="font-medium text-sm">캘린더</span>
            </button>
          </li>

          {/* 구분선 */}
          <li className="pt-2 pb-1">
            <div className="border-t border-slate-700/50 mx-2"></div>
          </li>

          {/* 메뉴 항목 1: 접수~첫미팅 (CustomerList) */}
          <li>
            <button
              onClick={() => handleViewClick('customerList')}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors group ${currentView === 'customerList'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <i className={`fas fa-user-plus w-5 text-center ${currentView === 'customerList' ? 'text-white' : 'text-red-400'}`}></i>
                <span className="font-medium text-sm">접수~첫미팅</span>
              </div>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${currentView === 'customerList' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-200'}`}>{customerListCount}</span>
            </button>
          </li>

          {/* 메뉴 항목 2: 재미팅~계약 */}
          <li>
            <button
              onClick={() => handleViewClick('managingCustomer')}
              className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg transition-all ${currentView === 'managingCustomer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-tasks w-5 text-center text-orange-400 group-hover:text-white"></i>
                <span className="font-medium text-sm">재미팅~계약</span>
              </div>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${currentView === 'managingCustomer' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-200'}`}>{managingCustomerCount}</span>
            </button>
          </li>

          {/* 메뉴 항목 3: 계약~잔금 */}
          <li>
            <button
              onClick={() => handleViewClick('contractCustomer')}
              className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg transition-all ${currentView === 'contractCustomer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-file-contract w-5 text-center text-green-400 group-hover:text-white"></i>
                <span className="font-medium text-sm">계약~잔금</span>
              </div>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${currentView === 'contractCustomer' ? 'bg-blue-700 text-white' : 'bg-slate-700 text-slate-200'}`}>{contractCustomerCount}</span>
            </button>
          </li>

        </ul>
      </nav>

      {/* 사이드바 하단 설정 버튼 */}
      <div className="p-4 border-t border-slate-700/50">
        <button
          onClick={() => openSmsTemplateModal()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <i className="fas fa-cog text-sm"></i>
          </div>
          <span className="font-medium text-sm text-slate-300">SMS 템플릿 설정</span>
        </button>
      </div>
    </div>
  );
};
