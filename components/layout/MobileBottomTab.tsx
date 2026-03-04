import React from 'react';
import { ViewMode } from '../../types';

interface MobileBottomTabProps {
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
}

export const MobileBottomTab: React.FC<MobileBottomTabProps> = ({ currentView, onViewChange }) => {
    return (
        <div className="lg:hidden border-t bg-white flex items-center shrink-0">
            <button
                onClick={() => onViewChange('calendar')}
                className={`flex-initial py-2 px-3 text-center text-lg transition-colors border-t-2 ${currentView === 'calendar'
                    ? 'bg-slate-200 border-slate-700'
                    : 'bg-slate-100 border-transparent'
                    }`}
                title="캘린더"
            >
                🗒️
            </button>
            <div className="w-px h-6 bg-gray-200"></div>
            <button
                onClick={() => onViewChange('customerList')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium transition-colors border-t-2 ${currentView === 'customerList'
                    ? 'bg-blue-200 border-blue-700 text-blue-700'
                    : 'bg-blue-100 border-transparent text-blue-600'
                    }`}
            >
                접수~첫미팅
            </button>
            <div className="w-px h-6 bg-gray-200"></div>
            <button
                onClick={() => onViewChange('managingCustomer')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium transition-colors border-t-2 ${currentView === 'managingCustomer'
                    ? 'bg-purple-200 border-purple-700 text-purple-700'
                    : 'bg-purple-100 border-transparent text-purple-600'
                    }`}
            >
                재미팅~계약
            </button>
            <div className="w-px h-6 bg-gray-200"></div>
            <button
                onClick={() => onViewChange('contractCustomer')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium transition-colors border-t-2 ${currentView === 'contractCustomer'
                    ? 'bg-green-200 border-green-700 text-green-700'
                    : 'bg-green-100 border-transparent text-green-600'
                    }`}
            >
                계약~잔금
            </button>
        </div>
    );
};
