import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    AlertTriangle,
    Package,
    FileText,
    Calendar,
    Save,
    Plus,
    Trash2,
    ShoppingCart,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Wastage Management'),
        href: '/wastages',
    },
    {
        title: t('Record Wastage'),
        href: '#',
    },
];

interface WastageItem {
    product_id: string;
    product_name: string;
    category: string;
    quantity: string;
    unit: string;
    cost_price: number;
    // serial_number: string;
    batch_no: string;
    warranty: string;
    reason: string;
    notes: string;
    available_quantity?: number;
    [key: string]: string | number | undefined;
}

interface WastageFormData {
    product_id: string;
    category: string;
    quantity: string;
    unit: string;
    cost_price: number;
    // serial_number: string;
    batch_no: string;
    warranty: string;
    reason: string;
    notes: string;
}

interface Batch {
    batch_no: string;
    // serial_number: string | null;
    available_quantity: number;
    brand: string | null;
    model: string | null;
    warranty: string | null;
    last_date: string;
}

interface Section {
    id: number;
    section_code: string;
    name: string;
}

interface Product {
    id: number | string;
    name: string;
    code: string;
    barcode: string;
    category: string;
    unit: string;
    cost_price: number;
    sale_price: number;
    wholesale_price: number;
    purchase_price: number;
    // serial_number?: string;
    batch_no?: string;
    warranty?: string;
    source?: string;
}

interface Props {
    products: Product[];
    sections: Section[];
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function WastageCreate({ products, sections, flash }: Props) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
    const batchDropdownRef = useRef<HTMLDivElement>(null);
    const [wastageItems, setWastageItems] = useState<WastageItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [globalError, setGlobalError] = useState<string>('');

    const [formData, setFormData] = useState<WastageFormData>({
        product_id: '',
        category: '',
        quantity: '',
        unit: '',
        cost_price: 0,
        // serial_number: '',
        batch_no: '',
        warranty: '',
        reason: '',
        notes: '',
    });

    const [sectionId, setSectionId] = useState<string>(
        sections.length > 0 ? sections[0].id.toString() : ''
    );
    const [wastageDate, setWastageDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (
                batchDropdownRef.current &&
                !batchDropdownRef.current.contains(event.target as Node)
            ) {
                setIsBatchDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch batches when product or section changes
    useEffect(() => {
        if (formData.product_id && sectionId) {
            fetchBatches();
        } else {
            setBatches([]);
            setSelectedBatch(null);
        }
    }, [formData.product_id, sectionId]);

    const fetchBatches = async () => {
        try {
            const selectedSection = sections.find((s) => s.id.toString() === sectionId);
            const sectionCode = selectedSection ? selectedSection.section_code : '';
            const response = await fetch(
                `/wastages/product-batches?product_id=${formData.product_id}&section_code=${sectionCode}`
            );
            const batchData = await response.json();
            setBatches(batchData);

            if (batchData && batchData.length === 1) {
                const batch = batchData[0];
                setSelectedBatch(batch);
                setFormData((prev) => ({
                    ...prev,
                    batch_no: batch.batch_no || '',
                    // serial_number: batch.serial_number || '',
                    warranty: batch.warranty || '',
                }));
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            setBatches([]);
        }
    };

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setIsDropdownOpen(false);
        setFormData({
            ...formData,
            product_id: product.id.toString(),
            category: product.category,
            unit: product.unit,
            cost_price: product.cost_price,
            // serial_number: product.serial_number || '',
            batch_no: product.batch_no || '',
            warranty: product.warranty || '',
        });
        // Reset batch selection when product changes
        setSelectedBatch(null);
    };

    const handleBatchSelect = (batch: Batch) => {
        setSelectedBatch(batch);
        setIsBatchDropdownOpen(false);
        setFormData({
            ...formData,
            batch_no: batch.batch_no,
            // serial_number: batch.serial_number || '',
            warranty: batch.warranty || '',
        });
    };

    const handleSearchChange = async (value: string) => {
        setSearchTerm(value);

        if (!value || value.length < 2) {
            setSearchResults([]);
            setIsDropdownOpen(false);
            return;
        }

        setIsSearching(true);
        setIsDropdownOpen(true);

        try {
            const response = await fetch(
                `/wastages/unified-search?term=${encodeURIComponent(value)}`
            );
            const results = await response.json();
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddItem = () => {
        setGlobalError('');

        // Validation
        if (!formData.product_id) {
            setGlobalError(t('Please select a product'));
            return;
        }
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
            setGlobalError(t('Please enter a valid quantity'));
            return;
        }
        if (!formData.reason) {
            setGlobalError(t('Please select a reason for wastage'));
            return;
        }
        if (selectedBatch && parseFloat(formData.quantity) > selectedBatch.available_quantity) {
            setGlobalError(
                `${t('Insufficient stock. Available')}: ${selectedBatch.available_quantity}`
            );
            return;
        }

        // Add item to list
        const newItem: WastageItem = {
            product_id: formData.product_id,
            product_name: selectedProduct?.name || '',
            category: formData.category,
            quantity: formData.quantity,
            unit: formData.unit,
            cost_price: Number(formData.cost_price),
            // serial_number: formData.serial_number,
            batch_no: formData.batch_no,
            warranty: formData.warranty,
            reason: formData.reason,
            notes: formData.notes,
            available_quantity: selectedBatch?.available_quantity,
        };

        setWastageItems([...wastageItems, newItem]);

        // Reset form
        setFormData({
            product_id: '',
            category: '',
            quantity: '',
            unit: '',
            cost_price: 0,
            // serial_number: '',
            batch_no: '',
            warranty: '',
            reason: '',
            notes: '',
        });
        setSelectedProduct(null);
        setSearchTerm('');
        setBatches([]);
        setSelectedBatch(null);
    };

    const handleRemoveItem = (index: number) => {
        setWastageItems(wastageItems.filter((_, i) => i !== index));
    };

    const handleSubmitAll = async () => {
        if (wastageItems.length === 0) {
            setGlobalError(t('Please add at least one item to record wastage'));
            return;
        }

        setIsSubmitting(true);
        setGlobalError('');

        try {
            router.post(
                '/wastages',
                {
                    items: wastageItems,
                    section_id: sectionId,
                    wastage_date: wastageDate,
                    status: 'approved',
                },
                {
                    onSuccess: () => {
                        setWastageItems([]);
                        setFormData({
                            product_id: '',
                            category: '',
                            quantity: '',
                            unit: '',
                            cost_price: 0,
                            // serial_number: '',
                            batch_no: '',
                            warranty: '',
                            reason: '',
                            notes: '',
                        });
                        setSelectedProduct(null);
                        setSearchTerm('');
                    },
                    onError: (errors) => {
                        console.error('Submission errors:', errors);
                        setGlobalError(
                            Object.values(errors).flat().join(', ') ||
                            t('An error occurred while submitting')
                        );
                    },
                    onFinish: () => {
                        setIsSubmitting(false);
                    },
                    preserveScroll: true,
                }
            );
        } catch (error) {
            console.error('Error submitting:', error);
            setGlobalError(t('An error occurred while submitting'));
            setIsSubmitting(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Record Wastage')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow-lg">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 sm:py-6">
                            <div className="flex min-w-0 items-center space-x-3 sm:space-x-4">
                                <Link
                                    href="/wastages"
                                    className="rounded-xl bg-white/20 p-2.5 transition-all duration-200 hover:bg-white/30 sm:p-3"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-xl bg-white/20 p-2.5 shadow-lg sm:p-3">
                                    <Package className="h-6 w-6 text-white sm:h-7 sm:w-7" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl font-bold text-white sm:text-2xl">
                                        {t('Record New Wastage')}
                                    </h1>
                                    <p className="truncate text-xs text-white/80 sm:text-sm">
                                        {t('Document damaged or expired products and reduce inventory')}
                                    </p>
                                </div>
                            </div>
                            {wastageItems.length > 0 && (
                                <div className="hidden sm:flex items-center space-x-3 bg-white/20 rounded-xl px-4 py-2.5 shadow-inner">
                                    <ShoppingCart className="h-5 w-5 text-white" />
                                    <span className="text-white font-bold tracking-wide">
                                        {wastageItems.length} {t('ITEM(S)')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 sm:py-8 lg:px-8">
                    {/* Success/Error Messages */}
                    {flash?.success && (
                        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                            <div className="flex">
                                <div className="shrink-0">
                                    <svg
                                        className="h-5 w-5 text-green-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                            clipRule="evenodd"
                                        />
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

                    {globalError && (
                        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                            <div className="flex">
                                <div className="shrink-0">
                                    <svg
                                        className="h-5 w-5 text-red-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-red-800">{globalError}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-8 mb-6">
                        <div className="mb-6 flex items-center space-x-3">
                            <div className="p-2.5 bg-vismass-blue/10 rounded-xl shadow-sm">
                                <FileText className="w-5 h-5 text-vismass-blue" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                                {t('Global Settings')}
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Section Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                    <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                    {t('Section')} *
                                </label>
                                <select
                                    value={sectionId}
                                    onChange={(e) => setSectionId(e.target.value)}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50"
                                    required
                                >
                                    {sections.map((section) => (
                                        <option key={section.id} value={section.id}>
                                            {section.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Wastage Date */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                    {t('Wastage Date')} *
                                </label>
                                <input
                                    type="date"
                                    value={wastageDate}
                                    onChange={(e) => setWastageDate(e.target.value)}
                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Add Item Form */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-8 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-vismass-blue/10 rounded-xl shadow-sm">
                                <Plus className="w-5 h-5 text-vismass-blue" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                                {t('Add Wastage Item')}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Unified Search Bar */}
                                <div className="space-y-2 relative" ref={dropdownRef}>
                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                        <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                        {t('Search Product')} *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            onFocus={() => setIsDropdownOpen(true)}
                                            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50"
                                            placeholder={t('Search by Name, Code, Barcode...')}
                                            autoComplete="off"
                                        />
                                        {isDropdownOpen && (
                                            <div className="absolute z-20 mt-1 w-full rounded-md bg-white shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
                                                {isSearching ? (
                                                    <div className="px-4 py-3 text-center text-slate-500">
                                                        {t('Searching...')}
                                                    </div>
                                                ) : searchResults.length > 0 ? (
                                                    searchResults.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleProductSelect(product);
                                                            }}
                                                            className="px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                                        >
                                                            <p className="font-semibold text-slate-800">
                                                                {product.name}
                                                            </p>
                                                            <div className="flex justify-between items-center text-sm text-slate-500">
                                                                <span>{product.code}</span>
                                                                <span>{product.barcode}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    searchTerm.length > 1 && (
                                                        <div className="px-4 py-3 text-center text-slate-500">
                                                            {t('No products found.')}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Category (Read-only) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                        <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                        {t('Category')}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        readOnly
                                        className="w-full rounded-lg border-slate-300 bg-slate-100 cursor-not-allowed"
                                    />
                                </div>

                                {/* Batch Selection */}
                                {batches.length > 0 && (
                                    <div
                                        className="space-y-2 relative lg:col-span-2"
                                        ref={batchDropdownRef}
                                    >
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Select Batch')} *
                                        </label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsBatchDropdownOpen(!isBatchDropdownOpen)
                                                }
                                                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50 px-4 py-3 text-left bg-white flex items-center justify-between"
                                            >
                                                <span
                                                    className={
                                                        selectedBatch
                                                            ? 'text-slate-900'
                                                            : 'text-slate-400'
                                                    }
                                                >
                                                    {selectedBatch
                                                        ? `${selectedBatch.batch_no} (${t('Available')}: ${selectedBatch.available_quantity})`
                                                        : t('Select a batch...')}
                                                </span>
                                                <svg
                                                    className="w-5 h-5 text-slate-400"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </button>
                                            {isBatchDropdownOpen && (
                                                <div className="absolute z-20 mt-1 w-full rounded-md bg-white shadow-lg border border-slate-200 max-h-60 overflow-y-auto">
                                                    {batches.map((batch, index) => (
                                                        <div
                                                            key={index}
                                                            onClick={() => handleBatchSelect(batch)}
                                                            className="px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="font-semibold text-slate-800">
                                                                        {batch.batch_no}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                                        {t('Qty')}:{' '}
                                                                        {batch.available_quantity}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                        <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                        {t('Wastage Quantity')} *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.quantity}
                                        onChange={(e) =>
                                            setFormData({ ...formData, quantity: e.target.value })
                                        }
                                        onWheel={(e) => e.currentTarget.blur()}
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50"
                                        placeholder="0.00"
                                    />
                                    {selectedBatch && (
                                        <p className="text-xs text-slate-600">
                                            {t('Available stock for this batch')}:{' '}
                                            {selectedBatch.available_quantity}
                                        </p>
                                    )}
                                </div>

                                {/* Reason */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Reason for Wastage')} *
                                    </label>
                                    <select
                                        value={formData.reason}
                                        onChange={(e) =>
                                            setFormData({ ...formData, reason: e.target.value })
                                        }
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50"
                                    >
                                        <option value="">{t('Select Reason')}</option>
                                        <option value="expired">{t('Expired Product')}</option>
                                        <option value="damaged">{t('Damaged/Broken')}</option>
                                        <option value="quality_issue">{t('Quality Issue')}</option>
                                        <option value="contaminated">{t('Contaminated')}</option>
                                        <option value="returned">{t('Customer Return')}</option>
                                        <option value="obsolete">{t('Obsolete')}</option>
                                        <option value="other">{t('Other')}</option>
                                    </select>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2 lg:col-span-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Additional Notes')}
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) =>
                                            setFormData({ ...formData, notes: e.target.value })
                                        }
                                        rows={2}
                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50"
                                        placeholder={t('Enter any additional details...')}
                                    />
                                </div>
                            </div>

                            {/* Add Item Button */}
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="bg-vismass-blue hover:bg-vismass-blue/90 text-white px-6 py-2 rounded-lg"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    {t('Add Item')}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Added Items List */}
                    {wastageItems.length > 0 && (
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-8 mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2.5 bg-vismass-blue/10 rounded-xl shadow-sm">
                                        <ShoppingCart className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                                        {t('Added Items')}
                                        <span className="ml-2 text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {wastageItems.length} {t('items')}
                                        </span>
                                    </h2>
                                </div>
                                <Button
                                    onClick={handleSubmitAll}
                                    disabled={isSubmitting}
                                    className="bg-gradient-to-r from-vismass-blue to-blue-600 hover:from-blue-600 hover:to-vismass-blue text-white shadow-md transition-all duration-300"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSubmitting ? t('Submitting...') : t('Submit All Records')}
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Product')}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Batch No.')}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Quantity')}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Cost')}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Total Cost')}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Reason')}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Notes')}
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                                                {t('Action')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {wastageItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {item.product_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.category}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                                                    <div className="space-y-1">
                                                        {item.batch_no && (
                                                            <p className="font-mono text-xs">
                                                                {item.batch_no}
                                                            </p>
                                                        )}
                                                       
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {item.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {item.cost_price.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {(item.cost_price * parseFloat(item.quantity)).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {item.reason}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {item.notes || '-'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50">
                                        <tr>
                                            <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-slate-800">
                                                {t('Total Wastage Cost')}
                                            </td>
                                            <td colSpan={2} className="px-4 py-3 text-left text-sm font-bold text-red-600">
                                                {wastageItems.reduce((total, item) => total + (item.cost_price * parseFloat(item.quantity)), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Submit All Button */}
                            <div className="flex justify-end mt-6">
                                <Button
                                    type="button"
                                    onClick={handleSubmitAll}
                                    disabled={isSubmitting}
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl shadow-sm transition-all duration-200 font-medium"
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Recording...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Save className="w-5 h-5" />
                                            <span>
                                                {t('Record All')} ({wastageItems.length}{' '}
                                                {t('items')})
                                            </span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}
