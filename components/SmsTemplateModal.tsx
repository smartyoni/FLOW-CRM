import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SmsTemplates, SmsTemplateCategory } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const SmsTemplateModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { smsTemplates, updateSmsTemplates, smsTemplateModalCategory } = useAppContext();
    const [localTemplates, setLocalTemplates] = useState<SmsTemplates>(smsTemplates);

    const [expandedCategories, setExpandedCategories] = useState<Record<keyof SmsTemplates, boolean>>({
        basic: true,
        meeting: true,
        contract: true,
        payment: true
    });

    useEffect(() => {
        setLocalTemplates(smsTemplates);
    }, [smsTemplates]);

    // If a specific category is requested, expand it by default
    useEffect(() => {
        if (smsTemplateModalCategory) {
            setExpandedCategories({
                basic: smsTemplateModalCategory === 'basic',
                meeting: smsTemplateModalCategory === 'meeting',
                contract: smsTemplateModalCategory === 'contract',
                payment: smsTemplateModalCategory === 'payment'
            });
        }
    }, [smsTemplateModalCategory]);

    if (!isOpen) return null;

    const handleSave = async () => {
        await updateSmsTemplates(localTemplates);
        onClose();
    };

    const handleUpdateCategory = (field: keyof SmsTemplates, category: SmsTemplateCategory) => {
        setLocalTemplates(prev => ({ ...prev, [field]: category }));
    };

    const toggleCategory = (field: keyof SmsTemplates) => {
        // Only allow toggling if we're showing all categories
        if (!smsTemplateModalCategory) {
            setExpandedCategories(prev => ({
                ...prev,
                [field]: !prev[field]
            }));
        }
    };

    const renderCategory = (field: keyof SmsTemplates, label: string, bulletColor: string) => {
        // If category filter is active and this isn't the matching category, don't render
        if (smsTemplateModalCategory && smsTemplateModalCategory !== field) return null;

        const category = localTemplates[field];
        const isExpanded = expandedCategories[field];
        if (!category || !category.options) return null;

        return (
            <div className={`group rounded-2xl border transition-all duration-300 mb-4 last:mb-0 overflow-hidden ${isExpanded
                ? 'bg-white border-blue-100 shadow-md ring-1 ring-blue-50'
                : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                }`}>
                {/* Accordion Header - only show if showing all categories */}
                {!smsTemplateModalCategory ? (
                    <button
                        onClick={() => toggleCategory(field)}
                        className="w-full p-5 flex items-center justify-between text-left focus:outline-none"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${bulletColor} shadow-sm transition-transform duration-300 ${isExpanded ? 'scale-125' : ''}`}></span>
                            <span className={`text-base font-extrabold tracking-tight transition-colors duration-300 ${isExpanded ? 'text-blue-600' : 'text-slate-700'}`}>
                                {label}
                            </span>
                            {!isExpanded && (
                                <span className="text-[10px] px-2 py-0.5 bg-slate-200/50 text-slate-500 rounded-full font-bold ml-2">
                                    {category.options[category.selectedIndex]?.slice(0, 15)}...
                                </span>
                            )}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-blue-50 text-blue-500 rotate-180' : 'bg-slate-200/50 text-slate-400 rotate-0'}`}>
                            <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                    </button>
                ) : (
                    <div className="p-5 flex items-center gap-3 border-b border-slate-50">
                        <span className={`w-3 h-3 rounded-full ${bulletColor} shadow-sm`}></span>
                        <span className="text-base font-extrabold text-blue-600 tracking-tight">
                            {label} 설정
                        </span>
                    </div>
                )}

                {/* Accordion Content */}
                <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="p-5 pt-0 space-y-4">
                        <div className="space-y-3 mt-4">
                            {category.options.map((option, idx) => (
                                <div key={idx} className="flex gap-4 group/item">
                                    <div className="pt-3 shrink-0">
                                        <label className="cursor-pointer relative flex items-center justify-center">
                                            <input
                                                type="radio"
                                                name={`selected-${field}`}
                                                checked={category.selectedIndex === idx}
                                                onChange={() => handleUpdateCategory(field, { ...category, selectedIndex: idx })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-6 h-6 border-2 border-slate-200 rounded-full peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all after:content-[''] after:absolute after:w-2.5 after:h-2.5 after:bg-white after:rounded-full after:opacity-0 peer-checked:after:opacity-100 shadow-sm"></div>
                                        </label>
                                    </div>
                                    <textarea
                                        className={`w-full h-24 p-4 border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all resize-none shadow-sm ${category.selectedIndex === idx
                                            ? 'bg-blue-50/30 border-blue-300 ring-2 ring-blue-50'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        placeholder={`템플릿 옵션 ${idx + 1}`}
                                        value={option || ''}
                                        onChange={(e) => {
                                            if (!category || !category.options) return;
                                            const newOptions = [...category.options];
                                            newOptions[idx] = e.target.value;
                                            handleUpdateCategory(field, { ...category, options: newOptions });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Determine Title based on category
    const categoryLabels: Record<keyof SmsTemplates, string> = {
        basic: '기본 정보',
        meeting: '미팅 관련',
        contract: '계약 관련',
        payment: '잔금 관련'
    };

    const modalTitle = smsTemplateModalCategory
        ? `${categoryLabels[smsTemplateModalCategory]} SMS 템플릿 설정`
        : 'SMS 메시지 템플릿 설정';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                {/* Header */}
                <div className="p-8 border-b flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                                <i className="fas fa-sms text-white"></i>
                            </div>
                            {modalTitle}
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium">
                            {smsTemplateModalCategory
                                ? `이 탭에서 사용할 템플릿 3개를 관리하고 하나를 선택하세요.`
                                : `카테고리별로 3개의 템플릿을 저장하고, 선택된 항목이 기본 메시지로 사용됩니다.`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        {renderCategory('basic', '고객정보 탭 (기본)', 'bg-red-400')}
                        {renderCategory('meeting', '미팅 탭 (미팅일)', 'bg-blue-400')}
                        {renderCategory('contract', '계약 탭 (계약일)', 'bg-green-400')}
                        {renderCategory('payment', '잔금 탭 (잔금일)', 'bg-pink-400')}
                    </div>

                    <div className="mt-8 bg-blue-50/50 border border-blue-100 p-5 rounded-2xl flex gap-3 items-start">
                        <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                        <p className="text-xs text-blue-800 leading-relaxed font-semibold">
                            왼쪽의 라디오 버튼을 선택하여 활성화할 템플릿을 지정하세요. 연락처 클릭 시 선택된 템플릿이 자동으로 입력됩니다.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-2xl border border-slate-200 text-slate-600 font-black hover:bg-white hover:border-slate-300 transition-all text-sm active:scale-95"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-12 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all text-sm active:scale-95"
                    >
                        설정 저장하기
                    </button>
                </div>
            </div>
        </div>
    );
};
