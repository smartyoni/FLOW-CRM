import React from 'react';
import { Customer, ManualEvent, ViewMode } from '../../types';
import { CustomerList } from '../CustomerList';
import { ManagingCustomerView } from '../ManagingCustomerView';
import { ContractCustomerView } from '../ContractCustomerView';
import { CalendarView } from '../CalendarView';

interface ContentSwitcherProps {
    currentView: ViewMode;
    customers: Customer[];
    manualEvents: ManualEvent[];
    onSelectCustomer: (customer: Customer) => void;
    onDeleteCustomer: (id: string, e: React.MouseEvent) => void;
    onUpdateCustomer: (customer: Customer) => Promise<void>;
    onOpenMobileSidebar: () => void;
    onAddClick: () => void;
    onToggleFavorite: (id: string) => void;
    onCreateManualEvent: (event: Omit<ManualEvent, 'id' | 'createdAt'>) => Promise<string>;
    onUpdateManualEvent: (id: string, updates: Partial<ManualEvent>) => Promise<void>;
    onDeleteManualEvent: (id: string) => Promise<void>;
}

export const ContentSwitcher: React.FC<ContentSwitcherProps> = ({
    currentView,
    customers,
    manualEvents,
    onSelectCustomer,
    onDeleteCustomer,
    onUpdateCustomer,
    onOpenMobileSidebar,
    onAddClick,
    onToggleFavorite,
    onCreateManualEvent,
    onUpdateManualEvent,
    onDeleteManualEvent,
}) => {
    switch (currentView) {
        case 'managingCustomer':
            return (
                <ManagingCustomerView
                    customers={customers}
                    onSelect={onSelectCustomer}
                    onDelete={onDeleteCustomer}
                    onMenuClick={onOpenMobileSidebar}
                    onUpdate={onUpdateCustomer}
                />
            );
        case 'contractCustomer':
            return (
                <ContractCustomerView
                    customers={customers.filter(c => c.contractStatus)}
                    onSelect={onSelectCustomer}
                    onDelete={onDeleteCustomer}
                    onMenuClick={onOpenMobileSidebar}
                    onUpdate={onUpdateCustomer}
                />
            );
        case 'calendar':
            return (
                <CalendarView
                    customers={customers}
                    manualEvents={manualEvents}
                    onSelectCustomer={onSelectCustomer}
                    onMenuClick={onOpenMobileSidebar}
                    onCreateManualEvent={onCreateManualEvent}
                    onUpdateManualEvent={onUpdateManualEvent}
                    onDeleteManualEvent={onDeleteManualEvent}
                />
            );
        case 'customerList':
        default:
            return (
                <CustomerList
                    customers={customers}
                    onSelect={onSelectCustomer}
                    onAddClick={onAddClick}
                    onDelete={onDeleteCustomer}
                    onToggleFavorite={onToggleFavorite}
                    onMenuClick={onOpenMobileSidebar}
                    onUpdate={onUpdateCustomer}
                />
            );
    }
};
