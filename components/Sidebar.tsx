import React from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  showFavoritesOnly?: boolean;
  onToggleFavoriteFilter?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  showFavoritesOnly = false,
  onToggleFavoriteFilter
}) => {
  const handleMenuClick = () => {
    onToggleFavoriteFilter?.();
    onClose?.();
  };

  return (
    <div className={`
      /* 공통 스타일 */
      w-[250px] shrink-0 bg-white border-r border-gray-200 flex-col h-full

      /* 모바일: 고정 오버레이 */
      fixed inset-y-0 left-0 z-30

      /* 데스크톱: 일반 플로우 */
      md:flex md:relative

      /* 애니메이션 */
      transform transition-transform duration-300 ease-in-out

      /* 모바일 상태 */
      flex
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:translate-x-0
    `}>
      {/* 모바일 닫기 버튼 */}
      <div className="md:hidden absolute top-4 right-4">
        <button
          onClick={handleMenuClick}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="메뉴 닫기"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200 pr-12 md:pr-4">
        <h1 className="text-lg font-bold text-gray-800">인사이트고객관리</h1>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          <li>
            <button
              onClick={handleMenuClick}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                showFavoritesOnly
                  ? 'bg-yellow-50 text-yellow-700 ring-2 ring-yellow-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className={`fas fa-star w-5 ${
                showFavoritesOnly ? 'text-yellow-500' : 'text-gray-500'
              }`}></i>
              <span className="font-medium text-sm">집중중인고객</span>
              {showFavoritesOnly && (
                <i className="fas fa-check ml-auto text-yellow-600 text-xs"></i>
              )}
            </button>
          </li>
        </ul>
      </nav>

    </div>
  );
};
