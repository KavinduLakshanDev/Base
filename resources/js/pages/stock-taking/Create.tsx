import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    Save,
    Loader,
    Search,
    ClipboardList,
    FileText,
} from 'lucide-react';
import { useState, Fragment } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Stock Taking', href: '/stock-takings' },
    { title: 'New Stock Taking', href: '#' },
];

interface Section {
    id: number;
    section_code: string;
    name: string;
}

interface StockItem {
    product_id: number;
    item_code: string;
    item_name: string;
    category_name: string;
    system_stock: number;
    actual_stock: number;
    cost_price: number;
    batch_no: string;
    notes: string;
}

interface Props {
    sections: Section[];
    suggested_batch: string;
}

export default function StockTakingCreate({ sections, suggested_batch }: Props) {
    const [sectionId, setSectionId] = useState(sections.length > 0 ? sections[0].id.toString() : '');
    const [takingDate, setTakingDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadStock = async () => {
        if (!sectionId) return;
        setIsLoading(true);
        try {
            const response = await fetch(
                `/stock-takings/stock?section_id=${sectionId}&taking_date=${takingDate}`
            );
            const data = await response.json();
            if (data.items) {
                setItems(
                    data.items.map((item: any) => ({
                        product_id: item.product_id,
                        item_code: item.item_code,
                        item_name: item.item_name,
                        category_name: item.category_name,
                        system_stock: item.system_stock,
                        actual_stock: 0,
                        cost_price: item.cost_price,
                        batch_no: item.batch_no || '',
                        notes: '',
                    }))
                );
                setHasLoaded(true);
                setCategoryFilter('ALL');
            }
        } catch (error) {
            console.error('Failed to load stock:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateItemActualStock = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index].actual_stock = value === '' ? 0 : parseFloat(value) || 0;
        setItems(newItems);
    };

    const updateItemNotes = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index].notes = value;
        setItems(newItems);
    };

    const uniqueCategories = [...new Set(items.map((item) => item.category_name || 'Uncategorized'))].sort();

    const filteredItems = items.filter(
        (item) =>
            item.system_stock > 0 &&
            (categoryFilter === 'ALL' || (item.category_name || 'Uncategorized') === categoryFilter) &&
            (item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalSystemStock = items.reduce((sum, item) => sum + item.system_stock, 0);
    const totalActualStock = items.reduce((sum, item) => sum + item.actual_stock, 0);
    const totalVariance = items.reduce(
        (sum, item) => sum + (item.actual_stock - item.system_stock),
        0
    );

    const handleSubmit = () => {
        const itemsToSave = items.filter((item) => item.actual_stock > 0);
        if (itemsToSave.length === 0) return;

        router.post('/stock-takings', {
            section_id: sectionId,
            taking_date: takingDate,
            notes: notes,
            items: itemsToSave.map((item) => ({
                product_id: item.product_id,
                batch_no: item.batch_no || null,
                system_stock: item.system_stock,
                actual_stock: item.actual_stock,
                cost_price: item.cost_price,
                notes: item.notes || null,
            })),
        }, {
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
        });
    };

    const groupedItems = filteredItems.reduce(
        (acc, item) => {
            const cat = item.category_name || 'Uncategorized';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push({ ...item, originalIndex: items.indexOf(item) });
            return acc;
        },
        {} as Record<string, (StockItem & { originalIndex: number })[]>
    );

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Stock Taking')} />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/stock-takings"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <ClipboardList className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Stock Taking')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Physical stock count and variance report')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden no-print">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                <h3 className="text-lg font-semibold text-white">
                                    {t('Report Filters')}
                                </h3>
                                <p className="text-white/80 text-sm mt-1">
                                    {t('Select section and date to load stock items')}
                                </p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label>{t('Section')}</Label>
                                        <Select value={sectionId} onValueChange={setSectionId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select section')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map((sec) => (
                                                    <SelectItem key={sec.id} value={sec.id.toString()}>
                                                        {sec.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Date')}</Label>
                                        <Input
                                            type="date"
                                            value={takingDate}
                                            onChange={(e) => setTakingDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Category')}</Label>
                                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('All Categories')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">{t('All Categories')}</SelectItem>
                                                {uniqueCategories.map((cat) => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 flex items-end">
                                        <Button
                                            onClick={loadStock}
                                            disabled={isLoading || !sectionId}
                                            className="bg-vismass-blue hover:bg-vismass-blue/90 text-white"
                                        >
                                            {isLoading ? (
                                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="mr-2 h-4 w-4" />
                                            )}
                                            {t('Load Stock')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <Label>{t('Notes')}</Label>
                                    <Input
                                        placeholder={t('Optional notes for this stock taking...')}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {hasLoaded && items.length > 0 && (
                            <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">
                                                {t('Stock Items')}
                                            </h3>
                                            <p className="text-white/80 text-sm mt-1">
                                                {t('Enter actual stock count for each item')}
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                                            <Input
                                                placeholder={t('Search items...')}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-9 bg-white/20 border-white/30 text-white placeholder:text-white/60 w-64"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-200">
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700 w-8">#</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Item Code')}</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Item Name')}</th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Batch No')}</th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('System Stock')}</th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-700 bg-blue-50">{t('Actual Stock')}</th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('Variance')}</th>
                                                {/* <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Notes')}</th> */}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(groupedItems).map(([category, catItems]) => (
                                                <Fragment key={category}>
                                                    <tr className="bg-blue-50/50">
                                                        <td colSpan={8} className="px-4 py-2 font-semibold text-slate-700 text-xs uppercase tracking-wide">
                                                            {category}
                                                        </td>
                                                    </tr>
                                                    {catItems.map((item, idx) => {
                                                        const variance = item.actual_stock - item.system_stock;
                                                        const varianceColor =
                                                            variance > 0 ? 'text-green-600' :
                                                            variance < 0 ? 'text-red-600' : 'text-slate-600';
                                                        return (
                                                            <tr key={item.originalIndex} className="border-b border-slate-100 hover:bg-slate-50">
                                                                <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                                                <td className="px-4 py-3 font-mono text-xs">{item.item_code}</td>
                                                                <td className="px-4 py-3">{item.item_name}</td>
                                                                <td className="px-4 py-3 text-xs text-slate-500">{item.batch_no || '-'}</td>
                                                                <td className="px-4 py-3 text-right font-medium">{item.system_stock.toFixed(2)}</td>
                                                                    <td className="px-4 py-3 bg-blue-50/30">
                                                                    <Input
                                                                        type="number"
                                                                        step="1"
                                                                        min="0"
                                                                        value={item.actual_stock}
                                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                        onFocus={(e) => e.target.select()}
                                                                        onChange={(e) => updateItemActualStock(item.originalIndex, e.target.value)}
                                                                        className="w-24 text-right ml-auto font-medium border-blue-300 bg-blue-50 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue focus:bg-white"
                                                                    />
                                                                </td>
                                                                <td className={`px-4 py-3 text-right font-bold ${varianceColor}`}>
                                                                    {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                                                                </td>
                                                                {/* <td className="px-4 py-3">
                                                                    <Input
                                                                        placeholder={t('Note...')}
                                                                        value={item.notes}
                                                                        onChange={(e) => updateItemNotes(item.originalIndex, e.target.value)}
                                                                        className="w-32 text-xs"
                                                                    />
                                                                </td> */}
                                                            </tr>
                                                        );
                                                    })}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                                <td colSpan={4} className="px-4 py-3 text-right text-slate-700">{t('Total')}</td>
                                                <td className="px-4 py-3 text-right">{totalSystemStock.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right bg-blue-50">{totalActualStock.toFixed(2)}</td>
                                                <td className={`px-4 py-3 text-right ${totalVariance > 0 ? 'text-green-600' : totalVariance < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(2)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {hasLoaded && items.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSaving}
                                    className="inline-flex items-center rounded-lg bg-vismass-blue px-6 py-2 text-sm font-medium text-white shadow hover:bg-vismass-blue/90 transition-all duration-200"
                                >
                                    {isSaving ? (
                                        <Loader className="mr-1.5 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-1.5 h-4 w-4" />
                                    )}
                                    {t('Save Stock Taking')}
                                </Button>
                            </div>
                        )}

                        {hasLoaded && items.length === 0 && (
                            <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 text-lg">
                                    {t('No stock items found for the selected section and date')}
                                </p>
                            </div>
                        )}

                        {!hasLoaded && (
                            <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                                <ClipboardList className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 text-lg">
                                    {t('Select a section and date, then click "Load Stock" to begin')}
                                </p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}
