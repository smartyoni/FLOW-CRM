import React from 'react';
import { Customer } from '../types';

interface DashboardCardProps {
  title: string;
  icon: string;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  maxDisplay?: number;
  emptyMessage: string;
  isEmpty?: boolean;
  color: 'yellow' | 'blue' | 'gray' | 'green';
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  icon,
  customers,
  onSelectCustomer,
  maxDisplay = 10,
  emptyMessage,
  isEmpty = false,
  color
}) => {
  const displayCustomers = customers.slice(0, maxDisplay);

  const colorThemes = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-500',
      iconBg: 'bg-yellow-100',
      hover: 'hover:bg-yellow-50',
      text: 'text-yellow-700'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      iconBg: 'bg-blue-100',
      hover: 'hover:bg-blue-50',
      text: 'text-blue-700'
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-300 border-dashed',
      icon: 'text-gray-400',
      iconBg: 'bg-gray-100',
      hover: 'hover:bg-gray-100',
      text: 'text-gray-500'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-500',
      iconBg: 'bg-green-100',
      hover: 'hover:bg-green-50',
      text: 'text-green-700'
    }
  };

  const theme = colorThemes[color];

  return (
    <div className={`${theme.bg} border-2 ${theme.border} rounded-xl shadow-md p-5 flex flex-col h-[350px] md:h-[400px] transition-shadow hover:shadow-lg`}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className={`w-10 h-10 ${theme.iconBg} rounded-lg flex items-center justify-center`}>
          <i className={`fas ${icon} ${theme.icon} text-lg`}></i>
        </div>
        <div className="flex-1">
          <h3 className={`font-bold text-lg ${theme.text}`}>{title}</h3>
          <p className="text-gray-500 text-xs">
            {isEmpty ? '추후 확장 예정' : `${customers.length}명`}
          </p>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <i className={`fas fa-box-open ${theme.icon} text-4xl mb-3 opacity-50`}></i>
            <p className="text-gray-400 text-sm">{emptyMessage}</p>
          </div>
        ) : displayCustomers.length > 0 ? (
          displayCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => onSelectCustomer(customer)}
              className={`bg-white border border-gray-200 rounded-lg p-3 cursor-pointer ${theme.hover} transition-all shadow-sm hover:shadow-md active:scale-95`}
            >
              <div className="flex items-center gap-2">
                {customer.isFavorite && title === '집중고객' && (
                  <i className="fas fa-star text-yellow-400 text-sm"></i>
                )}
                <span className="font-medium text-gray-800">{customer.name}</span>
              </div>
              {customer.contact && (
                <p className="text-xs text-gray-500 mt-1">{customer.contact}</p>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <i className={`fas fa-inbox ${theme.icon} text-4xl mb-3 opacity-50`}></i>
            <p className="text-gray-400 text-sm">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};
