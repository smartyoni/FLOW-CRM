import React, { useState, useEffect } from 'react';
import { Customer } from './types';
import { CustomerList } from './components/CustomerList';
import { CustomerDetailSidebar } from './components/CustomerDetailSidebar';
import { CustomerForm } from './components/CustomerForm';
import { Sidebar } from './components/Sidebar';
import { ManagingCustomerView } from './components/ManagingCustomerView';
import { ContractCustomerView } from './components/ContractCustomerView';
import { AppProvider } from './contexts/AppContext';
import { subscribeToCustomers, subscribeToCustomer, createCustomer, deleteCustomer, updateCustomer, generateId, migrateSubcollectionsToArrays, migrateStageFromMeetingComplete, migrateCheckpointFromContractToBank } from './services/firestore';

type ViewMode = 'customerList' | 'managingCustomer' | 'contractCustomer';

const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [initialCustomerData, setInitialCustomerData] = useState<Partial<Customer> | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('customerList');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ customerId: string; customerName: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [syncStatus, setSyncStatus] = useState<{
    isListening: boolean;
    lastSync: number | null;
    customerCount: number;
    detailListening: boolean;
  }>({
    isListening: false,
    lastSync: null,
    customerCount: 0,
    detailListening: false,
  });

  // 마이그레이션: 서브컬렉션 데이터를 배열 필드로 전환 (최초 1회만 실행)
  useEffect(() => {
    const runMigration = async () => {
      try {
        // 마이그레이션 v1: 최초 1회만 실행
        if (!localStorage.getItem('migration_completed_v1')) {
          console.log('🔄 Starting migration v1...');
          await migrateSubcollectionsToArrays();
          localStorage.setItem('migration_completed_v1', 'true');
          console.log('✓ Migration v1 completed and marked as done');
        } else {
          console.log('✓ Migration v1 already completed, skipping');
        }

        // 마이그레이션 v2: 미팅진행함 → 미팅진행
        if (!localStorage.getItem('migration_completed_v2')) {
          console.log('🔄 Starting migration v2 (stage update)...');
          await migrateStageFromMeetingComplete();
          localStorage.setItem('migration_completed_v2', 'true');
          console.log('✓ Migration v2 completed and marked as done');
        } else {
          console.log('✓ Migration v2 already completed, skipping');
        }

        // 마이그레이션 v3: 계약진행 → 은행방문중
        if (!localStorage.getItem('migration_completed_v3')) {
          console.log('🔄 Starting migration v3 (checkpoint update)...');
          await migrateCheckpointFromContractToBank();
          localStorage.setItem('migration_completed_v3', 'true');
          console.log('✓ Migration v3 completed and marked as done');
        } else {
          console.log('✓ Migration v3 already completed, skipping');
        }
      } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        setError('데이터 마이그레이션 중 오류가 발생했습니다.');
      }
    };

    runMigration();
  }, []);

  // Real-time listener for customers
  useEffect(() => {
    console.log('[App] 🚀 Initializing customers real-time listener');
    setLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToCustomers((fetchedCustomers) => {
        console.log(`[App] 📥 Received ${fetchedCustomers.length} customers from subscription`);
        setCustomers(fetchedCustomers);
        setLoading(false);
        setSyncStatus(prev => ({
          ...prev,
          isListening: true,
          lastSync: Date.now(),
          customerCount: fetchedCustomers.length,
        }));
      });

      // Cleanup on unmount
      return () => {
        console.log('[App] 🛑 Cleaning up customers listener');
        setSyncStatus(prev => ({ ...prev, isListening: false }));
        unsubscribe();
      };
    } catch (err) {
      console.error('[App] ❌ Firebase 연결 오류:', err);
      setError('데이터를 로드할 수 없습니다. Firebase 연결을 확인해주세요.');
      setLoading(false);
    }
  }, []);

  // Listen for full customer details when customer is selected
  // After migration, subscribeToCustomer returns complete data with array fields
  useEffect(() => {
    if (!selectedCustomer) {
      console.log('[App] ⏭️ Skipping customer detail listener (no selected customer)');
      return;
    }

    console.log(`[App] 🚀 Initializing detail listener for customer: ${selectedCustomer.id}`);
    const unsubscribe = subscribeToCustomer(selectedCustomer.id, (customer) => {
      if (customer) {
        console.log(`[App] 📥 Received updated customer data:`, {
          id: customer.id,
          name: customer.name,
          meetings: customer.meetings?.length || 0,
          checklists: customer.checklists?.length || 0,
        });
        setSelectedCustomer(customer);
        setSyncStatus(prev => ({ ...prev, detailListening: true }));
      } else {
        console.warn(`[App] ⚠️ Customer ${selectedCustomer.id} not found in Firestore`);
        setSyncStatus(prev => ({ ...prev, detailListening: false }));
      }
    });

    return () => {
      console.log(`[App] 🛑 Cleaning up detail listener for customer: ${selectedCustomer.id}`);
      setSyncStatus(prev => ({ ...prev, detailListening: false }));
      unsubscribe();
    };
  }, [selectedCustomer?.id]);

  // Online/Offline detection
  useEffect(() => {
    console.log(`[App] 🌐 Initial network status: ${navigator.onLine ? 'ONLINE ✅' : 'OFFLINE ❌'}`);

    const handleOnline = () => {
      console.log('[App] 📶 Network status: ONLINE ✅ (connection restored)');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[App] 📵 Network status: OFFLINE ❌ (no connection)');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check periodically (for mobile network changes)
    const checkInterval = setInterval(() => {
      const current = navigator.onLine;
      console.log(`[App] 🔄 Network check: ${current ? 'ONLINE ✅' : 'OFFLINE ❌'}`);
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
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
        console.log('[App] 🔗 Shared content detected:', { customerName });
        setInitialCustomerData({
          contact: customerName.trim(),
          memo: sharedUrl ? `URL: ${sharedUrl}` : ''
        });
        setIsFormOpen(true);
      }

      // Remove URL parameters to prevent re-triggering on refresh
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

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isSidebarOpen]);

  const handleAddCustomer = async (customer: Customer) => {
    try {
      // Add ID if not present
      if (!customer.id) {
        customer.id = generateId();
      }

      console.log(`[App] ➕ Adding new customer:`, {
        id: customer.id,
        name: customer.name,
        meetings: customer.meetings?.length || 0,
      });

      // Optimistic update
      setCustomers(prev => [customer, ...prev]);

      // Persist to Firestore
      await createCustomer(customer);
      console.log(`[App] ✅ Customer added successfully: ${customer.id}`);
    } catch (err) {
      console.error('[App] ❌ Error adding customer:', err);
      setError('고객을 추가할 수 없습니다.');
      // Revert optimistic update
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSidebarOpen(true);
  };

  const handleDeleteCustomer = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const customer = customers.find(c => c.id === id);
    if (customer) {
      setDeleteConfirmation({ customerId: id, customerName: customer.name });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    const id = deleteConfirmation.customerId;
    const deletedCustomer = customers.find(c => c.id === id);

    try {
      setCustomers(prev => prev.filter(c => c.id !== id));

      // Close sidebar if deleted customer is selected
      if (selectedCustomer?.id === id) {
        setIsSidebarOpen(false);
        setSelectedCustomer(null);
      }

      // Persist to Firestore
      await deleteCustomer(id);
      setDeleteConfirmation(null);
    } catch (err) {
      console.error('고객 삭제 실패:', err);
      setError('고객을 삭제할 수 없습니다.');
      // Revert optimistic update
      if (deletedCustomer) {
        setCustomers(prev => [...prev, deletedCustomer]);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  // Pull to Refresh Handler
  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && startY > 0) {
        const currentY = e.touches[0].clientY;
        const distance = currentY - startY;
        if (distance > 0) {
          setPullDistance(Math.min(distance, 100));
        }
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

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {
      console.log(`[App] ✏️ Updating customer: ${updatedCustomer.id}`, {
        name: updatedCustomer.name,
        meetings: updatedCustomer.meetings?.length || 0,
        checklists: updatedCustomer.checklists?.length || 0,
      });

      // Optimistic update
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer);

      // Persist to Firestore
      await updateCustomer(updatedCustomer.id, updatedCustomer);
      console.log(`[App] ✅ Customer updated successfully: ${updatedCustomer.id}`);
    } catch (err) {
      console.error('[App] ❌ Error updating customer:', err);
      setError('고객을 수정할 수 없습니다.');
    }
  };

  const handleToggleFavorite = (id: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const isFav = !c.isFavorite;
        return {
          ...c,
          isFavorite: isFav,
          favoritedAt: isFav ? Date.now() : undefined
        };
      }
      return c;
    }));
  };

  const handleToggleFavoriteFilter = () => {
    setShowFavoritesOnly(prev => !prev);
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
  };

  // Loading state
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

  // Error state
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
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="사이드바 닫기"
        />
      )}

      {/* Left Sidebar */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        currentView={currentView}
        onViewChange={handleViewChange}
        customers={customers}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'managingCustomer' ? (
            <ManagingCustomerView
              customers={customers}
              onSelect={handleSelectCustomer}
              onDelete={handleDeleteCustomer}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
            />
          ) : currentView === 'contractCustomer' ? (
            <ContractCustomerView
              customers={customers.filter(c => c.contractStatus)}
              onSelect={handleSelectCustomer}
              onDelete={handleDeleteCustomer}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
            />
          ) : (
            <CustomerList
              customers={customers}
              onSelect={handleSelectCustomer}
              onAddClick={() => setIsFormOpen(true)}
              onDelete={handleDeleteCustomer}
              onToggleFavorite={handleToggleFavorite}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
            />
          )}
        </div>

        {/* Mobile Bottom Tab Bar */}
        <div className="md:hidden border-t bg-white flex items-center shrink-0">
          <button
            onClick={() => handleViewChange('customerList')}
            className={`flex-1 py-2 px-4 text-center text-sm font-medium transition-colors border-t-2 ${
              currentView === 'customerList'
                ? 'bg-blue-200 border-blue-700 text-blue-700'
                : 'bg-blue-100 border-transparent text-blue-600'
            }`}
          >
            접수~첫미팅
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button
            onClick={() => handleViewChange('managingCustomer')}
            className={`flex-1 py-2 px-4 text-center text-sm font-medium transition-colors border-t-2 ${
              currentView === 'managingCustomer'
                ? 'bg-purple-200 border-purple-700 text-purple-700'
                : 'bg-purple-100 border-transparent text-purple-600'
            }`}
          >
            재미팅~계약
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button
            onClick={() => handleViewChange('contractCustomer')}
            className={`flex-1 py-2 px-4 text-center text-sm font-medium transition-colors border-t-2 ${
              currentView === 'contractCustomer'
                ? 'bg-green-200 border-green-700 text-green-700'
                : 'bg-green-100 border-transparent text-green-600'
            }`}
          >
            계약~잔금
          </button>
        </div>
      </div>

      {/* Right Detail Sidebar (Overlay) */}
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
      </div>
    </AppProvider>
  );
};

export default App;