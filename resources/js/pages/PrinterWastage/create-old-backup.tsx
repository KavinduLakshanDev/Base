import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    AlertTriangle,
    Printer,
    FileText,
    Calendar,
    Save,
    RotateCcw,
    Plus,
    Trash2,
    Search,
    X,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Printer Wastage Management'),
        href: '/printer-wastages',
    },
    {
        title: t('Record Printer Wastage'),
        href: '#',
    },
];

interface WastageItem {
    serial_number: string;
    quantity: string;
}

interface WastageFormData {
    items: WastageItem[];
    reason: string;
    wastage_date: string;
    notes: string;
    status: string;
    section_id: string;
}

interface Printer {
    id: number;
    ItemId: number;
    name: string;
    code: string;
    serial_number: string;
    batch_no: string;
    brand?: string;
    model?: string;
    warranty?: string;
    stock_quantity: number;
}

interface Section {
    id: number;
    name: string;
    section_code: string;
}

interface Props {
    sections: Section[];
    userSection?: Section | null;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function PrinterWastageCreate({ sections, userSection, flash }: Props) {
    const { data, setData, processing, errors, reset } = useForm<WastageFormData>({
        items: [{ serial_number: '', quantity: '1' }],
        reason: '',
        wastage_date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'pending',
        section_id: userSection ? userSection.id.toString() : '',
    });

    const [searchTerms, setSearchTerms] = useState<{ [key: number]: string }>({});
    const [searchResults, setSearchResults] = useState<{ [key: number]: Printer[] }>({});
    const [searchLoading, setSearchLoading] = useState<{ [key: number]: boolean }>({});
    const [showDropdowns, setShowDropdowns] = useState<{ [key: number]: boolean }>({});
    const [selectedPrinters, setSelectedPrinters] = useState<{ [key: number]: Printer | null }>({});
    const searchTimeoutRefs = useRef<{ [key: number]: NodeJS.Timeout }>({});

    const handleSearch = async (searchTerm: string, index: number) => {
        if (!searchTerm || searchTerm.length < 2) {
            setSearchResults(prev => ({ ...prev, [index]: [] }));
            return;
        }

        if (!data.section_id) {
            alert(t('Please select a section first'));
            return;
        }

        setSearchLoading(prev => ({ ...prev, [index]: true }));
        try {
            const response = await fetch(`/printer-wastages/search-printers?term=${encodeURIComponent(searchTerm)}&section_id=${data.section_id}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const results = await response.json();
                setSearchResults(prev => ({ ...prev, [index]: results }));
            }
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setSearchLoading(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleSearchChange = (value: string, index: number) => {
        setSearchTerms(prev => ({ ...prev, [index]: value }));
        setShowDropdowns(prev => ({ ...prev, [index]: true }));

        // Clear previous timeout
        if (searchTimeoutRefs.current[index]) {
            clearTimeout(searchTimeoutRefs.current[index]);
        }

        // Set new timeout for search
        searchTimeoutRefs.current[index] = setTimeout(() => {
            handleSearch(value, index);
        }, 300);
    };

    const selectPrinter = (printer: Printer, index: number) => {
        console.log('Selecting printer:', printer.serial_number);
        setSelectedPrinters(prev => ({ ...prev, [index]: printer }));
        
        // Update form data with serial number and quantity
        const newItems = [...data.items];
        newItems[index] = { 
            ...newItems[index], 
            serial_number: printer.serial_number,
            quantity: '1'
        };
        setData('items', newItems);
        
        setSearchTerms(prev => ({ ...prev, [index]: `${printer.code} - ${printer.name} (S/N: ${printer.serial_number})` }));
        setShowDropdowns(prev => ({ ...prev, [index]: false }));
        
        console.log('Updated items:', newItems);
    };

    const clearSelection = (index: number) => {
        setSelectedPrinters(prev => ({ ...prev, [index]: null }));
        updateItem(index, 'serial_number', '');
        setSearchTerms(prev => ({ ...prev, [index]: '' }));
        setSearchResults(prev => ({ ...prev, [index]: [] }));
    };

    const addItem = () => {
        setData('items', [...data.items, { serial_number: '', quantity: '1' }]);
    };

    const removeItem = (index: number) => {
        const newItems = data.items.filter((_, i) => i !== index);
        setData('items', newItems.length > 0 ? newItems : [{ serial_number: '', quantity: '1' }]);
        
        // Clear all related state for this index
        setSearchTerms(prev => {
            const newTerms = { ...prev };
            delete newTerms[index];
            return newTerms;
        });
        setSearchResults(prev => {
            const newResults = { ...prev };
            delete newResults[index];
            return newResults;
        });
        setSelectedPrinters(prev => {
            const newSelected = { ...prev };
            delete newSelected[index];
            return newSelected;
        });
        setShowDropdowns(prev => {
            const newShow = { ...prev };
            delete newShow[index];
            return newShow;
        });
    };

    const updateItem = (index: number, field: keyof WastageItem, value: string) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setData('items', newItems);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.search-dropdown-container')) {
                setShowDropdowns({});
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.post('/printer-wastages', data as any, {
            onSuccess: () => {
                reset();
                router.visit('/printer-wastages');
            },
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        reset();
        setSearchTerms({});
        setSearchResults({});
        setSelectedPrinters({});
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Record Printer Wastage')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-purple-600 to-purple-800 shadow-lg">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/printer-wastages"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-4 w-4 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow-lg">
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Record Printer Wastage')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Document printer wastage and reduction in inventory')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    {/* Form Container */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        {/* Success/Error Messages */}
                        {flash?.success && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                                <div className="flex">
                                    <div className="shrink-0">
                                        <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-green-800">
                                            {flash.success}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {flash?.error && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                                <div className="flex">
                                    <div className="shrink-0">
                                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800">
                                            {flash.error}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Wastage Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Section Selection */}
                            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label className="text-xs font-medium text-slate-700 flex items-center">
                                    <Printer className="w-3 h-3 mr-1.5 text-purple-600" />
                                    {t('Section')} *
                                </label>
                                <select
                                    value={data.section_id}
                                    onChange={(e) => {
                                        setData('section_id', e.target.value);
                                        // Clear all selections when section changes
                                        setSearchTerms({});
                                        setSearchResults({});
                                        setSelectedPrinters({});
                                    }}
                                    className="block w-full rounded-lg border-slate-200 focus:border-purple-600 focus:ring-purple-600/20 px-3 py-2 text-sm"
                                    required
                                >
                                    <option value="">{t('Select Section')}</option>
                                    {sections.map((section) => (
                                        <option key={section.id} value={section.id}>
                                            {section.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.section_id && (
                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                        {errors.section_id}
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="p-1.5 bg-purple-100 rounded-lg">
                                            <Printer className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <h2 className="text-base font-semibold text-slate-800">
                                            {t('Printer Items')}
                                        </h2>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={addItem}
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        {t('Add Printer')}
                                    </Button>
                                </div>

                                {data.items.map((item, index) => {
                                    const selectedPrinter = selectedPrinters[index];

                                    return (
                                        <div key={index} className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-medium text-slate-700">
                                                    {t('Printer')} #{index + 1}
                                                </h3>
                                                {data.items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        variant="destructive"
                                                        size="sm"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        {t('Remove')}
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Printer Search Selection */}
                                            <div className="space-y-1.5 relative search-dropdown-container">
                                                <label className="text-xs font-medium text-slate-700">
                                                    {t('Select Printer')} *
                                                </label>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={searchTerms[index] || ''}
                                                        onChange={(e) => handleSearchChange(e.target.value, index)}
                                                        onFocus={() => {
                                                            if (searchTerms[index] && searchResults[index]?.length > 0) {
                                                                setShowDropdowns(prev => ({ ...prev, [index]: true }));
                                                            }
                                                        }}
                                                        className="block w-full rounded-lg border-slate-200 focus:border-purple-600 focus:ring-purple-600/20 pl-10 pr-10 py-2 text-sm"
                                                        placeholder={t('Search by name, code, serial number...')}
                                                        required={!item.serial_number}
                                                        disabled={!data.section_id}
                                                    />
                                                    {selectedPrinters[index] && (
                                                        <button
                                                            type="button"
                                                            onClick={() => clearSelection(index)}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Search Results Dropdown */}
                                                {showDropdowns[index] && searchResults[index] && searchResults[index].length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                                        {searchLoading[index] ? (
                                                            <div className="p-3 text-center text-sm text-slate-500">
                                                                {t('Searching...')}
                                                            </div>
                                                        ) : (
                                                            searchResults[index].map((printer) => (
                                                                <button
                                                                    key={printer.id}
                                                                    type="button"
                                                                    onClick={() => selectPrinter(printer, index)}
                                                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <div className="text-sm font-medium text-slate-900">
                                                                                {printer.code} - {printer.name}
                                                                            </div>
                                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                                <span className="mr-2">S/N: {printer.serial_number}</span>
                                                                                <span className="mr-2">Batch: {printer.batch_no}</span>
                                                                                {printer.model && (
                                                                                    <span className="mr-2">Model: {printer.model}</span>
                                                                                )}
                                                                                {printer.brand && (
                                                                                    <span>Brand: {printer.brand}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {searchLoading[index] && (
                                                    <p className="text-xs text-slate-500 mt-1">{t('Searching...')}</p>
                                                )}
                                                {searchTerms[index] && searchTerms[index].length >= 2 && !searchLoading[index] && searchResults[index]?.length === 0 && (
                                                    <p className="text-xs text-slate-500 mt-1">{t('No printers found')}</p>
                                                )}
                                            </div>

                                            {/* Serial Number Field (Read-only) */}
                                            {selectedPrinter && (
                                                <>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-medium text-slate-700">
                                                            {t('Serial Number')} *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={item.serial_number}
                                                            readOnly
                                                            className="block w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 cursor-not-allowed"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-medium text-slate-700">
                                                            {t('Quantity')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value="1 unit"
                                                            readOnly
                                                            className="block w-full rounded-lg border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 cursor-not-allowed"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {/* Display selected printer details */}
                                            {selectedPrinter && (
                                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1">
                                                    <div className="text-xs font-medium text-purple-900">
                                                        {t('Selected Printer Details')}:
                                                    </div>
                                                    <div className="text-xs text-purple-700 space-y-0.5">
                                                        <div>
                                                            <span className="font-medium">{t('Serial Number')}:</span> {selectedPrinter.serial_number}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">{t('Batch')}:</span> {selectedPrinter.batch_no}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">{t('Quantity')}:</span> 1 {t('unit')}
                                                        </div>
                                                        {selectedPrinter.model && (
                                                            <div>
                                                                <span className="font-medium">{t('Model')}:</span> {selectedPrinter.model}
                                                            </div>
                                                        )}
                                                        {selectedPrinter.brand && (
                                                            <div>
                                                                <span className="font-medium">{t('Brand')}:</span> {selectedPrinter.brand}
                                                            </div>
                                                        )}
                                                        {selectedPrinter.warranty && (
                                                            <div>
                                                                <span className="font-medium">{t('Warranty')}:</span> {selectedPrinter.warranty}
                                                            </div>
                                                        )}
                                                        <div className="pt-1 mt-1 border-t border-purple-300">
                                                            <span className="font-medium text-purple-900">{t('Stock Available')}:</span> {selectedPrinter.stock_quantity} {t('unit(s)')}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {errors[`items.${index}.serial_number`] && (
                                                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                    {errors[`items.${index}.serial_number`]}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Details Section */}
                            <div className="space-y-3 pt-4 border-t border-slate-200">
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className="p-1.5 bg-purple-100 rounded-lg">
                                        <FileText className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <h2 className="text-base font-semibold text-slate-800">
                                        {t('Wastage Details')}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    {/* Reason */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700">
                                            {t('Reason for Wastage')} *
                                        </label>
                                        <select
                                            value={data.reason}
                                            onChange={(e) => setData('reason', e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 focus:border-purple-600 focus:ring-purple-600/20 px-3 py-2 text-sm"
                                            required
                                        >
                                            <option value="">{t('Select Reason')}</option>
                                            <option value="damaged">{t('Damaged/Broken')}</option>
                                            <option value="defective">{t('Defective')}</option>
                                            <option value="malfunction">{t('Malfunction')}</option>
                                            <option value="returned">{t('Customer Return')}</option>
                                            <option value="obsolete">{t('Obsolete')}</option>
                                            <option value="other">{t('Other')}</option>
                                        </select>
                                        {errors.reason && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.reason}
                                            </div>
                                        )}
                                    </div>

                                    {/* Wastage Date */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700 flex items-center">
                                            <Calendar className="w-3 h-3 mr-1.5 text-purple-600" />
                                            {t('Wastage Date')} *
                                        </label>
                                        <input
                                            type="date"
                                            value={data.wastage_date}
                                            onChange={(e) => setData('wastage_date', e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 focus:border-purple-600 focus:ring-purple-600/20 px-3 py-2 text-sm"
                                            required
                                        />
                                        {errors.wastage_date && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.wastage_date}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700">
                                            {t('Status')} *
                                        </label>
                                        <select
                                            value={data.status}
                                            onChange={(e) => setData('status', e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 focus:border-purple-600 focus:ring-purple-600/20 px-3 py-2 text-sm"
                                            required
                                        >
                                            <option value="pending">{t('Pending')}</option>
                                            <option value="approved">{t('Approved')}</option>
                                            <option value="rejected">{t('Rejected')}</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700">
                                        {t('Additional Notes')}
                                    </label>
                                    <textarea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                        className="block w-full rounded-lg border-slate-200 focus:border-purple-600 focus:ring-purple-600/20 px-3 py-2 text-sm"
                                        placeholder={t('Enter any additional details about this printer wastage...')}
                                    />
                                    {errors.notes && (
                                        <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                            {errors.notes}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex justify-end pt-4 border-t border-slate-200 space-x-3">
                                <Button
                                    type="button"
                                    onClick={handleReset}
                                    variant="outline"
                                    size="sm"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1.5" />
                                    {t('Reset')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-1.5">
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Recording...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-1.5">
                                            <Save className="w-4 h-4" />
                                            <span>{t('Record Printer Wastage')}</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
