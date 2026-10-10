import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import {
    User,
    DollarSign,
    Calendar,
    FileText,
    Building2,
    Wallet,
    Info,
    CheckCircle2,
    Save,
    Wrench,
    AlertCircle,
    Receipt,
    X,
    Clock,
    ChevronDown,
    CreditCard
} from 'lucide-react';

// toast notifications
import { toast } from 'sonner';

// modal components used for confirmations
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface BankAccountOption {
    id: number;
    bank_name: string;
    branch_name: string;
    account_name?: string;
    account_number?: string;
}

interface Props {
    customers?: { AdrKy: number; FstNm: string; AdrCd: string; AccKy: number }[];
    customer?: { AccKy?: number; AccCd?: string; AccNm?: string } | null;
    bankAccounts?: BankAccountOption[];
    onSuccess?: () => void;
}

// shape of the form data for useForm (helps with TypeScript errors)
interface FormData {
    AccKy: string;
    customer_code: string;
    customer_name: string;
    amount: string;
    service_job_id: string;
    sales_transaction_id: string;
    method: Method;
    TrnDt: string;
    ChqueNo: string;
    BankNm: string;
    ChqueBranch: string;
    BankBranch: string;
    ChqueDt: string;
    CardLast4: string;
    CardAuthCode: string;
    Reference: string;
    notes: string;
    selected_bank_id: string;
}

interface ServiceJob {
    id: number;
    job_number: string;
    device_model: string;
    device_brand: string;
    device_serial?: string;
    // backend totals
    total_parts_cost?: number | string;
    total_service_charge?: number | string;
    total_amount?: number | string;
    // backend payments
    advanced_payment?: number | string;
    paid_amount?: number | string;
    balance_amount: number;
    card_balance_amount?: number;
    items?: Array<{
        item_type: 'part' | 'service_charge';
        item_name: string;
        quantity: number;
        unit_price: number;
    }>;
}

interface PendingInvoice {
    id: number;
    invoice_no: string;
    transaction_date: string;
    balance_amount: number | string;
}

type Method = 'cash' | 'cheque' | 'card' | 'credit' | 'bank' | 'applied_credit';

type Totals = {
    partsTotal: number;
    serviceTotal: number;
    subtotal: number;
    advancedPayment: number;
    paidAmount: number;
    netTotal: number;
    balance: number;
};

interface PaymentHistory {
    id: number;
    amount: string;
    date: string;
    method: string;
    reference: string | null;
    cheque_no: string | null;
    bank_name: string | null;
    branch: string | null;
    created_at: string;
}

export default function CustomerPaymentForm({ customers, customer, bankAccounts, onSuccess }: Props) {
    const { data, setData, errors, reset } = useForm<FormData>({
        AccKy: customer?.AccKy?.toString() || '',
        customer_code: customer?.AccCd || '',
        customer_name: customer?.AccNm || '',
        amount: '',
        service_job_id: '',
        sales_transaction_id: '',
        method: 'cash' as Method,
        TrnDt: new Date().toLocaleDateString('en-CA'),
        ChqueNo: '',
        BankNm: '',
        ChqueBranch: '',
        BankBranch: '',
        ChqueDt: new Date().toLocaleDateString('en-CA'),
        CardLast4: '',
        CardAuthCode: '',
        Reference: '',
        notes: '',
        selected_bank_id: '',
    });

    const [pendingServiceJobs, setPendingServiceJobs] = useState<ServiceJob[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [selectedJob, setSelectedJob] = useState<ServiceJob | null>(null);

    const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
    const [invoiceAllocations, setInvoiceAllocations] = useState<Record<number, string>>({});

    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [totalOutstanding, setTotalOutstanding] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // confirmation dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);

    // search state for customer combobox
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerOptions, setCustomerOptions] = useState<Array<{AdrKy:number; AdrCd:string; full_name:string;}>>([]);

    const printReceipt = (paymentId: number) => {
        const toastId = toast.loading('Generating receipt...');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `/admin/customer-payments/${paymentId}/receipt`;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
            toast.dismiss(toastId);
            toast.success('Print command sent.', { duration: 2000 });
            // The iframe contains auto-print script, so it will trigger automatically.
            // We just need to clean up after some time.
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 10000);
        };
    };

    // remote-search when query changes (debounced)
    useEffect(() => {
        if (customerQuery.length < 2) {
            setCustomerOptions([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/admin/customer-payments/search-customers?search=${encodeURIComponent(customerQuery)}`);
                if (res.ok) {
                    const list = await res.json();
                    setCustomerOptions(list);
                }
            } catch (err) {
                console.error('Customer search error:', err);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [customerQuery]);

    // clear query when dropdown closes
    useEffect(() => {
        if (!customerSearchOpen) setCustomerQuery('');
    }, [customerSearchOpen]);

    const filteredCustomers = customerOptions; // already filtered by backend

    const handleBankSelection = (bankId: string) => {
        const bank = bankAccounts?.find((b: BankAccountOption) => b.id === parseInt(bankId));
        setData('selected_bank_id', bankId);
        if (bank) {
            setData('BankNm', bank.bank_name);
            if (data.method === 'cheque') {
                setData('ChqueBranch', bank.branch_name);
            }
            if (data.method === 'bank') {
                setData('BankBranch', bank.branch_name);
            }
        } else {
            setData('BankNm', '');
            setData('ChqueBranch', '');
            setData('BankBranch', '');
        }
    };

    // Fetch jobs and invoices on mount if AccKy is pre-filled from customer prop
    useEffect(() => {
        if (data.AccKy) {
            fetchPendingServiceJobs(data.AccKy);
            fetchPendingInvoices(data.AccKy);
            fetchPaymentHistory(data.AccKy);
        }
    }, []);

    useEffect(() => {
        if (selectedInvoiceIds.length === 0) return;
        const allocatedTotal = selectedInvoiceIds.reduce((sum, id) => {
            const allocation = parseFloat(invoiceAllocations[id] || '0');
            return sum + (isNaN(allocation) ? 0 : allocation);
        }, 0);
        setData('amount', allocatedTotal > 0 ? allocatedTotal.toFixed(2) : '');
    }, [selectedInvoiceIds, invoiceAllocations]);

    // When payment method changes, update the amount for selected job to reflect card vs cash prices
    useEffect(() => {
        if (selectedJob) {
            const totals = computeJobTotals(selectedJob, data.method);
            setData('amount', totals.balance > 0 ? Number(totals.balance).toFixed(2) : '');
        }
    }, [data.method]);

    // original submit triggers confirmation dialog
    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // preliminary validation
        if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
            alert('Please enter a valid positive amount greater than zero.');
            return;
        }

        if (!data.AccKy) {
            alert('Please select a customer.');
            return;
        }

        if ((pendingInvoices.length > 0 || pendingServiceJobs.length > 0) && selectedInvoiceIds.length === 0 && !selectedJob) {
            alert('Please select the pending invoice or service job that the customer is paying for.');
            return;
        }

        if (selectedInvoiceIds.length > 0) {
            const totalAllocated = selectedInvoiceIds.reduce((sum, id) => {
                const allocation = parseFloat(invoiceAllocations[id] || '0');
                return sum + (isNaN(allocation) ? 0 : allocation);
            }, 0);

            const invalidAllocation = selectedInvoiceIds.some((id) => {
                const invoice = pendingInvoices.find((inv) => inv.id === id);
                const allocation = parseFloat(invoiceAllocations[id] || '0');
                const balance = invoice ? parseFloat(String(invoice.balance_amount || 0)) : 0;
                return !invoice || isNaN(allocation) || allocation <= 0 || allocation > (balance + 0.01);
            });

            if (invalidAllocation) {
                alert('Please enter valid invoice allocations (greater than 0 and not above due amount).');
                return;
            }

            if (Math.abs(totalAllocated - Number(data.amount || 0)) > 0.01) {
                alert('Payment amount must equal the total allocated amount for selected invoices.');
                return;
            }
        }

        // open the styled confirmation dialog instead of window.confirm
        setConfirmOpen(true);
    };

    // called when user confirms in dialog
    const doSubmit = async () => {
        setConfirmOpen(false);
        setIsSubmitting(true);

        const payload: any = {
            customer_id: data.AccKy,
            amount: data.amount,
            payment_date: data.TrnDt,
            payment_method: data.method === 'bank' ? 'bank_transfer' : data.method,
            notes: data.notes,
            selected_bank_id: data.selected_bank_id,
        };

        if (data.service_job_id) payload.service_job_id = data.service_job_id;
        
        if (selectedInvoiceIds.length > 0) {
            payload.invoice_allocations = selectedInvoiceIds.map((id) => ({
                invoice_id: id,
                amount: Number(invoiceAllocations[id] || 0),
            }));
            if (selectedInvoiceIds.length === 1) {
                payload.sales_transaction_id = String(selectedInvoiceIds[0]);
            }
        } else if (data.sales_transaction_id) {
            payload.sales_transaction_id = data.sales_transaction_id;
        }

        if (data.method === 'cash') {
            payload.cash_description = data.notes;
        } else if (data.method === 'cheque') {
            payload.cheque_no = data.ChqueNo;
            payload.cheque_bank = data.BankNm;
            payload.cheque_branch = data.ChqueBranch;
            payload.cheque_date = data.ChqueDt;
            payload.cheque_description = data.notes;
        } else if (data.method === 'bank') {
            payload.transfer_ref_no = data.Reference;
            payload.transfer_bank = data.BankNm;
            payload.transfer_branch = data.BankBranch;
            payload.transfer_date = data.TrnDt;
            payload.transfer_description = data.notes;
        } else if (data.method === 'card') {
            payload.card_last_4 = data.CardLast4;
            payload.card_auth_code = data.CardAuthCode;
        }

        try {
            const response = await axios.post('/admin/customer-payments', payload);
            const result = response.data;

            if (!result.success) {
                const msg = result.errors
                    ? Object.values(result.errors as Record<string, string[]>).flat().join('\n')
                    : (result.message || 'Payment failed!');
                alert(msg);
                return;
            }

            if (data.service_job_id) {
                // If a service job was paid for, open its invoice in a new tab
                window.open(`/service-jobs/${data.service_job_id}/invoice`, '_blank');
            } else if (result.payment_id) {
                // Otherwise print the standard payment receipt
                printReceipt(result.payment_id);
            }

            toast.success('Payment successful!');

            setTimeout(() => {
                if (data.AccKy) {
                    fetchPendingServiceJobs(data.AccKy);
                    fetchPendingInvoices(data.AccKy);
                    fetchPaymentHistory(data.AccKy);
                }
            }, 500);

            setSelectedJob(null);
            setSelectedInvoiceIds([]);
            setInvoiceAllocations({});
            reset('amount', 'ChqueNo', 'BankNm', 'ChqueBranch', 'ChqueDt', 'BankBranch', 'CardLast4', 'CardAuthCode', 'Reference', 'notes', 'service_job_id', 'sales_transaction_id', 'selected_bank_id');
            onSuccess?.();
        } catch (err: any) {
            console.error('Payment error:', err);
            
            if (err.response?.status === 419) {
                alert('Your session has expired. Please refresh the page and try again.');
                window.location.reload();
            } else if (err.response?.data) {
                const result = err.response.data;
                const msg = result.errors
                    ? Object.values(result.errors as Record<string, string[]>).flat().join('\n')
                    : (result.message || 'Payment failed!');
                alert(msg);
            } else {
                alert('A network error occurred. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchPendingServiceJobs = async (customerId: string | number) => {
        if (!customerId || customerId === '') {
            setPendingServiceJobs([]);
            setTotalOutstanding(0);
            return;
        }

        setLoadingJobs(true);
        try {
            const response = await fetch(`/admin/customer-payments/pending-service-jobs?customer_id=${encodeURIComponent(customerId.toString())}`);
            if (response.ok) {
                const data = await response.json();
                setPendingServiceJobs(data.jobs || []);
                setTotalOutstanding(data.total_outstanding ?? data.account_balance ?? 0);
            } else {
                console.error('Failed to fetch pending service jobs:', response.status);
                setPendingServiceJobs([]);
                setTotalOutstanding(0);
            }
        } catch (error) {
            console.error('Error fetching pending service jobs:', error);
            setPendingServiceJobs([]);
            setTotalOutstanding(0);
        } finally {
            setLoadingJobs(false);
        }
    };

    const fetchPendingInvoices = async (customerId: string | number) => {
        if (!customerId || customerId === '') {
            setPendingInvoices([]);
            setSelectedInvoiceIds([]);
            setInvoiceAllocations({});
            return;
        }

        setLoadingInvoices(true);
        try {
            const response = await fetch(`/admin/customer-payments/pending-invoices?customer_id=${encodeURIComponent(customerId.toString())}`);
            if (response.ok) {
                const invoices = await response.json();
                setPendingInvoices(invoices);
                setSelectedInvoiceIds((prev) => prev.filter((id) => invoices.some((inv: PendingInvoice) => inv.id === id)));
            } else {
                console.error('Failed to fetch pending invoices:', response.status);
                setPendingInvoices([]);
                setSelectedInvoiceIds([]);
                setInvoiceAllocations({});
            }
        } catch (error) {
            console.error('Error fetching pending invoices:', error);
            setPendingInvoices([]);
            setSelectedInvoiceIds([]);
            setInvoiceAllocations({});
        } finally {
            setLoadingInvoices(false);
        }
    };

    const fetchPaymentHistory = async (customerId: string | number) => {
        if (!customerId || customerId === '') {
            setPaymentHistory([]);
            return;
        }

        setLoadingHistory(true);
        try {
            const response = await fetch(`/admin/customer-payments/payment-history?customer_id=${encodeURIComponent(customerId.toString())}`);
            if (response.ok) {
                const history = await response.json();
                setPaymentHistory(history);
            } else {
                console.error('Failed to fetch payment history:', response.status);
                setPaymentHistory([]);
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
            setPaymentHistory([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    const formatCurrency = (amount: number): string => {
        return `Rs ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const computeJobTotals = (job: ServiceJob, method?: string): Totals => {
        // Prefer backend pre-calculated totals for consistency, fallback to manual sum
        const partsTotal = job.total_parts_cost != null ? parseFloat(job.total_parts_cost.toString()) : 0;
        const serviceTotal = job.total_service_charge != null ? parseFloat(job.total_service_charge.toString()) : 0;
        const subtotal = job.total_amount != null ? parseFloat(job.total_amount.toString()) : (partsTotal + serviceTotal);

        const advancedPayment = job.advanced_payment ? parseFloat(job.advanced_payment.toString()) : 0;
        const paidAmount = job.paid_amount ? parseFloat(job.paid_amount.toString()) : 0;
        const netTotal = subtotal - advancedPayment;
        // Use balance_amount from backend
        let balance = job.balance_amount != null ? parseFloat(job.balance_amount.toString()) : 0;
        
        if (method === 'card' && job.card_balance_amount != null) {
            balance = parseFloat(job.card_balance_amount.toString());
        }

        return { partsTotal, serviceTotal, subtotal, advancedPayment, paidAmount, netTotal, balance };
    };

    // Auto-update amount when a job is selected (if user wants this behavior, but let's keep it safe or provided via button)
    // Re-interpreting: "customer wa select karahama eyage payment details enna oona service job eke payment summary walin"
    // Maybe show the total outstanding for ALL jobs?
    const aggregateTotals: Totals = pendingServiceJobs.reduce((acc, job) => {
        const t = computeJobTotals(job, data.method);
        return {
            partsTotal: acc.partsTotal + t.partsTotal,
            serviceTotal: acc.serviceTotal + t.serviceTotal,
            subtotal: acc.subtotal + t.subtotal,
            advancedPayment: acc.advancedPayment + t.advancedPayment,
            paidAmount: acc.paidAmount + t.paidAmount,
            netTotal: acc.netTotal + t.netTotal,
            balance: acc.balance + t.balance,
        };
    }, { partsTotal: 0, serviceTotal: 0, subtotal: 0, advancedPayment: 0, paidAmount: 0, netTotal: 0, balance: 0 });

    // Add invoice balances to aggregate
    const invoiceBalance = pendingInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.balance_amount || 0)), 0);
    aggregateTotals.balance += invoiceBalance;

    const selectedTotals: Totals | null = selectedJob ? computeJobTotals(selectedJob, data.method) : null;
    const selectedInvoices = pendingInvoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
    const selectedInvoicesBalance = selectedInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.balance_amount || 0)), 0);
    // Use backend-computed total_outstanding as the authoritative outstanding balance.
    // This matches exactly how the receipt calculates it (sum of all pending job + invoice balances).
    const totalsForDisplay: Totals = selectedJob
        ? selectedTotals!
        : selectedInvoiceIds.length > 0
            ? { ...aggregateTotals, balance: selectedInvoicesBalance }
            : { ...aggregateTotals, balance: totalOutstanding };

    // Calculate unallocated available credit based on sum of pending balances vs ledger outstanding
    const availableCredit = Math.max(0, aggregateTotals.balance - totalOutstanding);

    return (
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start h-full">

            {/* -------------------- LEFT COLUMN: CONTEXT (Span 5) -------------------- */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6 flex flex-col h-full">

                {/* Customer Selection Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-2">
                        <div className="bg-indigo-100 p-1.5 rounded-lg">
                            <User className="h-4 w-4 text-indigo-700" />
                        </div>
                        <h3 className="font-semibold text-slate-800">Customer Details</h3>
                    </div>

                    <div className="p-5 space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-slate-500 tracking-wide">Select Customer</label>
                            <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={customerSearchOpen}
                                        className="w-full justify-between border-slate-300 bg-white focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        {data.AccKy
                                            ? `${data.customer_code || '--'} - ${data.customer_name || '--'}`
                                            : '-- Choose a Customer --'}
                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[92vw] p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search by code or name..."
                                            className="h-9"
                                            value={customerQuery}
                                            onValueChange={setCustomerQuery}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No customer found.</CommandEmpty>
                                            <CommandGroup>
                                                {filteredCustomers.map((c: any) => (
                                                    <CommandItem
                                                            key={c.AdrKy}
                                                            value={`${c.AdrCd} ${c.full_name || c.FstNm} ${c.AdrKy} ${c.TP1 || ''}`}
                                                            onSelect={() => {
                                                                setData(d => ({
                                                                    ...d,
                                                                    AccKy: c.AdrKy.toString(),
                                                                    customer_name: c.full_name,
                                                                    customer_code: c.AdrCd
                                                                }));
                                                                setSelectedJob(null);
                                                                setSelectedInvoiceIds([]);
                                                                setInvoiceAllocations({});
                                                                fetchPendingServiceJobs(c.AdrKy);
                                                                fetchPendingInvoices(c.AdrKy);
                                                                fetchPaymentHistory(c.AdrKy);
                                                                setCustomerSearchOpen(false);
                                                                setCustomerQuery('');
                                                            }}
                                                        >
                                                            {c.AdrCd} - {c.full_name} {c.TP1 ? `- ${c.TP1}` : ''}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            {errors.AccKy && <div className="text-red-500 text-xs mt-1 animate-pulse">{errors.AccKy}</div>}
                        </div>

                        {/* Total Outstanding Card - Highlighted with Breakdown */}
                        {data.AccKy && (
                            <div className={`p-4 rounded-xl border transition-all duration-300 ${totalsForDisplay.balance > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${totalsForDisplay.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {selectedJob ? `Payment Summary: ${selectedJob.job_number}` : 'Aggregate Payment Summary'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {selectedJob ? 'Details for the selected service job' : `Customer's total for ${pendingServiceJobs.length} pending jobs`}
                                        </p>
                                    </div>
                                    <AlertCircle className={`h-5 w-5 ${totalsForDisplay.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
                                </div>

                                <div className="space-y-2.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Parts Total:</span>
                                        <span className="font-bold text-slate-700">{formatCurrency(totalsForDisplay.partsTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Service Charges:</span>
                                        <span className="font-bold text-slate-700">{formatCurrency(totalsForDisplay.serviceTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs items-center">
                                        <span className="text-slate-500 font-medium whitespace-nowrap">Advanced Payment:</span>
                                        <span className="font-bold text-rose-600">{formatCurrency(-totalsForDisplay.advancedPayment)}</span>
                                    </div>

                                    <div className="border-t border-slate-200/50 pt-2 flex justify-between text-xs">
                                        <span className="text-slate-700 font-bold">Grand Total:</span>
                                        <span className="font-extrabold text-indigo-700">{formatCurrency(totalsForDisplay.netTotal)}</span>
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Paid Amount:</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(totalsForDisplay.paidAmount)}</span>
                                    </div>

                                    <div className="flex justify-between text-xs border-b border-slate-200/50 pb-2">
                                        <span className="text-slate-500 font-medium">Total Paid (incl. Advance):</span>
                                        <span className="font-bold text-emerald-600 font-mono italic">{formatCurrency(totalsForDisplay.advancedPayment + totalsForDisplay.paidAmount)}</span>
                                    </div>

                                    <div className="flex justify-between items-end pt-1">
                                        <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                                            {!selectedJob && selectedInvoiceIds.length === 0 ? 'Net Ledger Balance:' : 'Selected Balance Due:'}
                                        </span>
                                        <div className="text-right">
                                            <div className={`text-xl font-black tracking-tight ${totalsForDisplay.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                {loadingJobs ? (
                                                    <span className="text-sm text-slate-400 animate-pulse font-normal">Calculating...</span>
                                                ) : (
                                                    totalsForDisplay.balance < 0
                                                        ? formatCurrency(Math.abs(totalsForDisplay.balance)) + ' CR'
                                                        : formatCurrency(totalsForDisplay.balance)
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {availableCredit > 0 && (
                                        <div className="flex justify-between items-end pt-2 pb-1 border-t border-emerald-200 mt-2">
                                            <span className="text-sm font-black text-emerald-800 uppercase tracking-tighter">
                                                Available Credit:
                                            </span>
                                            <div className="text-right">
                                                <div className="text-2xl font-black tracking-tight text-emerald-600">
                                                    {formatCurrency(availableCredit)}
                                                </div>
                                                <div className="text-[10px] text-emerald-600 font-bold mt-0.5 uppercase">Unallocated Overpayment</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {pendingServiceJobs.length > 0 && !selectedJob && (
                                    <button
                                        onClick={() => {
                                            pendingServiceJobs.forEach(job => {
                                                window.open(`/service-jobs/${job.id}/invoice`, '_blank');
                                            });
                                        }}
                                        className="mt-4 w-full inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition-all duration-200 shadow-sm border border-indigo-200 uppercase tracking-widest"
                                        title="Print All Bills"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Print All Bills
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Jobs List Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col max-h-[360px] sm:max-h-[500px] overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 text-sm flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-indigo-600" />
                            Pending Jobs
                        </h3>
                        {loadingJobs && <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
                        {!data.AccKy ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <User className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm">Select a customer above.</p>
                            </div>
                        ) : pendingServiceJobs.length === 0 && !loadingJobs ? (
                            <div className="flex flex-col items-center justify-center h-48 text-emerald-600 p-4 text-center">
                                <div className="bg-emerald-100 p-3 rounded-full mb-3">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">All caught up!</p>
                                <p className="text-xs text-slate-500 mt-1">No pending payments for this customer.</p>
                            </div>
                        ) : (
                            pendingServiceJobs.map(j => {
                                const totals = computeJobTotals(j as ServiceJob, data.method);
                                const isSelected = selectedJob?.id === j.id;
                                return (
                                    <div
                                        key={j.id}
                                        onClick={() => {
                                            setSelectedJob(j as ServiceJob);
                                            setSelectedInvoiceIds([]);
                                            setInvoiceAllocations({});
                                            setData(d => ({
                                                ...d,
                                                service_job_id: (j as any).id.toString(),
                                                sales_transaction_id: '',
                                                amount: totals.balance > 0 ? Number(totals.balance).toFixed(2) : ''
                                            }));
                                        }}
                                        className={`group p-3 rounded-lg border cursor-pointer transition-all duration-200 relative overflow-hidden ${isSelected
                                            ? 'border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500 transform scale-[1.02]'
                                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                            }`}
                                    >
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
                                        <div className="flex items-center justify-between pl-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800">{j.job_number}</span>
                                                    <a
                                                        href={`/service-jobs/${j.id}/invoice`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                                        title="View Receipt"
                                                    >
                                                        <FileText className="h-3 w-3 mr-1" />
                                                        View Receipt
                                                    </a>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">{j.device_model || j.device_brand}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-rose-600">{formatCurrency(totals.balance)}</div>
                                                <div className="text-[10px] text-slate-400">Due Amount</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {pendingServiceJobs.length > 0 && (
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-center">
                            <Info className="h-3 w-3 mr-1" /> Tap a job to quick-fill
                        </div>
                    )}
                </div>

                {/* Payment History List Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col max-h-[360px] sm:max-h-[500px] overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 text-sm flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-slate-500" />
                            Recent Payment History
                        </h3>
                        {loadingHistory && <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
                        {!data.AccKy ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <User className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm">Select a customer above.</p>
                            </div>
                        ) : paymentHistory.length === 0 && !loadingHistory ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400 p-4 text-center">
                                <div className="bg-slate-100 p-3 rounded-full mb-3">
                                    <Clock className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-600">No payment history found.</p>
                            </div>
                        ) : (
                            paymentHistory.map(payment => (
                                <div
                                    key={payment.id}
                                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800">{new Date(payment.date).toLocaleDateString()}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium uppercase">{payment.method === 'bank_transfer' ? 'Bank' : payment.method}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {payment.method === 'cheque' && `Chq: ${payment.cheque_no || 'N/A'}`}
                                                {(payment.method === 'bank' || payment.method === 'bank_transfer') && `Ref: ${payment.reference || 'N/A'}`}
                                                {payment.method === 'cash' && 'Cash Payment'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-emerald-600">{formatCurrency(parseFloat(payment.amount))}</div>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    printReceipt(payment.id);
                                                }}
                                                className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer mt-1 flex items-center justify-end gap-1"
                                            >
                                                <FileText className="h-3 w-3" /> Receipt
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* -------------------- RIGHT COLUMN: PAYMENT ACTIONS (Span 7) -------------------- */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">

                {/* Pending Invoices List Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col max-h-[360px] sm:max-h-[500px] overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 text-sm flex items-center">
                            <Receipt className="h-4 w-4 mr-2 text-blue-600" />
                            Pending Invoices (Credit)
                        </h3>
                        {loadingInvoices && <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
                        {!data.AccKy ? (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <User className="h-10 w-10 mb-2 opacity-20" />
                                <p className="text-sm">Select a customer above.</p>
                            </div>
                        ) : pendingInvoices.length === 0 && !loadingInvoices ? (
                            <div className="flex flex-col items-center justify-center h-48 text-emerald-600 p-4 text-center">
                                <div className="bg-emerald-100 p-3 rounded-full mb-3">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <p className="text-sm font-medium text-slate-700">No pending invoices!</p>
                            </div>
                        ) : (
                            pendingInvoices.map(inv => {
                                const isSelected = selectedInvoiceIds.includes(inv.id);
                                return (
                                    <div
                                        key={inv.id}
                                        onClick={() => {
                                            setSelectedJob(null);
                                            setData((d) => ({
                                                ...d,
                                                sales_transaction_id: '',
                                                service_job_id: '',
                                            }));
                                            setSelectedInvoiceIds((prev) => {
                                                if (prev.includes(inv.id)) {
                                                    const next = prev.filter((id) => id !== inv.id);
                                                    if (next.length === 0) {
                                                        setData((d) => ({ ...d, amount: '' }));
                                                    }
                                                    return next;
                                                }
                                                return [...prev, inv.id];
                                            });
                                            setInvoiceAllocations((prev) => {
                                                if (selectedInvoiceIds.includes(inv.id)) {
                                                    const next = { ...prev };
                                                    delete next[inv.id];
                                                    return next;
                                                }
                                                if (prev[inv.id]) return prev;
                                                return {
                                                    ...prev,
                                                    [inv.id]: Number(inv.balance_amount || 0) > 0 ? Number(inv.balance_amount).toFixed(2) : '',
                                                };
                                            });
                                        }}
                                        className={`group p-3 rounded-lg border cursor-pointer transition-all duration-200 relative overflow-hidden ${isSelected
                                            ? 'border-blue-500 bg-white shadow-md ring-1 ring-blue-500 transform scale-[1.02]'
                                            : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                                            }`}
                                    >
                                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                        <div className="flex items-center justify-between pl-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800">{inv.invoice_no}</span>
                                                    <a
                                                        href={`/sales/${inv.id}/invoice`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                        title="View Receipt"
                                                    >
                                                        <FileText className="h-3 w-3 mr-1" />
                                                        View Receipt
                                                    </a>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">{new Date(inv.transaction_date).toLocaleDateString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-rose-600">{formatCurrency(parseFloat(String(inv.balance_amount || 0)))}</div>
                                                <div className="text-[10px] text-slate-400">Due Amount</div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="pl-2 mt-3 border-t border-blue-100 pt-2">
                                                <label className="text-[10px] font-semibold uppercase text-slate-500">Allocation Amount</label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={String(inv.balance_amount)}
                                                    value={invoiceAllocations[inv.id] || ''}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        setInvoiceAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }));
                                                    }}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    className="mt-1 h-9 bg-white"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {pendingInvoices.length > 0 && (
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-center">
                            <Info className="h-3 w-3 mr-1" /> Tap invoice(s) and enter allocation amount(s)
                        </div>
                    )}
                </div>

                {/* Main Payment Form Card */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                    <div className="p-4 sm:p-6 pb-2">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center">
                                <Wallet className="mr-2 h-6 w-6 text-indigo-600" />
                                Record Payment
                            </h2>
                        </div>
                        <p className="text-slate-500 text-xs sm:text-sm">Fill in the details below to complete the transaction.</p>
                    </div>

                    <div className="px-4 sm:px-6 py-4 space-y-6">

                        {/* Selected Context Header */}
                        <div className={`transition-all duration-300 overflow-hidden ${(selectedJob || selectedInvoiceIds.length > 0) ? 'opacity-100 max-h-[520px]' : 'opacity-0 max-h-0'}`}>
                            {selectedJob && selectedTotals && (
                                <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative group">
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedJob(null); setData(d => ({ ...d, service_job_id: '' })); }}
                                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Deselect Job"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-start space-x-4">
                                        <div className="bg-white p-2.5 rounded-lg shadow-sm border border-indigo-100">
                                            <Wrench className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Applying Payment To</div>
                                            <h4 className="font-bold text-indigo-900 text-lg leading-none">{selectedJob.job_number}</h4>
                                            <p className="text-sm text-slate-600 mt-1">{selectedJob.device_model || selectedJob.device_brand}</p>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 sm:border-l border-indigo-100 pt-3 sm:pt-0 sm:pl-6 md:pl-10 flex flex-col sm:items-end space-y-2">
                                        <p className="text-xs text-slate-500 mb-1">Outstanding Balance</p>
                                        <p className="text-2xl font-bold text-indigo-700">{formatCurrency(selectedTotals.balance)}</p>
                                        <a
                                            href={`/service-jobs/${selectedJob.id}/invoice`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors duration-200 shadow-sm"
                                            title="Print Bill"
                                        >
                                            <FileText className="h-3 w-3 mr-1" />
                                            Print Bill
                                        </a>
                                    </div>
                                </div>
                            )}

                            {selectedInvoiceIds.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative group">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedInvoiceIds([]);
                                            setInvoiceAllocations({});
                                            setData((d) => ({ ...d, sales_transaction_id: '', amount: '' }));
                                        }}
                                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Clear invoice selections"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-start space-x-4">
                                        <div className="bg-white p-2.5 rounded-lg shadow-sm border border-blue-100">
                                            <Receipt className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Applying Payment To</div>
                                            <h4 className="font-bold text-blue-900 text-lg leading-none">
                                                {selectedInvoiceIds.length === 1 ? 'Selected Invoice' : `${selectedInvoiceIds.length} Selected Invoices`}
                                            </h4>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {selectedInvoices.slice(0, 3).map((inv) => inv.invoice_no).join(', ')}
                                                {selectedInvoices.length > 3 ? ` +${selectedInvoices.length - 3} more` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 sm:border-l border-blue-100 pt-3 sm:pt-0 sm:pl-6 md:pl-10 flex flex-col sm:items-end space-y-2">
                                        <p className="text-xs text-slate-500 mb-1">Selected Outstanding Balance</p>
                                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(selectedInvoicesBalance)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Primary Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                    <DollarSign className="mr-2 h-4 w-4 text-emerald-600" />
                                    Payment Amount
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold group-focus-within:text-emerald-600">Rs.</span>
                                    <Input
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0.00"
                                        type="number"
                                        step="0.01"
                                        className="pl-10 h-11 text-lg font-semibold border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                                {errors.amount && <div className="text-red-500 text-xs mt-1">{errors.amount}</div>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                    <Calendar className="mr-2 h-4 w-4 text-indigo-600" />
                                    Transaction Date
                                </label>
                                <Input
                                    type="date"
                                    value={data.TrnDt}
                                    readOnly
                                    className="h-11 border-slate-200 bg-slate-100 text-slate-800 font-bold cursor-not-allowed focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                {errors.TrnDt && <div className="text-red-500 text-xs mt-1">{errors.TrnDt}</div>}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="border-t border-slate-100 my-2"></div>

                        {/* Payment Method */}
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700 mb-3 block uppercase tracking-wider">Payment Mode</label>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                                {/* Custom visual radio buttons */}
                                {((availableCredit > 0) ? ['cash', 'cheque', 'bank', 'card', 'applied_credit'] : ['cash', 'cheque', 'bank', 'card'] as Method[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                            setData('method', m as Method);
                                            // clear any previously selected bank when changing mode
                                            setData('selected_bank_id', '');
                                            setData('BankNm', '');
                                            setData('ChqueBranch', '');
                                            setData('BankBranch', '');
                                            
                                            // auto-fill amount if applying credit
                                            if (m === 'applied_credit') {
                                                const maxToPay = selectedTotals?.balance ?? selectedInvoicesBalance;
                                                const autoPay = maxToPay > 0 ? Math.min(availableCredit, maxToPay) : availableCredit;
                                                setData('amount', autoPay.toString());
                                            }
                                        }}
                                        className={`relative group flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all duration-300 ${data.method === m
                                            ? 'border-sky-600 bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 scale-105'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
                                            }`}
                                    >
                                        {data.method === m && (
                                            <div className="absolute top-2 right-2">
                                                <div className="bg-white/20 rounded-full p-1 backdrop-blur-sm">
                                                    <CheckCircle2 className="h-3 w-3 text-white" />
                                                </div>
                                            </div>
                                        )}

                                        {m === 'cash' && <Wallet className={`h-8 w-8 mb-3 transition-transform duration-300 ${data.method === m ? 'text-white scale-110' : 'text-slate-400 group-hover:text-sky-600 group-hover:scale-110'}`} />}
                                        {m === 'cheque' && <FileText className={`h-8 w-8 mb-3 transition-transform duration-300 ${data.method === m ? 'text-white scale-110' : 'text-slate-400 group-hover:text-sky-600 group-hover:scale-110'}`} />}
                                        {m === 'bank' && <Building2 className={`h-8 w-8 mb-3 transition-transform duration-300 ${data.method === m ? 'text-white scale-110' : 'text-slate-400 group-hover:text-sky-600 group-hover:scale-110'}`} />}
                                        {m === 'card' && <CreditCard className={`h-8 w-8 mb-3 transition-transform duration-300 ${data.method === m ? 'text-white scale-110' : 'text-slate-400 group-hover:text-sky-600 group-hover:scale-110'}`} />}
                                        {m === 'applied_credit' && <Receipt className={`h-8 w-8 mb-3 transition-transform duration-300 ${data.method === m ? 'text-white scale-110' : 'text-emerald-400 group-hover:text-emerald-600 group-hover:scale-110'}`} />}

                                        <span className={`text-sm font-bold capitalize tracking-wide ${data.method === m ? 'text-white' : 'text-slate-600 group-hover:text-sky-700'}`}>
                                            {m === 'applied_credit' ? 'Apply Credit' : m}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic Fields Container */}
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/60 animate-in fade-in zoom-in-95 duration-200">

                            {data.method === 'cash' && (
                                <div className="text-center py-4 text-slate-500 flex flex-col items-center justify-center">
                                    <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                                        <Wallet className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <p className="text-sm">Cash payment selected.</p>
                                    <p className="text-xs mt-1">Ensure the physical cash is collected.</p>
                                </div>
                            )}

                            {data.method === 'cheque' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Cheque Number</label>
                                        <Input value={data.ChqueNo} onChange={e => setData('ChqueNo', e.target.value)} placeholder="xxxxxx" className="bg-white" />
                                        {errors.ChqueNo && <div className="text-red-500 text-xs">{errors.ChqueNo}</div>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Cheque Date</label>
                                        <Input type="date" value={data.ChqueDt} onChange={e => setData('ChqueDt', e.target.value)} className="bg-white" />
                                        {errors.ChqueDt && <div className="text-red-500 text-xs">{errors.ChqueDt}</div>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Bank Name</label>
                                        <Input value={data.BankNm} onChange={e => setData('BankNm', e.target.value)} placeholder="Bank" className="bg-white" />
                                        {errors.BankNm && <div className="text-red-500 text-xs">{errors.BankNm}</div>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Branch</label>
                                        <Input value={data.ChqueBranch} onChange={e => setData('ChqueBranch', e.target.value)} placeholder="Branch" className="bg-white" />
                                        {errors.ChqueBranch && <div className="text-red-500 text-xs">{errors.ChqueBranch}</div>}
                                    </div>
                                </div>
                            )}

                            {data.method === 'bank' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Select Bank Account <span className="text-rose-500">*</span></label>
                                        <select
                                            value={data.selected_bank_id}
                                            onChange={(e) => handleBankSelection(e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        >
                                            <option value="">-- choose bank account --</option>
                                            {bankAccounts && bankAccounts.map((b: BankAccountOption) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.bank_name} - {b.branch_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Reference / Transfer ID</label>
                                        <Input value={data.Reference} onChange={e => setData('Reference', e.target.value)} placeholder="Ref #" className="bg-white" />
                                    </div>
                                </div>
                            )}

                            {data.method === 'card' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Deposit Bank Account <span className="text-rose-500">*</span></label>
                                        <select
                                            value={data.selected_bank_id}
                                            onChange={(e) => handleBankSelection(e.target.value)}
                                            className="block w-full rounded-lg border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        >
                                            <option value="">-- choose bank account --</option>
                                            {bankAccounts && bankAccounts.map((b: BankAccountOption) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.bank_name} - {b.branch_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Card Last 4 Digits</label>
                                        <Input value={data.CardLast4} onChange={e => setData('CardLast4', e.target.value)} placeholder="xxxx" maxLength={4} className="bg-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-600 uppercase">Auth Code / Ref</label>
                                        <Input value={data.CardAuthCode} onChange={e => setData('CardAuthCode', e.target.value)} placeholder="Ref #" className="bg-white" />
                                    </div>
                                </div>
                            )}
                            {data.method === 'applied_credit' && (
                                <div className="text-center py-4 text-emerald-600 flex flex-col items-center justify-center">
                                    <div className="bg-emerald-50 p-3 rounded-full shadow-sm mb-2 border border-emerald-100">
                                        <Receipt className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <p className="text-sm font-bold">Applying Customer Credit</p>
                                    <p className="text-xs mt-1 text-slate-600">
                                        You have <strong className="text-emerald-700">{formatCurrency(availableCredit)}</strong> available to allocate.
                                    </p>
                                </div>
                            )}

                        </div>

                        {/* Notes Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                <FileText className="mr-2 h-4 w-4 text-slate-400" />
                                Notes (Optional)
                            </label>
                            <Input
                                value={data.notes}
                                onChange={e => setData('notes', e.target.value)}
                                placeholder="Add any remarks about this payment..."
                                className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 backdrop-blur-sm">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                reset();
                                setSelectedJob(null);
                                setSelectedInvoiceIds([]);
                                setInvoiceAllocations({});
                            }}
                            className="w-full sm:w-auto text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        >
                            Reset Form
                        </Button>
                        <Button
                            type="submit"
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px] h-11 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Confirm Payment
                        </Button>
                    </div>
                </div>
            </div>

            {/* Confirmation dialog for submitting payment */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                            {`Confirm payment of Rs ${Number(data.amount).toFixed(2)} for customer ${data.customer_name}?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <button
                                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                disabled={isSubmitting}
                                onClick={doSubmit}
                            >
                                {isSubmitting ? 'Processing...' : 'Confirm'}
                            </button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    );
}



