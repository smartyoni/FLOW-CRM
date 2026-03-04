import React, { useState, useEffect } from 'react';
import { Customer, ManualEvent } from '../types';
import {
    subscribeToCustomers,
    subscribeToCustomer,
    createCustomer,
    deleteCustomer as deleteCustomerFromFirestore,
    updateCustomer,
    generateId,
    migrateSubcollectionsToArrays,
    migrateStageFromMeetingComplete,
    migrateCheckpointFromContractToBank,
    subscribeToManualEvents,
    createManualEvent,
    updateManualEvent,
    deleteManualEvent
} from '../services/firestore';

interface UseCustomerDataOptions {
    onSelectedCustomerDeleted?: () => void;
}

export function useCustomerData(options?: UseCustomerDataOptions) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [manualEvents, setManualEvents] = useState<ManualEvent[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ customerId: string; customerName: string } | null>(null);

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

    // Real-time listener for manual events
    useEffect(() => {
        console.log('[App] 🚀 Initializing manual events real-time listener');
        try {
            const unsubscribe = subscribeToManualEvents((fetchedEvents) => {
                console.log(`[App] 📥 Received ${fetchedEvents.length} manual events`);
                setManualEvents(fetchedEvents);
            });
            return () => unsubscribe();
        } catch (err) {
            console.error('[App] ❌ Manual events subscription error:', err);
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
                setSelectedCustomer(null);
                options?.onSelectedCustomerDeleted?.();
            }

            // Persist to Firestore
            await deleteCustomerFromFirestore(id);
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

    return {
        // State
        customers,
        manualEvents,
        selectedCustomer,
        setSelectedCustomer,
        loading,
        error,
        syncStatus,
        deleteConfirmation,

        // Handlers
        handleAddCustomer,
        handleUpdateCustomer,
        handleDeleteCustomer,
        confirmDelete,
        cancelDelete,
        handleToggleFavorite,

        // Manual event operations (re-exported from firestore)
        createManualEvent,
        updateManualEvent,
        deleteManualEvent,
    };
}
