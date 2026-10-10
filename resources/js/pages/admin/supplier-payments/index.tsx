import { Head, Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    Plus, 
    Eye, 
    CreditCard, 
    DollarSign, 
    Receipt, 
    CheckCircle, 
    AlertCircle, 
    Filter, 
    Building, 
    FileText,
    History,
    Calendar
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { format } from 'date-fns';
import { type BreadcrumbItem } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

interface SupplierPayment {
    id: number;
    payment_no: string;
    supplier_code: string;
    supplier_name: string;
    supplier_address: string;
    supplier_tel: string;
    payment_method: string;
    paid_amount: number;
    payment_date: string;
    bank_name: string;
    bank_reference_no: string;
    notes: string;
    status: string;
    created_by: string;
    created_at: string;
    bank_account?: {
        account_name: string;
        account_number: string;
        bank_name: string;
    };
}

interface BankAccount {
    id: number;
    account_name: string;
    account_number: string;
    bank_name: string;
    branch_name: string;
    account_type: string;
    current_balance?: number;
}

interface Filters {
    [key: string]: string | undefined;
    supplier_code?: string;
    payment_method?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
}

interface Summary {
    total_payments: number;
    payment_count: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    { title: t('Supplier Payments'), href: '#' },
];

export default function SupplierPaymentsIndex() {
    const { payments, bankAccounts, filters, summary, flash } = usePage<{
        payments: { data: SupplierPayment[]; current_page: number; last_page: number; per_page: number; total: number; links: any[] };
        bankAccounts: BankAccount[];
        filters: Filters;
        summary: Summary;
        flash?: { success?: string; error?: string; payment_id?: string };
    }>().props;

    const [currentFilters, setCurrentFilters] = useState<Filters>(filters || {});
    const [showFilters, setShowFilters] = useState(false);
    const processedFlash = useRef<string>('');

    useEffect(() => {
        const flashId = `${flash?.success || ''}-${flash?.error || ''}-${flash?.payment_id || ''}`;
        if (flashId !== '--' && flashId !== processedFlash.current) {
            processedFlash.current = flashId;
            if (flash?.success) {
                toast.success(flash.success);
            }
            if (flash?.error) {
                toast.error(flash.error);
            }
            if (flash?.payment_id) {
                window.open(`/admin/supplier-payments/${flash?.payment_id}/receipt`, '_blank');
            }
        }
    }, [flash]);

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setCurrentFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        const payload: Filters = {};
        Object.entries(currentFilters).forEach(([k, v]) => {
            if (v && v !== 'all') {
                payload[k as keyof Filters] = v;
            }
        });

        router.get('/admin/supplier-payments', payload, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setCurrentFilters({});
        router.get('/admin/supplier-payments', {}, {
            preserveState: true,
            replace: true,
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="w-3 h-3 mr-1" />{t('Completed')}</Badge>;
            case 'pending':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200"><AlertCircle className="w-3 h-3 mr-1" />{t('Pending')}</Badge>;
            case 'cancelled':
                return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">{t('Cancelled')}</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'Cash':
                return <DollarSign className="w-4 h-4 text-emerald-600" />;
            case 'Cheque':
                return <Receipt className="w-4 h-4 text-blue-600" />;
            case 'Bank':
            case 'Online Transfer':
                return <CreditCard className="w-4 h-4 text-indigo-600" />;
            default:
                return <Receipt className="w-4 h-4 text-slate-500" />;
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Supplier Payments')} />

            <div className="min-h-screen bg-slate-50 pb-12">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Supplier Payments')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Manage and track all supplier payment transactions')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/admin/supplier-payments/create"
                                className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('New Payment')}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <History className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Payments')}</p>
                                        <p className="text-lg font-bold text-gray-900">{summary.payment_count}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-emerald-600 p-2 shadow-sm">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Amount')}</p>
                                        <p className="text-lg font-bold text-gray-900">Rs. {summary.total_payments.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Building className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Bank Accounts')}</p>
                                        <p className="text-lg font-bold text-gray-900">{bankAccounts.length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-500 p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Today')}</p>
                                        <p className="text-lg font-bold text-gray-900">{format(new Date(), 'dd MMM, yyyy')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3 no-print">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Transaction History')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Complete log of supplier financial settlements')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        {/* Search Input */}
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search Supplier Code or Name...')}
                                                    value={currentFilters.supplier_code || ''}
                                                    onChange={(e) => handleFilterChange('supplier_code', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            {/* Date From */}
                                            <div className="w-full sm:w-36">
                                                <input
                                                    type="date"
                                                    value={currentFilters.date_from || ''}
                                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                    title={t('From Date')}
                                                />
                                            </div>
                                            
                                            {/* Date To */}
                                            <div className="w-full sm:w-36">
                                                <input
                                                    type="date"
                                                    value={currentFilters.date_to || ''}
                                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                    title={t('To Date')}
                                                />
                                            </div>

                                            {/* Payment Method Filter */}
                                            <div className="w-full sm:w-40">
                                                <select
                                                    value={currentFilters.payment_method ?? 'all'}
                                                    onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="all">{t('All Methods')}</option>
                                                    <option value="Cash">{t('Cash')}</option>
                                                    <option value="Cheque">{t('Cheque')}</option>
                                                    <option value="Bank">{t('Bank Deposit')}</option>
                                                    <option value="Online Transfer">{t('Online Transfer')}</option>
                                                </select>
                                            </div>

                                            {/* Status Filter */}
                                            {/* <div className="w-full sm:w-36">
                                                <select
                                                    value={currentFilters.status ?? 'all'}
                                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="all">{t('All Statuses')}</option>
                                                    <option value="completed">{t('Completed')}</option>
                                                    <option value="pending">{t('Pending')}</option>
                                                    <option value="cancelled">{t('Cancelled')}</option>
                                                </select>
                                            </div> */}

                                            {/* Clear / Apply Buttons */}
                                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                                <button
                                                    onClick={clearFilters}
                                                    className="inline-flex items-center justify-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                                    title={t('Clear Filters')}
                                                >
                                                    <Filter className="h-4 w-4 sm:mr-1" />
                                                    <span className="hidden sm:inline">{t('Clear')}</span>
                                                </button>
                                                <button
                                                    onClick={applyFilters}
                                                    className="inline-flex items-center justify-center bg-vismass-blue text-white px-3 py-2 text-sm rounded-lg hover:bg-vismass-blue/90 transition-all duration-200 font-medium whitespace-nowrap"
                                                    title={t('Search Records')}
                                                >
                                                    <Search className="h-4 w-4 sm:mr-1" />
                                                    <span className="hidden sm:inline">{t('Search')}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>



                                {/* Print Header */}
                                <div className="print-header" style={{ display: 'none' }}>
                                    <div className="text-center mb-4">
                                        <div className="text-3xl font-black" style={{ marginBottom: '5px' }}>
                                            <span style={{ color: '#00aeef' }}>VIS</span>
                                            <span style={{ color: '#737578' }}>MASS</span>
                                        </div>
                                        <div className="text-sm text-slate-600">Supplier Payment History Report</div>
                                        <div className="text-xs text-slate-500">
                                            Generated on: {format(new Date(), 'PPP p')}
                                        </div>
                                    </div>
                                </div>
                                {/* transaction table */}
                                <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-[1000px] w-full">
                                            <thead className="bg-slate-100 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">{t('#')}</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Receipt Info')}</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Supplier')}</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Payment Method')}</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Amount (Rs)')}</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Bank / Ref')}</th>
                                                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Status')}</th>
                                                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider no-print">{t('Actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {payments.data.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                                                            {t('No payment records found matching your criteria')}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    payments.data.map((payment, index) => (
                                                        <tr key={payment.id} className="hover:bg-slate-50 transition-colors group">
                                                            <td className="px-4 py-3 text-center text-sm font-medium text-slate-500">
                                                                {(payments.current_page - 1) * payments.per_page + index + 1}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-slate-900">{payment.payment_no}</div>
                                                                <div className="text-[10px] text-slate-500 flex items-center">
                                                                    <Calendar className="h-3 w-3 mr-1" />
                                                                    {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-slate-900">{payment.supplier_name}</div>
                                                                <Badge variant="outline" className="text-[10px] h-4 font-mono bg-slate-50">{payment.supplier_code}</Badge>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center space-x-2">
                                                                    {getPaymentMethodIcon(payment.payment_method)}
                                                                    <span className="text-sm font-medium">{payment.payment_method}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm font-black text-slate-900 bg-slate-50/30">
                                                                {payment.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                                {payment.bank_account ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium text-xs leading-tight">{payment.bank_account.bank_name}</span>
                                                                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{payment.bank_account.account_number}</span>
                                                                    </div>
                                                                ) : payment.bank_name ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium text-xs leading-tight">{payment.bank_name}</span>
                                                                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{payment.bank_reference_no}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 font-italic">Internal / Cash</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {getStatusBadge(payment.status)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right no-print">
                                                                <div className="flex items-center justify-end space-x-2">
                                                                    <a
                                                                        href={`/admin/supplier-payments/${payment.id}/receipt`}
                                                                        target="_blank"
                                                                        className="p-1 px-2 text-xs font-semibold rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center shadow-sm"
                                                                        title={t('Print Receipt')}
                                                                    >
                                                                        <FileText className="h-3.5 w-3.5 mr-1" />
                                                                        {t('Receipt')}
                                                                    </a>
                                                                    <Link href={`/admin/supplier-payments/${payment.id}`}>
                                                                        <Button variant="ghost" size="sm" className="h-7 hover:bg-vismass-blue hover:text-white transition-all">
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Pagination */}
                                {payments.last_page > 1 && (
                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
                                        <div className="text-xs text-slate-500 font-medium italic underline decoration-slate-200 underline-offset-4">
                                            {t('Showing')} {((payments.current_page - 1) * payments.per_page) + 1} {t('to')}{' '}
                                            {Math.min(payments.current_page * payments.per_page, payments.total)} {t('of')}{' '}
                                            {payments.total} {t('transactions')}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {payments.links.map((link, index) => (
                                                <Link key={index} href={link.url || '#'} preserveScroll>
                                                    <Button
                                                        variant={link.active ? 'default' : 'outline'}
                                                        size="sm"
                                                        disabled={!link.url}
                                                        className={`min-w-[40px] text-xs h-8 ${link.active ? 'bg-vismass-blue text-white' : 'text-slate-600'}`}
                                                    >
                                                        {link.label.replace('&laquo;', '«').replace('&raquo;', '»')}
                                                    </Button>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="text-center mt-10 text-slate-400 no-print">
                                    <p className="text-[10px] uppercase tracking-[0.2em] font-black">{t('Supplier Financial Management • Vismass Distribution')}</p>
                                </div>

                                {/* Print Footer */}
                                <div className="print-footer" style={{ display: 'none' }}>
                                    <span>Developed by Unitec Software Solution</span>
                                    <span>
                                        Printed on: {format(new Date(), 'PPP p')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                        margin-top: 5mm;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    #printable-payments,
                    #printable-payments * {
                        visibility: visible;
                    }
                    
                    #printable-payments {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .print-header {
                        margin-bottom: 20px;
                        border-bottom: 2pt solid #000;
                        padding-bottom: 10px;
                        display: block !important;
                    }
                    
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 8pt !important;
                        color: #000 !important;
                        page-break-inside: auto;
                    }
                    
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    
                    thead {
                        display: table-header-group;
                    }
                    
                    th, td {
                        border: 0.5pt solid #000 !important;
                        padding: 4pt !important;
                        color: #000 !important;
                        white-space: normal !important;
                        text-align: left;
                    }
                    
                    th {
                        background-color: #f1f5f9 !important;
                        -webkit-print-color-adjust: exact;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    
                    .text-right {
                        text-align: right !important;
                    }
                    
                    .text-center {
                        text-align: center !important;
                    }
                    
                    .print-footer {
                        margin-top: 30px;
                        padding-top: 10px;
                        border-top: 1pt solid #e0e0e0;
                        font-size: 8pt;
                        display: flex !important;
                        justify-content: space-between;
                        color: #666 !important;
                    }
                }
            `}</style> */}
        </AppLayout>
    );
}
