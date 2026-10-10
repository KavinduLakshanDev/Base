import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Save, Package, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface ReorderLevel {
    id: number;
    item_code: string;
    reorder_level: number;
    section_code: string;
    product?: {
        ItmKy: number;
        ItemCode: string;
        ItmNm: string;
    };
}

interface Product {
    ItmKy: number;
    ItemCode: string;
    ItmNm: string;
}

interface Section {
    id: number;
    section_code: string;
    name: string;
    is_main_stock: boolean;
}

interface Props {
    reorderLevel: ReorderLevel;
    products: Product[];
    sections: Section[];
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function EditReorderLevel({ reorderLevel, products, sections, flash }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        item_code: reorderLevel.item_code,
        section_code: reorderLevel.section_code,
        reorder_level: reorderLevel.reorder_level.toString(),
    });

    const { auth } = usePage().props as any;
    const company = auth?.user?.company;

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
            title: t('Edit'),
            href: '#',
        },
    ];

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('pos.reorder-levels.update', reorderLevel.id), {
            onSuccess: () => {
                toast.success(t('Reorder level updated successfully'));
            },
        });
    };

    const selectedProduct = products.find(p => p.ItemCode === data.item_code);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Edit Reorder Level')} />

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
                                        {t('Edit Reorder Level')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Update stock monitoring levels for products')}
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
                                        <select
                                            value={data.item_code}
                                            onChange={e => setData('item_code', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition bg-white"
                                            required
                                        >
                                            <option value="">{t('Select a product...')}</option>
                                            {products.map((product) => (
                                                <option key={product.ItemCode} value={product.ItemCode}>
                                                    {product.ItmNm} ({product.ItemCode})
                                                </option>
                                            ))}
                                        </select>
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
                                            <span>{t('Updating...')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{t('Update Reorder Level')}</span>
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