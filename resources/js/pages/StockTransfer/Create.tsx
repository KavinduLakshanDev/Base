import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { t } from '@/lib/i18n';
import { Head, useForm, Link } from '@inertiajs/react';
import { Calendar, Loader, Truck, Package, Plus, Trash2, Building2, MapPin, Download, ArrowLeft, X, Check, ChevronsUpDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import Swal from 'sweetalert2';

// Reusing date utilities from StockInHand.tsx
const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const parseDateFromDisplay = (displayDate: string) => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate;
    const [day, month, year] = parts;
    
    // Ensure we have a valid 4-digit year and numeric parts before constructing ISO string
    if (year.length !== 4 || isNaN(parseInt(day)) || isNaN(parseInt(month)) || isNaN(parseInt(year))) {
        return displayDate; 
    }
    
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

interface Section {
    id: number;
    section_code: string;
    name: string;
    is_main_stock: boolean;
    company_code?: string;
}

interface Item {
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    cost_price: number;
    barcode?: string | null;
    transfer_unit_id?: number | null;
    receiving_unit_id?: number | null;
    transfer_conversion_factor?: number | null;
    transfer_unit_name?: string | null;
    receiving_unit_name?: string | null;
}

interface TransferItem {
    item_id: string;
    quantity: string;
    stock_id?: string;
    batch_no?: string;
    cost_price?: number;
}

interface StockBatch {
    id: number;
    batch_no: string;
    cost_price: number;
    quantity: number;
    date: string;
    bundle_stock?: number;
    nos_stock?: number;
}

interface Props {
    sections?: Section[];
    items?: Item[];
}

export default function Create({ sections = [], items = [] }: Props) {
    // Remove duplicate items based on ItmKy
    const uniqueItems = (items || []).filter((item, index, self) =>
        self.findIndex(i => i.ItmKy === item.ItmKy) === index
    );

    const { data, setData, post, processing, errors } = useForm<{
        from_section_code: string;
        to_section_code: string;
        items: TransferItem[];
        transfer_date: string;
        notes: string;
        company_code: string;
    }>({
        from_section_code: '',
        to_section_code: '',
        items: [],
        transfer_date: new Date().toISOString().split('T')[0], // Default to today
        notes: '',
        company_code: '', // Will be set from session or user
    });

    // Filter sections to include only: Service, Import Buying and Selling, Main Stock, Delivery, Printing, Malibu, VAN Stock, Lorry
    const filteredSections = (sections || []).filter(s => {
        const name = s.name.toLowerCase();
        return name.includes('service') ||
            name.includes('vismass shop') ||
            // name.includes('main delivery') ||
            // name.includes('malibo shop') ||
            // name.includes('malibu') ||
            name.includes('main stock') ||
            name.includes('van') ||
            name.includes('lorry') ||
            // s.section_code === 'VIS-SEC-005' ||
            s.is_main_stock;
    });

    // Detect cross-company transfer to enable unit-conversion preview
    const fromSectionObj = (sections || []).find(s => s.section_code === data.from_section_code);
    const toSectionObj   = (sections || []).find(s => s.section_code === data.to_section_code);
    const isCrossCompany = !!(fromSectionObj && toSectionObj &&
        fromSectionObj.company_code && toSectionObj.company_code &&
        fromSectionObj.company_code !== toSectionObj.company_code);

    // From section options - exclude the one selected in TO
    const availableFromSections = (filteredSections || []).filter(section =>
        !data.to_section_code || section.section_code.trim() !== data.to_section_code.trim()
    );

    // To section options - exclude the one selected in FROM and enforce same company
    const availableToSections = (filteredSections || []).filter(section => {
        if (data.from_section_code && section.section_code.trim() === data.from_section_code.trim()) {
            return false;
        }
        
        if (fromSectionObj && fromSectionObj.company_code && section.company_code && fromSectionObj.company_code !== section.company_code) {
            return false;
        }
        
        return true;
    });

    // Set default from section to main stock if available
    useEffect(() => {
        if (filteredSections.length > 0 && !data.from_section_code) {
            const mainStock = filteredSections.find(s => s.is_main_stock);
            if (mainStock) {
                setData('from_section_code', mainStock.section_code);
            } else if (filteredSections[0]) {
                setData('from_section_code', filteredSections[0].section_code);
            }
        }
    }, [filteredSections]);

    // Ensure to_section_code is cleared if it matches from_section_code
    useEffect(() => {
        if (data.from_section_code && data.to_section_code === data.from_section_code) {
            setData('to_section_code', '');
        }
    }, [data.from_section_code, data.to_section_code]);

    const [transferDateDisplay, setTransferDateDisplay] = useState(
        formatDateForDisplay(data.transfer_date),
    );

    const [stocks, setStocks] = useState<{ [key: number]: number | null }>({});

    // Current Item State
    const [open, setOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<TransferItem>({ item_id: '', quantity: '', stock_id: '', cost_price: 0 });
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [currentBundleStock, setCurrentBundleStock] = useState<number | null>(null);
    const [currentNosStock, setCurrentNosStock] = useState<number | null>(null);
    const [currentBatches, setCurrentBatches] = useState<StockBatch[]>([]);
    const [currentStockLoading, setCurrentStockLoading] = useState(false);
    const [currentQuantityError, setCurrentQuantityError] = useState('');

    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    // search string for item picker; empty means show nothing until user types
    const [itemSearch, setItemSearch] = useState('');

    // Cache for item stock availability
    const [itemStockCache, setItemStockCache] = useState<{ [key: string]: number | string }>({});
    const [stockCheckingItems, setStockCheckingItems] = useState<Set<string>>(new Set());

    // Fetch stock for the CURRENT item being edited
    const fetchCurrentProductStock = async (itemId: string, sectionCode: string) => {
        if (!itemId || !sectionCode) {
            setCurrentStock(null);
            setCurrentBatches([]);
            return;
        }

        setCurrentStockLoading(true);
        try {
            const response = await fetch(`/stock-transfers/get-product-stock?item_id=${encodeURIComponent(itemId)}&section_code=${encodeURIComponent(sectionCode)}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const dataResponse = await response.json();
                setCurrentStock(dataResponse.stock);
                setCurrentBatches(dataResponse.batches || []);
                // conversion-aware totals may be returned by the backend
                if (dataResponse.bundle_stock !== undefined) {
                    setCurrentBundleStock(dataResponse.bundle_stock);
                    setCurrentNosStock(dataResponse.nos_stock ?? 0);
                } else {
                    setCurrentBundleStock(null);
                    setCurrentNosStock(null);
                }

                // If only one batch exists, auto-select it
                if (dataResponse.batches && dataResponse.batches.length === 1) {
                    const singleBatch = dataResponse.batches[0];
                    setCurrentItem(prev => ({ ...prev, stock_id: singleBatch.id.toString() }));
                }
            } else {
                setCurrentStock(null);
                setCurrentBatches([]);
            }
        } catch (error) {
            console.error('Error fetching stock:', error);
            setCurrentStock(null);
            setCurrentBatches([]);
        } finally {
            setCurrentStockLoading(false);
        }
    };

    // Validate quantity for the CURRENT item
    const validateCurrentQuantity = (quantity: string) => {
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            setCurrentQuantityError('');
            return;
        }

        let availableLimit = 0;
        let limitType = 'total';

        if (currentItem.stock_id && currentBatches.length > 0) {
            const selectedBatch = currentBatches.find(b => b.id.toString() === currentItem.stock_id);
            if (selectedBatch) {
                availableLimit = selectedBatch.quantity;
                limitType = 'batch';
            }
        } else {
            availableLimit = currentStock !== null ? currentStock! : 0;
        }

        if (qty > availableLimit) {
            const errorMsg = limitType === 'batch'
                ? `Cannot transfer more than batch stock (${availableLimit.toFixed(2)})`
                : `Cannot transfer more than available stock (${availableLimit.toFixed(2)})`;
            setCurrentQuantityError(errorMsg);
        } else {
            setCurrentQuantityError('');
        }
    };

    // Effect: Fetch stock when current item or from_section changes
    useEffect(() => {
        if (currentItem.item_id && data.from_section_code) {
            fetchCurrentProductStock(currentItem.item_id, data.from_section_code);
        } else {
            setCurrentStock(null);
            setCurrentBatches([]);
            setCurrentItem(prev => ({ ...prev, stock_id: '' }));
        }
    }, [currentItem.item_id, data.from_section_code]);

    // Effect: Validate quantity when quantity or batches/stock changes
    useEffect(() => {
        if (currentItem.quantity) {
            validateCurrentQuantity(currentItem.quantity);
        } else {
            setCurrentQuantityError('');
        }
    }, [currentItem.quantity, currentItem.stock_id, currentStock]);

    // Effect: Clear cache when source section changes
    useEffect(() => {
        setItemStockCache({});
        setStockCheckingItems(new Set());
    }, [data.from_section_code]);

    // Effect: Check stock for items matching search term
    // Function to check stock for a specific item
    const checkItemStock = async (itemId: string) => {
        if (!data.from_section_code || itemStockCache[itemId] !== undefined || stockCheckingItems.has(itemId)) {
            return;
        }

        setStockCheckingItems(prev => {
            const next = new Set(prev);
            next.add(itemId);
            return next;
        });

        try {
            // Use a direct path to bypass Ziggy route registration issues
            const url = `/stock-transfers/get-product-stock?item_id=${encodeURIComponent(itemId)}&section_code=${encodeURIComponent(data.from_section_code)}`;

            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const dataResponse = await response.json();
                setItemStockCache(prev => ({
                    ...prev,
                    [itemId]: dataResponse.stock ?? 0,
                }));
            } else {
                setItemStockCache(prev => ({
                    ...prev,
                    [itemId]: `ERR:${response.status}`,
                }));
            }
        } catch (error) {
            console.error('Error checking item stock:', error);
            setItemStockCache(prev => ({
                ...prev,
                [itemId]: 'ERR:FAIL',
            }));
        } finally {
            setStockCheckingItems(prev => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        }
    };

    // Use a timer for debouncing stock checks to avoid flooding the server
    useEffect(() => {
        if (!itemSearch.trim() || !data.from_section_code) {
            return;
        }

        const term = itemSearch.toLowerCase();
        const matchingItems = uniqueItems.filter((item) => {
            return item.ItemCode.toLowerCase().includes(term) ||
                item.ItmNm.toLowerCase().includes(term) ||
                (item.barcode || '').toLowerCase().includes(term);
        });

        if (matchingItems.length > 0) {
            const timer = setTimeout(() => {
                matchingItems.slice(0, 30).forEach(item => {
                    checkItemStock(item.ItmKy.toString());
                });
            }, 300); // 300ms debounce
            
            return () => clearTimeout(timer);
        }
    }, [itemSearch, data.from_section_code, uniqueItems]);

    const updateCurrentItem = (field: keyof TransferItem, value: string) => {
        setCurrentItem(prev => ({ ...prev, [field]: value }));
    };

    const handleAddItem = () => {
        if (!currentItem.item_id) return;

        const qty = parseFloat(currentItem.quantity);
        if (isNaN(qty) || qty <= 0) return;

        if (currentQuantityError) return;

        // Force batch selection if batches exist
        if (currentBatches.length > 0 && !currentItem.stock_id) {
            Swal.fire({
                title: t('Missing Batch Selection'),
                text: t('Please select a batch for this item.'),
                icon: 'warning',
                confirmButtonColor: '#3B82F6',
            });
            return;
        }

        // Create item with batch info
        const selectedBatch = currentBatches.find(b => b.id.toString() === currentItem.stock_id);
        const itemToAdd: TransferItem = {
            ...currentItem,
            batch_no: selectedBatch?.batch_no || 'N/A',
            cost_price: selectedBatch?.cost_price || 0
        };

        // Add to main list
        const newItemsList = [...data.items, itemToAdd];
        setData('items', newItemsList);

        // Save stock snapshot for summary
        setStocks(prev => ({ ...prev, [newItemsList.length - 1]: currentStock }));

        // Reset
        setCurrentItem({ item_id: '', quantity: '', stock_id: '', cost_price: 0 });
        setCurrentQuantityError('');

        // Focus back to Item Select
        setTimeout(() => {
            const itemTrigger = document.getElementById('item-select-trigger');
            if (itemTrigger) itemTrigger.focus();
        }, 100);
    };

    const removeItem = (index: number) => {
        const newItems = data.items.filter((_, i) => i !== index);
        setData('items', newItems);

        // Rebuild stocks map
        setStocks(prev => {
            const newStocks: { [key: number]: number | null } = {};
            let newIndex = 0;
            for (let i = 0; i < data.items.length; i++) {
                if (i !== index) {
                    newStocks[newIndex] = prev[i] || null;
                    newIndex++;
                }
            }
            return newStocks;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validItems = data.items.filter(i => i.item_id && parseFloat(i.quantity) > 0);

        if (validItems.length === 0) {
            Swal.fire({
                title: t('No Items'),
                text: t('Please add at least one item to the transfer list.'),
                icon: 'warning',
                confirmButtonColor: '#3B82F6',
            });
            return;
        }

        const result = await Swal.fire({
            title: t('Are you sure you want to complete this transfer?'),
            text: t('This will seal the confirmation.'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: t('Yes, complete transfer'),
            cancelButtonText: t('Cancel'),
            confirmButtonColor: '#3B82F6',
            cancelButtonColor: '#6B7280',
        });

        if (result.isConfirmed) {
            post('/stock-transfers', {
                onSuccess: (page: any) => {
                    const props = page?.props || {};
                    const flash = props.flash || {};

                    // Reset form
                    setData({
                        from_section_code: data.from_section_code,
                        to_section_code: '',
                        items: [],
                        transfer_date: new Date().toISOString().split('T')[0],
                        notes: '',
                        company_code: '',
                    });
                    setStocks({});
                    setCurrentBatches([]);

                    if (flash.transfer_id) {
                        const downloadUrl = `/stock-transfers/${flash.transfer_id}/download-pdf`;

                        // Method 1: Auto-download via iframe (most robust for files)
                        const iframe = document.createElement('iframe');
                        iframe.style.display = 'none';
                        iframe.src = downloadUrl;
                        document.body.appendChild(iframe);

                        // Cleanup iframe after a delay
                        setTimeout(() => {
                            document.body.removeChild(iframe);
                        }, 5000);

                        // Method 2: Show success with manual fallback
                        Swal.fire({
                            title: t('Transfer Successful'),
                            text: t('Stock has been transferred and the report is downloading.'),
                            icon: 'success',
                            confirmButtonColor: '#3B82F6',
                            confirmButtonText: t('OK'),
                            footer: `<a href="${downloadUrl}" target="_blank" style="color: #3B82F6; text-decoration: underline;">${t('Click here if download did not start')}</a>`
                        });
                    } else if (!flash.success) {
                        // Fallback success message
                        Swal.fire(t('Success'), t('Stock transferred successfully'), 'success');
                    }
                },
                onError: (errors) => {
                    console.error('Transfer failed', errors);
                    Swal.fire(t('Error'), t('Failed to transfer stock. Please check the form.'), 'error');
                }
            });
        }
    };

    const handleDownloadPdf = async () => {
        const validItems = data.items.filter(item => item.item_id && parseFloat(item.quantity) > 0);
        if (validItems.length === 0) {
            alert(t('Please add at least one item to the transfer'));
            return;
        }

        setDownloadingPdf(true);
        try {
            const response = await fetch('/stock-transfers/download-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    from_section_code: data.from_section_code,
                    to_section_code: data.to_section_code,
                    items: validItems,
                    transfer_date: data.transfer_date,
                    notes: data.notes,
                }),
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate PDF');
            }

            if (response.status === 419) {
                alert(t('Your session has expired. The page will reload.'));
                window.location.reload();
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to download PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock-transfer-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            // Type assertion for error object to access message safely
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert(t('Failed to download PDF') + ': ' + errorMessage);
        } finally {
            setDownloadingPdf(false);
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Stock Transfers', href: '/stock-transfers' },
            { title: 'Create Stock Transfer', href: '/stock-transfers/create' }
        ]}>
            <Head title={t('Stock Transfer')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-3 sm:py-4">
                            <div className="flex min-w-0 items-center space-x-3">
                                <Link
                                    href="/stock-transfers"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold text-white sm:text-xl">
                                        {t('Create Stock Transfer')}
                                    </h1>
                                    <p className="text-xs text-white/80 sm:truncate">
                                        Transfer stock between sections in your distribution network
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
                        {/* Action Buttons */}
                        <div className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setData({
                                            from_section_code: '',
                                            to_section_code: '',
                                            items: [],
                                            transfer_date: new Date().toISOString().split('T')[0],
                                            notes: '',
                                            company_code: '',
                                        });
                                        setStocks({});
                                        setCurrentBatches([]);
                                        setCurrentItem({ item_id: '', quantity: '', stock_id: '', cost_price: 0 });
                                        setCurrentStock(null);
                                        setCurrentBundleStock(null);
                                        setCurrentNosStock(null);
                                        setTransferDateDisplay(formatDateForDisplay(new Date().toISOString().split('T')[0]));
                                    }}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none sm:w-auto"
                                >
                                    <X className="w-4 h-4 inline mr-2" />
                                    {t('Clear Form')}
                                </button>
                            </div>
                        </div>

                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
                            {/* Transfer Sections */}
                            <div className="space-y-6">
                                <div className="mb-6 flex items-center space-x-3">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Building2 className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{t('Transfer Sections')}</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8">
                                    <div className="space-y-2">
                                        <Label htmlFor="from_section_code" className="text-sm font-medium text-slate-700 flex items-center">
                                            <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('From Section')} *
                                        </Label>
                                        <Select
                                            value={data.from_section_code}
                                            onValueChange={(value) => {
                                                setData('from_section_code', value);
                                                setItemStockCache({}); // Clear stale stock levels
                                            }}
                                        >
                                            <SelectTrigger className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20">
                                                <SelectValue placeholder={t('Select from section')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableFromSections.map((section) => (
                                                    <SelectItem key={section.id} value={section.section_code}>
                                                        {section.name} {section.is_main_stock ? '(Main Stock)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.from_section_code && <p className="text-sm text-red-600">{errors.from_section_code}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="to_section_code" className="text-sm font-medium text-slate-700 flex items-center">
                                            <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('To Section')} *
                                        </Label>
                                        <Select
                                            value={data.to_section_code}
                                            onValueChange={(value) => setData('to_section_code', value)}
                                        >
                                            <SelectTrigger className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20">
                                                <SelectValue placeholder={t('Select to section')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableToSections.map((section) => (
                                                    <SelectItem key={section.id} value={section.section_code}>
                                                        {section.name} {section.is_main_stock ? '(Main Stock)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.to_section_code && <p className="text-sm text-red-600">{errors.to_section_code}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Items to Transfer Section (Single Item Add Form) */}
                            <div className="space-y-6">
                                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <Package className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{t('Add Item to Transfer')}</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Optional help text */}
                                    </div>
                                </div>

                                <div className="relative grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4 md:grid-cols-5">
                                    {/* Item Selection */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-sm font-medium text-slate-700">
                                            {t('Item Name')}
                                        </Label>
                                        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setItemSearch(''); }}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between font-normal border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                                    id="item-select-trigger"
                                                >
                                                    {currentItem.item_id 
                                                        ? uniqueItems.find((item) => item.ItmKy.toString() === currentItem.item_id)?.ItemCode + " - " + uniqueItems.find((item) => item.ItmKy.toString() === currentItem.item_id)?.ItmNm
                                                        : t('Select item')}
                                                    <ChevronsUpDown className="ml-2 h-4 w-14 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-[300px]" align="start">
                                                <Command>
                                                    <CommandInput
                                                    placeholder={t('Search item by code, name, or barcode...')}
                                                    value={itemSearch}
                                                    onValueChange={(value) => setItemSearch(value)}
                                                />
                                                    <CommandList>
                                                        <CommandEmpty>{t('No item found.')}</CommandEmpty>
                                                        <CommandGroup>
                                                            {itemSearch.trim() === '' ? null : uniqueItems
                                                            .filter((item) => {
                                                                const term = itemSearch.toLowerCase();
                                                                const matchesSearch = item.ItemCode.toLowerCase().includes(term)
                                                                    || item.ItmNm.toLowerCase().includes(term)
                                                                    || (item.barcode || '').toLowerCase().includes(term);
                                                                
                                                                // Exclude printers (ItemCode starting with PRN)
                                                                const isNotPrinter = !item.ItemCode.startsWith('PRN');
                                                                
                                                                return matchesSearch && isNotPrinter;
                                                            })
                                                                    .map((item) => (
                                                                <CommandItem
                                                                    key={item.ItmKy}
                                                                    value={`${item.ItemCode} ${item.ItmNm} ${item.barcode || ''}`}
                                                                    onSelect={() => {
                                                                        updateCurrentItem('item_id', item.ItmKy.toString());
                                                                        setItemSearch('');
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            currentItem.item_id === item.ItmKy.toString() ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{item.ItmNm}</span>
                                                                        <span className="text-xs text-slate-500">{item.ItemCode} {item.barcode ? ` - ${item.barcode}` : ''}</span>
                                                                    </div>
                                                                    <span className="ml-auto text-xs font-semibold px-2">
                                                                        {stockCheckingItems.has(item.ItmKy.toString()) 
                                                                             ? <span className="text-slate-400">...</span>
                                                                             : itemStockCache[item.ItmKy.toString()] !== undefined 
                                                                                 ? String(itemStockCache[item.ItmKy.toString()]).startsWith('ERR:')
                                                                                     ? <span className="text-red-500">{itemStockCache[item.ItmKy.toString()]}</span>
                                                                                     : <span className="text-green-600">Qty: {Number(itemStockCache[item.ItmKy.toString()]).toFixed(2)}</span> 
                                                                                 : ''
                                                                         }
                                                                     </span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Batch Selection */}
                                    <div className="space-y-2 md:col-span-1">
                                        <Label className="text-sm font-medium text-slate-700">
                                            {t('Source Batch')}
                                        </Label>
                                        <Select
                                            value={currentItem.stock_id || ''}
                                            onValueChange={(value) => updateCurrentItem('stock_id', value)}
                                            disabled={!currentItem.item_id || !currentBatches || currentBatches.length === 0}
                                        >
                                            <SelectTrigger
                                                className="w-full border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 disabled:bg-slate-100 disabled:text-slate-400"
                                            >
                                                <SelectValue placeholder={
                                                    currentStockLoading
                                                        ? t('Loading batches...')
                                                        : (!currentBatches || currentBatches.length === 0)
                                                            ? t('No Batches Available')
                                                            : t('Select Batch')
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(currentBatches || [])
                                                    .filter(batch => {
                                                        // Filter out batches that are already in the list for this item
                                                        return !data.items.some(
                                                            addedItem => addedItem.item_id === currentItem.item_id && addedItem.stock_id === batch.id.toString()
                                                        );
                                                    })
                                                    .map((batch) => (
                                                        <SelectItem key={batch.id} value={batch.id.toString()}>
                                                            <div className="flex flex-col text-xs">
                                                                <span className="font-medium text-slate-900">
                                                                    {batch.batch_no || 'No Batch No'}  
                                                                </span>
                                                                <span className="text-slate-500">
                                                                    Qty: <span className="font-semibold text-green-600">{batch.quantity.toFixed(2)}</span> 
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        {/* Stock Availability Helpers */}
                                        {currentItem.stock_id && (
                                            <div className="text-xs text-slate-500 flex justify-between px-1">
                                                <span>{t('Available:')}</span>
                                                <span className="font-semibold text-vismass-blue">
                                                    {currentBatches.find(b => b.id.toString() === currentItem.stock_id)?.quantity.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                        )}
                                        {!currentItem.stock_id && currentStock !== null && (
                                            <div className="text-xs text-slate-500 px-1 space-y-1">
                                                {/* When a conversion-aware response is present we show a breakdown */}
                                                {currentBundleStock !== null ? (
                                                    <>
                                                        <div className="flex justify-between">
                                                            <span>{t('Bundle Stock:')}</span>
                                                            <span className="font-semibold text-vismass-blue">
                                                                {currentBundleStock.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>{t('Nos Stock:')}</span>
                                                            <span className="font-semibold text-vismass-blue">
                                                                {currentNosStock?.toFixed(2) ?? '0.00'}
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex justify-between">
                                                        <span>{t('Total Stock:')}</span>
                                                        <span className="font-semibold text-vismass-blue">
                                                            {currentStock.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quantity and Add Button */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-sm font-medium text-slate-700">
                                            {t('Quantity')}
                                        </Label>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <div className="w-full">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={currentItem.quantity}
                                                    onChange={(e) => updateCurrentItem('quantity', e.target.value)}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddItem();
                                                        }
                                                    }}
                                                    placeholder="e.g., 6"
                                                    className={`border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 ${currentQuantityError ? 'border-red-500 focus:border-red-500' : ''}`}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={handleAddItem}
                                                disabled={
                                                    !currentItem.item_id ||
                                                    !currentItem.quantity ||
                                                    currentQuantityError !== '' ||
                                                    (currentBatches.length > 0 && !currentItem.stock_id)
                                                }
                                                className="w-full whitespace-nowrap bg-vismass-blue text-white shadow-sm hover:bg-vismass-blue/90 sm:w-auto"
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                {t('Add')}
                                            </Button>
                                        </div>
                                        {currentQuantityError && <p className="text-sm text-red-600 mt-1">{currentQuantityError}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Transfer Summary Table (The "Cart") */}
                            {data.items.some(item => item.item_id) && (
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <Package className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Transfer Summary')}</h2>
                                    </div>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm sm:p-4">
                                        <table className="w-full min-w-[820px] border-collapse rounded-lg border border-slate-300 bg-white shadow-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="border border-slate-300 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                                        {t('Item Name')}
                                                    </th>
                                                    <th className="border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                                                        {t('Batch No')}
                                                    </th>
                                                    <th className="border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                                                        {t('Current Stock')}
                                                    </th>
                                                    <th className="border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                                                        {t('Quantity')}
                                                    </th>

                                                    <th className="border border-slate-300 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                                        {t('Cost Price (Rs.)')}
                                                    </th>
                                                    <th className="border border-slate-300 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                                        {t('Total (Rs.)')}
                                                    </th>
                                                    <th className="border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 w-20">
                                                        {t('Action')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.items
                                                    .map((item, index) => {
                                                        const selectedItem = uniqueItems.find(i => i.ItmKy.toString() === item.item_id);
                                                        const quantity = parseFloat(item.quantity) || 0;
                                                        const costPrice = item.cost_price || (selectedItem?.cost_price ? Number(selectedItem.cost_price) : 0);
                                                        const total = quantity * costPrice;
                                                        const currentStockVal = stocks[index];

                                                        return (
                                                            <tr key={index} className="hover:bg-slate-50">
                                                                <td className="border border-slate-300 px-4 py-3 text-sm text-slate-900">
                                                                    {selectedItem ? `${selectedItem.ItemCode} - ${selectedItem.ItmNm}` : ''}
                                                                </td>
                                                                <td className="border border-slate-300 px-4 py-3 text-center text-sm text-slate-900">
                                                                    {item.batch_no || '-'}
                                                                </td>
                                                                <td className="border border-slate-300 px-4 py-3 text-center text-sm text-slate-900">
                                                                    {currentStockVal !== null && currentStockVal !== undefined ? currentStockVal.toFixed(2) : '-'}
                                                                </td>
                                                                <td className="border border-slate-300 px-4 py-3 text-center text-sm text-slate-900">
                                                                    {quantity.toFixed(2)}
                                                                </td>

                                                                <td className="border border-slate-300 px-4 py-3 text-right text-sm text-slate-900">
                                                                    {costPrice.toFixed(2)}
                                                                </td>
                                                                <td className="border border-slate-300 px-4 py-3 text-right text-sm font-semibold text-slate-900">
                                                                    {total.toFixed(2)}
                                                                </td>
                                                                <td className="border border-slate-300 px-4 py-3 text-center">
                                                                    <Button
                                                                        type="button"
                                                                        onClick={() => removeItem(index)}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                {/* Grand Total Row */}
                                                <tr className="bg-vismass-blue/10 border-t-2 border-vismass-blue/20">
                                                    <td colSpan={5} className="border border-slate-300 px-4 py-3 text-right text-sm font-bold text-vismass-blue">
                                                        {t('Grand Total')}
                                                    </td>
                                                    <td className="border border-slate-300 px-4 py-3 text-right text-sm font-bold text-vismass-blue">
                                                        Rs. {data.items
                                                            .reduce((sum, item) => {
                                                                const selectedItem = uniqueItems.find(i => i.ItmKy.toString() === item.item_id);
                                                                const quantity = parseFloat(item.quantity) || 0;
                                                                const costPrice = item.cost_price || (selectedItem?.cost_price ? Number(selectedItem.cost_price) : 0);
                                                                return sum + (quantity * costPrice);
                                                            }, 0)
                                                            .toFixed(2)}
                                                    </td>
                                                    <td className="border border-slate-300 px-4 py-3"></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* PDF Download Section - Prominent */}
                            {data.items.some(item => item.item_id && parseFloat(item.quantity) > 0) && data.from_section_code && data.to_section_code && (
                                <div className="mb-8 mt-8">
                                    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-lg sm:p-6">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-start space-x-3 sm:items-center sm:space-x-4">
                                                <div className="p-3 bg-amber-100 rounded-full">
                                                    <Download className="w-6 h-6 text-amber-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-amber-800">{t('Preview Draft Report')}</h3>
                                                    <p className="text-sm text-amber-700">{t('Preview the transfer details before saving. The official report with Transaction No. will be generated upon completion.')}</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={handleDownloadPdf}
                                                disabled={downloadingPdf}
                                                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-medium text-white shadow-lg shadow-amber-500/25 transition-all duration-200 hover:from-amber-600 hover:to-amber-700 hover:shadow-amber-500/40 sm:w-auto"
                                            >
                                                {downloadingPdf ? (
                                                    <div className="flex items-center space-x-2">
                                                        <Loader className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        <span className="whitespace-nowrap">{t('Generating Preview...')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <Download className="w-5 h-5" />
                                                        <span>{t('Preview Draft')}</span>
                                                    </div>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Transfer Details Section */}
                            <div className="space-y-6">
                                <div className="mb-6 flex items-center space-x-3">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Calendar className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{t('Transfer Details')}</h2>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="transfer_date" className="text-sm font-medium text-slate-700 flex items-center">
                                        <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                        {t('Transfer Date')} *
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            id="transfer_date"
                                            type="text"
                                            value={transferDateDisplay}
                                            onChange={(e) => {
                                                setTransferDateDisplay(e.target.value);
                                                setData('transfer_date', parseDateFromDisplay(e.target.value));
                                            }}
                                            className="pl-10 border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                            placeholder="DD/MM/YYYY"
                                        />
                                    </div>
                                    {errors.transfer_date && <p className="text-sm text-red-600">{errors.transfer_date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-medium text-slate-700 flex items-center">
                                        <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                        {t('Notes (Optional)')}
                                    </Label>
                                    <Input
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder={t('Additional notes')}
                                        className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                    />
                                </div>
                            </div>
                            {/* Submit Button */}
                            <div className="flex justify-end border-t border-slate-200 pt-6">
                                <Button
                                    type="submit"
                                    disabled={processing || data.items.length === 0}
                                    className="w-full rounded-xl bg-vismass-blue px-8 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:bg-vismass-blue/90 sm:w-auto"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Transferring...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Truck className="w-5 h-5" />
                                            <span>{t('Transfer Stock')}</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-slate-600">
                        <p className="text-sm">Manage your inventory • Transfer stock efficiently</p>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
