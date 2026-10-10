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
    Building2,
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
        status: 'approved',
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
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow-lg">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 sm:py-6">
                            <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
                                <Link
                                    href="/printer-wastages"
                                    className="rounded-xl bg-white/20 p-2.5 transition-all duration-200 hover:bg-white/30 sm:p-3"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-xl bg-white/20 p-2.5 shadow-lg sm:p-3">
                                    <Printer className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl font-bold text-white sm:text-2xl">
                                        {t('Record Printer Wastage')}
                                    </h1>
                                    <p className="truncate text-xs text-white/80 sm:text-sm">
                                        {t('Document printer wastage and reduction in inventory')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 sm:py-8 lg:px-8">

                    {/* Form Container */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:rounded-2xl sm:p-8">
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
                            <div className="space-y-4">
                                <div className="mb-4 flex items-center space-x-3">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Building2 className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{t('Section Selection')}</h2>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                        <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
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
                                        className="block w-full rounded-lg border-slate-200 focus:border-sky-600 focus:ring-sky-600/20 px-3 py-2.5 text-sm"
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
                            </div>

                            {/* Items List */}
                            <div className="space-y-4">
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <Printer className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">
                                            {t('Printer Items')}
                                        </h2>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={addItem}
                                        size="sm"
                                        className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 sm:w-auto"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {t('Add Printer')}
                                    </Button>
                                </div>

                                {data.items.map((item, index) => {
                                    const selectedPrinter = selectedPrinters[index];

                                    return (
                                        <div key={index} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-vismass-blue/30 hover:shadow-md">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-vismass-blue text-[10px] font-bold text-white">
                                                        {index + 1}
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-slate-800">
                                                        {t('Printer Item')}
                                                    </h3>
                                                </div>
                                                {data.items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        variant="destructive"
                                                        size="sm"
                                                        className="h-8 px-3 text-xs"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                                        {t('Remove')}
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                                {/* Printer Search Selection */}
                                                <div className="space-y-1.5 relative search-dropdown-container">
                                                    <label className="text-xs font-semibold text-slate-700 flex items-center">
                                                        <Search className="w-3.5 h-3.5 mr-1.5 text-vismass-blue" />
                                                        {t('Search Printer')} *
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
                                                            className="block w-full rounded-lg border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 pl-10 pr-10 py-2.5 text-sm transition-all"
                                                            placeholder={t('Search by name, code, or serial...')}
                                                            required={!item.serial_number}
                                                            disabled={!data.section_id}
                                                        />
                                                        {selectedPrinters[index] && (
                                                            <button
                                                                type="button"
                                                                onClick={() => clearSelection(index)}
                                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Search Results Dropdown */}
                                                    {showDropdowns[index] && searchResults[index] && searchResults[index].length > 0 && (
                                                        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {searchLoading[index] ? (
                                                                <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center">
                                                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-vismass-blue border-t-transparent"></div>
                                                                    {t('Searching...')}
                                                                </div>
                                                            ) : (
                                                                searchResults[index].map((printer) => (
                                                                    <button
                                                                        key={printer.id}
                                                                        type="button"
                                                                        onClick={() => selectPrinter(printer, index)}
                                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group"
                                                                    >
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex-1">
                                                                                <div className="text-sm font-bold text-slate-900 group-hover:text-vismass-blue transition-colors">
                                                                                    {printer.code} - {printer.name}
                                                                                </div>
                                                                                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 uppercase tracking-wider">
                                                                                    <span className="flex items-center"><span className="font-bold text-slate-400 mr-1">SN:</span> {printer.serial_number}</span>
                                                                                    <span className="flex items-center"><span className="font-bold text-slate-400 mr-1">BATCH:</span> {printer.batch_no}</span>
                                                                                    {printer.brand && <span className="flex items-center"><span className="font-bold text-slate-400 mr-1">BRAND:</span> {printer.brand}</span>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="ml-2 rounded bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 border border-green-100">
                                                                                {printer.stock_quantity} {t('IN STOCK')}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {searchLoading[index] && (
                                                        <p className="text-[10px] text-vismass-blue font-medium mt-1 animate-pulse">{t('Searching database...')}</p>
                                                    )}
                                                    {searchTerms[index] && searchTerms[index].length >= 2 && !searchLoading[index] && searchResults[index]?.length === 0 && (
                                                        <p className="text-[10px] text-red-500 font-medium mt-1">{t('No printers found with this criteria')}</p>
                                                    )}
                                                </div>

                                                {/* Details Display Area */}
                                                <div className="relative">
                                                    {selectedPrinter ? (
                                                        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                <Printer className="w-12 h-12 text-vismass-blue rotate-12" />
                                                            </div>
                                                            <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-2">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t('Printer Name')}</p>
                                                                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{selectedPrinter.name}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t('Serial Number')}</p>
                                                                    <p className="text-sm font-mono font-medium text-vismass-blue">{selectedPrinter.serial_number}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t('Brand / Model')}</p>
                                                                    <p className="text-xs font-medium text-slate-700">{selectedPrinter.brand || 'N/A'} / {selectedPrinter.model || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t('Warranty')}</p>
                                                                    <p className="text-xs font-medium text-slate-700">{selectedPrinter.warranty || 'No Warranty'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-full min-h-[80px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                                                            <p className="text-xs italic">{t('Select a printer to view details')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {errors[`items.${index}.serial_number`] && (
                                                <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100 flex items-center">
                                                    <AlertTriangle className="w-3 h-3 mr-2" />
                                                    {errors[`items.${index}.serial_number`]}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Details Section */}
                            <div className="space-y-4 pt-6 border-t border-slate-200">
                                <div className="mb-4 flex items-center space-x-3">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <FileText className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">
                                        {t('Wastage Details')}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {/* Reason */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <AlertTriangle className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Reason for Wastage')} *
                                        </label>
                                        <select
                                            value={data.reason}
                                            onChange={(e) => setData('reason', e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 focus:border-sky-600 focus:ring-sky-600/20 px-3 py-2.5 text-sm"
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
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Wastage Date')} *
                                        </label>
                                        <input
                                            type="date"
                                            value={data.wastage_date}
                                            onChange={(e) => setData('wastage_date', e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 focus:border-sky-600 focus:ring-sky-600/20 px-3 py-2.5 text-sm"
                                            required
                                        />
                                        {errors.wastage_date && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.wastage_date}
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t('Status')} *
                                        </label>
                                        <select
                                            value={data.status}
                                            onChange={(e) => setData('status', e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 focus:border-sky-600 focus:ring-sky-600/20 px-3 py-2.5 text-sm"
                                            required
                                        >
                                            {/* <option value="pending">{t('Pending')}</option> */}
                                            <option value="approved">{t('Approved')}</option>
                                            {/* <option value="rejected">{t('Rejected')}</option> */}
                                        </select>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Additional Notes')}
                                    </label>
                                    <textarea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                        className="block w-full rounded-lg border-slate-200 focus:border-sky-600 focus:ring-sky-600/20 px-3 py-2.5 text-sm"
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
                            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    onClick={handleReset}
                                    variant="outline"
                                    size="default"
                                    className="w-full sm:w-auto"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    {t('Reset')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    size="default"
                                    className="w-full bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700 sm:w-auto"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Recording...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
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
