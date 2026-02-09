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

export const TabPayment: React.FC<Props> = ({ customer, onUpdate }) => {
  const paymentAreaRef = useRef<HTMLDivElement>(null);
  const { paymentClipboard, updatePaymentClipboard, showConfirm } = useAppContext();

  // 모바일 탭 상태
  const [mobilePaymentTab, setMobilePaymentTab] = useState<'INFO' | 'CLIPBOARD'>('INFO');

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

  // 드래그앤드롭 상태 - 하위항목
  const [draggingItem, setDraggingItem] = useState<{ categoryId: string; itemId: string } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ categoryId: string; itemId: string } | null>(null);

  // 드래그앤드롭 상태 - 카테고리
  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  // 탭 전환 시 스크롤 리셋
  useEffect(() => {
    if (paymentAreaRef.current) {
      paymentAreaRef.current.scrollTop = 0;
    }
  }, [mobilePaymentTab]);

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

  const handleDeletePaymentHistory = async (id: string) => {
    const confirmed = await showConfirm('삭제', '삭제하시겠습니까?');
    if (!confirmed) return;

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
    await updatePaymentClipboard([newCategory, ...paymentClipboard]);
  };

  // 카테고리 삭제
  const handleDeleteCategory = async (categoryId: string) => {
    const confirmed = await showConfirm('카테고리 삭제', '카테고리와 모든 하위 항목이 삭제됩니다. 계속하시겠습니까?');
    if (!confirmed) return;
    const updated = paymentClipboard.filter(cat => cat.id !== categoryId);
    await updatePaymentClipboard(updated);
  };

  // 카테고리 편집
  const startEditingCategory = (category: ClipboardCategory) => {
    setEditingCategoryId(category.id);
    setEditingCategoryTitle(category.title);
  };

  const saveEditingCategory = async () => {
    if (!editingCategoryId) return;
    const updated = paymentClipboard.map(cat =>
      cat.id === editingCategoryId ? { ...cat, title: editingCategoryTitle } : cat
    );
    await updatePaymentClipboard(updated);
    setEditingCategoryId(null);
  };

  // 아코디언 토글
  const toggleCategory = async (categoryId: string) => {
    const updated = paymentClipboard.map(cat =>
      cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
    );
    await updatePaymentClipboard(updated);
  };

  // 하위 항목 추가
  const handleAddItem = async (categoryId: string) => {
    const newItem: ClipboardItem = {
      id: generateId(),
      title: '새 항목',
      content: '',
      createdAt: Date.now()
    };

    const updated = paymentClipboard.map(cat =>
      cat.id === categoryId
        ? { ...cat, items: [newItem, ...cat.items], isExpanded: true }
        : cat
    );
    await updatePaymentClipboard(updated);

    // 자동으로 편집 모드로 전환
    setEditingItemId(newItem.id);
    setEditingItemTitle('새 항목');
  };

  // 하위 항목 삭제
  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    const confirmed = await showConfirm('삭제', '삭제하시겠습니까?');
    if (!confirmed) return;

    const updated = paymentClipboard.map(cat =>
      cat.id === categoryId
        ? { ...cat, items: cat.items.filter(item => item.id !== itemId) }
        : cat
    );
    await updatePaymentClipboard(updated);
  };

  // 하위 항목 제목 편집
  const startEditingItem = (item: ClipboardItem) => {
    setEditingItemId(item.id);
    setEditingItemTitle(item.title);
  };

  const saveEditingItem = async (categoryId: string) => {
    if (!editingItemId) return;

    const updated = paymentClipboard.map(cat =>
      cat.id === categoryId
        ? {
            ...cat,
            items: cat.items.map(item =>
              item.id === editingItemId ? { ...item, title: editingItemTitle } : item
            )
          }
        : cat
    );
    await updatePaymentClipboard(updated);
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
    const updated = paymentClipboard.map(cat =>
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
    await updatePaymentClipboard(updated);
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
    const confirmed = await showConfirm('내용 초기화', '모든 텍스트가 삭제됩니다. 계속하시겠습니까?');
    if (!confirmed) return;
    setContentModalText('');
    if (contentModalItem) {
      const updated = paymentClipboard.map(cat =>
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
      await updatePaymentClipboard(updated);
    }
  };

  // 드래그앤드롭 핸들러
  const handleDragStart = (categoryId: string, itemId: string) => {
    setDraggingItem({ categoryId, itemId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (categoryId: string, targetItemId: string) => {
    if (!draggingItem) return;

    // 같은 아이템이면 무시
    if (draggingItem.itemId === targetItemId) {
      setDraggingItem(null);
      setDragOverItem(null);
      return;
    }

    // 같은 카테고리 내에서만 정렬
    if (draggingItem.categoryId !== categoryId) {
      setDraggingItem(null);
      setDragOverItem(null);
      return;
    }

    // 항목 순서 변경
    const updated = paymentClipboard.map(cat => {
      if (cat.id !== categoryId) return cat;

      const items = [...cat.items];
      const dragIndex = items.findIndex(item => item.id === draggingItem.itemId);
      const dropIndex = items.findIndex(item => item.id === targetItemId);

      if (dragIndex === -1 || dropIndex === -1) return cat;

      // 두 항목 교환
      [items[dragIndex], items[dropIndex]] = [items[dropIndex], items[dragIndex]];

      return { ...cat, items };
    });

    await updatePaymentClipboard(updated);
    setDraggingItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setDragOverItem(null);
  };

  // 카테고리 드래그앤드롭 핸들러
  const handleCategoryDragStart = (categoryId: string) => {
    setDraggingCategory(categoryId);
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = async (targetCategoryId: string) => {
    if (!draggingCategory) return;

    if (draggingCategory === targetCategoryId) {
      setDraggingCategory(null);
      setDragOverCategory(null);
      return;
    }

    const dragIndex = paymentClipboard.findIndex(c => c.id === draggingCategory);
    const dropIndex = paymentClipboard.findIndex(c => c.id === targetCategoryId);

    if (dragIndex === -1 || dropIndex === -1) return;

    const updated = [...paymentClipboard];
    [updated[dragIndex], updated[dropIndex]] = [updated[dropIndex], updated[dragIndex]];

    await updatePaymentClipboard(updated);
    setDraggingCategory(null);
    setDragOverCategory(null);
  };

  const handleCategoryDragEnd = () => {
    setDraggingCategory(null);
    setDragOverCategory(null);
  };

  // 내용 자동 저장 (debounce)
  const saveContentDebounced = useCallback(
    debounce(async (categoryId: string, itemId: string, newContent: string) => {
      const updated = paymentClipboard.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map(item =>
                item.id === itemId ? { ...item, content: newContent } : item
              )
            }
          : cat
      );
      await updatePaymentClipboard(updated);
    }, 1000),
    [paymentClipboard]
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
          onClick={() => setMobilePaymentTab('INFO')}
          className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 transition ${
            mobilePaymentTab === 'INFO'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400'
          }`}
        >
          <i className="fas fa-won-sign text-lg"></i>
          <span>잔금정보</span>
        </button>
        <button
          onClick={() => setMobilePaymentTab('CLIPBOARD')}
          className={`flex-1 py-3 font-bold flex items-center justify-center gap-2 transition ${
            mobilePaymentTab === 'CLIPBOARD'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400'
          }`}
        >
          <i className="fas fa-clipboard text-lg"></i>
          <span>잔금일클립보드</span>
        </button>
      </div>

      {/* 좌측: 잔금정보 */}
      <div
        ref={paymentAreaRef}
        className={`${mobilePaymentTab === 'INFO' ? 'block' : 'hidden md:block'} md:w-1/2 overflow-y-auto flex flex-col p-4 border-r-2 border-black`}
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
          <div className="flex items-start gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('enterExitSchedule', customer.enterExitSchedule || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 입퇴실:</span>
            {editingPaymentField === 'enterExitSchedule' ? (
              <input
                autoFocus
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none text-sm"
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
          <div className="flex items-start gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('depositReturnAccount', customer.depositReturnAccount || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 보증금계좌:</span>
            {editingPaymentField === 'depositReturnAccount' ? (
              <input
                autoFocus
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none text-sm"
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
          <div className="flex items-start gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('paymentAccount', customer.paymentAccount || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 잔금계좌:</span>
            {editingPaymentField === 'paymentAccount' ? (
              <input
                autoFocus
                className="flex-1 border border-pink-500 px-1 py-0.5 outline-none text-sm"
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
          <div className="flex items-start gap-1.5 group cursor-pointer" onDoubleClick={() => startEditingPayment('managementFeeSettlementDate', customer.managementFeeSettlementDate || '')}>
            <span className="text-gray-800 font-bold min-w-fit"><span className="text-xl text-pink-500">•</span> 관리비정산:</span>
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
        </div>

        {/* 잔금 진행 현황 */}
        <div className="mt-6">
          <h4 className="font-bold text-gray-700 mb-3 flex items-center">
            <i className="fas fa-history mr-2 text-pink-500"></i>
            잔금업무 진행현황
          </h4>

          <form onSubmit={handleAddPaymentHistory} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPaymentHistoryText}
              onChange={e => setNewPaymentHistoryText(e.target.value)}
              placeholder="항목을 입력하세요..."
              className="flex-1 border border-pink-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-pink-500"
            />
            <button type="submit" className="px-4 py-1.5 bg-pink-500 text-white rounded text-sm hover:bg-pink-600 font-bold">
              추가
            </button>
          </form>

          <div className="space-y-3">
            {(customer.paymentHistory || []).map((item, index) => (
              <div key={item.id} className="p-3 bg-pink-50 rounded group">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div
                      className="text-sm font-bold text-gray-800 cursor-pointer hover:bg-yellow-100 py-1"
                      onDoubleClick={() => startEditingPaymentHistory(item)}
                    >
                      {editingPaymentHistoryItemId === item.id ? (
                        <input
                          autoFocus
                          className="w-full border border-pink-500 px-1 py-0.5 outline-none text-sm"
                          value={editingPaymentHistoryText}
                          onChange={e => setEditingPaymentHistoryText(e.target.value)}
                          onBlur={saveEditingPaymentHistory}
                          onKeyDown={e => e.key === 'Enter' && saveEditingPaymentHistory()}
                        />
                      ) : (
                        item.text
                      )}
                    </div>
                    {item.memo && (
                      <div className="text-xs text-green-600 mt-1 line-clamp-1">{item.memo.split('\n')[0]}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openPaymentMemo(item)}
                      className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                    >
                      메모
                    </button>
                    <button
                      onClick={() => handleDeletePaymentHistory(item.id)}
                      className="px-2 py-1 bg-red-300 text-red-700 rounded text-xs hover:bg-red-400"
                    >
                      삭제
                    </button>
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

      {/* 우측: 잔금일클립보드 */}
      <div className={`${mobilePaymentTab === 'CLIPBOARD' ? 'block' : 'hidden md:block'} md:w-1/2 overflow-y-auto flex flex-col p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700 flex items-center">
            <i className="fas fa-clipboard mr-2 text-pink-500"></i>
            잔금일클립보드
          </h3>
          <button
            onClick={handleAddCategory}
            className="px-3 py-1 bg-pink-500 text-white rounded text-sm hover:bg-pink-600 font-bold"
          >
            카테고리 추가
          </button>
        </div>

        {/* 카테고리 리스트 */}
        <div className="space-y-2 flex-1">
          {paymentClipboard.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              카테고리가 없습니다. 새 카테고리를 추가해주세요.
            </div>
          ) : (
            paymentClipboard.map((category, catIndex) => (
              <div key={category.id} draggable onDragStart={() => handleCategoryDragStart(category.id)} onDragOver={handleCategoryDragOver} onDrop={() => handleCategoryDrop(category.id)} onDragEnd={handleCategoryDragEnd} className={`border rounded cursor-grab active:cursor-grabbing ${dragOverCategory === category.id ? 'bg-blue-100' : ''}`}>
                {/* 카테고리 헤더 */}
                <div className="bg-gray-100 p-3 flex items-center gap-2 group">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800"
                  >
                    <i className={`fas fa-chevron-${category.isExpanded ? 'down' : 'right'}`}></i>
                  </button>

                  <div
                    className="flex-1 font-bold text-gray-800 cursor-pointer hover:bg-yellow-100 py-1 px-1"
                    onDoubleClick={() => startEditingCategory(category)}
                  >
                    {editingCategoryId === category.id ? (
                      <input
                        autoFocus
                        className="w-full border border-pink-500 px-1 py-0.5 outline-none text-sm"
                        value={editingCategoryTitle}
                        onChange={e => setEditingCategoryTitle(e.target.value)}
                        onBlur={saveEditingCategory}
                        onKeyDown={e => e.key === 'Enter' && saveEditingCategory()}
                      />
                    ) : (
                      category.title
                    )}
                  </div>

                  <button
                    onClick={() => handleAddItem(category.id)}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 opacity-0 group-hover:opacity-100 transition"
                  >
                    하위추가
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="px-2 py-1 bg-red-300 text-red-700 rounded text-xs hover:bg-red-400 opacity-0 group-hover:opacity-100 transition"
                  >
                    삭제
                  </button>
                </div>

                {/* 카테고리 내용 */}
                {category.isExpanded && (
                  <div className="bg-gray-50 p-3 space-y-2">
                    {category.items.length === 0 ? (
                      <div className="text-center text-gray-400 py-4 text-sm">
                        하위 항목이 없습니다.
                      </div>
                    ) : (
                      category.items.map((item, itemIndex) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(category.id, item.id)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(category.id, item.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openContentModal(category.id, item)}
                          className={`p-2 bg-white border rounded cursor-pointer hover:bg-blue-50 group ${dragOverItem?.itemId === item.id ? 'bg-blue-100' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div
                                className="font-bold text-gray-800 text-sm cursor-pointer hover:bg-yellow-100 py-1 px-1"
                                onClick={e => e.stopPropagation()}
                                onDoubleClick={e => {
                                  e.stopPropagation();
                                  startEditingItem(item);
                                }}
                              >
                                {editingItemId === item.id ? (
                                  <input
                                    autoFocus
                                    className="w-full border border-pink-500 px-1 py-0.5 outline-none text-sm"
                                    value={editingItemTitle}
                                    onChange={e => setEditingItemTitle(e.target.value)}
                                    onBlur={() => saveEditingItem(category.id)}
                                    onKeyDown={e => e.key === 'Enter' && saveEditingItem(category.id)}
                                    onClick={e => e.stopPropagation()}
                                  />
                                ) : (
                                  item.title
                                )}
                              </div>
                              {item.content && (
                                <div className="text-xs text-gray-600 mt-1 line-clamp-1">{item.content.split('\n')[0]}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
                            </div>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteItem(category.id, item.id);
                              }}
                              className="px-2 py-1 bg-red-300 text-red-700 rounded text-xs hover:bg-red-400 opacity-0 group-hover:opacity-100 transition"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {catIndex < paymentClipboard.length - 1 && <div className="h-px bg-gray-300"></div>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 70vh 내용 편집 모달 */}
      {contentModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl" style={{ height: '70vh' }}>
            {/* 헤더 */}
            <div className="p-4 border-b flex justify-between items-center bg-pink-50">
              <div className="flex-1">
                <div
                  className="font-bold text-gray-800 cursor-pointer hover:bg-yellow-100 py-1 px-1"
                  onDoubleClick={startEditingModalTitle}
                >
                  {editingModalTitle ? (
                    <input
                      autoFocus
                      className="w-full border border-pink-500 px-1 py-0.5 outline-none text-sm"
                      value={editingModalTitleText}
                      onChange={e => setEditingModalTitleText(e.target.value)}
                      onBlur={saveModalTitle}
                      onKeyDown={e => e.key === 'Enter' && saveModalTitle()}
                    />
                  ) : (
                    contentModalItem.item.title
                  )}
                </div>
              </div>
              <button onClick={closeContentModal} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* 내용 */}
            <div className="p-4 flex-1 overflow-y-auto">
              {contentModalEditMode ? (
                <textarea
                  className="w-full h-full border-0 resize-none focus:ring-0 outline-none p-2 font-mono text-sm"
                  value={contentModalText}
                  onChange={handleContentChange}
                  placeholder="내용을 입력하세요..."
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 font-mono text-sm p-2 bg-gray-50 rounded h-full overflow-y-auto">
                  {contentModalText || <span className="text-gray-400 italic">내용이 없습니다.</span>}
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t flex justify-between items-center bg-gray-50">
              <div className="text-xs text-gray-500">
                {new Date(contentModalItem.item.createdAt).toLocaleString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setContentModalEditMode(!contentModalEditMode)}
                  className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-bold"
                >
                  {contentModalEditMode ? '보기' : '수정'}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-bold"
                >
                  <i className="fas fa-copy mr-1"></i>복사
                </button>
                <button
                  onClick={resetContent}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-bold"
                >
                  <i className="fas fa-trash mr-1"></i>초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
