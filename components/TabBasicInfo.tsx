import React, { useState, useEffect } from 'react';
import { Customer, ChecklistItem, CustomerStage, CustomerCheckpoint } from '../types';
import { generateId } from '../services/storage';
import { formatPhoneNumber } from '../utils/phoneUtils';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
  isHeaderExpanded: boolean;
  toggleHeader: () => void;
}

const STAGES: CustomerStage[] = ['접수고객', '연락대상', '약속확정', '미팅진행', '미팅진행함'];
const CHECKPOINTS: CustomerCheckpoint[] = ['계약진행', '재미팅잡기', '약속확정', '미팅진행'];

export const TabBasicInfo: React.FC<Props> = ({ customer, onUpdate, isHeaderExpanded, toggleHeader }) => {
  const [newChecklistText, setNewChecklistText] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Customer Info Edit State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<Partial<Customer>>({});

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

  // Customer Edit Handlers
  const startInfoEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInfoForm({
      name: customer.name,
      contact: customer.contact,
      moveInDate: customer.moveInDate,
      price: customer.price,
      rentPrice: customer.rentPrice,
      memo: customer.memo,
      registrationDate: customer.registrationDate
    });
    setIsEditingInfo(true);
  };

  const saveInfoEdit = (e: React.MouseEvent) => {
    e.stopPropagation();

    const updatedCustomer = {
      ...activeCustomer,
      ...infoForm,
      priceType: infoForm.rentPrice ? 'rent' : 'sale'
    } as Customer;

    // ⭐ 1. 로컬 상태 먼저 업데이트 (즉시 UI 반영)
    setLocalCustomer(updatedCustomer);
    // ⭐ 2. Firebase에 저장 (백그라운드)
    onUpdate(updatedCustomer);

    setIsEditingInfo(false);
  };

  const cancelInfoEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingInfo(false);
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
      {/* Accordion Header - Basic Info */}
      <div className="border-b border-gray-200">
        <button
          onClick={toggleHeader}
          className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">기본 정보</span>
            {activeCustomer.stage && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {activeCustomer.stage}
              </span>
            )}
            {activeCustomer.checkpoint && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                {activeCustomer.checkpoint}
              </span>
            )}
          </div>
          <i className={`fas fa-chevron-${isHeaderExpanded ? 'up' : 'down'} text-gray-500`}></i>
        </button>
        
        {isHeaderExpanded && (
          <div className="p-4 bg-white space-y-3 text-sm">
            {/* Header Toolbar: Stage and Edit Buttons */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-row gap-2 flex-wrap">
                {/* Stage Dropdown */}
                <div className="flex items-center bg-gray-50 rounded px-2 py-1 border border-gray-200 w-fit">
                  <span className="text-gray-500 text-xs mr-2 font-bold">진행단계</span>
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
                <div className="flex items-center bg-gray-50 rounded px-2 py-1 border border-gray-200 w-fit">
                  <span className="text-gray-500 text-xs mr-2 font-bold">분기점</span>
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

              {/* Edit Buttons */}
              <div>
                {!isEditingInfo ? (
                  <button onClick={startInfoEdit} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:bg-gray-200">
                    <i className="fas fa-edit mr-1"></i>수정
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveInfoEdit} className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-blue-600">
                      저장
                    </button>
                    <button onClick={cancelInfoEdit} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 hover:bg-gray-200">
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isEditingInfo ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500 block text-xs">고객명</span>
                    <input 
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={infoForm.name || ''}
                      onChange={e => setInfoForm({...infoForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">연락처</span>
                    <input
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={infoForm.contact || ''}
                      onChange={e => setInfoForm({...infoForm, contact: formatPhoneNumber(e.target.value)})}
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">입주일자</span>
                    <input
                      type="date"
                      className="w-full border rounded px-2 py-1"
                      value={infoForm.moveInDate || ''}
                      onChange={e => setInfoForm({...infoForm, moveInDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">접수일</span>
                    <input
                      type="date"
                      className="w-full border rounded px-2 py-1"
                      value={infoForm.registrationDate || ''}
                      onChange={e => setInfoForm({...infoForm, registrationDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">매매/보증금</span>
                    <input 
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={infoForm.price || ''}
                      onChange={e => setInfoForm({...infoForm, price: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block text-xs">월세 (선택)</span>
                    <input 
                      type="text"
                      className="w-full border rounded px-2 py-1"
                      value={infoForm.rentPrice || ''}
                      onChange={e => setInfoForm({...infoForm, rentPrice: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">메모</span>
                  <textarea 
                    rows={3}
                    className="w-full border rounded px-2 py-1"
                    value={infoForm.memo || ''}
                    onChange={e => setInfoForm({...infoForm, memo: e.target.value})}
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 block">고객명</span>
                    <span className="font-medium">{activeCustomer.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">연락처</span>
                    <span className="font-medium">{activeCustomer.contact}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">입주일자</span>
                    <span className="font-medium">{activeCustomer.moveInDate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">접수일</span>
                    <span className="font-medium">{activeCustomer.registrationDate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">가격조건</span>
                    <span className="font-medium">
                      {activeCustomer.price}
                      {activeCustomer.rentPrice ? ` / ${activeCustomer.rentPrice}` : ''}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 block">메모</span>
                  <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded mt-1 border">
                    {activeCustomer.memo}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Checklist Section */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 bg-gray-50">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center">
          <i className="fas fa-tasks mr-2 text-primary"></i>
          연락/할일 체크리스트
        </h3>
        
        {/* Input */}
        <form onSubmit={handleAddChecklist} className="flex gap-2 mb-4">
          <input 
            type="text"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
          {activeCustomer.checklists.map(item => (
            <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
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
                {item.memo && <span className="text-blue-500"><i className="fas fa-check mr-1"></i>메모있음</span>}
              </div>
            </div>
          ))}
          {activeCustomer.checklists.length === 0 && (
            <div className="text-center text-gray-400 py-10">
              등록된 체크리스트가 없습니다.
            </div>
          )}
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