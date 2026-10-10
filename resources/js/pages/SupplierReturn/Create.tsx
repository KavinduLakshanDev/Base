import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    PackageX,
    Search,
    X,
    Plus,
    Trash2,
    Save,
    RotateCcw,
    Calendar,
    Layers,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Supplier Returns'),
        href: '/supplier-returns',
    },
    {
        title: t('New Return'),
        href: '#',
    },
];

interface Section {
    id: number;
    name: string;
    section_code: string;
}

interface Supplier {
    id: number;
    code: string;
    name: string;
    phone: string;
}

interface Invoice {
    purchase_key: number;
    invoice_no: string;
    purchase_no: number;
    date: string;
}

interface Item {
    ItemPriceKey: string;
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    batch_no: string;
    CosPri: number;
    DiscountRate: number;
    NewCostPrice: number;
    stock_quantity: number;
    Qty?: number;
}

interface Printer {
    PerchaseDetKy: string;
    iTimKy: string;
    item_name: string;
    serial_number: string;
    batch_no: string;
    brand: string;
    model: string;
    warranty: string;
    CosPri: number;
    DiscountRate: number;
    NewCostPrice: number;
    stock_quantity: number;
    Qty?: number;
}

interface ReturnItem {
    key: string;
    item_master_key?: string;
    supplier_invoice_no?: string;
    batch_no?: string;
    quantity: string;
    return_value: string;
}

interface FormData {
    item_type: 'product' | 'printer';
    items: ReturnItem[];
    supplier_code: string;
    supplier_id: string;
    reason: string;
    return_date: string;
    notes: string;
    status: string;
    section_id: string;
}

interface Props {
    sections: Section[];
    userSection?: Section | null;
}

export default function SupplierReturnCreate({ sections, userSection }: Props) {
    const { data, setData, processing, errors, reset } = useForm<FormData>({
        item_type: 'product',
        items: [{ key: '', quantity: '1', return_value: '0.00', supplier_invoice_no: '' }],
        supplier_code: '',
        supplier_id: '',
        reason: '',
        return_date: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'approved',
        section_id: userSection ? userSection.id.toString() : '',
    });

    const [supplierSearch, setSupplierSearch] = useState('');
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierLoading, setSupplierLoading] = useState(false);

    const [itemSearchTerms, setItemSearchTerms] = useState<{ [key: number]: string }>({});
    const [itemSearchResults, setItemSearchResults] = useState<{ [key: number]: (Item | Printer)[] }>({});
    const [itemShowDropdowns, setItemShowDropdowns] = useState<{ [key: number]: boolean }>({});
    const [selectedItems, setSelectedItems] = useState<{ [key: number]: Item | Printer | null }>({});
    const [itemSearchLoading, setItemSearchLoading] = useState<{ [key: number]: boolean }>({});

    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    const supplierSearchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const invoiceSearchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const itemSearchTimeoutRefs = useRef<{ [key: number]: NodeJS.Timeout }>({});

    // Search suppliers
    const handleSupplierSearch = async (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 1) {
            setSuppliers([]);
            setShowSupplierDropdown(false);
            return;
        }

        setSupplierLoading(true);
        setShowSupplierDropdown(true);
        try {
            const response = await fetch(`/supplier-returns/search-suppliers?term=${encodeURIComponent(searchTerm)}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (response.ok) {
                const results = await response.json();
                setSuppliers(results);
                if (results.length > 0) {
                    setShowSupplierDropdown(true);
                }
            }
        } catch (error) {
            console.error('Error searching suppliers:', error);
        } finally {
            setSupplierLoading(false);
        }
    };

    const handleSupplierSearchChange = (value: string) => {
        setSupplierSearch(value);
        setShowSupplierDropdown(true);

        if (supplierSearchTimeout.current) {
            clearTimeout(supplierSearchTimeout.current);
        }

        supplierSearchTimeout.current = setTimeout(() => {
            handleSupplierSearch(value);
        }, 300);
    };

    const selectSupplier = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setData('supplier_code', supplier.code);
        setData('supplier_id', supplier.id.toString());
        setSupplierSearch(`${supplier.name} (${supplier.code})`);
        setShowSupplierDropdown(false);

        // Reset all item and invoice search results when supplier changes
        setItemSearchTerms({});
        setItemSearchResults({});
        setSelectedItems({});
        setItemShowDropdowns({});
        setInvoiceSearch('');
        setInvoices([]);
        setSelectedInvoice(null);
        setData('items', [{ key: '', quantity: '1', return_value: '0.00', supplier_invoice_no: '' }]);
    };

    // Search invoices
    const handleInvoiceSearch = async (searchTerm: string) => {
        if (!data.supplier_id) return;

        setInvoiceLoading(true);
        setShowInvoiceDropdown(true);
        try {
            const response = await fetch(`/supplier-returns/search-invoices?term=${encodeURIComponent(searchTerm)}&supplier_code=${data.supplier_code}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (response.ok) {
                const results = await response.json();
                setInvoices(results);
            }
        } catch (error) {
            console.error('Error searching invoices:', error);
        } finally {
            setInvoiceLoading(false);
        }
    };

    const handleInvoiceSearchChange = (value: string) => {
        setInvoiceSearch(value);
        setShowInvoiceDropdown(true);

        if (invoiceSearchTimeout.current) {
            clearTimeout(invoiceSearchTimeout.current);
        }

        invoiceSearchTimeout.current = setTimeout(() => {
            handleInvoiceSearch(value);
        }, 300);
    };

    const selectInvoice = async (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setInvoiceSearch(`${invoice.invoice_no} (${invoice.date})`);
        setShowInvoiceDropdown(false);

        // Fetch items for this invoice
        setItemSearchLoading(prev => ({ ...prev, [0]: true }));
        try {
            const response = await fetch(
                `/supplier-returns/get-invoice-items?purchase_key=${invoice.purchase_key}&item_type=${data.item_type}&section_id=${data.section_id}`,
                { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
            );

            if (response.ok) {
                const items = await response.json();
                if (items.length > 0) {
                    const mappedItems = items.map((item: any) => {
                        const key = 'ItemPriceKey' in item ? item.ItemPriceKey : item.PerchaseDetKy;
                        const itemMasterKey = 'ItmKy' in item ? item.ItmKy : undefined;

                        return {
                            key: key,
                            item_master_key: itemMasterKey,
                            batch_no: item.batch_no || '',
                            supplier_invoice_no: invoice.invoice_no,
                            quantity: '1',
                            return_value: Number(item.NewCostPrice || item.CosPri || 0).toFixed(2),
                        };
                    });

                    setData('items', mappedItems);

                    // Update search terms and selected items state for each row
                    const newSearchTerms: { [key: number]: string } = {};
                    const newSelectedItems: { [key: number]: Item | Printer } = {};

                    items.forEach((item: any, idx: number) => {
                        const displayText = 'ItemCode' in item
                            ? `${item.ItemCode} - ${item.ItmNm}${item.batch_no ? ' [' + item.batch_no + ']' : ''}`
                            : `${item.serial_number} - ${item.item_name}`;
                        newSearchTerms[idx] = displayText;
                        newSelectedItems[idx] = item;
                    });

                    setItemSearchTerms(newSearchTerms);
                    setSelectedItems(newSelectedItems);
                } else {
                    alert(t('No items with stock found in this invoice'));
                    setData('items', [{ key: '', quantity: '1', return_value: '0.00', supplier_invoice_no: '' }]);
                }
            }
        } catch (error) {
            console.error('Error fetching invoice items:', error);
        } finally {
            setItemSearchLoading(prev => ({ ...prev, [0]: false }));
        }
    };

    // Search items/printers
    const handleItemSearch = async (searchTerm: string, index: number) => {
        if (!data.supplier_id) {
            alert(t('Please select a supplier first'));
            return;
        }

        if (!data.section_id) {
            alert(t('Please select a section first'));
            return;
        }

        setItemSearchLoading(prev => ({ ...prev, [index]: true }));
        try {
            const endpoint = data.item_type === 'product' ? 'search-items' : 'search-printers';
            const response = await fetch(
                `/supplier-returns/${endpoint}?term=${encodeURIComponent(searchTerm)}&supplier_id=${data.supplier_id}&section_id=${data.section_id}`,
                { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
            );

            if (response.ok) {
                const results = await response.json();
                setItemSearchResults(prev => ({ ...prev, [index]: results }));
                // Automatically show dropdown when results arrive
                if (results.length > 0) {
                    setItemShowDropdowns(prev => ({ ...prev, [index]: true }));
                }
            }
        } catch (error) {
            console.error('Error searching:', error);
        } finally {
            setItemSearchLoading(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleItemSearchChange = (value: string, index: number) => {
        setItemSearchTerms(prev => ({ ...prev, [index]: value }));
        setItemShowDropdowns(prev => ({ ...prev, [index]: true }));

        if (itemSearchTimeoutRefs.current[index]) {
            clearTimeout(itemSearchTimeoutRefs.current[index]);
        }

        itemSearchTimeoutRefs.current[index] = setTimeout(() => {
            handleItemSearch(value, index);
        }, 300);
    };

    const selectItem = (item: Item | Printer, index: number) => {
        setSelectedItems(prev => ({ ...prev, [index]: item }));

        const key = 'ItemPriceKey' in item ? item.ItemPriceKey : item.PerchaseDetKy;
        const itemMasterKey = 'ItmKy' in item ? item.ItmKy : undefined;
        const batchNo = item.batch_no || '';
        const price = item.NewCostPrice || item.CosPri || 0;

        const newItems = [...data.items];
        const currentQty = parseFloat(newItems[index].quantity) || 0;
        const stockQty = parseFloat(item.stock_quantity.toString()) || 0;
        const validatedQty = currentQty > stockQty ? stockQty : currentQty;

        newItems[index] = {
            ...newItems[index],
            key: key,
            item_master_key: itemMasterKey,
            batch_no: batchNo,
            supplier_invoice_no: 'SuppInvNo' in item ? item.SuppInvNo as string : ('PurchaseNo' in item ? item.PurchaseNo as string : ''),
            return_value: Number(price).toFixed(2),
            quantity: validatedQty.toString(),
        };
        setData('items', newItems);

        const displayText = 'ItemCode' in item
            ? `${item.ItemCode} - ${item.ItmNm}`
            : `${item.serial_number} - ${item.item_name}`;

        setItemSearchTerms(prev => ({ ...prev, [index]: displayText }));
        setItemShowDropdowns(prev => ({ ...prev, [index]: false }));
    };

    const addItem = () => {
        setData('items', [...data.items, { key: '', quantity: '1', return_value: '0.00', supplier_invoice_no: '' }]);
    };

    const removeItem = (index: number) => {
        const newItems = data.items.filter((_, i) => i !== index);
        setData('items', newItems.length > 0 ? newItems : [{ key: '', quantity: '1', return_value: '0.00', supplier_invoice_no: '' }]);

        setItemSearchTerms(prev => {
            const newTerms = { ...prev };
            delete newTerms[index];
            return newTerms;
        });
        setItemSearchResults(prev => {
            const newResults = { ...prev };
            delete newResults[index];
            return newResults;
        });
        setSelectedItems(prev => {
            const newSelected = { ...prev };
            delete newSelected[index];
            return newSelected;
        });
        setItemShowDropdowns(prev => {
            const newShow = { ...prev };
            delete newShow[index];
            return newShow;
        });
    };

    const updateItem = (index: number, field: keyof ReturnItem, value: string) => {
        const newItems = [...data.items];

        // Add validation to prevent return quantity from exceeding available stock
        if (field === 'quantity') {
            const selectedItem = selectedItems[index];
            if (selectedItem && 'stock_quantity' in selectedItem) {
                const stockQty = parseFloat(selectedItem.stock_quantity.toString()) || 0;
                const inputQty = parseFloat(value) || 0;

                if (inputQty > stockQty) {
                    value = stockQty.toString();
                }
            }
        }

        newItems[index] = { ...newItems[index], [field]: value };
        setData('items', newItems);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.search-dropdown-container')) {
                setShowSupplierDropdown(false);
                setItemShowDropdowns({});
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.post('/supplier-returns', data as any, {
            onSuccess: () => {
                reset();
                router.visit('/supplier-returns');
            },
            onError: (errors) => {
                alert('Please check the form for errors: ' + JSON.stringify(errors));
            },
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        reset();
        setSupplierSearch('');
        setSuppliers([]);
        setSelectedSupplier(null);
        setItemSearchTerms({});
        setItemSearchResults({});
        setSelectedItems({});
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Supplier Return')} />

            <div className="min-h-screen bg-slate-50 pb-20">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/supplier-returns"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <RotateCcw className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Supplier Return')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Process returns for products and printers')}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-2.5 backdrop-blur-sm">
                                <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-0.5">{t('Refund Total')}</p>
                                <p className="text-lg font-bold text-white tabular-nums">
                                    <span className="text-xs mr-1 opacity-70">Rs</span>
                                    {data.items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.return_value) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Global Settings */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Section Selection */}
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Section')} *</label>
                                    <select
                                        value={data.section_id}
                                        onChange={(e) => setData('section_id', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 focus:border-vismass-blue h-[42px]"
                                        required
                                    >
                                        <option value="">{t('Select Section')}</option>
                                        {sections.map((section) => (
                                            <option key={section.id} value={section.id}>{section.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Item Type */}
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Return Type')} *</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg h-[42px]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData('item_type', 'product');
                                                setData('items', [{ key: '', quantity: '1', return_value: '0', supplier_invoice_no: '' }]);
                                                setSelectedItems({});
                                                setItemSearchTerms({});
                                            }}
                                            className={`flex-1 flex items-center justify-center rounded-md transition-all py-1 text-sm ${data.item_type === 'product' ? 'bg-white shadow text-vismass-blue font-bold' : 'text-slate-500'}`}
                                        >
                                            {t('Products')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData('item_type', 'printer');
                                                setData('items', [{ key: '', quantity: '1', return_value: '0', supplier_invoice_no: '' }]);
                                                setSelectedItems({});
                                                setItemSearchTerms({});
                                            }}
                                            className={`flex-1 flex items-center justify-center rounded-md transition-all py-1 text-sm ${data.item_type === 'printer' ? 'bg-white shadow text-vismass-blue font-bold' : 'text-slate-500'}`}
                                        >
                                            {t('Printers')}
                                        </button>
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Return Date')} *</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={data.return_date}
                                            onChange={(e) => setData('return_date', e.target.value)}
                                            className="w-full rounded-lg border-slate-200 focus:border-vismass-blue pl-10 h-[42px]"
                                            required
                                        />
                                        <Calendar className="absolute left-3 top-[13px] h-4 w-4 text-slate-400" />
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Reason')} *</label>
                                    <select
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        className="w-full rounded-lg border-slate-200 focus:border-vismass-blue h-[42px]"
                                        required
                                    >
                                        <option value="">{t('Select Reason')}</option>
                                        <option value="damaged">{t('Damaged')}</option>
                                        <option value="wrong_item">{t('Wrong Item')}</option>
                                        <option value="expired">{t('Expired')}</option>
                                        <option value="quality">{t('Quality')}</option>
                                        <option value="other">{t('Other')}</option>
                                    </select>
                                </div>

                                {/* Supplier Search */}
                                <div className="space-y-1 relative search-dropdown-container lg:col-span-2">
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Supplier')} *</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={supplierSearch}
                                            onChange={(e) => handleSupplierSearchChange(e.target.value)}
                                            onFocus={() => supplierSearch.length > 0 && setShowSupplierDropdown(true)}
                                            className="w-full rounded-lg border-slate-200 focus:border-vismass-blue pl-9 h-[42px] shadow-sm"
                                            placeholder={t('Search supplier...')}
                                            required={!data.supplier_id}
                                        />
                                        {selectedSupplier && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSupplier(null);
                                                    setData('supplier_id', '');
                                                    setSupplierSearch('');
                                                    setInvoiceSearch('');
                                                    setSelectedInvoice(null);
                                                    setData('items', [{ key: '', quantity: '1', return_value: '0', supplier_invoice_no: '' }]);
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    {showSupplierDropdown && suppliers.length > 0 && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-auto">
                                            {suppliers.map((supplier) => (
                                                <div
                                                    key={supplier.id}
                                                    onClick={() => selectSupplier(supplier)}
                                                    className="px-4 py-3 hover:bg-vismass-blue/5 cursor-pointer border-b border-slate-50 last:border-0 group"
                                                >
                                                    <div className="font-bold text-slate-900 group-hover:text-vismass-blue transition-colors">{supplier.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{supplier.code}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Invoice Search */}
                                <div className={`space-y-1 relative search-dropdown-container lg:col-span-2 ${!data.supplier_id ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <label className="text-sm font-semibold text-slate-700 block">{t('Invoice No')}</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={invoiceSearch}
                                            onChange={(e) => handleInvoiceSearchChange(e.target.value)}
                                            onFocus={() => data.supplier_id && setShowInvoiceDropdown(true)}
                                            className="w-full rounded-lg border-slate-200 focus:border-vismass-blue pl-9 h-[42px] shadow-sm"
                                            placeholder={t('Search invoice...')}
                                        />
                                        {selectedInvoice && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedInvoice(null);
                                                    setInvoiceSearch('');
                                                    setData('items', [{ key: '', quantity: '1', return_value: '0', supplier_invoice_no: '' }]);
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    {showInvoiceDropdown && invoices.length > 0 && (
                                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl max-h-80 overflow-auto">
                                            {invoices.map((invoice) => (
                                                <div
                                                    key={invoice.purchase_key}
                                                    onClick={() => selectInvoice(invoice)}
                                                    className="px-4 py-3 hover:bg-vismass-blue/5 cursor-pointer border-b border-slate-50 last:border-0 group"
                                                >
                                                    <div className="font-bold text-slate-900 group-hover:text-vismass-blue transition-colors">{invoice.invoice_no}</div>
                                                    <div className="text-xs text-slate-500">Date: {invoice.date} | GRN: {invoice.purchase_no}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Items Table Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between rounded-t-2xl">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center">
                                    <Layers className="w-4 h-4 mr-2 text-slate-400" />
                                    {data.item_type === 'printer' ? t('Printers for Return') : t('Products for Return')}
                                </h3>
                                <Button
                                    type="button"
                                    onClick={addItem}
                                    className="bg-vismass-blue hover:bg-vismass-blue/90 text-white font-bold h-9 px-4 rounded-lg text-xs"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('Add Row')}
                                </Button>
                            </div>

                            <div className="w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('Item Description')}</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('Batch / Serial')}</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-24">{t('Inv / Stock')}</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-32">{t('Return Qty')}</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right w-40">{t('Return Value (Rs)')}</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right w-40">{t('Total (Rs)')}</th>
                                            <th className="px-6 py-4 text-center border-b border-slate-100 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {data.items.map((item, index) => {
                                            const selectedItem = selectedItems[index];
                                            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.return_value) || 0);
                                            const unitCost = selectedItem ? selectedItem.CosPri : 0;
                                            const discountRate = selectedItem ? selectedItem.DiscountRate : 0;

                                            return (
                                                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="relative search-dropdown-container">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                                                <input
                                                                    type="text"
                                                                    value={itemSearchTerms[index] || ''}
                                                                    onChange={(e) => handleItemSearchChange(e.target.value, index)}
                                                                    onFocus={() => {
                                                                        if (data.supplier_id && data.section_id) {
                                                                            if (itemSearchResults[index]?.length > 0) {
                                                                                setItemShowDropdowns(prev => ({ ...prev, [index]: true }));
                                                                            } else {
                                                                                handleItemSearch(itemSearchTerms[index] || '', index);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="block w-full border-slate-300 rounded-lg pl-9 py-1.5 text-xs font-medium focus:border-vismass-blue focus:ring-vismass-blue/10 h-9"
                                                                    placeholder={t('Search item...')}
                                                                />
                                                            </div>
                                                            {itemShowDropdowns[index] && (
                                                                <div className="absolute z-50 w-[400px] mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1 max-h-60 overflow-y-auto">
                                                                    {itemSearchLoading[index] ? (
                                                                        <div className="p-6 text-center">
                                                                            <div className="w-5 h-5 border-2 border-vismass-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                                        </div>
                                                                    ) : itemSearchResults[index]?.map((resultItem: any) => (
                                                                        <button
                                                                            key={resultItem.ItemPriceKey || resultItem.PerchaseDetKy}
                                                                            type="button"
                                                                            onClick={() => selectItem(resultItem, index)}
                                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg transition-all border-b border-slate-50 last:border-0 group/btn"
                                                                        >
                                                                            <div className="text-[13px] font-bold text-slate-800">
                                                                                {'ItemCode' in resultItem ? `${resultItem.ItemCode} - ${resultItem.ItmNm}` : `${resultItem.serial_number} - ${resultItem.item_name}`}
                                                                            </div>
                                                                            <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-slate-400">
                                                                                <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">Stock: {resultItem.stock_quantity}</span>
                                                                                <span className="text-vismass-blue bg-vismass-blue/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">Cost: Rs. {resultItem.NewCostPrice || resultItem.CosPri}</span>
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 inline-block">
                                                            {item.batch_no || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex flex-col items-center">
                                                            {/* <span className="text-[10px] font-bold text-slate-400">
                                                                    {selectedItem && ('Qty' in selectedItem) ? selectedItem.Qty : '0.00'}
                                                                </span> */}
                                                            <span className={`text-[11px] font-bold ${selectedItem && ('stock_quantity' in selectedItem) && selectedItem.stock_quantity > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                {selectedItem && ('stock_quantity' in selectedItem) ? selectedItem.stock_quantity : '0.00'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="block w-full border-slate-300 rounded-lg text-center text-xs font-bold text-slate-800 h-9 focus:border-vismass-blue focus:ring-vismass-blue/10"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="space-y-1">
                                                            {unitCost > 0 && (
                                                                <div className="flex items-center justify-end gap-2 text-[9px] font-bold">
                                                                    <span className="text-slate-300 line-through">Rs {unitCost.toLocaleString()}</span>
                                                                    {discountRate > 0 && <span className="text-amber-600">-{discountRate}%</span>}
                                                                </div>
                                                            )}
                                                            <div className="relative">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">Rs</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={item.return_value}
                                                                    onChange={(e) => updateItem(index, 'return_value', e.target.value)}
                                                                    className="block w-full border-slate-300 rounded-lg pl-7 text-xs font-bold text-vismass-blue h-9 text-right focus:border-vismass-blue focus:ring-vismass-blue/10"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums text-sm">
                                                        {itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                            disabled={data.items.length === 1}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary Footer */}
                        <div className="bg-slate-50 border-t border-slate-200 p-6 sm:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                                <div className="w-full md:w-1/2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('Remarks')}</label>
                                    <textarea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        className="w-full rounded-lg border-slate-300 text-xs p-3 focus:ring-vismass-blue focus:border-vismass-blue resize-none h-20"
                                        placeholder={t('Internal return notes...')}
                                    />
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('Total Refund')}</p>
                                        <p className="text-3xl font-black text-slate-900 tabular-nums">
                                            <span className="text-sm mr-2 text-slate-300">Rs</span>
                                            {data.items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.return_value) || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            type="submit"
                                            disabled={processing || data.items.some(i => !i.key)}
                                            className="h-12 px-10 bg-vismass-blue hover:bg-vismass-blue/90 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
                                        >
                                            {processing ? (
                                                <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            {t('Save Return')}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                                        >
                                            {t('Reset Form')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </AppLayout>
    );
}
