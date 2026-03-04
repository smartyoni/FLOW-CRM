import React from 'react';
import { Customer, ViewMode } from '../../types';
import { Sidebar } from '../Sidebar';
import { MobileBottomTab } from './MobileBottomTab';

interface MainLayoutProps {
    children: React.ReactNode;
    overlays?: React.ReactNode;
    isOnline: boolean;
    pullDistance: number;
    isMobileSidebarOpen: boolean;
    onCloseMobileSidebar: () => void;
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
    customers: Customer[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    overlays,
    isOnline,
    pullDistance,
    isMobileSidebarOpen,
    onCloseMobileSidebar,
    currentView,
    onViewChange,
    customers
}) => {
    const viewTitles: Record<ViewMode, string> = {
        calendar: '캘린더 일정',
        customerList: '접수 ~ 첫미팅',
        managingCustomer: '재미팅 ~ 계약',
        contractCustomer: '계약 ~ 잔금'
    };

    return (
        <div className="flex flex-row w-full h-full bg-gray-100 relative overflow-hidden">
            {/* Pull to Refresh Indicator */}
            {pullDistance > 0 && (
                <div
                    className="fixed top-0 left-0 right-0 bg-blue-500 text-white text-center py-2 z-40 transition-all"
                    style={{ transform: `translateY(${pullDistance}px)` }}
                >
                    <div className="flex items-center justify-center gap-2">
                        <i
                            className="fas fa-arrow-down transition-transform"
                            style={{
                                transform: `rotate(${pullDistance > 60 ? 180 : 0}deg)`,
                                opacity: Math.min(pullDistance / 60, 1),
                            }}
                        ></i>
                        <span>{pullDistance > 60 ? '놓아서 새로고침' : '당겨서 새로고침'}</span>
                    </div>
                </div>
            )}

            {/* Offline indicator */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
                    <i className="fas fa-wifi-slash mr-2"></i>
                    오프라인 모드 - 온라인 연결 시 동기화됩니다
                </div>
            )}

            {/* Mobile Sidebar Backdrop */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={onCloseMobileSidebar}
                    aria-label="사이드바 닫기"
                />
            )}

            {/* Left Sidebar */}
            <Sidebar
                isOpen={isMobileSidebarOpen}
                onClose={onCloseMobileSidebar}
                currentView={currentView}
                onViewChange={onViewChange}
                customers={customers}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Header Area */}
                <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 h-14">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onCloseMobileSidebar}
                            className="lg:hidden text-gray-500 hover:text-gray-700"
                        >
                            <i className="fas fa-bars text-xl"></i>
                        </button>
                        <h2 className="text-lg font-bold text-gray-800">
                            {viewTitles[currentView]}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden bg-slate-50">
                    {children}
                </div>

                {/* Mobile Bottom Tab Bar */}
                <MobileBottomTab
                    currentView={currentView}
                    onViewChange={onViewChange}
                />
            </div>

            {/* Overlays (Detail Sidebar + Modals) */}
            {overlays}
        </div>
    );
};
