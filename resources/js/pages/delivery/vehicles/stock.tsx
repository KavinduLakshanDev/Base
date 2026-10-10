import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Car, Plus, Package, ArrowLeft, Search, X, ChevronDown, Trash2, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';

interface StockRow {
    id: number;
    item_ky: string;
    item_name: string;
    item_code: string;
    batch_no: string | null;
    quantity: number;
    delivered: number;
    returned: number;
    reserved: number;
    available: number;
    last_date: string | null;
}

export default function VehicleStock({
    vehicle,
    stocks,
    sections,
}: {
    vehicle: any;
    stocks: StockRow[];
    sections: any[];
}) {
    // Prioritize Delivery section, but allow all sections
    const deliverySection = sections.find(s => s.name === 'Delivery');
    const defaultSection = deliverySection || sections[0];

    const { data, setData, post, processing, errors, reset } = useForm({
        section_code: defaultSection?.section_code ?? '',
        section_id: defaultSection?.id ? String(defaultSection.id) : '',
        item_ky: '',
        batch_no: '',
        quantity: '',
    });

    // ── product search ──────────────────────────────────────────
    const [productTerm, setProductTerm] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [showProductDrop, setShowProductDrop] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const productRef = useRef<HTMLDivElement>(null);

    // ── batch search ────────────────────────────────────────────
    const [batches, setBatches] = useState<any[]>([]);
    const [showBatchDrop, setShowBatchDrop] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const batchRef = useRef<HTMLDivElement>(null);

    // ── history modal ──────────────────────────────────────────
    const [history, setHistory] = useState<any[]>([]);
    const [selectedHistoryRow, setSelectedHistoryRow] = useState<StockRow | null>(null);
    const [showUnloadModal, setShowUnloadModal] = useState(false);
    const [selectedUnloadRow, setSelectedUnloadRow] = useState<any>(null);
    const [targetSectionCode, setTargetSectionCode] = useState('');
    const [unloadQuantity, setUnloadQuantity] = useState<number | string>('');
    const [showHistory, setShowHistory] = useState(false);
    
    // search filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const openHistory = async (row: StockRow) => {
        setSelectedHistoryRow(row);
        setHistory([]);
        setShowHistory(true);
        try {
            const res = await fetch(`/deliveries/vehicles/${vehicle.id}/stock/${row.item_ky}/${row.batch_no ?? 'null'}/history`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setHistory(json);
        } catch {
            // error
        }
    };


    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (productRef.current && !productRef.current.contains(e.target as Node)) setShowProductDrop(false);
            if (batchRef.current && !batchRef.current.contains(e.target as Node)) setShowBatchDrop(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleProductSearch = (term: string) => {
        setProductTerm(term);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (term.length < 2) { setProductResults([]); setShowProductDrop(false); return; }

        // Don't search if no section is selected
        if (!data.section_id) {
            console.warn('No section selected for product search');
            setProductResults([]);
            setShowProductDrop(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`/deliveries/unified-search?term=${encodeURIComponent(term)}&section_id=${data.section_id}`);
                if (!res.ok) {
                    console.error('Product search failed:', res.statusText);
                    setProductResults([]);
                    return;
                }
                const json = await res.json();
                setProductResults(json);
                setShowProductDrop(true);
            } catch (error) {
                console.error('Product search error:', error);
                setProductResults([]);
            }
        }, 250);
    };

    const selectProduct = async (prod: any) => {
        setSelectedProduct(prod);
        setProductTerm(prod.name);
        setShowProductDrop(false);
        setData('item_ky', String(prod.id));
        setBatches([]);
        setSelectedBatch(null);
        setData('batch_no', '');

        // fetch batches from stock_in_hand
        try {
            const sectionId = data.section_id;
            console.log('Fetching batches for product:', { product_id: prod.id, section_id: sectionId });
            const res = await fetch(`/deliveries/product-batches?product_id=${prod.id}&section_id=${sectionId}`);
            if (!res.ok) {
                console.error('Batch fetch failed:', res.statusText);
                return;
            }
            const json = await res.json();
            console.log('Batches received:', json);
            setBatches(json);
        } catch (error) {
            console.error('Batch fetch error:', error);
        }
    };

    const selectBatch = (b: any) => {
        setSelectedBatch(b);
        setData('batch_no', b.batch_no ?? 'N/A');
        setShowBatchDrop(false);
    };

    const handleSectionChange = async (sectionId: string) => {
        const section = sections.find(s => String(s.id) === sectionId);
        console.log('Section changed:', { sectionId, section });
        setData({ ...data, section_id: sectionId, section_code: section?.section_code ?? '', batch_no: '' });
        setSelectedBatch(null);
        setBatches([]);

        if (data.item_ky && section) {
            try {
                console.log('Refetching batches for new section:', { product_id: data.item_ky, section_id: sectionId });
                const res = await fetch(`/deliveries/product-batches?product_id=${data.item_ky}&section_id=${sectionId}`);
                if (!res.ok) {
                    console.error('Batch refetch failed:', res.statusText);
                    return;
                }
                const json = await res.json();
                console.log('Batches refetched:', json);
                setBatches(json);
            } catch (error) {
                console.error('Batch refetch error:', error);
            }
        }
    };

    const clearProduct = () => {
        setSelectedProduct(null);
        setProductTerm('');
        setData({ ...data, item_ky: '', batch_no: '' });
        setSelectedBatch(null);
        setBatches([]);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/deliveries/vehicles/${vehicle.id}/load`, {
            onSuccess: () => {
                reset('item_ky', 'batch_no', 'quantity');
                setSelectedProduct(null);
                setProductTerm('');
                setSelectedBatch(null);
                setBatches([]);
                router.reload({ only: ['stocks'] });
            },
        });
    };

    const filteredStocks = stocks.filter(row => {
        const matchesSearch = row.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              row.item_code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              row.batch_no?.toLowerCase().includes(searchQuery.toLowerCase());
                              
        if (!matchesSearch) return false;
        
        if (statusFilter === 'available') return row.available > 0;
        if (statusFilter === 'sold') return row.available <= 0;
        
        return true;
    });

    const totalAvailable = filteredStocks.reduce((s, r) => s + r.available, 0);
    const totalLoaded = filteredStocks.reduce((s, r) => s + r.quantity, 0);
    const totalDelivered = filteredStocks.reduce((s, r) => s + r.delivered, 0);
    const totalReturned = filteredStocks.reduce((s, r) => s + r.returned, 0);

    const handleDelete = (row: any) => {
        setSelectedUnloadRow(row);
        setTargetSectionCode(sections[0]?.section_code || '');
        setUnloadQuantity(row.available);
        setShowUnloadModal(true);
    };

    const confirmUnload = () => {
        if (!selectedUnloadRow || !targetSectionCode || !unloadQuantity) return;

        const qtyToUnload = Number(unloadQuantity);
        if (qtyToUnload <= 0 || qtyToUnload > selectedUnloadRow.available) return;

        router.post(`/deliveries/vehicles/${vehicle.id}/unload`, {
            item_ky: selectedUnloadRow.item_ky,
            batch_no: selectedUnloadRow.batch_no,
            quantity: qtyToUnload,
            section_code: targetSectionCode
        }, {
            onSuccess: () => {
                setShowUnloadModal(false);
                setSelectedUnloadRow(null);
                setUnloadQuantity('');
                router.reload({ only: ['stocks'] });
            }
        });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Vehicles', href: '/deliveries/vehicles' },
            { title: vehicle.name, href: `/deliveries/vehicles/${vehicle.id}/edit` },
            { title: 'Stock', href: `/deliveries/vehicles/${vehicle.id}/stock` },
        ]}>
            <Head title={`${vehicle.name} — Stock`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link href="/deliveries/vehicles" className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition">
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Car className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{vehicle.name} — Stock</h1>
                                    <p className="text-xs text-white/80">
                                        {filteredStocks.length} product{filteredStocks.length !== 1 ? 's' : ''} loaded
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
                                    <p className="text-xs text-white/70">Total Delivered</p>
                                    <p className="text-lg font-bold text-white">{totalDelivered.toFixed(2)}</p>
                                </div>
                                <div className="rounded-lg bg-white/10 px-4 py-2 text-center">
                                    <p className="text-xs text-white/70">Total Available</p>
                                    <p className="text-lg font-bold text-white">{totalAvailable.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* Load Stock Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                <Plus className="h-4 w-4 text-vismass-blue" />
                            </div>
                            <h2 className="text-base font-semibold text-slate-800">Load Stock into Vehicle</h2>
                        </div>

                        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                            {/* Section */}
                            <div className="space-y-1 lg:col-span-2">
                                <label className="text-xs font-medium text-slate-600">Source Section *</label>
                                <select
                                    value={data.section_id}
                                    onChange={e => handleSectionChange(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                >
                                    {sections.length === 0 ? (
                                        <option value="">No sections available</option>
                                    ) : (
                                        sections.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))
                                    )}
                                </select>
                                <InputError message={errors.section_id} />
                            </div>

                            {/* Product search */}
                            <div className="space-y-1 relative lg:col-span-4" ref={productRef}>
                                <label className="text-xs font-medium text-slate-600">Product *</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={productTerm}
                                        onChange={e => handleProductSearch(e.target.value)}
                                        onFocus={() => productResults.length && setShowProductDrop(true)}
                                        placeholder={!data.section_id ? "Select section first..." : "Search product..."}
                                        disabled={!data.section_id}
                                        className="w-full rounded-lg border border-slate-300 pl-8 pr-8 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                                    />
                                    {selectedProduct && (
                                        <button type="button" onClick={clearProduct} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                {showProductDrop && productResults.length > 0 && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {productResults.map((p: any) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => selectProduct(p)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                            >
                                                <span className="font-medium text-slate-800">{p.name}</span>
                                                {p.code && <span className="ml-2 text-xs text-slate-400">{p.code}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <InputError message={errors.item_ky} />
                            </div>

                            {/* Batch */}
                            <div className="space-y-1 relative lg:col-span-3" ref={batchRef}>
                                <label className="text-xs font-medium text-slate-600">Batch</label>
                                <button
                                    type="button"
                                    onClick={() => batches.length && setShowBatchDrop(v => !v)}
                                    disabled={!selectedProduct}
                                    className="w-full flex items-center justify-between rounded-lg border border-slate-300 px-3 py-2 text-sm text-left disabled:opacity-50 disabled:cursor-not-allowed focus:border-vismass-blue focus:outline-none"
                                >
                                    <span className={selectedBatch ? 'text-slate-800' : 'text-slate-400'}>
                                        {selectedBatch
                                            ? `${selectedBatch.batch_no ?? 'N/A'} (${selectedBatch.available_quantity})`
                                            : batches.length === 0 ? 'Select product first' : 'Select batch'
                                        }
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                </button>
                                {showBatchDrop && batches.length > 0 && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {batches.map((b: any, i: number) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => selectBatch(b)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                            >
                                                <span className="font-medium">{b.batch_no ?? 'N/A'}</span>
                                                <span className="ml-2 text-xs text-green-600 font-medium">Avail: {b.available_quantity}</span>
                                                {b.brand && <span className="ml-2 text-xs text-slate-400">{b.brand}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <InputError message={errors.batch_no} />
                            </div>

                            {/* Quantity */}
                            <div className="space-y-1 lg:col-span-1">
                                <label className="text-xs font-medium text-slate-600">Quantity *</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    max={selectedBatch?.available_quantity} // restrict max value
                                    step="0.001"
                                    value={data.quantity}
                                    onChange={e => {
                                        const val = e.target.value;
                                        // prevent typing more than available
                                        if (selectedBatch && parseFloat(val) > selectedBatch.available_quantity) {
                                            return;
                                        }
                                        setData('quantity', val);
                                    }}
                                    placeholder="0.00"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                />
                                <InputError message={errors.quantity} />
                            </div>

                            {/* Submit */}
                            <div className="lg:col-span-2">
                                <button
                                    type="submit"
                                    disabled={processing || !data.item_ky || !data.quantity}
                                    className="w-auto px-10 rounded-lg bg-vismass-blue py-2 text-sm font-semibold text-white shadow hover:bg-vismass-blue/90 disabled:opacity-50 transition"
                                >
                                    {processing ? 'Loading...' : 'Load Stock'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Current Stock Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-2 p-5 border-b border-slate-100 flex-wrap">
                            <Package className="h-4 w-4 text-vismass-blue" />
                            <h2 className="text-base font-semibold text-slate-800">Current Vehicle Stock</h2>
                            <div className="ml-auto flex items-center gap-3">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="py-1.5 pl-3 pr-8 text-sm border border-slate-200 bg-slate-50 rounded-lg focus:border-vismass-blue focus:bg-white focus:ring-2 focus:ring-vismass-blue/20 transition-all font-medium text-slate-600"
                                >
                                    <option value="all">All Items</option>
                                    <option value="available">Available</option>
                                    <option value="sold">Sold Out</option>
                                </select>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search stock..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 bg-slate-50 rounded-lg focus:border-vismass-blue focus:bg-white focus:ring-2 focus:ring-vismass-blue/20 w-64 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50/50 border-b border-slate-100">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Items Loaded</span>
                                <span className="text-2xl font-black text-slate-800">{filteredStocks.length}</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Loaded Qty</span>
                                <span className="text-2xl font-black text-slate-800">{totalLoaded.toFixed(2)}</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-500"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Available Stock</span>
                                <span className="text-2xl font-black text-green-600">{totalAvailable.toFixed(2)}</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Delivered</span>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-black text-vismass-blue">{totalDelivered.toFixed(2)}</span>
                                    {totalReturned > 0 && (
                                        <span className="text-xs font-bold text-orange-500 mb-1">({totalReturned.toFixed(0)} Ret)</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {filteredStocks.length === 0 ? (
                            <div className="p-12 text-center">
                                <Package className="mx-auto h-9 w-9 text-slate-300 mb-3" />
                                <p className="text-slate-500 text-sm">{searchQuery ? 'No matching stock found.' : 'No stock loaded into this vehicle yet.'}</p>
                                {!searchQuery && <p className="text-slate-400 text-xs mt-1">Use the form above to load stock.</p>}
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">S.No</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product / Batch</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qty Loaded</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Progress</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Returned</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Stock</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Movement</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredStocks.map((row, index) => (
                                        <tr key={row.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">
                                                {(index + 1).toFixed(0)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-sm">{row.item_name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase">{row.item_code || 'N/A'}</span>
                                                        <span className="text-[10px] font-medium text-slate-400">Batch: {row.batch_no ?? 'Standard'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">
                                                {row.quantity.toFixed(0)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs font-bold text-vismass-blue">{row.delivered.toFixed(0)} Delivered</span>
                                                    <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-vismass-blue transition-all duration-500" 
                                                            style={{ width: `${Math.min(100, (row.delivered / row.quantity) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-orange-500">
                                                {row.returned > 0 ? row.returned.toFixed(0) : <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ring-1 ring-inset ${
                                                    row.available > 0 
                                                        ? 'bg-green-50 text-green-700 ring-green-600/20' 
                                                        : 'bg-red-50 text-red-700 ring-red-600/20'
                                                }`}>
                                                    {row.available.toFixed(0)} Available
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-xs font-medium text-slate-500">
                                                    {row.last_date ? new Date(row.last_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openHistory(row)}
                                                        className="p-2 text-slate-400 hover:text-vismass-blue hover:bg-vismass-blue/10 rounded-lg transition"
                                                        title="Inventory Logs"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(row)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Unload Item"
                                                        disabled={row.available <= 0}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div >

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Delivery History</h3>
                                <p className="text-sm text-slate-500">
                                    {selectedHistoryRow?.item_name}
                                    {selectedHistoryRow?.batch_no && <span className="ml-2 px-2 py-0.5 bg-slate-200 rounded text-slate-600 text-xs">{selectedHistoryRow.batch_no}</span>}
                                </p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-0 overflow-y-auto max-h-[60vh]">
                            {history.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <p>No delivery history found for this item.</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Delivery #</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Shop / Customer</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Qty</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {history.map((h, i) => (
                                            <tr key={h.id || i} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm text-slate-600">{h.date}</td>
                                                <td className="px-4 py-3 text-sm text-slate-800 font-medium">{h.delivery_number}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{h.customer}</td>
                                                <td className="px-4 py-3 text-right text-sm text-slate-800 font-bold">{h.quantity.toFixed()}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full items-center gap-1
                                                        ${h.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                            h.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {h.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setShowHistory(false)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Unload Modal */}
            {showUnloadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-red-50 rounded-xl">
                                    <Trash2 className="h-6 w-6 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Return Stock to Warehouse</h3>
                                    <p className="text-xs text-slate-500">Returning {selectedUnloadRow?.item_name} (Max: {selectedUnloadRow?.available})</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs font-medium text-amber-800 leading-relaxed">
                                        Select the warehouse section and quantity to return.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Destination Section</label>
                                    <select
                                        value={targetSectionCode}
                                        onChange={e => setTargetSectionCode(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-vismass-blue"
                                    >
                                        {sections.map((s: any) => (
                                            <option key={s.id} value={s.section_code}>{s.name} ({s.section_code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantity to Return</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedUnloadRow?.available}
                                        step="1"
                                        value={unloadQuantity}
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (selectedUnloadRow && parseFloat(val) > selectedUnloadRow.available) return;
                                            setUnloadQuantity(val);
                                        }}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-vismass-blue"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowUnloadModal(false)}
                                className="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmUnload}
                                disabled={!unloadQuantity || Number(unloadQuantity) <= 0 || Number(unloadQuantity) > (selectedUnloadRow?.available || 0)}
                                className="px-8 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-bold text-white uppercase tracking-widest shadow-lg shadow-red-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Unload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout >
    );
}
