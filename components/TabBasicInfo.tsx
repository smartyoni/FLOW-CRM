import React, { useState, useEffect } from 'react';
import { Customer, ChecklistItem, CustomerStage, CustomerCheckpoint } from '../types';
import { generateId } from '../services/storage';
import { formatPhoneNumber } from '../utils/phoneUtils';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

const STAGES: CustomerStage[] = ['접수고객', '연락대상', '약속확정', '미팅진행', '미팅진행함'];
const CHECKPOINTS: CustomerCheckpoint[] = ['계약진행', '재미팅잡기', '약속확정', '미팅진행'];

export const TabBasicInfo: React.FC<Props> = ({ customer, onUpdate }) => {
  const [newChecklistText, setNewChecklistText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Inline Edit State
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Memo Modal State
  const [memoModalItem, setMemoModalItem] = useState<ChecklistItem | null>(null);
  const [memoModalMode, setMemoModalMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [memoText, setMemoText] = useState('');

  // ⭐ 로컬 고객 상태 (즉시 미리보기를 위함)
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);

  // ⭐ Props 고객과 로컬 상태 동기화
  useEffect(() => {
    setLocalCustomer(customer);
  }, [customer.id]);

  // ⭐ 렌더링할 때는 로컬 상태 우선 사용
  const activeCustomer = localCustomer || customer;

  // Inline Edit Handlers
  const startInlineEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditingValue(value);
  };

  const saveInlineEdit = (field: string) => {
    const updates: Partial<Customer> = { [field]: editingValue };
    if (field === 'rentPrice') {
      updates.priceType = editingValue ? 'rent' : 'sale';
    }

    const updatedCustomer = { ...activeCustomer, ...updates } as Customer;
    setLocalCustomer(updatedCustomer);
    onUpdate(updatedCustomer);
    setEditingField(null);
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updatedCustomer = { ...activeCustomer, stage: e.target.value as CustomerStage };
    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  const handleCheckpointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCheckpoint = e.target.value as CustomerCheckpoint;
    const updates: Partial<Customer> = { checkpoint: newCheckpoint };

    // Automatically set stage to '미팅진행함' if a checkpoint is selected
    if (newCheckpoint) {
      updates.stage = '미팅진행함';
    }

    const updatedCustomer = { ...activeCustomer, ...updates };
    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  // Add Checklist
  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      text: newChecklistText,
      createdAt: Date.now(),
      memo: ''
    };

    const updatedCustomer = {
      ...activeCustomer,
      checklists: [newItem, ...activeCustomer.checklists]
    };

    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);

    setNewChecklistText('');
  };

  // Delete Checklist
  const handleDeleteChecklist = (id: string) => {
    if (!window.confirm('삭제하시겠습니까?')) return;

    const updatedCustomer = {
      ...activeCustomer,
      checklists: activeCustomer.checklists.filter(item => item.id !== id)
    };

    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  // Start Inline Edit
  const startEditing = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  // Save Inline Edit
  const saveEditing = () => {
    if (editingItemId) {
      const updatedCustomer = {
        ...activeCustomer,
        checklists: activeCustomer.checklists.map(item =>
          item.id === editingItemId ? { ...item, text: editingText } : item
        )
      };

      // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
      setLocalCustomer(updatedCustomer);
      // ⭐ 2. Firebase에 저장 (백그라운드)
      onUpdate(updatedCustomer);

      setEditingItemId(null);
    }
  };

  // Open Memo
  const openMemo = (item: ChecklistItem) => {
    setMemoModalItem(item);
    setMemoText(item.memo);
    setMemoModalMode(item.memo ? 'VIEW' : 'EDIT');
  };

  // Save Memo
  const saveMemo = () => {
    if (memoModalItem) {
      const updatedCustomer = {
        ...activeCustomer,
        checklists: activeCustomer.checklists.map(item =>
          item.id === memoModalItem.id ? { ...item, memo: memoText } : item
        )
      };

      // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
      setLocalCustomer(updatedCustomer);
      // ⭐ 2. Firebase에 저장 (백그라운드)
      onUpdate(updatedCustomer);

      setMemoModalMode('VIEW');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b-2 border-black bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-700">기본 정보</span>
          {/* Stage Dropdown */}
          <div className="flex items-center bg-white rounded px-2 py-1 border border-gray-200">
            <span className="text-gray-500 text-xs mr-2 font-bold">첫미팅</span>
            <select
              value={activeCustomer.stage || '접수고객'}
              onChange={handleStageChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer"
            >
              {STAGES.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Checkpoint Dropdown */}
          <div className="flex items-center bg-white rounded px-2 py-1 border border-gray-200">
            <span className="text-gray-500 text-xs mr-2 font-bold">재미팅</span>
            <select
              value={activeCustomer.checkpoint || ''}
              onChange={handleCheckpointChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-purple-600 outline-none cursor-pointer"
            >
              <option value="">선택</option>
              {CHECKPOINTS.map(cp => (
                <option key={cp} value={cp}>{cp}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive Layout (Stack on mobile, 2-col on desktop) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 bg-white">
        {/* Top/Left: Basic Info */}
        <div className="w-full md:w-1/2 overflow-y-auto md:pr-2">
          <div className="space-y-3 text-sm">
            {/* 고객명 */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('name', activeCustomer.name)}>
              <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 고객명:</span>
              {editingField === 'name' ? (
                <input
                  autoFocus
                  type="text"
                  className="flex-1 border border-primary px-1 py-0.5 outline-none"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => saveInlineEdit('name')}
                  onKeyDown={e => e.key === 'Enter' && saveInlineEdit('name')}
                />
              ) : (
                <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{activeCustomer.name}</span>
              )}
            </div>

            {/* 연락처 */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('contact', activeCustomer.contact)}>
              <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 연락처:</span>
              {editingField === 'contact' ? (
                <input
                  autoFocus
                  type="text"
                  className="flex-1 border border-primary px-1 py-0.5 outline-none"
                  value={editingValue}
                  onChange={e => setEditingValue(formatPhoneNumber(e.target.value))}
                  onBlur={() => saveInlineEdit('contact')}
                  onKeyDown={e => e.key === 'Enter' && saveInlineEdit('contact')}
                />
              ) : (
                <a
                  href={`sms:${activeCustomer.contact?.replace(/\D/g, '')}`}
                  className="text-blue-600 font-semibold hover:text-blue-800 hover:underline group-hover:bg-yellow-100"
                  title="클릭하여 문자메시지 보내기"
                >
                  {activeCustomer.contact}
                </a>
              )}
            </div>

            {/* 입주일 */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('moveInDate', activeCustomer.moveInDate)}>
              <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 입주일:</span>
              {editingField === 'moveInDate' ? (
                <input
                  autoFocus
                  type="date"
                  className="flex-1 border border-primary px-1 py-0.5 outline-none text-xs"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => saveInlineEdit('moveInDate')}
                  onKeyDown={e => e.key === 'Enter' && saveInlineEdit('moveInDate')}
                />
              ) : (
                <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{activeCustomer.moveInDate || '-'}</span>
              )}
            </div>

            {/* 매매/보증금 */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('price', activeCustomer.price)}>
              <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 매매/보증금:</span>
              {editingField === 'price' ? (
                <input
                  autoFocus
                  type="text"
                  className="flex-1 border border-primary px-1 py-0.5 outline-none"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => saveInlineEdit('price')}
                  onKeyDown={e => e.key === 'Enter' && saveInlineEdit('price')}
                />
              ) : (
                <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{activeCustomer.price || '-'}</span>
              )}
            </div>

            {/* 월세 */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('rentPrice', activeCustomer.rentPrice)}>
              <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 월세:</span>
              {editingField === 'rentPrice' ? (
                <input
                  autoFocus
                  type="text"
                  className="flex-1 border border-primary px-1 py-0.5 outline-none"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => saveInlineEdit('rentPrice')}
                  onKeyDown={e => e.key === 'Enter' && saveInlineEdit('rentPrice')}
                />
              ) : (
                <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{activeCustomer.rentPrice || '-'}</span>
              )}
            </div>

            {/* 접수일 */}
            <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startInlineEdit('registrationDate', activeCustomer.registrationDate)}>
              <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-red-500">•</span> 접수일:</span>
              {editingField === 'registrationDate' ? (
                <input
                  autoFocus
                  type="date"
                  className="flex-1 border border-primary px-1 py-0.5 outline-none text-xs"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => saveInlineEdit('registrationDate')}
                  onKeyDown={e => e.key === 'Enter' && saveInlineEdit('registrationDate')}
                />
              ) : (
                <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{activeCustomer.registrationDate || '-'}</span>
              )}
            </div>

            {/* 메모 */}
            <div className="mt-4 group cursor-pointer" onDoubleClick={() => startInlineEdit('memo', activeCustomer.memo)}>
              {editingField === 'memo' ? (
                <textarea
                  autoFocus
                  rows={9}
                  className="w-full border border-primary rounded px-2 py-1 outline-none resize-none"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => saveInlineEdit('memo')}
                />
              ) : (
                <div className="bg-gray-50 p-2 rounded border-2 border-blue-500 text-xs text-gray-700 h-64 overflow-y-auto group-hover:bg-yellow-50 whitespace-pre-wrap">
                  {activeCustomer.memo || '-'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom/Right: History */}
        <div className="w-full md:w-1/2 overflow-hidden flex flex-col border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-4">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center">
            <i className="fas fa-history mr-2 text-primary"></i>
            히스토리
          </h3>

          {/* Input */}
          <form onSubmit={handleAddChecklist} className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 border-2 border-blue-500 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="체크리스트 입력..."
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
            />
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
            >
              추가
            </button>
          </form>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {activeCustomer.checklists.map((item, index) => (
              <div key={item.id}>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-2" onDoubleClick={() => startEditing(item)}>
                    {editingItemId === item.id ? (
                      <input
                        autoFocus
                        className="w-full border-b-2 border-primary outline-none"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={saveEditing}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                      />
                    ) : (
                      <span className="text-gray-800 font-medium cursor-pointer" title="더블클릭하여 수정">
                        {item.text}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openMemo(item)} className="text-gray-400 hover:text-blue-500">
                      <i className="fas fa-sticky-note"></i>
                    </button>
                    <button onClick={() => handleDeleteChecklist(item.id)} className="text-gray-400 hover:text-red-500">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  {item.memo && (
                    <span
                      onClick={() => openMemo(item)}
                      className="text-green-600 font-medium truncate max-w-xs ml-2 cursor-pointer hover:text-green-700 hover:underline"
                    >
                      {item.memo.split('\n')[0]}
                    </span>
                  )}
                </div>
                </div>
                {index < activeCustomer.checklists.length - 1 && (
                  <div className="h-px bg-red-500 my-3"></div>
                )}
              </div>
            ))}
            {activeCustomer.checklists.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                등록된 체크리스트가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Memo Modal */}
      {memoModalItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h4 className="font-bold">메모 관리</h4>
              <button onClick={() => setMemoModalItem(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4">
              {memoModalMode === 'VIEW' ? (
                <div className="min-h-[120px] whitespace-pre-wrap text-gray-700">
                  {memoText || <span className="text-gray-400 italic">메모가 없습니다.</span>}
                </div>
              ) : (
                <textarea 
                  className="w-full h-40 border p-2 rounded resize-none focus:ring-1 focus:ring-primary outline-none"
                  value={memoText}
                  onChange={(e) => setMemoText(e.target.value)}
                  placeholder="메모를 입력하세요..."
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
              {memoModalMode === 'VIEW' ? (
                <button 
                  onClick={() => setMemoModalMode('EDIT')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  수정
                </button>
              ) : (
                <button 
                  onClick={saveMemo}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  저장
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};