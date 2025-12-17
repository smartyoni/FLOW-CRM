import { Customer } from '../types';

const STORAGE_KEY = 'estate_flow_customers_v1';

export const getCustomers = (): Customer[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load customers", e);
    return [];
  }
};

export const saveCustomers = (customers: Customer[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (e) {
    console.error("Failed to save customers (likely quota exceeded)", e);
    alert("저장 용량이 부족합니다. 사진을 줄여주세요.");
  }
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 현재 고객 데이터를 백업합니다.
 * 마이그레이션 전에 기존 데이터를 안전하게 보존하기 위해 사용합니다.
 */
export const backupCustomers = (): void => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const backup = {
        data,
        timestamp: Date.now(),
        version: 'v1'
      };
      localStorage.setItem(STORAGE_KEY + '_backup', JSON.stringify(backup));
      console.log('✓ 고객 데이터 백업 완료');
    }
  } catch (e) {
    console.error("Failed to backup customers", e);
  }
};

/**
 * 기존 Property 데이터 구조를 새 구조로 마이그레이션합니다.
 * - 기존 description 필드를 parsedText로 이동
 * - 새로운 4개 필드(roomName, jibun, agency, agencyPhone) 추가 (빈 문자열로 초기화)
 *
 * @param customers - 마이그레이션할 고객 배열
 * @returns 마이그레이션된 고객 배열
 */
export const migratePropertyData = (customers: Customer[]): Customer[] => {
  return customers.map(customer => ({
    ...customer,
    meetings: customer.meetings?.map(meeting => ({
      ...meeting,
      properties: meeting.properties.map((prop: any) => {
        // 기존 description 필드가 있고, 새로운 roomName 필드가 없는 경우 (구 버전)
        if ('description' in prop && !('roomName' in prop)) {
          return {
            id: prop.id,
            rawInput: prop.rawInput || prop.description || '',
            roomName: '',
            jibun: '',
            agency: '',
            agencyPhone: '',
            photos: prop.photos || [],
            parsedText: prop.description // 기존 description 보존
          };
        }
        // 이미 새 버전이거나 마이그레이션된 데이터
        return prop;
      })
    })) || []
  }));
};
