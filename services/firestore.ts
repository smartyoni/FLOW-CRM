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
 */
export const createCustomer = async (customer: Customer): Promise<void> => {
  try {
    const customerRef = doc(db, 'customers', customer.id);

    // Separate subcollections from main document
    const { checklists, meetings, ...customerData } = customer;

    await setDoc(customerRef, {
      ...customerData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Create initial checklists if any
    for (const checklist of checklists) {
      const checklistRef = doc(db, `customers/${customer.id}/checklists`, checklist.id);
      await setDoc(checklistRef, checklist);
    }

    // Create initial meetings if any
    for (const meeting of meetings) {
      await createMeeting(customer.id, meeting);
    }
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Update customer basic info and synchronize all subcollections
 */
export const updateCustomer = async (customerId: string, updates: Partial<Customer>): Promise<void> => {
  try {
    const customerRef = doc(db, 'customers', customerId);
    const { checklists, meetings, ...basicUpdates } = updates;

    // 1. 기본 정보 업데이트
    await updateDoc(customerRef, {
      ...basicUpdates,
      updatedAt: Timestamp.now(),
    });

    // 2. 체크리스트 동기화 (제공된 경우)
    if (checklists !== undefined) {
      await syncChecklists(customerId, checklists);
    }

    // 3. 미팅/매물 동기화 (제공된 경우)
    if (meetings !== undefined) {
      await syncMeetings(customerId, meetings);
    }

    console.log('✓ Customer data synced:', customerId);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

/**
 * Delete customer and all subcollections
 */
export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    // Delete checklists
    const checklistsRef = collection(db, `customers/${customerId}/checklists`);
    const checklistsSnap = await getDocs(checklistsRef);
    for (const doc of checklistsSnap.docs) {
      await deleteDoc(doc.ref);
    }

    // Delete meetings and properties
    const meetingsRef = collection(db, `customers/${customerId}/meetings`);
    const meetingsSnap = await getDocs(meetingsRef);
    for (const meetingDoc of meetingsSnap.docs) {
      await deleteMeeting(customerId, meetingDoc.id);
    }

    // Delete customer document
    const customerRef = doc(db, 'customers', customerId);
    await deleteDoc(customerRef);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

// =====================
// MEETING OPERATIONS
// =====================

export const createMeeting = async (customerId: string, meeting: Meeting): Promise<void> => {
  try {
    const meetingRef = doc(db, `customers/${customerId}/meetings`, meeting.id);
    const { properties, ...meetingData } = meeting;

    await setDoc(meetingRef, {
      ...meetingData,
      createdAt: meetingData.createdAt || Timestamp.now(),
    });

    // Create properties
    for (const property of properties) {
      await createProperty(customerId, meeting.id, property);
    }
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
};

export const updateMeeting = async (customerId: string, meetingId: string, updates: Partial<Meeting>): Promise<void> => {
  try {
    const meetingRef = doc(db, `customers/${customerId}/meetings`, meetingId);
    const { properties, ...updateData } = updates;

    await updateDoc(meetingRef, updateData);
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
};

export const deleteMeeting = async (customerId: string, meetingId: string): Promise<void> => {
  try {
    // Delete all properties first
    const propertiesRef = collection(db, `customers/${customerId}/meetings/${meetingId}/properties`);
    const propertiesSnap = await getDocs(propertiesRef);
    for (const propertyDoc of propertiesSnap.docs) {
      await deleteProperty(customerId, meetingId, propertyDoc.id);
    }

    // Delete meeting document
    const meetingRef = doc(db, `customers/${customerId}/meetings`, meetingId);
    await deleteDoc(meetingRef);
  } catch (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
};

// =====================
// PROPERTY OPERATIONS
// =====================

export const createProperty = async (customerId: string, meetingId: string, property: Property): Promise<void> => {
  try {
    const propertyRef = doc(db, `customers/${customerId}/meetings/${meetingId}/properties`, property.id);

    await setDoc(propertyRef, {
      ...property,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

export const updateProperty = async (
  customerId: string,
  meetingId: string,
  propertyId: string,
  updates: Partial<Property>
): Promise<void> => {
  try {
    const propertyRef = doc(db, `customers/${customerId}/meetings/${meetingId}/properties`, propertyId);
    await updateDoc(propertyRef, updates);
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
};

export const deleteProperty = async (customerId: string, meetingId: string, propertyId: string): Promise<void> => {
  try {
    const propertyRef = doc(db, `customers/${customerId}/meetings/${meetingId}/properties`, propertyId);
    await deleteDoc(propertyRef);
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
};

// =====================
// CHECKLIST OPERATIONS
// =====================

export const createChecklist = async (customerId: string, checklist: ChecklistItem): Promise<void> => {
  try {
    const checklistRef = doc(db, `customers/${customerId}/checklists`, checklist.id);
    await setDoc(checklistRef, checklist);
  } catch (error) {
    console.error('Error creating checklist:', error);
    throw error;
  }
};

export const updateChecklist = async (
  customerId: string,
  checklistId: string,
  updates: Partial<ChecklistItem>
): Promise<void> => {
  try {
    const checklistRef = doc(db, `customers/${customerId}/checklists`, checklistId);
    await updateDoc(checklistRef, updates);
  } catch (error) {
    console.error('Error updating checklist:', error);
    throw error;
  }
};

export const deleteChecklist = async (customerId: string, checklistId: string): Promise<void> => {
  try {
    const checklistRef = doc(db, `customers/${customerId}/checklists`, checklistId);
    await deleteDoc(checklistRef);
  } catch (error) {
    console.error('Error deleting checklist:', error);
    throw error;
  }
};

// =====================
// REAL-TIME LISTENERS
// =====================

export const subscribeToCustomers = (callback: (customers: Customer[]) => void): (() => void) => {
  const customersRef = collection(db, 'customers');
  const q = query(customersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checklists: [],
      meetings: [],
    } as Customer));
    callback(customers);
  }, (error) => {
    console.error('Error in customers listener:', error);
    callback([]);
  });
};

export const subscribeToCustomer = (customerId: string, callback: (customer: Customer | null) => void): (() => void) => {
  const customerRef = doc(db, 'customers', customerId);

  return onSnapshot(customerRef, async (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    // Fetch full customer with details
    const customer = await getCustomerWithDetails(customerId);
    callback(customer);
  }, (error) => {
    console.error('Error in customer listener:', error);
    callback(null);
  });
};

// Utility
export const generateId = () => Math.random().toString(36).substr(2, 9);

// =====================
// DIFF UTILITIES
// =====================

interface DiffResult<T extends { id: string }> {
  added: T[];
  updated: T[];
  removed: string[];
}

/**
 * 두 배열을 비교하여 추가/수정/삭제된 항목 반환
 */
function diffArrays<T extends { id: string }>(
  oldArray: T[],
  newArray: T[]
): DiffResult<T> {
  const oldMap = new Map(oldArray.map(item => [item.id, item]));
  const newMap = new Map(newArray.map(item => [item.id, item]));

  const added: T[] = [];
  const updated: T[] = [];
  const removed: string[] = [];

  // 추가 및 수정 감지
  for (const [id, newItem] of newMap) {
    if (!oldMap.has(id)) {
      added.push(newItem);
    } else {
      const oldItem = oldMap.get(id)!;
      if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        updated.push(newItem);
      }
    }
  }

  // 삭제 감지
  for (const id of oldMap.keys()) {
    if (!newMap.has(id)) {
      removed.push(id);
    }
  }

  return { added, updated, removed };
}

/**
 * 체크리스트 서브컬렉션을 현재 상태와 동기화
 */
async function syncChecklists(customerId: string, newChecklists: ChecklistItem[]): Promise<void> {
  try {
    // Firestore에서 현재 체크리스트 가져오기
    const checklistsRef = collection(db, `customers/${customerId}/checklists`);
    const checklistsSnap = await getDocs(checklistsRef);
    const oldChecklists = checklistsSnap.docs.map(doc => doc.data() as ChecklistItem);

    // Diff 계산
    const { added, updated, removed } = diffArrays(oldChecklists, newChecklists);

    // 변경사항 적용
    for (const item of added) {
      await createChecklist(customerId, item);
    }

    for (const item of updated) {
      await updateChecklist(customerId, item.id, item);
    }

    for (const id of removed) {
      await deleteChecklist(customerId, id);
    }

    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      console.log(`✓ Checklists synced: +${added.length} ~${updated.length} -${removed.length}`);
    }
  } catch (error) {
    console.error('Error syncing checklists:', error);
    throw error;
  }
}

/**
 * 특정 미팅 내의 매물 동기화
 */
async function syncProperties(
  customerId: string,
  meetingId: string,
  oldProperties: Property[],
  newProperties: Property[]
): Promise<void> {
  try {
    const { added, updated, removed } = diffArrays(oldProperties, newProperties);

    for (const property of added) {
      await createProperty(customerId, meetingId, property);
    }

    for (const property of updated) {
      await updateProperty(customerId, meetingId, property.id, property);
    }

    for (const id of removed) {
      await deleteProperty(customerId, meetingId, id);
    }

    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      console.log(`✓ Properties synced: +${added.length} ~${updated.length} -${removed.length}`);
    }
  } catch (error) {
    console.error('Error syncing properties:', error);
    throw error;
  }
}

/**
 * 미팅 및 중첩된 매물 동기화
 */
async function syncMeetings(customerId: string, newMeetings: Meeting[]): Promise<void> {
  try {
    // Firestore에서 현재 미팅 가져오기
    const meetingsRef = collection(db, `customers/${customerId}/meetings`);
    const meetingsSnap = await getDocs(meetingsRef);

    const oldMeetings: Meeting[] = [];
    for (const meetingDoc of meetingsSnap.docs) {
      const meetingData = meetingDoc.data();

      // 각 미팅의 매물도 가져오기
      const propertiesRef = collection(db, `customers/${customerId}/meetings/${meetingDoc.id}/properties`);
      const propertiesSnap = await getDocs(propertiesRef);
      const properties = propertiesSnap.docs.map(doc => doc.data() as Property);

      oldMeetings.push({
        id: meetingDoc.id,
        ...meetingData,
        properties,
      } as Meeting);
    }

    // Diff 계산
    const { added, updated, removed } = diffArrays(oldMeetings, newMeetings);

    // 미팅 추가
    for (const meeting of added) {
      await createMeeting(customerId, meeting);
    }

    // 미팅 수정 (매물도 함께 동기화)
    for (const meeting of updated) {
      await updateMeeting(customerId, meeting.id, meeting);

      const oldMeeting = oldMeetings.find(m => m.id === meeting.id);
      if (oldMeeting) {
        await syncProperties(customerId, meeting.id, oldMeeting.properties, meeting.properties);
      }
    }

    // 미팅 삭제
    for (const id of removed) {
      await deleteMeeting(customerId, id);
    }

    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      console.log(`✓ Meetings synced: +${added.length} ~${updated.length} -${removed.length}`);
    }
  } catch (error) {
    console.error('Error syncing meetings:', error);
    throw error;
  }
}
