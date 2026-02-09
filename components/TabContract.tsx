import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Customer, ChecklistItem, ClipboardCategory, ClipboardItem } from '../types';
import { generateId } from '../services/storage';
import { useAppContext } from '../contexts/AppContext';

interface Props {
  customer: Customer;
  onUpdate: (customer: Customer) => void;
}

// Debounce utility
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export const TabContract: React.FC<Props> = ({ customer, onUpdate }) => {
  const contractAreaRef = useRef<HTMLDivElement>(null);
  const { contractClipboard, updateClipboard } = useAppContext();

  // 모바일 탭 상태
  const [mobileContractTab, setMobileContractTab] = useState<'INFO' | 'CLIPBOARD'>('INFO');

  // 인라인 편집 상태
  const [editingContractField, setEditingContractField] = useState<string | null>(null);
  const [editingContractValue, setEditingContractValue] = useState('');

  // 계약 히스토리 상태
  const [newContractHistoryText, setNewContractHistoryText] = useState('');
  const [editingContractHistoryItemId, setEditingContractHistoryItemId] = useState<string | null>(null);
  const [editingContractHistoryText, setEditingContractHistoryText] = useState('');
  const [contractMemoItem, setContractMemoItem] = useState<ChecklistItem | null>(null);
  const [contractMemoMode, setContractMemoMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [contractMemoText, setContractMemoText] = useState('');

  // 클립보드 카테고리 편집 상태
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryTitle, setEditingCategoryTitle] = useState('');

  // 클립보드 하위 항목 제목 편집 상태
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');

  // 클립보드 하위 항목 내용 편집 모달 상태
  const [contentModalItem, setContentModalItem] = useState<{
    categoryId: string;
    item: ClipboardItem;
  } | null>(null);
  const [contentModalText, setContentModalText] = useState('');
  const [editingModalTitle, setEditingModalTitle] = useState(false);
  const [editingModalTitleText, setEditingModalTitleText] = useState('');
  const [contentModalEditMode, setContentModalEditMode] = useState(false);

  // 탭 전환 시 스크롤 리셋
  useEffect(() => {
    if (contractAreaRef.current) {
      contractAreaRef.current.scrollTop = 0;
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

  // 인라인 편집 관련 함수
  const startEditingContract = (field: string, value: string) => {
    setEditingContractField(field);
    setEditingContractValue(value);
  };

  const saveContractEdit = (field: string) => {
    const updatedCustomer = {
      ...customer,
      [field]: editingContractValue
    };
    onUpdate(updatedCustomer);
    setEditingContractField(null);
  };

  // 메모 관련 함수
  const openContractMemo = (item: ChecklistItem) => {
    setContractMemoItem(item);
    setContractMemoText(item.memo);
    setContractMemoMode(item.memo ? 'VIEW' : 'EDIT');
  };

  const saveContractMemo = () => {
    if (!contractMemoItem) return;

    const updatedCustomer = {
      ...customer,
      contractHistory: (customer.contractHistory || []).map(item =>
        item.id === contractMemoItem.id ? { ...item, memo: contractMemoText } : item
      )
    };

    onUpdate(updatedCustomer);
    setContractMemoMode('VIEW');
  };

  // ============= 클립보드 아코디언 구조 핸들러 =============

  // 카테고리 추가
  const handleAddCategory = async () => {
    const newCategory: ClipboardCategory = {
      id: generateId(),
      title: '새 카테고리',
      isExpanded: false,
      items: [],
      createdAt: Date.now()
    };
    await updateClipboard([newCategory, ...contractClipboard]);
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('카테고리와 모든 하위 항목이 삭제됩니다. 계속하시겠습니까?')) return;
    const updated = contractClipboard.filter(cat => cat.id !== categoryId);
    await updateClipboard(updated);
  };

  // 카테고리 편집
  const startEditingCategory = (category: ClipboardCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryTitle(category.title);
  };

  const saveEditingCategory = async () => {
    if (!editingCategoryId) return;
    const updated = contractClipboard.map(cat =>
      cat.id === editingCategoryId ? { ...cat, title: editingCategoryTitle } : cat
    );
    await updateClipboard(updated);
    setEditingCategoryId(null);
  };

  // 아코디언 토글
  const toggleCategory = async (categoryId: string) => {
    const updated = contractClipboard.map(cat =>
      cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
    );
    await updateClipboard(updated);
  };

  // 하위 항목 추가
  const handleAddItem = async (categoryId: string) => {
    const newItem: ClipboardItem = {
      id: generateId(),
      title: '새 항목',
      content: '',
      createdAt: Date.now()
    };

    const updated = contractClipboard.map(cat =>
      cat.id === categoryId
        ? { ...cat, items: [newItem, ...cat.items], isExpanded: true }
        : cat
    );
    await updateClipboard(updated);

    // 자동으로 편집 모드로 전환
    setEditingItemId(newItem.id);
    setEditingItemTitle('새 항목');
  };

  // 하위 항목 삭제
  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    if (!window.confirm('삭제하시겠습니까?')) return;

    const updated = contractClipboard.map(cat =>
      cat.id === categoryId
        ? { ...cat, items: cat.items.filter(item => item.id !== itemId) }
        : cat
    );
    await updateClipboard(updated);
  };

  // 하위 항목 제목 편집
  const startEditingItem = (item: ClipboardItem) => {
    setEditingItemId(item.id);
    setEditingItemTitle(item.title);
  };

  const saveEditingItem = async (categoryId: string) => {
    if (!editingItemId) return;

    const updated = contractClipboard.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            items: cat.items.map(item =>
              item.id === editingItemId ? { ...item, title: editingItemTitle } : item
            )
          }
        : cat
    );
    await updateClipboard(updated);
    setEditingItemId(null);
  };

  // 내용 모달 열기
  const openContentModal = (categoryId: string, item: ClipboardItem) => {
    setContentModalItem({ categoryId, item });
    setContentModalText(item.content);
    setEditingModalTitle(false);
    setEditingModalTitleText('');
    setContentModalEditMode(false);
  };

  // 내용 모달 닫기
  const closeContentModal = () => {
    setContentModalItem(null);
    setContentModalText('');
    setEditingModalTitle(false);
    setEditingModalTitleText('');
    setContentModalEditMode(false);
  };

  // 모달 제목 편집 시작
  const startEditingModalTitle = () => {
    setEditingModalTitle(true);
    setEditingModalTitleText(contentModalItem?.item.title || '');
  };

  // 모달 제목 저장
  const saveModalTitle = async () => {
    if (!contentModalItem) return;
    const updated = contractClipboard.map(cat =>
      cat.id === contentModalItem.categoryId
        ? {
            ...cat,
            items: cat.items.map(item =>
              item.id === contentModalItem.item.id
                ? { ...item, title: editingModalTitleText }
                : item
            )
          }
        : cat
    );
    await updateClipboard(updated);
    setContentModalItem({
      ...contentModalItem,
      item: { ...contentModalItem.item, title: editingModalTitleText }
    });
    setEditingModalTitle(false);
  };

  // 클립보드에 복사
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(contentModalText);
      alert('복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  };

  // 내용 초기화
  const resetContent = async () => {
    if (!window.confirm('모든 텍스트가 삭제됩니다. 계속하시겠습니까?')) return;
    setContentModalText('');
    if (contentModalItem) {
      const updated = contractClipboard.map(cat =>
        cat.id === contentModalItem.categoryId
          ? {
              ...cat,
              items: cat.items.map(item =>
                item.id === contentModalItem.item.id
                  ? { ...item, content: '' }
                  : item
              )
            }
          : cat
      );
      await updateClipboard(updated);
    }
  };

  // 내용 자동 저장 (debounce)
  const saveContentDebounced = useCallback(
    debounce(async (categoryId: string, itemId: string, newContent: string) => {
      const updated = contractClipboard.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map(item =>
                item.id === itemId ? { ...item, content: newContent } : item
              )
            }
          : cat
      );
      await updateClipboard(updated);
    }, 1000),
    [contractClipboard]
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContentModalText(newContent);

    if (contentModalItem) {
      saveContentDebounced(
        contentModalItem.categoryId,
        contentModalItem.item.id,
        newContent
      );
    }
  };

  // 모달 외부 클릭/ESC 닫기
  useEffect(() => {
    if (!contentModalItem) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContentModal();
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('bg-black')) {
        closeContentModal();
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [contentModalItem]);

  return (
    <div className="flex flex-col h-full bg-white md:flex-row">
      {/* 모바일 탭 네비게이션 */}
      <div className="md:hidden flex border-b-2 border-gray-200">
        <button
          onClick={() => setMobileContractTab('INFO')}
          className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 transition ${
            mobileContractTab === 'INFO'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400'
          }`}
        >
          <i className="fas fa-file-contract text-lg"></i>
          <span>계약정보</span>
        </button>
        <button
          onClick={() => setMobileContractTab('CLIPBOARD')}
          className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 transition ${
            mobileContractTab === 'CLIPBOARD'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400'
          }`}
        >
          <i className="fas fa-clipboard text-lg"></i>
          <span>클립보드</span>
        </button>
      </div>

      {/* 좌측: 계약정보 */}
      <div
        ref={contractAreaRef}
        className={`${mobileContractTab === 'INFO' ? 'block' : 'hidden md:block'} md:w-1/2 overflow-y-auto flex flex-col p-4 border-r-2 border-black`}
      >
        <h3 className="font-bold text-gray-700 mb-3 flex items-center">
          <i className="fas fa-file-contract mr-2 text-primary"></i>
          계약정보
        </h3>
        <div className="space-y-3 text-sm">
          {/* 계약서작성일 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingContract('contractDate', customer.contractDate || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-blue-500">•</span> 계약서작성일:</span>
            {editingContractField === 'contractDate' ? (
              <input
                autoFocus
                type="date"
                className="flex-1 border border-primary px-1 py-0.5 outline-none text-sm"
                value={editingContractValue}
                onChange={e => setEditingContractValue(e.target.value)}
                onBlur={() => saveContractEdit('contractDate')}
                onKeyDown={e => e.key === 'Enter' && saveContractEdit('contractDate')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.contractDate || '-'}</span>
            )}
          </div>

          {/* 계약호실명 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingContract('contractUnitName', customer.contractUnitName || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-blue-500">•</span> 계약호실명:</span>
            {editingContractField === 'contractUnitName' ? (
              <input
                autoFocus
                type="text"
                className="flex-1 border border-primary px-1 py-0.5 outline-none"
                value={editingContractValue}
                onChange={e => setEditingContractValue(e.target.value)}
                onBlur={() => saveContractEdit('contractUnitName')}
                onKeyDown={e => e.key === 'Enter' && saveContractEdit('contractUnitName')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.contractUnitName || '-'}</span>
            )}
          </div>

          {/* 매매가/보증금 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingContract('contractPrice', customer.contractPrice || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-blue-500">•</span> 매매가/보증금:</span>
            {editingContractField === 'contractPrice' ? (
              <input
                autoFocus
                type="text"
                className="flex-1 border border-primary px-1 py-0.5 outline-none"
                value={editingContractValue}
                onChange={e => setEditingContractValue(e.target.value)}
                onBlur={() => saveContractEdit('contractPrice')}
                onKeyDown={e => e.key === 'Enter' && saveContractEdit('contractPrice')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.contractPrice || '-'}</span>
            )}
          </div>

          {/* 월차임 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingContract('contractMonthlyRent', customer.contractMonthlyRent || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-blue-500">•</span> 월차임:</span>
            {editingContractField === 'contractMonthlyRent' ? (
              <input
                autoFocus
                type="text"
                className="flex-1 border border-primary px-1 py-0.5 outline-none"
                value={editingContractValue}
                onChange={e => setEditingContractValue(e.target.value)}
                onBlur={() => saveContractEdit('contractMonthlyRent')}
                onKeyDown={e => e.key === 'Enter' && saveContractEdit('contractMonthlyRent')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.contractMonthlyRent || '-'}</span>
            )}
          </div>

          {/* 계약기간 */}
          <div className="flex items-center gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingContract('contractPeriod', customer.contractPeriod || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-blue-500">•</span> 계약기간:</span>
            {editingContractField === 'contractPeriod' ? (
              <input
                autoFocus
                type="text"
                className="flex-1 border border-primary px-1 py-0.5 outline-none"
                value={editingContractValue}
                onChange={e => setEditingContractValue(e.target.value)}
                onBlur={() => saveContractEdit('contractPeriod')}
                onKeyDown={e => e.key === 'Enter' && saveContractEdit('contractPeriod')}
              />
            ) : (
              <span className="text-gray-800 font-bold group-hover:bg-yellow-100">{customer.contractPeriod || '-'}</span>
            )}
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
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openContractMemo(item)} className="text-gray-400 hover:text-blue-500">
                          <i className="fas fa-sticky-note text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteContractHistory(item.id)}
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
                          onClick={() => openContractMemo(item)}
                          className="text-green-600 font-medium truncate max-w-xs ml-2 cursor-pointer hover:text-green-700 hover:underline"
                        >
                          {item.memo.split('\n')[0]}
                        </span>
                      )}
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

          {/* 메모 모달 */}
          {contractMemoItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
                <div className="p-4 border-b flex justify-between items-center">
                  <h4 className="font-bold">메모 관리</h4>
                  <button onClick={() => setContractMemoItem(null)} className="text-gray-400 hover:text-gray-600">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="p-4">
                  {contractMemoMode === 'VIEW' ? (
                    <div className="h-44 overflow-y-auto whitespace-pre-wrap text-gray-700 border p-2 rounded bg-gray-50">
                      {contractMemoText || <span className="text-gray-400 italic">메모가 없습니다.</span>}
                    </div>
                  ) : (
                    <textarea
                      className="w-full h-44 border p-2 rounded resize-none focus:ring-1 focus:ring-primary outline-none"
                      value={contractMemoText}
                      onChange={(e) => setContractMemoText(e.target.value)}
                      placeholder="메모를 입력하세요..."
                    />
                  )}
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-lg">
                  {contractMemoMode === 'VIEW' ? (
                    <button
                      onClick={() => setContractMemoMode('EDIT')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      수정
                    </button>
                  ) : (
                    <button
                      onClick={saveContractMemo}
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
      </div>

      {/* 우측: 계약클립보드 아코디언 */}
      <div className={`${mobileContractTab === 'CLIPBOARD' ? 'block' : 'hidden md:block'} md:w-1/2 overflow-y-auto flex flex-col p-4`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-700 flex items-center">
            <i className="fas fa-clipboard mr-2 text-primary"></i>
            계약클립보드
          </h3>
          <button
            onClick={handleAddCategory}
            className="bg-primary text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition text-sm font-bold"
          >
            <i className="fas fa-plus mr-1"></i>
            카테고리 추가
          </button>
        </div>

        {/* 카테고리 리스트 */}
        <div className="space-y-3">
          {contractClipboard.map((category) => (
            <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {/* 카테고리 헤더 */}
              <div className="bg-gray-100 p-3 flex items-center justify-between group">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    <i className={`fas ${category.isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                  </button>

                  {editingCategoryId === category.id ? (
                    <input
                      autoFocus
                      className="flex-1 border-b-2 border-primary outline-none bg-transparent font-bold"
                      value={editingCategoryTitle}
                      onChange={(e) => setEditingCategoryTitle(e.target.value)}
                      onBlur={saveEditingCategory}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditingCategory()}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditingCategory(category)}
                      className="font-bold text-gray-800 cursor-pointer flex-1"
                      title="더블클릭하여 수정"
                    >
                      {category.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddItem(category.id)}
                    className="text-primary hover:text-blue-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fas fa-plus mr-1"></i>
                    하위 항목 추가
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              {/* 하위 항목 리스트 */}
              {category.isExpanded && (
                <div className="p-3 space-y-2">
                  {category.items.length === 0 ? (
                    <div className="text-center text-gray-400 py-4 text-sm">
                      하위 항목이 없습니다.
                    </div>
                  ) : (
                    category.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 p-2.5 rounded border border-gray-200 group hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center justify-between">
                          {editingItemId === item.id ? (
                            <input
                              autoFocus
                              className="flex-1 border-b-2 border-primary outline-none bg-transparent"
                              value={editingItemTitle}
                              onChange={(e) => setEditingItemTitle(e.target.value)}
                              onBlur={() => saveEditingItem(category.id)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditingItem(category.id)}
                            />
                          ) : (
                            <div
                              onClick={() => openContentModal(category.id, item)}
                              onDoubleClick={() => startEditingItem(item)}
                              className="flex-1 cursor-pointer"
                              title="클릭: 내용 보기/편집, 더블클릭: 제목 수정"
                            >
                              <span className="text-gray-800 font-medium">{item.title}</span>
                              {item.content && (
                                <div className="text-xs text-green-600 font-medium mt-1 truncate">
                                  {item.content.split('\n')[0]}
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => handleDeleteItem(category.id, item.id)}
                            className="text-gray-400 hover:text-red-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <i className="fas fa-trash-alt text-sm"></i>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {contractClipboard.length === 0 && (
            <div className="text-center text-gray-400 py-6 text-sm">
              등록된 카테고리가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 70vh 내용 편집 모달 */}
      {contentModalItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col" style={{ height: '70vh' }}>
            {/* 헤더 */}
            <div className="p-4 border-b-2 border-black flex justify-between items-center shrink-0">
              {editingModalTitle ? (
                <input
                  autoFocus
                  className="flex-1 border-b-2 border-primary outline-none font-bold text-lg"
                  value={editingModalTitleText}
                  onChange={(e) => setEditingModalTitleText(e.target.value)}
                  onBlur={saveModalTitle}
                  onKeyDown={(e) => e.key === 'Enter' && saveModalTitle()}
                />
              ) : (
                <h4
                  className="font-bold text-lg cursor-pointer hover:text-blue-600"
                  onDoubleClick={startEditingModalTitle}
                  title="더블클릭하여 수정"
                >
                  {contentModalItem.item.title}
                </h4>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={copyToClipboard}
                  className="text-gray-400 hover:text-blue-500 transition"
                  title="복사"
                >
                  <i className="fas fa-copy text-lg"></i>
                </button>
                <button
                  onClick={resetContent}
                  className="text-gray-400 hover:text-red-500 transition"
                  title="초기화"
                >
                  <i className="fas fa-redo text-lg"></i>
                </button>
                <button
                  onClick={closeContentModal}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                  title="닫기"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* 텍스트 입력 영역 - 전체를 텍스트에어리어로 */}
            <textarea
              autoFocus
              readOnly={!contentModalEditMode}
              onDoubleClick={() => setContentModalEditMode(true)}
              className={`flex-1 p-4 resize-none outline-none focus:ring-2 focus:ring-primary ${
                contentModalEditMode
                  ? 'border-2 border-blue-500 focus:border-transparent'
                  : 'border-2 border-gray-200 cursor-pointer'
              }`}
              value={contentModalText}
              onChange={handleContentChange}
              placeholder="내용을 입력하세요... (더블클릭하면 편집 가능, 자동 저장됩니다)"
              title={contentModalEditMode ? '' : '더블클릭하여 편집'}
            />
          </div>
        </div>
      )}
    </div>
  );
};
