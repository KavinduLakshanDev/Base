import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Calendar,
    LayoutGrid,
    ArrowUpRight,
    ArrowDownLeft,
    Info,
    Layers,
    Search,
    Plus,
    Trash2,
    CheckCircle2,
    ShoppingBag
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Select from 'react-select';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Stock Adjustments'),
        href: '/stock-adjustments',
    },
    {
        title: t('New Adjustment'),
        href: '#',
    },
];

interface Section {
    id: number;
    section_code: string;
    name: string;
}

interface Product {
    id: number;
    name: string;
    code: string;
    unit: string;
    item_type: string;
}

interface Batch {
    batch_no: string;
    total_quantity: number;
    cost_price: number;
    sale_price: number;
    wholesale_price: number;
    vehicle_sale_price: number;
    section_code: string;
    section_name: string;
}

interface ProductDetails {
    product: {
        id: number;
        name: string;
        code: string;
    };
    batches: Batch[];
    default_prices: {
        cost_price: number;
        sale_price: number;
        wholesale_price: number;
        vehicle_sale_price: number;
    };
    suggested_batch: string;
}

interface AdjustmentItem {
    product_id: string;
    product_name: string;
    product_code: string;
    adjustment_type: 'addition' | 'subtraction';
    quantity: string;
    batch_no: string;
    serial_number: string;
    cost_price: string;
    sale_price: string;
    wholesale_price: string;
    vehicle_sale_price: string;
    current_stock: number;
}

interface Props {
    products: Product[];
    sections: Section[];
    suggested_batch: string;
    completedTakings: {
        id: number;
        taking_number: string;
        taking_date: string;
        section_name: string;
        section_id: number;
    }[];
}

export default function StockAdjustmentCreate({ products, sections, suggested_batch, completedTakings = [] }: Props) {
    const { data, setData, post, processing, errors } = useForm<{
        section_id: string;
        batch_no: string;
        adjustment_date: string;
        notes: string;
        items: AdjustmentItem[];
    }>({
        section_id: sections.length > 0 ? sections[0].id.toString() : '',
        batch_no: suggested_batch || '',
        adjustment_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [] as AdjustmentItem[],
    });

    // Local state for the product being added
    const [tempItem, setTempItem] = useState<AdjustmentItem>({
        product_id: '',
        product_name: '',
        product_code: '',
        adjustment_type: 'addition',
        quantity: '',
        batch_no: '',
        serial_number: '',
        cost_price: '0',
        sale_price: '0',
        wholesale_price: '0',
        vehicle_sale_price: '0',
        current_stock: 0,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [selectedBatchKey, setSelectedBatchKey] = useState('');
    const [isLoadingTaking, setIsLoadingTaking] = useState(false);
    const [selectedTakingId, setSelectedTakingId] = useState<string | null>(null);
    const [takingSearchInput, setTakingSearchInput] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Re-fetch product details if the section changes while a product is being configured
    useEffect(() => {
        if (tempItem.product_id && !isLoadingDetails && data.section_id) {
            fetchProductDetails(tempItem.product_id);
        }
    }, [data.section_id]);

    useEffect(() => {
        if (data.section_id) {
            fetchNextBatchNumber(data.section_id);
        }
    }, [data.section_id]);

    const fetchNextBatchNumber = async (sectionId: string) => {
        try {
            const response = await fetch(`/stock-adjustments/next-batch?section_id=${sectionId}`);
            if (response.ok) {
                const result = await response.json();
                setData('batch_no', result.batch_no);
            }
        } catch (error) {
            console.error('Error fetching next batch:', error);
        }
    };

    const loadFromStockTaking = async (takingId: string) => {
        if (!takingId) return;
        setIsLoadingTaking(true);
        try {
            const response = await fetch(`/stock-adjustments/taking-items?stock_taking_id=${takingId}`);
            if (!response.ok) {
                const error = await response.json();
                alert(error.error || 'Failed to load stock taking items');
                return;
            }
            const result = await response.json();

            // Set section from the taking
            if (result.taking?.section_id) {
                setData('section_id', result.taking.section_id.toString());
            }

            // Fetch next batch number for the section
            let nextBatch = '';
            if (result.taking?.section_id) {
                try {
                    const batchRes = await fetch(`/stock-adjustments/next-batch?section_id=${result.taking.section_id}`);
                    if (batchRes.ok) {
                        const batchData = await batchRes.json();
                        nextBatch = batchData.batch_no || '';
                    }
                } catch (e) {
                    console.error('Error fetching batch:', e);
                }
            }

            // Convert taking items to adjustment items
            if (result.items && result.items.length > 0) {
                const adjustmentItems: AdjustmentItem[] = result.items.map((item: any) => ({
                    product_id: item.product_id.toString(),
                    product_name: item.product_name,
                    product_code: item.product_code,
                    adjustment_type: item.adjustment_type,
                    quantity: item.quantity.toString(),
                    // Addition: use new batch, Subtraction: use existing batch
                    batch_no: item.adjustment_type === 'addition' ? nextBatch : (item.batch_no || ''),
                    serial_number: item.serial_number || '',
                    cost_price: Number(item.cost_price || 0).toFixed(2),
                    sale_price: Number(item.sale_price || 0).toFixed(2),
                    wholesale_price: Number(item.wholesale_price || 0).toFixed(2),
                    vehicle_sale_price: Number(item.vehicle_sale_price || 0).toFixed(2),
                    current_stock: item.current_stock,
                }));

                setData('items', adjustmentItems);
                // Also set the header batch number
                if (nextBatch) {
                    setData('batch_no', nextBatch);
                }
            } else {
                alert('No items with variances found in this stock taking.');
            }
        } catch (error) {
            console.error('Error loading stock taking:', error);
            alert('Failed to load stock taking items');
        } finally {
            setIsLoadingTaking(false);
        }
    };

    const fetchProductDetails = async (productId: string) => {
        if (!productId) return;
        if (!data.section_id) return;
        
        setIsLoadingDetails(true);
        try {
            const queryParams = new URLSearchParams({ product_id: productId });
            queryParams.append('section_id', data.section_id);

            const response = await fetch(`/stock-adjustments/product-details?${queryParams.toString()}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch details');
            }
            
            const result = await response.json();
            setProductDetails(result);
            setSelectedBatchKey('');
            
            // Pre-fill prices and suggested batch with safety checks
            const defaultPrices = result.default_prices || {};
            
            setTempItem(prev => ({
                ...prev,
                product_id: result.product.id.toString(),
                product_name: result.product.name,
                product_code: result.product.code,
                cost_price: Number(defaultPrices.cost_price || 0).toFixed(2),
                sale_price: Number(defaultPrices.sale_price || 0).toFixed(2),
                wholesale_price: Number(defaultPrices.wholesale_price || 0).toFixed(2),
                vehicle_sale_price: Number(defaultPrices.vehicle_sale_price || 0).toFixed(2),
                batch_no: (result.batches && result.batches.length === 0) ? result.suggested_batch : '',
                current_stock: 0,
                // If it's a printer, force qty to 1
                quantity: result.product.item_type === 'printer' ? '1' : prev.quantity,
            }));
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleBatchChange = (compositeValue: string) => {
        if (!compositeValue) {
            setSelectedBatchKey('');
            setTempItem(prev => ({
                ...prev,
                batch_no: '',
                current_stock: 0,
            }));
            return;
        }

        if (productDetails) {
            const [batchNo, sectionCode] = compositeValue.split('|');
            const batch = productDetails.batches.find(b => b.batch_no === batchNo && b.section_code === sectionCode);
            
            if (batch) {
                setTempItem(prev => ({
                    ...prev,
                    batch_no: batchNo,
                    cost_price: Number(batch.cost_price ?? productDetails.default_prices.cost_price ?? 0).toFixed(2),
                    sale_price: Number(batch.sale_price ?? productDetails.default_prices.sale_price ?? 0).toFixed(2),
                    wholesale_price: Number(batch.wholesale_price ?? productDetails.default_prices.wholesale_price ?? 0).toFixed(2),
                    vehicle_sale_price: Number(batch.vehicle_sale_price ?? productDetails.default_prices.vehicle_sale_price ?? 0).toFixed(2),
                    current_stock: batch.total_quantity,
                }));
                // We'll use a temporary state to track the actual selected key for the dropdown UI
                setSelectedBatchKey(compositeValue);
            } else {
                setTempItem(prev => ({ ...prev, batch_no: compositeValue, current_stock: 0 }));
                setSelectedBatchKey(compositeValue);
            }
        }
    };

    const addItemToList = () => {
        const isPrinter = productDetails?.product && products.find(p => p.id.toString() === tempItem.product_id)?.item_type === 'printer';
        
        let finalBatchNo = tempItem.batch_no;
        
        // Use header batch if item batch is not provided or set to 'NEW'
        if (data.batch_no && (finalBatchNo === 'NEW' || !finalBatchNo)) {
            finalBatchNo = data.batch_no;
        }

        if (tempItem.adjustment_type === 'subtraction' && (!selectedBatchKey || selectedBatchKey === 'NEW')) {
            alert(t('Please select an existing batch from the list for subtraction.'));
            return;
        }

        if (!tempItem.product_id) {
            alert(t('Please select a product first.'));
            return;
        }
        
        if (!finalBatchNo) {
            alert(t('Please select a batch.'));
            return;
        }

        if (isPrinter) {
            if (!tempItem.serial_number) {
                alert(t('Please enter the Serial Number for this printer.'));
                return;
            }
            // For printers, quantity is always 1
            if (!tempItem.quantity || tempItem.quantity === '0') {
                tempItem.quantity = '1';
            }
        } else {
            if (!tempItem.quantity || parseFloat(tempItem.quantity) <= 0) {
                alert(t('Please enter a valid quantity.'));
                return;
            }
        }

        setData('items', [...data.items, { ...tempItem, batch_no: finalBatchNo }]);
        
        // Reset temp item
        setTempItem({
            product_id: '',
            product_name: '',
            product_code: '',
            adjustment_type: 'addition',
            quantity: '',
            batch_no: '',
            serial_number: '',
            cost_price: '0',
            sale_price: '0',
            wholesale_price: '0',
            vehicle_sale_price: '0',
            current_stock: 0,
        });
        setSearchTerm('');
        setProductDetails(null);
        setSelectedBatchKey('');
    };

    const removeItem = (index: number) => {
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof AdjustmentItem, value: string) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setData('items', newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.items.length === 0) {
            alert(t('Please add at least one product.'));
            return;
        }
        post('/stock-adjustments');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Bulk Stock Adjustment')} />

            <div className="min-h-screen bg-slate-50 pb-20">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/stock-adjustments"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <LayoutGrid className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Bulk Stock Adjustment')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Select products and add them to the list below')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Global Settings */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Target Section')} *</label>
                                    <select
                                        value={data.section_id}
                                        onChange={e => setData('section_id', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 focus:border-vismass-blue"
                                    >
                                        {sections.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Adjustment Batch No')}</label>
                                    <input
                                        type="text"
                                        value={data.batch_no || t('Generating...')}
                                        readOnly
                                        className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-500 focus:border-slate-200 focus:ring-0 cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-slate-500 font-medium italic mt-1">
                                        * {t('Auto-generated')}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Adjustment Date')} *</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={data.adjustment_date}
                                            onChange={e => setData('adjustment_date', e.target.value)}
                                            className="w-full rounded-lg border-slate-200 focus:border-vismass-blue pl-10"
                                        />
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                {/* <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Global Reference')}</label>
                                    <input
                                        type="text"
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 focus:border-vismass-blue"
                                        placeholder={t('Batch details...')}
                                    />
                                </div> */}

                                {/* Load from Stock Taking */}
                                {completedTakings.length > 0 && (
                                    <div className="md:col-span-3 space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">{t('Load from Stock Taking')}</label>
                                        <div className="flex space-x-2">
                                            <div className="flex-1">
                                                <Select
                                                    id="stock_taking_select"
                                                    isDisabled={isLoadingTaking}
                                                    isClearable
                                                    isSearchable
                                                    placeholder={t('Search a completed stock taking...')}
                                                    options={takingSearchInput.length > 0 ? completedTakings.map(taking => ({
                                                        value: taking.id.toString(),
                                                        label: `${taking.taking_number} - ${taking.section_name} (${taking.taking_date})`
                                                    })) : []}
                                                    onInputChange={(newValue) => setTakingSearchInput(newValue)}
                                                    noOptionsMessage={({ inputValue }) => !inputValue ? t('Type to search stock taking...') : t('No results found')}
                                                    onChange={(option) => setSelectedTakingId(option ? option.value : null)}
                                                    className="react-select-container"
                                                    classNamePrefix="react-select"
                                                    styles={{
                                                        control: (base) => ({
                                                            ...base,
                                                            minHeight: '42px',
                                                            borderRadius: '0.5rem',
                                                            borderColor: '#e2e8f0',
                                                            boxShadow: 'none',
                                                            '&:hover': {
                                                                borderColor: '#2563eb'
                                                            }
                                                        })
                                                    }}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedTakingId) {
                                                        loadFromStockTaking(selectedTakingId);
                                                    }
                                                }}
                                                disabled={isLoadingTaking || !selectedTakingId}
                                                className="bg-vismass-blue hover:bg-vismass-blue/90 text-white whitespace-nowrap h-[42px]"
                                            >
                                                {isLoadingTaking ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                ) : (
                                                    t('Load')
                                                )}
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium italic mt-1">
                                            * {t('Loads items with variances into the adjustment list')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product Selection Card */}
                        <div className="bg-white rounded-2xl shadow-lg border border-vismass-blue/10">
                            <div className="bg-vismass-blue/5 px-6 py-3 border-b border-vismass-blue/10 flex items-center">
                                <Search className="w-4 h-4 text-vismass-blue mr-2" />
                                <span className="text-sm font-bold text-vismass-blue uppercase tracking-wider">{t('Select Product to Add')}</span>
                            </div>
                            
                            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Search */}
                                <div className="lg:col-span-4 space-y-1 relative" ref={dropdownRef}>
                                    <label className="text-xs font-bold text-slate-600">{t('Product')} *</label>
                                    <div className="relative">
                                        <div className="flex space-x-2">
                                            <select
                                                value={selectedType}
                                                onChange={e => setSelectedType(e.target.value)}
                                                className="bg-white border border-slate-200 rounded-lg focus:border-vismass-blue h-10 px-3 text-sm shadow-sm w-24 shrink-0"
                                            >
                                                <option value="all">{t('All')}</option>
                                                <option value="product">{t('Product')}</option>
                                                <option value="printer">{t('Printer')}</option>
                                            </select>
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={e => {
                                                        setSearchTerm(e.target.value);
                                                        setIsDropdownOpen(true);
                                                    }}
                                                    onFocus={() => setIsDropdownOpen(true)}
                                                    className="w-full bg-white border border-slate-200 rounded-lg focus:border-vismass-blue pl-9 h-10 text-sm shadow-sm"
                                                    placeholder={t('Search...')}
                                                />
                                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                            </div>
                                        </div>
                                        
                                        {isLoadingDetails && (
                                            <div className="absolute right-4 top-4">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vismass-blue"></div>
                                            </div>
                                        )}
                                    </div>

                                    {isDropdownOpen && searchTerm && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-auto">
                                            {products
                                                .filter(p => {
                                                    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase());
                                                    const matchesType = selectedType === 'all' || p.item_type === selectedType;
                                                    return matchesSearch && matchesType;
                                                })
                                                .slice(0, 10)
                                                .map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="px-4 py-3 hover:bg-vismass-blue/5 cursor-pointer border-b border-slate-50 last:border-0 group"
                                                        onClick={() => {
                                                            setTempItem(prev => ({ ...prev, product_id: p.id.toString(), product_name: p.name, product_code: p.code }));
                                                            setSearchTerm(p.name);
                                                            setIsDropdownOpen(false);
                                                            setSelectedBatchKey('');
                                                            fetchProductDetails(p.id.toString());
                                                        }}
                                                    >
                                                        <div className="font-bold text-slate-900 group-hover:text-vismass-blue transition-colors">{p.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{p.code}</div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* Type */}
                                <div className="lg:col-span-2 space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Type')}</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg h-10">
                                        <button
                                            type="button"
                                            onClick={() => setTempItem(prev => ({ ...prev, adjustment_type: 'addition' }))}
                                            className={`flex-1 flex items-center justify-center rounded-md transition-all ${tempItem.adjustment_type === 'addition' ? 'bg-white shadow text-green-600' : 'text-slate-400'}`}
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTempItem(prev => ({ ...prev, adjustment_type: 'subtraction' }));
                                                if (!selectedBatchKey && productDetails?.batches && productDetails.batches.length > 0) {
                                                    const firstBatch = productDetails.batches[0];
                                                    setSelectedBatchKey(`${firstBatch.batch_no}|${firstBatch.section_code}`);
                                                    setTempItem(prev => ({ ...prev, batch_no: firstBatch.batch_no, current_stock: firstBatch.total_quantity }));
                                                }
                                            }}
                                            className={`flex-1 flex items-center justify-center rounded-md transition-all ${tempItem.adjustment_type === 'subtraction' ? 'bg-white shadow text-red-600' : 'text-slate-400'}`}
                                        >
                                            <ArrowDownLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Qty/Serial */}
                                {productDetails?.product && (products.find(p => p.id.toString() === tempItem.product_id)?.item_type === 'printer') ? (
                                    <div className="lg:col-span-3 space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">{t('Serial No')} *</label>
                                        <input
                                            type="text"
                                            value={tempItem.serial_number}
                                            onChange={e => setTempItem(prev => ({ ...prev, serial_number: e.target.value }))}
                                            className="w-full bg-amber-50/30 border border-slate-200 rounded-lg focus:border-vismass-blue h-10 px-3 text-sm shadow-sm"
                                            placeholder={t('Enter Serial Number')}
                                        />
                                    </div>
                                ) : (
                                    <div className="lg:col-span-2 space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">{t('Qty')} *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tempItem.quantity}
                                            onChange={e => setTempItem(prev => ({ ...prev, quantity: e.target.value }))}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="w-full bg-white border border-slate-200 rounded-lg focus:border-vismass-blue h-10 px-3 text-sm shadow-sm"
                                            placeholder="0.00"
                                        />
                                    </div>
                                )}

                                {/* Batch */}
                                <div className={productDetails?.product && (products.find(p => p.id.toString() === tempItem.product_id)?.item_type === 'printer') ? "lg:col-span-3 space-y-1" : "lg:col-span-4 space-y-1"}>
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Batch')} *</label>
                                    <div className="flex items-center">
                                        {productDetails?.batches && productDetails.batches.length > 0 ? (
                                            <div className="w-full space-y-2">
                                                <select
                                                    value={selectedBatchKey}
                                                    onChange={e => handleBatchChange(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-lg focus:border-vismass-blue text-sm h-10 px-3 shadow-sm truncate pr-8"
                                                >
                                                    {tempItem.adjustment_type !== 'subtraction' && (
                                                        <option value="">{t('Use New Batch')} ({suggested_batch})</option>
                                                    )}
                                                    {productDetails.batches.map((b: any) => (
                                                        <option key={`${b.batch_no}-${b.section_code}`} value={`${b.batch_no}|${b.section_code}`}>
                                                            {b.batch_no} ({b.total_quantity}) - {b.section_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <input
                                                type="text"
                                                value={tempItem.batch_no}
                                                onChange={e => setTempItem(prev => ({ ...prev, batch_no: e.target.value }))}
                                                className="w-full bg-white border border-slate-200 rounded-lg focus:border-vismass-blue h-10 px-3 text-sm font-mono shadow-sm"
                                                placeholder={t('Enter batch number...')}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Prices row */}
                                <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">{t('Cost Price (Rs)')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempItem.cost_price}
                                                onChange={e => setTempItem(prev => ({ ...prev, cost_price: e.target.value }))}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="w-full bg-white border border-slate-200 rounded-lg pl-8 py-2 text-sm font-mono shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">{t('Sale Price (Rs)')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempItem.sale_price}
                                                onChange={e => setTempItem(prev => ({ ...prev, sale_price: e.target.value }))}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="w-full bg-white border border-slate-200 rounded-lg pl-8 py-2 text-sm font-mono shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">{t('Wholesale Price (Rs)')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempItem.wholesale_price}
                                                onChange={e => setTempItem(prev => ({ ...prev, wholesale_price: e.target.value }))}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="w-full bg-white border border-slate-200 rounded-lg pl-8 py-2 text-sm font-mono shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">{t('Vehicle Sale Price (Rs)')}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={tempItem.vehicle_sale_price}
                                                onChange={e => setTempItem(prev => ({ ...prev, vehicle_sale_price: e.target.value }))}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                className="w-full bg-white border border-slate-200 rounded-lg pl-8 py-2 text-sm font-mono shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Add Button */}
                                <div className="lg:col-span-12 flex justify-end pt-2">
                                    <Button
                                        type="button"
                                        onClick={addItemToList}
                                        className="bg-vismass-blue hover:bg-vismass-blue/90 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-vismass-blue/20 transition-all flex items-center"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        {t('Add to Adjustment List')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center">
                                    <Layers className="w-4 h-4 mr-2 text-slate-400" />
                                    {t('Products to be Adjusted')} ({data.items.length})
                                </h3>
                            </div>
                            
                            <div className="overflow-x-auto w-full pb-4">
                                <table className="w-full min-w-max text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="sticky left-0 z-20 bg-slate-50 px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{t('Product')}</th>
                                            <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('Type')}</th>
                                            <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('Batch')}</th>
                                            <th className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap min-w-[70px]">{t('Avail.')}</th>
                                            <th className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap min-w-[90px]">{t('Qty')}</th>
                                            <th className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap min-w-[110px]">{t('Cost(Rs)')}</th>
                                            <th className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap min-w-[110px]">{t('Sale(Rs)')}</th>
                                            <th className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap min-w-[110px]">{t('WSale(Rs)')}</th>
                                            <th className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap min-w-[110px]">{t('Veh.Sale(Rs)')}</th>
                                            <th className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap min-w-[110px]">{t('Total(Rs)')}</th>
                                            <th className="px-4 py-4 text-center border-b border-slate-100"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                                                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm">{t('No products added yet. Select a product above to begin.')}</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            data.items.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-4 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                        <div className="font-bold text-slate-900">{item.product_name}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">{item.product_code}</div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.adjustment_type === 'addition' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {item.adjustment_type === 'addition' ? (
                                                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                                            ) : (
                                                                <ArrowDownLeft className="w-3 h-3 mr-1" />
                                                            )}
                                                            {item.adjustment_type.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit whitespace-nowrap" title={item.batch_no}>
                                                            {item.batch_no}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-bold text-slate-500 text-sm">
                                                        {Number(item.current_stock || 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className={`w-full min-w-[80px] text-right bg-white border rounded-lg focus:border-vismass-blue px-2 py-1 text-sm shadow-sm ${item.adjustment_type === 'addition' ? 'border-green-200 text-green-600' : 'border-red-200 text-red-600'}`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.cost_price}
                                                            onChange={e => handleItemChange(index, 'cost_price', e.target.value)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-full min-w-[90px] text-right bg-white border border-slate-200 rounded-lg focus:border-vismass-blue px-2 py-1 text-sm shadow-sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.sale_price}
                                                            onChange={e => handleItemChange(index, 'sale_price', e.target.value)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-full min-w-[90px] text-right bg-white border border-slate-200 rounded-lg focus:border-vismass-blue px-2 py-1 text-sm shadow-sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.wholesale_price}
                                                            onChange={e => handleItemChange(index, 'wholesale_price', e.target.value)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-full min-w-[90px] text-right bg-white border border-slate-200 rounded-lg focus:border-vismass-blue px-2 py-1 text-sm shadow-sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.vehicle_sale_price}
                                                            onChange={e => handleItemChange(index, 'vehicle_sale_price', e.target.value)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-full min-w-[90px] text-right bg-white border border-slate-200 rounded-lg focus:border-vismass-blue px-2 py-1 text-sm shadow-sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                                                        {(parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0')).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}

                                        {data.items.length > 0 && (
                                            <tr className="bg-vismass-blue/5 border-t-2 border-vismass-blue/20">
                                                <td className="sticky left-0 z-10 bg-[#f4f7fa] px-6 py-6 text-right border-r border-vismass-blue/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('Total Amount')}</span>
                                                </td>
                                                <td colSpan={3} className="px-6 py-6 text-right">
                                                    {/* Spacer */}
                                                </td>
                                                <td className="px-4 py-6 text-right">
                                                    <div className="text-base font-black text-slate-900">
                                                        {data.items.reduce((sum, item) => sum + parseFloat(item.quantity || '0'), 0).toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t('Units')}</div>
                                                </td>
                                                <td colSpan={4} className="px-6 py-6 text-right">
                                                    {/* Spacer for Price column */}
                                                </td>
                                                <td className="px-4 py-6 text-right">
                                                    <div className="text-xl font-black text-vismass-blue">
                                                        Rs.{data.items.reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0')), 0).toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-vismass-blue/60 font-bold uppercase tracking-tighter">{t('Grand Total')}</div>
                                                </td>
                                                <td className="px-6 py-6"></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-white rounded-2xl shadow-xl border border-slate-200">
                            <div className="flex items-start space-x-3 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 max-w-2xl">
                                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-relaxed">
                                    <strong>{t('Warning')}:</strong> {t('Submitting these adjustments will immediately update inventory levels across the system. Ensure all batches, quantities, and pricing are verified before proceeding.')}
                                </p>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/stock-adjustments"
                                    className="px-8 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-all text-sm"
                                >
                                    {t('Discard Changes')}
                                </Link>
                                <Button
                                    type="submit"
                                    disabled={processing || data.items.length === 0}
                                    className="px-12 py-4 bg-vismass-blue hover:bg-vismass-blue/90 text-white font-bold rounded-xl shadow-2xl shadow-vismass-blue/30 transition-all flex items-center transform active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    {processing ? (
                                        <span className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            {t('Processing...')}
                                        </span>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5 mr-2" />
                                            {t('Finalize Adjustments')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </AppLayout>
    );
}
