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
      text: 'text-pink-500',
      border: 'border-pink-500'
    },
    blue: {
      text: 'text-blue-500',
      border: 'border-blue-500'
    },
    gray: {
      text: 'text-orange-500',
      border: 'border-orange-500'
    },
    green: {
      text: 'text-green-500',
      border: 'border-green-500'
    }
  };

  const theme = colorThemes[color];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-md p-5 flex flex-col h-[350px] md:h-[400px] transition-shadow hover:shadow-lg`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between pb-4 mb-4 shrink-0 border-b-2 ${theme.border}`}>
        <h3 className={`font-bold text-lg ${theme.text}`}>{title}</h3>
        <p className={`font-bold text-lg ${theme.text}`}>
          {isEmpty ? '0' : customers.length}명
        </p>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <i className="fas fa-box-open text-gray-400 text-4xl mb-3 opacity-50"></i>
            <p className="text-gray-400 text-sm">{emptyMessage}</p>
          </div>
        ) : displayCustomers.length > 0 ? (
          displayCustomers.map((customer, index) => (
            <div
              key={customer.id}
              onClick={() => onSelectCustomer(customer)}
              className="bg-white border border-gray-200 rounded-lg p-2 cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <span className="font-medium text-gray-800 text-sm">{index + 1}. {customer.name}</span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <i className="fas fa-inbox text-gray-400 text-4xl mb-3 opacity-50"></i>
            <p className="text-gray-400 text-sm">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};
