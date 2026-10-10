import { Head } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { ArrowLeft, ScrollText, Calendar, DollarSign, Package, FileText } from 'lucide-react';
import { router } from '@inertiajs/react';
import { PageProps, BreadcrumbItem } from '@/types';

interface QuotationItem {
    item_name: string;
    quantity: number;
    unit_price: number;
    item_type: string;
}

interface ViewQuotationProps extends PageProps {
    quotation: {
        id: number;
        service_job_id: number;
        total_amount: string;
        notes: string | null;
        items: QuotationItem[];
        created_at: string;
        service_job: {
            id: number;
            job_number: string;
            customer_name: string;
            customer_phone: string;
            device_type: string;
            device_brand: string;
            device_model: string;
            device_serial: string;
        };
        created_by: {
            first_name: string;
            last_name: string;
        } | null;
    };
    company: any;
}

export default function ViewQuotation({ quotation, company }: ViewQuotationProps) {
    const handlePrint = () => {
        window.print();
    };

    const handleBack = () => {
        router.visit('/quotations');
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Service Jobs'),
            href: '/service-jobs',
        },
        {
            title: t('Quotations'),
            href: '/quotations',
        },
        {
            title: quotation.service_job.job_number,
            href: '#',
        },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount: string | number): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rs ${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Quotation')} - ${quotation.service_job.job_number}`}>
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 10mm;
                            padding: 0;
                        }
                        
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color-adjust: exact !important;
                        }
                        
                        body {
                            margin: 0;
                            padding: 0;
                            background: white;
                        }
                        
                        body * {
                            visibility: hidden;
                        }
                        
                        #printable-quotation,
                        #printable-quotation * {
                            visibility: visible;
                        }
                        
                        #printable-quotation {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 10px 0;
                        }
                        
                        thead tr {
                            background: linear-gradient(to right, #1e40af, #1e3a8a) !important;
                            color: white;
                        }
                        
                        tbody tr:nth-child(even) {
                            background-color: #f8fafc !important;
                        }
                        
                        tbody tr:nth-child(odd) {
                            background-color: white !important;
                        }
                        
                        tfoot tr {
                            background: linear-gradient(to right, #1e40af, #1e3a8a) !important;
                            color: white;
                            font-weight: bold;
                        }
                        
                        th, td {
                            border: 1px solid #cbd5e1;
                            padding: 10px;
                            text-align: left;
                        }
                        
                        th {
                            text-align: left;
                            font-weight: bold;
                            color: white !important;
                        }
                        
                        td {
                            color: #1f2937;
                        }
                        
                        .bg-gradient-to-r {
                            background: linear-gradient(to right, #1e40af, #1e3a8a) !important;
                        }
                        
                        .bg-blue-50 {
                            background-color: #f0f9ff !important;
                        }
                        
                        .bg-emerald-50 {
                            background-color: #f0fdf4 !important;
                        }
                        
                        .bg-amber-50 {
                            background-color: #fffbeb !important;
                        }
                        
                        .bg-slate-50 {
                            background-color: #f8fafc !important;
                        }
                        
                        .text-vismass-blue {
                            color: #1e40af !important;
                        }
                        
                        .text-white {
                            color: white !important;
                        }
                        
                        .border-vismass-blue {
                            border-color: #1e40af !important;
                        }
                        
                        .border-b-2 {
                            border-bottom: 2px solid #1e40af !important;
                        }
                        
                        .border-t-2 {
                            border-top: 2px solid #1e40af !important;
                        }
                        
                        h1, h2, h3, h4 {
                            margin: 10px 0;
                        }
                        
                        p {
                            margin: 5px 0;
                        }
                        
                        .rounded-lg, .rounded-xl {
                            border-radius: 8px;
                        }
                        
                        .shadow, .shadow-sm {
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }
                        
                        div[class*="gap-"] {
                            display: grid;
                        }
                        
                        /* Ensure page breaks are natural */
                        .mb-6 {
                            margin-bottom: 15px;
                            page-break-inside: avoid;
                        }
                        
                        .mb-8 {
                            margin-bottom: 20px;
                            page-break-inside: avoid;
                        }
                        
                        /* Prevent table breaks */
                        table {
                            page-break-inside: avoid;
                        }
                    }
                `}</style>
            </Head>

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between gap-3 py-4">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={handleBack}
                                    className="mr-1 shrink-0 rounded-lg border border-white/30 bg-white/20 p-2 backdrop-blur-sm transition-all duration-200 hover:bg-white/30"
                                    title={t('Go Back')}
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <ScrollText className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Quotation')}: {quotation.service_job.job_number}
                                    </h1>
                                    <p className="hidden sm:block text-xs text-white/80">
                                        {t('View and print service quotation')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <a
                                    href={`/quotations/${quotation.id}/print`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-lg bg-blue-600 px-3 sm:px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-md"
                                >
                                    <FileText className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('Print Preview')}</span>
                                </a>
                                {/* <div className="print-button-wrapper">
                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        className="px-4 py-2 bg-vismass-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
                                    >
                                        🖨️ {t('Print Quotation')}
                                    </button>
                                </div> */}
                                {/* <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center rounded-lg bg-vismass-blue px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-md"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('Print Quotation')}
                                </button> */}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4 no-print">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow">
                                        <ScrollText className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Quotation ID')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            #{quotation.id}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Amount')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {formatCurrency(quotation.total_amount)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Created Date')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatDate(quotation.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Items')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {quotation.items.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Printable Quotation Content */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div id="printable-quotation" className="bg-white p-4 sm:p-8">
                                {/* Company Header */}
                                <div className="mb-8 flex flex-col gap-4 border-b-2 border-vismass-blue pb-6 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        {company?.logo && (
                                            <img 
                                                src={company.logo} 
                                                alt={company?.company_name || 'VISMASS'}
                                                className="h-12 w-12 sm:h-16 sm:w-16 object-contain"
                                            />
                                        )}
                                        <div>
                                            <h1 className="text-2xl sm:text-4xl font-bold text-vismass-blue">
                                                {company?.company_name || 'VISMASS'}
                                            </h1>
                                            <div className="mt-2 space-y-1 text-sm text-slate-700">
                                                {company?.address && <p>{company.address}</p>}
                                                {company?.phone && <p>Tel: {company.phone}</p>}
                                                {company?.email && <p>Email: {company.email}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <div className="inline-block rounded-xl bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-3 sm:py-4 text-white">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-white/90">Quotation</p>
                                            <p className="text-2xl sm:text-3xl font-bold">#{quotation.id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Title & Date Row */}
                                <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-vismass-blue">SERVICE QUOTATION</h2>
                                    <div className="text-left sm:text-right">
                                        <p className="text-xs font-semibold text-slate-600 uppercase">Date Issued</p>
                                        <p className="text-lg font-bold text-slate-900">{formatDate(quotation.created_at)}</p>
                                    </div>
                                </div>

                                {/* Job & Customer Details - Professional Layout */}
                                <div className="mb-6 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                                    <div className="rounded-lg border border-slate-300 bg-white p-4">
                                        <h3 className="mb-3 text-xs font-semibold uppercase text-slate-600">Service Job Details</h3>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-slate-600">{t('Job Number')}</p>
                                                <p className="text-lg font-bold text-slate-900">{quotation.service_job.job_number}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-600">{t('Created by')}</p>
                                                <p className="text-sm font-semibold">
                                                    {quotation.created_by
                                                        ? `${quotation.created_by.first_name} ${quotation.created_by.last_name}`
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-300 bg-white p-4">
                                        <h3 className="mb-3 text-xs font-semibold uppercase text-slate-600">Customer Details</h3>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs text-slate-600">{t('Customer Name')}</p>
                                                <p className="text-lg font-bold text-slate-900">{quotation.service_job.customer_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-600">{t('Phone')}</p>
                                                <p className="text-sm font-semibold">{quotation.service_job.customer_phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Device Details - Enhanced */}
                                <div className="mb-6 rounded-lg border border-slate-300 bg-white p-5">
                                    <h3 className="mb-4 text-sm font-bold text-slate-800">
                                        {t('Device Information')}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-600 uppercase">{t('Brand')}</p>
                                            <p className="mt-1 text-base font-semibold text-slate-900">
                                                {quotation.service_job.device_brand || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-600 uppercase">{t('Model')}</p>
                                            <p className="mt-1 text-base font-semibold text-slate-900">
                                                {quotation.service_job.device_model || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs font-semibold text-slate-600 uppercase">{t('Serial Number')}</p>
                                            <p className="mt-1 text-base font-semibold text-slate-900">
                                                {quotation.service_job.device_serial || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Table - Enhanced */}
                                <div className="mb-8">
                                    <h3 className="mb-4 text-sm font-bold text-slate-800">QUOTATION ITEMS</h3>
                                    <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm">
                                        <table className="min-w-[780px] w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-vismass-blue to-blue-500">
                                                    <th className="border border-slate-300 px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">#</th>
                                                    <th className="border border-slate-300 px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{t('Description')}</th>
                                                    <th className="border border-slate-300 px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">{t('Type')}</th>
                                                    <th className="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">{t('Quantity')}</th>
                                                    <th className="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">{t('Unit Price')}</th>
                                                    <th className="border border-slate-300 px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">{t('Amount')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white">
                                                {quotation.items.map((item, index) => (
                                                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                        <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900">{index + 1}</td>
                                                        <td className="border border-slate-300 px-4 py-3 text-slate-900 font-medium">{item.item_name}</td>
                                                        <td className="border border-slate-300 px-4 py-3 text-center text-xs">
                                                            <span className="inline-block rounded px-3 py-1 bg-slate-200 text-slate-700 font-semibold">
                                                                {item.item_type === 'part' && t('Part')}
                                                                {item.item_type === 'service_charge' && t('Service')}
                                                                {item.item_type === 'other' && t('Other')}
                                                            </span>
                                                        </td>
                                                        <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">{item.quantity}</td>
                                                        <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                                                            Rs. {parseFloat(item.unit_price.toString()).toLocaleString('en-LK', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2,
                                                            })}
                                                        </td>
                                                        <td className="border border-slate-300 px-4 py-3 text-right font-bold text-vismass-blue">
                                                            Rs. {(item.quantity * parseFloat(item.unit_price.toString())).toLocaleString(
                                                                'en-LK',
                                                                {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                }
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-gradient-to-r from-vismass-blue to-blue-500">
                                                    <td colSpan={5} className="border border-slate-300 px-4 py-4 text-right text-sm font-bold text-white uppercase">
                                                        {t('Total Amount')}:
                                                    </td>
                                                    <td className="border border-slate-300 px-4 py-4 text-right text-xl font-bold text-white">
                                                        Rs. {parseFloat(quotation.total_amount).toLocaleString('en-LK', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Notes - If Present */}
                                {quotation.notes && (
                                    <div className="mb-6 rounded-lg border border-slate-300 bg-white p-5">
                                        <h3 className="mb-3 text-sm font-bold text-slate-800">ADDITIONAL NOTES</h3>
                                        <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{quotation.notes}</p>
                                    </div>
                                )}

                                {/* Terms & Conditions - Enhanced */}
                                <div className="mb-6 rounded-lg border border-slate-300 bg-white p-5">
                                    <h4 className="mb-3 text-sm font-bold text-slate-800">TERMS & CONDITIONS</h4>
                                    <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                                        <li className="flex items-start">
                                            <span className="mr-2 font-bold text-slate-400">•</span>
                                            <span>{t('This quotation is valid for 30 days from the date of issue.')}</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 font-bold text-slate-400">•</span>
                                            <span>{t('Prices are subject to change without prior notice.')}</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 font-bold text-slate-400">•</span>
                                            <span>{t('Payment terms: As agreed upon acceptance of quotation.')}</span>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="mr-2 font-bold text-slate-400">•</span>
                                            <span>{t('Warranty terms apply as per manufacturer specifications.')}</span>
                                        </li>
                                    </ul>
                                </div>

                                {/* Footer - Professional */}
                                <div className="mt-12 flex flex-col gap-8 border-t-2 border-vismass-blue pt-8 sm:flex-row sm:justify-between">
                                    <div>
                                        <p className="mb-2 text-xs font-semibold text-slate-600 uppercase">Prepared By</p>
                                        <p className="mb-6 font-semibold text-slate-900">
                                            {quotation.created_by
                                                ? `${quotation.created_by.first_name} ${quotation.created_by.last_name}`
                                                : 'N/A'}
                                        </p>
                                        <div className="w-40 border-b-2 border-slate-400"></div>
                                        <p className="mt-1 text-xs text-slate-600">Authorized Signature</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <p className="mb-2 text-xs font-semibold text-slate-600 uppercase">Customer Acceptance</p>
                                        <p className="mb-6 text-slate-700"></p>
                                        <div className="w-40 border-b-2 border-slate-400"></div>
                                        <p className="mt-1 text-xs text-slate-600">Name & Signature</p>
                                    </div>
                                </div>

                                {/* Print Footer */}
                                <div className="mt-8 border-t pt-4 text-center text-xs text-slate-500">
                                    <p>Thank you for your business! For inquiries, please contact us.</p>
                                    <p className="mt-1">© 2026 {company?.company_name || 'VISMASS'}. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50 no-print">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS POS System • {t('Quotation Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppSidebarLayout>
    );
}
