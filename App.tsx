import React, { useState, useEffect } from 'react';
import { Customer } from './types';
import { CustomerList } from './components/CustomerList';
import { CustomerDetailSidebar } from './components/CustomerDetailSidebar';
import { CustomerForm } from './components/CustomerForm';
import { Sidebar } from './components/Sidebar';
import { getCustomers, saveCustomers } from './services/storage';

const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    const loaded = getCustomers();
    setCustomers(loaded);
  }, []);

  // Save on change
  useEffect(() => {
    if (customers.length > 0 || getCustomers().length > 0) {
      saveCustomers(customers);
    }
  }, [customers]);

  const handleAddCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSidebarOpen(true);
  };

  const handleDeleteCustomer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
      if (selectedCustomer?.id === id) {
        setIsSidebarOpen(false);
        setSelectedCustomer(null);
      }
    }
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    setSelectedCustomer(updatedCustomer);
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

  return (
    <div className="flex flex-row w-full h-full bg-gray-100 relative overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content - Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <CustomerList
          customers={customers}
          onSelect={handleSelectCustomer}
          onAddClick={() => setIsFormOpen(true)}
          onDelete={handleDeleteCustomer}
          onToggleFavorite={handleToggleFavorite}
        />
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