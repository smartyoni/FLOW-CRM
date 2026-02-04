import React, { useState } from 'react';
import { Customer, TabState } from '../types';
import { TabBasicInfo } from './TabBasicInfo';
import { TabMeeting } from './TabMeeting';
import { TabGantt } from './TabGantt';

interface Props {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (customer: Customer) => void;
}

export const CustomerDetailSidebar: React.FC<Props> = ({ customer, isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabState>('BASIC');

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
        style={{ width: 'calc((100vw - 250px) * 0.7)' }}
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
              기본정보/체크
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'MEETING' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('MEETING')}
            >
              미팅관리
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'GANTT' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('GANTT')}
            >
              여정관리
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden relative">
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
          </div>
        </div>
      </div>
    </>
  );
};