import React, { useState, useEffect } from 'react';
import { Customer, TabState } from '../types';
import { TabBasicInfo } from './TabBasicInfo';
import { TabMeeting } from './TabMeeting';
import { TabGantt } from './TabGantt';
import { TabContract } from './TabContract';

interface Props {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (customer: Customer) => void;
}

export const CustomerDetailSidebar: React.FC<Props> = ({ customer, isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabState>('BASIC');
  const [sidebarWidth, setSidebarWidth] = useState('100vw');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const updateWidth = () => {
      // 모바일 (md 이하, 768px 미만): 100vw
      // 데스크톱 (md 이상, 768px 이상): (100vw - 250px) * 0.7
      if (window.innerWidth < 768) {
        setSidebarWidth('100vw');
      } else {
        setSidebarWidth('calc((100vw - 250px) * 0.7)');
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    setTouchEnd(e.changedTouches[0].clientX);

    const distance = touchStart - e.changedTouches[0].clientX;
    const minSwipeDistance = 50;

    if (Math.abs(distance) < minSwipeDistance) {
      return;
    }

    const tabs: TabState[] = ['BASIC', 'MEETING', 'GANTT', 'CONTRACT'];
    const currentIndex = tabs.indexOf(activeTab);

    if (distance > 0) {
      // 오른쪽에서 왼쪽으로 스와이프 -> 다음 탭
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1]);
      }
    } else {
      // 왼쪽에서 오른쪽으로 스와이프 -> 이전 탭
      if (currentIndex > 0) {
        setActiveTab(tabs[currentIndex - 1]);
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  if (!customer) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed inset-y-0 right-0 w-full bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: sidebarWidth }}
      >
        <div className="flex flex-col h-full">
          {/* Top Bar */}
          <div className="bg-primary text-white p-4 flex justify-between items-center shadow-md shrink-0">
            <h2 className="text-lg font-bold truncate pr-4">{customer.name} 고객님</h2>
            <button onClick={onClose} className="hover:text-gray-200">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b shrink-0">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'BASIC' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('BASIC')}
            >
              고객정보
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'MEETING' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('MEETING')}
            >
              미팅실무
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'GANTT' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('GANTT')}
            >
              여정관리
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'CONTRACT' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('CONTRACT')}
            >
              계약/잔금
            </button>
          </div>

          {/* Content Area */}
          <div
            className="flex-1 overflow-hidden relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activeTab === 'BASIC' && (
              <TabBasicInfo
                customer={customer}
                onUpdate={onUpdate}
              />
            )}
            {activeTab === 'MEETING' && (
              <TabMeeting
                customer={customer}
                onUpdate={onUpdate}
              />
            )}
            {activeTab === 'GANTT' && (
              <TabGantt
                customer={customer}
                onUpdate={onUpdate}
              />
            )}
            {activeTab === 'CONTRACT' && (
              <TabContract
                customer={customer}
                onUpdate={onUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};