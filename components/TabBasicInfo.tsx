import React, { useState, useEffect, useRef } from 'react';
import { Customer, ChecklistItem, CustomerStage, CustomerCheckpoint, CustomerContractStatus } from '../types';
import { generateId } from '../services/storage';
import { formatPhoneNumber } from '../utils/phoneUtils';
import { useAppContext } from '../contexts/AppContext';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

const STAGES: CustomerStage[] = ['접수고객', '연락대상', '약속확정', '미팅진행'];
const CHECKPOINTS: CustomerCheckpoint[] = ['은행방문중', '재미팅잡기', '약속확정', '미팅진행'];
const CONTRACT_STATUSES: CustomerContractStatus[] = ['계약서작성예정', '잔금예정', '잔금일', '입주완료'];

export const TabBasicInfo: React.FC<Props> = ({ customer, onUpdate }) => {
  const { showConfirm } = useAppContext();
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

  // 모바일 탭 상태
  const [mobileBasicInfoTab, setMobileBasicInfoTab] = useState<'INFO' | 'HISTORY'>('INFO');
  const basicInfoAreaRef = useRef<HTMLDivElement>(null);
  const historyAreaRef = useRef<HTMLDivElement>(null);

  // ⭐ 로컬 고객 상태 (즉시 미리보기를 위함)
  const [localCustomer, setLocalCustomer] = useState<Customer | null>(null);

  // ⭐ Props 고객과 로컬 상태 동기화
  useEffect(() => {
    setLocalCustomer(customer);
  }, [customer.id]);

  // 탭 전환 시 스크롤 리셋
  useEffect(() => {
    if (basicInfoAreaRef.current && mobileBasicInfoTab === 'INFO') {
      basicInfoAreaRef.current.scrollTop = 0;
    }
    if (historyAreaRef.current && mobileBasicInfoTab === 'HISTORY') {
      historyAreaRef.current.scrollTop = 0;
    }
  }, [mobileBasicInfoTab]);

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
    const updatedCustomer = {
      ...activeCustomer,
      stage: e.target.value as CustomerStage,
      checkpoint: undefined, // 다른 드롭다운 초기화
      contractStatus: undefined // 다른 드롭다운 초기화
    };
    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);
  };

  const handleCheckpointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCheckpoint = e.target.value as CustomerCheckpoint;
    const updates: Partial<Customer> = {
      checkpoint: newCheckpoint,
      contractStatus: undefined // 다른 드롭다운 초기화
    };

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

  const handleContractStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newContractStatus = e.target.value as CustomerContractStatus;
    const updates: Partial<Customer> = {
      contractStatus: newContractStatus,
      checkpoint: undefined, // 다른 드롭다운 초기화
      stage: '미팅진행함' // stage도 함께 설정
    };

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
  const handleDeleteChecklist = async (id: string) => {
    const confirmed = await showConfirm('삭제', '삭제하시겠습니까?');
    if (!confirmed) return;

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
        <div className="flex items-center gap-2">
          {/* Stage Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center bg-white rounded px-2 py-1 border border-gray-200 gap-1">
            <span className="text-gray-500 text-xs font-bold md:mr-2">첫미팅</span>
            <select
              value={activeCustomer.stage || ''}
              onChange={handleStageChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="">선택</option>
              {STAGES.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Checkpoint Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center bg-white rounded px-2 py-1 border border-gray-200 gap-1">
            <span className="text-gray-500 text-xs font-bold md:mr-2">재미팅</span>
            <select
              value={activeCustomer.checkpoint || ''}
              onChange={handleCheckpointChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-purple-600 outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="">선택</option>
              {CHECKPOINTS.map(cp => (
                <option key={cp} value={cp}>{cp}</option>
              ))}
            </select>
          </div>

          {/* Contract Status Dropdown */}
          <div className="flex flex-col md:flex-row md:items-center bg-white rounded px-2 py-1 border border-gray-200 gap-1">
            <span className="text-gray-500 text-xs font-bold md:mr-2">계약~잔금</span>
            <select
              value={activeCustomer.contractStatus || ''}
              onChange={handleContractStatusChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-sm font-bold text-green-600 outline-none cursor-pointer w-full md:w-auto"
            >
              <option value="">선택</option>
              {CONTRACT_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 모바일 탭 네비게이션 */}
      <div className="md:hidden bg-white border-b shrink-0 overflow-x-auto">
        <div className="flex p-2 gap-2">
          <button
            onClick={() => setMobileBasicInfoTab('INFO')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
              mobileBasicInfoTab === 'INFO'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-user mr-2"></i>
            고객정보
          </button>
          <button
            onClick={() => setMobileBasicInfoTab('HISTORY')}
            className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
              mobileBasicInfoTab === 'HISTORY'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-history mr-2"></i>
            히스토리
          </button>
        </div>
      </div>

      {/* Main Content - Responsive Layout (Stack on mobile, 2-col on desktop) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 bg-white">
        {/* Top/Left: Basic Info */}
        <div
          ref={basicInfoAreaRef}
          className={`w-full md:w-1/2 overflow-y-auto md:pr-2 ${
            mobileBasicInfoTab === 'INFO' ? 'block' : 'hidden md:block'
          }`}
        >
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
                  rows={7}
                  className="w-full border border-primary rounded px-2 py-1 outline-none resize-none"
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onBlur={() => saveInlineEdit('memo')}
                />
              ) : (
                <div className="bg-gray-50 p-2 rounded border-2 border-blue-500 text-xs text-gray-700 h-48 overflow-y-auto group-hover:bg-yellow-50 whitespace-pre-wrap">
                  {activeCustomer.memo || '-'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom/Right: History */}
        <div
          ref={historyAreaRef}
          className={`w-full md:w-1/2 overflow-hidden flex flex-col border-t-2 md:border-t-0 md:border-l-2 border-black pt-4 md:pt-0 md:pl-4 ${
            mobileBasicInfoTab === 'HISTORY' ? 'block' : 'hidden md:block'
          }`}
        >
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
                  <div className="flex-1 mr-2 flex items-start gap-2" onDoubleClick={() => startEditing(item)}>
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
                      <>
                        <i className="fas fa-circle text-xs text-blue-500 mt-1 flex-shrink-0"></i>
                        <span className="text-gray-800 font-medium cursor-pointer flex-1" title="더블클릭하여 수정">
                          {item.text}
                        </span>
                      </>
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
                <div className="h-44 overflow-y-auto whitespace-pre-wrap text-gray-700 border p-2 rounded bg-gray-50">
                  {memoText || <span className="text-gray-400 italic">메모가 없습니다.</span>}
                </div>
              ) : (
                <textarea
                  className="w-full h-44 border p-2 rounded resize-none focus:ring-1 focus:ring-primary outline-none"
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