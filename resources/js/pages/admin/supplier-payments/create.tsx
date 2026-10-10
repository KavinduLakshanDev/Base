import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, CreditCard, DollarSign, Receipt, CheckCircle, AlertCircle, Building2, ArrowRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

interface Supplier {
    AdrKy: number;
    AdrCd: string;
    FstNm: string;
    TP1: string;
    Address: string;
}

interface BankAccount {
    id: number;
    account_name: string;
    account_number: string;
    bank_name: string;
    branch_name: string;
    account_type: string;
    // backend includes current_balance on the model, we use it to show live balance
    current_balance?: number;
}

interface PendingInvoice {
    id: number;
    invoice_no: string;
    supplier_invoice_no: string;
    transaction_date: string;
    total_amount: number;
    balance_amount: number;
}

interface PaymentData {
    supplier_id: number;
    payment_method: string;
    paid_amount: number;
    payment_date: string;
    notes?: string;
    selected_bank_id?: number;
    cheque_no?: string;
    cheque_bank_name?: string;
    cheque_branch?: string;
    cheque_date?: string;
    cheque_account_no?: string;
    bank_name?: string;
    bank_reference_no?: string;
    bank_branch?: string;
    bank_deposit_date?: string;
    bank_account_no?: string;
    transfer_reference_no?: string;
    transfer_transaction_id?: string;
    transfer_bank_name?: string;
    transfer_branch?: string;
    transfer_date?: string;
    invoice_allocations?: { invoice_id: number; amount: number }[];
}

export default function SupplierPaymentsIndex() {
    // props may or may not include bankAccounts (create page sometimes omitted it)
    // default to an empty array so downstream map/find calls are safe
    const { flash, bankAccounts = [], suppliersWithBalance = [], mainCashAccount = null } = usePage().props as any;
    const [searchTerm, setSearchTerm] = useState('');
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierBalance, setSupplierBalance] = useState(0);
    const [recentPayments, setRecentPayments] = useState<any[]>([]);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
    const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
    const [invoiceAllocations, setInvoiceAllocations] = useState<Record<number, string>>({});
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Supplier Payments', href: '/admin/supplier-payments' },
        { title: 'Create Payment', href: '#' },
    ];

    const { data, setData, post, processing, errors, reset } = useForm<PaymentData>({
        supplier_id: 0,
        payment_method: '',
        paid_amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
        selected_bank_id: undefined,
        cheque_no: '',
        cheque_bank_name: '',
        cheque_branch: '',
        cheque_date: '',
        cheque_account_no: '',
        bank_name: '',
        bank_reference_no: '',
        bank_branch: '',
        bank_deposit_date: '',
        bank_account_no: '',
        transfer_reference_no: '',
        transfer_transaction_id: '',
        transfer_bank_name: '',
        transfer_branch: '',
        transfer_date: '',
        invoice_allocations: [],
    });

    // Search suppliers with debounce
    useEffect(() => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (searchTerm.length >= 2) {
            const timeout = setTimeout(() => {
                searchSuppliers(searchTerm);
            }, 300);
            setSearchTimeout(timeout);
        } else {
            setSuppliers([]);
        }

        return () => {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [searchTerm]);

    const searchSuppliers = async (query: string) => {
        try {
            const response = await fetch(`/admin/supplier-payments/search-suppliers?search=${encodeURIComponent(query)}`);
            const data = await response.json();
            setSuppliers(data);
        } catch (error) {
            console.error('Error searching suppliers:', error);
        }
    };

    const selectSupplier = async (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setData('supplier_id', supplier.AdrKy);
        setSearchTerm(`${supplier.FstNm}`);

        try {
            const response = await fetch(`/admin/supplier-details?supplier_id=${supplier.AdrKy}`);
            
            if (!response.ok) {
                console.error('Failed to fetch supplier details:', response.status, response.statusText);
                return;
            }
            
            const data = await response.json();
            console.log('Supplier details response:', data);
            console.log('Current balance:', data.current_balance);
            
            setSupplierBalance(data.current_balance || 0);
            setSuppliers([]);

            // Fetch pending invoices
            fetchPendingInvoices(supplier.AdrKy);
        } catch (error) {
            console.error('Error fetching supplier details:', error);
        }
    };

    const fetchPendingInvoices = async (supplierId: number) => {
        setLoadingInvoices(true);
        try {
            const response = await fetch(`/admin/supplier-payments/pending-invoices?supplier_id=${supplierId}`);
            if (response.ok) {
                const data = await response.json();
                setPendingInvoices(data);
                setSelectedInvoiceIds([]);
                setInvoiceAllocations({});
            }
        } catch (error) {
            console.error('Error fetching pending invoices:', error);
        } finally {
            setLoadingInvoices(false);
        }
    };

    const toggleInvoiceSelection = (invoiceId: number) => {
        setSelectedInvoiceIds(prev => {
            const isSelected = prev.includes(invoiceId);
            const invoice = pendingInvoices.find(inv => inv.id === invoiceId);
            
            if (isSelected) {
                const next = prev.filter(id => id !== invoiceId);
                const nextAllocations = { ...invoiceAllocations };
                delete nextAllocations[invoiceId];
                setInvoiceAllocations(nextAllocations);
                updatePaidAmountFromAllocations(nextAllocations);
                return next;
            } else {
                const next = [...prev, invoiceId];
                const nextAllocations = {
                    ...invoiceAllocations,
                    [invoiceId]: Number(invoice?.balance_amount || 0).toFixed(2)
                };
                setInvoiceAllocations(nextAllocations);
                updatePaidAmountFromAllocations(nextAllocations);
                return next;
            }
        });
    };

    const handleAllocationChange = (invoiceId: number, amount: string) => {
        const nextAllocations = {
            ...invoiceAllocations,
            [invoiceId]: amount
        };
        setInvoiceAllocations(nextAllocations);
        updatePaidAmountFromAllocations(nextAllocations);
    };

    const handleAllocationBlur = (invoiceId: number) => {
        const currentVal = invoiceAllocations[invoiceId];
        if (currentVal && !isNaN(Number(currentVal))) {
            const nextAllocations = {
                ...invoiceAllocations,
                [invoiceId]: Number(currentVal).toFixed(2)
            };
            setInvoiceAllocations(nextAllocations);
            updatePaidAmountFromAllocations(nextAllocations);
        }
    };

    const updatePaidAmountFromAllocations = (allocations: Record<number, string>) => {
        const total = Object.values(allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
        const allocationList = Object.entries(allocations).map(([id, amount]) => ({
            invoice_id: parseInt(id),
            amount: parseFloat(amount) || 0
        })).filter(a => a.amount > 0);
        
        setData((prev: any) => ({
            ...prev,
            paid_amount: total,
            invoice_allocations: allocationList
        }));
    };

    const handlePaymentMethodChange = (method: string) => {
        // When switching to Cash, clear bank selection; keep bank when switching between bank methods
        if (method === 'Cash') {
            setSelectedBank(null);
            setData((prev: PaymentData) => ({
                ...prev,
                payment_method: method,
                selected_bank_id: undefined as any,
                notes: '',
                cheque_no: '',
                cheque_bank_name: '',
                cheque_branch: '',
                cheque_date: '',
                cheque_account_no: '',
                bank_name: '',
                bank_reference_no: '',
                bank_branch: '',
                bank_deposit_date: '',
                bank_account_no: '',
                transfer_reference_no: '',
                transfer_transaction_id: '',
                transfer_bank_name: '',
                transfer_branch: '',
                transfer_date: '',
            }));
        } else {
            // Keep the selected bank; clear detail fields for the new method (supplier fills these manually)
            setData((prev: PaymentData) => ({
                ...prev,
                payment_method: method,
                notes: '',
                cheque_no: '',
                cheque_bank_name: '',
                cheque_branch: '',
                cheque_date: '',
                cheque_account_no: '',
                bank_name: '',
                bank_reference_no: '',
                bank_branch: '',
                bank_deposit_date: '',
                bank_account_no: '',
                transfer_reference_no: '',
                transfer_transaction_id: '',
                transfer_bank_name: '',
                transfer_branch: '',
                transfer_date: '',
            }));
        }
    };

    const handleBankSelection = (bankId: string) => {
        const bank = (bankAccounts || []).find((b: BankAccount) => b.id === parseInt(bankId));
        setSelectedBank(bank || null);
        // Only track which company bank account is used — do NOT auto-fill supplier bank detail fields
        setData('selected_bank_id', parseInt(bankId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedInvoiceIds.length === 0) {
            alert('Please select at least one invoice to pay.');
            return;
        }

        post('/admin/supplier-payments', {
            onSuccess: () => {
                reset();
                setShowPaymentForm(false);
                setSelectedSupplier(null);
                setSearchTerm('');
                setPendingInvoices([]);
                setSelectedInvoiceIds([]);
                setInvoiceAllocations({});
            },
        });
    };

    // Open receipt when payment is successful
    useEffect(() => {
        if (flash?.success && flash?.payment_id) {
            window.open(`/admin/supplier-payments/${flash.payment_id}/receipt`, '_blank');
        }
    }, [flash]);

    const resetForm = () => {
        setSelectedSupplier(null);
        setSupplierBalance(0);
        setRecentPayments([]);
        setShowPaymentForm(false);
        setSearchTerm('');
        reset();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Supplier Payments" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/admin/supplier-payments"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowRight className="h-5 w-5 text-white rotate-180" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">Create Supplier Payment</h1>
                                    <p className="text-xs text-white/80">Record and manage supplier payments</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8 space-y-6">
                    {/* Success Message */}
                    {flash?.success && (
                        <Alert className="bg-[#00aeef]/10 border-vismass-blue">
                            <CheckCircle className="h-4 w-4 text-vismass-blue" />
                            <AlertDescription className="text-vismass-blue">
                                {flash.success}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Error Message */}
                    {flash?.error && (
                        <Alert className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                {flash.error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Step 1 — Supplier Selection */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <CardTitle className="flex items-center text-slate-800">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vismass-blue/10 mr-3">
                                    <Search className="w-4 h-4 text-vismass-blue" />
                                </div>
                                Step 1 — Select Supplier
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="max-w-2xl relative">
                                {!selectedSupplier ? (
                                    <div className="space-y-4">
                                        <Label htmlFor="supplier-search" className="text-slate-600">Search Supplier</Label>
                                        <div className="relative">
                                            <Input
                                                id="supplier-search"
                                                type="text"
                                                placeholder="Search by name, code, or phone..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="h-12 text-lg border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 rounded-xl"
                                            />
                                            
                                            {/* Supplier search results */}
                                            {suppliers.length > 0 && (
                                                <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto w-full">
                                                    {suppliers.map((supplier) => (
                                                        <div
                                                            key={supplier.AdrKy}
                                                            className="p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors"
                                                            onClick={() => selectSupplier(supplier)}
                                                        >
                                                            <div className="font-semibold text-slate-900">{supplier.FstNm}</div>
                                                            <div className="flex items-center gap-4 mt-1">
                                                                <div className="text-sm text-slate-500 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {supplier.AdrCd}</div>
                                                                <div className="text-sm text-slate-500">{supplier.TP1}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Default List of Suppliers with Outstanding Balances */}
                                        {searchTerm === '' && suppliersWithBalance.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="text-sm font-semibold text-slate-500 mb-4">Suppliers with Outstanding Balances</h4>
                                                
                                                {/* Changed from grid-cols-3 to flex-col for a 1-by-1 vertical queue */}
                                                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
                                                    {suppliersWithBalance.map((supplier: any) => (
                                                        <div
                                                            key={supplier.AdrKy}
                                                            onClick={() => selectSupplier(supplier)}
                                                            /* Added w-full, items-center, and justify-between for horizontal layout */
                                                            className="flex items-center justify-between w-full p-4 border border-slate-200 rounded-xl hover:border-vismass-blue hover:shadow-md cursor-pointer transition-all bg-white"
                                                        >
                                                            {/* Left Side: Supplier Name and Code */}
                                                            <div className="flex flex-col gap-1 overflow-hidden pr-4">
                                                                <div className="font-semibold text-slate-800 truncate">{supplier.FstNm}</div>
                                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                                    <Building2 className="w-3 h-3" /> {supplier.AdrCd}
                                                                </div>
                                                            </div>

                                                            {/* Right Side: Outstanding Balance */}
                                                            <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200 whitespace-nowrap shrink-0">
                                                                Rs. {parseFloat(supplier.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#00aeef]/10 to-transparent rounded-2xl border border-vismass-blue/20">
                                        <div>
                                            <h3 className="text-xl font-bold text-vismass-blue mb-1">
                                                {selectedSupplier.FstNm}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                                <span>Code: {selectedSupplier.AdrCd}</span>
                                                <span>Phone: {selectedSupplier.TP1}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right flex flex-col items-end gap-1.5">
                                                <span className="text-sm font-medium text-slate-500">Outstanding Balance</span>
                                                <Badge variant={supplierBalance < 0 ? "destructive" : "secondary"} className="text-base px-3 py-1 font-bold shadow-sm">
                                                    Rs. {Math.abs(supplierBalance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                                </Badge>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => { setSelectedSupplier(null); setSearchTerm(''); setPendingInvoices([]); setSelectedInvoiceIds([]); setInvoiceAllocations({}); }} className="text-slate-500 border-slate-300 hover:bg-slate-100">
                                                Change
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Step 2 — Invoice Allocation */}
                        {selectedSupplier && (
                            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center text-slate-800">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vismass-blue/10 mr-3">
                                                <Receipt className="w-4 h-4 text-vismass-blue" />
                                            </div>
                                            Step 2 — Allocate Payment to Invoices
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                                            {pendingInvoices.length} Pending
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {selectedInvoiceIds.length === 0 && (
                                        <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Selection Required: Please select at least one invoice to allocate this payment.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {loadingInvoices ? (
                                        <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                                            <div className="w-8 h-8 border-4 border-vismass-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                                            Loading pending invoices...
                                        </div>
                                    ) : pendingInvoices.length > 0 ? (
                                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-slate-50/80">
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="w-[50px]"></TableHead>
                                                        <TableHead className="font-semibold text-slate-600">Invoice No</TableHead>
                                                        <TableHead className="font-semibold text-slate-600">Supp. Invoice</TableHead>
                                                        <TableHead className="font-semibold text-slate-600">Date</TableHead>
                                                        <TableHead className="text-right font-semibold text-slate-600">Total (Rs.)</TableHead>
                                                        <TableHead className="text-right font-semibold text-slate-600">Balance (Rs.)</TableHead>
                                                        <TableHead className="w-[180px] text-right font-semibold text-slate-600">Pay Amount (Rs.)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pendingInvoices.map((invoice) => {
                                                        const isSelected = selectedInvoiceIds.includes(invoice.id);
                                                        return (
                                                            <TableRow key={invoice.id} className={`transition-colors ${isSelected ? 'bg-[#00aeef]/5 hover:bg-[#00aeef]/10' : 'hover:bg-slate-50'}`}>
                                                                <TableCell>
                                                                    <Checkbox
                                                                        checked={isSelected}
                                                                        onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                                                                        className="border-slate-300 data-[state=checked]:bg-vismass-blue data-[state=checked]:border-vismass-blue"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-medium text-slate-900">{invoice.invoice_no}</TableCell>
                                                                <TableCell className="text-slate-600">{invoice.supplier_invoice_no}</TableCell>
                                                                <TableCell className="text-slate-600">{new Date(invoice.transaction_date).toLocaleDateString()}</TableCell>
                                                                <TableCell className="text-right text-slate-600">{Number(invoice.total_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</TableCell>
                                                                <TableCell className="text-right font-semibold text-rose-600">
                                                                    {Number(invoice.balance_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {isSelected ? (
                                                                        <Input
                                                                            type="number"
                                                                            value={invoiceAllocations[invoice.id] || ''}
                                                                            onChange={(e) => handleAllocationChange(invoice.id, e.target.value)}
                                                                            onBlur={() => handleAllocationBlur(invoice.id)}
                                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                            className="h-9 text-right border-vismass-blue/40 focus:border-vismass-blue focus:ring-vismass-blue/20 bg-white shadow-sm font-medium"
                                                                            max={invoice.balance_amount}
                                                                        />
                                                                    ) : (
                                                                        <div className="h-9 text-right text-slate-400 py-1.5 pr-3 text-sm">Select to pay</div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                                            <Receipt className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                                            <p>No pending invoices found for this supplier.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3 — Payment Details */}
                        {selectedSupplier && selectedInvoiceIds.length > 0 && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Left Column: Core Payment Config */}
                                <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                                        <CardTitle className="flex items-center text-slate-800">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vismass-blue/10 mr-3">
                                                <CreditCard className="w-4 h-4 text-vismass-blue" />
                                            </div>
                                            Step 3 — Payment Configuration
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        {/* Total Amount Auto-calculated */}
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                            <div>
                                                <Label className="text-slate-500 font-medium">Total Payment Amount</Label>
                                                <p className="text-sm text-slate-400">Auto-calculated from selected invoices</p>
                                            </div>
                                            <div className="text-2xl font-bold text-emerald-600">
                                                Rs. {data.paid_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-base font-semibold text-slate-800 mb-3 block">Payment Method</Label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { value: 'Cash', label: 'Cash', icon: DollarSign },
                                                    { value: 'Cheque', label: 'Cheque', icon: Receipt },
                                                    { value: 'Bank', label: 'Bank Deposit', icon: Building2 },
                                                    { value: 'Online Transfer', label: 'Online Transfer', icon: CreditCard },
                                                ].map(({ value, label, icon: Icon }) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => handlePaymentMethodChange(value)}
                                                        className={`p-4 border rounded-xl text-center transition-all ${data.payment_method === value
                                                                ? 'border-vismass-blue bg-vismass-blue/5 text-vismass-blue ring-1 ring-vismass-blue'
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                                                        }`}
                                                    >
                                                        <Icon className={`w-6 h-6 mx-auto mb-2 ${data.payment_method === value ? 'text-vismass-blue' : 'text-slate-400'}`} />
                                                        <div className="text-sm font-medium">{label}</div>
                                                    </button>
                                                ))}
                                            </div>
                                            {data.payment_method === 'Cash' && mainCashAccount && (
                                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm flex items-center justify-between">
                                                    <div className="flex items-center gap-2 font-medium">
                                                        <DollarSign className="w-4 h-4" /> Available Main Cash Balance:
                                                    </div>
                                                    <div className="font-bold">Rs. {parseFloat(mainCashAccount.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </div>
                                            )}
                                            {errors.payment_method && (
                                                <p className="text-rose-500 text-sm mt-2">{errors.payment_method}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="payment_date" className="font-semibold text-slate-700">Payment Date <span className="text-rose-500">*</span></Label>
                                            <Input
                                                id="payment_date"
                                                type="date"
                                                value={data.payment_date}
                                                onChange={(e) => setData('payment_date', e.target.value)}
                                                className="mt-1.5 h-11 border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 rounded-xl"
                                                required
                                            />
                                            {errors.payment_date && <p className="text-rose-500 text-sm mt-1">{errors.payment_date}</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Right Column: Method Specific Details */}
                                <Card className="border-0 shadow-sm ring-1 ring-slate-200 h-full">
                                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                                        <CardTitle className="flex items-center text-slate-800">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vismass-blue/10 mr-3">
                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                            </div>
                                            Step 4 — Method Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-5 h-[calc(100%-80px)]">
                                        {!data.payment_method ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                                                <ArrowRight className="w-8 h-8 mb-3 opacity-20" />
                                                Select a payment method to see details
                                            </div>
                                        ) : (
                                            <>
                                                {/* Bank Account Selection (visible for non-Cash methods) */}
                                                {data.payment_method !== 'Cash' && (
                                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mb-6">
                                                        <Label className="font-semibold text-slate-800">Pay From Company Bank Account <span className="text-rose-500">*</span></Label>
                                                        <Select
                                                            value={data.selected_bank_id?.toString() ?? ''}
                                                            onValueChange={handleBankSelection}
                                                        >
                                                            <SelectTrigger className="h-11 border-slate-300 focus:border-vismass-blue bg-white rounded-lg">
                                                                <SelectValue placeholder="Choose bank account..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(bankAccounts || []).map((bank: BankAccount) => (
                                                                    <SelectItem key={bank.id} value={bank.id.toString()}>
                                                                        {bank.bank_name} — {bank.account_name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {errors.selected_bank_id && <p className="text-rose-500 text-sm">{errors.selected_bank_id}</p>}

                                                        {selectedBank && (
                                                            <div className="mt-3 flex items-center justify-between text-sm p-3 bg-white border border-slate-200 rounded-lg">
                                                                <div className="flex flex-col">
                                                                    <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Available Balance</span>
                                                                    <span className="font-mono text-slate-600">{selectedBank.account_number}</span>
                                                                </div>
                                                                <span className="font-bold text-emerald-600 text-base">
                                                                    Rs {(selectedBank.current_balance ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Cash Fields */}
                                                {data.payment_method === 'Cash' && (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label htmlFor="notes" className="font-medium text-slate-700">Description / Notes (Optional)</Label>
                                                            <Textarea
                                                                id="notes"
                                                                value={data.notes}
                                                                onChange={(e) => setData('notes', e.target.value)}
                                                                placeholder="Add any additional notes here..."
                                                                className="mt-1.5 border-slate-200 focus:border-vismass-blue rounded-xl min-h-[120px]"
                                                            />
                                                            {errors.notes && <p className="text-rose-500 text-sm mt-1">{errors.notes}</p>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Cheque Fields */}
                                                {data.payment_method === 'Cheque' && (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="cheque_no" className="font-medium text-slate-700">
                                                                    Cheque Number <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="cheque_no" 
                                                                    type="text" 
                                                                    value={data.cheque_no} 
                                                                    onChange={(e) => {
                                                                        // Remove any non-numeric characters
                                                                        const numericValue = e.target.value.replace(/\D/g, '');
                                                                        setData('cheque_no', numericValue);
                                                                    }} 
                                                                    className="mt-1.5 h-10 rounded-lg" required 
                                                                    minLength={6}
                                                                    maxLength={6}
                                                                    pattern="[0-9]{6}"
                                                                />
                                                                {errors.cheque_no && <p className="text-rose-500 text-sm mt-1">{errors.cheque_no}</p>}
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="cheque_date" className="font-medium text-slate-700">
                                                                    Cheque Date <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="cheque_date" 
                                                                    type="date" 
                                                                    value={data.cheque_date} 
                                                                    onChange={(e) => setData('cheque_date', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required 
                                                                />
                                                                {errors.cheque_date && <p className="text-rose-500 text-sm mt-1">{errors.cheque_date}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="cheque_bank_name" className="font-medium text-slate-700">
                                                                    Supplier Bank <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="cheque_bank_name" 
                                                                    type="text" 
                                                                    value={data.cheque_bank_name} 
                                                                    onChange={(e) => setData('cheque_bank_name', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required 
                                                                />
                                                                {errors.cheque_bank_name && <p className="text-rose-500 text-sm mt-1">{errors.cheque_bank_name}</p>}
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="cheque_branch" className="font-medium text-slate-700">Branch (Optional)</Label>
                                                                <Input 
                                                                    id="cheque_branch" 
                                                                    type="text" 
                                                                    value={data.cheque_branch} 
                                                                    onChange={(e) => setData('cheque_branch', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" 
                                                                />
                                                                {errors.cheque_branch && <p className="text-rose-500 text-sm mt-1">{errors.cheque_branch}</p>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="cheque_account_no" className="font-medium text-slate-700">
                                                                Account No. (Optional)
                                                            </Label>
                                                            <Input 
                                                                id="cheque_account_no" 
                                                                type="text" 
                                                                value={data.cheque_account_no} 
                                                                onChange={(e) => setData('cheque_account_no', e.target.value)} 
                                                                className="mt-1.5 h-10 rounded-lg" 
                                                            />
                                                            {errors.cheque_account_no && <p className="text-rose-500 text-sm mt-1">{errors.cheque_account_no}</p>}
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="notes" className="font-medium text-slate-700">
                                                                Notes (Optional)
                                                            </Label>
                                                            <Textarea 
                                                                id="notes" 
                                                                value={data.notes} 
                                                                onChange={(e) => setData('notes', e.target.value)} 
                                                                className="mt-1.5 border-slate-200 rounded-xl" 
                                                                rows={2} 
                                                            />
                                                            {errors.notes && <p className="text-rose-500 text-sm mt-1">{errors.notes}</p>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bank Deposit Fields */}
                                                {data.payment_method === 'Bank' && (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="bank_name" className="font-medium text-slate-700">
                                                                    Supplier Bank <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="bank_name" 
                                                                    type="text" 
                                                                    value={data.bank_name} 
                                                                    onChange={(e) => setData('bank_name', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required 
                                                                />
                                                                {errors.bank_name && <p className="text-rose-500 text-sm mt-1">{errors.bank_name}</p>}
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="bank_reference_no" className="font-medium text-slate-700">
                                                                    Reference No <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="bank_reference_no" 
                                                                    type="text" 
                                                                    value={data.bank_reference_no} 
                                                                    onChange={(e) => setData('bank_reference_no', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required 
                                                                />
                                                                {errors.bank_reference_no && <p className="text-rose-500 text-sm mt-1">{errors.bank_reference_no}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="bank_deposit_date" className="font-medium text-slate-700">
                                                                    Deposit Date <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="bank_deposit_date" 
                                                                    type="date" 
                                                                    value={data.bank_deposit_date} 
                                                                    onChange={(e) => setData('bank_deposit_date', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" 
                                                                    required 
                                                                />
                                                                {errors.bank_deposit_date && <p className="text-rose-500 text-sm mt-1">{errors.bank_deposit_date}</p>}
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="bank_branch" className="font-medium text-slate-700">
                                                                    Branch (Optional)
                                                                </Label>
                                                                <Input 
                                                                    id="bank_branch" 
                                                                    type="text" 
                                                                    value={data.bank_branch} 
                                                                    onChange={(e) => setData('bank_branch', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" 
                                                                />
                                                                {errors.bank_branch && <p className="text-rose-500 text-sm mt-1">{errors.bank_branch}</p>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="bank_account_no" className="font-medium text-slate-700">
                                                                Account No. (Optional)
                                                            </Label>
                                                            <Input 
                                                                id="bank_account_no" 
                                                                type="text" 
                                                                value={data.bank_account_no} 
                                                                onChange={(e) => setData('bank_account_no', e.target.value)} 
                                                                className="mt-1.5 h-10 rounded-lg" />
                                                            {errors.bank_account_no && <p className="text-rose-500 text-sm mt-1">{errors.bank_account_no}</p>}
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="notes" className="font-medium text-slate-700">
                                                                Notes (Optional)
                                                            </Label>
                                                            <Textarea 
                                                                id="notes" 
                                                                value={data.notes} 
                                                                onChange={(e) => setData('notes', e.target.value)} 
                                                                className="mt-1.5 border-slate-200 rounded-xl" 
                                                                rows={2} 
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Online Transfer Fields */}
                                                {data.payment_method === 'Online Transfer' && (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="transfer_reference_no" className="font-medium text-slate-700">
                                                                    Reference No <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="transfer_reference_no" 
                                                                    type="text" 
                                                                    value={data.transfer_reference_no} 
                                                                    onChange={(e) => setData('transfer_reference_no', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required />
                                                                {errors.transfer_reference_no && <p className="text-rose-500 text-sm mt-1">{errors.transfer_reference_no}</p>}
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="transfer_transaction_id" className="font-medium text-slate-700">
                                                                    Transaction ID <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="transfer_transaction_id" 
                                                                    type="text" 
                                                                    value={data.transfer_transaction_id} 
                                                                    onChange={(e) => setData('transfer_transaction_id', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required />
                                                                {errors.transfer_transaction_id && <p className="text-rose-500 text-sm mt-1">{errors.transfer_transaction_id}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label htmlFor="transfer_date" className="font-medium text-slate-700">
                                                                    Transfer Date <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="transfer_date" 
                                                                    type="date" 
                                                                    value={data.transfer_date} 
                                                                    onChange={(e) => setData('transfer_date', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required 
                                                                />
                                                                {errors.transfer_date && <p className="text-rose-500 text-sm mt-1">{errors.transfer_date}</p>}
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="transfer_bank_name" className="font-medium text-slate-700">
                                                                    Supplier Bank <span className="text-rose-500">*</span>
                                                                </Label>
                                                                <Input 
                                                                    id="transfer_bank_name" 
                                                                    type="text" 
                                                                    value={data.transfer_bank_name} 
                                                                    onChange={(e) => setData('transfer_bank_name', e.target.value)} 
                                                                    className="mt-1.5 h-10 rounded-lg" required 
                                                                />
                                                                {errors.transfer_bank_name && <p className="text-rose-500 text-sm mt-1">{errors.transfer_bank_name}</p>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="transfer_branch" className="font-medium text-slate-700">
                                                                Branch (Optional)
                                                            </Label>
                                                            <Input 
                                                                id="transfer_branch" 
                                                                type="text" 
                                                                value={data.transfer_branch} 
                                                                onChange={(e) => setData('transfer_branch', e.target.value)} 
                                                                className="mt-1.5 h-10 rounded-lg" 
                                                            />
                                                            {errors.transfer_branch && <p className="text-rose-500 text-sm mt-1">{errors.transfer_branch}</p>}
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="notes" className="font-medium text-slate-700">
                                                                Notes (Optional)
                                                            </Label>
                                                            <Textarea 
                                                                id="notes" 
                                                                value={data.notes} 
                                                                onChange={(e) => setData('notes', e.target.value)} 
                                                                className="mt-1.5 border-slate-200 rounded-xl" rows={2} 
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Submit Actions */}
                        <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-slate-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={processing}
                                className="px-6 h-12 rounded-xl text-slate-600 border-slate-300 hover:bg-slate-50 font-medium"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    processing ||
                                    !data.payment_method ||
                                    !selectedSupplier ||
                                    selectedInvoiceIds.length === 0 ||
                                    ((['Cheque', 'Bank', 'Online Transfer'].includes(data.payment_method)) && !selectedBank)
                                }
                                className="px-8 h-12 rounded-xl bg-vismass-blue hover:bg-vismass-blue/90 text-white font-semibold shadow-lg shadow-vismass-blue/20 transition-all disabled:opacity-50"
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Recording...
                                    </span>
                                ) : (
                                    'Record Payment'
                                )}
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </AppLayout>
    );
}