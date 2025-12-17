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
