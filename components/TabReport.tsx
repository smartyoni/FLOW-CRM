import React from 'react';
import { Customer } from '../types';

interface Props {
    customer: Customer;
}

export const TabReport: React.FC<Props> = ({ customer }) => {
    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">미팅 보고서</h2>
            {customer.meetings?.map(meeting => (
                <div key={meeting.id} className="mb-4 p-4 border rounded-lg">
                    <h3 className="text-lg font-bold">미팅 #{meeting.round}</h3>
                    <p>일시: {meeting.date ? new Date(meeting.date).toLocaleString() : '미정'}</p>
                    <div className="mt-4">
                        <h4 className="font-bold">미팅 속성</h4>
                        <ul>
                            {meeting.properties.map(prop => (
                                <li key={prop.id} className="ml-4">
                                    <p>부동산: {prop.agency}</p>
                                    <p>연락처: {prop.agencyPhone}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );
};
