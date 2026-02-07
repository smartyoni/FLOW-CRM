import React, { useState, useRef, useEffect } from 'react';
import { Customer, ChecklistItem } from '../types';
import { generateId } from '../services/storage';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

export const TabPayment: React.FC<Props> = ({ customer, onUpdate }) => {
  const paymentAreaRef = useRef<HTMLDivElement>(null);

  // 인라인 편집 상태
  const [editingPaymentField, setEditingPaymentField] = useState<string | null>(null);
  const [editingPaymentValue, setEditingPaymentValue] = useState('');

  // 잔금 히스토리 상태
  const [newPaymentHistoryText, setNewPaymentHistoryText] = useState('');
  const [editingPaymentHistoryItemId, setEditingPaymentHistoryItemId] = useState<string | null>(null);
  const [editingPaymentHistoryText, setEditingPaymentHistoryText] = useState('');
  const [paymentMemoItem, setPaymentMemoItem] = useState<ChecklistItem | null>(null);
  const [paymentMemoMode, setPaymentMemoMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [paymentMemoText, setPaymentMemoText] = useState('');

  // 스크롤 리셋
  useEffect(() => {
    if (paymentAreaRef.current) {
      paymentAreaRef.current.scrollTop = 0;
    }
  }, []);

  // 잔금 히스토리 관련 함수들
  const handleAddPaymentHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentHistoryText.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      text: newPaymentHistoryText,
      createdAt: Date.now(),
      memo: ''
    };

    const updatedCustomer = {
      ...customer,
      paymentHistory: [newItem, ...(customer.paymentHistory || [])]
    };

    onUpdate(updatedCustomer);
    setNewPaymentHistoryText('');
  };

  const handleDeletePaymentHistory = (id: string) => {
    if (!window.confirm('삭제하시겠습니까?')) return;

    const updatedCustomer = {
      ...customer,
      paymentHistory: (customer.paymentHistory || []).filter(item => item.id !== id)
    };

    onUpdate(updatedCustomer);
  };

  const startEditingPaymentHistory = (item: ChecklistItem) => {
    setEditingPaymentHistoryItemId(item.id);
    setEditingPaymentHistoryText(item.text);
  };

  const saveEditingPaymentHistory = () => {
    if (!editingPaymentHistoryItemId) return;

    const updatedCustomer = {
      ...customer,
      paymentHistory: (customer.paymentHistory || []).map(item =>
        item.id === editingPaymentHistoryItemId ? { ...item, text: editingPaymentHistoryText } : item
      )
    };

    onUpdate(updatedCustomer);
    setEditingPaymentHistoryItemId(null);
  };

  // 인라인 편집 관련 함수
  const startEditingPayment = (field: string, value: string) => {
    setEditingPaymentField(field);
    setEditingPaymentValue(value);
  };

  const savePaymentEdit = (field: string) => {
    const updatedCustomer = {
      ...customer,
      [field]: editingPaymentValue
    };
    onUpdate(updatedCustomer);
    setEditingPaymentField(null);
  };

  // 메모 관련 함수
  const openPaymentMemo = (item: ChecklistItem) => {
    setPaymentMemoItem(item);
    setPaymentMemoText(item.memo);
    setPaymentMemoMode(item.memo ? 'VIEW' : 'EDIT');
  };

  const savePaymentMemo = () => {
    if (!paymentMemoItem) return;

    const updatedCustomer = {
      ...customer,
      paymentHistory: (customer.paymentHistory || []).map(item =>
        item.id === paymentMemoItem.id ? { ...item, memo: paymentMemoText } : item
      )
    };

    onUpdate(updatedCustomer);
    setPaymentMemoMode('VIEW');
  };

  return (
    <div className="flex h-full bg-white">
      {/* 좌측: 잔금정보 */}
      <div
        ref={paymentAreaRef}
        className="w-1/2 overflow-y-auto flex flex-col p-4 border-r-2 border-black"
      >
        <h3 className="font-bold text-gray-700 mb-3 flex items-center">
          <i className="fas fa-won-sign mr-2 text-pink-500"></i>
          잔금일정보
        </h3>

        <div className="space-y-3 text-sm">
          {/* 잔금일 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('paymentDate', customer.paymentDate || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 잔금일:</span>
            {editingPaymentField === 'paymentDate' ? (
              <input
                autoFocus
                type="date"
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none text-sm"
                value={editingPaymentValue}
                onChange={e => setEditingPaymentValue(e.target.value)}
                onBlur={() => savePaymentEdit('paymentDate')}
                onKeyDown={e => e.key === 'Enter' && savePaymentEdit('paymentDate')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.paymentDate || '-'}</span>
            )}
          </div>

          {/* 입퇴실일정 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('enterExitSchedule', customer.enterExitSchedule || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 입퇴실일정:</span>
            {editingPaymentField === 'enterExitSchedule' ? (
              <input
                autoFocus
                type="text"
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none"
                value={editingPaymentValue}
                onChange={e => setEditingPaymentValue(e.target.value)}
                onBlur={() => savePaymentEdit('enterExitSchedule')}
                onKeyDown={e => e.key === 'Enter' && savePaymentEdit('enterExitSchedule')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.enterExitSchedule || '-'}</span>
            )}
          </div>

          {/* 보증금반환계좌번호 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('depositReturnAccount', customer.depositReturnAccount || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 보증금반환계좌번호:</span>
            {editingPaymentField === 'depositReturnAccount' ? (
              <input
                autoFocus
                type="text"
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none"
                value={editingPaymentValue}
                onChange={e => setEditingPaymentValue(e.target.value)}
                onBlur={() => savePaymentEdit('depositReturnAccount')}
                onKeyDown={e => e.key === 'Enter' && savePaymentEdit('depositReturnAccount')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.depositReturnAccount || '-'}</span>
            )}
          </div>

          {/* 잔금입금계좌번호 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('paymentAccount', customer.paymentAccount || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 잔금입금계좌번호:</span>
            {editingPaymentField === 'paymentAccount' ? (
              <input
                autoFocus
                type="text"
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none"
                value={editingPaymentValue}
                onChange={e => setEditingPaymentValue(e.target.value)}
                onBlur={() => savePaymentEdit('paymentAccount')}
                onKeyDown={e => e.key === 'Enter' && savePaymentEdit('paymentAccount')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.paymentAccount || '-'}</span>
            )}
          </div>

          {/* 관리비정산 요청일 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('managementFeeSettlementDate', customer.managementFeeSettlementDate || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 관리비정산 요청일:</span>
            {editingPaymentField === 'managementFeeSettlementDate' ? (
              <input
                autoFocus
                type="date"
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none text-sm"
                value={editingPaymentValue}
                onChange={e => setEditingPaymentValue(e.target.value)}
                onBlur={() => savePaymentEdit('managementFeeSettlementDate')}
                onKeyDown={e => e.key === 'Enter' && savePaymentEdit('managementFeeSettlementDate')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.managementFeeSettlementDate || '-'}</span>
            )}
          </div>

          {/* 잔금 히스토리 */}
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <h4 className="font-bold text-gray-700 mb-3 flex items-center">
              <i className="fas fa-list mr-2 text-pink-500"></i>
              잔금업무 진행현황
            </h4>

            {/* 입력 폼 */}
            <form onSubmit={handleAddPaymentHistory} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="잔금 업무 진행 상황 입력..."
                value={newPaymentHistoryText}
                onChange={(e) => setNewPaymentHistoryText(e.target.value)}
                className="flex-1 border-2 border-pink-500 rounded-md px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-sm"
              />
              <button
                type="submit"
                className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 transition font-bold text-sm"
              >
                추가
              </button>
            </form>

            {/* 리스트 */}
            <div className="space-y-2">
              {(customer.paymentHistory || []).map((item, index) => (
                <div key={item.id}>
                  <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 mr-2 flex items-start gap-2" onDoubleClick={() => startEditingPaymentHistory(item)}>
                        {editingPaymentHistoryItemId === item.id ? (
                          <input
                            autoFocus
                            className="w-full border-b-2 border-pink-500 outline-none text-sm"
                            value={editingPaymentHistoryText}
                            onChange={(e) => setEditingPaymentHistoryText(e.target.value)}
                            onBlur={saveEditingPaymentHistory}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditingPaymentHistory()}
                          />
                        ) : (
                          <>
                            <i className="fas fa-circle text-xs text-pink-500 mt-1 flex-shrink-0"></i>
                            <span className="text-gray-800 font-medium cursor-pointer flex-1 text-sm" title="더블클릭하여 수정">
                              {item.text}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openPaymentMemo(item)} className="text-gray-400 hover:text-pink-500">
                          <i className="fas fa-sticky-note text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleDeletePaymentHistory(item.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <i className="fas fa-trash-alt text-sm"></i>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                      {item.memo && (
                        <span
                          onClick={() => openPaymentMemo(item)}
                          className="text-green-600 font-medium truncate max-w-xs ml-2 cursor-pointer hover:text-green-700 hover:underline"
                        >
                          {item.memo.split('\n')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  {index < (customer.paymentHistory || []).length - 1 && (
                    <div className="h-px bg-gray-300 my-2"></div>
                  )}
                </div>
              ))}
              {(!customer.paymentHistory || customer.paymentHistory.length === 0) && (
                <div className="text-center text-gray-400 py-6 text-sm">
                  등록된 잔금 진행 현황이 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* 메모 모달 */}
          {paymentMemoItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
                <div className="p-4 border-b flex justify-between items-center">
                  <h4 className="font-bold">메모 관리</h4>
                  <button onClick={() => setPaymentMemoItem(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="p-4">
                  {paymentMemoMode === 'VIEW' ? (
                    <div className="h-44 overflow-y-auto whitespace-pre-wrap text-gray-700 border p-2 rounded bg-gray-50">
                      {paymentMemoText || <span className="text-gray-400 italic">메모가 없습니다.</span>}
                    </div>
                  ) : (
                    <textarea
                      className="w-full h-44 border p-2 rounded resize-none focus:ring-1 focus:ring-pink-500 outline-none"
                      value={paymentMemoText}
                      onChange={(e) => setPaymentMemoText(e.target.value)}
                      placeholder="메모를 입력하세요..."
                    />
                  )}
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                  {paymentMemoMode === 'VIEW' ? (
                    <button
                      onClick={() => setPaymentMemoMode('EDIT')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      수정
                    </button>
                  ) : (
                    <button
                      onClick={savePaymentMemo}
                      className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600"
                    >
                      저장
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 우측 (비워둠) */}
      <div className="w-1/2 p-4">
      </div>
    </div>
  );
};
