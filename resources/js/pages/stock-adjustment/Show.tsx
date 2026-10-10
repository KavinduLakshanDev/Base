import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { format } from 'date-fns';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    ArrowLeft,
    Calendar,
    User,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    FileText,
    Hash,
    Package,
    Layers,
    Tag,
    Download,
    Check,
    X,
    Loader2,
    Clock,
    Warehouse,
    XCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AdjustmentItem {
    id: number;
    product: {
        ItmKy: number;
        ItmNm: string;
        ItemCode: string;
    };
    adjustment_type: 'addition' | 'subtraction';
    quantity: string;
    batch_no: string;
    serial_number: string | null;
    cost_price: string;
    sale_price: string;
    wholesale_price: string;
    vehicle_sale_price: string;
    reason: string | null;
    current_stock?: number;
    current_available_stock?: number;
}

interface StockAdjustment {
    id: number;
    adjustment_number: string;
    batch_no: string | null;
    adjustment_date: string;
    notes: string | null;
    status: 'pending' | 'approved' | 'rejected';
    total_amount: number;
    created_at: string;
    section: {
        name: string;
    } | null;
    vehicle: {
        name: string;
        registration_no: string;
    } | null;
    recorder: {
        name: string;
        email: string;
    } | null;
    approver: {
        name: string;
        email: string;
    } | null;
    items: AdjustmentItem[];
}

interface ActualMovement {
    batch_no: string;
    qty: number;
    type: string;
}

interface Props {
    adjustment: StockAdjustment;
    actualMovements: Record<string, ActualMovement[]>;
    auth: {
        user: any;
    };
}

export default function StockAdjustmentShow({ adjustment, actualMovements, auth }: Props) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [editedItems, setEditedItems] = useState<Array<{
        id: number;
        quantity: string;
        cost_price: string;
        sale_price: string;
        wholesale_price: string;
        vehicle_sale_price: string;
    }>>([]);

    const canApprove = (auth?.user?.role?.level === 'company_admin' || auth?.user?.user_type === 'company_admin') && adjustment.status === 'pending';

    const initializeEditedItems = () => {
        setEditedItems(adjustment.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            cost_price: Number(item.cost_price || 0).toFixed(2),
            sale_price: Number(item.sale_price || 0).toFixed(2),
            wholesale_price: Number(item.wholesale_price || 0).toFixed(2),
            vehicle_sale_price: Number(item.vehicle_sale_price || 0).toFixed(2),
        })));
    };

    const handleApproveDialogOpen = () => {
        initializeEditedItems();
        setShowApproveDialog(true);
    };

    const handleItemEdit = (itemId: number, field: string, value: string) => {
        setEditedItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    };

    const handleApprove = () => {
        setShowApproveDialog(false);
        setIsProcessing(true);
        router.post(`/stock-adjustments/${adjustment.id}/approve`, {
            items: editedItems,
        }, {
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleReject = () => {
        setShowRejectDialog(false);
        setIsProcessing(true);
        router.post(`/stock-adjustments/${adjustment.id}/reject`, {}, {
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleExportCSV = () => {
        const headers = [
            'Product',
            'Item Code',
            'Type',
            'Batch No',
            'Serial Number',
            'Avail. Stock',
            'Quantity',
            'After Avail.',
            'Cost Price',
            'Line Total'
        ];

        const rows = adjustment.items.map(item => [
            `"${item.product.ItmNm}"`,
            `"${item.product.ItemCode}"`,
            `"${item.adjustment_type.toUpperCase()}"`,
            `"${item.batch_no || '-'}"`,
            `"${item.serial_number || '-'}"`,
            `"${Number(item.current_stock || 0).toFixed(2)}"`,
            `"${(item.adjustment_type === 'addition' ? '+' : '-')}${parseFloat(item.quantity).toFixed(2)}"`,
            `"${(Number(item.current_stock || 0) + (item.adjustment_type === 'addition' ? parseFloat(item.quantity || '0') : -parseFloat(item.quantity || '0'))).toFixed(2)}"`,
            `"${parseFloat(item.cost_price).toFixed(2)}"`,
            `"${(parseFloat(item.quantity) * parseFloat(item.cost_price)).toFixed(2)}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Stock_Adjustment_${adjustment.adjustment_number}.csv`);
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
        doc.text('Stock Adjustment Note', 14, 35);
        
        doc.setFontSize(10);
        doc.text(`Adjustment Number: ${adjustment.adjustment_number}`, 14, 45);
        doc.text(`Date: ${adjustment.adjustment_date ? format(new Date(adjustment.adjustment_date), 'yyyy-MM-dd') : '-'}`, 14, 51);
        doc.text(`Target: ${adjustment.section ? adjustment.section.name : 'Unknown'}`, 14, 57);
        doc.text(`Status: ${adjustment.status.toUpperCase()}`, 14, 63);

        const tableColumn = ["Product", "Type", "Batch/Serial", "Avail.", "Quantity", "After", "Price (Rs)", "Total (Rs)"];
        const tableRows: string[][] = [];

        adjustment.items.forEach(item => {
            const productInfo = `${item.product.ItmNm}\n(${item.product.ItemCode})`;
            const batchSerial = `Batch: ${item.batch_no || '-'}\nSerial: ${item.serial_number || '-'}`;
            const total = (parseFloat(item.quantity) * parseFloat(item.cost_price)).toFixed(2);
            
            const rowData = [
                productInfo,
                item.adjustment_type.toUpperCase(),
                batchSerial,
                Number(item.current_stock || 0).toFixed(2),
                (item.adjustment_type === 'addition' ? '+' : '-') + parseFloat(item.quantity).toFixed(2),
                (Number(item.current_stock || 0) + (item.adjustment_type === 'addition' ? parseFloat(item.quantity || '0') : -parseFloat(item.quantity || '0'))).toFixed(2),
                parseFloat(item.cost_price).toFixed(2),
                total
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            startY: 70,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`Stock_Adjustment_${adjustment.adjustment_number}.pdf`);
    };

    const totalQty = adjustment.items.reduce((sum, item) => sum + parseFloat(item.quantity || '0'), 0);
    const totalAmount = adjustment.items.reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0')), 0);
    
    const additions = adjustment.items.filter(i => i.adjustment_type === 'addition').length;
    const subtractions = adjustment.items.filter(i => i.adjustment_type === 'subtraction').length;

    const totalAdditionsValue = adjustment.items.filter(i => i.adjustment_type === 'addition').reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0')), 0);
    const totalSubtractionsValue = adjustment.items.filter(i => i.adjustment_type === 'subtraction').reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0')), 0);
    const netImpact = totalAdditionsValue - totalSubtractionsValue;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Stock Adjustments'), href: '/stock-adjustments' },
        { title: t('Adjustment Details'), href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Adjustment')} ${adjustment.adjustment_number}`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <Link
                                    href="/stock-adjustments"
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Layers className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t('Stock Adjustment Details')}</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">{adjustment.adjustment_number}</p>
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
                                {canApprove && (
                                    <>
                                        <button
                                            onClick={handleApproveDialogOpen}
                                            disabled={isProcessing}
                                            className="shrink-0 inline-flex items-center rounded-lg bg-green-500 px-3 sm:px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-600 transition-all duration-200 disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
                                            ) : (
                                                <Check className="h-4 w-4 sm:mr-1.5" />
                                            )}
                                            <span className="hidden sm:inline">{t('Approve')}</span>
                                        </button>
                                        <button
                                            onClick={() => setShowRejectDialog(true)}
                                            disabled={isProcessing}
                                            className="shrink-0 inline-flex items-center rounded-lg bg-red-500 px-3 sm:px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-600 transition-all duration-200 disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" />
                                            ) : (
                                                <X className="h-4 w-4 sm:mr-1.5" />
                                            )}
                                            <span className="hidden sm:inline">{t('Reject')}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Items')}</p>
                                        <p className="text-lg font-bold text-gray-900">{adjustment.items.length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <ArrowUpRight className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Additions')}</p>
                                        <p className="text-lg font-bold text-green-600">{additions}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <ArrowDownLeft className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Subtractions')}</p>
                                        <p className="text-lg font-bold text-red-600">{subtractions}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Tag className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Value')}</p>
                                        <p className="text-lg font-bold text-gray-900">Rs. {totalAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className={`rounded-lg p-2 shadow-sm ${netImpact > 0 ? 'bg-green-500' : netImpact < 0 ? 'bg-red-500' : 'bg-slate-400'}`}>
                                        {netImpact > 0 ? <ArrowUpRight className="h-4 w-4 text-white" /> : netImpact < 0 ? <ArrowDownLeft className="h-4 w-4 text-white" /> : <Tag className="h-4 w-4 text-white" />}
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Net Impact')}</p>
                                        <p className={`text-lg font-bold ${netImpact > 0 ? 'text-green-600' : netImpact < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {netImpact > 0 ? '+' : ''}Rs. {netImpact.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{t('Adjustment Details')}</h3>
                                        <p className="text-white/80 text-xs mt-0.5">{adjustment.adjustment_number}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                                        adjustment.status === 'approved' ? 'bg-green-500 text-white' :
                                        adjustment.status === 'rejected' ? 'bg-red-500 text-white' :
                                        'bg-amber-500 text-white'
                                    }`}>
                                        {adjustment.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                        {adjustment.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                                        {adjustment.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                        {adjustment.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Info Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Target')}</p>
                                        <div className="flex items-center mt-1">
                                            <Warehouse className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{adjustment.section?.name || t('Unknown')}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Batch No')}</p>
                                        <div className="flex items-center mt-1">
                                            <Hash className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700 font-mono">{adjustment.batch_no || '-'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Date')}</p>
                                        <div className="flex items-center mt-1">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">
                                                {adjustment.adjustment_date ? format(new Date(adjustment.adjustment_date), 'yyyy-MM-dd') : '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Recorded By')}</p>
                                        <div className="flex items-center mt-1">
                                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            <p className="text-sm font-bold text-slate-700">{adjustment.recorder?.name || t('System')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {adjustment.notes && (
                                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                        <div className="flex items-center mb-1">
                                            <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                                            <p className="text-xs font-bold text-amber-700 uppercase">{t('Notes')}</p>
                                        </div>
                                        <p className="text-xs text-amber-800">{adjustment.notes}</p>
                                    </div>
                                )}

                                {/* Items Table */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Product')}</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Type')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Batch & Serial')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Avail. Stock')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Now Avail.')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Quantity')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('After Avail.')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Cost Price')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Sale Price')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('WSale Price')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Veh.Sale Price')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Total')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {adjustment.items.map((item) => (
                                                <tr key={item.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                    <td className="px-4 py-2.5">
                                                        <div className="text-xs font-medium text-gray-900">{item.product.ItmNm}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono">{item.product.ItemCode}</div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            item.adjustment_type === 'addition' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {item.adjustment_type === 'addition' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownLeft className="w-3 h-3 mr-0.5" />}
                                                            {item.adjustment_type.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        {/* If approved and actual movements exist for this product, show real batches used */}
                                                        {adjustment.status === 'approved' && actualMovements[String(item.product?.ItmKy)] ? (
                                                            <div className="space-y-1">
                                                                {actualMovements[String(item.product?.ItmKy)].map((mv, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1.5">
                                                                        <div className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                                            {mv.batch_no || '-'}
                                                                        </div>
                                                                        <span className="text-[10px] text-gray-400">({mv.qty.toFixed(2)})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit">
                                                                {item.batch_no || '-'}
                                                            </div>
                                                        )}
                                                        {item.serial_number && (
                                                            <div className="text-[10px] text-vismass-blue font-bold flex items-center mt-0.5">
                                                                <Hash className="w-3 h-3 mr-0.5" />
                                                                {item.serial_number}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-medium text-gray-500">{Number(item.current_stock || 0).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-bold text-blue-600">{Number(item.current_available_stock || 0).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={`text-xs font-bold ${item.adjustment_type === 'addition' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {item.adjustment_type === 'addition' ? '+' : '-'}{parseFloat(item.quantity).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-bold text-gray-900">
                                                            {(Number(item.current_stock || 0) + (item.adjustment_type === 'addition' ? parseFloat(item.quantity || '0') : -parseFloat(item.quantity || '0'))).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-medium text-gray-900">{parseFloat(item.cost_price || '0').toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-medium text-gray-900">{parseFloat(item.sale_price || '0').toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-medium text-gray-900">{parseFloat(item.wholesale_price || '0').toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-medium text-gray-900">{parseFloat(item.vehicle_sale_price || '0').toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-xs font-bold text-gray-900">{(parseFloat(item.quantity) * parseFloat(item.cost_price)).toFixed(2)}</span>
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Totals Row */}
                                            <tr className="bg-gradient-to-r from-sky-50 to-blue-50 border-t-2 border-sky-200">
                                                <td colSpan={4} className="px-4 py-3 text-right">
                                                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest">{t('Totals')}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-sm font-bold text-gray-900">{totalQty.toFixed(2)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right"></td>
                                                <td className="px-4 py-3 text-right"></td>
                                                <td className="px-4 py-3 text-right"></td>
                                                <td className="px-4 py-3 text-right"></td>
                                                <td className="px-4 py-3 text-right"></td>
                                                <td className="px-4 py-3 text-right"></td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-sm font-black text-vismass-blue">Rs. {totalAmount.toFixed(2)}</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
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
                                        <p className="text-sm font-bold text-slate-800 ml-8">{adjustment.recorder?.name || t('System')}</p>
                                        <p className="text-[10px] text-slate-500 ml-8">{format(new Date(adjustment.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
                                    </div>
                                    {adjustment.approver && (
                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center mb-2">
                                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center mr-2">
                                                    <CheckCircle2 className="w-3 h-3 text-white" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 uppercase">{t('Approved By')}</p>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 ml-8">{adjustment.approver.name}</p>
                                            {adjustment.approver.email && (
                                                <p className="text-[10px] text-green-600 ml-8">{adjustment.approver.email}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Stock Adjustment')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Approve Confirmation Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            {t('Approve Stock Adjustment')}
                        </DialogTitle>
                        <DialogDescription className="text-left">
                            {t('Review and edit quantities before approving. This will update inventory levels.')}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-auto -mx-6 px-6">
                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-sky-900 uppercase tracking-wider">{t('Product')}</th>
                                        <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-sky-900 uppercase tracking-wider">{t('Type')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider">{t('Avail.')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider">{t('Now Avail.')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider">{t('Qty')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider whitespace-nowrap">{t('Cost Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider whitespace-nowrap">{t('Sale Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider whitespace-nowrap">{t('WSale Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider whitespace-nowrap">{t('Veh.Sale Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-sky-900 uppercase tracking-wider whitespace-nowrap">{t('Total')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {adjustment.items.map((item, index) => {
                                        const editedItem = editedItems.find(ei => ei.id === item.id);
                                        const qty = parseFloat(editedItem?.quantity || '0');
                                        const cost = parseFloat(editedItem?.cost_price || '0');
                                        const lineTotal = qty * cost;
                                        
                                        return (
                                            <tr key={item.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                <td className="px-3 py-2">
                                                    <div className="text-[11px] font-medium text-gray-900 truncate max-w-[120px]">{item.product.ItmNm}</div>
                                                    <div className="text-[9px] text-gray-500 font-mono">{item.product.ItemCode}</div>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                        item.adjustment_type === 'addition' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {item.adjustment_type === 'addition' ? '+' : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <span className="text-[10px] text-gray-500">{Number(item.current_stock || 0).toFixed(2)}</span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <span className="text-[10px] font-bold text-blue-600">{Number(item.current_available_stock || 0).toFixed(2)}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="1"
                                                        value={editedItem?.quantity || ''}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onChange={(e) => handleItemEdit(item.id, 'quantity', e.target.value)}
                                                        className="w-20 text-right text-[11px] font-bold border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        value={editedItem?.cost_price ?? ''}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onChange={(e) => handleItemEdit(item.id, 'cost_price', e.target.value)}
                                                        onBlur={(e) => handleItemEdit(item.id, 'cost_price', Number(e.target.value || 0).toFixed(2))}
                                                        className="w-24 text-right text-[11px] font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        value={editedItem?.sale_price ?? ''}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onChange={(e) => handleItemEdit(item.id, 'sale_price', e.target.value)}
                                                        onBlur={(e) => handleItemEdit(item.id, 'sale_price', Number(e.target.value || 0).toFixed(2))}
                                                        className="w-24 text-right text-[11px] font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        value={editedItem?.wholesale_price ?? ''}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onChange={(e) => handleItemEdit(item.id, 'wholesale_price', e.target.value)}
                                                        onBlur={(e) => handleItemEdit(item.id, 'wholesale_price', Number(e.target.value || 0).toFixed(2))}
                                                        className="w-24 text-right text-[11px] font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        value={editedItem?.vehicle_sale_price ?? ''}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onChange={(e) => handleItemEdit(item.id, 'vehicle_sale_price', e.target.value)}
                                                        onBlur={(e) => handleItemEdit(item.id, 'vehicle_sale_price', Number(e.target.value || 0).toFixed(2))}
                                                        className="w-24 text-right text-[11px] font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <span className="text-[11px] font-bold text-gray-900">
                                                        Rs. {lineTotal.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gradient-to-r from-sky-50 to-blue-50 border-t-2 border-sky-200">
                                    <tr>
                                        <td colSpan={8} className="px-3 py-2 text-right">
                                            <span className="text-[10px] font-bold text-sky-700 uppercase">{t('Totals')}</span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span className="text-[11px] font-black text-green-600">
                                                Rs. {editedItems.reduce((sum, ei) => {
                                                    const qty = parseFloat(ei.quantity || '0');
                                                    const cost = parseFloat(ei.cost_price || '0');
                                                    return sum + (qty * cost);
                                                }, 0).toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowApproveDialog(false)}
                            disabled={isProcessing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="bg-green-500 hover:bg-green-600 text-white"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            {t('Approve')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Confirmation Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <XCircle className="h-5 w-5 text-red-600" />
                            </div>
                            {t('Reject Stock Adjustment')}
                        </DialogTitle>
                        <DialogDescription className="text-left">
                            {t('Are you sure you want to reject this stock adjustment?')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                        <p className="text-sm text-slate-600">
                            {t('This adjustment will be marked as rejected and no inventory changes will be made.')}
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowRejectDialog(false)}
                            disabled={isProcessing}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            onClick={handleReject}
                            disabled={isProcessing}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <X className="h-4 w-4 mr-2" />
                            )}
                            {t('Reject')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
