import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
// import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import {
    RefreshCcw,
    CreditCard,
    Edit as EditIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import PrivilegeAccessModal from './components/PrivilegeAccessModal';
import BatchSelectionModal from './components/BatchSelectionModal';
import BarcodeSelectionModal from '@/components/pos/BarcodeSelectionModal';
import SaleInformationForm from './components/SaleInformationForm';

import EntryModeToggle from './components/EntryModeToggle';
import ItemEntryForm from './components/ItemEntryForm';
import PrinterEntryForm from './components/PrinterEntryForm';
import ItemsListTable from './components/ItemsListTable';
import PrintersListTable from './components/PrintersListTable';
import PaymentTotalsSection from './components/PaymentTotalsSection';
import { ItemMaster } from './Create';
import { calcTierDiscountForItem, calcUnitDiscount } from './tierDiscount';

export interface SaleItem {
    item_code: string;
    item_name: string;
    unit_price: number;
    our_price: number;
    cost_price: number;
    quantity: number;
    free_quantity: number;
    total: number;
    discount_amount?: number;
    discount_percentage?: number;
    original_discount_amount?: number;
    cus_discount_rate?: number;
    cus_discount_type?: 'fixed' | 'percentage';
    stock?: number;
    retail_price: number;
    sell_unit_type?: 'bundle' | 'nos';
    wholesale_price: number;
    wholesale_min_qty?: number | null;
    extra_price: number;

    batch_no?: string | null;
    itm_ky?: number;
    serial_number?: string;
    brand?: string;
    model?: string;
    warranty?: string;
    original_warranty?: string;
    saved_warranty?: string;
    barcode?: string;
    category?: string;
    unit?: string;
    vat_inclusive?: boolean;
    // Quantity-based discount tiers
    tier1_qty?: number | null;
    tier1_discount?: number | null;
    tier2_qty?: number | null;
    tier2_discount?: number | null;
    cred_tier1_qty?: number | null;
    cred_tier1_discount?: number | null;
    cred_tier2_qty?: number | null;
    cred_tier2_discount?: number | null;
    is_service?: boolean;
}

interface Customer {
    code: string;
    name: string;
    is_vat_registered?: boolean;
    vat_no?: string;
    outstanding_balance?: number;
    is_privilege_user?: boolean;
}

const Edit: React.FC<{ sale: any; saleId: number; currentDate: string }> = ({ sale, saleId, currentDate }) => {
    const { auth, bankAccounts = [] } = usePage<any>().props; // bankAccounts from backend for payment dialogs
    const initialPaymentMode = Number(sale.balance_amount || 0) > 0
        ? 'credit'
        : (sale.payment_mode || 'cash');

    const initialPercentage = Number(sale.discount_percentage) || 0;

    const { data, setData, put, processing, errors, transform } = useForm({
        invoice_no: sale.invoice_no,
        transaction_date: sale.transaction_date,
        customer_code: sale.customer_code || '0001',
        customer_name: sale.customer_name || 'cash',
        customer_vat_no: sale.customer_vat_no || '',
        is_vat_invoice: sale.is_vat_invoice === true || sale.is_vat_invoice === 1 || sale.is_vat_invoice === '1',
        vat_rate: sale.vat_rate || 0,
        price_type: sale.price_type || 'retail',
        items: sale.items || [] as SaleItem[],
        payment_mode: initialPaymentMode,
        subtotal: sale.subtotal || 0,
        discount_percentage: initialPercentage,
        manual_discount_fixed: sale.manual_discount_fixed || 0,
        discount_amount: sale.discount_amount || 0,
        total_discount: sale.total_discount || 0,
        tax_amount: sale.tax_amount || 0,
        total_amount: sale.total_amount || 0,
        cash_payment: sale.cash_payment || '',
        card_payment: sale.card_payment || '',
        cheque_payment: sale.cheque_payment || '',
        bank_transfer_payment: sale.bank_transfer_payment || '',
        cheque_no: sale.cheque_no || '',
        cheque_bank: sale.cheque_bank || '',
        cheque_branch: sale.cheque_branch || '',
        cheque_date: sale.cheque_date || '',
        bank_ref: sale.bank_ref || '',
        bank_name: sale.bank_name || '',
        bank_branch: sale.bank_branch || '',
        bank_account_id: sale.bank_account_id || '',
        balance_amount: sale.balance_amount || '',
        id: saleId,
    });

    const [itemInput, setItemInput] = useState({
        code: '',
        name: '',
        price: 0,
        quantity: 1,
        barcode: '',
        serial_number: ''
    });

    const [selectedItem, setSelectedItem] = useState<ItemMaster | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isPrivilegeModalOpen, setIsPrivilegeModalOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [isCustomerCreateDialogOpen, setIsCustomerCreateDialogOpen] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [items, setItems] = useState<ItemMaster[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Batch Selection Logic
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchCandidates, setBatchCandidates] = useState<ItemMaster[]>([]);
    
    // Barcode multi-match logic
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [barcodeCandidates, setBarcodeCandidates] = useState<ItemMaster[]>([]);

    // Printer states
    const [entryMode, setEntryMode] = useState<'item' | 'printer'>('item');
    const [printerSearch, setPrinterSearch] = useState('');
    const [printers, setPrinters] = useState<any[]>([]);
    const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
    const [includePrinterWarranty, setIncludePrinterWarranty] = useState(true);

    const [editingQuantity, setEditingQuantity] = useState<{ index: number; quantity: number } | null>(null);
    const [editingDiscount, setEditingDiscount] = useState<{ index: number; discount: number } | null>(null);

    // Refs
    const itemCodeRef = useRef<HTMLInputElement>(null);
    const quantityRef = useRef<HTMLInputElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const cashPaymentRef = useRef<HTMLInputElement>(null);
    const cardPaymentRef = useRef<HTMLInputElement>(null);

    // Auto-print state
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const searchAbortController = useRef<AbortController | null>(null);

    // VAT information (needed so we can auto‑set vat_rate when the date or customer changes)
    const [allVatRates, setAllVatRates] = useState<any[]>([]);
    const [companyVatInfo, setCompanyVatInfo] = useState<{ vat_rate: number; vat_no: string } | null>(null);
    const [companyInfo, setCompanyInfo] = useState({
        name: 'VISMASS PVT LTD',
        address: '32, Ground Floor, Yakkala Park, Kandy Road, Yakkala.',
        phone: '0332234300',
        vat_no: '',
        privilege_users_discount: 0,
        privilege_card_discount: 0
    });

    // Store original items for stock validation when editing quantities
    const [originalItems] = useState<SaleItem[]>(sale.items || []);

    // Track if initial load has completed
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    // Ref to ensure price recalc only fires on user-driven changes, not on initial load
    const hasRunInitialPriceSync = useRef(false);

    // Card pricing confirmation (same behaviour as Create.tsx)
    const [showCardPriceConfirmation, setShowCardPriceConfirmation] = useState(false);
    const [prevManualDiscount, setPrevManualDiscount] = useState<number | null>(null);

    // Unit selection modal (for items with bundle→NOS conversion)
    const [isUnitSelectionOpen, setIsUnitSelectionOpen] = useState(false);
    const [unitSelectionPendingItem, setUnitSelectionPendingItem] = useState<ItemMaster | null>(null);
    const [unitSelectionFocus, setUnitSelectionFocus] = useState<'bundle' | 'nos'>('bundle');

    // Determine if this is a printer sale based on items having serial numbers
    const isPrinterSale = data.items.some((item: SaleItem) => item.serial_number);

    const calculateTotals = () => {
        const vatRate = Number(data.vat_rate) || 0;
        let manualDiscountPercentage = Number(data.discount_percentage) || 0;
        let manualDiscountFixed = Number(data.manual_discount_fixed) || 0;

        // Force privilege discount based on current payment mode if privilege user
        if (selectedCustomer?.is_privilege_user) {
            if (data.payment_mode === 'card') {
                manualDiscountPercentage = Number(companyInfo.privilege_card_discount || 0);
            } else if (data.payment_mode === 'credit') {
                manualDiscountPercentage = 0; // No discount for credit sales
            } else {
                // cash, cheque, bank transfer
                manualDiscountPercentage = Number(companyInfo.privilege_users_discount || 0);
            }
        }

        const vatRateDecimal = vatRate / 100;

        let itemsGrossTotal = 0;  // Total BEFORE any discounts
        let itemLevelDiscounts = 0;
        let vatableSubtotal = 0;  // Net amount for VAT-exclusive items (after item discount) - VAT will be ADDED
        let vatInfoSubtotal = 0;  // Net amount for VAT-inclusive items (after item discount) - VAT will be EXTRACTED

        // If privilege customer, forcefully strip ALL item-level discounts from the state
        const updatedItems = data.items.map((item: SaleItem) => {
            const newItem = { ...item };
            if (selectedCustomer?.is_privilege_user && Number(newItem.discount_amount || 0) !== 0) {
                newItem.discount_amount = 0;
                newItem.discount_percentage = 0;
                if (newItem.original_discount_amount !== undefined) newItem.original_discount_amount = 0;
            }
            return newItem;
        });

        // Calculate gross total, item-level discounts, and vatable subtotals
        // Sri Lankan VAT standard: VAT base = net selling price AFTER discount
        updatedItems.forEach((item: SaleItem) => {
            const itemGross = Number(item.unit_price || item.our_price || 0) * Number(item.quantity || 0);
            itemsGrossTotal += itemGross;

            const itemDiscount = Number(item.discount_amount || 0);
            itemLevelDiscounts += itemDiscount;

            // Net = price after item-level discount (VAT base per SL VAT Act)
            const itemNet = itemGross - itemDiscount;

            if (!item.vat_inclusive) {
                // VAT-exclusive: VAT is ADDED on net amount
                vatableSubtotal += itemNet;
            } else {
                // VAT-inclusive: VAT is EXTRACTED from net amount
                vatInfoSubtotal += itemNet;
            }
        });

        // Net total after item-level discounts but before manual percentage discount
        const netAfterItemDiscounts = itemsGrossTotal - itemLevelDiscounts;
        
        // Wholesale prices already represent the lowest price; manual discounts are generally excluded.
        const effectiveManualDiscountPercentage = (data.price_type === 'wholesale' && !selectedCustomer?.is_privilege_user) ? 0 : manualDiscountPercentage;
        let manualDiscountAmount = (netAfterItemDiscounts * (effectiveManualDiscountPercentage / 100)) + manualDiscountFixed;

        // Prevent discount from exceeding the subtotal
        if (manualDiscountAmount > netAfterItemDiscounts) {
            manualDiscountAmount = netAfterItemDiscounts;
        }

        // Total discount = item-level discounts + manual discount amount
        const totalDiscount = itemLevelDiscounts + manualDiscountAmount;

        // Calculate VAT and final total
        let tax_amount = 0;
        let total = 0;
        let vatToAdd = 0;  // VAT on non-inclusive items
        let vatExtracted = 0;  // VAT extracted from inclusive items

        if (data.is_vat_invoice) {
            // VAT-exclusive items: VAT = net × rate  (net already deducts item-level discounts)
            vatToAdd = vatableSubtotal * vatRateDecimal;

            // VAT-inclusive items: extract VAT from net amount
            // vatExtracted = net - (net / (1 + rate))  e.g. 1950 - (1950/1.18) = 297.46
            const vatMultiplier = 1 + vatRateDecimal;
            vatExtracted = vatInfoSubtotal - (vatInfoSubtotal / vatMultiplier);

            // Total VAT on invoice
            tax_amount = vatToAdd + vatExtracted;

            // Final total = gross - all discounts + VAT added for exclusive items
            total = itemsGrossTotal - totalDiscount + vatToAdd;
        } else {
            // No VAT invoice
            tax_amount = 0;
            total = itemsGrossTotal - totalDiscount;
        }

        const paid = Number(data.cash_payment) + Number(data.card_payment) + Number(data.cheque_payment) + Number(data.bank_transfer_payment);

        setData(prev => {
            const updates: any = {
                subtotal: itemsGrossTotal,  // Use GROSS total (before discounts)
                tax_amount: tax_amount,
                total_amount: total,
                balance_amount: String(paid - total),
                total_discount: totalDiscount, // Total of item + manual discounts
                discount_amount: manualDiscountAmount, // Manual discount value (calculated from %)
                discount_percentage: manualDiscountPercentage
            };
            
            // Only update items if we stripped discounts
            let itemsChanged = false;
            for (let i = 0; i < data.items.length; i++) {
                if (data.items[i].discount_amount !== updatedItems[i].discount_amount) {
                    itemsChanged = true;
                    break;
                }
            }
            if (itemsChanged) {
                updates.items = updatedItems;
            }

            return { ...prev, ...updates };
        });
    };

    // Calculate totals whenever items, VAT settings, or payment amounts change
    useEffect(() => {
        calculateTotals();
    }, [data.items, data.is_vat_invoice, data.vat_rate, data.price_type, data.cash_payment, data.card_payment, data.cheque_payment, data.bank_transfer_payment, data.discount_percentage, data.manual_discount_fixed, selectedCustomer, companyInfo.privilege_card_discount, companyInfo.privilege_users_discount, data.payment_mode]);

    // Fetch VAT rates and company info on mount (similar to Create.tsx)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const vatsRes = await axios.get('/company/vat-rates');
                setAllVatRates(vatsRes.data);

                // use the current transaction date (initially loaded from sale)
                const currentTransactionDate = data.transaction_date;
                const activeRate = vatsRes.data.find((r: any) => {
                    const effDate = new Date(r.effective_date).toISOString().split('T')[0];
                    const endDate = r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : null;
                    return currentTransactionDate >= effDate && (!endDate || currentTransactionDate <= endDate);
                });

                if (activeRate) {
                    setCompanyVatInfo({ vat_rate: activeRate.vat_rate, vat_no: activeRate.vat_no });
                    // only override if the existing rate is falsy (i.e. new sale) - keep original sale value otherwise
                    if (!data.vat_rate) {
                        setData(prev => ({ ...prev, vat_rate: activeRate.vat_rate }));
                    }
                }

                // Fetch Company Info
                try {
                    const companyRes = await axios.get('/api/company-data');
                    if (companyRes.data) {
                        setCompanyInfo({
                            name: companyRes.data.company_name || companyRes.data.name,
                            address: companyRes.data.address,
                            phone: companyRes.data.phone,
                            vat_no: activeRate?.vat_no || companyRes.data.vat_no || '',
                            privilege_users_discount: companyRes.data.privilege_users_discount || 0,
                            privilege_card_discount: companyRes.data.privilege_card_discount || 0
                        });
                    }
                } catch (e) { /* ignore */ }

                // Fetch Initial Customer Data
                if (data.customer_code && data.customer_code !== '0001') {
                    try {
                        const custRes = await axios.get(`/sales/search/customers?query=${data.customer_code}&type=customer`);
                        if (custRes.data && custRes.data.length > 0) {
                            setSelectedCustomer(custRes.data[0]);
                        }
                    } catch (e) { /* ignore */ }
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }

            // Mark initial load as complete AFTER VAT data is fetched
            setIsInitialLoadComplete(true);
        };
        fetchInitialData();
    }, []);

    // Update VAT rate when transaction date changes
    useEffect(() => {
        if (allVatRates.length > 0 && data.transaction_date) {
            const currentTransactionDate = data.transaction_date;
            const applicableRate = allVatRates.find((r: any) => {
                const effDate = new Date(r.effective_date).toISOString().split('T')[0];
                const endDate = r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : null;
                return currentTransactionDate >= effDate && (!endDate || currentTransactionDate <= endDate);
            });
            if (applicableRate) {
                setData(prev => ({
                    ...prev,
                    vat_rate: applicableRate.vat_rate
                }));
                setCompanyVatInfo({
                    vat_rate: applicableRate.vat_rate,
                    vat_no: applicableRate.vat_no
                });
            }
        }
    }, [data.transaction_date, allVatRates]);

    // Remove the forced entryMode change so the view defaults to 'item' mode (which shows all items)
    // useEffect(() => {
    //     setEntryMode(isPrinterSale ? 'printer' : 'item');
    // }, [isPrinterSale]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(() => {
                setIsFullscreen(false);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    setIsFullscreen(false);
                }).catch(() => {
                    setIsFullscreen(true);
                });
            }
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Determine price for an item depending on the currently selected price_type/payment_mode
    const getCurrentPrice = (item: any) => {
        // Prioritize explicit price types
        if (data.price_type === 'retail') return item.retail_price;
        if (data.price_type === 'wholesale') {
            // fall back to retail if wholesale is blank/zero to avoid zeroing out prices
            return item.wholesale_price || item.retail_price;
        }
        if (data.price_type === 'card' || (data.payment_mode === 'card' && data.price_type === 'card')) {
            return item.retail_price;
        }

        // For VAT inclusive items, price is usually fixed to retail (MRP)
        if (item.vat_inclusive) {
            return item.retail_price;
        }

        // Default to retail price
        return item.retail_price;
    };

    // Customer search functions
    const searchCustomers = async (query: string) => {
        if (query.length < 2) return;
        try {
            const response = await axios.get(`/sales/search/customers?query=${encodeURIComponent(query)}&type=customer`);
            setCustomers(response.data);
            setIsCustomerDialogOpen(true);
        } catch (error) {
            console.error('Error searching customers:', error);
        }
    };

    const fetchCustomerByCode = async (code: string) => {
        if (!code || code === '0001') {
            setData(prev => ({
                ...prev,
                customer_name: 'cash',
                customer_vat_no: '',
                is_vat_invoice: false
            }));
            setSelectedCustomer(null);
            return;
        }

        try {
            const response = await axios.get(`/sales/search/customers?query=${code}&type=customer`);
            if (response.data && response.data.length > 0) {
                const customer = response.data[0];
                setData(prev => ({
                    ...prev,
                    customer_name: customer.name,
                    customer_vat_no: customer.vat_no || '',
                    is_vat_invoice: !!customer.is_vat_registered,
                    vat_rate: customer.is_vat_registered
                        ? (companyVatInfo?.vat_rate || prev.vat_rate)
                        : prev.vat_rate
                }));
                setSelectedCustomer(customer);
            }
        } catch (error) {
            console.error('Error fetching customer:', error);
            toast.error('Customer not found');
        }
    };

    // Item search functions

    // whenever the customer toggles the retail/wholesale/extra/card price
    // we need to update the price shown in the entry form for the currently
    // selected item. this mirrors the same effect which exists in Create.tsx.
    useEffect(() => {
        if (selectedItem) {
            const price = getCurrentPrice(selectedItem);
            setItemInput(prev => ({ ...prev, price }));
        }
    }, [data.price_type, data.payment_mode, selectedItem]);
    const searchItems = async (query: string) => {
        if (query.length < 1) return;

        // Abort previous search if still running
        if (searchAbortController.current) {
            searchAbortController.current.abort();
        }
        searchAbortController.current = new AbortController();

        try {
            const response = await axios.get(`/sales/search/items?q=${encodeURIComponent(query)}&price_type=${data.price_type}`, {
                signal: searchAbortController.current.signal
            });
            const results = response.data;

            if (results.length > 0) {
                // Efficiency check: If it's an exact barcode or item_code match, and unique, add it immediately
                const queryUpper = query.toUpperCase();
                const exactBarcodeMatches = results.filter((item: ItemMaster) => 
                    (item.barcode && item.barcode.toUpperCase() === queryUpper) || 
                    (item.item_code && item.item_code.toUpperCase() === queryUpper)
                );

                if (exactBarcodeMatches.length === 1) {
                    const item = exactBarcodeMatches[0];
                    // If it has multiple batches, show batch selection modal
                    if (item.batches && item.batches.length > 1) {
                        setBatchCandidates(item.batches);
                        setIsBatchModalOpen(true);
                        setIsDropdownOpen(false);
                    } else {
                        // Single batch or no batches
                        const itemToSelect = (item.batches && item.batches.length === 1) ? item.batches[0] : item;
                        
                        // Check if it's a unit conversion item (bundle vs nos)
                        if ((itemToSelect.transfer_conversion_factor ?? 1) > 1 && itemToSelect.to_unit_name) {
                            setUnitSelectionPendingItem(itemToSelect);
                            setIsUnitSelectionOpen(true);
                            setItems([]);
                            setIsDropdownOpen(false);
                        } else {
                            // Select item and focus quantity
                            selectItem(itemToSelect);
                            setTimeout(() => {
                                if (quantityRef.current) {
                                    quantityRef.current.focus();
                                    quantityRef.current.select();
                                }
                            }, 150);
                        }
                    }
                    return;
                }

                if (exactBarcodeMatches.length > 1) {
                    setBarcodeCandidates(exactBarcodeMatches);
                    setIsBarcodeModalOpen(true);
                    setIsDropdownOpen(false);
                    return;
                }

                setItems(results);
                setIsDropdownOpen(true);
            } else {
                setItems([]);
                setIsDropdownOpen(false);
            }
        } catch (error: any) {
            if (error.code !== 'ECONNABORTED') console.error('Error searching items:', error);
        }
    };

    const handleBatchSelect = async (item: ItemMaster) => {
        setIsBatchModalOpen(false);
        selectItem(item);

        // Focus quantity field
        setTimeout(() => {
            if (quantityRef.current) {
                quantityRef.current.focus();
                quantityRef.current.select();
            }
        }, 150);
    };

    const handleBarcodeSelect = (product: ItemMaster) => {
        setIsBarcodeModalOpen(false);
        // After selecting a product from barcode modal, if it has batches, show batch modal
        if (product.batches && product.batches.length > 1) {
            setBatchCandidates(product.batches);
            setIsBatchModalOpen(true);
        } else {
            // If it has only one batch or no batches
            if (product.batches && product.batches.length === 1) {
                selectItem(product.batches[0]);
            } else {
                selectItem(product);
            }

            // Focus quantity field
            setTimeout(() => {
                if (quantityRef.current) {
                    quantityRef.current.focus();
                    quantityRef.current.select();
                }
            }, 150);
        }
    };
    const selectItem = (item: ItemMaster) => {
        // If the item has a unit conversion factor, ask the user which unit to sell in
        if ((item.transfer_conversion_factor ?? 1) > 1 && item.to_unit_name) {
            setUnitSelectionPendingItem(item);
            setIsUnitSelectionOpen(true);
            setItems([]);
            setIsItemDialogOpen(false);
            return;
        }

        setSelectedItem(item);
        // Determine price based on current price_type
        let price = item.retail_price;
        if (data.price_type === 'wholesale') {
            price = item.wholesale_price || item.retail_price;
        } else if (data.price_type === 'card') {
            price = item.retail_price;
        }
        setItemInput({
            code: item.item_code,
            name: item.item_name,
            price: price,
            quantity: 1,
            barcode: item.barcode,
            serial_number: item.serial_number || ''
        });
        setIsDropdownOpen(false);
        // Focus quantity field after selection
        setTimeout(() => {
            if (quantityRef.current) {
                quantityRef.current.focus();
                quantityRef.current.select();
            }
        }, 150);
    };

    // Keyboard navigation for unit selection dialog.
    // Delayed 50 ms so that an Enter used to confirm batch selection cannot
    // also immediately auto-confirm the unit selection dialog.
    useEffect(() => {
        if (!isUnitSelectionOpen) return;
        setUnitSelectionFocus('bundle');
        let cleanup: (() => void) | undefined;
        const timer = setTimeout(() => {
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    setUnitSelectionFocus(prev => prev === 'bundle' ? 'nos' : 'bundle');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    setUnitSelectionFocus(prev => { confirmUnitSelection(prev); return prev; });
                }
            };
            window.addEventListener('keydown', handleKey);
            cleanup = () => window.removeEventListener('keydown', handleKey);
        }, 50);
        return () => { clearTimeout(timer); cleanup?.(); };
    }, [isUnitSelectionOpen]);

    // Called when user confirms bundle or NOS from the unit selection modal
    const confirmUnitSelection = (unitType: 'bundle' | 'nos') => {
        if (!unitSelectionPendingItem) return;
        const item = unitSelectionPendingItem;
        const factor = item.transfer_conversion_factor ?? 1;
        const basePrice = getCurrentPrice(item);
        const price = unitType === 'nos' ? +(basePrice / factor).toFixed(4) : basePrice;
        const unitLabel = unitType === 'nos' ? (item.to_unit_name ?? item.unit) : (item.from_unit_name ?? item.unit);

        const correctStock = unitType === 'nos'
            ? (item.nos_stock ?? 0)
            : (item.bundle_stock ?? item.stock);

        const modifiedItem: ItemMaster = {
            ...item,
            unit_price: price,
            our_price: price,
            retail_price: unitType === 'nos' ? +(item.retail_price / factor).toFixed(4) : item.retail_price,
            wholesale_price: unitType === 'nos' ? +(item.wholesale_price / factor).toFixed(4) : item.wholesale_price,
            extra_price: unitType === 'nos' ? +(item.extra_price / factor).toFixed(4) : item.extra_price,

            cost_price: unitType === 'nos' ? +(item.cost_price / factor).toFixed(4) : item.cost_price,
            stock: correctStock,
            unit: unitLabel ?? item.unit,
            sell_unit_type: unitType,
        };

        // Check if this is a printer (has serial_number) - auto-add it
        if (item.serial_number && item.serial_number.trim() !== '') {
            // Auto-add printer with adjusted prices
            const tiers = item.tiers || {};
            let discountAmount = 0;
            if (data.price_type !== 'wholesale') {
                const tierCarrier = {
                    tier1_qty: tiers.tier1?.qty,
                    tier1_discount: tiers.tier1?.discount,
                    tier2_qty: tiers.tier2?.qty,
                    tier2_discount: tiers.tier2?.discount,
                    cred_tier1_qty: (item as any).cred_tiers?.tier1?.qty,
                    cred_tier1_discount: (item as any).cred_tiers?.tier1?.discount,
                    cred_tier2_qty: (item as any).cred_tiers?.tier2?.qty,
                    cred_tier2_discount: (item as any).cred_tiers?.tier2?.discount,
                    cus_discount_type: (item as any).cus_discount_type,
                };
                discountAmount = calcTierDiscountForItem(tierCarrier, 1, price, data.payment_mode);
            }

            const newItem: SaleItem = {
                item_code: modifiedItem.item_code,
                item_name: modifiedItem.item_name,
                unit_price: price,
                our_price: price,
                cost_price: modifiedItem.cost_price, // Use adjusted cost_price
                quantity: 1,
                free_quantity: 0,
                total: price - discountAmount,
                discount_amount: discountAmount,
                stock: correctStock,
                retail_price: modifiedItem.retail_price,
                wholesale_price: modifiedItem.wholesale_price,
                extra_price: modifiedItem.extra_price,

                batch_no: item.batch_no,
                itm_ky: item.itm_ky,
                serial_number: item.serial_number,
                brand: item.brand,
                model: item.model,
                warranty: includePrinterWarranty ? item.warranty : '',
                original_warranty: item.warranty || '',
                saved_warranty: item.warranty || '',
                barcode: item.barcode,
                category: item.category,
                unit: unitLabel,
                vat_inclusive: item.vat_inclusive || false,
                cus_discount_rate: item.cus_discount_rate || 0,
                cus_discount_type: (item as any).cus_discount_type || 'fixed',
                tier1_qty: tiers.tier1?.qty,
                tier1_discount: tiers.tier1?.discount,
                tier2_qty: tiers.tier2?.qty,
                tier2_discount: tiers.tier2?.discount,
                cred_tier1_qty: item.cred_tiers?.tier1?.qty,
                cred_tier1_discount: item.cred_tiers?.tier1?.discount,
                cred_tier2_qty: item.cred_tiers?.tier2?.qty,
                cred_tier2_discount: item.cred_tiers?.tier2?.discount,
                is_service: !!item.is_service,
            };

            setData('items', [...data.items, newItem]);
            setPrinterSearch('');
            toast.success('Printer added to sale');
        } else {
            // Stationary item - set selectedItem for manual addition
            setSelectedItem(modifiedItem);
            setItemInput(prev => ({
                ...prev,
                code: item.item_code,
                name: item.item_name,
                price,
                barcode: item.barcode,
                serial_number: item.serial_number || '',
            }));
        }

        setIsUnitSelectionOpen(false);
        setUnitSelectionPendingItem(null);
    };

    // Printer search functions

    // When price_type changes AFTER the initial load, adjust item prices.
    // We use a ref so this does NOT fire when isInitialLoadComplete first becomes true
    // (which was causing all saved prices to be overwritten on page load).
    // NOTE: payment_mode changes are handled by handlePaymentModeChange(), not this effect
    useEffect(() => {
        if (!isInitialLoadComplete) return;  // Not ready yet

        if (!hasRunInitialPriceSync.current) {
            // First time we enter here after load — just mark as done, don't change prices
            hasRunInitialPriceSync.current = true;
            return;
        }

        // Only runs when the user genuinely changes price_type
        if (data.items.length > 0) {
            const updatedItems = data.items.map((item: SaleItem) => {
                const newPrice = getCurrentPrice(item) || item.retail_price;
                const total = (item.quantity || 1) * newPrice - (item.discount_amount || 0);
                return {
                    ...item,
                    unit_price: newPrice,
                    our_price: newPrice,
                    total: total
                };
            });
            setData('items', updatedItems);
        }
    }, [data.price_type, isInitialLoadComplete]);
    const searchPrinters = async (query: string) => {
        if (query.length < 1) return;
        try {
            // include price_type so backend can return appropriate price field
            const url = `/sales/search/printers?query=${encodeURIComponent(query)}&price_type=${encodeURIComponent(data.price_type)}&sale_id=${saleId}`;
            const response = await axios.get(url);
            if (response.data.length === 1) {
                const printer = response.data[0];
                // if this serial is already part of the sale, don't add again
                const already = data.items.some((i: SaleItem) => i.serial_number === printer.serial_number);
                if (already) {
                    toast.error('This printer is already added to the sale');
                } else {
                    addPrinter(printer);
                    toast.success('Printer added automatically');
                }
            } else if (response.data.length > 1) {
                setPrinters(response.data);
                setIsPrinterDialogOpen(true);
            } else {
                toast.error('No printers found');
            }
        } catch (error) {
            console.error('Error searching printers:', error);
            toast.error('Error searching printers');
        }
    };

    const addPrinter = (printer: any) => {
        // Check if printer has unit conversion - if so, ask user which unit to sell in
        if ((printer.transfer_conversion_factor ?? 1) > 1 && printer.to_unit_name) {
            setUnitSelectionPendingItem(printer);
            setIsUnitSelectionOpen(true);
            setIsPrinterDialogOpen(false);
            return;
        }

        // Determine price based on current price_type (same as getCurrentPrice)
        let price = printer.retail_price;
        if (data.price_type === 'wholesale') {
            price = printer.wholesale_price || printer.retail_price;
        } else if (data.price_type === 'card' || (data.payment_mode === 'card' && data.price_type === 'card')) {
            price = printer.retail_price;
        }

        // compute customer discount if the printer record supplies a rate (Reset to 0 if wholesale)
        let discountAmount = 0;
        const tiers = printer.tiers || {};
        if (data.price_type !== 'wholesale') {
            const tierCarrier = {
                tier1_qty: tiers.tier1?.qty,
                tier1_discount: tiers.tier1?.discount,
                tier2_qty: tiers.tier2?.qty,
                tier2_discount: tiers.tier2?.discount,
                cred_tier1_qty: printer.cred_tiers?.tier1?.qty,
                cred_tier1_discount: printer.cred_tiers?.tier1?.discount,
                cred_tier2_qty: printer.cred_tiers?.tier2?.qty,
                cred_tier2_discount: printer.cred_tiers?.tier2?.discount,
                cus_discount_type: printer.cus_discount_type,
            };
            discountAmount = calcTierDiscountForItem(tierCarrier, 1, price, data.payment_mode);
        }

        const newItem: SaleItem = {
            item_code: printer.item_code,
            item_name: printer.item_name,
            unit_price: price,
            our_price: price,
            cost_price: printer.cost_price || 0,
            quantity: 1,
            free_quantity: 0,
            total: price - discountAmount,
            discount_amount: discountAmount,
            stock: printer.stock || 0,
            retail_price: printer.retail_price,
            wholesale_price: printer.wholesale_price,
            extra_price: printer.extra_price,

            batch_no: printer.batch_no,
            itm_ky: printer.itm_ky,
            serial_number: printer.serial_number,
            brand: printer.brand,
            model: printer.model,
            warranty: includePrinterWarranty ? printer.warranty : '',
            barcode: printer.barcode,
            category: printer.category,
            unit: printer.unit,
            vat_inclusive: printer.vat_inclusive,
            cus_discount_rate: printer.cus_discount_rate || 0,
            cus_discount_type: printer.cus_discount_type || 'fixed',
            tier1_qty: tiers.tier1?.qty,
            tier1_discount: tiers.tier1?.discount,
            tier2_qty: tiers.tier2?.qty,
            tier2_discount: tiers.tier2?.discount,
            cred_tier1_qty: printer.cred_tiers?.tier1?.qty,
            cred_tier1_discount: printer.cred_tiers?.tier1?.discount,
            cred_tier2_qty: printer.cred_tiers?.tier2?.qty,
            cred_tier2_discount: printer.cred_tiers?.tier2?.discount,
        };

        setData('items', [...data.items, newItem]);
        setPrinterSearch('');
        setIsPrinterDialogOpen(false);
        toast.success('Printer added to sale');
    };

    // Add item to sale
    const addItem = () => {
        if (!selectedItem) {
            toast.error('Please select an item first');
            return;
        }

        if (itemInput.quantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        // Check if item already exists
        const existingIndex = data.items.findIndex((item: SaleItem) =>
            item.item_code === selectedItem.item_code &&
            item.batch_no === selectedItem.batch_no
        );

        if (existingIndex !== -1) {
            // adding to an existing line – reuse updateQuantity so discounts/thresholds
            // and free issues are recalculated in one place
            const currentQty = data.items[existingIndex].quantity;
            const newQty = currentQty + itemInput.quantity;
            updateQuantity(existingIndex, newQty);
        } else {
            // Add new item
            const freeQuantity = 0;
            /*
            if (selectedItem.free_issue_scheme_buy_qty && selectedItem.free_issue_scheme_get_qty) {
                const buyQty = selectedItem.free_issue_scheme_buy_qty;
                const getQty = selectedItem.free_issue_scheme_get_qty;
                if (buyQty > 0) {
                    freeQuantity = Math.floor(itemInput.quantity / buyQty) * getQty;
                }
            }
            */

            // Auto‑apply wholesale price if quantity meets threshold OR if global price type is wholesale
            let effectivePrice = itemInput.price;
            let discountAmount = 0;
            if ((selectedItem.wholesale_min_qty != null && itemInput.quantity >= selectedItem.wholesale_min_qty) || data.price_type === 'wholesale') {
                // use wholesale price but fall back to input price if wholesale is missing
                effectivePrice = selectedItem.wholesale_price || effectivePrice;
                discountAmount = 0; // Ensure 0 if wholesale
            } else {
                // Apply tier discount (fixed Rs or percentage per RtDisType1),
                // using the tier set that matches the current payment mode
                const tiers = selectedItem.tiers || {};
                discountAmount = calcTierDiscountForItem(
                    {
                        tier1_qty: tiers.tier1?.qty,
                        tier1_discount: tiers.tier1?.discount,
                        tier2_qty: tiers.tier2?.qty,
                        tier2_discount: tiers.tier2?.discount,
                        cred_tier1_qty: selectedItem.cred_tiers?.tier1?.qty,
                        cred_tier1_discount: selectedItem.cred_tiers?.tier1?.discount,
                        cred_tier2_qty: selectedItem.cred_tiers?.tier2?.qty,
                        cred_tier2_discount: selectedItem.cred_tiers?.tier2?.discount,
                        cus_discount_type: selectedItem.cus_discount_type,
                    },
                    itemInput.quantity,
                    effectivePrice,
                    data.payment_mode
                );
            }

            const newItem: SaleItem = {
                item_code: selectedItem.item_code,
                item_name: selectedItem.item_name,
                unit_price: effectivePrice,
                our_price: effectivePrice,
                cost_price: selectedItem.cost_price || 0,
                quantity: itemInput.quantity,
                free_quantity: freeQuantity,
                total: effectivePrice * itemInput.quantity - discountAmount,
                discount_amount: discountAmount,
                stock: selectedItem.stock || 0,
                retail_price: selectedItem.retail_price,
                wholesale_price: selectedItem.wholesale_price,
                wholesale_min_qty: selectedItem.wholesale_min_qty,
                extra_price: selectedItem.extra_price,

                batch_no: selectedItem.batch_no,
                itm_ky: selectedItem.itm_ky,
                serial_number: selectedItem.serial_number,
                brand: selectedItem.brand,
                model: selectedItem.model,
                warranty: selectedItem.warranty,
                barcode: selectedItem.barcode,
                category: selectedItem.category,
                unit: selectedItem.unit,
                vat_inclusive: selectedItem.vat_inclusive,
                sell_unit_type: selectedItem.sell_unit_type,
                cus_discount_rate: selectedItem.cus_discount_rate || 0,
                cus_discount_type: selectedItem.cus_discount_type || 'fixed',
                tier1_qty: selectedItem.tiers?.tier1?.qty,
                tier1_discount: selectedItem.tiers?.tier1?.discount,
                tier2_qty: selectedItem.tiers?.tier2?.qty,
                tier2_discount: selectedItem.tiers?.tier2?.discount,
                cred_tier1_qty: selectedItem.cred_tiers?.tier1?.qty,
                cred_tier1_discount: selectedItem.cred_tiers?.tier1?.discount,
                cred_tier2_qty: selectedItem.cred_tiers?.tier2?.qty,
                cred_tier2_discount: selectedItem.cred_tiers?.tier2?.discount,
            };

            setData('items', [...data.items, newItem]);
            toast.success('Item added to sale');
        }

        // Reset form
        resetItemInput();
    };

    const resetItemInput = () => {
        setItemInput({
            code: '',
            name: '',
            price: 0,
            quantity: 1,
            barcode: '',
            serial_number: ''
        });
        setSelectedItem(null);
        setItems([]);
        setIsDropdownOpen(false);
        if (itemCodeRef.current) {
            itemCodeRef.current.focus();
        }
    };

    // Remove item from sale
    const removeItem = (index: number) => {
        const updatedItems = data.items.filter((_: SaleItem, i: number) => i !== index);
        setData('items', updatedItems);
        toast.success('Item removed from sale');
    };

    // Quantity editing functions
    const startEditingQuantity = (index: number) => {
        setEditingQuantity({ index, quantity: data.items[index].quantity });
    };

    const updateQuantity = (index: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        const updatedItems = [...data.items];
        const currentItem = updatedItems[index];

        // Find the original quantity for this item
        const originalItem = originalItems.find(item =>
            item.item_code === currentItem.item_code &&
            item.batch_no === currentItem.batch_no
        );

        const originalQuantity = originalItem ? originalItem.quantity : 0;
        const quantityIncrease = newQuantity - originalQuantity;

        // If increasing quantity, check if additional stock is available
        if (quantityIncrease > 0 && currentItem.stock !== undefined && !currentItem.is_service) {
            if (quantityIncrease > currentItem.stock) {
                toast.error(`Not enough stock available. You can only add ${currentItem.stock} more units. (Original: ${originalQuantity}, Requested: ${newQuantity}, Available: ${currentItem.stock})`);
                return;
            }
        }

        updatedItems[index].quantity = newQuantity;

        // Calculate free quantity
        const freeQuantity = 0;
        /*
        if (updatedItems[index].free_issue_scheme_buy_qty && updatedItems[index].free_issue_scheme_get_qty) {
            const buyQty = updatedItems[index].free_issue_scheme_buy_qty as number;
            const getQty = updatedItems[index].free_issue_scheme_get_qty as number;
            if (buyQty > 0) {
                freeQuantity = Math.floor(newQuantity / buyQty) * getQty;
            }
        }
        */
        updatedItems[index].free_quantity = freeQuantity;

        let unitPrice = updatedItems[index].unit_price;
        let discountAmount = calcTierDiscountForItem(
            updatedItems[index],
            newQuantity,
            unitPrice,
            data.payment_mode
        );

        if (data.price_type === 'wholesale') {
            unitPrice = updatedItems[index].wholesale_price || updatedItems[index].retail_price;
            discountAmount = 0; // Remove discount when wholesale applies
        }

        updatedItems[index].discount_amount = discountAmount;
        updatedItems[index].unit_price = unitPrice;
        updatedItems[index].our_price = unitPrice;

        const itemPrice = unitPrice;
        updatedItems[index].total = newQuantity * itemPrice - discountAmount;
        setData('items', updatedItems);
        setEditingQuantity(null);
        toast.success('Quantity updated');
    };

    const cancelEditingQuantity = () => {
        setEditingQuantity(null);
    };

    // Discount editing functions
    const startEditingDiscount = (index: number) => {
        setEditingDiscount({ index, discount: data.items[index].discount_amount || 0 });
    };

    const updateDiscount = (index: number, newDiscount: number) => {
        const updatedItems = [...data.items];
        updatedItems[index].discount_amount = newDiscount;
        const itemPrice = updatedItems[index].our_price || updatedItems[index].unit_price;
        updatedItems[index].total = updatedItems[index].quantity * itemPrice - newDiscount;
        setData('items', updatedItems);
        setEditingDiscount(null);
        toast.success('Discount updated');
    };

    const cancelEditingDiscount = () => {
        setEditingDiscount(null);
    };

    // Handle payment mode change (mimic Create.tsx behaviour)
    const handlePaymentModeChange = (newMode: string) => {
        if (data.items.length === 0) {
            setData('payment_mode', newMode);
            return;
        }

        // Step 1: Restore base prices if switching away from card, credit, or cheque
        let restoredItems = data.items;
        const discountStrippedModes = ['card', 'credit', 'cheque'];
        const shouldRestore = discountStrippedModes.includes(data.payment_mode) && 
                           !discountStrippedModes.includes(newMode);

        if (shouldRestore) {
            restoredItems = restoredItems.map((item: SaleItem) => {
                const originalPrice = (item as any).original_unit_price ?? item.retail_price;
                const discount = item.original_discount_amount ?? item.discount_amount ?? 0;
                const newTotal = (originalPrice * item.quantity) - discount;
                return {
                    ...item,
                    unit_price: originalPrice,
                    our_price: originalPrice,
                    total: newTotal,
                    discount_amount: discount,
                    original_discount_amount: undefined,
                    original_unit_price: undefined
                };
            });
            // Restore manual discount if coming from card mode
            if (data.payment_mode === 'card' && prevManualDiscount !== null) {
                // if not privilege user, we restore the previous manual discount
                if (!selectedCustomer?.is_privilege_user) {
                    setData('discount_percentage', prevManualDiscount);
                }
                setPrevManualDiscount(null);
            }
        }

        let newDiscountPercentage = data.discount_percentage;
        const preservedDiscount = prevManualDiscount;

        if (shouldRestore && preservedDiscount !== null) {
            newDiscountPercentage = preservedDiscount;
        }

        // Determine if privilege user discount applies
        const isPrivilege = !!selectedCustomer?.is_privilege_user;

        const getTierDiscount = (item: SaleItem, mode: string) =>
            calcTierDiscountForItem(item, item.quantity, item.retail_price || item.unit_price, mode);

        // Apply new pricing strategy depending on mode
        if (['card', 'credit', 'cheque'].includes(newMode) && restoredItems.length > 0) {
            if (preservedDiscount === null && !isPrivilege) {
                setPrevManualDiscount(data.discount_percentage || 0);
            }
            const updatedItems = restoredItems.map((item: SaleItem) => {
                const targetPrice = item.retail_price;
                const newDiscountAmount = getTierDiscount(item, newMode);
                const newTotal = (targetPrice * item.quantity) - newDiscountAmount;

                return {
                    ...item,
                    original_unit_price: item.unit_price,
                    original_discount_amount: item.discount_amount || 0,
                    unit_price: targetPrice,
                    our_price: targetPrice,
                    total: newTotal,
                    discount_amount: newDiscountAmount,
                };
            });
            setData('items', updatedItems);
            
            let privDiscount = 0;
            if (isPrivilege) {
                 privDiscount = newMode === 'card' ? (companyInfo.privilege_card_discount || 0) : (companyInfo.privilege_users_discount || 0);
            }
            setData('discount_percentage', privDiscount);
        }
        // Step 4: Update items if we restored but didn't apply new pricing
        else if (shouldRestore && restoredItems !== data.items) {
            setData('items', restoredItems);
            setData('discount_percentage', isPrivilege ? (companyInfo.privilege_users_discount || 0) : newDiscountPercentage);
            setPrevManualDiscount(null);
        }

        // Step 5: For card/cheque mode, reset other inputs; for credit keep entered amounts
        if (newMode === 'card') {
            setData(prev => ({
                ...prev,
                payment_mode: newMode,
                cash_payment: '',
                card_payment: prev.card_payment,
                cheque_payment: '',
                bank_transfer_payment: '',
            }));
        } else if (newMode === 'cheque') {
            // Keep cheque payment if any, maybe reset others
            setData('payment_mode', newMode);
        } else {
            setData('payment_mode', newMode);
        }
    };

    // Apply card prices to all items (used when user confirms)
    const applyCardPrices = () => {
        handlePaymentModeChange('card');
        setShowCardPriceConfirmation(false);
        setTimeout(() => cardPaymentRef.current?.focus(), 100);
    };

    const cancelCardPrices = () => {
        setShowCardPriceConfirmation(false);
    };

    // Print receipt
    const printReceipt = async (saleData?: any) => {
        try {
            const dataToSend = saleData || {
                invoice_no: data.invoice_no,
                transaction_date: data.transaction_date,
                customer_code: data.customer_code,
                customer_name: data.customer_name,
                customer_vat_no: data.customer_vat_no || '',
                is_vat_invoice: data.is_vat_invoice,
                vat_rate: data.vat_rate,
                price_type: data.price_type,
                items: data.items,
                subtotal: data.subtotal,
                discount_amount: data.discount_amount,
                tax_amount: data.tax_amount,
                total_amount: data.total_amount,
                payment_mode: data.payment_mode,
                cash_payment: data.cash_payment,
                card_payment: data.card_payment,
                balance_amount: data.balance_amount
            };

            const response = await axios.post('/sales/preview-receipt', dataToSend, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            // Create hidden iframe for printing
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                iframe.contentWindow?.print();
                // Clean up after printing
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    window.URL.revokeObjectURL(url);
                }, 1000);
            };
        } catch (error) {
            console.error('Error printing receipt:', error);
            toast.error('Error printing receipt');
        }
    };

    // Handle form submission
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return; // guard against double submit

        // Cheque payments require a registered customer
        if (data.payment_mode === 'cheque' && (!data.customer_code || data.customer_code === '0001')) {
            toast.error('Customer Required for Cheque Payment', {
                description: 'Please select a registered customer before saving a cheque payment.',
                duration: 5000,
            });
            return;
        }

        // VAT invoice can contain both VAT-exclusive and VAT-inclusive items.
        // calculateTotals() handles both correctly:
        //   - VAT-exclusive items (vat_inclusive=false): VAT is ADDED to the total
        //   - VAT-inclusive items (vat_inclusive=true):  VAT is EXTRACTED for display only

        transform((currentData) => {
            let itemsGrossTotal = 0;
            let itemLevelDiscounts = 0;
            let vatableSubtotal = 0;
            let vatInfoSubtotal = 0;
            
            const vatRateDecimal = (Number(currentData.vat_rate) || 0) / 100;

            const updatedItems = currentData.items.map((item: SaleItem) => {
                const newItem = { ...item };
                if (selectedCustomer?.is_privilege_user && Number(newItem.discount_amount || 0) !== 0) {
                    newItem.discount_amount = 0;
                    newItem.discount_percentage = 0;
                    if (newItem.original_discount_amount !== undefined) newItem.original_discount_amount = 0;
                }
                return newItem;
            });

            updatedItems.forEach((item: SaleItem) => {
                const itemGross = Number(item.unit_price || item.our_price || 0) * Number(item.quantity || 0);
                itemsGrossTotal += itemGross;

                const itemDiscount = Number(item.discount_amount || 0);
                itemLevelDiscounts += itemDiscount;

                const itemNet = itemGross - itemDiscount;

                if (!item.vat_inclusive) {
                    vatableSubtotal += itemNet;
                } else {
                    vatInfoSubtotal += itemNet;
                }
            });

            const netAfterItemDiscounts = itemsGrossTotal - itemLevelDiscounts;
            
            let manualDiscountPercentage = Number(currentData.discount_percentage) || 0;
            if (selectedCustomer?.is_privilege_user) {
                if (currentData.payment_mode === 'card') {
                    manualDiscountPercentage = Number(companyInfo.privilege_card_discount || 0);
                } else if (currentData.payment_mode === 'credit') {
                    manualDiscountPercentage = 0;
                } else {
                    manualDiscountPercentage = Number(companyInfo.privilege_users_discount || 0);
                }
            }
            const effectiveManualDiscountPercentage = (currentData.price_type === 'wholesale' && !selectedCustomer?.is_privilege_user) ? 0 : manualDiscountPercentage;
            const manualDiscountFixed = Number(currentData.manual_discount_fixed) || 0;
            let manualDiscountAmount = (netAfterItemDiscounts * (effectiveManualDiscountPercentage / 100)) + manualDiscountFixed;
            if (manualDiscountAmount > netAfterItemDiscounts) manualDiscountAmount = netAfterItemDiscounts;
            const totalDiscount = itemLevelDiscounts + manualDiscountAmount;

            let tax_amount = 0;
            let total = 0;
            let vatToAdd = 0;
            let vatExtracted = 0;

            if (currentData.is_vat_invoice) {
                vatToAdd = vatableSubtotal * vatRateDecimal;
                const vatMultiplier = 1 + vatRateDecimal;
                vatExtracted = vatInfoSubtotal - (vatInfoSubtotal / vatMultiplier);
                tax_amount = vatToAdd + vatExtracted;
                total = itemsGrossTotal - totalDiscount + vatToAdd;
            } else {
                tax_amount = 0;
                total = itemsGrossTotal - totalDiscount;
            }

            return {
                ...currentData,
                items: updatedItems,
                subtotal: itemsGrossTotal,
                tax_amount: tax_amount,
                total_amount: total,
                total_discount: totalDiscount,
                discount_amount: manualDiscountAmount,
                discount_percentage: manualDiscountPercentage,
                is_vat_invoice: currentData.is_vat_invoice === true ? 1 : 0,
            } as any;
        });

        put(`/sales/${saleId}`, {
            onSuccess: () => {
                toast.success('Sale updated successfully');
                if (autoPrintEnabled) {
                    // Print receipt after successful save
                    setTimeout(() => {
                        printReceipt();
                    }, 500);
                }
            },
            onError: (errors) => {
                console.error('Update errors:', errors);
                toast.error('Failed to update sale');
            }
        });
    };

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                handlePaymentModeChange('cash');
                return;
            } else if (e.key === 'F2') {
                e.preventDefault();
                handlePaymentModeChange('credit');
                return;
            } else if (e.key === 'F3') {
                e.preventDefault();
                handlePaymentModeChange('card');
                return;
            } else if (e.key === 'F7' || (e.ctrlKey && e.key === 's')) {
                e.preventDefault();
                transform((currentData) => {
                    let itemsGrossTotal = 0;
                    let itemLevelDiscounts = 0;
                    let vatableSubtotal = 0;
                    let vatInfoSubtotal = 0;
                    
                    const vatRateDecimal = (Number(currentData.vat_rate) || 0) / 100;

                    const updatedItems = currentData.items.map((item: SaleItem) => {
                        const newItem = { ...item };
                        if (selectedCustomer?.is_privilege_user && Number(newItem.discount_amount || 0) !== 0) {
                            newItem.discount_amount = 0;
                            newItem.discount_percentage = 0;
                            if (newItem.original_discount_amount !== undefined) newItem.original_discount_amount = 0;
                        }
                        return newItem;
                    });

                    updatedItems.forEach((item: SaleItem) => {
                        const itemGross = Number(item.unit_price || item.our_price || 0) * Number(item.quantity || 0);
                        itemsGrossTotal += itemGross;

                        const itemDiscount = Number(item.discount_amount || 0);
                        itemLevelDiscounts += itemDiscount;

                        const itemNet = itemGross - itemDiscount;

                        if (!item.vat_inclusive) {
                            vatableSubtotal += itemNet;
                        } else {
                            vatInfoSubtotal += itemNet;
                        }
                    });

                    const netAfterItemDiscounts = itemsGrossTotal - itemLevelDiscounts;
                    
                    let manualDiscountPercentage = Number(currentData.discount_percentage) || 0;
                    if (selectedCustomer?.is_privilege_user) {
                        if (currentData.payment_mode === 'card') {
                            manualDiscountPercentage = Number(companyInfo.privilege_card_discount || 0);
                        } else if (currentData.payment_mode === 'credit') {
                            manualDiscountPercentage = 0;
                        } else {
                            manualDiscountPercentage = Number(companyInfo.privilege_users_discount || 0);
                        }
                    }
                    const effectiveManualDiscountPercentage = (currentData.price_type === 'wholesale' && !selectedCustomer?.is_privilege_user) ? 0 : manualDiscountPercentage;
                    const manualDiscountAmount = netAfterItemDiscounts * (effectiveManualDiscountPercentage / 100);
                    const totalDiscount = itemLevelDiscounts + manualDiscountAmount;

                    let tax_amount = 0;
                    let total = 0;
                    let vatToAdd = 0;
                    let vatExtracted = 0;

                    if (currentData.is_vat_invoice) {
                        vatToAdd = vatableSubtotal * vatRateDecimal;
                        const vatMultiplier = 1 + vatRateDecimal;
                        vatExtracted = vatInfoSubtotal - (vatInfoSubtotal / vatMultiplier);
                        tax_amount = vatToAdd + vatExtracted;
                        total = itemsGrossTotal - totalDiscount + vatToAdd;
                    } else {
                        tax_amount = 0;
                        total = itemsGrossTotal - totalDiscount;
                    }

                    return {
                        ...currentData,
                        items: updatedItems,
                        subtotal: itemsGrossTotal,
                        tax_amount: tax_amount,
                        total_amount: total,
                        total_discount: totalDiscount,
                        discount_amount: manualDiscountAmount,
                        discount_percentage: manualDiscountPercentage,
                        is_vat_invoice: currentData.is_vat_invoice === true ? 1 : 0,
                    } as any;
                });
                put(`/sales/${saleId}`, {
                    onSuccess: () => {
                        toast.success('Sale updated successfully');
                        if (autoPrintEnabled) {
                            setTimeout(() => {
                                printReceipt();
                            }, 500);
                        }
                    },
                    onError: (errors) => {
                        console.error('Update errors:', errors);
                        toast.error('Failed to update sale');
                    }
                });
            } else if (e.key === 'F10') {
                e.preventDefault();
                printReceipt();
            } else if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === '+') {
                e.preventDefault();
                if (showCardPriceConfirmation) {
                    // When the confirmation dialog is open, still allow focusing card input
                    cardPaymentRef.current?.focus();
                } else if (data.payment_mode === 'cash' || data.payment_mode === 'credit') {
                    cashPaymentRef.current?.focus();
                } else if (data.payment_mode === 'card') {
                    cardPaymentRef.current?.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [data.payment_mode, handlePaymentModeChange, put, saleId, autoPrintEnabled, showCardPriceConfirmation]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Sales', href: '/sales' },
        { title: 'Edit Sale', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Sale" />

            {/* Radiant Background */}
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-y-auto">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 mx-auto max-w-7xl p-3 sm:p-4">
                    {/* Form Container with Radiant Effects */}
                    <div className="rounded-xl border border-blue-200/50 bg-white/80 p-4 shadow-xl shadow-blue-500/10 backdrop-blur-sm sm:rounded-2xl sm:p-6">
                        <form onSubmit={handleSave} className="space-y-4">
                            {/* Header */}
                            <div className="flex flex-col gap-3 border-b border-blue-200/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <EditIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Edit Sale</h1>
                                        <p className="truncate text-sm text-gray-600">Invoice: {data.invoice_no}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Sale Information Section */}
                            <SaleInformationForm
                                data={data}
                                setData={setData}
                                setIsCustomerDialogOpen={setIsCustomerDialogOpen}
                                setIsPrivilegeModalOpen={setIsPrivilegeModalOpen}
                                fetchCustomerByCode={fetchCustomerByCode}
                                items={data.items}
                            />

                            {/* Quick Navigation Buttons */}
                            <div className="space-y-5">
                                {/* Entry Mode Toggle */}
                                <EntryModeToggle
                                    entryMode={entryMode}
                                    setEntryMode={setEntryMode}
                                />

                                {/* Item/Printer Entry */}
                                            {entryMode === 'item' ? (
                                    <ItemEntryForm
                                        itemInput={itemInput}
                                        setItemInput={setItemInput}
                                        itemCodeRef={itemCodeRef}
                                        quantityRef={quantityRef}
                                        plusButtonRef={plusButtonRef}
                                        selectedItem={selectedItem}
                                        items={items}
                                        isDropdownOpen={isDropdownOpen}
                                        setIsDropdownOpen={setIsDropdownOpen}
                                        setIsItemDialogOpen={setIsItemDialogOpen}
                                        searchItems={searchItems}
                                        selectItem={selectItem}
                                        onBatchSelect={handleBatchSelect}
                                        setBatchCandidates={setBatchCandidates}
                                        setIsBatchModalOpen={setIsBatchModalOpen}
                                        addItem={addItem}
                                        resetItemInput={resetItemInput}
                                    />
                                ) : (
                                    <PrinterEntryForm
                                        printerSearch={printerSearch}
                                        setPrinterSearch={setPrinterSearch}
                                        setIsPrinterDialogOpen={setIsPrinterDialogOpen}
                                        searchPrinters={searchPrinters}
                                        priceType={data.price_type}
                                        setPriceType={(v) => {
                                            setData('price_type', v);
                                            if (v === 'wholesale') {
                                                setData('discount_percentage', 0);
                                            }
                                        }}
                                    />
                                )}

                                            {/* Items/Printers List */}
                                {entryMode === 'printer' ? (
                                    <PrintersListTable
                                        data={data}
                                        removePrinter={removeItem}
                                        toggleWarranty={(index, withWarranty) => {
                                            setData(prev => {
                                                const items = [...prev.items];
                                                if (items[index]) {
                                                    const savedWarranty = items[index].saved_warranty || items[index].warranty || '';
                                                    const originalWarranty = items[index].original_warranty || items[index].saved_warranty || items[index].warranty || '';
                                                    items[index] = {
                                                        ...items[index],
                                                        warranty: withWarranty ? (savedWarranty || originalWarranty || 'Included') : '',
                                                        saved_warranty: withWarranty ? (savedWarranty || originalWarranty || '') : savedWarranty,
                                                        original_warranty: items[index].original_warranty || originalWarranty,
                                                    };
                                                }
                                                return { ...prev, items };
                                            });
                                        }}
                                        updateWarranty={(index, value) => {
                                            const parseNumerical = (text?: string) => {
                                                if (!text) return null;
                                                const match = text.match(/\d+(?:\.\d+)?/);
                                                return match ? parseFloat(match[0]) : null;
                                            };

                                            setData(prev => {
                                                const items = [...prev.items];
                                                if (items[index]) {
                                                    const originalWarranty = items[index].original_warranty || items[index].warranty || items[index].saved_warranty || '';
                                                    const maxWarranty = parseNumerical(originalWarranty);
                                                    const requestedWarranty = parseNumerical(value);
                                                    let finalWarranty = value;

                                                    if (maxWarranty !== null && requestedWarranty !== null && requestedWarranty > maxWarranty) {
                                                        finalWarranty = originalWarranty || items[index].warranty || items[index].saved_warranty || '';
                                                    }

                                                    items[index] = {
                                                        ...items[index],
                                                        warranty: finalWarranty,
                                                        saved_warranty: finalWarranty || items[index].saved_warranty || '',
                                                        original_warranty: originalWarranty,
                                                    };
                                                }
                                                return { ...prev, items };
                                            });
                                        }}
                                    />
                                ) : (
                                    <ItemsListTable
                                        data={data}
                                        editingQuantity={editingQuantity}
                                        editingDiscount={editingDiscount}
                                        setEditingQuantity={setEditingQuantity}
                                        setEditingDiscount={setEditingDiscount}
                                        startEditingQuantity={startEditingQuantity}
                                        updateQuantity={updateQuantity}
                                        cancelEditingQuantity={cancelEditingQuantity}
                                        startEditingDiscount={startEditingDiscount}
                                        updateDiscount={updateDiscount}
                                        cancelEditingDiscount={cancelEditingDiscount}
                                        removeItem={removeItem}
                                        selectedItem={selectedItem}
                                    />
                                )}
                            </div>

                                    {/* Payment & Totals Section */}
                            <PaymentTotalsSection
                                data={data}
                                setData={setData}
                                processing={processing}
                                autoPrintEnabled={autoPrintEnabled}
                                setAutoPrintEnabled={setAutoPrintEnabled}
                                setIsMobilePreviewOpen={setIsMobilePreviewOpen}
                                printReceipt={printReceipt}
                                handleSave={handleSave}
                                handleHoldSale={() => toast.info('Hold sale is only available for new sales')}
                                setIsHoldModalOpen={() => {}}
                                heldSalesCount={0}
                                handlePaymentModeChange={handlePaymentModeChange}
                                cashPaymentRef={cashPaymentRef}
                                cardPaymentRef={cardPaymentRef}
                                bankAccounts={bankAccounts}
                            />
                        </form>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <PrivilegeAccessModal
                isOpen={isPrivilegeModalOpen}
                onClose={() => setIsPrivilegeModalOpen(false)}
                onCustomerSelect={(customer: any) => {
                    setData(prev => ({
                        ...prev,
                        customer_code: customer.code,
                        customer_name: customer.name,
                        customer_vat_no: customer.vat_no || '',
                        price_type: 'wholesale',
                        discount_percentage: prev.payment_mode === 'card' ? (companyInfo.privilege_card_discount || 0) : (companyInfo.privilege_users_discount || 0)
                    }));
                    setSelectedCustomer(customer);
                    setIsPrivilegeModalOpen(false);
                }}
            />

            <BatchSelectionModal
                isOpen={isBatchModalOpen}
                onClose={() => setIsBatchModalOpen(false)}
                items={batchCandidates}
                existingItems={data.items}
                onSelect={handleBatchSelect}
            />

            <BarcodeSelectionModal
                isOpen={isBarcodeModalOpen}
                onClose={() => setIsBarcodeModalOpen(false)}
                products={barcodeCandidates}
                onSelect={handleBarcodeSelect}
            />

            {/* Customer Search Dialog */}
            <Dialog open={isCustomerDialogOpen} onOpenChange={(open) => {
                setIsCustomerDialogOpen(open);
                if (!open) { setCustomerSearch(''); setCustomers([]); }
            }}>
                <DialogContent className="w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Search Customer</DialogTitle>
                        <DialogDescription>Search and select a customer</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Type name or code..."
                            value={customerSearch}
                            onChange={e => {
                                setCustomerSearch(e.target.value);
                                axios.get(`/sales/search/customers?query=${e.target.value}&type=customer`).then(res => setCustomers(res.data));
                            }}
                            autoFocus
                        />
                        <div className="max-h-60 overflow-y-auto divide-y border rounded">
                            {customers.map((customer, idx) => (
                                <div
                                    key={customer.code || `cust-${idx}`}
                                    className="p-3 hover:bg-muted cursor-pointer flex justify-between"
                                    onClick={() => {
                                        setData(prev => ({
                                            ...prev,
                                            customer_code: customer.code,
                                            customer_name: customer.name,
                                            customer_vat_no: customer.vat_no || '',
                                            is_vat_invoice: !!customer.is_vat_registered,
                                            vat_rate: customer.is_vat_registered
                                                ? (companyVatInfo?.vat_rate || prev.vat_rate)
                                                : prev.vat_rate,
                                            price_type: customer.is_privilege_user ? 'wholesale' : prev.price_type,
                                            discount_percentage: customer.is_privilege_user ? (prev.payment_mode === 'card' ? (companyInfo.privilege_card_discount || 0) : (companyInfo.privilege_users_discount || 0)) : prev.discount_percentage
                                        }));
                                        setSelectedCustomer(customer);
                                        setIsCustomerDialogOpen(false);
                                        setCustomerSearch('');
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">{customer.name}</span>
                                        {customer.is_vat_registered && (
                                            <span className="text-[10px] text-green-600 font-bold uppercase">VAT Registered</span>
                                        )}
                                    </div>
                                    <span className="text-muted-foreground text-sm">{customer.code}</span>
                                </div>
                            ))}
                            {customers.length === 0 && customerSearch.length > 0 && (
                                <div className="p-3 text-center text-sm text-gray-400">No customers found</div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Printer Dialog */}
            <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
                <DialogContent className="max-h-[85vh] w-[95vw] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Select Printer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <input
                                id="include-warranty"
                                type="checkbox"
                                checked={includePrinterWarranty}
                                onChange={e => setIncludePrinterWarranty(e.target.checked)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor="include-warranty" className="text-sm text-gray-700">
                                Include printer warranty in the sale item
                            </label>
                        </div>
                        {printers.map((printer) => (
                            <div
                                key={printer.serial_number}
                                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                                onClick={() => addPrinter(printer)}
                            >
                                <div className="font-semibold">{printer.item_name}</div>
                                <div className="text-sm text-gray-600">Serial: {printer.serial_number}</div>
                                <div className="text-sm text-gray-600">Brand: {printer.brand} {printer.model}</div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Unit Selection Dialog (Bundle vs NOS) */}
            <Dialog open={isUnitSelectionOpen} onOpenChange={(open) => {
                if (!open) { setIsUnitSelectionOpen(false); setUnitSelectionPendingItem(null); }
            }}>
                <DialogContent className="max-w-sm w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCcw className="w-5 h-5 text-blue-500" />
                            Select Selling Unit
                        </DialogTitle>
                        <DialogDescription>
                            {unitSelectionPendingItem?.item_name} — How would you like to sell this item?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2 sm:gap-4">
                        <button
                            type="button"
                            onClick={() => confirmUnitSelection('bundle')}
                            onMouseEnter={() => setUnitSelectionFocus('bundle')}
                            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-colors outline-none ${
                                unitSelectionFocus === 'bundle'
                                    ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-400'
                                    : 'border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
                            }`}
                        >
                            <span className="text-2xl">📦</span>
                            <span className="text-sm font-semibold text-blue-700">
                                {unitSelectionPendingItem?.from_unit_name ?? 'Bundle'}
                            </span>
                            <span className="text-xs text-gray-500">
                                Price: {unitSelectionPendingItem ? getCurrentPrice(unitSelectionPendingItem).toFixed(2) : '—'}
                            </span>
                            <span className="text-xs text-gray-400">
                                Stock: {unitSelectionPendingItem?.bundle_stock?.toFixed(2) ?? '—'}
                            </span>
                            {unitSelectionFocus === 'bundle' && (
                                <span className="text-[10px] text-blue-500 font-medium">↵ Enter to select</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => confirmUnitSelection('nos')}
                            onMouseEnter={() => setUnitSelectionFocus('nos')}
                            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-colors outline-none ${
                                unitSelectionFocus === 'nos'
                                    ? 'border-green-500 bg-green-100 ring-2 ring-green-400'
                                    : 'border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100'
                            }`}
                        >
                            <span className="text-2xl">🏷️</span>
                            <span className="text-sm font-semibold text-green-700">
                                {unitSelectionPendingItem?.to_unit_name ?? 'Individual'}
                            </span>
                            <span className="text-xs text-gray-500">
                                Price: {unitSelectionPendingItem
                                    ? +((getCurrentPrice(unitSelectionPendingItem)) / (unitSelectionPendingItem.transfer_conversion_factor ?? 1)).toFixed(2)
                                    : 0}
                            </span>
                            <span className="text-xs text-gray-400">
                                Stock: {unitSelectionPendingItem?.nos_stock?.toFixed(2) ?? '—'}
                            </span>
                            <span className="text-xs text-blue-400">
                                1 {unitSelectionPendingItem?.from_unit_name ?? 'Bundle'} = {unitSelectionPendingItem?.transfer_conversion_factor ?? 1} {unitSelectionPendingItem?.to_unit_name ?? 'pcs'}
                            </span>
                            {unitSelectionFocus === 'nos' && (
                                <span className="text-[10px] text-green-500 font-medium">↵ Enter to select</span>
                            )}
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400 -mt-1">← → Arrow keys to switch &nbsp;|&nbsp; Enter to confirm</p>
                    <DialogFooter>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => { setIsUnitSelectionOpen(false); setUnitSelectionPendingItem(null); }}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Card Price Confirmation Dialog */}
            <Dialog open={showCardPriceConfirmation} onOpenChange={setShowCardPriceConfirmation}>
                <DialogContent className="max-w-md w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            Apply Card Prices
                        </DialogTitle>
                        <DialogDescription>
                            Do you want to apply card prices to all items in the list?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={cancelCardPrices}>
                            No
                        </Button>
                        <Button onClick={applyCardPrices} className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto">
                            Yes, Apply Card Prices
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
};

export default Edit;
