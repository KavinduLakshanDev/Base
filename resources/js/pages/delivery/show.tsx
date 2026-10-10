import AppLayout from '@/layouts/app-layout';
import { Head, router, Link, useForm, usePage } from '@inertiajs/react';
import { Truck, MapPin, CheckCircle, Clock, Package, ArrowLeft, Edit, Printer, Phone, Mail, User, Calendar, DollarSign, PlusCircle, Trash2, CreditCard, AlertTriangle, CheckCheck, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Payment {
    id: number;
    amount: string | number;
    method: 'cash' | 'cheque' | 'transfer' | 'card';
    status: 'pending' | 'cleared' | 'bounced';
    service_charge: string | number | null;
    related_payment_id: number | null;
    reference_no: string | null;
    bank_name: string | null;
    payment_date: string;
    notes: string | null;
    recorded_by: number | null;
    recordedBy?: { first_name: string; last_name: string } | null;
}

interface Props {
    delivery: any;
    invoiceTotal: number;
    paidAmount: number;
    returnedAmount: number;
    outstanding: number;
    paymentStatus: 'unpaid' | 'partial' | 'paid';
    bankAccounts: Array<{ id: number; bank_name: string; branch_name: string; account_name: string; account_number: string }>;
    otherDeliveries: any[];
}

export default function DeliveryShow({ delivery, invoiceTotal, paidAmount, returnedAmount, outstanding, paymentStatus, bankAccounts, otherDeliveries }: Props) {
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [bounceProcessing, setBounceProcessing] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        method: 'cash',
        reference_no: '',
        bank_name: '',
        branch: '',
        bank_account_id: '',
        payment_date: new Date().toISOString().slice(0, 10),
        notes: '',
        allocations: [] as Array<{ delivery_id: number; amount: string | number; delivery_number: string; outstanding: number }>,
    });

    const autoDistribute = (total: string) => {
        let remaining = parseFloat(total) || 0;
        const newAllocations = [];
        
        // 1. Current delivery first
        const currentPay = Math.min(remaining, outstanding);
        newAllocations.push({ 
            delivery_id: delivery.id, 
            amount: currentPay.toFixed(2), 
            delivery_number: delivery.delivery_number,
            outstanding: outstanding
        });
        remaining -= currentPay;

        // 2. Others FIFO
        for (const other of otherDeliveries) {
            if (remaining <= 0) {
                newAllocations.push({ 
                    delivery_id: other.id, 
                    amount: '0.00', 
                    delivery_number: other.delivery_number,
                    outstanding: other.outstanding_balance 
                });
                continue;
            }
            const pay = Math.min(remaining, other.outstanding_balance);
            newAllocations.push({ 
                delivery_id: other.id, 
                amount: pay.toFixed(2), 
                delivery_number: other.delivery_number,
                outstanding: other.outstanding_balance
            });
            remaining -= pay;
        }

        setData('allocations', newAllocations);
    };

    const updateStatus = (status: string) => {
        router.patch(`/deliveries/${delivery.id}/status`, { status });
    };

    const printUrl = (url: string) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        // Remove the iframe after some time (allowing the print dialog to trigger)
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 10000); // 10 seconds is usually enough for the print dialog to load
    };

    const printDelivery = () => {
        printUrl(`/deliveries/${delivery.id}/receipt`);
    };

    const submitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/deliveries/${delivery.id}/payments`, {
            onSuccess: (page) => { 
                reset(); 
                setShowPaymentForm(false); 
                // Auto-print the receipt using the flashed payment_id
                const paymentId = (page.props.flash as any)?.payment_id;
                if (paymentId) {
                    printPaymentReceipt(paymentId);
                }
            },
        });
    };

    const deletePayment = (paymentId: number) => {
        if (confirm('Delete this payment record?')) {
            router.delete(`/deliveries/${delivery.id}/payments/${paymentId}`);
        }
    };

    const clearCheque = (paymentId: number) => {
        if (confirm('Mark this cheque as cleared (funds received in bank)?')) {
            router.patch(`/deliveries/${delivery.id}/payments/${paymentId}/clear`);
        }
    };

    const printPaymentReceipt = (paymentId: number) => {
        printUrl(`/deliveries/${delivery.id}/payments/${paymentId}/receipt`);
    };

    const paymentStatusBadge = () => {
        switch (paymentStatus) {
            case 'paid':    return 'bg-green-100 text-green-800 border border-green-300';
            case 'partial': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
            default:        return 'bg-red-100 text-red-800 border border-red-300';
        }
    };

    const fmt = (v: number | string) =>
        parseFloat(v as string).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <AppLayout breadcrumbs={[
            { title: 'Deliveries', href: '/deliveries' },
            { title: `Delivery #${delivery.delivery_number}`, href: `/deliveries/${delivery.id}` }
        ]}>
            <Head title={`Delivery #${delivery.delivery_number} - POS System`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/deliveries"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Delivery #{delivery.delivery_number}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        View delivery details and manage status
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={printDelivery}
                                    className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-4 py-2 text-sm font-medium transition-all duration-200 border border-white/30"
                                >
                                    <Printer className="w-4 h-4 inline mr-2" />
                                    Print
                                </button>
                                <Link
                                    href={`/deliveries/${delivery.id}/edit`}
                                    className="rounded-lg bg-white/20 hover:bg-white/30 text-white px-4 py-2 text-sm font-medium transition-all duration-200 border border-white/30"
                                >
                                    <Edit className="w-4 h-4 inline mr-2" />
                                    Edit
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Status Card */}
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Delivery Status</h3>
                                    <select
                                        value={delivery.status}
                                        onChange={(e) => updateStatus(e.target.value)}
                                        className={`text-sm font-medium px-3 py-1 rounded-full border-0 ${delivery.status === 'delivered'
                                                ? 'bg-green-100 text-green-800'
                                                : delivery.status === 'delivering'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : delivery.status === 'assigned'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        <option value="assigned">Assigned</option>
                                        <option value="delivering">Delivering</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${['assigned','delivering','delivered'].includes(delivery.status) ? 'bg-green-100' : 'bg-gray-100'}`}>
                                            <CheckCircle className={`w-6 h-6 ${['assigned','delivering','delivered'].includes(delivery.status) ? 'text-green-600' : 'text-gray-400'}`} />
                                        </div>
                                        <p className="text-xs text-slate-600">Assigned</p>
                                    </div>
                                    <div className="text-center">
                                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${['delivering','delivered'].includes(delivery.status) ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            <Truck className={`w-6 h-6 ${['delivering','delivered'].includes(delivery.status) ? 'text-blue-600' : 'text-gray-400'}`} />
                                        </div>
                                        <p className="text-xs text-slate-600">In Transit</p>
                                    </div>
                                    <div className="text-center">
                                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${delivery.status === 'delivered' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                            <CheckCircle className={`w-6 h-6 ${delivery.status === 'delivered' ? 'text-green-600' : 'text-gray-400'}`} />
                                        </div>
                                        <p className="text-xs text-slate-600">Delivered</p>
                                    </div>
                                    <div className="text-center">
                                        <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${delivery.status === 'cancelled' ? 'bg-red-100' : 'bg-gray-100'}`}>
                                            <Clock className={`w-6 h-6 ${delivery.status === 'cancelled' ? 'text-red-600' : 'text-gray-400'}`} />
                                        </div>
                                        <p className="text-xs text-slate-600">Cancelled</p>
                                    </div>
                                </div>
                            </div>

                            {/* Delivery Items */}
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Delivery Items</h3>
                                <div className="space-y-4">
                                    {delivery.items?.map((item: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-vismass-blue/10 rounded-lg flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-vismass-blue" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{item.ItemName}</p>
                                                    <p className="text-sm text-slate-600">Qty: {Number(item.quantity || 0).toFixed()} {item.Unit && `× ${item.Unit}`}</p>
                                                    {item.batch_no && <p className="text-xs text-slate-500">Batch: {item.batch_no}</p>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-slate-900">{fmt(item.unit_price)}</p>
                                                <p className="text-sm text-slate-600">Total: {fmt(item.total_amount)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {delivery.items?.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-lg font-semibold text-slate-800">Invoice Total</span>
                                        <span className="text-lg font-bold text-vismass-blue">{fmt(invoiceTotal)}</span>
                                    </div>
                                )}
                            </div>

                            {/* ── Payment Collection Panel ─────────────── */}
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <CreditCard className="w-5 h-5 text-slate-500" />
                                        <h3 className="text-lg font-semibold text-slate-800">Payment Collection</h3>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${paymentStatusBadge()}`}>
                                            {paymentStatus}
                                        </span>
                                    </div>
                                    {/* {outstanding > 0 && (
                                        <button
                                            onClick={() => setShowPaymentForm(v => !v)}
                                            className="flex items-center gap-1 rounded-lg bg-vismass-blue text-white px-3 py-1.5 text-sm font-medium hover:bg-vismass-blue/90 transition"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            {showPaymentForm ? 'Cancel' : 'Record Payment'}
                                        </button>
                                    )} */}
                                </div>

                                {/* Summary strip */}
                                <div className={`grid ${returnedAmount > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-3 mb-4`}>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-slate-500">Invoice Total</p>
                                        <p className="font-semibold text-slate-800">{fmt(invoiceTotal)}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-slate-500">Paid</p>
                                        <p className="font-semibold text-green-700">{fmt(paidAmount)}</p>
                                    </div>
                                    {returnedAmount > 0 && (
                                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                                            <p className="text-xs text-slate-500">Returned</p>
                                            <p className="font-semibold text-orange-700">{fmt(returnedAmount)}</p>
                                        </div>
                                    )}
                                    <div className={`rounded-lg p-3 text-center ${outstanding > 0 ? 'bg-red-50' : (outstanding < 0 ? 'bg-blue-50' : 'bg-green-50')}`}>
                                        <p className="text-xs text-slate-500">{outstanding < 0 ? 'Overpaid / Credit' : 'Outstanding'}</p>
                                        <p className={`font-semibold ${outstanding > 0 ? 'text-red-700' : (outstanding < 0 ? 'text-blue-700' : 'text-green-700')}`}>
                                            {outstanding < 0 ? fmt(Math.abs(outstanding)) : fmt(outstanding)}
                                        </p>
                                    </div>
                                </div>

                                {/* Record payment form */}
                                {showPaymentForm && (
                                    <form onSubmit={submitPayment} className="border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50 space-y-3">
                                        <h4 className="font-medium text-slate-700 text-sm">New Payment</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">Total Amount <span className="text-red-500">*</span></label>
                                                <input type="number" step="0.01" min="0.01"
                                                    value={data.amount} 
                                                    onChange={e => {
                                                        setData('amount', e.target.value);
                                                        if (data.allocations.length > 0) {
                                                            autoDistribute(e.target.value);
                                                        }
                                                    }}
                                                    placeholder="Enter total amount"
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue"
                                                    required />
                                                {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">Method <span className="text-red-500">*</span></label>
                                                <select value={data.method} onChange={e => setData('method', e.target.value)}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue">
                                                    <option value="cash">Cash</option>
                                                    <option value="cheque">Cheque</option>
                                                    <option value="transfer">Bank Transfer</option>
                                                    <option value="card">Card Payment</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
                                                <input type="date" value={data.payment_date}
                                                    onChange={e => setData('payment_date', e.target.value)}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue"
                                                    required />
                                            </div>
                                            {(data.method === 'cheque' || data.method === 'transfer' || data.method === 'card') && (
                                                <div>
                                                    <label className="block text-xs text-slate-600 mb-1">
                                                        {data.method === 'cheque' ? (
                                                            <>Cheque No. <span className="text-red-500">*</span></>
                                                        ) : 'Reference No.'}
                                                    </label>
                                                    <input type="text" value={data.reference_no}
                                                        onChange={e => {
                                                            let v = e.target.value;
                                                            if (data.method === 'cheque') {
                                                                // allow only digits, max 6
                                                                v = v.replace(/\D/g, '').slice(0, 6);
                                                            }
                                                            setData('reference_no', v);
                                                        }}
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue" 
                                                        {...(data.method==='cheque'?{maxLength:6, required: true}:undefined)}
                                                        />
                                                    {errors.reference_no && <p className="text-xs text-red-500 mt-0.5">{errors.reference_no}</p>}
                                                </div>
                                            )}
                                        </div>
                                        {(data.method === 'transfer' || data.method === 'card') && (
                                            <div>
                                                <label className="block text-xs text-slate-600 mb-1">Company Bank Account <span className="text-red-500">*</span></label>
                                                <select value={data.bank_account_id} 
                                                    onChange={e => {
                                                        const id = e.target.value;
                                                        setData('bank_account_id', id);
                                                        const account = bankAccounts.find(ba => String(ba.id) === String(id));
                                                        if (account) {
                                                            setData('bank_name', account.bank_name);
                                                        }
                                                    }}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue"
                                                    required>
                                                    <option value="">Select Bank Account</option>
                                                    {bankAccounts.map(ba => (
                                                        <option key={ba.id} value={ba.id}>
                                                            {ba.bank_name} - {ba.account_name} ({ba.account_number})
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.bank_account_id && <p className="text-xs text-red-500 mt-0.5">{errors.bank_account_id}</p>}
                                            </div>
                                        )}
                                        {data.method === 'cheque' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-slate-600 mb-1">Bank Name <span className="text-red-500">*</span></label>
                                                    <input type="text" value={data.bank_name}
                                                        onChange={e => setData('bank_name', e.target.value)}
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue" 
                                                        required />
                                                    {errors.bank_name && <p className="text-xs text-red-500 mt-0.5">{errors.bank_name}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-600 mb-1">Bank Branch <span className="text-red-500">*</span></label>
                                                    <input type="text" value={data.branch}
                                                        onChange={e => setData('branch', e.target.value)}
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue" 
                                                        required />
                                                    {errors.branch && <p className="text-xs text-red-500 mt-0.5">{errors.branch}</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Multi-Delivery Allocation Section */}
                                        {otherDeliveries.length > 0 && (
                                            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Payment Allocation</p>
                                                    {data.allocations.length === 0 ? (
                                                        <button type="button" onClick={() => autoDistribute(data.amount)}
                                                            className="text-[10px] text-vismass-blue hover:underline font-medium">
                                                            + Allocate to multiple deliveries
                                                        </button>
                                                    ) : (
                                                        <button type="button" onClick={() => setData('allocations', [])}
                                                            className="text-[10px] text-red-500 hover:underline font-medium">
                                                            Reset to single delivery
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {data.allocations.length > 0 && (
                                                    <div className="space-y-1.5 pt-1">
                                                        {data.allocations.map((alloc, idx) => (
                                                            <div key={alloc.delivery_id} className="flex items-center justify-between gap-3 text-xs">
                                                                <span className="text-slate-600 truncate flex-1">
                                                                    #{alloc.delivery_number} (Bal: {fmt(alloc.outstanding)})
                                                                </span>
                                                                <div className="relative w-28">
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">Rs</span>
                                                                    <input type="number" step="0.01" 
                                                                        value={alloc.amount}
                                                                        onChange={e => {
                                                                            const newAlloc = [...data.allocations];
                                                                            newAlloc[idx].amount = e.target.value;
                                                                            setData('allocations', newAlloc);
                                                                        }}
                                                                        className="w-full border border-slate-300 rounded-md pl-7 pr-2 py-1 text-right focus:ring-1 focus:ring-vismass-blue"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                                            <span className="text-[10px] font-bold text-slate-500">Total Allocated</span>
                                                            <span className={`text-xs font-bold ${
                                                                data.method === 'cheque' || Math.abs(data.allocations.reduce((sum, a) => sum + parseFloat(String(a.amount || 0)), 0) - parseFloat(data.amount || '0')) < 0.01
                                                                    ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                                Rs {fmt(data.allocations.reduce((sum, a) => sum + parseFloat(String(a.amount || 0)), 0))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">Notes</label>
                                            <textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                                                rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vismass-blue resize-none" />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button type="button" onClick={() => setShowPaymentForm(false)}
                                                className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100">
                                                Cancel
                                            </button>
                                            <button type="submit" disabled={processing}
                                                className="px-4 py-2 text-sm rounded-lg bg-vismass-blue text-white hover:bg-vismass-blue/90 disabled:opacity-60">
                                                {processing ? 'Saving…' : 'Save Payment'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Payment history */}
                                {delivery.payments?.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment History</p>
                                        {delivery.payments.map((p: Payment) => (
                                            <div key={p.id} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                                                p.status === 'bounced' ? 'bg-red-50 border-red-200' :
                                                p.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                                                'bg-slate-50 border-slate-100'
                                            }`}>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {fmt(p.amount)}
                                                        <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 capitalize">{p.method}</span>
                                                        {/* Status badge */}
                                                        {p.method === 'cheque' && (
                                                            <span className={`ml-1 text-xs font-semibold px-1.5 py-0.5 rounded capitalize ${
                                                                p.status === 'bounced' ? 'bg-red-100 text-red-700' :
                                                                p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-green-100 text-green-700'
                                                            }`}>{p.status}</span>
                                                        )}
                                                        {/* Service charge badge */}
                                                        {p.related_payment_id && Number(p.amount) < 0 && (
                                                            <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">service charge</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {p.payment_date}
                                                        {p.reference_no && ` · Ref: ${p.reference_no}`}
                                                        {p.bank_name && ` · ${p.bank_name}`}
                                                    </p>
                                                    {p.recordedBy && (
                                                        <p className="text-xs text-slate-400">By: {p.recordedBy.first_name} {p.recordedBy.last_name}</p>
                                                    )}
                                                    {p.notes && (
                                                        <p className="text-xs text-slate-400 italic">{p.notes}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {/* Cheque-specific actions */}
                                                    {p.method === 'cheque' && (p.status === 'pending' || p.status === 'cleared') && (
                                                        <>
                                                            {p.status === 'pending' && (
                                                                <button
                                                                    onClick={() => clearCheque(p.id)}
                                                                    title="Mark Cleared"
                                                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"
                                                                >
                                                                    <CheckCheck className="w-3 h-3" /> Clear
                                                                </button>
                                                            )}
                                                            <Link
                                                                href="/pos/cheque-return"
                                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                            >
                                                                <AlertTriangle className="w-3 h-3" /> Return
                                                            </Link>
                                                        </>
                                                    )}
                                                    <button onClick={() => printPaymentReceipt(p.id)} title="Print Receipt"
                                                        className="text-slate-500 hover:text-vismass-blue p-1 rounded">
                                                        <Printer className="w-4 h-4" />
                                                    </button>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-4">No payments recorded yet.</p>
                                )}
                            </div>
                            {/* ── End Payment Panel ─────────────────────── */}
                        </div>

                        {/* Right column — customer & route info */}
                        <div className="space-y-6">
                            {/* Customer Information */}
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Customer Information</h3>
                                <div className="space-y-3">
                                    {delivery.shop ? (
                                        <>
                                            <div className="flex items-center space-x-3">
                                                <User className="w-5 h-5 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{delivery.shop.name}</p>
                                                    <p className="text-sm text-slate-600">Shop</p>
                                                </div>
                                            </div>
                                            {delivery.shop.contact_phone && (
                                                <div className="flex items-center space-x-3">
                                                    <Phone className="w-5 h-5 text-slate-400" />
                                                    <div>
                                                        <p className="font-medium text-slate-900">{delivery.shop.contact_phone}</p>
                                                        <p className="text-sm text-slate-600">Phone</p>
                                                    </div>
                                                </div>
                                            )}
                                            {delivery.shop.address && (
                                                <div className="flex items-center space-x-3">
                                                    <MapPin className="w-5 h-5 text-slate-400" />
                                                    <div>
                                                        <p className="font-medium text-slate-900">{delivery.shop.address}</p>
                                                        <p className="text-sm text-slate-600">Shop Address</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center space-x-3">
                                                <User className="w-5 h-5 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{delivery.customer_name}</p>
                                                    <p className="text-sm text-slate-600">Customer</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Phone className="w-5 h-5 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{delivery.customer_phone}</p>
                                                    <p className="text-sm text-slate-600">Phone</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <MapPin className="w-5 h-5 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-slate-900">{delivery.customer_address}</p>
                                                    <p className="text-sm text-slate-600">Delivery Address</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Route & Delivery Information */}
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Delivery Details</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <MapPin className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="font-medium text-slate-900">{delivery.deliveryRoute?.name || delivery.delivery_route?.name || 'N/A'}</p>
                                            <p className="text-sm text-slate-600">Route Name</p>
                                        </div>
                                    </div>
                                    {delivery.delivery_date && (
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900">{delivery.delivery_date}</p>
                                                <p className="text-sm text-slate-600">Delivery Date</p>
                                            </div>
                                        </div>
                                    )}
                                    {delivery.delivery_time && (
                                        <div className="flex items-center space-x-3">
                                            <Clock className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900">{delivery.delivery_time}</p>
                                                <p className="text-sm text-slate-600">Delivery Time</p>
                                            </div>
                                        </div>
                                    )}
                                    {delivery.priority && (
                                        <div className="flex items-center space-x-3">
                                            <DollarSign className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900 capitalize">{delivery.priority}</p>
                                                <p className="text-sm text-slate-600">Priority</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <p className="font-medium text-slate-900">{new Date(delivery.created_at).toLocaleDateString()}</p>
                                            <p className="text-sm text-slate-600">Created Date</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sales Representative */}
                            {(delivery.assignedUser || delivery.assigned_user) && (
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Assigned Sales Rep</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <User className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {delivery.assignedUser?.first_name || delivery.assigned_user?.first_name} {delivery.assignedUser?.last_name || delivery.assigned_user?.last_name}
                                                </p>
                                                <p className="text-sm text-slate-600">Sales Representative</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Mail className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="font-medium text-slate-900">{delivery.assignedUser?.email || delivery.assigned_user?.email}</p>
                                                <p className="text-sm text-slate-600">Email</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {delivery.notes && (
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Notes</h3>
                                    <p className="text-slate-700">{delivery.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
