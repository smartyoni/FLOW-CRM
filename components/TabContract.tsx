import React, { useState, useRef, useEffect } from 'react';
import { Customer, ChecklistItem } from '../types';
import { generateId } from '../services/storage';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

export const TabContract: React.FC<Props> = ({ customer, onUpdate }) => {
  const [mobileContractTab, setMobileContractTab] = useState<'CONTRACT' | 'PAYMENT'>('CONTRACT');
  const contractAreaRef = useRef<HTMLDivElement>(null);
  const paymentAreaRef = useRef<HTMLDivElement>(null);

  // 계약 히스토리 상태
  const [newContractHistoryText, setNewContractHistoryText] = useState('');
  const [editingContractHistoryItemId, setEditingContractHistoryItemId] = useState<string | null>(null);
  const [editingContractHistoryText, setEditingContractHistoryText] = useState('');

  // 탭 전환 시 스크롤 리셋
  useEffect(() => {
    if (contractAreaRef.current && mobileContractTab === 'CONTRACT') {
      contractAreaRef.current.scrollTop = 0;
    }
    if (paymentAreaRef.current && mobileContractTab === 'PAYMENT') {
      paymentAreaRef.current.scrollTop = 0;
    }
  }, [mobileContractTab]);

  // 계약 히스토리 관련 함수들
  const handleAddContractHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractHistoryText.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      text: newContractHistoryText,
      createdAt: Date.now(),
      memo: ''
    };

    const updatedCustomer = {
      ...customer,
      contractHistory: [newItem, ...(customer.contractHistory || [])]
    };

    onUpdate(updatedCustomer);
    setNewContractHistoryText('');
  };

  const handleDeleteContractHistory = (id: string) => {
    if (!window.confirm('삭제하시겠습니까?')) return;

    const updatedCustomer = {
      ...customer,
      contractHistory: (customer.contractHistory || []).filter(item => item.id !== id)
    };

    onUpdate(updatedCustomer);
  };

  const startEditingContractHistory = (item: ChecklistItem) => {
    setEditingContractHistoryItemId(item.id);
    setEditingContractHistoryText(item.text);
  };

  const saveEditingContractHistory = () => {
    if (!editingContractHistoryItemId) return;

    const updatedCustomer = {
      ...customer,
      contractHistory: (customer.contractHistory || []).map(item =>
        item.id === editingContractHistoryItemId ? { ...item, text: editingContractHistoryText } : item
      )
    };

    onUpdate(updatedCustomer);
    setEditingContractHistoryItemId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 모바일 탭 네비게이션 */}
      <div className="md:hidden bg-white border-b shrink-0 overflow-x-auto">
        <div className="flex p-2 gap-2">
          <button
            onClick={() => setMobileContractTab('CONTRACT')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
              mobileContractTab === 'CONTRACT'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-file-contract mr-2"></i>
            계약
          </button>
          <button
            onClick={() => setMobileContractTab('PAYMENT')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
              mobileContractTab === 'PAYMENT'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-won-sign mr-2"></i>
            잔금
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 bg-white">
        {/* 좌측: 계약 */}
        <div
          ref={contractAreaRef}
          className={`w-full md:w-1/2 overflow-y-auto md:pr-2 ${
            mobileContractTab === 'CONTRACT' ? 'block' : 'hidden md:block'
          }`}
        >
          <h3 className="font-bold text-gray-700 mb-3 flex items-center">
            <i className="fas fa-file-contract mr-2 text-primary"></i>
            계약
          </h3>
          <div className="space-y-3 text-sm">
            {/* 계약서작성일 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
              <span className="text-gray-700 font-bold whitespace-nowrap min-w-fit">
                <span className="text-lg text-blue-500">•</span> 계약서작성일:
              </span>
              <input
                type="date"
                value={customer.contractDate || ''}
                onChange={(e) => {
                  const updatedCustomer = { ...customer, contractDate: e.target.value };
                  onUpdate(updatedCustomer);
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* 계약호실명 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
              <span className="text-gray-700 font-bold whitespace-nowrap min-w-fit">
                <span className="text-lg text-blue-500">•</span> 계약호실명:
              </span>
              <input
                type="text"
                value={customer.contractUnitName || ''}
                onChange={(e) => {
                  const updatedCustomer = { ...customer, contractUnitName: e.target.value };
                  onUpdate(updatedCustomer);
                }}
                placeholder="예: 101호"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* 매매가/보증금 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
              <span className="text-gray-700 font-bold whitespace-nowrap min-w-fit">
                <span className="text-lg text-blue-500">•</span> 매매가/보증금:
              </span>
              <input
                type="text"
                value={customer.contractPrice || ''}
                onChange={(e) => {
                  const updatedCustomer = { ...customer, contractPrice: e.target.value };
                  onUpdate(updatedCustomer);
                }}
                placeholder="예: 5억원"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* 월차임 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
              <span className="text-gray-700 font-bold whitespace-nowrap min-w-fit">
                <span className="text-lg text-blue-500">•</span> 월차임:
              </span>
              <input
                type="text"
                value={customer.contractMonthlyRent || ''}
                onChange={(e) => {
                  const updatedCustomer = { ...customer, contractMonthlyRent: e.target.value };
                  onUpdate(updatedCustomer);
                }}
                placeholder="예: 150만원"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* 계약기간 */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
              <span className="text-gray-700 font-bold whitespace-nowrap min-w-fit">
                <span className="text-lg text-blue-500">•</span> 계약기간:
              </span>
              <input
                type="text"
                value={customer.contractPeriod || ''}
                onChange={(e) => {
                  const updatedCustomer = { ...customer, contractPeriod: e.target.value };
                  onUpdate(updatedCustomer);
                }}
                placeholder="예: 2년"
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {/* 계약 히스토리 */}
            <div className="mt-6 pt-4 border-t-2 border-gray-200">
              <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                <i className="fas fa-list mr-2 text-primary"></i>
                계약 진행 현황
              </h4>

              {/* 입력 폼 */}
              <form onSubmit={handleAddContractHistory} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="계약 진행 상황 입력..."
                  value={newContractHistoryText}
                  onChange={(e) => setNewContractHistoryText(e.target.value)}
                  className="flex-1 border-2 border-blue-500 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                />
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition font-bold text-sm"
                >
                  추가
                </button>
              </form>

              {/* 리스트 */}
              <div className="space-y-2">
                {(customer.contractHistory || []).map((item, index) => (
                  <div key={item.id}>
                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 mr-2 flex items-start gap-2" onDoubleClick={() => startEditingContractHistory(item)}>
                          {editingContractHistoryItemId === item.id ? (
                            <input
                              autoFocus
                              className="w-full border-b-2 border-primary outline-none text-sm"
                              value={editingContractHistoryText}
                              onChange={(e) => setEditingContractHistoryText(e.target.value)}
                              onBlur={saveEditingContractHistory}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditingContractHistory()}
                            />
                          ) : (
                            <>
                              <i className="fas fa-circle text-xs text-blue-500 mt-1 flex-shrink-0"></i>
                              <span className="text-gray-800 font-medium cursor-pointer flex-1 text-sm" title="더블클릭하여 수정">
                                {item.text}
                              </span>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteContractHistory(item.id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <i className="fas fa-trash-alt text-sm"></i>
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {index < (customer.contractHistory || []).length - 1 && (
                      <div className="h-px bg-gray-300 my-2"></div>
                    )}
                  </div>
                ))}
                {(!customer.contractHistory || customer.contractHistory.length === 0) && (
                  <div className="text-center text-gray-400 py-6 text-sm">
                    등록된 계약 진행 현황이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 잔금 */}
        <div
          ref={paymentAreaRef}
          className={`w-full md:w-1/2 overflow-hidden flex flex-col border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-4 ${
            mobileContractTab === 'PAYMENT' ? 'block' : 'hidden md:block'
          }`}
        >
          <h3 className="font-bold text-gray-700 mb-3 flex items-center">
            <i className="fas fa-won-sign mr-2 text-primary"></i>
            잔금
          </h3>
          <div className="space-y-4 text-sm">
            {/* 잔금일 */}
            <div className="flex items-center gap-3 group cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
              <span className="text-gray-700 font-bold whitespace-nowrap min-w-fit">
                <span className="text-lg text-green-500">•</span> 잔금일:
              </span>
              <input
                type="date"
                value={customer.paymentDate || ''}
                onChange={(e) => {
                  const updatedCustomer = { ...customer, paymentDate: e.target.value };
                  onUpdate(updatedCustomer);
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
