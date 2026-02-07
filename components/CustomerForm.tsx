import React, { useState } from 'react';
import { Customer } from '../types';
import { generateId } from '../services/storage';
import { formatPhoneNumber } from '../utils/phoneUtils';

interface Props {
  onClose: () => void;
  onSubmit: (customer: Customer) => void;
  initialData?: Partial<Customer>;
}

export const CustomerForm: React.FC<Props> = ({ onClose, onSubmit, initialData }) => {
  // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<Partial<Customer>>(() => {
    const todayDate = getTodayDate();
    return {
      name: initialData?.name || '',
      contact: initialData?.contact || '',
      moveInDate: initialData?.moveInDate || '',
      price: initialData?.price || '',
      rentPrice: initialData?.rentPrice || '',
      memo: initialData?.memo || '',
      registrationDate: initialData?.registrationDate || todayDate,
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('고객명은 필수입니다.');
      return;
    }

    const newCustomer: Customer = {
      id: generateId(),
      name: formData.name || '',
      contact: formData.contact || '',
      moveInDate: formData.moveInDate || '',
      price: formData.price || '',
      rentPrice: formData.rentPrice || '',
      memo: formData.memo || '',
      registrationDate: formData.registrationDate || getTodayDate(),
      priceType: formData.rentPrice ? 'rent' : 'sale', // simple logic
      stage: '접수고객', // Default stage
      checklists: [],
      meetings: [], // Initialize with empty array
      contractHistory: [
        {
          id: generateId(),
          text: '계약내용',
          createdAt: Date.now(),
          memo: ''
        }
      ],
      paymentHistory: [
        {
          id: generateId(),
          text: '잔금업무',
          createdAt: Date.now(),
          memo: ''
        }
      ]
    };

    onSubmit(newCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-primary px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-lg">고객등록</h2>
            <input
              type="date"
              className="bg-blue-600 text-green-500 font-bold text-sm px-2 py-1 rounded border-2 border-gray-900"
              value={formData.registrationDate}
              onChange={e => setFormData({...formData, registrationDate: e.target.value})}
            />
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-20">고객명 *</label>
            <input
              type="text"
              required
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 focus:border-primary focus:ring-primary"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-20">연락처</label>
            <input
              type="tel"
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 focus:border-primary focus:ring-primary"
              value={formData.contact}
              onChange={e => setFormData({...formData, contact: formatPhoneNumber(e.target.value)})}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-20">입주일자</label>
            <input
              type="date"
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 focus:border-primary focus:ring-primary"
              value={formData.moveInDate}
              onChange={e => setFormData({...formData, moveInDate: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-20">매매/보증금</label>
            <input
              type="text"
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 focus:border-primary focus:ring-primary"
              value={formData.price}
              onChange={e => setFormData({...formData, price: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-20">월세</label>
            <input
              type="text"
              className="flex-1 rounded-md border-gray-300 shadow-sm border p-2 focus:border-primary focus:ring-primary"
              value={formData.rentPrice}
              onChange={e => setFormData({...formData, rentPrice: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">메모</label>
            <textarea 
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-primary focus:ring-primary"
              value={formData.memo}
              onChange={e => setFormData({...formData, memo: e.target.value})}
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
            >
              등록하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};