import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    ArrowLeft, 
    Save, 
    Package, 
    Calendar, 
    FileText, 
    AlertTriangle,
    Info,
    Search,
    Clock,
    ShoppingCart,
    Trash2
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useRef } from 'react';

interface Product {
    id: number | string;
    name: string;
    code: string;
    barcode: string;
    category: string;
    unit: string;
    cost_price: number;
    sale_price: number;
    wholesale_price: number;
    purchase_price: number;
    batch_no?: string;
    warranty?: string;
}

interface Section {
    id: number;
    section_code: string;
    name: string;
}

interface Batch {
    batch_no: string;
    available_quantity: number;
    brand: string | null;
    model: string | null;
    warranty: string | null;
    last_date: string;
}

interface Wastage {
    id: number;
    product_id: number;
    product_name?: string;
    category?: string;
    quantity: number;
    unit?: string;
    reason: string;
    wastage_date: string;
    notes: string;
    status: string;
    serial_number: string;
    batch_no: string;
    warranty: string;
    section_id: number;
    cost_price: number;
}

interface EditProps {
    wastage: Wastage;
    products: Product[];
    sections: Section[];
}

export default function WastageEdit({ wastage, products, sections }: EditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Wastage Management'),
            href: '/wastages',
        },
        {
            title: t('Edit Wastage'),
            href: '#',
        },
    ];

    const { data, setData, put, processing, errors } = useForm({
        product_id: wastage.product_id,
        quantity: wastage.quantity,
        reason: wastage.reason,
        wastage_date: wastage.wastage_date ? wastage.wastage_date.split('T')[0] : '',
        notes: wastage.notes || '',
        status: wastage.status || 'approved',
        serial_number: wastage.serial_number || '',
        batch_no: wastage.batch_no || '',
        warranty: wastage.warranty || '',
        section_id: wastage.section_id,
        cost_price: Number(wastage.cost_price) || 0,
    });

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(
        products.find(p => p.id === wastage.product_id) || null
    );
    const [searchTerm, setSearchTerm] = useState(selectedProduct?.name || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
    const batchDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (batchDropdownRef.current && !batchDropdownRef.current.contains(event.target as Node)) {
                setIsBatchDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch batches when product or section changes
    useEffect(() => {
        if (data.product_id && data.section_id) {
            fetchBatches();
        } else {
            setBatches([]);
        }
    }, [data.product_id, data.section_id]);

    const fetchBatches = async () => {
        try {
            const section = sections.find(s => s.id === data.section_id);
            const sectionCode = section ? section.section_code : '';
            const response = await fetch(
                `/wastages/product-batches?product_id=${data.product_id}&section_code=${sectionCode}`
            );
            const batchData = await response.json();
            setBatches(batchData);
            
            // Set current batch as selected if it exists in the fetched batches
            const currentBatch = batchData.find((b: Batch) => b.batch_no === (selectedBatch?.batch_no || wastage.batch_no));
            if (currentBatch) {
                setSelectedBatch(currentBatch);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            setBatches([]);
        }
    };

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setIsDropdownOpen(false);
        setData(prev => ({
            ...prev,
            product_id: Number(product.id),
            batch_no: '',
            serial_number: '',
            cost_price: product.cost_price,
        }));
        setSelectedBatch(null);
    };

    const handleBatchSelect = (batch: Batch) => {
        setSelectedBatch(batch);
        setIsBatchDropdownOpen(false);
        setData(prev => ({
            ...prev,
            batch_no: batch.batch_no,
            warranty: batch.warranty || '',
        }));
    };

    const handleSearchChange = async (value: string) => {
        setSearchTerm(value);

        if (!value || value.length < 2) {
            setSearchResults([]);
            setIsDropdownOpen(false);
            return;
        }

        setIsSearching(true);
        setIsDropdownOpen(true);

        try {
            const response = await fetch(
                `/wastages/unified-search?term=${encodeURIComponent(value)}`
            );
            const results = await response.json();
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        put(route('wastages.update', wastage.id));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Edit Wastage')} #${wastage.id}`} />

            <div className="min-h-screen bg-slate-50 pb-12">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-6">
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/wastages"
                                    className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-all duration-200 text-white"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <div>
                                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                        {t('Edit Wastage')} 
                                        <span className="text-white/60 text-lg font-medium">#{wastage.id}</span>
                                    </h1>
                                    <p className="text-sm text-white/80 mt-1">{t('Update wastage details with live preview')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Settings & Product Selection */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
                                    <Package className="w-4 h-4 text-vismass-blue" />
                                    {t('Global Settings')}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-medium">{t('Section')} *</Label>
                                        <Select
                                            value={String(data.section_id)}
                                            onValueChange={(value) => setData('section_id', Number(value))}
                                        >
                                            <SelectTrigger className="rounded-xl border-slate-200 h-11">
                                                <SelectValue placeholder={t('Select Section')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map((section) => (
                                                    <SelectItem key={section.id} value={String(section.id)}>
                                                        {section.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.section_id && <p className="text-red-500 text-xs">{errors.section_id}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-medium">{t('Wastage Date')} *</Label>
                                        <Input
                                            type="date"
                                            value={data.wastage_date}
                                            onChange={(e) => setData('wastage_date', e.target.value)}
                                            className="rounded-xl border-slate-200 h-11"
                                        />
                                        {errors.wastage_date && <p className="text-red-500 text-xs">{errors.wastage_date}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative" ref={dropdownRef}>
                                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
                                    <Search className="w-4 h-4 text-vismass-blue" />
                                    {t('Product Search')}
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-medium">{t('Search Product')}</Label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                onFocus={() => setIsDropdownOpen(true)}
                                                className="rounded-xl border-slate-200 h-12 pl-4"
                                                placeholder={t('Search by Name, Code, Barcode...')}
                                            />
                                            {isDropdownOpen && (
                                                <div className="absolute z-50 mt-2 w-full rounded-xl bg-white shadow-2xl border border-slate-200 max-h-64 overflow-y-auto">
                                                    {isSearching ? (
                                                        <div className="px-4 py-6 text-center text-slate-500 flex flex-col items-center gap-2">
                                                            <Clock className="w-5 h-5 animate-spin text-vismass-blue" />
                                                            <span>{t('Searching...')}</span>
                                                        </div>
                                                    ) : searchResults.length > 0 ? (
                                                        searchResults.map((product) => (
                                                            <div
                                                                key={product.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleProductSelect(product);
                                                                }}
                                                                className="px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                                                            >
                                                                <p className="font-bold text-slate-900 text-sm">{product.name}</p>
                                                                <p className="text-xs text-slate-500">{product.code} | {product.barcode}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        searchTerm.length > 1 && (
                                                            <div className="px-4 py-6 text-center text-slate-500 text-sm italic">{t('No products found.')}</div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {batches.length > 0 && (
                                        <div className="space-y-2 relative" ref={batchDropdownRef}>
                                            <Label className="text-slate-700 font-medium">{t('Batch Selection')} *</Label>
                                            <button
                                                type="button"
                                                onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                                                className="w-full rounded-xl border border-slate-200 h-12 px-4 text-left bg-white flex items-center justify-between"
                                            >
                                                <span className={selectedBatch ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                                                    {selectedBatch 
                                                        ? `${selectedBatch.batch_no} (${t('Available')}: ${selectedBatch.available_quantity})` 
                                                        : t('Select a batch...')}
                                                </span>
                                                <Package className="w-5 h-5 text-slate-400" />
                                            </button>
                                            {isBatchDropdownOpen && (
                                                <div className="absolute z-50 mt-2 w-full rounded-xl bg-white shadow-2xl border border-slate-200 max-h-64 overflow-y-auto">
                                                    {batches.map((batch, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleBatchSelect(batch)}
                                                            className="px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <p className="font-bold text-slate-900 text-sm">{batch.batch_no}</p>
                                                                <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-800 rounded-lg">
                                                                    {batch.available_quantity} {selectedProduct?.unit}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details & Notes */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-6">
                                    <FileText className="w-4 h-4 text-vismass-blue" />
                                    {t('Wastage Details')}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-medium">{t('Quantity')} *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={data.quantity}
                                            onChange={(e) => setData('quantity', Number(e.target.value))}
                                            className="rounded-xl border-slate-200 h-11"
                                        />
                                        {errors.quantity && <p className="text-red-500 text-xs">{errors.quantity}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-medium">{t('Reason')} *</Label>
                                        <Select
                                            value={data.reason}
                                            onValueChange={(value) => setData('reason', value)}
                                        >
                                            <SelectTrigger className="rounded-xl border-slate-200 h-11">
                                                <SelectValue placeholder={t('Select Reason')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="expired">{t('Expired')}</SelectItem>
                                                <SelectItem value="damaged">{t('Damaged')}</SelectItem>
                                                <SelectItem value="quality_issue">{t('Quality Issue')}</SelectItem>
                                                <SelectItem value="contaminated">{t('Contaminated')}</SelectItem>
                                                <SelectItem value="returned">{t('Return')}</SelectItem>
                                                <SelectItem value="obsolete">{t('Obsolete')}</SelectItem>
                                                <SelectItem value="other">{t('Other')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.reason && <p className="text-red-500 text-xs">{errors.reason}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">{t('Additional Notes')}</Label>
                                    <Textarea
                                        rows={3}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder={t('Enter notes...')}
                                        className="rounded-xl border-slate-200 italic"
                                    />
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex items-start gap-4">
                                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">{t('Stock Impact')}</h4>
                                    <p className="text-xs text-amber-700 mt-1">{t('Saving these changes will adjust the stock levels in the system immediately based on the status below.')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Added Items List (Replicated from Create Page) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                        <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                    <ShoppingCart className="w-5 h-5 text-vismass-blue" />
                                </div>
                                {t('Current Record to Update')}
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{t('Final Status')}:</span>
                                <div className="w-40">
                                    <Select
                                        value={data.status}
                                        onValueChange={(value) => setData('status', value)}
                                    >
                                        <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="approved">{t('Approved')}</SelectItem>
                                            <SelectItem value="rejected">{t('Rejected')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto p-4">
                            <table className="min-w-full divide-y divide-slate-200 border border-slate-100 rounded-xl overflow-hidden">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Product')}</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Batch No.')}</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Quantity')}</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Cost')}</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Total')}</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Reason')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    <tr className="bg-blue-50/30">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-900">{selectedProduct?.name || wastage.product_name}</p>
                                            <p className="text-xs text-slate-500">{selectedProduct?.code || '-'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs px-2 py-1 bg-white border border-slate-200 rounded text-slate-600">
                                                {data.batch_no || wastage.batch_no || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                                {data.quantity} {selectedProduct?.unit || wastage.unit}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-600 font-medium">
                                            {Number(data.cost_price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                                            {(Number(data.cost_price) * Number(data.quantity)).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-semibold capitalize px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
                                                {data.reason.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot className="bg-slate-50/50">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">{t('Grand Total Value')}:</td>
                                        <td className="px-6 py-4 text-right text-base font-black text-red-600">
                                            {(Number(data.cost_price) * Number(data.quantity)).toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/wastages"
                                    className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    {t('Discard Changes')}
                                </Link>
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={processing}
                                    className="bg-vismass-blue hover:bg-vismass-blue/90 text-white px-10 py-3 rounded-xl shadow-lg font-bold transition-all duration-200 active:scale-95"
                                >
                                    {processing ? (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-5 h-5 animate-spin" />
                                            <span>{t('Updating...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Save className="w-5 h-5" />
                                            <span>{t('Confirm & Update Record')}</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
