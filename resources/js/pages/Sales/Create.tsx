import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import {
    Plus,
    RefreshCcw,
    CreditCard,
    Wallet,
    TrendingUp,
    Banknote,
    Receipt,
    X,
    Search,
    Printer,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import axios from 'axios';
import PrivilegeAccessModal from './components/PrivilegeAccessModal';
import BatchSelectionModal from './components/BatchSelectionModal';
import SaleInformationForm from './components/SaleInformationForm';
import EntryModeToggle from './components/EntryModeToggle';
import ItemEntryForm from './components/ItemEntryForm';
import PrinterEntryForm from './components/PrinterEntryForm';
import ItemsListTable from './components/ItemsListTable';
import PrintersListTable from './components/PrintersListTable';
import PaymentTotalsSection from './components/PaymentTotalsSection';
import ItemNameListModal from './components/ItemNameListModal';
import BarcodeSelectionModal from '@/components/pos/BarcodeSelectionModal';
import HoldSalesModal from './components/HoldSalesModal';
import AdminAuthModal from '@/components/pos/AdminAuthModal';
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
    discount_type?: string;
    // when card prices are applied we store the original discount so it can
    // be restored later if payment mode returns to cash
    original_discount_amount?: number;
    stock?: number;
    retail_price: number;
    wholesale_price: number;
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
    cus_discount_rate?: number;
    cus_discount_type?: 'fixed' | 'percentage';
    // free_issue_scheme_buy_qty?: number;
    // free_issue_scheme_get_qty?: number;
    // wholesale_min_qty?: number | null;
    sell_unit_type?: 'bundle' | 'nos';
    is_service?: boolean;
}

interface Customer {
    code: string;
    name: string;
    phone?: string;
    is_vat_registered?: boolean;
    vat_no?: string;
    outstanding_balance?: number;
    is_privilege_user?: boolean;
}

export interface ItemMaster {
    item_code: string;
    item_name: string;
    unit_price: number;
    our_price: number;
    cost_price: number;
    retail_price: number;
    wholesale_price: number;
    extra_price: number;

    stock: number;
    barcode: string;
    batch_no?: string | null;
    itm_ky?: number;
    serial_number?: string;
    brand?: string;
    free_issue_scheme_buy_qty?: number;
    free_issue_scheme_get_qty?: number;
    wholesale_min_qty?: number | null;
    model?: string;
    warranty?: string;
    category?: string;
    unit?: string;
    is_service?: boolean;
    vat_inclusive?: boolean;
    cus_discount_rate?: number;
    cus_discount_type?: 'fixed' | 'percentage';
    // Unit conversion fields
    transfer_conversion_factor?: number;
    from_unit_name?: string | null;
    to_unit_name?: string | null;
    // Split stock: bundle units vs converted NOS units
    nos_stock?: number;
    bundle_stock?: number;
    // Which unit type was selected when adding this item to a sale
    sell_unit_type?: 'bundle' | 'nos';
    // Quantity-based discount tiers
    tiers?: {
        tier1?: { qty: number | null; discount: number | null };
        tier2?: { qty: number | null; discount: number | null };
    };
    cred_tiers?: {
        tier1?: { qty: number | null; discount: number | null };
        tier2?: { qty: number | null; discount: number | null };
    };
    batches?: ItemMaster[];
}

const QuickReceiptPreview = ({ data, companyInfo, selectedCustomer, cashierName }: any) => {
    const vatRate = Number(data.vat_rate) || 0;
    const vatMultiplier = 1 + (vatRate / 100);
    const dateStr = new Date().toLocaleString();

    return (
        <div className="bg-white border rounded-lg shadow-inner p-4 font-mono text-[11px] leading-tight text-black max-w-[300px] mx-auto overflow-hidden">
            <div className="text-center mb-4">
                <img
                    src="https://www.vismass.lk/wp-content/uploads/2023/12/vismass.png"
                    alt="Logo"
                    className="h-16 mx-auto mb-2 object-contain"
                />
                <h2 className="text-xl font-bold uppercase">{companyInfo.name}</h2>
                <p className="text-[10px] mb-1">{companyInfo.address}</p>
                <div className="h-2"></div>
                <p>Tel: {companyInfo.phone}</p>
                <div className="h-2"></div>
                <div className="text-left font-bold text-sm uppercase">
                    SALES RECEIPT
                </div>
            </div>

            <div className="mb-4 space-y-2">
                <div className="flex justify-between">
                    <span className="font-normal">Date:</span>
                    <span className="font-normal">{dateStr}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-normal">Invoice No:</span>
                    <span className="font-normal">{data.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-normal">Cashier:</span>
                    <span className="font-normal">{cashierName || 'Admin'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-normal">Customer:</span>
                    <span className="font-normal">{data.customer_name || 'Walk-in Customer'}</span>
                </div>
            </div>

            <table className="w-full mb-4">
                <thead>
                    <tr className="border-b border-dashed border-black">
                        <th className="text-left font-bold pb-1 text-[10px]">Item</th>
                        <th className="text-right font-bold pb-1 text-[10px]">Qty</th>
                        <th className="text-right font-bold pb-1 text-[10px]">Price</th>
                        <th className="text-right font-bold pb-1 text-[10px]">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item: any, idx: number) => (
                        <React.Fragment key={idx}>
                            <tr>
                                <td colSpan={4} className="pt-1">
                                    {item.item_name.substring(0, 30)}
                                    {item.batch_no && <span className="text-[9px] block">Batch: {item.batch_no}</span>}
                                </td>
                            </tr>
                            {item.warranty && (
                                <tr>
                                    <td colSpan={4} className="text-[9px] text-gray-600 pl-1">
                                        Warranty: {item.warranty}
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td></td>
                                <td className="text-right">{item.quantity}</td>
                                <td className="text-right">{(item.unit_price * vatMultiplier).toFixed(2)}</td>
                                <td className="text-right">{(item.total * vatMultiplier).toFixed(2)}</td>
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                    <span className="font-normal uppercase">SUBTOTAL:</span>
                    <span className="font-normal">{Number(data.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-normal uppercase">DISCOUNT:</span>
                    <span className="font-normal">-{(Number(data.total_discount || 0)).toFixed(2)}</span>
                </div>
                {data.is_vat_invoice && (
                    <div className="flex justify-between">
                        <span className="font-normal uppercase">VAT ({vatRate}%):</span>
                        <span className="font-normal">{Number(data.tax_amount).toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="font-bold uppercase">TOTAL:</span>
                    <span className="font-bold text-sm">{Number(data.total_amount).toFixed(2)}</span>
                </div>
            </div>

            <div className="space-y-2 mb-4 uppercase">
                <div className="flex justify-between">
                    <span>Pay Mode:</span>
                    <span>{data.payment_mode}</span>
                </div>
                <div className="flex justify-between">
                    <span>Cash Paid:</span>
                    <span>{(Number(data.cash_payment) || Number(data.total_amount)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Balance:</span>
                    <span>{Number(data.balance_amount).toFixed(2)}</span>
                </div>
            </div>

            {selectedCustomer && selectedCustomer.code !== '0001' && (
                <div className="space-y-1 mb-4 pt-2 border-t border-dotted border-black uppercase">
                    <div className="flex justify-between">
                        <span className="font-bold">{selectedCustomer.outstanding_balance < 0 ? 'CUS. CREDIT BAL:' : 'CUS. OUTSTANDING:'}</span>
                        <span className="font-bold">
                            {Math.abs(selectedCustomer.outstanding_balance || 0).toFixed(2)}
                            {selectedCustomer.outstanding_balance < 0 ? ' CR' : ''}
                        </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span>Projected Bal:</span>
                        <span>
                            {Math.abs((selectedCustomer.outstanding_balance || 0) + (Number(data.balance_amount) || 0)).toFixed(2)}
                            {((selectedCustomer.outstanding_balance || 0) + (Number(data.balance_amount) || 0)) < 0 ? ' CR' : ''}
                        </span>
                    </div>
                </div>
            )}
            {data.is_vat_invoice && (
                <div className="mt-2 text-[10px] space-y-1 pt-2 uppercase border-t border-dashed border-black">
                    <div className="flex justify-between">
                        <span>VAT Rate:</span>
                        <span>{vatRate}%</span>
                    </div>
                    {companyInfo.vat_no && (
                        <div className="flex justify-between">
                            <span>Company VAT:</span>
                            <span>{companyInfo.vat_no}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Customer VAT:</span>
                        <span>{selectedCustomer?.vat_no || ''}</span>
                    </div>
                </div>
            )}

            <div className="text-center mt-4 text-[10px]">
                Thank you for your business!<br />
                *** Powered by UNITEC ***
            </div>
        </div>
    );
};


interface VatRateInfo {
    vat_rate: number;
    vat_no: string;
}

interface DayBalance {
    opening_balance: number;
    today_cash_sales: number;
    debt_collections: number;
    expenses: number;
    current_balance: number;
    has_opening: boolean;
}

interface CreateProps {
    nextInvoiceNo: string;
    currentDate: string;
    dayBalance?: DayBalance;
    bankAccounts?: Array<{ id: number; bank_name: string; branch_name: string }>;
}

const Create: React.FC<CreateProps> = ({ nextInvoiceNo, currentDate, dayBalance: initialDayBalance, bankAccounts = [] }) => {
    const { auth } = usePage<any>().props;
    // note: bankAccounts also comes through page props, so destructure below if missing
    const pageBankAccounts = usePage<any>().props.bankAccounts || [];
    const effectiveBankAccounts = bankAccounts.length ? bankAccounts : pageBankAccounts;

    const { data, setData, post, processing, errors } = useForm({
        invoice_no: nextInvoiceNo,
        transaction_date: currentDate,
        customer_code: '0001',
        customer_name: 'cash',
        customer_vat_no: '',
        is_vat_invoice: false,
        vat_rate: 0,
        price_type: 'retail',
        items: [] as SaleItem[],
        payment_mode: 'cash',
        subtotal: 0,
        discount_percentage: 0,
        manual_discount_fixed: 0,
        discount_amount: 0,
        total_discount: 0,
        tax_amount: 0,
        total_amount: 0,
        cash_payment: '',
        card_payment: '',
        cheque_payment: '',
        bank_transfer_payment: '',
        credit_used: 0,
        cheque_no: '',
        cheque_bank: '',
        cheque_branch: '',
        cheque_date: new Date().toISOString().split('T')[0],
        bank_ref: '',
        bank_name: '',
        bank_branch: '',
        bank_account_id: '',
        card_bank_account_id: '',
        card_bank_name: '',
        card_bank_branch: '',
        balance_amount: '',
    });

    const [submitting, setSubmitting] = useState(false);

    // Day cash balance
    const [dayBalance, setDayBalance] = useState<DayBalance | null>(initialDayBalance ?? null);

    // VAT breakdown for display in Order Summary
    const [vatBreakdown, setVatBreakdown] = useState<{
        vatable_subtotal: number;
        vat_to_add: number;
        vat_inclusive_subtotal: number;
        vat_extracted: number;
        vat_rate: number;
    }>({
        vatable_subtotal: 0,
        vat_to_add: 0,
        vat_inclusive_subtotal: 0,
        vat_extracted: 0,
        vat_rate: 0,
    });

    const fetchCashBalance = async () => {
        try {
            const res = await axios.get('/sales/cash-balance');
            setDayBalance(res.data);
        } catch (_) { /* silent */ }
    };

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
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [barcodeCandidates, setBarcodeCandidates] = useState<ItemMaster[]>([]);
    const [barcodeMode, setBarcodeMode] = useState(false);

    // Printer states
    const [entryMode, setEntryMode] = useState<'item' | 'printer'>('item');
    const [printerSearch, setPrinterSearch] = useState('');
    const [printers, setPrinters] = useState<any[]>([]);
    const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
    const [includePrinterWarranty, setIncludePrinterWarranty] = useState(true);
    const [selectedPrinterIndex, setSelectedPrinterIndex] = useState(0);

    const [editingQuantity, setEditingQuantity] = useState<{ index: number; quantity: number } | null>(null);
    const [editingDiscount, setEditingDiscount] = useState<{ index: number; discount: number } | null>(null);

    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        is_vat_registered: false,
        vat_no: ''
    });
    const [customerFormErrors, setCustomerFormErrors] = useState<{ [key: string]: string }>({});
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [companyVatInfo, setCompanyVatInfo] = useState<VatRateInfo | null>(null);
    const [companyInfo, setCompanyInfo] = useState({
        name: 'VISMASS PVT LTD',
        address: '32, Ground Floor, Yakkala Park, Kandy Road, Yakkala.',
        phone: '0332234300',
        vat_no: '',
        privilege_users_discount: 0,
        privilege_card_discount: 0
    });
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCardPriceConfirmation, setShowCardPriceConfirmation] = useState(false);

    // Unit selection modal (for items with bundle→NOS conversion)
    const [isUnitSelectionOpen, setIsUnitSelectionOpen] = useState(false);
    const [unitSelectionPendingItem, setUnitSelectionPendingItem] = useState<ItemMaster | null>(null);
    const [unitSelectionFocus, setUnitSelectionFocus] = useState<'bundle' | 'nos'>('bundle');
    // when applying card prices we clear the manual discount; store it so we can restore later
    const [prevManualDiscount, setPrevManualDiscount] = useState<number | null>(null);

    const [adminAuthForDiscountIndex, setAdminAuthForDiscountIndex] = useState<number | null>(null);
    const [isOverallDiscountAuthorized, setIsOverallDiscountAuthorized] = useState(false);
    const [isOverallDiscountAuthModalOpen, setIsOverallDiscountAuthModalOpen] = useState(false);

    const itemCodeRef = useRef<HTMLInputElement>(null);
    const quantityRef = useRef<HTMLInputElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const cashPaymentRef = useRef<HTMLInputElement>(null);
    const cardPaymentRef = useRef<HTMLInputElement>(null);
    const searchItemsAbortRef = useRef<AbortController | null>(null);
    const searchPrintersAbortRef = useRef<AbortController | null>(null);

    // Held Sales State
    const [heldSales, setHeldSales] = useState<any[]>(() => {
        const saved = localStorage.getItem('held_sales');
        return saved ? JSON.parse(saved) : [];
    });
    const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);

    const handleHoldSale = () => {
        if (data.items.length === 0) {
            toast.error('Cannot pause an empty sale');
            return;
        }

        const newHeldSales = [
            ...heldSales,
            { 
                ...data, 
                timestamp: new Date().toISOString(),
                // Store some metadata for display in the modal
                items_count: data.items.length,
                total: data.total_amount
            }
        ];
        setHeldSales(newHeldSales);
        localStorage.setItem('held_sales', JSON.stringify(newHeldSales));
        
        // Reset form for new sale
        resetForm();
        toast.success('Sale paused successfully');
    };

    const handleResumeSale = (index: number) => {
        const saleToResume = heldSales[index];
        
        // Confirm if there is existing items in current bill
        if (data.items.length > 0) {
            if (!window.confirm('Current bill has items. Resuming will overwrite current items. Continue?')) {
                return;
            }
        }

        // Populate form with held sale data
        setData({
            ...saleToResume,
            invoice_no: data.invoice_no, // Keep current session's next invoice no
            transaction_date: data.transaction_date // Keep current date
        });

        // Set selected customer if applicable
        if (saleToResume.customer_code && saleToResume.customer_code !== '0001') {
            setSelectedCustomer({
                code: saleToResume.customer_code,
                name: saleToResume.customer_name,
                is_vat_registered: saleToResume.is_vat_registered,
                vat_no: saleToResume.customer_vat_no
            });
        } else {
            setSelectedCustomer(null);
        }

        // Remove from held sales
        const newHeldSales = heldSales.filter((_, i) => i !== index);
        setHeldSales(newHeldSales);
        localStorage.setItem('held_sales', JSON.stringify(newHeldSales));
        
        setIsHoldModalOpen(false);
        toast.success('Sale resumed');
    };

    const handleDeleteHeldSale = (index: number) => {
        if (!window.confirm('Are you sure you want to delete this paused sale?')) return;
        
        const newHeldSales = heldSales.filter((_, i) => i !== index);
        setHeldSales(newHeldSales);
        localStorage.setItem('held_sales', JSON.stringify(newHeldSales));
    };

    // Toggle fullscreen mode
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(() => {
                // Fullscreen request failed
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    setIsFullscreen(false);
                }).catch(() => {
                    // Exit fullscreen failed
                });

            }
        }
    };

    const [allVatRates, setAllVatRates] = useState<any[]>([]);

    // Fetch VAT & Company Info
    useEffect(() => {
        const fetchInitialData = async () => {
            fetchCashBalance();
            try {
                // Fetch VAT Info
                const vatsRes = await axios.get('/company/vat-rates');
                setAllVatRates(vatsRes.data);

                // Set initial active rate based on current transaction date (defaults to today)
                const currentTransactionDate = data.transaction_date || new Date().toISOString().split('T')[0];
                const activeRate = vatsRes.data.find((r: any) => {
                    // Check if date falls within range
                    const effDate = r.effective_date.split('T')[0]; // assuming ISO string or YYYY-MM-DD
                    const endDate = r.end_date ? r.end_date.split('T')[0] : null;

                    return currentTransactionDate >= effDate && (!endDate || currentTransactionDate <= endDate);
                });

                // If multiple matches (unlikely given how we sort/filter, but let's safe guard to pick most recent effective),
                // we should probably sort the list first or trust find to pick first if sorted.
                // The controller returns sorted by effective_date desc. So first match is the correct one.

                if (activeRate) {
                    setCompanyVatInfo({
                        vat_rate: activeRate.vat_rate,
                        vat_no: activeRate.vat_no
                    });
                    setData(prev => ({ ...prev, vat_rate: activeRate.vat_rate }));
                    setCompanyInfo(prev => ({ ...prev, vat_no: activeRate.vat_no }));
                }

                // Fetch Company Info
                try {
                    const companyRes = await axios.get('/api/company-data'); // Just in case we add it
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
            } catch (error) {
                console.error('Error fetching initial data:', error);
            }
        };
        fetchInitialData();
    }, []);

    // Update VAT rate when transaction date changes
    useEffect(() => {
        if (allVatRates.length > 0 && data.transaction_date) {
            const currentTransactionDate = data.transaction_date;

            // Controller returns orderBy('effective_date', 'desc')
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
                // Also update company VAT info for display if needed
                setCompanyVatInfo({
                    vat_rate: applicableRate.vat_rate,
                    vat_no: applicableRate.vat_no
                });
            }
        }
    }, [data.transaction_date, allVatRates]);

    // Reset selected printer index when printers list changes
    useEffect(() => {
        setSelectedPrinterIndex(0);
    }, [printers]);

    // Keyboard navigation for printer search results
    useEffect(() => {
        if (!isPrinterDialogOpen || printers.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedPrinterIndex(prev => (prev < printers.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedPrinterIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                // If there's an active element (like an input), we might want to let it handle Enter
                // But in this dialog, Enter should select the printer.
                // We check if the target is NOT a button to avoid double triggering
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                    e.preventDefault();
                    const selectedPrinter = printers[selectedPrinterIndex];
                    if (selectedPrinter) {
                        addPrinter(selectedPrinter);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPrinterDialogOpen, printers, selectedPrinterIndex]);

    // Focus item code field on component mount
    useEffect(() => {
        if (itemCodeRef.current) {
            itemCodeRef.current.focus();
        }
    }, []);

    const resetForm = useCallback(() => {
        // Reset form data
        setData({
            invoice_no: nextInvoiceNo,
            transaction_date: currentDate,
            customer_code: '0001',
            customer_name: 'cash',
            customer_vat_no: '',
            is_vat_invoice: false,
            vat_rate: 0,
            price_type: 'retail',
            items: [],
            payment_mode: 'cash',
            subtotal: 0,
            discount_percentage: 0,
            discount_amount: 0,
            total_discount: 0,
            tax_amount: 0,
            total_amount: 0,
            cash_payment: '',
            card_payment: '',
            cheque_payment: '',
            bank_transfer_payment: '',
            credit_used: 0,
            cheque_no: '',
            cheque_bank: '',
            cheque_branch: '',
            cheque_date: new Date().toISOString().split('T')[0],
            bank_ref: '',
            bank_name: '',
            bank_branch: '',
            bank_account_id: '',
            balance_amount: '',
        });

        // Reset component states
        setItemInput({ code: '', name: '', price: 0, quantity: 1, barcode: '', serial_number: '' });
        setSelectedItem(null);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setCustomers([]);
        setItemSearch('');
        setItems([]);
        setPrinterSearch('');
        setPrinters([]);
        setEditingQuantity(null);
        setEditingDiscount(null);
        setCompanyVatInfo(null);
        setBatchCandidates([]);
        setEntryMode('item');
        setVatBreakdown({
            vatable_subtotal: 0,
            vat_to_add: 0,
            vat_inclusive_subtotal: 0,
            vat_extracted: 0,
            vat_rate: 0,
        });

        // Reset fullscreen if active
        if (isFullscreen) {
            toggleFullscreen();
        }

        // Refresh the page to get new invoice number and current date
        window.location.reload();
    }, [nextInvoiceNo, currentDate, isFullscreen]);

    // Focus item code field after reset
    const focusItemCode = () => {
        setTimeout(() => {
            if (itemCodeRef.current) {
                itemCodeRef.current.focus();
            }
        }, 100); // Small delay to ensure DOM is ready
    };

    // Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F7' || (e.ctrlKey && e.key === 's')) {
                e.preventDefault();
                // handleSave();
            } else if (e.key === 'F10') {
                e.preventDefault();
                if (window.confirm('Are you sure you want to reset the entire form? This will clear all entered data.')) {
                    resetForm();
                }
            } else if (e.key === 'F9') {
                e.preventDefault();
                handleHoldSale();
            } else if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            } else if (e.key === '+') {
                e.preventDefault();
                if (showCardPriceConfirmation) {
                    // If card confirmation dialog is showing, focus card payment
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
    }, [data.payment_mode, showCardPriceConfirmation, resetForm]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [data.items, data.cash_payment, data.card_payment, data.cheque_payment, data.bank_transfer_payment, data.credit_used, data.is_vat_invoice, data.vat_rate, data.discount_percentage, data.manual_discount_fixed, data.payment_mode, selectedCustomer, companyInfo.privilege_card_discount, companyInfo.privilege_users_discount]);

    // Update item price when price type or payment mode changes
    useEffect(() => {
        if (selectedItem) {
            const price = getCurrentPrice(selectedItem);
            setItemInput(prev => ({
                ...prev,
                price: price
            }));
        }
    }, [data.price_type, data.payment_mode, selectedItem]);

    // When price_type/payment_mode changes we still want to adjust the prices of
    // any printers already added, even though ordinary items remain unchanged.
    useEffect(() => {
        if (data.items.length > 0) {
            const updatedItems = data.items.map((item: SaleItem) => {
                if (item.serial_number && item.serial_number.toString().trim() !== '') {
                    const newPrice = getCurrentPrice(item);
                    const total = (item.quantity || 1) * newPrice - (item.discount_amount || 0);
                    return {
                        ...item,
                        unit_price: newPrice,
                        our_price: newPrice,
                        total,
                    };
                }
                return item;
            });
            setData('items', updatedItems);
        }
    }, [data.price_type, data.payment_mode]);

    // Update all items in table when price type or payment mode changes - REMOVED per user request
    // The user wants price type changes to ONLY affect the item currently being entered (in ItemEntryForm).
    // Once an item is added to the list, its price should remain fixed unless manually edited or if payment mode changes (if desired, though user said "no need to change the prices in the Item").
    // However, we might still want to update if PAYMENT MODE changes to CARD if card prices are different?
    // The user specifically said "after added this to the Item List table no need to change the prices in the Item".
    // So we completely remove this auto-update effect.
    /*
    useEffect(() => {
        if (data.items.length > 0) {
            const updatedItems = data.items.map(item => {
                const newPrice = getCurrentPrice(item);
                return {
                    ...item,
                    unit_price: newPrice,
                    our_price: newPrice,
                    total: newPrice * item.quantity
                };
            });
            setData('items', updatedItems);
        }
    }, [data.price_type, data.payment_mode]);
    */

    // Clear forms when switching modes
    useEffect(() => {
        if (entryMode === 'printer') {
            resetItemInput();
        } else if (entryMode === 'item') {
            setPrinterSearch('');
            setPrinters([]);
        }
    }, [entryMode]);

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
        let vatInclSubtotal = 0;  // Net amount for VAT-inclusive items (after item discount) - VAT will be EXTRACTED

        // If privilege customer, forcefully strip ALL item-level discounts from the state
        let itemsChanged = false;
        const updatedItems = data.items.map(item => {
            const newItem = { ...item };
            if (selectedCustomer?.is_privilege_user && Number(newItem.discount_amount || 0) !== 0) {
                newItem.discount_amount = 0;
                newItem.discount_percentage = 0;
                if (newItem.original_discount_amount !== undefined) newItem.original_discount_amount = 0;
                itemsChanged = true;
            }
            return newItem;
        });

        // Calculate gross total, item-level discounts, and vatable subtotals
        // Sri Lankan VAT standard: VAT base = net selling price AFTER discount
        updatedItems.forEach(item => {
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
                vatInclSubtotal += itemNet;
            }
        });

        // Net total after item-level discounts but before manual percentage discount
        const netAfterItemDiscounts = itemsGrossTotal - itemLevelDiscounts;
        
        // Apply the manual/privilege discount percentage + fixed manual discount
        let manualDiscountAmount = (netAfterItemDiscounts * (manualDiscountPercentage / 100)) + manualDiscountFixed;
        
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
            vatExtracted = vatInclSubtotal - (vatInclSubtotal / vatMultiplier);

            // Total VAT on invoice
            tax_amount = vatToAdd + vatExtracted;

            // Final total = gross - all discounts + VAT added for exclusive items
            // (VAT-inclusive items already contain VAT in their price, so no extra addition)
            total = itemsGrossTotal - totalDiscount + vatToAdd;
        } else {
            // No VAT invoice
            tax_amount = 0;
            total = itemsGrossTotal - totalDiscount;
        }

        const paid = Number(data.cash_payment) + Number(data.card_payment) + Number(data.cheque_payment) + Number(data.bank_transfer_payment) + Number(data.credit_used);

        // Update VAT breakdown state for display
        setVatBreakdown({
            vatable_subtotal: vatableSubtotal,
            vat_to_add: vatToAdd,
            vat_inclusive_subtotal: vatInclSubtotal,
            vat_extracted: vatExtracted,
            vat_rate: data.vat_rate
        });

        setData(prev => {
            const updates: any = {
                subtotal: itemsGrossTotal,  // Use GROSS total (before discounts)
                tax_amount: tax_amount,
                total_amount: total,
                balance_amount: String(paid - total),
                total_discount: totalDiscount, // Total of item + manual discounts
                discount_amount: manualDiscountAmount, // Manual discount value (calculated from %)
                discount_percentage: manualDiscountPercentage // Updated to use the variable
            };
            
            if (itemsChanged) {
                updates.items = updatedItems;
            }
            
            return { ...prev, ...updates };
        });
    };

    const getCurrentPrice = (item: any) => {
        // Prioritize explicit price types
        if (data.price_type === 'retail') return item.retail_price;
        if (data.price_type === 'wholesale') {
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

    const handlePrivilegeCustomerSelect = (customer: any) => {
        setData(prev => ({
            ...prev,
            customer_code: customer.customer_code,
            customer_name: customer.name,
            price_type: 'wholesale',
            discount_percentage: prev.payment_mode === 'card' ? (companyInfo.privilege_card_discount || 0) : (companyInfo.privilege_users_discount || 0)
        }));

        setSelectedCustomer({
            code: customer.customer_code,
            name: customer.name,
            is_vat_registered: false,
            vat_no: ''
        });

        // Try to fetch more details if available in local DB
        fetchCustomerByCode(customer.customer_code);

        // Close the modal
        setIsPrivilegeModalOpen(false);
    };

    const fetchCustomerByCode = async (code: string) => {
        if (!code || code === '0001') return; // Skip for default/empty
        try {
            const res = await axios.get(`/sales/search/customers?query=${code}&type=customer`);
            if (res.data.length > 0) {
                const c = res.data[0];
                setData(prev => ({
                    ...prev,
                    customer_code: c.code,
                    customer_name: c.name,
                    customer_vat_no: c.vat_no || '',
                    is_vat_invoice: !!c.is_vat_registered,
                    vat_rate: c.is_vat_registered ? (companyVatInfo?.vat_rate || prev.vat_rate) : prev.vat_rate,
                    price_type: c.is_privilege_user ? 'wholesale' : prev.price_type,
                    discount_percentage: c.is_privilege_user ? (prev.payment_mode === 'card' ? (companyInfo.privilege_card_discount || 0) : (companyInfo.privilege_users_discount || 0)) : prev.discount_percentage
                }));
                setSelectedCustomer(c);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const searchItems = async (query: string) => {
        if (!query) {
            setItems([]);
            setIsDropdownOpen(false);
            return;
        }
        if (searchItemsAbortRef.current) searchItemsAbortRef.current.abort();
        searchItemsAbortRef.current = new AbortController();
        try {
            const res = await axios.get(`/sales/search/items?query=${query}`, {
                signal: searchItemsAbortRef.current.signal,
                timeout: 10000
            });
            if (res.data.length > 0) {
                // Check if search was likely a barcode scan (exact match on barcode)
                const queryUpper = query.toUpperCase();
                const exactBarcodeMatches = res.data.filter((item: ItemMaster) => 
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
                        
                        // Check if it's a unit conversion item - if so we still need to show the unit selection modal
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
                    return; // Stop here, modal will handle selection
                }

                setItems(res.data);
                setIsDropdownOpen(true);
            } else {
                setItems([]);
                setIsDropdownOpen(false);
            }
        } catch (err: any) {
            if (err.code !== 'ECONNABORTED') console.error('Search items error:', err);
        }
    };

    // Item Selection from dropdown
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
        const price = getCurrentPrice(item);
        setItemInput({
            ...itemInput,
            code: item.item_code,
            name: item.item_name,
            price: price,
            barcode: item.barcode,
            serial_number: item.serial_number || ''
        });
        setItems([]);
        setIsItemDialogOpen(false);
    };

    // Keyboard navigation for unit selection dialog.
    // We delay attaching the listener by one frame so that a keyboard Enter used
    // to confirm a batch selection (in BatchSelectionModal) cannot also immediately
    // auto-confirm the unit selection dialog that opens as a result.
    useEffect(() => {
        if (!isUnitSelectionOpen) return;
        setUnitSelectionFocus('bundle'); // default to bundle when dialog opens
        let cleanup: (() => void) | undefined;
        const timer = setTimeout(() => {
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    setUnitSelectionFocus(prev => prev === 'bundle' ? 'nos' : 'bundle');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    setUnitSelectionFocus(prev => {
                        confirmUnitSelection(prev);
                        return prev;
                    });
                }
            };
            window.addEventListener('keydown', handleKey);
            cleanup = () => window.removeEventListener('keydown', handleKey);
        }, 50); // 50 ms — one frame after opening, avoids catching the triggering Enter
        return () => {
            clearTimeout(timer);
            cleanup?.();
        };
    }, [isUnitSelectionOpen]);

    // Called when user confirms bundle or NOS from the unit selection modal
    const confirmUnitSelection = (unitType: 'bundle' | 'nos') => {
        if (!unitSelectionPendingItem) return;
        const item = unitSelectionPendingItem;
        const factor = item.transfer_conversion_factor ?? 1;
        const basePrice = getCurrentPrice(item);
        const price = unitType === 'nos' ? +(basePrice / factor).toFixed(4) : basePrice;
        const unitLabel = unitType === 'nos' ? (item.to_unit_name ?? item.unit) : (item.from_unit_name ?? item.unit);

        // Build a modified item copy so the rest of the logic sees the right price/unit
        // Use the pre-split stock figure: nos_stock for NOS, bundle_stock for Bundle
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
        // For stationary items, just set selectedItem for manual addition
        if (item.serial_number && item.serial_number.trim() !== '') {
            // This is a printer - add it directly to cart with adjusted prices
            const tiers = item.tiers || {};
            
            let discountAmount = 0;
            if (data.price_type !== 'wholesale') {
                const tierCarrier = {
                    tier1_qty: tiers.tier1?.qty,
                    tier1_discount: tiers.tier1?.discount,
                    tier2_qty: tiers.tier2?.qty,
                    tier2_discount: tiers.tier2?.discount,
                    cred_tier1_qty: item.cred_tiers?.tier1?.qty,
                    cred_tier1_discount: item.cred_tiers?.tier1?.discount,
                    cred_tier2_qty: item.cred_tiers?.tier2?.qty,
                    cred_tier2_discount: item.cred_tiers?.tier2?.discount,
                    cus_discount_type: item.cus_discount_type,
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
                cus_discount_type: item.cus_discount_type || 'fixed',
                tier1_qty: tiers.tier1?.qty,
                tier1_discount: tiers.tier1?.discount,
                tier2_qty: tiers.tier2?.qty,
                tier2_discount: tiers.tier2?.discount,
                cred_tier1_qty: item.cred_tiers?.tier1?.qty,
                cred_tier1_discount: item.cred_tiers?.tier1?.discount,
                cred_tier2_qty: item.cred_tiers?.tier2?.qty,
                cred_tier2_discount: item.cred_tiers?.tier2?.discount,
            };

            setData('items', [...data.items, newItem]);
            setPrinterSearch('');
        } else {
            // Stationary item - just set selectedItem for manual addition via form
            setSelectedItem(modifiedItem);
            setItemInput({
                ...itemInput,
                code: item.item_code,
                name: item.item_name,
                price,
                barcode: item.barcode,
                serial_number: item.serial_number || '',
            });
        }
        
        setIsUnitSelectionOpen(false);
        setUnitSelectionPendingItem(null);
    };

    // Handle payment mode changes with confirmation for card payment
    const handlePaymentModeChange = (newMode: string) => {
        if (data.items.length === 0) {
            setData('payment_mode', newMode);
            return;
        }

        // Modes that use card-like pricing (retail price + credit tiers)
        const cardLikeModes = ['card', 'credit', 'cheque'];
        // Modes that use cash-like pricing (original price + retail tiers)
        const cashLikeModes = ['cash', 'bank_transfer'];

        const wasCardLike = cardLikeModes.includes(data.payment_mode);
        const isCardLike = cardLikeModes.includes(newMode);
        const shouldRestore = wasCardLike && !isCardLike;
        const shouldApplyCardPricing = isCardLike && !wasCardLike;

        let restoredItems = data.items;

        // Step 1: Restore original prices if switching away from card-like mode
        if (shouldRestore) {
            restoredItems = restoredItems.map((item: SaleItem) => {
                const originalPrice = (item as any).original_unit_price ?? item.unit_price;
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
        }

        let newDiscountPercentage = data.discount_percentage;
        const preservedDiscount = prevManualDiscount;

        if (shouldRestore && preservedDiscount !== null) {
            newDiscountPercentage = preservedDiscount;
        }

        // Determine if privilege user discount applies
        const isPrivilege = !!selectedCustomer?.is_privilege_user;

        let updates: any = { payment_mode: newMode };

        // Step 2a: Apply card-like pricing (retail price + credit tiers) when switching TO card/credit
        if (shouldApplyCardPricing && restoredItems.length > 0) {
            if (preservedDiscount === null && !isPrivilege) {
                setPrevManualDiscount(data.discount_percentage || 0);
            }
            const updatedItems = restoredItems.map((item: SaleItem) => {
                const targetPrice = item.retail_price;
                // Build carrier for tier calc (SaleItem has all required fields)
                const carrier = {
                    tier1_qty: item.tier1_qty,
                    tier1_discount: item.tier1_discount,
                    tier2_qty: item.tier2_qty,
                    tier2_discount: item.tier2_discount,
                    cred_tier1_qty: item.cred_tier1_qty,
                    cred_tier1_discount: item.cred_tier1_discount,
                    cred_tier2_qty: item.cred_tier2_qty,
                    cred_tier2_discount: item.cred_tier2_discount,
                    cus_discount_type: item.cus_discount_type,
                    cus_discount_rate: item.cus_discount_rate,
                };
                // Calculate tier discount on the target price (retail_price for card/credit)
                let newDiscountAmount = calcTierDiscountForItem(carrier, item.quantity, targetPrice, newMode);
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
            updates.items = updatedItems;
            
            let privDiscount = 0;
            if (isPrivilege) {
                 privDiscount = newMode === 'card' ? (companyInfo.privilege_card_discount || 0) : (companyInfo.privilege_users_discount || 0);
            }
            updates.discount_percentage = privDiscount;
        }
        // Step 2b: Apply cash-like pricing (original/restored price + retail tiers) when switching TO cash/bank_transfer
        else if (!shouldApplyCardPricing && cashLikeModes.includes(newMode) && restoredItems.length > 0) {
            // This handles: card/credit → cash/bank_transfer, and any mode → cash/bank_transfer
            const updatedItems = restoredItems.map((item: SaleItem) => {
                // Use the restored price (original_unit_price or current unit_price)
                const targetPrice = item.unit_price;
                // Build carrier for tier calc
                const carrier = {
                    tier1_qty: item.tier1_qty,
                    tier1_discount: item.tier1_discount,
                    tier2_qty: item.tier2_qty,
                    tier2_discount: item.tier2_discount,
                    cred_tier1_qty: item.cred_tier1_qty,
                    cred_tier1_discount: item.cred_tier1_discount,
                    cred_tier2_qty: item.cred_tier2_qty,
                    cred_tier2_discount: item.cred_tier2_discount,
                    cus_discount_type: item.cus_discount_type,
                    cus_discount_rate: item.cus_discount_rate,
                };
                // Calculate tier discount on the restored price (newMode is cash-like, so retail tiers used)
                let newDiscountAmount = calcTierDiscountForItem(carrier, item.quantity, targetPrice, newMode);
                const newTotal = (targetPrice * item.quantity) - newDiscountAmount;

                return {
                    ...item,
                    unit_price: targetPrice,
                    our_price: targetPrice,
                    total: newTotal,
                    discount_amount: newDiscountAmount,
                };
            });
            updates.items = updatedItems;
            updates.discount_percentage = isPrivilege ? (companyInfo.privilege_users_discount || 0) : newDiscountPercentage;
            if (shouldRestore) setPrevManualDiscount(null);
        }

        // Step 3: Restored but not applying any new pricing (shouldn't normally reach here)
        else if (shouldRestore && restoredItems !== data.items) {
            updates.items = restoredItems;
            updates.discount_percentage = isPrivilege ? (companyInfo.privilege_users_discount || 0) : newDiscountPercentage;
            setPrevManualDiscount(null);
        }

        // Step 4: For card mode, reset other payment inputs; for credit keep entered amounts
        if (newMode === 'card') {
            updates.cash_payment = '';
            updates.cheque_payment = '';
            updates.bank_transfer_payment = '';
        }

        setData(prev => ({ ...prev, ...updates }));
    };

    // Apply card prices to all items
    const applyCardPrices = () => {
        handlePaymentModeChange('card');
        setShowCardPriceConfirmation(false);
    };

    // Cancel card price application
    const cancelCardPrices = () => {
        setShowCardPriceConfirmation(false);
    };

    const searchItemsForDialog = async (query: string) => {
        // This function seems unused or redundant with our new searchItems logic.
        // Alternative search function for dialog usage
        if (!query) {
            setItems([]);
            return;
        }
        try {
            const res = await axios.get(`/sales/search/items?query=${query}`);
            setItems(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const searchPrinters = async (query: string) => {
        if (!query) {
            setPrinters([]);
            return;
        }
        if (searchPrintersAbortRef.current) searchPrintersAbortRef.current.abort();
        searchPrintersAbortRef.current = new AbortController();
        try {
            const url = `/sales/search/printers?query=${encodeURIComponent(query)}&price_type=${encodeURIComponent(data.price_type)}`;
            const res = await axios.get(url, {
                signal: searchPrintersAbortRef.current.signal,
                timeout: 15000
            });
            if (res.data.length === 0) {
                setPrinters([]);
                setIsPrinterDialogOpen(true);
            } else if (res.data.length === 1 && entryMode === 'printer' && !isPrinterDialogOpen) {
                const printer = res.data[0];
                addPrinter(printer);
            } else {
                setPrinters(res.data);
                setIsPrinterDialogOpen(true);
            }
        } catch (err: any) {
            if (err.code !== 'ECONNABORTED' && err.message !== 'Cancel') {
                console.error('Printer search error:', err);
            }
        }
    };

    const addPrinter = (printer: any) => {
        // Check if this exact serial number is already added
        const existingPrinterWithSameSerial = data.items.findIndex(
            item => item.serial_number && item.serial_number === printer.serial_number
        );

        if (existingPrinterWithSameSerial !== -1) {
            toast.error('Duplicate Printer Detected', {
                description: `Printer with serial number ${printer.serial_number} is already added to this sale.`,
            });
            setPrinterSearch('');
            setPrinters([]);
            setIsPrinterDialogOpen(false);
            return;
        }

        // Check if printer has unit conversion - if so, ask user which unit to sell in
        if ((printer.transfer_conversion_factor ?? 1) > 1 && printer.to_unit_name) {
            setUnitSelectionPendingItem(printer);
            setIsUnitSelectionOpen(true);
            setPrinters([]);
            setIsPrinterDialogOpen(false);
            return;
        }

        // Add printer to the sale
        const price = getCurrentPrice(printer);

        // Apply customer discount if available (Reset to 0 if wholesale)
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
                cus_discount_rate: printer.cus_discount_rate,
            };
            discountAmount = calcTierDiscountForItem(tierCarrier, 1, price, data.payment_mode);
        }


        const newItem: SaleItem = {
            item_code: printer.item_code,
            item_name: printer.item_name,
            unit_price: price,
            our_price: price,
            cost_price: printer.cost_price,
            quantity: 1,
            free_quantity: 0,
            total: price - discountAmount,
            discount_amount: discountAmount,
            stock: printer.stock,
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
            vat_inclusive: printer.vat_inclusive || false,
            cus_discount_rate: printer.cus_discount_rate || 0,
            cus_discount_type: printer.cus_discount_type || 'fixed',
            // Store tier information for future quantity changes
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
        setPrinters([]);
        setIsPrinterDialogOpen(false);
    };

    const addSpecificItem = (item: ItemMaster, quantity: number, priceOverride?: number, serialNumber: string = '') => {
        // Service items bypass stock validation (they can always be added)
        const isService = item.is_service === true;

        // Check if item is out of stock completely (only for regular items, not services)
        if (!isService && item.stock <= 0) {
            toast.error('Item Out of Stock', {
                description: `This item (${item.item_name}) has no available stock.`
            });
            return false;
        }

        // Check against input quantity vs stock for new addition (only for regular items)
        if (!isService && quantity > item.stock) {
            toast.error('Insufficient Stock', {
                description: `Only ${item.stock} items available. You entered ${quantity}.`
            });
            return false;
        }

        // Check if item already exists by item_code and batch_no
        const existingIndex = data.items.findIndex(i => i.item_code === item.item_code && i.batch_no === item.batch_no);

        if (existingIndex >= 0) {
            // Check if adding more quantity exceeds stock (only for regular items)
            const currentQuantity = data.items[existingIndex].quantity;
            const newQuantity = currentQuantity + quantity;

            if (!isService && newQuantity > item.stock) {
                toast.error('Insufficient Stock', {
                    description: `Only ${item.stock} items available across this batch. Your cart already has ${currentQuantity}.`
                });
                return false;
            }

            // Use updateQuantity to properly recalculate discount and free quantity
            updateQuantity(existingIndex, newQuantity);
        } else {
            // Calculate initial discount based on quantity (respects RtDisType1
            // AND the current payment mode: retail tiers for cash/bank, cred tiers for card/credit)
            const basePrice = priceOverride ?? getCurrentPrice(item);
            const tiers = item.tiers || {};
            const tierCarrier = {
                tier1_qty: tiers.tier1?.qty,
                tier1_discount: tiers.tier1?.discount,
                tier2_qty: tiers.tier2?.qty,
                tier2_discount: tiers.tier2?.discount,
                cred_tier1_qty: item.cred_tiers?.tier1?.qty,
                cred_tier1_discount: item.cred_tiers?.tier1?.discount,
                cred_tier2_qty: item.cred_tiers?.tier2?.qty,
                cred_tier2_discount: item.cred_tiers?.tier2?.discount,
                cus_discount_type: item.cus_discount_type,
                cus_discount_rate: item.cus_discount_rate,
            };
            // Calculate initial discount based on quantity
            let discountAmount = calcTierDiscountForItem(
                tierCarrier,
                quantity,
                basePrice,
                data.payment_mode
            );

            // Calculate free quantity
            const freeQuantity = 0;
            /* 
            if (item.free_issue_scheme_buy_qty && item.free_issue_scheme_get_qty) {
                const buyQty = item.free_issue_scheme_buy_qty;
                const getQty = item.free_issue_scheme_get_qty;
                if (buyQty > 0) {
                    freeQuantity = Math.floor(quantity / buyQty) * getQty;
                }
            }
            */

            // Price logic
            let effectivePrice = basePrice;

            // Add new item
            const newItem: SaleItem = {
                item_code: item.item_code,
                item_name: item.item_name,
                unit_price: effectivePrice,
                our_price: effectivePrice,
                cost_price: item.cost_price,
                quantity: quantity,
                free_quantity: freeQuantity,
                total: (effectivePrice * quantity) - discountAmount,
                discount_amount: discountAmount,
                stock: item.stock,
                retail_price: item.retail_price,
                wholesale_price: item.wholesale_price,
                extra_price: item.extra_price,

                batch_no: item.batch_no,
                itm_ky: item.itm_ky,
                serial_number: serialNumber || item.serial_number || '',
                barcode: item.barcode,
                brand: item.brand,
                model: item.model,
                category: item.category,
                unit: item.unit,
                vat_inclusive: item.vat_inclusive || false,
                cus_discount_rate: item.cus_discount_rate || 0,
                cus_discount_type: item.cus_discount_type || 'fixed',
                // free_issue_scheme_buy_qty: item.free_issue_scheme_buy_qty,
                // free_issue_scheme_get_qty: item.free_issue_scheme_get_qty,
                // wholesale_min_qty: item.wholesale_min_qty,
                sell_unit_type: item.sell_unit_type,
                // Store tier information for future quantity changes
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
        }
        return true;
    };

    const addItem = () => {
        if (!itemInput.code || !selectedItem) return;
        
        const success = addSpecificItem(selectedItem, itemInput.quantity, itemInput.price, itemInput.serial_number);
        if (success) {
            resetItemInput();
        }
    };

    const resetItemInput = useCallback(() => {
        setItemInput({ code: '', name: '', price: 0, quantity: 1, barcode: '', serial_number: '' });
        setSelectedItem(null);
        setItemSearch('');
        setItems([]);
        setIsDropdownOpen(false);
        itemCodeRef.current?.focus();
    }, []);

    const removeItem = (index: number) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
    };

    const removePrinter = (index: number) => {
        const newItems = [...data.items];
        newItems.splice(index, 1);
        setData('items', newItems);
    };

    const startEditingQuantity = (index: number) => {
        setEditingQuantity({ index, quantity: data.items[index].quantity });
    };

    const updateQuantity = (index: number, newQuantity: number) => {
        if (newQuantity <= 0) return;

        const newItems = [...data.items];
        const item = newItems[index];

        // Check stock availability if stock information exists
        if (item.stock !== undefined && newQuantity > item.stock && !item.is_service) {
            toast.error('Insufficient Stock', {
                description: `Cannot update quantity to ${newQuantity}. Only ${item.stock} items available.`
            });
            return;
        }

        // Calculate quantity-based discount (respects RtDisType1: fixed Rs vs percentage)
        const discountAmount = calcTierDiscountForItem(
            item,
            newQuantity,
            item.unit_price,
            data.payment_mode
        );

        // Apply customer discount if available (fixed amount in Rs)
        // Removed customer discount rate from batches as requested

        // Calculate free quantity
        const freeQuantity = 0;
        /*
        if (item.free_issue_scheme_buy_qty && item.free_issue_scheme_get_qty) {
            const buyQty = item.free_issue_scheme_buy_qty;
            const getQty = item.free_issue_scheme_get_qty;
            if (buyQty > 0) {
                freeQuantity = Math.floor(newQuantity / buyQty) * getQty;
            }
        }
        */

        let unitPrice = item.unit_price;

        newItems[index] = {
            ...newItems[index],
            quantity: newQuantity,
            unit_price: unitPrice,
            our_price: unitPrice,
            free_quantity: freeQuantity,
            discount_amount: discountAmount,
            total: (newQuantity * unitPrice) - discountAmount
        };
        setData('items', newItems);
        setEditingQuantity(null);
    };

    const cancelEditingQuantity = () => {
        setEditingQuantity(null);
    };

    const startEditingDiscount = (index: number) => {
        setAdminAuthForDiscountIndex(index);
    };

    const handleAuthorizeDiscountEdit = () => {
        if (adminAuthForDiscountIndex !== null) {
            setEditingDiscount({ index: adminAuthForDiscountIndex, discount: data.items[adminAuthForDiscountIndex].discount_amount || 0 });
            setAdminAuthForDiscountIndex(null);
        }
    };

    const updateDiscount = (index: number, newDiscount: number) => {
        if (newDiscount < 0) return;

        const newItems = [...data.items];
        newItems[index] = {
            ...newItems[index],
            discount_amount: newDiscount,
            total: (newItems[index].quantity * newItems[index].unit_price) - newDiscount
        };
        setData('items', newItems);
        setEditingDiscount(null);
    };

    const cancelEditingDiscount = () => {
        setEditingDiscount(null);
    };

    const createCustomer = async () => {
        if (!customerForm.name.trim()) {
            setCustomerFormErrors({ name: 'Name is required' });
            return;
        }

        setIsCreatingCustomer(true);
        setCustomerFormErrors({});

        // Split name into first and last name
        const FstNm = customerForm.name.trim();

        try {
            const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const response = await axios.post('/customers', {
                FstNm: FstNm,
                Email: customerForm.email || null,
                TP1: customerForm.phone || null,
                fVATRegistered: customerForm.is_vat_registered,
                VATNo: customerForm.vat_no || null
            }, {
                headers: {
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            // Update the selected customer
            const newCust = response.data.customer;
            setData(prev => ({
                ...prev,
                customer_code: newCust.AdrCd,
                customer_name: newCust.FstNm,
                customer_vat_no: newCust.VATNo || '',
                is_vat_invoice: !!newCust.fVATRegistered
            }));

            setSelectedCustomer({
                code: newCust.AdrCd,
                name: newCust.FstNm,
                is_vat_registered: !!newCust.fVATRegistered,
                vat_no: newCust.VATNo
            });

            // Close dialog and reset form
            setIsCustomerCreateDialogOpen(false);
            setCustomerForm({ name: '', phone: '', email: '', is_vat_registered: false, vat_no: '' });
        } catch (error: any) {
            if (error.response?.data?.errors) {
                // Map backend field names to frontend field names
                const mappedErrors: { [key: string]: string } = {};
                Object.keys(error.response.data.errors).forEach(key => {
                    const errorMessage = error.response.data.errors[key][0] || 'Invalid input';
                    if (key === 'FstNm') {
                        mappedErrors.name = errorMessage;
                    } else if (key === 'Email') {
                        mappedErrors.email = errorMessage;
                    } else if (key === 'TP1') {
                        mappedErrors.phone = errorMessage;
                    } else {
                        mappedErrors[key] = errorMessage;
                    }
                });
                setCustomerFormErrors(mappedErrors);
            } else {
                setCustomerFormErrors({ general: 'Failed to create customer' });
            }
        } finally {
            setIsCreatingCustomer(false);
        }
    };

    const printInvoice = (saleId: number | string) => {
        return new Promise<void>((resolve) => {
            try {
                const toastId = toast.loading('Generating receipt...');

                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = `/sales/${saleId}/invoice`;
                document.body.appendChild(iframe);

                iframe.onload = () => {
                    toast.dismiss(toastId);
                    toast.success('Print command sent.', { duration: 2000 });
                    
                    // The HTML contains an autoPrint script, so it will print automatically
                    // We just need to resolve the promise to let handleSave continue
                    setTimeout(() => resolve(), 500);

                    // Clean up after it prints
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 10000);
                };
            } catch (error) {
                console.error('Error printing invoice:', error);
                toast.error('Auto-print failed');
                resolve();
            }
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (processing || submitting) return; // avoid double submission

        const paidAmount =
            Number(data.cash_payment || 0) +
            Number(data.card_payment || 0) +
            Number(data.cheque_payment || 0) +
            Number(data.bank_transfer_payment || 0) +
            Number(data.credit_used || 0);  // include credit balance applied
        const outstandingAmount = Number(data.total_amount || 0) - paidAmount;
        const itemDiscountTotal = data.items.reduce((sum: number, item: SaleItem) => {
            return sum + Number(item.discount_amount || 0);
        }, 0);
        const hasAnyDiscount = Number(data.discount_amount || 0) > 0 || itemDiscountTotal > 0;
        // Only restrict discounts when there is an actual unpaid remaining balance.
        // A fully-settled sale (via cash, card, or credit balance) should always allow discounts.
        const hasCreditContext = outstandingAmount > 0;

        // Printer sales require a registered customer
        const hasPrinterItems = data.items.some((item: SaleItem) => item.serial_number && item.serial_number.trim() !== '');
        if (hasPrinterItems && (!data.customer_code || data.customer_code === '0001')) {
            toast.error('Customer Required for Printer Sale', {
                description: 'Please select a registered customer before saving a printer sale.',
                duration: 5000,
            });
            setIsCustomerDialogOpen(true);
            return;
        }

        // Cheque payments require a registered customer
        if (data.payment_mode === 'cheque' && (!data.customer_code || data.customer_code === '0001')) {
            toast.error('Customer Required for Cheque Payment', {
                description: 'Please select a registered customer before saving a cheque payment.',
                duration: 5000,
            });
            setIsCustomerDialogOpen(true);
            return;
        }

        // Partial/Credit payments require a registered customer
        if (hasCreditContext && (!data.customer_code || data.customer_code === '0001')) {
            toast.error('Customer Required for Credit Sale', {
                description: 'Partial payments or credit sales are only allowed for registered customers.',
                duration: 5000,
            });
            setIsCustomerDialogOpen(true);
            return;
        }

        // VAT invoice can contain both VAT-exclusive and VAT-inclusive items.
        // calculateTotals() handles both correctly:
        //   - VAT-exclusive items (vat_inclusive=false): VAT is ADDED to the total
        //   - VAT-inclusive items (vat_inclusive=true):  VAT is EXTRACTED for display only

        setSubmitting(true);

        try {
            // Abort any pending search requests BEFORE submission to prevent request cascade
            if (searchItemsAbortRef.current) searchItemsAbortRef.current.abort();
            if (searchPrintersAbortRef.current) searchPrintersAbortRef.current.abort();

            // Calculate actual totals to avoid async state issues on rapid submission
            let itemsGrossTotal = 0;
            let itemLevelDiscounts = 0;
            let vatableSubtotal = 0;
            let vatInclSubtotal = 0;
            
            const vatRateDecimal = (Number(data.vat_rate) || 0) / 100;

            const itemsToSubmit = data.items.map(item => {
                const newItem = { ...item };
                if (selectedCustomer?.is_privilege_user && Number(newItem.discount_amount || 0) !== 0) {
                    newItem.discount_amount = 0;
                    newItem.discount_percentage = 0;
                }
                return newItem;
            });

            itemsToSubmit.forEach(item => {
                const itemGross = Number(item.unit_price || item.our_price || 0) * Number(item.quantity || 0);
                itemsGrossTotal += itemGross;

                const itemDiscount = Number(item.discount_amount || 0);
                itemLevelDiscounts += itemDiscount;

                const itemNet = itemGross - itemDiscount;

                if (!item.vat_inclusive) {
                    vatableSubtotal += itemNet;
                } else {
                    vatInclSubtotal += itemNet;
                }
            });

            const netAfterItemDiscounts = itemsGrossTotal - itemLevelDiscounts;
            
            // Privilege manual discount calculation
            let manualDiscountPercentage = Number(data.discount_percentage) || 0;
            if (selectedCustomer?.is_privilege_user) {
                if (data.payment_mode === 'card') {
                    manualDiscountPercentage = Number(companyInfo?.privilege_card_discount || 0);
                } else if (data.payment_mode === 'credit') {
                    manualDiscountPercentage = 0;
                } else {
                    manualDiscountPercentage = Number(companyInfo?.privilege_users_discount || 0);
                }
            }
            const manualDiscountFixed = Number(data.manual_discount_fixed) || 0;
            let manualDiscountAmount = (netAfterItemDiscounts * (manualDiscountPercentage / 100)) + manualDiscountFixed;
            if (manualDiscountAmount > netAfterItemDiscounts) manualDiscountAmount = netAfterItemDiscounts;
            const totalDiscount = itemLevelDiscounts + manualDiscountAmount;

            let tax_amount = 0;
            let total = 0;
            let vatToAdd = 0;
            let vatExtracted = 0;

            if (data.is_vat_invoice) {
                vatToAdd = vatableSubtotal * vatRateDecimal;
                const vatMultiplier = 1 + vatRateDecimal;
                vatExtracted = vatInclSubtotal - (vatInclSubtotal / vatMultiplier);
                tax_amount = vatToAdd + vatExtracted;
                total = itemsGrossTotal - totalDiscount + vatToAdd;
            } else {
                total = itemsGrossTotal - totalDiscount;
            }

            // Build a normalized payload to avoid 422s from empty-string numeric/id fields.
            const requestData = {
                ...data,
                items: itemsToSubmit,
                is_vat_invoice: data.is_vat_invoice === true ? 1 : 0,
                subtotal: Number(itemsGrossTotal || 0),
                discount_amount: Number(manualDiscountAmount || 0),
                total_discount: Number(totalDiscount || 0),
                tax_amount: Number(tax_amount || 0),
                total_amount: Number(total || 0),
                vat_rate: Number(data.vat_rate || 0),
                cash_payment: Number(data.cash_payment || 0),
                card_payment: Number(data.card_payment || 0),
                cheque_payment: Number(data.cheque_payment || 0),
                bank_transfer_payment: Number(data.bank_transfer_payment || 0),
                points_redeem: Number((data as any).points_redeem || 0),
                bank_account_id: data.bank_account_id ? Number(data.bank_account_id) : null,
                cheque_date: data.cheque_date || null,
                cheque_no: data.cheque_no || null,
                cheque_bank: data.cheque_bank || null,
                cheque_branch: data.cheque_branch || null,
                bank_ref: data.bank_ref || null,
                bank_name: data.bank_name || null,
                bank_branch: data.bank_branch || null,
            };

            // Use axios to prevent Inertia navigation
            const response = await axios.post('/sales', requestData);
            
            // Refresh cash balance after successful sale - prefer balance from response
            if (response.data.dayBalance) {
                setDayBalance(response.data.dayBalance);
            } else {
                fetchCashBalance();
            }

            // Show success toast notification
            toast.success('Sale completed successfully!', {
                description: `Invoice #${response.data.invoice_no || data.invoice_no} has been saved.`,
                duration: 3000,
            });

            // Auto preview/print invoice using SalesController::generateInvoice
            if (autoPrintEnabled && response.data.sale_id) {
                await printInvoice(response.data.sale_id);
            }

            // Fetch the next invoice number instead of reloading the entire page
            let nextInvoice = nextInvoiceNo;
            let todayDate = currentDate;
            try {
                const nextInvoiceResponse = await axios.get('/sales/next-invoice');
                nextInvoice = nextInvoiceResponse.data.nextInvoiceNo;
                todayDate = nextInvoiceResponse.data.currentDate;
            } catch (err) {
                console.error('Error fetching next invoice number:', err);
                // Fall back to page reload if API fails
                window.location.reload();
                return;
            }

            // Reset all form data to initial state
            setData({
                invoice_no: nextInvoice,
                transaction_date: todayDate,
                customer_code: '0001',
                customer_name: 'cash',
                customer_vat_no: '',
                is_vat_invoice: false,
                vat_rate: 0,
                price_type: 'retail',
                items: [],
                payment_mode: 'cash',
                subtotal: 0,
                discount_percentage: 0,
                discount_amount: 0,
                total_discount: 0,
                tax_amount: 0,
                total_amount: 0,
                cash_payment: '',
                card_payment: '',
                cheque_payment: '',
                bank_transfer_payment: '',
                cheque_no: '',
                cheque_bank: '',
                cheque_branch: '',
                cheque_date: new Date().toISOString().split('T')[0],
                bank_ref: '',
                bank_name: '',
                bank_branch: '',
                bank_account_id: '',
                balance_amount: '',
            });

            // Reset component states
            setItemInput({ code: '', name: '', price: 0, quantity: 1, barcode: '', serial_number: '' });
            setSelectedItem(null);
            setSelectedCustomer(null);
            setCustomerSearch('');
            setCustomers([]);
            setItemSearch('');
            setItems([]);
            setPrinterSearch('');
            setPrinters([]);
            setEditingQuantity(null);
            setEditingDiscount(null);
            setCompanyVatInfo(null);
            setBatchCandidates([]);
            setVatBreakdown({
                vatable_subtotal: 0,
                vat_to_add: 0,
                vat_inclusive_subtotal: 0,
                vat_extracted: 0,
                vat_rate: 0,
            });

            // Reset entry mode to item
            setEntryMode('item');

            // Focus back to item entry field
            setTimeout(() => {
                if (itemCodeRef.current) {
                    itemCodeRef.current.focus();
                }
            }, 100);

            setSubmitting(false);
        } catch (error: any) {
            console.error('Error saving sale:', error);
            setSubmitting(false);
            // Handle validation errors or other errors
            if (error.response?.data?.errors) {
                console.error('Validation errors:', error.response.data.errors);
                const errs = error.response.data.errors;
                // Customer-specific error (e.g. printer sale without registered customer)
                if (errs.customer) {
                    toast.error('Customer Required', {
                        description: errs.customer,
                        duration: 5000,
                    });
                    setIsCustomerDialogOpen(true);
                } else {
                    const firstError =
                        Object.values(errs)
                            .flat()
                            .find((value) => typeof value === 'string') || null;
                    const itemsError = errs.items;
                    const specificItemsError = Array.isArray(itemsError) ? itemsError[0] : itemsError;
                    const messageToShow = firstError || specificItemsError || 'Validation error occurred';
                    toast.error('Validation Error', {
                        description: String(messageToShow),
                        duration: 5000,
                    });
                }
            } else if (error.response?.data?.message) {
                toast.error('Error saving sale', {
                    description: error.response.data.message,
                    duration: 5000,
                });
            } else {
                toast.error('Error saving sale', {
                    description: 'Please try again or contact support.',
                });
            }
        }
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Sales'), href: '/sales' },
        { title: t('New Sale'), href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Sales Form')} />

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
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                                <Button
                                    type="button"
                                    // variant={entryMode === 'printer' ? 'default' : 'outline'}
                                    onClick={() => router.visit('/admin/day-opening-balances')}
                                    size="sm"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 sm:w-auto"
                                >
                                    Day Opening Balances
                                </Button>
                                {/* <Button
                                    type="button"
                                    // variant={entryMode === 'printer' ? 'default' : 'outline'}
                                    onClick={() => router.visit('')}
                                    size="sm"
                                    className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                                >
                                    Item Return
                                </Button> */}
                                {/* <Button
                                    type="button"
                                    // variant={entryMode === 'printer' ? 'default' : 'outline'}
                                    onClick={() => router.visit('/admin/petty-cash-categories/create')}
                                    size="sm"
                                    className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                                >
                                    Petty Cash Categories
                                </Button> */}
                                <Button
                                    type="button"
                                    // variant={entryMode === 'printer' ? 'default' : 'outline'}
                                    onClick={() => router.visit('/admin/privilege-users/create')}
                                    size="sm"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 sm:w-auto"
                                >
                                    Privilege User
                                </Button>
                            </div>

                            {/* Day Cash Balance Bar */}
                            {dayBalance && (
                                <div className="flex flex-wrap gap-2.5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-3 py-3 shadow-md sm:px-4">
                                    <div className="flex flex-1 min-w-[120px] items-center gap-2">
                                        <Wallet className="h-4 w-4 shrink-0 text-emerald-600" />
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Day Open</div>
                                            <div className={`text-sm font-bold ${dayBalance.has_opening ? 'text-emerald-700' : 'text-gray-400 italic'}`}>
                                                {dayBalance.has_opening
                                                    ? `Rs. ${dayBalance.opening_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : 'Not set'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 min-w-[120px] items-center gap-2 px-3 border-x border-emerald-100">
                                        <TrendingUp className="h-4 w-4 shrink-0 text-blue-600" />
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Sales Cash</div>
                                            <div className="text-sm font-bold text-blue-700">
                                                + Rs. {dayBalance.today_cash_sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 min-w-[120px] items-center gap-2 px-3 border-r border-emerald-100">
                                        <Receipt className="h-4 w-4 shrink-0 text-amber-600" />
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Collections</div>
                                            <div className="text-sm font-bold text-amber-700">
                                                + Rs. {(dayBalance.debt_collections || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 min-w-[120px] items-center gap-2 pr-3 border-r border-emerald-100">
                                        <X className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                        <div>
                                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Petty Cash</div>
                                            <div className="text-sm font-bold text-red-600">
                                                - Rs. {(dayBalance.expenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 min-w-[130px] items-center gap-2 bg-white/50 rounded-lg px-2 py-1 border border-teal-200">
                                        <Banknote className="h-5 w-5 shrink-0 text-teal-600" />
                                        <div>
                                            <div className="text-[9px] font-extrabold uppercase tracking-widest text-teal-600">Drawer Cash</div>
                                            <div className="text-base font-extrabold text-teal-700">
                                                Rs. {(dayBalance.current_balance + Number(data.cash_payment || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sale Information Section */}
                            <SaleInformationForm
                                data={data}
                                setData={setData}
                                fetchCustomerByCode={fetchCustomerByCode}
                                setIsCustomerDialogOpen={setIsCustomerDialogOpen}
                                setIsPrivilegeModalOpen={setIsPrivilegeModalOpen}
                                items={data.items}
                            />

                            {/* Quick Navigation Buttons */}
                            <div className="space-y-5">
                                <EntryModeToggle
                                    entryMode={entryMode}
                                    setEntryMode={setEntryMode}
                                />

                                {entryMode === 'item' ? (
                                    <>
                                        {/* Item Entry Form */}
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
                                            searchItems={searchItems}
                                            setIsItemDialogOpen={setIsItemDialogOpen}
                                            selectItem={selectItem}
                                            onBatchSelect={handleBatchSelect}
                                            setBatchCandidates={setBatchCandidates}
                                            setIsBatchModalOpen={setIsBatchModalOpen}
                                            addItem={addItem}
                                            resetItemInput={resetItemInput}
                                        />

                                        {/* Items List Section */}
                                        <ItemsListTable
                                            data={data}
                                            selectedItem={selectedItem}
                                            editingQuantity={editingQuantity}
                                            setEditingQuantity={setEditingQuantity}
                                            startEditingQuantity={startEditingQuantity}
                                            updateQuantity={updateQuantity}
                                            cancelEditingQuantity={cancelEditingQuantity}
                                            editingDiscount={editingDiscount}
                                            setEditingDiscount={setEditingDiscount}
                                            startEditingDiscount={startEditingDiscount}
                                            updateDiscount={updateDiscount}
                                            cancelEditingDiscount={cancelEditingDiscount}
                                            removeItem={removeItem}
                                        />
                                    </>
                                ) : (
                                    <>
                                        {/* Printer Entry Form */}
                                        <PrinterEntryForm
                                            printerSearch={printerSearch}
                                            setPrinterSearch={setPrinterSearch}
                                            searchPrinters={searchPrinters}
                                            setIsPrinterDialogOpen={setIsPrinterDialogOpen}
                                            priceType={data.price_type}
                                            setPriceType={(v) => {
                                                setData('price_type', v);
                                                if (v === 'wholesale') {
                                                    setData('discount_percentage', 0);
                                                }
                                            }}
                                        />

                                        {/* Printers List Section */}
                                        <PrintersListTable
                                            data={data}
                                            removePrinter={removePrinter}
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
                                    </>
                                )}
                            </div>

                            {/* Payment & Totals Section */}
                            <PaymentTotalsSection
                                data={data}
                                setData={setData}
                                vatBreakdown={vatBreakdown}
                                entryMode={entryMode}
                                selectedCustomer={selectedCustomer}
                                processing={processing || submitting}
                                autoPrintEnabled={autoPrintEnabled}
                                setAutoPrintEnabled={setAutoPrintEnabled}
                                setIsMobilePreviewOpen={setIsMobilePreviewOpen}
                                printReceipt={() => {
                                    toast.error('Please save the sale first to print invoice.');
                                }}
                                handleSave={handleSave}
                                handleHoldSale={handleHoldSale}
                                setIsHoldModalOpen={setIsHoldModalOpen}
                                heldSalesCount={heldSales.length}
                                handlePaymentModeChange={handlePaymentModeChange}
                                cashPaymentRef={cashPaymentRef}
                                cardPaymentRef={cardPaymentRef}
                                bankAccounts={effectiveBankAccounts}
                                isOverallDiscountAuthorized={isOverallDiscountAuthorized}
                                onRequestOverallDiscountAuth={() => setIsOverallDiscountAuthModalOpen(true)}
                                onApplyCredit={(amount: number) => setData('credit_used', amount)}
                                onClearCredit={() => setData('credit_used', 0)}
                            />
                        </form>
                        {/* Footer */}
                        {/* <div className="text-center mt-4 text-blue-600/60">
                            <p className="text-sm">Process sales efficiently • Manage transactions seamlessly</p>
                        </div> */}
                    </div>
                </div>
            </div>
            {/* Customer Search Dialog */}
            <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Search Customer')}</DialogTitle>
                        <DialogDescription>{t('Search and select a customer')}</DialogDescription>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsCustomerDialogOpen(false);
                                setIsCustomerCreateDialogOpen(true);
                            }}
                            className="mt-2"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('Create New Customer')}
                        </Button>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder={t('Type name, code or phone...')}
                            value={customerSearch}
                            onChange={e => {
                                setCustomerSearch(e.target.value);
                                axios.get(`/sales/search/customers?query=${e.target.value}&type=customer`).then(res => setCustomers(res.data));
                            }}
                        />
                        <div className="max-h-60 overflow-y-auto divide-y border rounded">
                            {customers.map((c, idx) => (
                                <div
                                    key={c.code || `cust-${idx}`}
                                    className="p-3 hover:bg-muted cursor-pointer flex justify-between"
                                    onClick={() => {
                                        const isRegistered = c.code !== '0001';
                                        
                                        // Calculate total current payments
                                        const currentPayments = 
                                            Number(data.cash_payment || 0) + 
                                            Number(data.card_payment || 0) + 
                                            Number(data.cheque_payment || 0) + 
                                            Number(data.bank_transfer_payment || 0);

                                        setData(prev => ({
                                            ...prev,
                                            customer_code: c.code,
                                            customer_name: c.name,
                                            customer_vat_no: c.vat_no || '',
                                            is_vat_invoice: !!c.is_vat_registered,
                                            vat_rate: c.is_vat_registered ? (companyVatInfo?.vat_rate || prev.vat_rate) : prev.vat_rate,
                                            price_type: c.is_privilege_user ? 'wholesale' : prev.price_type,
                                            discount_percentage: c.is_privilege_user ? (prev.payment_mode === 'card' ? (companyInfo.privilege_card_discount || 0) : (companyInfo.privilege_users_discount || 0)) : prev.discount_percentage
                                        }));

                                        setSelectedCustomer(c);
                                        setIsCustomerDialogOpen(false);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span>{c.name} {c.phone ? `- ${c.phone}` : ''}</span>
                                        {c.is_vat_registered && (
                                            <span className="text-[10px] text-green-600 font-bold uppercase">VAT Registered</span>
                                        )}
                                    </div>
                                    <span className="text-muted-foreground">{c.code}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Customer Create Dialog */}
            <Dialog open={isCustomerCreateDialogOpen} onOpenChange={(open) => {
                setIsCustomerCreateDialogOpen(open);
                if (!open) {
                    // Reset form when dialog closes
                    setCustomerForm({ name: '', phone: '', email: '', is_vat_registered: false, vat_no: '' });
                    setCustomerFormErrors({});
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Create New Customer')}</DialogTitle>
                        <DialogDescription>{t('Enter customer details')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="customer-name">{t('Name')} *</Label>
                            <Input
                                id="customer-name"
                                value={customerForm.name || ''}
                                onChange={e => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('Enter customer name')}
                                className={customerFormErrors.name ? 'border-red-500' : ''}
                            />
                            {customerFormErrors.name && (
                                <p className="text-sm text-red-500 mt-1">{customerFormErrors.name}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="customer-phone">{t('Phone')}</Label>
                            <Input
                                id="customer-phone"
                                type="tel"
                                maxLength={10}
                                value={customerForm.phone || ''}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setCustomerForm(prev => ({ ...prev, phone: val }));
                                }}
                                placeholder={t('Enter 10-digit phone number')}
                                className={customerFormErrors.phone ? 'border-red-500' : ''}
                            />
                            {customerFormErrors.phone && (
                                <p className="text-sm text-red-500 mt-1">{customerFormErrors.phone}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="customer-email">{t('Email')}</Label>
                            <Input
                                id="customer-email"
                                type="email"
                                value={customerForm.email || ''}
                                onChange={e => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder={t('Enter email address')}
                            />
                        </div>
                        <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                            <input
                                type="checkbox"
                                id="cust-vat-reg"
                                checked={customerForm.is_vat_registered}
                                onChange={e => setCustomerForm(prev => ({ ...prev, is_vat_registered: e.target.checked }))}
                                className="w-4 h-4 text-primary rounded"
                            />
                            <Label htmlFor="cust-vat-reg">{t('VAT Registered Customer')}</Label>
                        </div>
                        {customerForm.is_vat_registered && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label htmlFor="customer-vat">{t('VAT Number')}</Label>
                                <Input
                                    id="customer-vat"
                                    value={customerForm.vat_no || ''}
                                    onChange={e => setCustomerForm(prev => ({ ...prev, vat_no: e.target.value }))}
                                    placeholder={t('Enter VAT number')}
                                    className="mt-1"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCustomerCreateDialogOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={createCustomer}
                            disabled={isCreatingCustomer}
                        >
                            {isCreatingCustomer ? t('Creating...') : t('Create Customer')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Item Name List Modal */}
            <ItemNameListModal
                isOpen={isItemDialogOpen}
                onClose={() => setIsItemDialogOpen(false)}
                onSelect={selectItem}
                setBatchCandidates={setBatchCandidates}
                setIsBatchModalOpen={setIsBatchModalOpen}
                items={items}
                initialSearchQuery={itemInput.code}
            />

            {/* Printer Search Dialog */}
            <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
                <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-4xl max-w-4xl overflow-hidden flex flex-col p-0 bg-white">
                    <DialogHeader className="p-5 border-b border-slate-200">
                        <div className="flex items-center gap-2 text-vismass-blue">
                            <Printer className="h-5 w-5" />
                            <DialogTitle className="text-xl font-bold">{t('Search Printer by Serial Number')}</DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-500">
                            {t('Search through GRN stock for available printers')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-5 space-y-4 flex-1 overflow-y-auto bg-slate-50/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('Enter serial number, brand or model...')}
                                value={printerSearch}
                                onChange={e => {
                                    setPrinterSearch(e.target.value);
                                    searchPrinters(e.target.value);
                                }}
                                className="pl-10 h-11 text-base shadow-sm focus-visible:ring-vismass-blue"
                                autoFocus
                            />
                        </div>

                        {printers.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="flex flex-col md:flex-row items-stretch">
                                    {/* Primary Info */}
                                    <div className="flex-1 p-5 bg-white border-b md:border-b-0 md:border-r border-slate-100">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 shadow-inner">
                                                <Printer className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-lg font-extrabold text-slate-900 leading-tight truncate" title={printers[Math.max(0, selectedPrinterIndex)].item_name}>
                                                    {printers[Math.max(0, selectedPrinterIndex)].item_name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                                        {printers[Math.max(0, selectedPrinterIndex)].brand}
                                                    </span>
                                                    <span className="text-slate-400">•</span>
                                                    <span className="text-slate-500 font-bold text-xs uppercase">
                                                        {printers[Math.max(0, selectedPrinterIndex)].model}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex items-center gap-8">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Warranty</span>
                                                <span className="font-bold text-slate-700 text-sm mt-0.5">
                                                    {printers[Math.max(0, selectedPrinterIndex)].warranty ? `${printers[Math.max(0, selectedPrinterIndex)].warranty} Months` : 'No Warranty'}
                                                </span>
                                            </div>
                                            <div className="h-8 w-px bg-slate-100" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Stock Code</span>
                                                <span className="font-bold text-slate-700 text-sm mt-0.5">{printers[Math.max(0, selectedPrinterIndex)].item_code}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price & Options */}
                                    <div className="w-full md:w-72 p-5 flex flex-col justify-between gap-4 bg-slate-50/50">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Selling Price</span>
                                            <div className="flex items-baseline gap-1 mt-1">
                                                <span className="text-xs font-bold text-blue-600">Rs.</span>
                                                <span className="text-2xl font-black text-blue-700 tracking-tight">
                                                    {Number(data.price_type === 'wholesale' ? printers[Math.max(0, selectedPrinterIndex)].wholesale_price : printers[Math.max(0, selectedPrinterIndex)].retail_price).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 p-2.5 bg-blue-100/30 rounded-lg border border-blue-200/50">
                                            <Checkbox
                                                id="include-warranty"
                                                checked={includePrinterWarranty}
                                                onCheckedChange={checked => setIncludePrinterWarranty(checked === true)}
                                                className="h-4 w-4 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <Label htmlFor="include-warranty" className="text-xs font-bold text-blue-800 cursor-pointer select-none">
                                                Include Printer Warranty
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded-lg border shadow-sm overflow-hidden bg-white">
                            <div className="max-h-[45vh] overflow-y-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-700">{t('Serial Number')}</TableHead>
                                            <TableHead className="font-bold text-slate-700">{t('Batch No')}</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">{t('Action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {printers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                                        <Search className="h-10 w-10 opacity-20" />
                                                        <p className="text-sm font-medium">{t('No printers found. Start typing to search...')}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            printers.map((p, idx) => (
                                                <TableRow
                                                    key={idx}
                                                    className={`transition-colors group cursor-pointer ${
                                                        selectedPrinterIndex === idx
                                                            ? 'bg-blue-50 border-blue-200'
                                                            : 'hover:bg-slate-50/80'
                                                    }`}
                                                    onClick={() => addPrinter(p)}
                                                    id={`printer-row-${idx}`}
                                                >
                                                    <TableCell className="font-mono font-bold text-vismass-blue text-base">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-2 w-2 rounded-full ${selectedPrinterIndex === idx ? 'bg-blue-600 animate-pulse' : 'bg-green-500'}`} />
                                                            {p.serial_number}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className={`font-medium uppercase text-xs ${selectedPrinterIndex === idx ? 'text-blue-700' : 'text-slate-600'}`}>
                                                        {p.batch_no}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addPrinter(p);
                                                            }}
                                                            className={`${
                                                                selectedPrinterIndex === idx
                                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                                    : 'bg-vismass-blue hover:bg-vismass-blue/90'
                                                            } shadow-sm gap-2`}
                                                        >
                                                            {selectedPrinterIndex === idx ? t('Press Enter') : t('Select Printer')}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="p-4 bg-slate-50 border-t flex sm:justify-between items-center">
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            {printers.length} {printers.length === 1 ? 'printer' : 'printers'} found
                        </p>
                        <Button variant="outline" onClick={() => setIsPrinterDialogOpen(false)}>
                            {t('Close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mobile Preview Dialog */}
            <Dialog open={isMobilePreviewOpen} onOpenChange={setIsMobilePreviewOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-muted">
                    <DialogHeader className="p-4 bg-white border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCcw className="w-5 h-5 text-blue-500" /> {t('Receipt Preview')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 overflow-y-auto max-h-[70vh]">
                        <QuickReceiptPreview data={data} companyInfo={companyInfo} selectedCustomer={selectedCustomer} />
                    </div>
                    <DialogFooter className="p-4 bg-white border-t">
                        <Button type="button" className="w-full" onClick={() => setIsMobilePreviewOpen(false)}>
                            {t('Close Preview')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <PrivilegeAccessModal
                isOpen={isPrivilegeModalOpen}
                onClose={() => setIsPrivilegeModalOpen(false)}
                onCustomerSelect={handlePrivilegeCustomerSelect}
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
                searchTerm={itemInput.code}
            />

            {/* Unit Selection Dialog (Bundle vs NOS) */}
            <Dialog open={isUnitSelectionOpen} onOpenChange={(open) => {
                if (!open) { setIsUnitSelectionOpen(false); setUnitSelectionPendingItem(null); }
            }}>
                <DialogContent className="max-w-sm w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCcw className="w-5 h-5 text-blue-500" />
                            {t('Select Selling Unit')}
                        </DialogTitle>
                        <DialogDescription>
                            {unitSelectionPendingItem?.item_name} — {t('How would you like to sell this item?')}
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
                                {unitSelectionPendingItem?.from_unit_name ?? t('Bundle')}
                            </span>
                            <span className="text-xs text-gray-500">
                                {t('Price')}: {unitSelectionPendingItem ? getCurrentPrice(unitSelectionPendingItem).toFixed(2) : '—'}
                            </span>
                            <span className="text-xs text-gray-400">
                                {t('Stock')}: {unitSelectionPendingItem?.bundle_stock?.toFixed(2) ?? '—'}
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
                                {unitSelectionPendingItem?.to_unit_name ?? t('Individual')}
                            </span>
                            <span className="text-xs text-gray-500">
                                {t('Price')}: {unitSelectionPendingItem
                                    ? +((getCurrentPrice(unitSelectionPendingItem as ItemMaster)) / (unitSelectionPendingItem.transfer_conversion_factor ?? 1)).toFixed(2)
                                    : 0}
                            </span>
                            <span className="text-xs text-gray-400">
                                {t('Stock')}: {unitSelectionPendingItem?.nos_stock?.toFixed(2) ?? '—'}
                            </span>
                            <span className="text-xs text-blue-400">
                                1 {unitSelectionPendingItem?.from_unit_name ?? t('Bundle')} = {unitSelectionPendingItem?.transfer_conversion_factor ?? 1} {unitSelectionPendingItem?.to_unit_name ?? t('pcs')}
                            </span>
                            {unitSelectionFocus === 'nos' && (
                                <span className="text-[10px] text-green-500 font-medium">↵ Enter to select</span>
                            )}
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400 -mt-1">← → Arrow keys to switch &nbsp;|&nbsp; Enter to confirm</p>
                    <DialogFooter>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => { setIsUnitSelectionOpen(false); setUnitSelectionPendingItem(null); }}>
                            {t('Cancel')}
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

            <HoldSalesModal
                isOpen={isHoldModalOpen}
                onClose={() => setIsHoldModalOpen(false)}
                heldSales={heldSales}
                onResume={handleResumeSale}
                onDelete={handleDeleteHeldSale}
            />
            {/* Admin Authorization Modal for Discount Editing */}
            <AdminAuthModal
                isOpen={adminAuthForDiscountIndex !== null}
                onClose={() => setAdminAuthForDiscountIndex(null)}
                onSuccess={handleAuthorizeDiscountEdit}
                saleDetails={{
                    invoice_no: data.invoice_no,
                    customer_name: data.customer_name,
                    total_amount: data.total_amount
                }}
            />

            {/* Admin Authorization Modal for Overall Discount Editing */}
            <AdminAuthModal
                isOpen={isOverallDiscountAuthModalOpen}
                onClose={() => setIsOverallDiscountAuthModalOpen(false)}
                onSuccess={() => {
                    setIsOverallDiscountAuthorized(true);
                    setIsOverallDiscountAuthModalOpen(false);
                }}
                saleDetails={{
                    invoice_no: data.invoice_no,
                    customer_name: data.customer_name,
                    total_amount: data.total_amount
                }}
            />
        </AppLayout>
    );
};

export default Create;
