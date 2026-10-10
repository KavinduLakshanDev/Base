import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Printer, Plus, AlertTriangle, CheckCircle2, XCircle, Eye, Search, Filter, X, Trash2, Pencil, Calendar, FileText, User, Package, Hash, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface PrinterWastage {
    id: number;
    printer_name: string;
    serial_number: string;
    batch_no: string;
    brand: string;
    model: string;
    warranty: string;
    reason: string;
    recorded_by: string;
    recorded_at: string;
    status: string;
    section_id: number;
}

interface Props {
    wastages: {
        data: PrinterWastage[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export default function PrinterWastageIndex({ wastages }: Props) {
    const approvedCount = wastages.data.filter(w => w.status === 'approved').length;
    const pendingCount = wastages.data.filter(w => w.status === 'pending').length;
    const rejectedCount = wastages.data.filter(w => w.status === 'rejected').length;

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // View Modal State
    const [viewWastage, setViewWastage] = useState<PrinterWastage | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Edit Modal State
    const [editWastage, setEditWastage] = useState<PrinterWastage | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { data, setData, put, processing, errors, reset } = useForm({
        reason: '',
        wastage_date: '',
        notes: '',
        status: 'approved',
        serial_number: '',
    });

    // Edit Search State
    const [editSearchTerm, setEditSearchTerm] = useState('');
    const [editSearchResults, setEditSearchResults] = useState<any[]>([]);
    const [isEditSearching, setIsEditSearching] = useState(false);
    const [showEditDropdown, setShowEditDropdown] = useState(false);
    const [selectedEditPrinter, setSelectedEditPrinter] = useState<any>(null);

    const handleView = (wastage: PrinterWastage) => {
        setViewWastage(wastage);
        setIsViewModalOpen(true);
    };

    const handleEdit = (wastage: PrinterWastage) => {
        setEditWastage(wastage);
        setSelectedEditPrinter({
            name: wastage.printer_name,
            serial_number: wastage.serial_number,
            brand: wastage.brand,
            model: wastage.model,
            batch_no: wastage.batch_no,
        });
        setEditSearchTerm(wastage.serial_number);
        setData({
            reason: wastage.reason || '',
            wastage_date: wastage.recorded_at || '',
            notes: '', 
            status: wastage.status as 'approved',
            serial_number: wastage.serial_number,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSearch = async (term: string) => {
        setEditSearchTerm(term);
        if (term.length < 2 || !editWastage) {
            setEditSearchResults([]);
            return;
        }

        setIsEditSearching(true);
        setShowEditDropdown(true);
        try {
            const response = await fetch(`/printer-wastages/search-printers?term=${term}&section_id=${editWastage.section_id}`);
            const results = await response.json();
            setEditSearchResults(results);
        } catch (error) {
            console.error('Error searching printers:', error);
        } finally {
            setIsEditSearching(false);
        }
    };

    const selectEditPrinter = (printer: any) => {
        setSelectedEditPrinter(printer);
        setData('serial_number', printer.serial_number);
        setEditSearchTerm(printer.serial_number);
        setShowEditDropdown(false);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editWastage) return;

        put(`/printer-wastages/${editWastage.id}`, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                reset();
            },
        });
    };

    const breadcrumbs = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Printer Wastage'),
            href: '#',
        },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
    };

    const filteredWastages = wastages.data.filter(wastage => {
        const matchesSearch = search === '' || 
            wastage.printer_name.toLowerCase().includes(search.toLowerCase()) ||
            wastage.serial_number.toLowerCase().includes(search.toLowerCase()) ||
            wastage.batch_no.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || wastage.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this printer wastage record?')) {
            router.delete(`/printer-wastages/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Printer Wastage')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow border border-white/30">
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Printer Wastage')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage printer wastage and damaged items')}
                                    </p>
                                </div>
                            </div>
                            <Link href="/printer-wastages/create" className="no-print">
                                <Button className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Plus className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Record New Wastage')}</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center justify-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Printer className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Total Printer Wastage')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {wastages.total}
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
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Printer Wastage Records')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View all recorded printer wastage details')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <form onSubmit={handleSearch} className="space-y-3 md:space-y-0 md:flex md:space-x-3">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by printer name, serial number, or batch...')}
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex space-x-2">
                                            <button
                                                type="submit"
                                                className="inline-flex items-center bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 font-medium"
                                            >
                                                <Search className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Search')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <X className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Printer Wastage Table */}
                                {filteredWastages.length > 0 ? (
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-100 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                                                            {t('Printer')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                                                            {t('Serial Number')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                                                            {t('Batch')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                                                            {t('Brand/Model')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                                                            {t('Date')}
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                                                            {t('Status')}
                                                        </th>
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase">
                                                            {t('Actions')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {filteredWastages.map((wastage) => (
                                                        <tr key={wastage.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                                {wastage.printer_name}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                                                                {wastage.serial_number}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                                                                {wastage.batch_no}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                                {wastage.brand} {wastage.model}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                                                                {wastage.recorded_at}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                                                                    wastage.status === 'approved'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : wastage.status === 'pending'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {wastage.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-center">
                                                                <div className="flex items-center justify-center space-x-2">
                                                                    <button
                                                                        onClick={() => handleView(wastage)}
                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title={t('View Details')}
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </button>
                                                                    {/* <button
                                                                        onClick={() => handleEdit(wastage)}
                                                                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                        title={t('Edit Record')}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </button> */}
                                                                    <button
                                                                        onClick={() => handleDelete(wastage.id)}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title={t('Delete Record')}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Printer className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No printer wastage records found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Get started by recording a new printer wastage.')}
                                        </p>
                                        <Link
                                            href="/printer-wastages/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Record Wastage')}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS POS System • {t('Printer Wastage Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
                {/* View Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="max-w-2xl overflow-hidden rounded-2xl p-0 border-none shadow-2xl">
                        <DialogHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey p-6 text-white">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-xl bg-white/20 p-2.5 shadow-lg border border-white/30">
                                    <Printer className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold">{t('Printer Wastage Details')}</DialogTitle>
                                    <DialogDescription className="text-white/80 mt-1">
                                        {t('Detailed information for this wastage record')}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {viewWastage && (
                            <div className="p-6 bg-white space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="mt-1 p-1.5 bg-sky-50 rounded-lg">
                                                <Package className="h-4 w-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Printer Item')}</p>
                                                <p className="text-sm font-bold text-slate-800">{viewWastage.printer_name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <div className="mt-1 p-1.5 bg-sky-50 rounded-lg">
                                                <Hash className="h-4 w-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Serial Number')}</p>
                                                <p className="text-sm font-mono font-medium text-vismass-blue">{viewWastage.serial_number}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <div className="mt-1 p-1.5 bg-sky-50 rounded-lg">
                                                <Info className="h-4 w-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Brand / Model')}</p>
                                                <p className="text-sm font-medium text-slate-700">{viewWastage.brand} / {viewWastage.model}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="mt-1 p-1.5 bg-sky-50 rounded-lg">
                                                <Calendar className="h-4 w-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Recorded Date')}</p>
                                                <p className="text-sm font-medium text-slate-700">{viewWastage.recorded_at}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <div className="mt-1 p-1.5 bg-sky-50 rounded-lg">
                                                <User className="h-4 w-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Recorded By')}</p>
                                                <p className="text-sm font-medium text-slate-700">{viewWastage.recorded_by}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-3">
                                            <div className="mt-1 p-1.5 bg-sky-50 rounded-lg">
                                                <CheckCircle2 className="h-4 w-4 text-sky-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Status')}</p>
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none capitalize">
                                                    {viewWastage.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex items-start space-x-3">
                                        <div className="mt-1 p-1.5 bg-sky-50 rounded-lg">
                                            <FileText className="h-4 w-4 text-sky-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Reason for Wastage')}</p>
                                            <div className="mt-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 italic">
                                                "{viewWastage.reason}"
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="bg-slate-50 p-4 border-t border-slate-200">
                            <Button onClick={() => setIsViewModalOpen(false)} variant="outline" className="rounded-xl px-6">
                                {t('Close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-w-md overflow-hidden rounded-2xl p-0 border-none shadow-2xl">
                        <form onSubmit={handleUpdate}>
                            <DialogHeader className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-xl bg-white/20 p-2.5 shadow-lg border border-white/30">
                                        <Pencil className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-bold">{t('Edit Wastage Record')}</DialogTitle>
                                        <DialogDescription className="text-white/80 mt-1">
                                            {t('Update the reason or date for this record')}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="p-6 bg-white space-y-5 overflow-visible">
                                <div className="space-y-2 relative">
                                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Select Printer')}</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            value={editSearchTerm}
                                            onChange={e => handleEditSearch(e.target.value)}
                                            onFocus={() => editSearchResults.length > 0 && setShowEditDropdown(true)}
                                            placeholder={t('Search by S/N or Name...')}
                                            className="pl-10 rounded-xl border-slate-200 focus:ring-amber-500 focus:border-amber-500"
                                        />
                                        {isEditSearching && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
                                            </div>
                                        )}
                                    </div>

                                    {showEditDropdown && editSearchResults.length > 0 && (
                                        <div className="absolute z-[100] mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                                            {editSearchResults.map((printer) => (
                                                <button
                                                    key={printer.id}
                                                    type="button"
                                                    onClick={() => selectEditPrinter(printer)}
                                                    className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-100 last:border-0 transition-colors"
                                                >
                                                    <div className="text-sm font-bold text-slate-800">{printer.name}</div>
                                                    <div className="text-[10px] text-slate-500 mt-1 flex gap-3">
                                                        <span>SN: {printer.serial_number}</span>
                                                        <span>BATCH: {printer.batch_no}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedEditPrinter && (
                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-5">
                                            <Printer className="w-10 h-10 text-amber-600 rotate-12" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 relative z-10">
                                            <div>
                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">{t('Name')}</p>
                                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{selectedEditPrinter.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">{t('Serial')}</p>
                                                <p className="text-xs font-mono font-medium text-amber-700">{selectedEditPrinter.serial_number}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">{t('Brand/Model')}</p>
                                                <p className="text-[11px] text-slate-700">{selectedEditPrinter.brand || 'N/A'} / {selectedEditPrinter.model || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">{t('Batch')}</p>
                                                <p className="text-[11px] text-slate-700">{selectedEditPrinter.batch_no}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="wastage_date" className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Wastage Date')}</Label>
                                    <Input
                                        id="wastage_date"
                                        type="date"
                                        value={data.wastage_date}
                                        onChange={e => setData('wastage_date', e.target.value)}
                                        className="rounded-xl border-slate-200 focus:ring-amber-500 focus:border-amber-500"
                                        required
                                    />
                                    {errors.wastage_date && <p className="text-xs text-red-500 mt-1">{errors.wastage_date}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('Reason')}</Label>
                                    <Textarea
                                        id="reason"
                                        value={data.reason}
                                        onChange={e => setData('reason', e.target.value)}
                                        placeholder={t('Enter reason for wastage...')}
                                        className="rounded-xl border-slate-200 focus:ring-amber-500 focus:border-amber-500 min-h-[80px]"
                                        required
                                    />
                                    {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason}</p>}
                                </div>
                            </div>

                            <DialogFooter className="bg-slate-50 p-4 border-t border-slate-200">
                                <Button type="button" onClick={() => setIsEditModalOpen(false)} variant="ghost" className="rounded-xl">
                                    {t('Cancel')}
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={processing}
                                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-6 shadow-lg shadow-amber-200"
                                >
                                    {processing ? t('Saving...') : t('Save Changes')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
