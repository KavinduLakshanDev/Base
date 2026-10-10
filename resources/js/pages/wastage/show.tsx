import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { format } from 'date-fns';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    AlertTriangle,
    Package,
    Calendar,
    User,
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    Hash,
    Layers,
    Warehouse,
    Hash as HashIcon,
    Trash2,
    Info
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Wastage {
    id: number;
    product_name: string;
    category?: string;
    quantity: number;
    unit: string;
    reason: string;
    wastage_date: string;
    status: string;
    recorded_by: string;
    created_at: string;
    notes: string | null;
    item_code?: string;
    section_name?: string;
    batch_no?: string;
}

interface ShowProps {
    wastage: Wastage;
    auth?: {
        user: any;
    };
}

export default function WastageShow({ wastage, auth }: ShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Wastage Management'), href: '/wastages' },
        { title: t('Wastage Details'), href: '#' },
    ];

    const handleExportCSV = () => {
        const headers = ['Field', 'Value'];
        const rows = [
            ['Wastage ID', `#${wastage.id}`],
            ['Product Name', wastage.product_name],
            ['Item Code', wastage.item_code || '-'],
            ['Category', wastage.category || 'N/A'],
            ['Quantity', `${wastage.quantity} ${wastage.unit}`],
            ['Reason', wastage.reason.replace('_', ' ')],
            ['Section', wastage.section_name || '-'],
            ['Batch No', wastage.batch_no || '-'],
            ['Date', wastage.wastage_date],
            ['Status', wastage.status],
            ['Recorded By', wastage.recorded_by],
            ['Notes', wastage.notes || '-'],
        ];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Wastage_${wastage.id}.csv`);
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
        doc.text('Wastage Record', 14, 35);
        
        doc.setFontSize(10);
        doc.text(`Wastage ID: #${wastage.id}`, 14, 45);
        doc.text(`Date: ${wastage.wastage_date}`, 14, 51);
        doc.text(`Status: ${wastage.status.toUpperCase()}`, 14, 57);

        const tableColumn = ["Field", "Details"];
        const tableRows: string[][] = [
            ['Product Name', wastage.product_name],
            ['Item Code', wastage.item_code || '-'],
            ['Category', wastage.category || 'N/A'],
            ['Quantity', `${wastage.quantity} ${wastage.unit}`],
            ['Reason', wastage.reason.replace('_', ' ')],
            ['Section', wastage.section_name || '-'],
            ['Batch No', wastage.batch_no || '-'],
            ['Recorded By', wastage.recorded_by],
        ];

        if (wastage.notes) {
            tableRows.push(['Notes', wastage.notes]);
        }

        autoTable(doc, {
            startY: 70,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`Wastage_${wastage.id}.pdf`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Wastage Details')} #${wastage.id}`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <Link
                                    href="/wastages"
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Trash2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t('Wastage Details')}</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">#{wastage.id}</p>
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
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <Trash2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Quantity')}</p>
                                        <p className="text-lg font-bold text-red-600">{wastage.quantity} {wastage.unit}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className={`rounded-lg p-2 shadow-sm ${
                                        wastage.status === 'approved' ? 'bg-green-500' :
                                        wastage.status === 'rejected' ? 'bg-red-500' :
                                        'bg-amber-500'
                                    }`}>
                                        {wastage.status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-white" /> :
                                         wastage.status === 'rejected' ? <XCircle className="h-4 w-4 text-white" /> :
                                         <Clock className="h-4 w-4 text-white" />}
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Status')}</p>
                                        <p className={`text-lg font-bold ${
                                            wastage.status === 'approved' ? 'text-green-600' :
                                            wastage.status === 'rejected' ? 'text-red-600' :
                                            'text-amber-600'
                                        }`}>{wastage.status.charAt(0).toUpperCase() + wastage.status.slice(1)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Product')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{wastage.product_name}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Date')}</p>
                                        <p className="text-sm font-bold text-gray-900">{wastage.wastage_date}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{t('Wastage Information')}</h3>
                                        <p className="text-white/80 text-xs mt-0.5">#{wastage.id}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                                        wastage.status === 'approved' ? 'bg-green-500 text-white' :
                                        wastage.status === 'rejected' ? 'bg-red-500 text-white' :
                                        'bg-amber-500 text-white'
                                    }`}>
                                        {wastage.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                        {wastage.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                        {wastage.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                        {wastage.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Product')}</p>
                                        <div className="flex items-center mt-1">
                                            <Package className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{wastage.product_name}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Category')}</p>
                                        <div className="flex items-center mt-1">
                                            <Hash className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{wastage.category || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Reason')}</p>
                                        <div className="flex items-center mt-1">
                                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700 capitalize">{wastage.reason.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Recorded By')}</p>
                                        <div className="flex items-center mt-1">
                                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{wastage.recorded_by}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {wastage.notes && (
                                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                        <div className="flex items-center mb-1">
                                            <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                            <p className="text-xs font-bold text-amber-700 uppercase">{t('Notes')}</p>
                                        </div>
                                        <p className="text-xs text-amber-800">{wastage.notes}</p>
                                    </div>
                                )}

                                {/* Product Details Table */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Field')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Value')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            <tr className="hover:bg-sky-50/50 transition-colors duration-150">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center">
                                                        <Package className="w-4 h-4 mr-2 text-slate-400" />
                                                        <span className="text-xs font-medium text-gray-900">{t('Product Name')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-xs font-bold text-gray-900">{wastage.product_name}</span>
                                                    {wastage.item_code && (
                                                        <span className="text-[10px] text-gray-500 ml-2 font-mono">{wastage.item_code}</span>
                                                    )}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-sky-50/50 transition-colors duration-150">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center">
                                                        <Hash className="w-4 h-4 mr-2 text-slate-400" />
                                                        <span className="text-xs font-medium text-gray-900">{t('Category')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-xs font-bold text-gray-900">{wastage.category || 'N/A'}</span>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-sky-50/50 transition-colors duration-150">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center">
                                                        <Trash2 className="w-4 h-4 mr-2 text-red-400" />
                                                        <span className="text-xs font-medium text-gray-900">{t('Quantity')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-sm font-bold text-red-600">{wastage.quantity} {wastage.unit}</span>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-sky-50/50 transition-colors duration-150">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center">
                                                        <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
                                                        <span className="text-xs font-medium text-gray-900">{t('Reason')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 capitalize">
                                                        {wastage.reason.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-sky-50/50 transition-colors duration-150">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center">
                                                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                                        <span className="text-xs font-medium text-gray-900">{t('Date')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-xs font-bold text-gray-900">{wastage.wastage_date}</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Important Notice */}
                                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="flex items-center mb-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
                                        <p className="text-xs font-bold text-amber-700 uppercase">{t('Important Notice')}</p>
                                    </div>
                                    <p className="text-xs text-amber-800">
                                        {t('This is a permanent record of stock deduction. Once approved, the corresponding inventory levels have been adjusted automatically.')}
                                    </p>
                                </div>

                                {/* Audit Trail */}
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="flex items-center mb-2">
                                            <div className="w-6 h-6 rounded-full bg-vismass-blue flex items-center justify-center mr-2">
                                                <User className="w-3 h-3 text-white" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 uppercase">{t('Recorded By')}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 ml-8">{wastage.recorded_by}</p>
                                        <p className="text-[10px] text-slate-500 ml-8">{format(new Date(wastage.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Wastage Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
