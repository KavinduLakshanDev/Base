import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import {
    DollarSign,
    Printer,
    Eye,
    FileText,
    Loader,
    TrendingUp,
    Receipt,
    CreditCard,
    ArrowLeft,
    Filter,
    RotateCcw,
    Download,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import AppLayout from '@/layouts/app-layout';
import ReportPrintHeader from '@/components/report-print-header';
import { Company } from '@/types';


interface Transaction {
    invoice_no: string;
    cashier_name?: string;
    total_amount: number;
    cash_payment: number;
    voucher_amount: number;
    credit_card_amount: number;
    cheque_payment: number;
    bank_transfer_payment: number;
    points_redeemed: number;
    transaction_date: string;
}

interface DailySummary {
    date: string;
    start_invoice: string;
    end_invoice: string;
    total_amount: number;
    total_cash: number;
    total_credit: number;
    total_card: number;
    total_cheque: number;
    total_bank_transfer: number;
    total_points: number;
    transaction_count: number;
    transactions?: Transaction[];
}

interface SalesData {
    daily_summaries: DailySummary[];
    total_amount: number;
    total_cash: number;
    total_credit: number;
    total_card: number;
    total_cheque: number;
    total_bank_transfer: number;
    total_points: number;
    transaction_count: number;
}

interface Props {
    company: Company;
    filters: {
        report_type?: 'daily' | 'monthly';
        from_date?: string;
        to_date?: string;
        item_type?: 'all' | 'printer' | 'stationary';
        section_code?: string;
        cashier_id?: string;
        include_service_jobs?: boolean | string;
    };
    salesData?: SalesData;
    sections?: Array<{ section_code: string; name: string }>;
    users?: Array<{ id: number; name: string }>;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sales Report', href: '/reports/sales' },
];

export default function SalesReport({
    company,
    filters,
    salesData,
    sections = [],
    users = [],
}: Props) {
    const [reportType, setReportType] = useState<'daily' | 'monthly'>(
        filters.report_type || 'daily',
    );
    const [fromDate, setFromDate] = useState<Date | undefined>(() => {
        return (
            filters.from_date
                ? new Date(filters.from_date)
                : (() => {
                    const today = new Date();
                    today.setDate(today.getDate() - 7);
                    return today;
                })()
        );
    });
    const [toDate, setToDate] = useState<Date | undefined>(() => {
        return (
            filters.to_date
                ? new Date(filters.to_date)
                : (() => {
                    const today = new Date();
                    return today;
                })()
        );
    });
    const [isLoading, setIsLoading] = useState(false);
    const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
    const [itemType, setItemType] = useState<'all' | 'printer' | 'stationary'>(
        filters.item_type || 'all',
    );
    const [sectionCode, setSectionCode] = useState<string>(
        filters.section_code || 'all',
    );
    const [cashierId, setCashierId] = useState<string>(
        filters.cashier_id || 'all',
    );
    const [includeServiceJobs, setIncludeServiceJobs] = useState<boolean>(
        filters.include_service_jobs === 'true' || filters.include_service_jobs === true,
    );

    useEffect(() => {
        if (filters.report_type) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setReportType(filters.report_type);
        }
    }, [filters.report_type]);

    useEffect(() => {
        if (filters.from_date) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFromDate(new Date(filters.from_date));
        }
    }, [filters.from_date]);

    useEffect(() => {
        if (filters.to_date) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setToDate(new Date(filters.to_date));
        }
    }, [filters.to_date]);

    useEffect(() => {
        if (filters.item_type) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setItemType(filters.item_type);
        }
    }, [filters.item_type]);

    useEffect(() => {
        if (filters.section_code) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSectionCode(filters.section_code);
        }
    }, [filters.section_code]);

    useEffect(() => {
        if (filters.cashier_id) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCashierId(filters.cashier_id);
        }
    }, [filters.cashier_id]);

    useEffect(() => {
        if (filters.include_service_jobs !== undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIncludeServiceJobs(filters.include_service_jobs === 'true' || filters.include_service_jobs === true);
        }
    }, [filters.include_service_jobs]);

    // Removed automatic print-on-load behaviour.  Printing now only occurs when
    // the user explicitly clicks the "Print" button.

    const handleApplyFilters = () => {
        setIsLoading(true);
        setHasAppliedFilters(true);

        const params = new URLSearchParams();
        params.append('report_type', reportType);
        params.append('item_type', itemType);
        if (sectionCode && sectionCode !== 'all') {
            params.append('section_code', sectionCode);
        }
        if (cashierId && cashierId !== 'all') {
            params.append('cashier_id', cashierId);
        }
        if (includeServiceJobs) {
            params.append('include_service_jobs', 'true');
        }

        if (!fromDate || !toDate) {
            alert('Please select both From Date and To Date.');
            setIsLoading(false);
            return;
        }

        if (fromDate > toDate) {
            alert('From Date cannot be after To Date.');
            setIsLoading(false);
            return;
        }

        const formatLocalDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        params.append('from_date', formatLocalDate(fromDate));
        params.append('to_date', formatLocalDate(toDate));

        const finalUrl = `/reports/sales?${params.toString()}`;

        router.get(
            finalUrl,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsLoading(false),
                onError: (errors) => {
                    console.error('Error fetching sales data:', errors);
                    setIsLoading(false);
                },
            },
        );
    };

    const handlePrint = () => {
        // simply trigger browser print dialog
        window.print();
    };

    const handleExportCsv = () => {
        if (!salesData) return;

        const escape = (value: string | number | null | undefined) => {
            const str = value == null ? '' : String(value);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const rows: Array<Array<string | number>> = [];
        rows.push([`Sales Report (${getReportTitle()})`]);
        rows.push([`Period: ${fromDate?.toLocaleDateString('en-GB') ?? ''} to ${toDate?.toLocaleDateString('en-GB') ?? ''}`]);
        
        const selectedCashier = cashierId && cashierId !== 'all' ? users?.find((u) => String(u.id) === String(cashierId))?.name || cashierId : 'All Cashiers';
        rows.push([`Cashier: ${selectedCashier}`]);
        rows.push([]);

        if (reportType === 'daily') {
            rows.push(['Date', 'Invoice No', 'Cashier', 'Amount (Rs)', 'Cash (Rs)', 'Credit (Rs)', 'Card (Rs)', 'Cheque (Rs)', 'Bank (Rs)']);
            salesData.daily_summaries?.forEach((summary) => {
                summary.transactions?.forEach((transaction, index) => {
                    rows.push([
                        index === 0 ? formatDate(summary.date) : '',
                        transaction.invoice_no,
                        transaction.cashier_name || '',
                        transaction.total_amount,
                        transaction.cash_payment,
                        transaction.voucher_amount,
                        transaction.credit_card_amount,
                        transaction.cheque_payment,
                        transaction.bank_transfer_payment,
                    ]);
                });
                rows.push([`Daily Total (${summary.date})`, '', '', summary.total_amount, summary.total_cash, summary.total_credit, summary.total_card, summary.total_cheque, summary.total_bank_transfer]);
                rows.push([]);
            });
            rows.push(['Grand Total', '', '', salesData.total_amount, salesData.total_cash, salesData.total_credit, salesData.total_card, salesData.total_cheque, salesData.total_bank_transfer]);
        } else {
            rows.push(['Date', 'Invoice Range', 'Amount (Rs)', 'Cash (Rs)', 'Credit (Rs)', 'Card (Rs)', 'Cheque (Rs)', 'Bank (Rs)']);
            salesData.daily_summaries?.forEach((summary) => {
                rows.push([
                    formatDate(summary.date),
                    `${summary.start_invoice} - ${summary.end_invoice}`,
                    summary.total_amount,
                    summary.total_cash,
                    summary.total_credit,
                    summary.total_card,
                    summary.total_cheque,
                    summary.total_bank_transfer,
                ]);
            });
            rows.push([]);
            rows.push(['Grand Total', '', salesData.total_amount, salesData.total_cash, salesData.total_credit, salesData.total_card, salesData.total_cheque, salesData.total_bank_transfer]);
        }

        const csv = rows.map((row) => row.map((col) => escape(col)).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `sales-report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleResetFilters = () => {
        setIsLoading(true);
        setReportType('daily');
        setItemType('all');
        setSectionCode('all');
        setCashierId('all');
        setIncludeServiceJobs(false);
        setFromDate(() => {
            const today = new Date();
            today.setDate(today.getDate() - 7);
            return today;
        });
        setToDate(() => {
            const today = new Date();
            return today;
        });
        setHasAppliedFilters(false);

        router.get(
            '/reports/sales',
            {},
            {
                preserveState: false,
                preserveScroll: false,
                onFinish: () => setIsLoading(false),
                onError: () => setIsLoading(false),
            },
        );
    };

    const formatCurrency = (amount: number | null | undefined) => {
        const value = Number(amount) || 0;
        return new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatDate = (dateString: string | number | null | undefined) => {
        if (!dateString) return '';

        let date: Date;

        if (typeof dateString === 'number') {
            date = new Date(dateString);
            if (isNaN(date.getTime())) {
                date = new Date(dateString * 1000);
            }
        } else if (typeof dateString === 'string') {
            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = new Date(dateString);
            } else {
                date = new Date(dateString);
            }
        } else {
            return String(dateString);
        }

        if (isNaN(date.getTime())) {
            return String(dateString);
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getReportTitle = () => {
        return reportType === 'daily' ? 'Daily Sales Report' : 'Monthly Sales Report';
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('')}>
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 10mm;
                        }
                        
                        body, html {
                            height: auto !important;
                            overflow: visible !important;
                        }
                        
                        body * {
                            visibility: hidden;
                        }
                        
                        /* Reset all parent containers to allow multi-page flow */
                        body,
                        body > div,
                        body > div > div,
                        [data-slot="sidebar-wrapper"],
                        [data-slot="sidebar-inset"],
                        main,
                        .min-h-screen,
                        .min-h-svh {
                            position: static !important;
                            overflow: visible !important;
                            height: auto !important;
                            min-height: 0 !important;
                            max-height: none !important;
                            display: block !important;
                        }
                        
                        #printable-report,
                        #printable-report * {
                            visibility: visible;
                        }
                        
                        #printable-report {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: white;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                        
                        .print-header {
                            margin-bottom: 20px;
                            border-bottom: 2px solid #000;
                            padding-bottom: 10px;
                            display: block !important;
                        }

                        .print-company-name {
                            font-size: 24px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 5px;
                        }
                        .print-report-title {
                            font-size: 18px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 15px;
                        }
                        
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                            margin-bottom: 2px;
                        }
                        
                        .print-table {
                            display: table !important;
                            width: 100% !important;
                            border-collapse: collapse !important;
                            font-size: 10px !important;
                            page-break-inside: auto;
                            color: #000 !important;
                        }
                        
                        .print-table tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        
                        .print-table thead {
                            display: table-header-group;
                        }
                        
                        .print-table th, .print-table td {
                            border: 1px solid #000 !important;
                            padding: 4px !important;
                            color: #000 !important;
                        }
                        
                        .print-table th {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
                            text-align: center;
                        }
                        
                        .print-footer {
                            margin-top: 20px;
                            padding-top: 10px;
                            border-top: 1px solid #000;
                            font-size: 10px;
                            display: flex !important;
                            justify-content: space-between;
                            color: #000 !important;
                        }

                        .total-row td {
                            background-color: #f0fdf4 !important;
                            font-weight: bold !important;
                        }

                        .grand-total-row td {
                            background-color: #f0fdf4 !important;
                            font-weight: bold !important;
                            text-transform: uppercase;
                        }

                        .text-right {
                            text-align: right !important;
                        }
                        
                        .text-center {
                            text-align: center !important;
                        }
                        
                        .text-left {
                            text-align: left !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{t('Sales Report')}</h1>
                                    <p className="text-xs text-white/80">{t('Comprehensive sales analytics and summaries')}</p>
                                </div>
                            </div>

                            {salesData && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleExportCsv}
                                        className="inline-flex items-center rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30 transition-all shadow-sm"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('Export CSV')}
                                    </button>
                                    <button
                                        onClick={handlePrint}
                                        className="inline-flex items-center rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30 transition-all shadow-sm"
                                    >
                                        <Printer className="mr-2 h-4 w-4" />
                                        {t('Print')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div id="printable-report">
                        {/* Print Header - Only visible in print */}
                        <ReportPrintHeader
                            company={company}
                            title={getReportTitle()}
                            period={fromDate && toDate ? `${fromDate.toLocaleDateString('en-GB')} to ${toDate.toLocaleDateString('en-GB')}` : undefined}
                            extraLines={[
                                { label: 'Report Generated', value: new Date().toLocaleString('en-GB') },
                                { label: 'Report Type', value: reportType === 'daily' ? 'Daily Sales Report' : 'Monthly Sales Report' },
                                { label: 'Item Type', value: itemType === 'all' ? 'All Items' : itemType === 'printer' ? 'Printer' : 'Stationary Item' },
                                ...(sectionCode && sectionCode !== 'all'
                                    ? [{ label: 'Section', value: sections?.find((s) => s.section_code === sectionCode)?.name || sectionCode }]
                                    : []),
                                ...(cashierId && cashierId !== 'all'
                                    ? [{ label: 'Cashier', value: users?.find((u) => String(u.id) === String(cashierId))?.name || cashierId }]
                                    : []),
                            ]}
                        />

                        <div className="px-4 sm:px-0">
                            {/* Report Filters */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm no-print mb-6">
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        {t('Report Filters')}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                                        {/* Report Type */}
                                        <div className="md:flex-2 space-y-2">
                                            <Label htmlFor="report_type" className="text-sm font-medium text-gray-700">
                                                {t('Report Type')}
                                            </Label>
                                            <Select
                                                value={reportType}
                                                onValueChange={(value: 'daily' | 'monthly') => {
                                                    setReportType(value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('Select report type')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="daily">
                                                        {t('Daily Sales Report')}
                                                    </SelectItem>
                                                    <SelectItem value="monthly">
                                                        {t('Monthly Sales Report')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Item Type */}
                                        <div className="md:flex-2 space-y-2">
                                            <Label htmlFor="item_type" className="text-sm font-medium text-gray-700">
                                                {t('Item Type')}
                                            </Label>
                                            <Select
                                                value={itemType}
                                                onValueChange={(value: 'all' | 'printer' | 'stationary') => {
                                                    setItemType(value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('Select item type')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All Items')}
                                                    </SelectItem>
                                                    <SelectItem value="printer">
                                                        {t('Printer')}
                                                    </SelectItem>
                                                    <SelectItem value="stationary">
                                                        {t('Stationary Item')}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Section Filter */}
                                        <div className="md:flex-2 space-y-2">
                                            <Label htmlFor="section_code" className="text-sm font-medium text-gray-700">
                                                {t('Section')}
                                            </Label>
                                            <Select
                                                value={sectionCode}
                                                onValueChange={(value: string) => {
                                                    setSectionCode(value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('Select section')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All Sections')}
                                                    </SelectItem>
                                                    {sections?.map((s) => (
                                                        <SelectItem key={s.section_code} value={s.section_code}>
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Cashier Filter */}
                                        <div className="md:flex-2 space-y-2">
                                            <Label htmlFor="cashier_id" className="text-sm font-medium text-gray-700">
                                                {t('Cashier')}
                                            </Label>
                                            <Select
                                                value={cashierId}
                                                onValueChange={(value: string) => {
                                                    setCashierId(value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder={t('Select cashier')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">
                                                        {t('All Cashiers')}
                                                    </SelectItem>
                                                    {users?.map((u) => (
                                                        <SelectItem key={u.id} value={String(u.id)}>
                                                            {u.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Date Range Filters */}
                                        <div className="md:flex-1 space-y-2">
                                            <Label htmlFor="from_date" className="text-sm font-medium text-gray-700">
                                                {t('From Date')} *
                                            </Label>
                                            <input
                                                type="date"
                                                id="from_date"
                                                value={fromDate ? format(fromDate, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        const [y, m, d] = e.target.value.split('-');
                                                        setFromDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                                    } else {
                                                        setFromDate(undefined);
                                                    }
                                                }}
                                                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            />
                                        </div>
                                        <div className="md:flex-1 space-y-2">
                                            <Label htmlFor="to_date" className="text-sm font-medium text-gray-700">
                                                {t('To Date')} *
                                            </Label>
                                            <input
                                                type="date"
                                                id="to_date"
                                                value={toDate ? format(toDate, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        const [y, m, d] = e.target.value.split('-');
                                                        setToDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                                    } else {
                                                        setToDate(undefined);
                                                    }
                                                }}
                                                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 mt-4">
                                        <input
                                            type="checkbox"
                                            id="include_service_jobs"
                                            checked={includeServiceJobs}
                                            onChange={(e) => setIncludeServiceJobs(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-vismass-blue focus:ring-vismass-blue"
                                        />
                                        <Label htmlFor="include_service_jobs" className="text-sm font-medium text-gray-700">
                                            {t('Include Service Jobs')}
                                        </Label>
                                    </div>

                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                        <button
                                            onClick={handleApplyFilters}
                                            disabled={isLoading}
                                            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-vismass-blue px-4 py-2 text-sm font-medium text-white hover:bg-vismass-blue/90"
                                        >
                                            {isLoading ? (
                                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Eye className="mr-2 h-4 w-4" />
                                            )}
                                            {isLoading ? t('Loading...') : t('Apply')}
                                        </button>
                                        <button
                                            onClick={handleResetFilters}
                                            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            {t('Reset')}
                                        </button>
                                    </div>

                                    {/* Loading Overlay */}
                                    {isLoading && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
                                            <div className="flex flex-col items-center space-y-2">
                                                <Loader className="h-6 w-6 animate-spin text-sky-600" />
                                                <span className="text-sm font-medium text-sky-600">
                                                    {t('Loading sales data...')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Report Summary */}
                            {salesData && (
                                <>
                                    <div className="no-print">
                                        {/* Stats Cards */}
                                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                                <div className="items-center flex">
                                                    <div className="rounded-lg bg-green-600 p-2">
                                                        <Receipt className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="ml-2 flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-600 truncate">Transactions</p>
                                                        <p className="text-sm font-bold text-gray-900 truncate">{salesData.transaction_count || 0}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                                <div className="items-center flex">
                                                    <div className="rounded-lg bg-vismass-blue p-2">
                                                        <DollarSign className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="ml-2 flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-600 truncate">Total Sales</p>
                                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(salesData.total_amount)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                                <div className="items-center flex">
                                                    <div className="rounded-lg bg-purple-600 p-2">
                                                        <CreditCard className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="ml-2 flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-600 truncate">Cash</p>
                                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(salesData.total_cash)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                                <div className="items-center flex">
                                                    <div className="rounded-lg bg-orange-600 p-2">
                                                        <TrendingUp className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="ml-2 flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-600 truncate">Credit</p>
                                                    <p className="text-sm font-bold text-gray-900 truncate">
                                                        {formatCurrency(salesData.total_credit || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                            <div className="items-center flex">
                                                <div className="rounded-lg bg-purple-600 p-2">
                                                    <CreditCard className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="ml-2 flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-600 truncate">Card</p>
                                                    <p className="text-sm font-bold text-gray-900 truncate">
                                                        {formatCurrency(salesData.total_card || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                            <div className="items-center flex">
                                                <div className="rounded-lg bg-amber-600 p-2">
                                                    <Receipt className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="ml-2 flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-600 truncate">Cheque</p>
                                                    <p className="text-sm font-bold text-gray-900 truncate">
                                                        {formatCurrency(salesData.total_cheque || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                            <div className="items-center flex">
                                                <div className="rounded-lg bg-indigo-600 p-2">
                                                    <CreditCard className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="ml-2 flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-600 truncate">Bank Transfer</p>
                                                    <p className="text-sm font-bold text-gray-900 truncate">
                                                        {formatCurrency(salesData.total_bank_transfer || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sales Data Table */}
                                        <Card className="rounded-2xl border-slate-200 bg-white shadow-md">
                                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white rounded-t-2xl">
                                                <CardTitle>{t('Sales Transactions')}</CardTitle>
                                                <CardDescription className="text-slate-100">{getReportTitle()}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="p-6">
                                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                                        {reportType === 'daily' ? (
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                                    <tr>
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Date')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Invoice No')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Cashier')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Total Amount (Rs)')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Cash (Rs)')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Credit (Rs)')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Card (Rs)')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Cheque (Rs)')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Bank Transfer (Rs)')}
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {salesData.daily_summaries?.map((summary: DailySummary) => (
                                                                        <React.Fragment key={summary.date}>
                                                                            {summary.transactions?.map((transaction, index) => (
                                                                                <tr key={`${summary.date}-${index}`} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                                                        {index === 0 ? formatDate(summary.date) : ''}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                                                        {transaction.invoice_no}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                                        {transaction.cashier_name || 'Unknown'}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                                                                                        {formatCurrency(transaction.total_amount)}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                        {formatCurrency(transaction.cash_payment)}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                        {formatCurrency(transaction.voucher_amount)}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                        {formatCurrency(transaction.credit_card_amount)}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                        {formatCurrency(transaction.cheque_payment)}
                                                                                    </td>
                                                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                        {formatCurrency(transaction.bank_transfer_payment)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                            {/* Daily Total Row */}
                                                                            <tr className="bg-green-50 border-y-2 border-green-500 font-semibold">
                                                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-green-700 font-bold">
                                                                                    Daily Total
                                                                                </td>
                                                                                <td colSpan={2} className="px-4 py-4 whitespace-nowrap text-sm text-center text-green-700 font-bold">
                                                                                    {summary.transaction_count} Invoices
                                                                                </td>
                                                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-green-700 font-bold">
                                                                                    {formatCurrency(summary.total_amount)}
                                                                                </td>
                                                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-green-700 font-bold">
                                                                                    {formatCurrency(summary.total_cash)}
                                                                                </td>
                                                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-green-700 font-bold">
                                                                                    {formatCurrency(summary.total_credit)}
                                                                                </td>
                                                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-green-700 font-bold">
                                                                                    {formatCurrency(summary.total_card)}
                                                                                </td>
                                                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-green-700 font-bold">
                                                                                    {formatCurrency(summary.total_cheque)}
                                                                                </td>
                                                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-green-700 font-bold">
                                                                                    {formatCurrency(summary.total_bank_transfer)}
                                                                                </td>
                                                                            </tr>
                                                                        </React.Fragment>
                                                                    ))}
                                                                    {/* Grand Total Row */}
                                                                    <tr className="bg-green-50 border-y-2 border-green-500 font-bold">
                                                                        <td className="px-4 py-4 whitespace-nowrap text-sm"></td>
                                                                        <td colSpan={2} className="px-4 py-4 whitespace-nowrap text-sm text-center text-black font-bold uppercase">
                                                                            GRAND TOTAL
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-black font-bold">
                                                                            {formatCurrency(salesData.total_amount)}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-black font-bold">
                                                                            {formatCurrency(salesData.total_cash)}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-black font-bold">
                                                                            {formatCurrency(salesData.total_credit)}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-black font-bold">
                                                                            {formatCurrency(salesData.total_card)}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-black font-bold">
                                                                            {formatCurrency(salesData.total_cheque)}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-black font-bold">
                                                                            {formatCurrency(salesData.total_bank_transfer)}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                                    <tr>
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Date')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Invoice Range')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Total Amount')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Cash')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Credit')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Card')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Cheque')}
                                                                        </th>
                                                                        <th className="px-6 py-4 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                                            {t('Bank')}
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {salesData.daily_summaries?.map((summary, index) => (
                                                                        <tr key={index} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                                                {formatDate(summary.date)}
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                                                {summary.start_invoice} - {summary.end_invoice}
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                                                                                {formatCurrency(summary.total_amount)}
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                {formatCurrency(summary.total_cash)}
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                {formatCurrency(summary.total_credit)}
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                {formatCurrency(summary.total_card)}
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                {formatCurrency(summary.total_cheque)}
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                                                                {formatCurrency(summary.total_bank_transfer)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}

                                                        {(!salesData || !salesData.daily_summaries?.length) && (
                                                            <div className="text-center py-12">
                                                                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                                                    <TrendingUp className="h-12 w-12" />
                                                                </div>
                                                                <h3 className="text-sm font-medium text-gray-900 mb-2">
                                                                    {t('No sales data found')}
                                                                </h3>
                                                                <p className="text-sm text-gray-500">
                                                                    {t('No sales transactions found for the selected criteria.')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Summary Table */}
                                        <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                                            <table className="w-full">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="px-4 py-3 text-center text-sm font-bold text-black border-r border-gray-200">
                                                            Transactions
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-bold text-black border-r border-gray-200">
                                                            Total Sales (Rs)
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-bold text-black border-r border-gray-200">
                                                            Cash (Rs)
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-bold text-black border-r border-gray-200">
                                                            Credit (Rs)
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-bold text-black border-r border-gray-200">
                                                            Card (Rs)
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-bold text-black border-r border-gray-200">
                                                            Cheque (Rs)
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-sm font-bold text-black">
                                                            Bank (Rs)
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white">
                                                    <tr>
                                                        <td className="px-4 py-4 text-center text-lg font-bold text-green-700 border-r border-gray-200">
                                                            {salesData.transaction_count}
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-lg font-bold text-green-700 border-r border-gray-200">
                                                            {formatCurrency(salesData.total_amount)}
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-lg font-bold text-green-700 border-r border-gray-200">
                                                            {formatCurrency(salesData.total_cash)}
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-lg font-bold text-green-700 border-r border-gray-200">
                                                            {formatCurrency(salesData.total_credit)}
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-lg font-bold text-green-700">
                                                            {formatCurrency(salesData.total_card)}
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-lg font-bold text-green-700">
                                                            {formatCurrency(salesData.total_cheque)}
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-lg font-bold text-green-700">
                                                            {formatCurrency(salesData.total_bank_transfer)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Print Only Table */}
                                    <div className="hidden print:block">
                                        <table className="print-table">
                                            <thead>
                                                <tr>
                                                    {reportType === 'daily' ? (
                                                        <>
                                                            <th>Date</th>
                                                            <th>Invoice No</th>
                                                            <th>Cashier</th>
                                                            <th className="text-right">Amount (Rs)</th>
                                                            <th className="text-right">Cash (Rs)</th>
                                                            <th className="text-right">Credit (Rs)</th>
                                                            <th className="text-right">Card (Rs)</th>
                                                            <th className="text-right">Cheque (Rs)</th>
                                                            <th className="text-right">Bank (Rs)</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th>Date</th>
                                                            <th>Start Inv</th>
                                                            <th>End Inv</th>
                                                            <th className="text-right">Amount (Rs)</th>
                                                            <th className="text-right">Cash (Rs)</th>
                                                            <th className="text-right">Credit (Rs)</th>
                                                            <th className="text-right">Card (Rs)</th>
                                                            <th className="text-right">Cheque (Rs)</th>
                                                            <th className="text-right">Bank (Rs)</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportType === 'daily' ? (
                                                    salesData.daily_summaries?.map((summary: DailySummary) => (
                                                        <React.Fragment key={summary.date}>
                                                            {summary.transactions?.map((transaction, index) => (
                                                                <tr key={`${summary.date}-${index}`}>
                                                                    <td className="text-center">{index === 0 ? formatDate(summary.date) : ''}</td>
                                                                    <td className="text-center">{transaction.invoice_no}</td>
                                                                    <td className="text-center">{transaction.cashier_name || 'Unknown'}</td>
                                                                    <td className="text-right">{Number(transaction.total_amount).toFixed(2)}</td>
                                                                    <td className="text-right">{Number(transaction.cash_payment).toFixed(2)}</td>
                                                                    <td className="text-right">{Number(transaction.voucher_amount).toFixed(2)}</td>
                                                                    <td className="text-right">{Number(transaction.credit_card_amount).toFixed(2)}</td>
                                                                    <td className="text-right">{Number(transaction.cheque_payment).toFixed(2)}</td>
                                                                    <td className="text-right">{Number(transaction.bank_transfer_payment).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                            <tr className="total-row">
                                                                <td colSpan={3} className="font-bold text-center">Daily Total</td>
                                                                <td className="text-right font-bold">{Number(summary.total_amount).toFixed(2)}</td>
                                                                <td className="text-right font-bold">{Number(summary.total_cash).toFixed(2)}</td>
                                                                <td className="text-right font-bold">{Number(summary.total_credit).toFixed(2)}</td>
                                                                <td className="text-right font-bold">{Number(summary.total_card).toFixed(2)}</td>
                                                                <td className="text-right font-bold">{Number(summary.total_cheque).toFixed(2)}</td>
                                                                <td className="text-right font-bold">{Number(summary.total_bank_transfer).toFixed(2)}</td>
                                                            </tr>
                                                        </React.Fragment>
                                                    ))
                                                ) : (
                                                    salesData.daily_summaries?.map((summary: DailySummary) => (
                                                        <tr key={summary.date}>
                                                            <td className="text-center">{formatDate(summary.date)}</td>
                                                            <td className="text-center">{summary.start_invoice}</td>
                                                            <td className="text-center">{summary.end_invoice}</td>
                                                            <td className="text-right">{Number(summary.total_amount).toFixed(2)}</td>
                                                            <td className="text-right">{Number(summary.total_cash).toFixed(2)}</td>
                                                            <td className="text-right">{Number(summary.total_credit).toFixed(2)}</td>
                                                            <td className="text-right">{Number(summary.total_card).toFixed(2)}</td>
                                                            <td className="text-right">{Number(summary.total_cheque).toFixed(2)}</td>
                                                            <td className="text-right">{Number(summary.total_bank_transfer).toFixed(2)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                                <tr className="grand-total-row">
                                                    <td colSpan={3} className="text-center font-bold">GRAND TOTAL</td>
                                                    <td className="text-right font-bold">{Number(salesData.total_amount).toFixed(2)}</td>
                                                    <td className="text-right font-bold">{Number(salesData.total_cash).toFixed(2)}</td>
                                                    <td className="text-right font-bold">{Number(salesData.total_credit).toFixed(2)}</td>
                                                    <td className="text-right font-bold">{Number(salesData.total_card).toFixed(2)}</td>
                                                    <td className="text-right font-bold">{Number(salesData.total_cheque).toFixed(2)}</td>
                                                    <td className="text-right font-bold">{Number(salesData.total_bank_transfer).toFixed(2)}</td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        <div className="print-footer">
                                            <span>Developed by Unitec Software Solution</span>
                                            <span>
                                                Printed on: {new Date().toLocaleString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* No Data State */}
                            {!salesData && hasAppliedFilters && (
                                <Card className="rounded-2xl border-slate-200 bg-white shadow-md no-print">
                                    <CardContent className="p-12 text-center">
                                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                                            {t('No Sales Data Found')}
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-500">
                                            {t('No sales data was found for the selected filters. Try selecting different filters.')}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Initial State */}
                            {!salesData && !hasAppliedFilters && (
                                <Card className="rounded-2xl border-slate-200 bg-white shadow-md no-print">
                                    <CardContent className="p-12 text-center">
                                        <TrendingUp className="mx-auto h-12 w-12 text-sky-400" />
                                        <h3 className="mt-4 text-lg font-medium text-sky-900">
                                            {t('Ready to Generate Sales Report')}
                                        </h3>
                                        <p className="mt-2 text-sm text-sky-600">
                                            {t('Please select filters and click "Apply" to load sales data.')}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-12 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 py-6 no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-sm text-gray-600">© 2026 VISMASS </p>
                    </div>
                </footer>

            </div>
        </AppLayout>
    );
}
