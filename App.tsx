import React, { useState, useEffect } from 'react';
import { Customer } from './types';
import { CustomerList } from './components/CustomerList';
import { CustomerDetailSidebar } from './components/CustomerDetailSidebar';
import { CustomerForm } from './components/CustomerForm';
import { Sidebar } from './components/Sidebar';
import { ManagingCustomerView } from './components/ManagingCustomerView';
import { subscribeToCustomers, subscribeToCustomer, createCustomer, deleteCustomer, updateCustomer, generateId, migrateSubcollectionsToArrays } from './services/firestore';

type ViewMode = 'customerList' | 'managingCustomer';

const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('customerList');

  // 마이그레이션: 서브컬렉션 데이터를 배열 필드로 전환 (최초 1회만 실행)
  useEffect(() => {
    const runMigration = async () => {
      try {
        // 최초 1회만 실행 확인
        if (!localStorage.getItem('migration_completed_v1')) {
          console.log('🔄 Starting migration...');
          await migrateSubcollectionsToArrays();
          localStorage.setItem('migration_completed_v1', 'true');
          console.log('✓ Migration completed and marked as done');
        } else {
          console.log('✓ Migration already completed, skipping');
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
    setLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToCustomers((fetchedCustomers) => {
        setCustomers(fetchedCustomers);
        setLoading(false);
        console.log('✓ 데이터 실시간 동기화 완료:', fetchedCustomers.length, '명');
      });

      // Cleanup on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error('Firebase 연결 오류:', err);
      setError('데이터를 로드할 수 없습니다. Firebase 연결을 확인해주세요.');
      setLoading(false);
    }
  }, []);

  // Listen for full customer details when customer is selected
  // After migration, subscribeToCustomer returns complete data with array fields
  useEffect(() => {
    if (!selectedCustomer) return;

    console.log('👁️ Loading full customer details:', selectedCustomer.id);
    const unsubscribe = subscribeToCustomer(selectedCustomer.id, (customer) => {
      if (customer) {
        console.log('✓ Full customer details loaded:', customer);
        setSelectedCustomer(customer);
      }
    });

    return () => unsubscribe();
  }, [selectedCustomer?.id]);

  // Online/Offline detection
  useEffect(() => {
    console.log('🌐 Initial online status:', navigator.onLine ? 'ONLINE' : 'OFFLINE');

    const handleOnline = () => {
      console.log('📶 Network status: ONLINE (connection restored)');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📵 Network status: OFFLINE (no connection)');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check periodically (for mobile network changes)
    const checkInterval = setInterval(() => {
      const current = navigator.onLine;
      console.log('🔄 Network check:', current ? 'ONLINE' : 'OFFLINE');
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, []);

  const handleAddCustomer = async (customer: Customer) => {
    try {
      // Add ID if not present
      if (!customer.id) {
        customer.id = generateId();
      }

      // Optimistic update
      setCustomers(prev => [customer, ...prev]);

      // Persist to Firestore
      await createCustomer(customer);
    } catch (err) {
      console.error('고객 추가 실패:', err);
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
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    // Optimistic update
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
    } catch (err) {
      console.error('고객 삭제 실패:', err);
      setError('고객을 삭제할 수 없습니다.');
      // Revert optimistic update
      if (deletedCustomer) {
        setCustomers(prev => [...prev, deletedCustomer]);
      }
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {
      // Optimistic update
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer);

      // Persist to Firestore
      await updateCustomer(updatedCustomer.id, updatedCustomer);
    } catch (err) {
      console.error('고객 수정 실패:', err);
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
    <div className="flex flex-row w-full h-full bg-gray-100 relative overflow-hidden">
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
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'managingCustomer' ? (
          <ManagingCustomerView
            customers={customers}
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
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleAddCustomer}
        />
      )}
    </div>
  );
};

export default App;