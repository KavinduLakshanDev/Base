import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { Plus, Eye, Search, Receipt, CheckCircle, Clock, TrendingUp, Filter, Edit as EditIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';
import axios from 'axios';

interface Sale {
    id: number;
    invoice_no: string;
    transaction_date: string;
    customer_name: string;
    discount_amount?: string | number;
    total_amount: string | number;
    balance_amount: string | number;
    status: string;
}

interface SalesData extends PaginationMeta {
    data: Sale[];
    links: PaginationLink[];
}

interface Props {
    sales: SalesData;
    filters?: {
        search?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
        per_page?: string;
        item_type?: string;
    };
}

const Index: React.FC<Props> = ({ sales, filters = {} }) => {
    const [searchTerm, setSearchTerm] = React.useState(filters.search || '');
    const [itemType, setItemType] = React.useState(filters.item_type || 'all');
    const [itemsPerPage, setItemsPerPage] = React.useState(filters.per_page || '10');
    const isFirstRender = React.useRef(true);
    const [showEditConfirm, setShowEditConfirm] = React.useState(false);
    const [selectedSale, setSelectedSale] = React.useState<Sale | null>(null);
    const [adminEmail, setAdminEmail] = React.useState('');
    const [adminPassword, setAdminPassword] = React.useState('');
    const [adminError, setAdminError] = React.useState('');
    const [verifying, setVerifying] = React.useState(false);

    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/sales',
                { 
                    search: searchTerm, 
                    per_page: itemsPerPage,
                    item_type: itemType
                },
                { preserveState: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, itemsPerPage, itemType]);

    const completedSales = sales.data.filter(sale => sale.status === 'completed').length;
    const pendingSales = sales.data.filter(sale => sale.status === 'pending' || sale.status === 'partially_paid').length;
    const totalRevenue = sales.data.reduce((sum, sale) => sum + Number(sale.total_amount), 0);

    // Use server-filtered data
    const filteredSales = sales.data;

    const handleEditClick = (sale: Sale) => {
        setSelectedSale(sale);
        setAdminEmail('');
        setAdminPassword('');
        setAdminError('');
        setShowEditConfirm(true);
    };

    const handleConfirmEdit = async () => {
        if (!selectedSale) return;

        if (!adminEmail || !adminPassword) {
            setAdminError(t('Please enter admin email and password.'));
            return;
        }

        setVerifying(true);
        setAdminError('');
        try {
            await axios.post('/sales/verify-admin', {
                email: adminEmail,
                password: adminPassword,
                sale_id: selectedSale.id,
            });

            // Credentials valid — navigate to edit page (full navigation so session flag is read)
            setShowEditConfirm(false);
            window.location.href = `/sales/${selectedSale.id}/edit`;
        } catch (err: any) {
            const msg = err?.response?.data?.message || t('Invalid admin credentials.');
            setAdminError(msg);
        } finally {
            setVerifying(false);
        }
    };

    const handleCancelEdit = () => {
        setShowEditConfirm(false);
        setSelectedSale(null);
        setAdminEmail('');
        setAdminPassword('');
        setAdminError('');
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Sales'), href: '#' },
    ];

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Sales')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
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
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Sales')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Track and manage sales transactions')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/sales/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Create New Sale')}</span>
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
                                        <Receipt className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Sales')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {sales.data.length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Completed')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {completedSales}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Clock className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Pending')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {pendingSales}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Filtered')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {filteredSales.length}
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
                                            {t('Sales List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all sales transactions')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        {/* Search */}
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by invoice or customer...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Per-page + clear */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="w-32">
                                                <select
                                                    value={itemType}
                                                    onChange={(e) => setItemType(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="all">{t('All Types')}</option>
                                                    <option value="product">{t('Product')}</option>
                                                    <option value="printer">{t('Printer')}</option>
                                                </select>
                                            </div>
                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="10">10 / {t('Page')}</option>
                                                    <option value="25">25 / {t('Page')}</option>
                                                    <option value="50">50 / {t('Page')}</option>
                                                    <option value="100">100 / {t('Page')}</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => { setSearchTerm(''); setItemType('all'); setItemsPerPage('10'); }}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sales Table */}
                                {filteredSales.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Invoice No')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Date')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Customer')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Discount')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Total')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Balance')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredSales.map((sale) => (
                                                    <tr key={sale.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {sale.invoice_no}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900">
                                                                {new Date(sale.transaction_date).toLocaleDateString('en-GB')}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {sale.customer_name}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-right">
                                                            <span className={Number(sale.discount_amount || 0) > 0 ? "font-medium text-red-600" : "text-gray-400"}>
                                                                Rs. {Number(sale.discount_amount || 0).toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900 text-right">
                                                            Rs. {Number(sale.total_amount).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-right">
                                                            {Number(sale.balance_amount || 0) > 0 ? (
                                                                <span className={sale.status === 'partially_paid' ? "text-orange-600" : "text-green-600"}>
                                                                    Rs. {Number(sale.balance_amount).toFixed(2)}
                                                                    <span className="text-[10px] ml-1 block opacity-70">
                                                                        {sale.status === 'partially_paid' ? t('Debt') : t('Change')}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">Rs. 0.00</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sale.status === 'completed'
                                                                ? 'bg-green-100 text-green-800'
                                                                : sale.status === 'partially_paid'
                                                                    ? 'bg-orange-100 text-orange-800'
                                                                    : sale.status === 'pending'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleEditClick(sale)}
                                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <EditIcon className="mr-1 h-3.5 w-3.5" />
                                                                    {t('Edit')}
                                                                </button>
                                                                <Link
                                                                    href={`/sales/${sale.id}`}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    {t('View')}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <Pagination links={sales.links} meta={sales} />
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Receipt className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No sales found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {searchTerm ? t('Try adjusting your search criteria') : t('Get started by creating a new sale.')}
                                        </p>
                                        {!searchTerm && (
                                            <Link
                                                href="/sales/create"
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Create Sale')}
                                            </Link>
                                        )}
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Sales Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>

                {/* Edit Confirmation Dialog with Admin Authorization */}
                <Dialog open={showEditConfirm} onOpenChange={(open) => { if (!open) handleCancelEdit(); }}>
                    <DialogContent className="sm:max-w-[440px]">
                        <DialogHeader>
                            <div className="flex items-center space-x-2 mb-1">
                                <ShieldCheck className="h-5 w-5 text-vismass-blue" />
                                <DialogTitle>{t('Admin Authorization Required')}</DialogTitle>
                            </div>
                            <DialogDescription>
                                {t('Enter admin credentials to access the edit page.')}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedSale && (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-1">
                                <p><span className="font-medium text-slate-600">{t('Invoice')}:</span> {selectedSale.invoice_no}</p>
                                <p><span className="font-medium text-slate-600">{t('Customer')}:</span> {selectedSale.customer_name}</p>
                                <p><span className="font-medium text-slate-600">{t('Total')}:</span> Rs. {Number(selectedSale.total_amount).toFixed(2)}</p>
                            </div>
                        )}

                        <div className="space-y-4 mt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="admin-email" className="text-sm font-medium">{t('Admin Email')} <span className="text-red-500">*</span></Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    value={adminEmail}
                                    onChange={(e) => { setAdminEmail(e.target.value); setAdminError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmEdit()}
                                    placeholder="admin@example.com"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="admin-password" className="text-sm font-medium">{t('Admin Password')} <span className="text-red-500">*</span></Label>
                                <Input
                                    id="admin-password"
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => { setAdminPassword(e.target.value); setAdminError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmEdit()}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>
                            {adminError && (
                                <p className="text-sm text-red-600 font-medium">{adminError}</p>
                            )}
                        </div>

                        <DialogFooter className="mt-2">
                            <Button variant="outline" onClick={handleCancelEdit} disabled={verifying}>
                                {t('Cancel')}
                            </Button>
                            <Button onClick={handleConfirmEdit} disabled={verifying} className="bg-vismass-blue hover:bg-vismass-blue/90">
                                {verifying ? (
                                    <span className="flex items-center space-x-1">
                                        <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                        <span>{t('Verifying...')}</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center space-x-1">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>{t('Authorize & Edit')}</span>
                                    </span>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div >
        </AppSidebarLayout >
    );
};

export default Index;
