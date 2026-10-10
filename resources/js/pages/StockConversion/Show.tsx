import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { format } from 'date-fns';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    User,
    ArrowRightLeft,
    CheckCircle2,
    FileText,
    Hash,
    Package,
    Layers,
    Download,
    Clock,
    Warehouse,
    ArrowUpRight,
    ArrowDownLeft,
    Boxes
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Section {
    section_code: string;
    name: string;
}

interface StockConversion {
    id: number;
    conversion_number: string;
    company_code: string;
    section_code: string;
    item_code: string;
    item_name: string;
    batch_no: string | null;
    input_quantity: string;
    from_unit_name: string | null;
    to_item_code: string;
    to_item_name: string;
    output_quantity: string;
    to_batch_no: string | null;
    to_unit_name: string | null;
    conversion_factor: string;
    conversion_date: string;
    notes: string | null;
    created_by: number;
    created_at: string;
    section?: Section;
    creator?: {
        name: string;
        email: string;
    } | null;
}

interface Props {
    conversion: StockConversion;
    auth?: {
        user: any;
    };
}

export default function Show({ conversion, auth }: Props) {
    const inputQty = Number(conversion.input_quantity) || 0;
    const outputQty = Number(conversion.output_quantity) || 0;
    const conversionFactor = Number(conversion.conversion_factor) || 0;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Stock Conversions'), href: '/stock-conversions' },
        { title: t('Conversion Details'), href: '#' },
    ];

    const handleExportCSV = () => {
        const headers = ['Field', 'Value'];
        const rows = [
            ['Conversion Number', conversion.conversion_number],
            ['Section', conversion.section?.name || conversion.section_code],
            ['Date', conversion.conversion_date ? format(new Date(conversion.conversion_date), 'yyyy-MM-dd') : '-'],
            ['From Item Code', conversion.item_code],
            ['From Item Name', conversion.item_name],
            ['From Batch', conversion.batch_no || '-'],
            ['Input Quantity', inputQty.toFixed(2)],
            ['From Unit', conversion.from_unit_name || '-'],
            ['To Item Code', conversion.to_item_code],
            ['To Item Name', conversion.to_item_name],
            ['To Batch', conversion.to_batch_no || '-'],
            ['Output Quantity', outputQty.toFixed(2)],
            ['To Unit', conversion.to_unit_name || '-'],
            ['Conversion Factor', conversionFactor.toFixed(4)],
            ['Notes', conversion.notes || '-'],
        ];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Stock_Conversion_${conversion.conversion_number}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = async () => {
        const doc = new jsPDF();
        
        try {
            const img = new Image();
            const isMalibu = auth?.user?.company_code?.toUpperCase().startsWith('MAL');
            img.src = isMalibu ? '/images/malibu-logo.png' : '/images/Vismass-logo.png';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            const imgWidth = 40;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(img, 'PNG', 14, 10, imgWidth, imgHeight);
        } catch (e) {
            console.warn('Could not load logo for PDF', e);
        }
        
        doc.setFontSize(16);
        doc.text('Stock Conversion Note', 14, 35);
        
        doc.setFontSize(10);
        doc.text(`Conversion Number: ${conversion.conversion_number}`, 14, 45);
        doc.text(`Date: ${conversion.conversion_date ? format(new Date(conversion.conversion_date), 'yyyy-MM-dd') : '-'}`, 14, 51);
        doc.text(`Section: ${conversion.section?.name || conversion.section_code}`, 14, 57);

        const tableColumn = ["Description", "Details"];
        const tableRows: string[][] = [
            ['From Item', `${conversion.item_name} (${conversion.item_code})`],
            ['From Batch', conversion.batch_no || '-'],
            ['Input Quantity', `${inputQty.toFixed(2)} ${conversion.from_unit_name || ''}`],
            ['Conversion Factor', `×${conversionFactor.toFixed(4)}`],
            ['To Item', `${conversion.to_item_name} (${conversion.to_item_code})`],
            ['To Batch', conversion.to_batch_no || '-'],
            ['Output Quantity', `${outputQty.toFixed(2)} ${conversion.to_unit_name || ''}`],
        ];

        if (conversion.notes) {
            tableRows.push(['Notes', conversion.notes]);
        }

        autoTable(doc, {
            startY: 70,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`Stock_Conversion_${conversion.conversion_number}.pdf`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Conversion')} ${conversion.conversion_number}`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <Link
                                    href="/stock-conversions"
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <ArrowRightLeft className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t('Stock Conversion Details')}</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">{conversion.conversion_number}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                                <button
                                    onClick={handleExportCSV}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 no-print"
                                >
                                    <FileText className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('CSV')}</span>
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 no-print"
                                >
                                    <Download className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('PDF')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <ArrowDownLeft className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Input Qty')}</p>
                                        <p className="text-lg font-bold text-gray-900">{inputQty.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <ArrowUpRight className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Output Qty')}</p>
                                        <p className="text-lg font-bold text-green-600">{outputQty.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-blue-500 p-2 shadow-sm">
                                        <ArrowRightLeft className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Factor')}</p>
                                        <p className="text-lg font-bold text-blue-600">×{conversionFactor.toFixed(4)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Items')}</p>
                                        <p className="text-lg font-bold text-gray-900">2</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{t('Conversion Details')}</h3>
                                        <p className="text-white/80 text-xs mt-0.5">{conversion.conversion_number}</p>
                                    </div>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white self-start sm:self-auto">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        {t('COMPLETED')}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Section')}</p>
                                        <div className="flex items-center mt-1">
                                            <Warehouse className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{conversion.section?.name || conversion.section_code}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Date')}</p>
                                        <div className="flex items-center mt-1">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">
                                                {conversion.conversion_date ? format(new Date(conversion.conversion_date), 'yyyy-MM-dd') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Created By')}</p>
                                        <div className="flex items-center mt-1">
                                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{conversion.creator?.name || t('System')}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Conversion #')}</p>
                                        <div className="flex items-center mt-1">
                                            <Hash className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700 font-mono">{conversion.conversion_number}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {conversion.notes && (
                                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                        <div className="flex items-center mb-1">
                                            <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                            <p className="text-xs font-bold text-amber-700 uppercase">{t('Notes')}</p>
                                        </div>
                                        <p className="text-xs text-amber-800">{conversion.notes}</p>
                                    </div>
                                )}

                                {/* Conversion Visual */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider" colSpan={3}>{t('From (Source)')}</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Factor')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider" colSpan={3}>{t('To (Destination)')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            <tr className="hover:bg-sky-50/50 transition-colors duration-150">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center">
                                                        <div className="p-2 bg-red-100 rounded-lg mr-3">
                                                            <ArrowDownLeft className="w-4 h-4 text-red-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-medium text-gray-900">{conversion.item_name}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono">{conversion.item_code}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {conversion.batch_no && (
                                                        <div className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit">
                                                            {conversion.batch_no}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-sm font-bold text-red-600">
                                                        {inputQty.toFixed(2)}
                                                        <span className="text-xs font-normal text-gray-500 ml-1">{conversion.from_unit_name || ''}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="inline-flex items-center gap-1">
                                                        <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                            ×{conversionFactor.toFixed(4)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center">
                                                        <div className="p-2 bg-green-100 rounded-lg mr-3">
                                                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-medium text-gray-900">{conversion.to_item_name}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono">{conversion.to_item_code}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {conversion.to_batch_no && (
                                                        <div className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit">
                                                            {conversion.to_batch_no}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-sm font-bold text-green-600">
                                                        {outputQty.toFixed(2)}
                                                        <span className="text-xs font-normal text-gray-500 ml-1">{conversion.to_unit_name || ''}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary Box */}
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center mb-2">
                                        <ArrowRightLeft className="w-4 h-4 text-blue-600 mr-2" />
                                        <p className="text-xs font-bold text-blue-700 uppercase">{t('Conversion Summary')}</p>
                                    </div>
                                    <p className="text-sm text-blue-800">
                                        {t('This conversion transformed')} <strong>{inputQty.toFixed(2)}</strong> {conversion.from_unit_name || t('units')} {t('of')} <strong>{conversion.item_name}</strong> {t('into')} <strong>{outputQty.toFixed(2)}</strong> {conversion.to_unit_name || t('units')} {t('of')} <strong>{conversion.to_item_name}</strong>.
                                    </p>
                                    <div className="mt-3 pt-3 border-t border-blue-200/50">
                                        <p className="text-xs text-blue-600">
                                            {t('Conversion Rate')}: 1 {conversion.from_unit_name || '...'} = {conversionFactor.toFixed(4)} {conversion.to_unit_name || '...'}
                                        </p>
                                    </div>
                                </div>

                                {/* Audit Trail */}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="flex items-center mb-2">
                                            <div className="w-6 h-6 rounded-full bg-vismass-blue flex items-center justify-center mr-2">
                                                <User className="w-3 h-3 text-white" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 uppercase">{t('Created By')}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 ml-8">{conversion.creator?.name || t('System')}</p>
                                        <p className="text-[10px] text-slate-500 ml-8">{format(new Date(conversion.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Stock Conversion')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
