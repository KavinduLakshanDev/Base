import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    Search, 
    Plus, 
    Trash2, 
    ShoppingCart, 
    Truck, 
    Store, 
    CreditCard, 
    Banknote,
    Receipt,
    AlertTriangle,
    ArrowLeft,
    Barcode,
    Package
} from 'lucide-react';
import DeliveryItemEntryForm from './components/DeliveryItemEntryForm';
import DeliveryBatchSelectionModal from './components/DeliveryBatchSelectionModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Landmark, CheckCircle2, Pencil, Save } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { calcTierDiscountForItem, calcUnitDiscount } from '../Sales/tierDiscount';

interface Section {
    id: number;
    name: string;
    section_code: string;
}

interface Shop {
    id: number;
    name: string;
    address: string;
    externalCustomer?: {
        AdrKy: number;
        AdrCd: string;
        FstNm: string;
    };
}

interface StockItem {
    itm_ky: number;
    item_code: string;
    item_name: string;
    barcode: string;
    batch_no: string | null;
    available_qty: number;
    unit_price: number;
    cost_price: number;
    unit: string;
    tier1_qty?: number | null;
    tier1_discount?: number | null;
    tier2_qty?: number | null;
    tier2_discount?: number | null;
    cred_tier1_qty?: number | null;
    cred_tier1_discount?: number | null;
    cred_tier2_qty?: number | null;
    cred_tier2_discount?: number | null;
    cus_discount_type?: string | null;
    cus_discount_rate?: number;
    discount_amount?: number;
}

interface SaleEditProps {
    delivery: any;
    sections: Section[];
    shops: Shop[];
    bankAccounts: any[];
    user: {
        id: number;
        delivery_section_code: string | null;
    };
}

export default function DeliverySaleEdit({ delivery, sections, shops, bankAccounts, user }: SaleEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Deliveries', href: route('delivery.index') },
        { title: 'Edit Direct Sale', href: '#' },
    ];

    const { flash } = usePage().props as any;

    const payment = delivery.payments && delivery.payments.length > 0 ? delivery.payments[0] : null;

    const { data, setData, put, processing, reset, errors } = useForm({
        section_code: delivery.section_code ? delivery.section_code : '',
        shop_id: delivery.shop_id ? delivery.shop_id.toString() : '',
        transaction_date: delivery.delivery_date ? delivery.delivery_date.split('T')[0] : '',
        items: delivery.items ? delivery.items.map((i: any) => ({
            itm_ky: i.ItmKy,
            item_code: i.itemMaster ? i.itemMaster.ItemCode : i.ItemCode,
            item_name: i.itemMaster ? i.itemMaster.ItmNm : i.ItemName,
            quantity: parseFloat(Number(i.quantity).toFixed(2)),
            unit_price: parseFloat(Number(i.unit_price).toFixed(2)),
            batch_no: i.batch_no,
            serial_number: i.serial_number || '',
            brand: i.brand || '',
            model: i.model || '',
            warranty: i.warranty || '',
            available_qty: 999,
            discount_amount: parseFloat(Number(i.discount_amount ?? 0).toFixed(4)),
        })) : [] as any[],
        payment_mode: payment ? payment.method : 'cash',
        cash_amount: payment ? payment.amount.toString() : '',
        bank_account_id: payment ? (payment.bank_account_id ? payment.bank_account_id.toString() : '') : '',
        reference_no: payment ? (payment.cheque_no || payment.reference_no || '') : '',
        bank_name: payment ? (payment.bank_name || '') : '',
        branch: payment ? (payment.branch || '') : '',
        cheque_date: payment && payment.cheque_date ? payment.cheque_date.split('T')[0] : '',
        discount_type: delivery.discount_type || 'fixed',
        discount_value: delivery.discount_value || '',
    });

    const subtotal = data.items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price - (item.discount_amount || 0)), 0);
    const discountAmount = data.discount_type === 'percentage' 
        ? (subtotal * (parseFloat(data.discount_value.toString()) || 0) / 100)
        : (parseFloat(data.discount_value.toString()) || 0);
    const totalAmount = Math.max(0, subtotal - discountAmount);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<StockItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [shopSearch, setShopSearch] = useState('');
    const [selectedShopIndex, setSelectedShopIndex] = useState(-1);
    const [itemInput, setItemInput] = useState({ code: '', name: '', price: 0, quantity: 1, barcode: '', serial_number: '' });
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchCandidates, setBatchCandidates] = useState<StockItem[]>([]);
    const [shopOutstanding, setShopOutstanding] = useState<{ outstanding: number; credit: boolean; delivery_count: number } | null>(null);
    const [entryMode, setEntryMode] = useState<'item' | 'printer'>('item');
    const [printerSearch, setPrinterSearch] = useState('');
    const [printers, setPrinters] = useState<any[]>([]);
    const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
    const [isPrinterSearching, setIsPrinterSearching] = useState(false);
    
    const itemCodeRef = useRef<HTMLInputElement>(null);
    const quantityRef = useRef<HTMLInputElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    
    const [isChequeDialogOpen, setIsChequeDialogOpen] = useState(false);
    const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
    const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
    
    const chequeNoRef = useRef<HTMLInputElement>(null);
    const chequeBankRef = useRef<HTMLInputElement>(null);
    const chequeBranchRef = useRef<HTMLInputElement>(null);
    const chequeOkButtonRef = useRef<HTMLButtonElement>(null);
    const cardOkButtonRef = useRef<HTMLButtonElement>(null);
    const bankRefRef = useRef<HTMLInputElement>(null);
    const bankOkButtonRef = useRef<HTMLButtonElement>(null);

    const handleBatchSelect = (batch: StockItem) => {
        setIsBatchModalOpen(false);
        setSelectedItem(batch);
        setItemInput(prev => ({ 
            ...prev, 
            name: batch.item_name, 
            code: batch.item_code, 
            price: batch.unit_price, 
            quantity: 1, 
            barcode: batch.barcode || '' 
        }));
        
        setTimeout(() => {
            if (quantityRef.current) {
                quantityRef.current.focus();
                quantityRef.current.select();
            }
        }, 100);
    };

    const handleSelectItem = (item: StockItem) => {
        setSelectedItem(item);
        setItemInput(prev => ({ ...prev, name: item.item_name, code: item.item_code, price: item.unit_price, quantity: 1, barcode: item.barcode || '' }));
    };

    const handleAddItem = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!selectedItem) return;
        addItem({...selectedItem, inputQuantity: itemInput.quantity});
        resetItemInput();
    };

    const resetItemInput = () => {
        setItemInput({ code: '', name: '', price: 0, quantity: 1, barcode: '', serial_number: '' });
        setSelectedItem(null);
        setSearchTerm('');
    };

    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredShops = useMemo(() => shops.filter((shop) =>
        shop.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
        shop.address?.toLowerCase().includes(shopSearch.toLowerCase()) ||
        shop.externalCustomer?.FstNm?.toLowerCase().includes(shopSearch.toLowerCase())
    ), [shops, shopSearch]);

    useEffect(() => {
        if (shopSearch && selectedShopIndex >= 0) {
            const el = document.getElementById(`shop-item-${selectedShopIndex}`);
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedShopIndex, shopSearch]);

    // Filter products based on selected section
    useEffect(() => {
        if (data.section_code && searchTerm.length > 1) {
            const delayDebounceFn = setTimeout(() => {
                searchProducts();
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, data.section_code]);

    // Handle auto-print after successful sale
    useEffect(() => {
        if (flash?.delivery_id) {
            printUrl(`/deliveries/${flash.delivery_id}/receipt`);
        }
    }, [flash?.delivery_id]);

    // Fetch shop outstanding when shop is selected
    useEffect(() => {
        if (data.shop_id) {
            axios.get(route('delivery.delivery-sales.shop-outstanding', data.shop_id))
                .then(res => setShopOutstanding(res.data))
                .catch(() => setShopOutstanding(null));
        } else {
            setShopOutstanding(null);
        }
    }, [data.shop_id]);

    const searchProducts = async () => {
        setIsSearching(true);
        try {
            const response = await axios.get(route('delivery.delivery-sales.search-products'), {
                params: {
                    section_code: data.section_code,
                    search: searchTerm
                }
            });
            const filtered = response.data.filter((item: StockItem) => item.available_qty > 0);
            setSearchResults(filtered);
            if (filtered.length > 0) {
                setIsDropdownOpen(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to search products');
        } finally {
            setIsSearching(false);
        }
    };

    const searchPrinters = async (query: string) => {
        if (!query) {
            setPrinters([]);
            return;
        }
        setIsPrinterDialogOpen(true);
        setIsPrinterSearching(true);
        try {
            const response = await axios.get(route('delivery.delivery-sales.search-printers'), {
                params: {
                    section_code: data.section_code,
                    search: query
                }
            });
            setPrinters(response.data);
            if (response.data.length === 0) {
                toast.info('No printers found');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to search printers');
        } finally {
            setIsPrinterSearching(false);
        }
    };

    const addPrinter = (printer: any) => {
        const existing = data.items.find((i: any) => i.serial_number && i.serial_number === printer.serial_number);
        if (existing) {
            toast.error('This printer is already in the cart');
            return;
        }

        let discountAmount = calcTierDiscountForItem(printer, 1, printer.unit_price, data.payment_mode);
        if (discountAmount === 0 && printer.cus_discount_rate) {
            discountAmount = calcUnitDiscount(printer.unit_price, printer.cus_discount_rate, printer.cus_discount_type);
        }
        if (!['cash', 'transfer', 'bank_transfer'].includes(data.payment_mode)) {
            discountAmount = 0;
        }

        setData('items', [...data.items, {
            itm_ky: printer.itm_ky,
            item_code: printer.item_code,
            item_name: printer.item_name,
            barcode: printer.barcode || '',
            batch_no: printer.batch_no || '',
            serial_number: printer.serial_number || '',
            brand: printer.brand || '',
            model: printer.model || '',
            warranty: printer.warranty || '',
            quantity: 1,
            unit_price: printer.unit_price,
            unit: printer.unit || 'NOS',
            available_qty: 1,
            discount_amount: discountAmount,
            cred_tier1_qty: printer.cred_tier1_qty,
            cred_tier1_discount: printer.cred_tier1_discount,
            cred_tier2_qty: printer.cred_tier2_qty,
            cred_tier2_discount: printer.cred_tier2_discount,
            cus_discount_type: printer.cus_discount_type,
            cus_discount_rate: printer.cus_discount_rate,
        }]);
        setPrinterSearch('');
        setPrinters([]);
        setIsPrinterDialogOpen(false);
        toast.success(`Added: ${printer.item_name}`);
    };

    const addItem = (item: StockItem & { inputQuantity?: number }) => {
        const qtyToAdd = item.inputQuantity || 1;
        const existing = data.items.find((i: { itm_ky: number; batch_no: string | null; }) => i.itm_ky === item.itm_ky && i.batch_no === item.batch_no);
        
        if (existing) {
            if (existing.quantity + qtyToAdd > item.available_qty) {
                toast.error('Insufficient stock in section');
                return;
            }
            const newQty = existing.quantity + qtyToAdd;
            let discountAmount = calcTierDiscountForItem(item as any, newQty, item.unit_price, data.payment_mode);
            if (discountAmount === 0 && item.cus_discount_rate) {
                discountAmount = calcUnitDiscount(item.unit_price, item.cus_discount_rate, item.cus_discount_type) * newQty;
            }
            if ((item as any).serial_number && !['cash', 'transfer', 'bank_transfer'].includes(data.payment_mode)) {
                discountAmount = 0;
            }
            const newItems = data.items.map((i: any) => 
                (i.itm_ky === item.itm_ky && i.batch_no === item.batch_no) 
                ? { ...i, quantity: newQty, discount_amount: discountAmount } 
                : i
            );
            setData('items', newItems);
        } else {
            if (item.available_qty < 1) {
                toast.error('Insufficient stock in section');
                return;
            }
            let discountAmount = calcTierDiscountForItem(item as any, qtyToAdd, item.unit_price, data.payment_mode);
            if (discountAmount === 0 && item.cus_discount_rate) {
                discountAmount = calcUnitDiscount(item.unit_price, item.cus_discount_rate, item.cus_discount_type) * qtyToAdd;
            }
            if ((item as any).serial_number && !['cash', 'transfer', 'bank_transfer'].includes(data.payment_mode)) {
                discountAmount = 0;
            }
            setData('items', [...data.items, { ...item, quantity: qtyToAdd, discount_amount: discountAmount }]);
        }
        
        setSearchTerm('');
        setSearchResults([]);
        searchInputRef.current?.focus();
    };

    const removeItem = (index: number) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
    };

    const updateQuantity = (index: number, qty: number) => {
        const item = data.items[index];
        if (qty > item.available_qty) {
            toast.error(`Only ${item.available_qty} available in section`);
            return;
        }
        let discountAmount = calcTierDiscountForItem(item as any, qty, item.unit_price, data.payment_mode);
        if (discountAmount === 0 && item.cus_discount_rate) {
            discountAmount = calcUnitDiscount(item.unit_price, item.cus_discount_rate, item.cus_discount_type) * qty;
        }
        if ((item as any).serial_number && !['cash', 'transfer', 'bank_transfer'].includes(data.payment_mode)) {
            discountAmount = 0;
        }
        const newItems = [...data.items];
        newItems[index] = { ...item, quantity: qty, discount_amount: discountAmount };
        setData('items', newItems);
    };

    const handlePaymentModeChange = (newMode: string) => {
        setData(prev => ({
            ...prev,
            payment_mode: newMode as any,
            ...(newMode === 'cash' || newMode === 'credit' ? {
                bank_account_id: '',
                reference_no: '',
                bank_name: '',
                branch: '',
                cheque_date: '',
            } : {})
        }));
        if (data.items.length > 0) {
            const updatedItems = data.items.map((item: any) => {
                let discountAmount = calcTierDiscountForItem(item as any, item.quantity, item.unit_price, newMode);
                if (discountAmount === 0 && item.cus_discount_rate) {
                    discountAmount = calcUnitDiscount(item.unit_price, item.cus_discount_rate, item.cus_discount_type) * item.quantity;
                }
                if ((item as any).serial_number && !['cash', 'transfer', 'bank_transfer'].includes(newMode)) {
                    discountAmount = 0;
                }
                return { ...item, discount_amount: discountAmount };
            });
            setData('items', updatedItems);
        }
    };

    const printUrl = (url: string) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 10000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!data.section_code) return toast.error('Please select a section');
        if (!data.shop_id) return toast.error('Please select a shop');
        if (data.items.length === 0) return toast.error('Add at least one item');

        if (data.payment_mode === 'cash') {
            const receivedAmount = parseFloat(data.cash_amount);
            if (!data.cash_amount || isNaN(receivedAmount)) {
                return toast.error('Please enter the amount received');
            }
            if (receivedAmount < totalAmount) {
                return toast.error('Amount received cannot be less than the total amount');
            }
        }

        put(route('delivery.delivery-sales.update', delivery.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Sale updated successfully');
            },
            onError: (errors: any) => {
                toast.error(errors.error || 'Failed to update sale. Please check the fields.');
            }
        });
    };

     return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Direct Delivery Sale" />

            {/* Radiant Background */}
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-y-auto">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 mx-auto max-w-7xl p-3 sm:p-4">
                    {/* Form Container with Radiant Effects */}
                    <div className="rounded-xl border border-blue-200/50 bg-white/80 p-4 shadow-xl shadow-blue-500/10 backdrop-blur-sm sm:rounded-2xl sm:p-6">
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 flex flex-col">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                        <Truck className="h-6 w-6 text-vismass-blue" />
                                        Edit Direct Sale
                                    </h1>
                                    <p className="text-xs text-gray-500 mt-1">Modify existing direct inventory sale</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="inline-flex items-center justify-center rounded-md bg-slate-100 p-2 text-gray-500 hover:bg-slate-200 hover:text-gray-700 transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Delivery Information Section */}
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm relative z-20">
                                <div className="mb-2 border-b border-slate-100 pb-1 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                        <Store className="h-4 w-4 text-vismass-blue" />
                                        Transaction Setup
                                    </h3>
                                    <div className="flex gap-4">
                                        <div>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Invoice No</span>
                                            <span className="text-sm font-bold font-mono text-gray-700">{delivery.delivery_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Date</span>
                                            <span className="text-sm font-bold font-mono text-gray-700">{delivery.delivery_date ? delivery.delivery_date.split('T')[0] : ''}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-blue-900 font-semibold">
                                            <Store className="h-4 w-4 text-blue-600" />
                                            Inventory Source (Section)
                                        </Label>
                                        <Select 
                                            value={data.section_code} 
                                            onValueChange={(val) => setData('section_code', val)}
                                            disabled={!!user.delivery_section_code}
                                        >
                                            <SelectTrigger className="w-full bg-white/80 border-blue-200 disabled:opacity-75 disabled:bg-gray-100 disabled:cursor-not-allowed">
                                                <SelectValue placeholder="Select inventory source..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map(s => (
                                                    <SelectItem key={s.id} value={s.section_code}>
                                                        {s.name} ({s.section_code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.section_code && (
                                            <p className="text-sm text-red-500">{errors.section_code}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1 relative">
                                        <Label htmlFor="shop" className="text-xs font-medium text-gray-700">Destination Shop</Label>
                                        <Input
                                            value={shopSearch}
                                            onChange={(e) => {
                                                setShopSearch(e.target.value);
                                                setSelectedShopIndex(-1);
                                            }}
                                            onKeyDown={(e) => {
                                                if (shopSearch && filteredShops.length > 0) {
                                                    if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setSelectedShopIndex(prev => prev < filteredShops.length - 1 ? prev + 1 : 0);
                                                    } else if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        setSelectedShopIndex(prev => prev > 0 ? prev - 1 : filteredShops.length - 1);
                                                    } else if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (selectedShopIndex >= 0) {
                                                            setData('shop_id', filteredShops[selectedShopIndex].id.toString());
                                                            setShopSearch('');
                                                            setSelectedShopIndex(-1);
                                                        }
                                                    }
                                                }
                                            }}
                                            placeholder="Search shops..."
                                            className="h-8 text-sm border-gray-300 focus:ring-vismass-blue mb-1"
                                        />
                                        {shopSearch ? (
                                            <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                                                {filteredShops.length > 0 ? (
                                                    filteredShops.map((s, idx) => (
                                                        <button
                                                            id={`shop-item-${idx}`}
                                                            type="button"
                                                            key={s.id}
                                                            onClick={() => {
                                                                setData('shop_id', s.id.toString());
                                                                setShopSearch('');
                                                                setSelectedShopIndex(-1);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 transition-colors border-b border-gray-100 last:border-0 text-sm ${idx === selectedShopIndex ? 'bg-blue-100' : 'hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-medium text-gray-900">{s.name}</span>
                                                                {s.address && <span className="text-xs text-gray-500">{s.address}</span>}
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-xs text-gray-500">No shops found</div>
                                                )}
                                            </div>
                                        ) : (
                                            <Select value={data.shop_id} onValueChange={(val) => { setData('shop_id', val); setShopSearch(''); }}>
                                                <SelectTrigger id="shop" className="h-8 text-sm border-gray-300 focus:ring-vismass-blue bg-slate-50 hover:bg-slate-100 transition-colors">
                                                    <SelectValue placeholder="Select Shop" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredShops.length > 0 ? (
                                                        filteredShops.map(s => (
                                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-medium">{s.name}</span>
                                                                    {s.address && <span className="text-[10px] text-gray-500">{s.address}</span>}
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-xs text-gray-500">No shops found</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {data.shop_id && shopOutstanding && (
                                <div className={`rounded-md px-3 py-1.5 text-center text-xs font-medium ${
                                    shopOutstanding.credit ? 'bg-blue-50 text-blue-700' : (shopOutstanding.outstanding > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')
                                }`}>
                                    {shopOutstanding.credit
                                        ? `Overpaid / Credit: Rs ${Math.abs(shopOutstanding.outstanding).toFixed(2)}`
                                        : (shopOutstanding.outstanding > 0
                                            ? `Outstanding: Rs ${shopOutstanding.outstanding.toFixed(2)}`
                                            : 'No Outstanding'
                                        )
                                    }
                                    {shopOutstanding.delivery_count > 0 && (
                                        <span className="text-[10px] opacity-70 ml-1">({shopOutstanding.delivery_count} unpaid)</span>
                                    )}
                                </div>
                            )}

                            {/* Item Entry & Search Section */}
                            <DeliveryBatchSelectionModal
                                isOpen={isBatchModalOpen}
                                onClose={() => setIsBatchModalOpen(false)}
                                items={batchCandidates}
                                existingItems={data.items}
                                onSelect={handleBatchSelect}
                            />
                            <div className="space-y-4">
                                {/* Entry Mode Toggle */}
                                <div className="flex items-center gap-2 mb-2">
                                    <Button
                                        type="button"
                                        variant={entryMode === 'item' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setEntryMode('item')}
                                        className={entryMode === 'item' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                    >
                                        <Package className="w-4 h-4 mr-1" />
                                        Item Entry
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={entryMode === 'printer' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setEntryMode('printer')}
                                        className={entryMode === 'printer' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                    >
                                        <Barcode className="w-4 h-4 mr-1" />
                                        Printer Entry
                                    </Button>
                                </div>

                                {entryMode === 'item' ? (
                                <DeliveryItemEntryForm
                                    itemInput={itemInput}
                                    setItemInput={setItemInput}
                                    itemCodeRef={itemCodeRef}
                                    quantityRef={quantityRef}
                                    plusButtonRef={plusButtonRef}
                                    selectedItem={selectedItem}
                                    items={searchResults}
                                    isDropdownOpen={isDropdownOpen}
                                    setIsDropdownOpen={setIsDropdownOpen}
                                    searchItems={setSearchTerm}
                                    selectItem={handleSelectItem}
                                    setBatchCandidates={setBatchCandidates}
                                    setIsBatchModalOpen={setIsBatchModalOpen}
                                    addItem={handleAddItem}
                                    resetItemInput={resetItemInput}
                                    sectionCode={data.section_code}
                                />
                                ) : (
                                /* Printer Entry */
                                <div className="space-y-3 animate-in slide-in-from-right-5 duration-300">
                                    <div className="flex items-center space-x-3 mb-4">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Barcode className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-800">Printer Entry</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="printer_search" className="text-sm font-medium text-gray-700 flex items-center">
                                            <Search className="w-4 h-4 mr-2 text-blue-500" />
                                            Search Printer
                                        </Label>
                                        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                            <Input
                                                id="printer_search"
                                                placeholder="Serial Number / Barcode / Item Name"
                                                value={printerSearch}
                                                onChange={(e) => setPrinterSearch(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        searchPrinters(printerSearch);
                                                    }
                                                }}
                                                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                autoFocus
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => searchPrinters(printerSearch)}
                                                className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
                                            >
                                                <Search className="w-4 h-4 mr-1" />
                                                Find
                                            </Button>
                                        </div>
                                        <p className="text-xs text-blue-500">Search by serial number, barcode, or item name</p>
                                    </div>

                                    {/* Printer Search Results Dialog */}
                                    <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Search Results - Printers</DialogTitle>
                                                <DialogDescription>Select a printer to add to the sale</DialogDescription>
                                            </DialogHeader>
                                            {isPrinterSearching ? (
                                                <div className="p-8 text-center text-gray-500">Searching...</div>
                                            ) : printers.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">No printers found</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {printers.map((printer: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => addPrinter(printer)}
                                                            className="p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="font-medium text-gray-900">{printer.item_name}</div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        Serial: <span className="font-mono font-bold">{printer.serial_number}</span>
                                                                        {printer.brand && <span className="ml-2">Brand: {printer.brand}</span>}
                                                                        {printer.model && <span className="ml-2">Model: {printer.model}</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-sm font-bold text-blue-600">Rs. {(printer.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                                    {printer.warranty && (
                                                                        <div className="text-[10px] text-green-600">Warranty: {printer.warranty} months</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                )}

                                {/* Items List Section */}
                                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4 text-vismass-blue" />
                                            Cart Items
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            {data.items.length > 0 && (
                                                <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-200/50">
                                                    {data.items.length} {data.items.length === 1 ? 'Item' : 'Items'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-white">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
                                                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product Description</th>
                                                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">Quantity</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">Unit Price</th>
                                                    <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider w-36">Total (Rs)</th>
                                                    <th className="px-4 py-3 w-14"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                        {data.items.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                                        <div className="rounded-full bg-slate-50 p-4 mb-3 border border-slate-100 shadow-sm">
                                                            <ShoppingCart className="h-8 w-8 text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-gray-600">Cart is empty</p>
                                                        <p className="text-xs text-gray-400 mt-1">Search and add items from the section stock</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            data.items.map((item: any, index: number) => (
                                                <tr key={index} className="hover:bg-slate-50/50 group">
                                                    <td className="px-4 py-3 text-xs font-medium text-gray-400 text-center">{index + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-gray-900 group-hover:text-vismass-blue transition-colors">
                                                                {item.item_name}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] text-gray-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{item.item_code}</span>
                                                                {item.serial_number && (
                                                                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200/50 px-1.5 py-0.5 rounded font-mono font-bold">
                                                                        SN: {item.serial_number}
                                                                    </span>
                                                                )}
                                                                {item.brand && (
                                                                    <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200/50 px-1.5 py-0.5 rounded">
                                                                        {item.brand} {item.model}
                                                                    </span>
                                                                )}
                                                                {!item.serial_number && item.batch_no && (
                                                                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                        Batch: <span className="font-bold">{item.batch_no}</span>
                                                                    </span>
                                                                )}
                                                                {item.warranty && (
                                                                    <span className="text-[10px] text-green-700 bg-green-50 border border-green-200/50 px-1.5 py-0.5 rounded">
                                                                        Warranty: {item.warranty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Input 
                                                                type="number" 
                                                                className={`w-20 h-9 text-sm font-semibold text-center border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue rounded-md shadow-sm ${item.serial_number ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                                value={item.quantity}
                                                                readOnly={!!item.serial_number}
                                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                                                                min={1}
                                                            />
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.unit}</span>
                                                        </div>
                                                    </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="text-sm font-medium text-gray-700">{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="text-sm font-bold text-vismass-blue">
                                                                    {((item.quantity * item.unit_price) - (item.discount_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </div>
                                                                {(item.discount_amount || 0) > 0 && (
                                                                    <div className="text-[10px] text-green-600 font-medium">
                                                                        - Rs. {(item.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItem(index)}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                                    title="Remove Item"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                                </div> {/* Close Top Section */}
                                
                                {/* Bottom Section: Payment & Totals */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Order Summary Section */}
                                    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <Receipt className="h-4 w-4 text-vismass-blue" />
                                            Order Summary
                                        </h3>
                                        
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                                                <span>Subtotal</span>
                                                <span className="font-mono">Rs. {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>

                                            {/* Discount Application */}
                                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 xl:gap-3">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discount</span>
                                                    
                                                    <div className="flex items-center gap-2 w-full xl:w-auto">
                                                        <div className="relative flex-1 xl:w-48 lg:w-64 max-w-[250px]">
                                                            <Input 
                                                                type="number" 
                                                                placeholder="0.00"
                                                                className="h-8 text-sm pl-7 pr-2 text-right font-mono border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue w-full shadow-sm"
                                                                value={data.discount_value}
                                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                onChange={e => setData('discount_value', e.target.value)}
                                                            />
                                                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                                                                {data.discount_type === 'percentage' ? '%' : 'Rs.'}
                                                            </div>
                                                        </div>

                                                        <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 shrink-0 shadow-inner">
                                                            <button 
                                                                type="button"
                                                                className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all ${data.discount_type === 'fixed' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                                                onClick={() => setData('discount_type', 'fixed')}
                                                            >
                                                                Fixed
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all ${data.discount_type === 'percentage' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                                                onClick={() => setData('discount_type', 'percentage')}
                                                            >
                                                                %
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {discountAmount > 0 && (
                                                    <div className="flex justify-between items-center text-sm font-bold text-rose-600 mt-1">
                                                        <span>Discount Applied</span>
                                                        <span className="font-mono">- Rs. {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t-2 border-slate-200 border-dashed mt-4 bg-white p-3 rounded-lg border-2 border-vismass-blue/10">
                                            <div className="flex flex-col mb-1">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Net Total</span>
                                                <span className="text-3xl font-black text-vismass-blue tracking-tight">
                                                    Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col space-y-4">
                                        
                                        {/* Payment Modes */}
                                        <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-2">
                                            {[
                                                { id: 'cash', label: 'Cash', icon: Banknote },
                                                { id: 'card', label: 'Card', icon: CreditCard },
                                                { id: 'cheque', label: 'Cheque', icon: FileText },
                                                { id: 'transfer', label: 'Bank', icon: Landmark },
                                                { id: 'credit', label: 'Credit', icon: Store },
                                            ].map((mode) => (
                                                <button 
                                                    key={mode.id}
                                                    type="button" 
                                                    className={`flex flex-col items-center justify-center gap-1 p-2 h-16 rounded-lg border-2 transition-all duration-200 ${
                                                        data.payment_mode === mode.id 
                                                        ? 'bg-blue-50 border-vismass-blue text-vismass-blue shadow-sm' 
                                                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                                    }`}
                                                    onClick={() => {
                                                        handlePaymentModeChange(mode.id);
                                                        if (mode.id === 'cheque') setIsChequeDialogOpen(true);
                                                        if (mode.id === 'card') setIsCardDialogOpen(true);
                                                        if (mode.id === 'transfer') setIsBankDialogOpen(true);
                                                    }}
                                                >
                                                    <mode.icon className={`h-4 w-4 ${data.payment_mode === mode.id ? 'text-vismass-blue' : 'text-slate-400'}`} />
                                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{mode.label}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Dynamic Fields for Payment */}
                                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 shadow-inner min-h-[100px] flex flex-col justify-center">
                                            {data.payment_mode === 'credit' && (
                                                <div className="flex flex-col items-center justify-center text-slate-500 h-full py-4">
                                                    <Store className="h-8 w-8 mb-2 opacity-50" />
                                                    <span className="text-sm font-semibold">Credit Sale</span>
                                                    <span className="text-xs">No payment collected now.</span>
                                                </div>
                                            )}

                                            {(data.payment_mode === 'cash') && (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label htmlFor="cash_amount" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Amount Received</Label>
                                                        <button 
                                                            type="button" 
                                                            className="text-[10px] font-bold text-vismass-blue hover:text-blue-700 hover:underline bg-blue-50 px-2 py-1 rounded-md border border-blue-100"
                                                            onClick={() => setData('cash_amount', totalAmount.toString())}
                                                        >
                                                            Exact
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <Input 
                                                            id="cash_amount"
                                                            placeholder="0.00" 
                                                            className="h-10 pl-10 text-base font-bold border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue rounded-lg shadow-sm"
                                                            type="number"
                                                            value={data.cash_amount}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            onChange={(e) => setData('cash_amount', e.target.value)}
                                                        />
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rs.</div>
                                                    </div>
                                                    {data.payment_mode === 'cash' && parseFloat(data.cash_amount) > totalAmount && (
                                                        <div className="text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200 font-bold flex justify-between items-center mt-2 shadow-sm">
                                                            <span className="flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> Change Due:</span>
                                                            <span className="text-sm">Rs. {(parseFloat(data.cash_amount) - totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {data.payment_mode === 'cheque' && (
                                                <div className="flex flex-col items-center justify-center p-2">
                                                    {data.reference_no && data.bank_name ? (
                                                        <div className="w-full bg-white border border-amber-200 rounded-lg p-3 text-sm">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-bold text-amber-800 flex items-center gap-1"><FileText className="w-4 h-4"/> Cheque Details</span>
                                                                <button type="button" onClick={() => setIsChequeDialogOpen(true)} className="text-amber-600 hover:text-amber-700 text-xs flex items-center gap-1"><Pencil className="w-3 h-3"/> Edit</button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                <div><span className="text-gray-500">No:</span> {data.reference_no}</div>
                                                                <div><span className="text-gray-500">Bank:</span> {data.bank_name}</div>
                                                                <div><span className="text-gray-500">Branch:</span> {data.branch}</div>
                                                                <div><span className="text-gray-500">Date:</span> {data.cheque_date}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <FileText className="h-8 w-8 text-amber-300 mx-auto mb-2" />
                                                            <p className="text-sm text-gray-500 mb-2">No cheque details entered.</p>
                                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsChequeDialogOpen(true)}>Enter Details</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {data.payment_mode === 'card' && (
                                                <div className="flex flex-col items-center justify-center p-2">
                                                    {data.bank_account_id ? (
                                                        <div className="w-full bg-white border border-blue-200 rounded-lg p-3 text-sm">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-bold text-blue-800 flex items-center gap-1"><CreditCard className="w-4 h-4"/> Card Details</span>
                                                                <button type="button" onClick={() => setIsCardDialogOpen(true)} className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"><Pencil className="w-3 h-3"/> Edit</button>
                                                            </div>
                                                            <div className="text-xs">
                                                                <span className="text-gray-500">Deposit To:</span> {bankAccounts.find(b => b.id.toString() === data.bank_account_id)?.bank_name || 'Selected Account'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <CreditCard className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                                            <p className="text-sm text-gray-500 mb-2">No card details entered.</p>
                                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsCardDialogOpen(true)}>Enter Details</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {data.payment_mode === 'transfer' && (
                                                <div className="flex flex-col items-center justify-center p-2">
                                                    {data.bank_account_id && data.reference_no ? (
                                                        <div className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-sm">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="font-bold text-indigo-800 flex items-center gap-1"><Landmark className="w-4 h-4"/> Bank Transfer Details</span>
                                                                <button type="button" onClick={() => setIsBankDialogOpen(true)} className="text-indigo-600 hover:text-indigo-700 text-xs flex items-center gap-1"><Pencil className="w-3 h-3"/> Edit</button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2 text-xs">
                                                                <div><span className="text-gray-500">Account:</span> {bankAccounts.find(b => b.id.toString() === data.bank_account_id)?.bank_name || 'Selected Account'}</div>
                                                                <div><span className="text-gray-500">Ref:</span> {data.reference_no}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <Landmark className="h-8 w-8 text-indigo-300 mx-auto mb-2" />
                                                            <p className="text-sm text-gray-500 mb-2">No transfer details entered.</p>
                                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsBankDialogOpen(true)}>Enter Details</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    {/* Action Button */}
                                    <div className="mt-auto pt-2">
                                        <button 
                                            className={`w-full h-14 text-base font-bold rounded-xl text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                                                processing || data.items.length === 0 
                                                ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none' 
                                                : 'bg-gradient-to-r from-vismass-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] shadow-blue-500/25'
                                            }`}
                                            disabled={processing || data.items.length === 0}
                                            onClick={handleSubmit}
                                        >
                                            {processing ? (
                                                <>
                                                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-5 w-5" />
                                                    Complete Sale & Print
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        
            {/* ── Cheque Dialog ──────────────────────────────────────────── */}
            <Dialog open={isChequeDialogOpen} onOpenChange={(open) => setIsChequeDialogOpen(open)}>
                <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Cheque Details
                        </DialogTitle>
                        <DialogDescription>
                            Enter cheque number, bank name, and branch information.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Cheque No. <span className="text-red-500">*</span></Label>
                                <Input
                                    ref={chequeNoRef}
                                    type="text"
                                    autoFocus
                                    value={data.reference_no}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setData('reference_no', val);
                                    }}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            chequeBankRef.current?.focus();
                                        }
                                    }}
                                    placeholder="e.g. 001234"
                                    maxLength={6}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Cheque Date <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    value={data.cheque_date}
                                    onChange={(e) => setData('cheque_date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Bank <span className="text-red-500">*</span></Label>
                                <Input
                                    ref={chequeBankRef}
                                    type="text"
                                    value={data.bank_name}
                                    onChange={(e) => setData('bank_name', e.target.value)}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            chequeBranchRef.current?.focus();
                                        }
                                    }}
                                    placeholder="e.g. Bank of Ceylon"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Branch <span className="text-red-500">*</span></Label>
                                <Input
                                    ref={chequeBranchRef}
                                    type="text"
                                    value={data.branch}
                                    onChange={(e) => setData('branch', e.target.value)}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            chequeOkButtonRef.current?.focus();
                                        }
                                    }}
                                    placeholder="e.g. Kandy"
                                />
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Paid Amount <span className="text-red-500">*</span></Label>
                                    <button 
                                        type="button"
                                        onClick={() => setData('cash_amount', String(totalAmount))}
                                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium transition-colors"
                                    >
                                        Exact
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</div>
                                    <Input
                                        type="number"
                                        value={data.cash_amount}
                                        onChange={(e) => setData('cash_amount', e.target.value)}
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        onKeyDown={(e) => { 
                                            if (['e', 'E', '+', '-'].includes(e.key)) {
                                                e.preventDefault();
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                chequeOkButtonRef.current?.focus();
                                            }
                                        }}
                                        className="pl-9 text-lg font-bold border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            type="button"
                            variant="outline" 
                            className="w-full sm:w-auto"
                            onClick={() => setIsChequeDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            ref={chequeOkButtonRef}
                            className="w-full bg-amber-500 text-white hover:bg-amber-600 sm:w-auto"
                            onClick={() => setIsChequeDialogOpen(false)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setIsChequeDialogOpen(false); } }}
                            disabled={!data.reference_no || data.reference_no.length !== 6 || !data.cheque_date || !data.bank_name || !data.branch || !data.cash_amount || Number(data.cash_amount) <= 0}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Card Payment Dialog ───────────────────────────────────── */}
            <Dialog open={isCardDialogOpen} onOpenChange={(open) => setIsCardDialogOpen(open)}>
                <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            Card Payment Details
                        </DialogTitle>
                        <DialogDescription>
                            Select the destination bank account for the card payment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Deposit To Account <span className="text-red-500">*</span></Label>
                            <Select 
                                value={data.bank_account_id} 
                                onValueChange={(val) => {
                                    setData('bank_account_id', val);
                                    setTimeout(() => cardOkButtonRef.current?.focus(), 50);
                                }}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select Destination Bank Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.bank_name} - {b.branch_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Paid Amount <span className="text-red-500">*</span></Label>
                                    <button 
                                        type="button"
                                        onClick={() => setData('cash_amount', String(totalAmount))}
                                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium transition-colors"
                                    >
                                        Exact
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</div>
                                    <Input
                                        type="number"
                                        value={data.cash_amount}
                                        onChange={(e) => setData('cash_amount', e.target.value)}
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        onKeyDown={(e) => { 
                                            if (['e', 'E', '+', '-'].includes(e.key)) {
                                                e.preventDefault();
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                cardOkButtonRef.current?.focus();
                                            }
                                        }}
                                        className="pl-9 text-lg font-bold border-blue-200 focus:border-blue-400 focus:ring-blue-400/20"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            type="button"
                            variant="outline" 
                            className="w-full sm:w-auto"
                            onClick={() => setIsCardDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            ref={cardOkButtonRef}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                            onClick={() => setIsCardDialogOpen(false)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setIsCardDialogOpen(false); } }}
                            disabled={!data.bank_account_id || !data.cash_amount || Number(data.cash_amount) <= 0}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bank Transfer Dialog ──────────────────────────────────── */}
            <Dialog open={isBankDialogOpen} onOpenChange={(open) => setIsBankDialogOpen(open)}>
                <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-indigo-500" />
                            Bank Transfer Details
                        </DialogTitle>
                        <DialogDescription>
                            Select the destination account and enter the transfer reference number.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Deposit To Account <span className="text-red-500">*</span></Label>
                            <Select 
                                value={data.bank_account_id} 
                                onValueChange={(val) => {
                                    setData('bank_account_id', val);
                                    setTimeout(() => bankRefRef.current?.focus(), 50);
                                }}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select Destination Bank Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>
                                            {b.bank_name} - {b.branch_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Transfer Reference <span className="text-red-500">*</span></Label>
                            <Input
                                ref={bankRefRef}
                                type="text"
                                value={data.reference_no}
                                onChange={(e) => setData('reference_no', e.target.value)}
                                onKeyDown={(e) => { 
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        bankOkButtonRef.current?.focus();
                                    }
                                }}
                                placeholder="e.g. TXN987654321"
                            />
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">Paid Amount <span className="text-red-500">*</span></Label>
                                    <button 
                                        type="button"
                                        onClick={() => setData('cash_amount', String(totalAmount))}
                                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium transition-colors"
                                    >
                                        Exact
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rs.</div>
                                    <Input
                                        type="number"
                                        value={data.cash_amount}
                                        onChange={(e) => setData('cash_amount', e.target.value)}
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        onKeyDown={(e) => { 
                                            if (['e', 'E', '+', '-'].includes(e.key)) {
                                                e.preventDefault();
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                bankOkButtonRef.current?.focus();
                                            }
                                        }}
                                        className="pl-9 text-lg font-bold border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400/20"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            type="button"
                            variant="outline" 
                            className="w-full sm:w-auto"
                            onClick={() => setIsBankDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            ref={bankOkButtonRef}
                            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
                            onClick={() => setIsBankDialogOpen(false)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setIsBankDialogOpen(false); } }}
                            disabled={!data.bank_account_id || !data.reference_no || !data.cash_amount || Number(data.cash_amount) <= 0}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>

    );
}

