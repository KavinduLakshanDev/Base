import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Download, Printer, Wallet, Filter, TrendingDown, FileText, Receipt, PieChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { formatCurrency } from '@/utils/currency';

interface Category {
    id: number;
    name: string;
}

interface Section {
    id: number;
    name: string;
    section_code: string;
}

interface PettyCashAnalysisProps {
    summary: {
        total_outflow: number;
        transaction_count: number;
        average_amount: number;
        categories_used: number;
    };
    by_category: Array<{
        category_id: number;
        category_name: string;
        transaction_count: number;
        total_amount: number;
        average_amount: number;
        percentage: number;
    }>;
    time_series: Array<{
        date: string;
        amount: number;
        count: number;
    }>;
    filters: {
        date_from: string;
        date_to: string;
        category_id: string | null;
        section_code: string | null;
    };
    categories: Category[];
    sections: Section[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    { title: t('Reports'), href: '/reports/cash-collection-report' },
    { title: t('Petty Cash Analysis'), href: '#' },
];

const CHART_COLORS = ['#6366F1', '#f97316', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6'];

export default function PettyCashAnalysis({
    summary,
    by_category,
    time_series,
    filters,
    categories,
    sections,
}: PettyCashAnalysisProps) {
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [categoryId, setCategoryId] = useState(filters.category_id || 'all');
    const [sectionCode, setSectionCode] = useState(filters.section_code || 'all');

    const applyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/reports/petty-cash-analysis',
            {
                date_from: dateFrom,
                date_to: dateTo,
                category_id: categoryId,
                section_code: sectionCode,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleExport = () => {
        router.get(
            '/reports/petty-cash-analysis/export',
            {
                date_from: dateFrom,
                date_to: dateTo,
                category_id: categoryId,
                section_code: sectionCode,
            },
            { preserveState: true, replace: true }
        );
    };

    const handlePrint = () => window.print();

    const selectedSectionLabel = sections.find((s) => s.section_code === sectionCode)?.name || 'All Sections';
    const selectedCategoryLabel =
        categoryId === 'all'
            ? 'All Categories'
            : categories.find((c) => c.id === Number(categoryId))?.name || 'All Categories';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Petty Cash Analysis')} />
            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Wallet className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{t('Petty Cash Analysis')}</h1>
                                    <p className="text-xs text-white/80">
                                        {t('Category-wise analysis of petty cash spending')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleExport}
                                    className="inline-flex items-center rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30 transition-all shadow-sm"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('Export CSV')}
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print Report')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="space-y-6 px-4 sm:px-0">
                        {/* Filters */}
                        <Card className="border-slate-200 bg-white shadow-sm no-print">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Filter className="h-4 w-4" /> {t('Filters')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={applyFilters} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label>{t('Date From')}</Label>
                                        <Input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Date To')}</Label>
                                        <Input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Category')}</Label>
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="block w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-vismass-blue focus:ring-vismass-blue"
                                        >
                                            <option value="all">{t('All Categories')}</option>
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Section')}</Label>
                                        <select
                                            value={sectionCode}
                                            onChange={(e) => setSectionCode(e.target.value)}
                                            className="block w-full rounded-lg border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-vismass-blue focus:ring-vismass-blue"
                                        >
                                            <option value="all">{t('All Sections')}</option>
                                            {sections.map((sec) => (
                                                <option key={sec.id} value={sec.section_code}>
                                                    {sec.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-4">
                                        <Button type="submit" className="gap-2">
                                            <BarChart3 className="h-4 w-4" />
                                            {t('Apply')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Summary KPIs */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Card className="border-slate-200 bg-white shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500">{t('Total Petty Cash Outflow')}</p>
                                            <p className="mt-1 text-2xl font-bold text-vismass-blue">{formatCurrency(Number(summary.total_outflow))}</p>
                                        </div>
                                        <TrendingDown className="h-8 w-8 text-red-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 bg-white shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500">{t('Transactions')}</p>
                                            <p className="mt-1 text-2xl font-bold text-slate-800">{summary.transaction_count}</p>
                                        </div>
                                        <FileText className="h-8 w-8 text-slate-400" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 bg-white shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500">{t('Average Per Transaction')}</p>
                                            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(Number(summary.average_amount))}</p>
                                        </div>
                                        <Receipt className="h-8 w-8 text-emerald-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200 bg-white shadow-sm">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500">{t('Categories Used')}</p>
                                            <p className="mt-1 text-2xl font-bold text-slate-800">{summary.categories_used}</p>
                                        </div>
                                        <PieChart className="h-8 w-8 text-indigo-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <Card className="border-slate-200 bg-white shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Spending by Category')}</CardTitle>
                                    <CardDescription>{t('Total petty cash outflow per category')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={by_category}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="category_name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                            <Legend />
                                            <Bar dataKey="total_amount" name="Total Spent" radius={[4, 4, 0, 0]}>
                                                {by_category.map((_, idx) => (
                                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 bg-white shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Daily Outflow Trend')}</CardTitle>
                                    <CardDescription>{t('Petty cash outflow per day')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <LineChart data={time_series}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                            <Legend />
                                            <Line type="monotone" dataKey="amount" name="Outflow" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Category share donut */}
                        <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">{t('Category Share')}</CardTitle>
                                <CardDescription>{t('Proportion of total spending by category')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
                                <ResponsiveContainer width="100%" height={260} className="max-w-md">
                                    <RePieChart>
                                        <Pie
                                            data={by_category}
                                            dataKey="total_amount"
                                            nameKey="category_name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={({ name, percent }) => `${name} (${Math.round(Number(percent) * 100)}%)`}
                                        >
                                            {by_category.map((_, idx) => (
                                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                        <Legend />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Category breakdown table */}
                        <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base">{t('Category Breakdown')}</CardTitle>
                                <CardDescription>
                                    {t('Date Range')}: {dateFrom} {t('to')} {dateTo} • {selectedSectionLabel} • {selectedCategoryLabel}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Category')}</TableHead>
                                            <TableHead className="text-right">{t('Transactions')}</TableHead>
                                            <TableHead className="text-right">{t('Total Amount')}</TableHead>
                                            <TableHead className="text-right">{t('Average')}</TableHead>
                                            <TableHead className="text-right">{t('Share')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {by_category.map((row) => (
                                            <TableRow key={row.category_id}>
                                                <TableCell className="font-medium">{row.category_name}</TableCell>
                                                <TableCell className="text-right">{row.transaction_count}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.total_amount)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.average_amount)}</TableCell>
                                                <TableCell className="text-right">{row.percentage}%</TableCell>
                                            </TableRow>
                                        ))}
                                        {by_category.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                    {t('No petty cash transactions found for the selected filters.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}