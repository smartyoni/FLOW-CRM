import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClipboardCategory, ChecklistItem, SmsTemplates } from '../types';
import {
  subscribeToContractClipboard,
  updateContractClipboard,
  getContractClipboard,
  subscribeToPaymentClipboard,
  updatePaymentClipboard as updatePaymentClipboardFirestore,
  getPaymentClipboard,
  subscribeToSmsTemplates,
  updateSmsTemplates,
  getSmsTemplates
} from '../services/firestore';
import { generateId } from '../services/storage';
import { ConfirmModal } from '../components/ConfirmModal';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface AppContextType {
  contractClipboard: ClipboardCategory[];
  updateClipboard: (categories: ClipboardCategory[]) => Promise<void>;
  paymentClipboard: ClipboardCategory[];
  updatePaymentClipboard: (categories: ClipboardCategory[]) => Promise<void>;
  isLoading: boolean;
  confirmModal: ConfirmState;
  showConfirm: (title: string, message: string, confirmText?: string, cancelText?: string) => Promise<boolean>;
  closeConfirm: (confirmed: boolean) => void;
  smsTemplates: SmsTemplates;
  updateSmsTemplates: (templates: SmsTemplates) => Promise<void>;
  isSmsTemplateModalOpen: boolean;
  setSmsTemplateModalOpen: (isOpen: boolean) => void;
  smsTemplateModalCategory: keyof SmsTemplates | null;
  openSmsTemplateModal: (category?: keyof SmsTemplates) => void;
  getSmsTemplateText: (category: keyof SmsTemplates) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Migration logic for SMS templates
const migrateSmsTemplates = (templates: any): SmsTemplates => {
  const keys: (keyof SmsTemplates)[] = ['meeting', 'contract', 'payment', 'basic'];
  const migrated: any = {};

  keys.forEach(key => {
    const data = templates[key];
    // If it's already in the new format, keep it
    if (data && typeof data === 'object' && Array.isArray(data.options)) {
      migrated[key] = {
        options: data.options.length === 3 ? data.options : [...data.options, '', '', ''].slice(0, 3),
        selectedIndex: typeof data.selectedIndex === 'number' ? data.selectedIndex : 0
      };
    }
    // If it's the old string format, convert it
    else if (typeof data === 'string') {
      migrated[key] = {
        options: [data, '', ''],
        selectedIndex: 0
      };
    }
    // If missing or corrupted, use default
    else {
      migrated[key] = {
        options: ['', '', ''],
        selectedIndex: 0
      };
    }
  });

  return migrated as SmsTemplates;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contractClipboard, setContractClipboard] = useState<ClipboardCategory[]>([]);
  const [paymentClipboard, setPaymentClipboard] = useState<ClipboardCategory[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplates>({
    meeting: { options: ['', '', ''], selectedIndex: 0 },
    contract: { options: ['', '', ''], selectedIndex: 0 },
    payment: { options: ['', '', ''], selectedIndex: 0 },
    basic: { options: ['', '', ''], selectedIndex: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
  });
  const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);
  const [isSmsTemplateModalOpen, setIsSmsTemplateModalOpen] = useState(false);
  const [smsTemplateModalCategory, setSmsTemplateModalCategory] = useState<keyof SmsTemplates | null>(null);

  const openSmsTemplateModal = (category?: keyof SmsTemplates) => {
    setSmsTemplateModalCategory(category || null);
    setIsSmsTemplateModalOpen(true);
  };

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

    // Initial load of SMS templates
    (async () => {
      try {
        const templates = await getSmsTemplates();
        setSmsTemplates(migrateSmsTemplates(templates));
      } catch (error) {
        console.error('[AppContext] ❌ Error loading SMS templates:', error);
      }
    })();

    // Subscribe to SMS templates updates
    const unsubscribeSms = subscribeToSmsTemplates((templates) => {
      setSmsTemplates(migrateSmsTemplates(templates));
    });

    return () => {
      unsubscribe();
      unsubscribePayment();
      unsubscribeSms();
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

  // Show confirmation modal and return Promise
  const showConfirm = (title: string, message: string, confirmText = '확인', cancelText = '취소'): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
      });
      setConfirmResolve(() => resolve);
    });
  };

  // Close confirmation modal
  const closeConfirm = (confirmed: boolean) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    if (confirmResolve) {
      confirmResolve(confirmed);
      setConfirmResolve(null);
    }
  };

  // Update SMS templates
  const handleUpdateSmsTemplates = async (templates: SmsTemplates): Promise<void> => {
    // Optimistic update
    setSmsTemplates(templates);

    try {
      // Sync to Firebase
      await updateSmsTemplates(templates);
      console.log('[AppContext] ✓ SMS templates synced to Firebase');
    } catch (error) {
      console.error('[AppContext] ❌ Error syncing SMS templates:', error);
    }
  };

  return (
    <AppContext.Provider value={{
      contractClipboard,
      updateClipboard,
      paymentClipboard,
      updatePaymentClipboard,
      isLoading,
      confirmModal,
      showConfirm,
      closeConfirm,
      smsTemplates,
      updateSmsTemplates: handleUpdateSmsTemplates,
      isSmsTemplateModalOpen,
      setSmsTemplateModalOpen: setIsSmsTemplateModalOpen,
      smsTemplateModalCategory,
      openSmsTemplateModal,
      getSmsTemplateText: (category: keyof SmsTemplates) => {
        const cat = smsTemplates[category];
        if (!cat || !cat.options || !Array.isArray(cat.options)) return '';
        const index = typeof cat.selectedIndex === 'number' ? cat.selectedIndex : 0;
        return cat.options[index] || '';
      }
    }}>
      {children}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
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
