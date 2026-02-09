import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClipboardCategory, ChecklistItem } from '../types';
import {
  subscribeToContractClipboard,
  updateContractClipboard,
  getContractClipboard,
  subscribeToPaymentClipboard,
  updatePaymentClipboard as updatePaymentClipboardFirestore,
  getPaymentClipboard
} from '../services/firestore';
import { generateId } from '../services/storage';

interface AppContextType {
  contractClipboard: ClipboardCategory[];
  updateClipboard: (categories: ClipboardCategory[]) => Promise<void>;
  paymentClipboard: ClipboardCategory[];
  updatePaymentClipboard: (categories: ClipboardCategory[]) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contractClipboard, setContractClipboard] = useState<ClipboardCategory[]>([]);
  const [paymentClipboard, setPaymentClipboard] = useState<ClipboardCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and subscribe to contract clipboard
  useEffect(() => {
    console.log('[AppContext] 🚀 Initializing contract clipboard');
    setIsLoading(true);

    // First, load initial data
    (async () => {
      try {
        const rawData = await getContractClipboard();
        let migratedData: ClipboardCategory[] = rawData as ClipboardCategory[];

        // 구 데이터 감지 및 자동 마이그레이션
        if (rawData.length > 0 && 'text' in rawData[0]) {
          console.log('[AppContext] 🔄 Migrating old data...');
          const oldData = rawData as unknown as ChecklistItem[];

          migratedData = [{
            id: generateId(),
            title: '기존 항목',
            isExpanded: true,
            items: oldData.map(old => ({
              id: old.id,
              title: old.text,
              content: old.memo || '',
              createdAt: old.createdAt
            })),
            createdAt: Date.now()
          }];

          await updateContractClipboard(migratedData);
          console.log('[AppContext] ✅ Migration completed');
        }

        setContractClipboard(migratedData);
        console.log(`[AppContext] 📥 Loaded ${migratedData.length} clipboard categories`);
      } catch (error) {
        console.error('[AppContext] ❌ Error loading clipboard:', error);
      } finally {
        setIsLoading(false);
      }
    })();

    // Then subscribe to real-time updates
    const unsubscribe = subscribeToContractClipboard((categories) => {
      console.log(`[AppContext] 📡 Received ${categories.length} clipboard categories from subscription`);
      setContractClipboard(categories);
      setIsLoading(false);
    });

    // Initialize payment clipboard
    (async () => {
      try {
        const rawData = await getPaymentClipboard();
        let migratedData: ClipboardCategory[] = rawData as ClipboardCategory[];

        // 구 데이터 감지 및 자동 마이그레이션
        if (rawData.length > 0 && 'text' in rawData[0]) {
          console.log('[AppContext] 🔄 Migrating old payment data...');
          const oldData = rawData as unknown as ChecklistItem[];

          migratedData = [{
            id: generateId(),
            title: '기존 항목',
            isExpanded: true,
            items: oldData.map(old => ({
              id: old.id,
              title: old.text,
              content: old.memo || '',
              createdAt: old.createdAt
            })),
            createdAt: Date.now()
          }];

          await updatePaymentClipboardFirestore(migratedData);
          console.log('[AppContext] ✅ Payment migration completed');
        }

        setPaymentClipboard(migratedData);
        console.log(`[AppContext] 📥 Loaded ${migratedData.length} payment clipboard categories`);
      } catch (error) {
        console.error('[AppContext] ❌ Error loading payment clipboard:', error);
      }
    })();

    // Subscribe to payment clipboard updates
    const unsubscribePayment = subscribeToPaymentClipboard((categories) => {
      console.log(`[AppContext] 📡 Received ${categories.length} payment clipboard categories from subscription`);
      setPaymentClipboard(categories);
    });

    return () => {
      unsubscribe();
      unsubscribePayment();
    };
  }, []);

  // Optimistic update + Firebase sync
  const updateClipboard = async (categories: ClipboardCategory[]): Promise<void> => {
    // Optimistic update
    setContractClipboard(categories);

    try {
      // Sync to Firebase
      await updateContractClipboard(categories);
      console.log('[AppContext] ✓ Clipboard synced to Firebase');
    } catch (error) {
      console.error('[AppContext] ❌ Error syncing clipboard:', error);
      // Could reload from Firebase on error, but for now just log
    }
  };

  // Optimistic update + Firebase sync for payment clipboard
  const updatePaymentClipboard = async (categories: ClipboardCategory[]): Promise<void> => {
    // Optimistic update
    setPaymentClipboard(categories);

    try {
      // Sync to Firebase
      await updatePaymentClipboardFirestore(categories);
      console.log('[AppContext] ✓ Payment clipboard synced to Firebase');
    } catch (error) {
      console.error('[AppContext] ❌ Error syncing payment clipboard:', error);
      // Could reload from Firebase on error, but for now just log
    }
  };

  return (
    <AppContext.Provider value={{ contractClipboard, updateClipboard, paymentClipboard, updatePaymentClipboard, isLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
