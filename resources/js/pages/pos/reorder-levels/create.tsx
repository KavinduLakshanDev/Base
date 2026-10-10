import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Save, Package, TrendingUp, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Button } from '@/components/ui/button';

interface Product {
    ItmKy: number;
    ItemCode: string;
    ItmNm: string;
    barcode?: string | null;
}

interface Section {
    id: number;
    section_code: string;
    name: string;
    is_main_stock: boolean;
}

interface Props {
    products: Product[];
    sections: Section[];
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function CreateReorderLevel({ products, sections, flash }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        item_code: '',
        section_code: '',
        reorder_level: '',
    });

    const { auth } = usePage().props as any;
    const company = auth?.user?.company;

    // Set default section if available
    useEffect(() => {
        if (sections.length > 0 && !data.section_code) {
            const mainStock = sections.find(s => s.is_main_stock);
            if (mainStock) {
                setData('section_code', mainStock.section_code);
            } else {
                setData('section_code', sections[0].section_code);
            }
        }
    }, [sections]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Reorder Levels'),
            href: route('pos.reorder-levels.index'),
        },
        {
            title: t('Create'),
            href: '#',
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('pos.reorder-levels.store'), {
            onSuccess: () => {
                toast.success(t('Reorder level created successfully'));
            },
        });
    };

    const selectedProduct = products.find(p => p.ItemCode === data.item_code);

    // popover/search state for product selector
    const [productSearch, setProductSearch] = useState('');
    const [productOpen, setProductOpen] = useState(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Create Reorder Level')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={route('pos.reorder-levels.index')}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-4 w-4 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Create Reorder Level')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Configure stock monitoring levels for products')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <form onSubmit={handleSubmit}>
                            {/* Success/Error Messages */}
                            {flash?.success && (
                                <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                    <div className="flex">
                                        <div className="shrink-0">
                                            <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-green-800">
                                                {flash.success}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {flash?.error && (
                                <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                    <div className="flex">
                                        <div className="shrink-0">
                                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-red-800">
                                                {flash.error}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Configuration Details Section */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2 mb-4">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <Package className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h2 className="text-base font-semibold text-gray-800">{t('Configuration Details')}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {/* Company Information (Read-only) */}
                                    {company && (
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                {t('Current Company')}
                                            </label>
                                            <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-slate-50 text-slate-600 font-semibold flex items-center space-x-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                                <span>{company.name}</span>
                                                {auth?.user?.company_code && (
                                                    <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 uppercase tracking-wider ml-auto">
                                                        {auth.user.company_code}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Product Selection */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Product')} *
                                        </label>
                                        <Popover open={productOpen} onOpenChange={(o) => { setProductOpen(o); if (o) setProductSearch(''); }}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={productOpen}
                                                    className="w-full justify-between font-normal border-gray-300 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                                    id="product-select-trigger"
                                                >
                                                    {data.item_code
                                                        ? products.find(p => p.ItemCode === data.item_code)?.ItmNm + ' (' + data.item_code + ')'
                                                        : t('Select a product...')}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput
                                                        placeholder={t('Search product...')}
                                                        value={productSearch}
                                                        onValueChange={setProductSearch}
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>{t('No product found.')}</CommandEmpty>
                                                        <CommandGroup>
                                                            {productSearch.trim() === '' ? null : products
                                                                .filter(p => {
                                                                    const term = productSearch.toLowerCase();
                                                                    return p.ItemCode.toLowerCase().includes(term)
                                                                        || p.ItmNm.toLowerCase().includes(term)
                                                                        || (p.barcode || '').toLowerCase().includes(term);
                                                                })
                                                                .map(p => (
                                                                    <CommandItem
                                                                        key={p.ItemCode}
                                                                        value={`${p.ItemCode} ${p.ItmNm}`}
                                                                        onSelect={() => {
                                                                            setData('item_code', p.ItemCode);
                                                                            setProductSearch('');
                                                                            setProductOpen(false);
                                                                        }}
                                                                    >
                                                                        {p.ItmNm} ({p.ItemCode})
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {errors.item_code && (
                                            <p className="text-red-500 text-xs mt-1">{errors.item_code}</p>
                                        )}
                                    </div>

                                    {/* Section Selection */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Section')} *
                                        </label>
                                        <select
                                            value={data.section_code}
                                            onChange={e => setData('section_code', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition bg-white"
                                            required
                                        >
                                            <option value="">{t('Select a section...')}</option>
                                            {sections.map((section) => (
                                                <option key={section.section_code} value={section.section_code}>
                                                    {section.name} {section.is_main_stock ? `(${t('Main Stock')})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.section_code && (
                                            <p className="text-red-500 text-xs mt-1">{errors.section_code}</p>
                                        )}
                                    </div>

                                    {/* Reorder Level */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Reorder Level')} *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.reorder_level}
                                            onChange={e => setData('reorder_level', e.target.value)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition bg-white"
                                            placeholder={t('Enter reorder level...')}
                                            required
                                        />
                                        {errors.reorder_level && (
                                            <p className="text-red-500 text-xs mt-1">{errors.reorder_level}</p>
                                        )}
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            {t('When stock falls below this level, the item will be flagged for reordering.')}
                                        </p>
                                    </div>
                                </div>

                                {/* Product Info Display */}
                                {selectedProduct && (
                                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm transition-all duration-300">
                                        <div className="flex items-center space-x-2 mb-3">
                                            <Package className="h-4 w-4 text-blue-600" />
                                            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">{t('Selected Product Details')}</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-white/60 p-2.5 rounded-md border border-blue-100 shadow-sm">
                                                <p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">{t('Product Name')}</p>
                                                <p className="text-sm font-semibold text-slate-800">{selectedProduct.ItmNm}</p>
                                            </div>
                                            <div className="bg-white/60 p-2.5 rounded-md border border-blue-100 shadow-sm">
                                                <p className="text-[10px] text-blue-500 uppercase font-bold mb-0.5">{t('Product Code')}</p>
                                                <p className="text-sm font-mono text-slate-700">{selectedProduct.ItemCode}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-gradient-to-r from-vismass-blue to-vismass-grey hover:from-blue-700 hover:to-slate-700 text-white px-8 py-2.5 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold disabled:opacity-75 disabled:cursor-not-allowed text-sm flex items-center space-x-2"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Creating...')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{t('Create Reorder Level')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-slate-500">
                        <p className="text-xs">© VISMASS {t('Reorder Levels Management')} • {t('Professional Inventory Solutions')}</p>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}