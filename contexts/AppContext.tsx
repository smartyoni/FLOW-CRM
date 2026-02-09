import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChecklistItem } from '../types';
import { subscribeToContractClipboard, updateContractClipboard, getContractClipboard } from '../services/firestore';

interface AppContextType {
  contractClipboard: ChecklistItem[];
  updateClipboard: (items: ChecklistItem[]) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contractClipboard, setContractClipboard] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and subscribe to contract clipboard
  useEffect(() => {
    console.log('[AppContext] 🚀 Initializing contract clipboard');
    setIsLoading(true);

    // First, load initial data
    (async () => {
      try {
        const initialData = await getContractClipboard();
        setContractClipboard(initialData);
        console.log(`[AppContext] 📥 Loaded ${initialData.length} clipboard items`);
      } catch (error) {
        console.error('[AppContext] ❌ Error loading clipboard:', error);
      } finally {
        setIsLoading(false);
      }
    })();

    // Then subscribe to real-time updates
    const unsubscribe = subscribeToContractClipboard((items) => {
      console.log(`[AppContext] 📡 Received ${items.length} clipboard items from subscription`);
      setContractClipboard(items);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Optimistic update + Firebase sync
  const updateClipboard = async (items: ChecklistItem[]): Promise<void> => {
    // Optimistic update
    setContractClipboard(items);

    try {
      // Sync to Firebase
      await updateContractClipboard(items);
      console.log('[AppContext] ✓ Clipboard synced to Firebase');
    } catch (error) {
      console.error('[AppContext] ❌ Error syncing clipboard:', error);
      // Could reload from Firebase on error, but for now just log
    }
  };

  return (
    <AppContext.Provider value={{ contractClipboard, updateClipboard, isLoading }}>
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
