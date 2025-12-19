import { Customer, Meeting, Property, ChecklistItem } from '../types';
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// =====================
// CUSTOMER OPERATIONS
// =====================

/**
 * Fetch all customers (without subcollections)
 * Used for Kanban board display
 */
export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(query(customersRef, orderBy('createdAt', 'desc')));

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checklists: [],
      meetings: [],
    } as Customer));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
};

/**
 * Fetch a single customer with all subcollections
 * Used when opening customer detail sidebar
 */
export const getCustomerWithDetails = async (customerId: string): Promise<Customer | null> => {
  try {
    // Fetch customer document
    const customerRef = doc(db, 'customers', customerId);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) return null;

    const customerData = customerSnap.data();

    // Fetch checklists subcollection
    const checklistsRef = collection(db, `customers/${customerId}/checklists`);
    const checklistsSnap = await getDocs(checklistsRef);
    const checklists = checklistsSnap.docs.map(doc => doc.data() as ChecklistItem);

    // Fetch meetings subcollection
    const meetingsRef = collection(db, `customers/${customerId}/meetings`);
    const meetingsSnap = await getDocs(query(meetingsRef, orderBy('createdAt', 'asc')));

    const meetings: Meeting[] = [];

    // Fetch properties for each meeting
    for (const meetingDoc of meetingsSnap.docs) {
      const meetingData = meetingDoc.data();
      const propertiesRef = collection(db, `customers/${customerId}/meetings/${meetingDoc.id}/properties`);
      const propertiesSnap = await getDocs(propertiesRef);
      const properties = propertiesSnap.docs.map(doc => doc.data() as Property);

      meetings.push({
        id: meetingDoc.id,
        ...meetingData,
        properties,
      } as Meeting);
    }

    return {
      id: customerSnap.id,
      ...customerData,
      checklists,
      meetings,
    } as Customer;
  } catch (error) {
    console.error('Error fetching customer with details:', error);
    return null;
  }
};

/**
 * Create a new customer
 * After migration, checklists and meetings are stored as array fields in the main document
 */
export const createCustomer = async (customer: Customer): Promise<void> => {
  try {
    const customerRef = doc(db, 'customers', customer.id);

    await setDoc(customerRef, {
      ...customer,
      checklists: customer.checklists || [],
      meetings: customer.meetings || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('✓ Customer created:', customer.id);
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Update customer (including array fields: checklists and meetings)
 * After migration, all data is stored in a single document with array fields
 */
export const updateCustomer = async (customerId: string, updates: Partial<Customer>): Promise<void> => {
  try {
    const customerRef = doc(db, 'customers', customerId);

    await updateDoc(customerRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });

    console.log('✓ Customer updated:', customerId);
  } catch (error) {
    console.error('❌ Error updating customer:', error);
    throw error;
  }
};

/**
 * Delete customer document
 * After migration, array fields are deleted along with the main document
 * Legacy subcollections can be cleaned up separately if needed
 */
export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    const customerRef = doc(db, 'customers', customerId);
    await deleteDoc(customerRef);
    console.log('✓ Customer deleted:', customerId);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

// =====================
// REAL-TIME LISTENERS
// =====================

export const subscribeToCustomers = (callback: (customers: Customer[]) => void): (() => void) => {
  const customersRef = collection(db, 'customers');
  const q = query(customersRef, orderBy('createdAt', 'desc'));

  console.log('👂 Setting up real-time listener for customers list');

  return onSnapshot(q, (snapshot) => {
    console.log('📡 Customers snapshot received:', snapshot.docs.length, 'documents');
    const customers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        checklists: data.checklists || [],
        meetings: data.meetings || [],
      } as Customer;
    });
    callback(customers);
  }, (error) => {
    console.error('❌ Error in customers listener:', error);
    if (error.code === 'permission-denied') {
      console.error('🔐 Permission denied - check Firebase rules');
    } else if (error.code === 'unavailable') {
      console.error('📵 Firestore unavailable - offline mode');
    }
    callback([]);
  });
};

export const subscribeToCustomer = (customerId: string, callback: (customer: Customer | null) => void): (() => void) => {
  const customerRef = doc(db, 'customers', customerId);

  console.log('👂 Setting up real-time listener for customer:', customerId);

  return onSnapshot(customerRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.log('⚠️ Customer document does not exist:', customerId);
      callback(null);
      return;
    }

    console.log('📡 Customer snapshot received:', customerId);

    // After migration, array fields are directly available in the snapshot
    const data = snapshot.data();
    const customer: Customer = {
      id: snapshot.id,
      ...data,
      checklists: data.checklists || [],
      meetings: data.meetings || [],
    } as Customer;

    console.log('✅ Customer details loaded:', {
      id: customer.id,
      name: customer.name,
      checklistsCount: customer.checklists?.length || 0,
      meetingsCount: customer.meetings?.length || 0,
    });

    callback(customer);
  }, (error) => {
    console.error('❌ Error in customer listener:', error);
    if (error.code === 'permission-denied') {
      console.error('🔐 Permission denied - check Firebase rules');
    } else if (error.code === 'unavailable') {
      console.error('📵 Firestore unavailable - offline mode');
    }
    callback(null);
  });
};

// Utility
export const generateId = () => Math.random().toString(36).substr(2, 9);

// =====================
// MIGRATION OPERATIONS
// =====================

/**
 * 마이그레이션: 서브컬렉션 데이터를 배열 필드로 전환
 * 런타임 시 자동 실행되며, 이미 마이그레이션된 고객은 스킵됨 (멱등성)
 */
export const migrateSubcollectionsToArrays = async (): Promise<void> => {
  try {
    console.log('🔄 Starting migration: subcollections → array fields');

    const customersRef = collection(db, 'customers');
    const customersSnap = await getDocs(customersRef);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const customerDoc of customersSnap.docs) {
      const customerId = customerDoc.id;
      const customerData = customerDoc.data();

      try {
        // 이미 배열 필드가 있고 데이터가 있으면 스킵
        if (
          Array.isArray(customerData.checklists) &&
          customerData.checklists.length > 0 &&
          Array.isArray(customerData.meetings) &&
          customerData.meetings.length > 0
        ) {
          console.log(`✓ Customer ${customerId} already migrated, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`🔄 Migrating customer ${customerId}...`);

        // 1. 체크리스트 서브컬렉션 읽기
        const checklistsRef = collection(db, `customers/${customerId}/checklists`);
        const checklistsSnap = await getDocs(checklistsRef);
        const checklists = checklistsSnap.docs.map(doc => doc.data() as ChecklistItem);

        // 2. 미팅 서브컬렉션 읽기 (매물 포함)
        const meetingsRef = collection(db, `customers/${customerId}/meetings`);
        const meetingsSnap = await getDocs(query(meetingsRef, orderBy('createdAt', 'asc')));

        const meetings: Meeting[] = [];
        for (const meetingDoc of meetingsSnap.docs) {
          const meetingData = meetingDoc.data();

          // 각 미팅의 매물 서브컬렉션 읽기
          const propertiesRef = collection(db, `customers/${customerId}/meetings/${meetingDoc.id}/properties`);
          const propertiesSnap = await getDocs(propertiesRef);
          const properties = propertiesSnap.docs.map(doc => doc.data() as Property);

          meetings.push({
            id: meetingDoc.id,
            ...meetingData,
            properties,
          } as Meeting);
        }

        // 3. 메인 문서 업데이트 (배열 필드로 병합)
        await updateDoc(doc(db, 'customers', customerId), {
          checklists: checklists,
          meetings: meetings,
          migratedAt: Timestamp.now(),
        });

        console.log(`✓ Migrated customer ${customerId}:`, {
          checklists: checklists.length,
          meetings: meetings.length,
          totalProperties: meetings.reduce((sum, m) => sum + (m.properties?.length || 0), 0),
        });

        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating customer ${customerId}:`, error);
        errorCount++;
        // 해당 고객 실패해도 다른 고객은 계속 진행
      }
    }

    console.log(`✓ Migration complete:`, {
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: customersSnap.docs.length,
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * 롤백: 배열 필드 데이터를 서브컬렉션으로 복원 (마이그레이션 취소)
 */
export const rollbackToSubcollections = async (): Promise<void> => {
  try {
    console.log('🔙 Starting rollback: array fields → subcollections');

    const customersRef = collection(db, 'customers');
    const customersSnap = await getDocs(customersRef);

    let rolledBackCount = 0;

    for (const customerDoc of customersSnap.docs) {
      const customerId = customerDoc.id;
      const data = customerDoc.data();

      try {
        console.log(`🔙 Rolling back customer ${customerId}...`);

        // 1. 배열 필드 데이터 읽기
        const checklists = data.checklists || [];
        const meetings = data.meetings || [];

        // 2. 체크리스트 서브컬렉션으로 복원
        for (const checklist of checklists) {
          const checklistRef = doc(db, `customers/${customerId}/checklists`, checklist.id);
          await setDoc(checklistRef, checklist);
        }

        // 3. 미팅 및 매물 서브컬렉션으로 복원
        for (const meeting of meetings) {
          const meetingRef = doc(db, `customers/${customerId}/meetings`, meeting.id);
          const { properties, ...meetingData } = meeting;
          await setDoc(meetingRef, meetingData);

          // 매물 복원
          for (const property of (properties || [])) {
            const propertyRef = doc(db, `customers/${customerId}/meetings/${meeting.id}/properties`, property.id);
            await setDoc(propertyRef, property);
          }
        }

        console.log(`✓ Rolled back customer ${customerId}`);
        rolledBackCount++;
      } catch (error) {
        console.error(`❌ Error rolling back customer ${customerId}:`, error);
      }
    }

    console.log(`✓ Rollback complete: ${rolledBackCount}/${customersSnap.docs.length} customers rolled back`);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
};
