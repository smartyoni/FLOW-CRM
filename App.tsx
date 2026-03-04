import React, { useState, useEffect } from 'react';
import { Customer, ViewMode } from './types';
import { CustomerDetailSidebar } from './components/CustomerDetailSidebar';
import { CustomerForm } from './components/CustomerForm';
import { MainLayout } from './components/layout/MainLayout';
import { ContentSwitcher } from './components/views/ContentSwitcher';
import { AppProvider } from './contexts/AppContext';
import { useCustomerData } from './hooks/useCustomerData';

const App: React.FC = () => {
  // ── Data Layer (Custom Hook) ──────────────────────────────────────
  const {
    customers,
    manualEvents,
    selectedCustomer,
    setSelectedCustomer,
    loading,
    error,
    deleteConfirmation,
    handleAddCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    confirmDelete,
    cancelDelete,
    handleToggleFavorite,
    createManualEvent,
    updateManualEvent,
    deleteManualEvent,
  } = useCustomerData({
    onSelectedCustomerDeleted: () => setIsSidebarOpen(false),
  });

  // ── UI State ──────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [initialCustomerData, setInitialCustomerData] = useState<Partial<Customer> | undefined>(undefined);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentView, setCurrentView] = useState<ViewMode>('calendar');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // ── Side Effects ──────────────────────────────────────────────────

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect shared content from Web Share Target API
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedText = urlParams.get('text');
    const sharedTitle = urlParams.get('title');
    const sharedUrl = urlParams.get('url');

    if (sharedText || sharedTitle || sharedUrl) {
      const customerName = sharedText || sharedTitle || '';

      if (customerName.trim()) {
        setInitialCustomerData({
          contact: customerName.trim(),
          memo: sharedUrl ? `URL: ${sharedUrl}` : ''
        });
        setIsFormOpen(true);
      }

      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Handle mobile back button for detail sidebar
  useEffect(() => {
    if (isSidebarOpen) {
      window.history.pushState({ sidebarOpen: true }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isSidebarOpen && event.state?.sidebarOpen !== true) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSidebarOpen]);

  // Pull to Refresh Handler
  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY > 0) {
        const distance = e.touches[0].clientY - startY;
        if (distance > 0) setPullDistance(Math.min(distance, 100));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance > 60 && !isRefreshing) {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
      }
      setPullDistance(0);
      startY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  // ── UI Handlers ───────────────────────────────────────────────────
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSidebarOpen(true);
  };

  const handleViewChange = async (view: ViewMode) => {
    setCurrentView(view);
  };

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-gray-600 mt-4">데이터 로딩중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <p className="text-gray-600 mt-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppProvider>
      <MainLayout
        isOnline={isOnline}
        pullDistance={pullDistance}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
        currentView={currentView}
        onViewChange={handleViewChange}
        customers={customers}
        overlays={
          <>
            {/* Right Detail Sidebar */}
            <CustomerDetailSidebar
              customer={selectedCustomer}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              onUpdate={handleUpdateCustomer}
            />

            {/* Customer Form Modal */}
            {isFormOpen && (
              <CustomerForm
                onClose={() => {
                  setIsFormOpen(false);
                  setInitialCustomerData(undefined);
                }}
                onSubmit={handleAddCustomer}
                initialData={initialCustomerData}
              />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">고객 삭제</h3>
                    <p className="text-gray-600 mb-4">
                      <span className="font-semibold">{deleteConfirmation.customerName}</span> 고객을 정말 삭제하시겠습니까?
                    </p>
                    <p className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다.</p>
                  </div>
                  <div className="p-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                    <button
                      onClick={cancelDelete}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        }
      >
        <ContentSwitcher
          currentView={currentView}
          customers={customers}
          manualEvents={manualEvents}
          onSelectCustomer={handleSelectCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onUpdateCustomer={handleUpdateCustomer}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onAddClick={() => setIsFormOpen(true)}
          onToggleFavorite={handleToggleFavorite}
          onCreateManualEvent={createManualEvent}
          onUpdateManualEvent={updateManualEvent}
          onDeleteManualEvent={deleteManualEvent}
        />
      </MainLayout>
    </AppProvider>
  );
};

export default App;