import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { ScrollText, Search, Eye, X, Calendar, User, DollarSign, Pencil, Filter, TrendingUp } from 'lucide-react';
import { PageProps, BreadcrumbItem } from '@/types';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

interface Quotation {
    id: number;
    service_job_id: number;
    total_amount: string;
    notes: string | null;
    created_at: string;
    service_job: {
        id: number;
        job_number: string;
        customer_name: string;
        customer?: {
            CustNm: string;
        };
    };
    created_by: {
        first_name: string;
        last_name: string;
    } | null;
}

interface QuotationsIndexProps extends PageProps {
    quotations: PaginationMeta & {
        data: Quotation[];
        links: PaginationLink[];
    };
    filters: {
        search?: string;
        per_page?: string;
    };
}

export default function QuotationsIndex({ quotations, filters }: QuotationsIndexProps) {
    const [searchTerm, setSearchTerm] = React.useState(filters.search || '');
    const [itemsPerPage, setItemsPerPage] = React.useState(filters.per_page || String(quotations.per_page || 20));
    const isFirstRender = React.useRef(true);

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
            href: '#',
        },
    ];

    const clearFilters = () => {
        setSearchTerm('');
        setItemsPerPage('10');
        router.get('/quotations', {}, {
            preserveState: true,
            replace: true
        });
    };

    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/quotations',
                { search: searchTerm, per_page: itemsPerPage },
                { preserveState: true, replace: true }
            );
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, itemsPerPage]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount: string | number): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rs ${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleDeleteQuotation = (quotationId: number) => {
        if (confirm(t('Are you sure you want to delete this quotation?'))) {
            router.delete(`/quotations/${quotationId}`, {
                onSuccess: () => {
                    router.reload();
                },
                onError: (err: any) => {
                    console.error('Failed to delete quotation:', err);
                    alert(t('Failed to delete quotation.'));
                }
            });
        }
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Quotations')} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between gap-3 py-4">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 transition-all duration-200 hover:bg-white/30"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <ScrollText className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Quotations')}
                                    </h1>
                                    <p className="hidden sm:block text-xs text-white/80">
                                        {t('View and manage all service quotations')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <ScrollText className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Quotations')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {quotations.total}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('This Page')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {quotations.data.length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Page')} {quotations.current_page} / {quotations.last_page}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {quotations.per_page} {t('per page')}
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
                                            {quotations.data.length}
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
                                            {t('Quotations List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View all generated quotations')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by job number or customer name...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="10">10 / {t('Page')}</option>
                                                    <option value="20">20 / {t('Page')}</option>
                                                    <option value="25">25 / {t('Page')}</option>
                                                    <option value="50">50 / {t('Page')}</option>
                                                    <option value="100">100 / {t('Page')}</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quotations Table */}
                                {quotations.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Job #')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Customer')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Total Amount')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Created Date')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Created By')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {quotations.data.map((quotation) => (
                                                    <tr key={quotation.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                <Link
                                                                    href={`/service-jobs/${quotation.service_job.id}`}
                                                                    className="text-sky-600 hover:text-sky-800 hover:underline"
                                                                >
                                                                    {quotation.service_job.job_number}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center">
                                                                <User className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                                                                <div className="text-xs font-medium text-gray-900">
                                                                    {quotation.service_job.customer_name ||
                                                                        quotation.service_job.customer?.CustNm ||
                                                                        'N/A'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900">
                                                            {formatCurrency(quotation.total_amount)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900 flex items-center">
                                                                <Calendar className="mr-1 h-3 w-3 text-gray-400" />
                                                                {formatDate(quotation.created_at)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-900">
                                                                {quotation.created_by
                                                                    ? `${quotation.created_by.first_name} ${quotation.created_by.last_name}`
                                                                    : 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <Link
                                                                    href={`/quotations/${quotation.id}`}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    {t('View')}
                                                                </Link>
                                                                <Link
                                                                    href={`/quotations/${quotation.id}/edit`}
                                                                    className="inline-flex items-center text-amber-600 hover:text-amber-800"
                                                                >
                                                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                                                    {t('Edit')}
                                                                </Link>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteQuotation(quotation.id)}
                                                                    className="inline-flex items-center text-red-600 hover:text-red-800"
                                                                >
                                                                    <X className="mr-1 h-3.5 w-3.5" />
                                                                    {t('Delete')}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <Pagination links={quotations.links} meta={quotations} />
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <ScrollText className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No quotations found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {filters.search
                                                ? t('Try adjusting your search criteria')
                                                : t('Create quotations for service jobs to see them here')}
                                        </p>
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Quotations Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppSidebarLayout>
    );
}
