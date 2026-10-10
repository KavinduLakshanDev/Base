import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { ArrowLeft, Plus, X, Truck, Package, FileText, Search } from 'lucide-react';
import { format } from 'date-fns';

interface DeliveryOption {
    id: number;
    delivery_number: string;
    delivery_date: string;
    vehicle_id: number | null;
    vehicle?: { id: number; name: string; registration_no: string | null };
}

interface DeliveryItemOption {
    item_ky: string;
    item_code: string;
    item_name: string;
    batch_no: string | null;
    unit_price: number;
    quantity: number;
}

export default function ShopReturnCreate({ shops = [], vehicles = [], sections = [] }: any) {
    const { auth } = usePage().props as any;
    const user = auth?.user || {};
    const { data, setData, post, processing, errors, reset } = useForm({
        shop_id: '',
        delivery_id: '',
        section_code: user.delivery_section_code || '',
        return_date: new Date().toISOString().split('T')[0],
        notes: '',
        refund_method: 'cash',
        refund_amount: 0,
        items: [
            { item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 },
        ],
    });

    const [shopDeliveries, setShopDeliveries] = useState<DeliveryOption[]>([]);
    const [deliveryItems, setDeliveryItems] = useState<DeliveryItemOption[]>([]);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);
    const [paymentSummary, setPaymentSummary] = useState<any>(null);
    const [clientErrors, setClientErrors] = useState<any>({});
    const [shopSearch, setShopSearch] = useState('');

    const totalReturnValue = data.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) * Number(it.unit_price) || 0), 0);

    useEffect(() => {
        setData(d => ({ ...d, refund_amount: totalReturnValue }));
    }, [totalReturnValue]);

    // When shop changes → load deliveries for that shop
    useEffect(() => {
        if (!data.shop_id) {
            setShopDeliveries([]);
            setDeliveryItems([]);
            setPaymentSummary(null);
                setData(d => ({ ...d, delivery_id: '', items: [{ item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 }] }));
            return;
        }

        setLoadingDeliveries(true);
        fetch(`/deliveries/returns/shop-deliveries?shop_id=${data.shop_id}`)
            .then(r => r.json())
            .then(json => {
                setShopDeliveries(json as DeliveryOption[]);
                setDeliveryItems([]);
                setPaymentSummary(null);
                setData(d => ({ ...d, delivery_id: '', items: [{ item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 }] }));
            })
            .catch(console.error)
            .finally(() => setLoadingDeliveries(false));
    }, [data.shop_id]);

    // When delivery changes → auto-fill vehicle + load delivery items
    useEffect(() => {
        if (!data.delivery_id) {
            setDeliveryItems([]);
            setPaymentSummary(null);
            setData(d => ({ ...d, items: [{ item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 }] }));
            return;
        }

        // Auto-fill delivery items

        setLoadingItems(true);
        fetch(`/deliveries/returns/delivery-items?delivery_id=${data.delivery_id}`)
            .then(r => r.json())
            .then((json: any) => {
                if (json.payment_summary) {
                    setDeliveryItems(json.items);
                    setPaymentSummary(json.payment_summary);
                } else {
                    setDeliveryItems(json);
                    setPaymentSummary(null);
                }
                setData(d => ({ ...d, items: [{ item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 }] }));
            })
            .catch(console.error)
            .finally(() => setLoadingItems(false));
    }, [data.delivery_id]);

    const addItem = () => {
        setData('items', [...data.items, { item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 }]);
    };

    const removeItem = (i: number) => {
        const items = data.items.filter((_, idx) => idx !== i);
        setData('items', items.length ? items : [{ item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 }]);
    };

    const handleProductSelect = (index: number, uniqueId: string) => {
        if (!uniqueId) {
            const items = [...data.items];
            items[index] = { item_ky: '', item_name: '', batch_no: '', quantity: '1', unit_price: '0', delivered_qty: 0 };
            setData('items', items);
            return;
        }

        const [itemKy, batchNo] = uniqueId.split('::');
        const product = deliveryItems.find(d => String(d.item_ky) === itemKy && (d.batch_no || '') === (batchNo || ''));
        if (!product) return;
        const items = [...data.items];
        items[index] = {
            ...items[index],
            item_ky: product.item_ky,
            item_name: product.item_name,
            batch_no: product.batch_no ?? '',
            unit_price: String(product.unit_price),
            delivered_qty: product.quantity,
        };
        setData('items', items);
    };

    const updateItemField = (index: number, field: string, value: string) => {
        const items = [...data.items];
        (items[index] as any)[field] = value;
        setData('items', items);
    };

    const validate = () => {
        const errs: any = {};
        if (!data.shop_id) errs.shop_id = 'Please select a shop';
        if (!data.delivery_id) errs.delivery_id = 'Please select a delivery';
        
        if (data.delivery_id && !data.section_code) {
            errs.section_code = 'Please select a section to return items to';
        }

        const itemErrs = data.items.map((it: any) => {
            if (!it.item_ky) return 'Please select a product';
            if (!it.batch_no || it.batch_no.trim() === '') return 'Batch number is required';
            if (!it.quantity || Number(it.quantity) <= 0) return 'Quantity must be greater than zero';
            return null;
        });
        if (itemErrs.some((e: any) => e !== null)) errs.items = itemErrs;

        if (data.refund_method === 'cash' && (!data.refund_amount || data.refund_amount < 0)) {
            errs.refund_amount = 'Refund amount is required and cannot be negative';
        }

        setClientErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // ask user to confirm the return
        if (!confirm('Are you sure you want to record this return?')) {
            return;
        }

        post('/deliveries/returns', {
            onSuccess: () => {
                reset();
                router.visit('/deliveries');
            }
        });
    };

    const selectedDelivery = shopDeliveries.find(d => String(d.id) === String(data.delivery_id));

    return (
        <AppLayout breadcrumbs={[{ title: 'Deliveries', href: '/deliveries' }, { title: 'Record Return', href: '/deliveries/returns/create' }]}>
            <Head title="Record Shop Return" />
            <div className="min-h-screen bg-slate-50 pb-20">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow-lg shadow-vismass-blue/10">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/deliveries/returns"
                                    className="rounded-xl bg-white/20 p-2.5 text-white hover:bg-white/30 transition-all backdrop-blur-sm border border-white/10 active:scale-95 shadow-inner"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <div className="rounded-xl bg-white/20 p-3 shadow-inner shadow-white/10 backdrop-blur-sm border border-white/10">
                                    <Truck className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white tracking-tight">Record Shop Return</h1>
                                    <p className="text-sm text-white/70">Return items from a shop back to vehicle or main stock</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8">
                    <form onSubmit={submit}>
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="relative">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Shop *</label>
                                            <div className="relative">
                                                {data.shop_id ? (
                                                    <div className="flex items-center justify-between block w-full rounded-2xl border border-slate-200 bg-slate-50/30 px-4 py-3 text-sm shadow-sm font-medium">
                                                        <span className="text-slate-800">{shops.find((s: any) => String(s.id) === String(data.shop_id))?.name}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setData('shop_id', ''); setShopSearch(''); }} 
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search and select a shop..."
                                                            value={shopSearch}
                                                            onChange={(e) => setShopSearch(e.target.value)}
                                                            className="block w-full rounded-2xl border-slate-200 bg-white pl-11 pr-4 py-3 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-medium"
                                                        />
                                                    </div>
                                                )}
                                                
                                                {!data.shop_id && (
                                                    <div className="absolute z-20 mt-2 w-full max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                                                        {shops.filter((s: any) => s.is_active !== false && s.name.toLowerCase().includes(shopSearch.toLowerCase())).length > 0 ? (
                                                            shops.filter((s: any) => s.is_active !== false && s.name.toLowerCase().includes(shopSearch.toLowerCase())).map((s: any) => (
                                                                <button
                                                                    key={s.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setData('shop_id', String(s.id));
                                                                        setShopSearch('');
                                                                    }}
                                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 flex flex-col gap-0.5"
                                                                >
                                                                    <span className="text-sm font-medium text-slate-700">{s.name} - {s.address}</span>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-4 text-sm text-slate-500 text-center font-medium">No shops found</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <InputError message={errors.shop_id} />
                                        </div>

                                        <div className="relative">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Delivery No *</label>
                                            <select
                                                value={data.delivery_id}
                                                onChange={(e) => setData('delivery_id', e.target.value)}
                                                disabled={!data.shop_id}
                                                className="block w-full rounded-2xl border-slate-200 bg-slate-50/30 px-4 py-3 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-medium disabled:opacity-50"
                                            >
                                                <option value="">{data.shop_id ? 'Select a delivery' : 'First select a shop'}</option>
                                                {shopDeliveries.map((d: DeliveryOption) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.delivery_number} — {format(new Date(d.delivery_date), 'yyyy-MM-dd')}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.delivery_id} />
                                            {paymentSummary && (
                                                <div className="mt-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 text-sm shadow-inner shadow-slate-200/20">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Value</span>
                                                        <span className="font-bold text-slate-700">Rs. {paymentSummary.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Paid</span>
                                                        <span className={`font-bold ${paymentSummary.total_paid < paymentSummary.total_amount ? 'text-amber-600' : 'text-emerald-600'}`}>Rs. {paymentSummary.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    {paymentSummary.methods && paymentSummary.methods.length > 0 && (
                                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200/60">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Methods</span>
                                                            <div className="flex gap-1.5 flex-wrap justify-end">
                                                                {paymentSummary.methods.map((m: string) => (
                                                                    <span key={m} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">{m}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="relative">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Return To Section *</label>
                                            <select
                                                value={data.section_code}
                                                onChange={(e) => setData('section_code', e.target.value)}
                                                disabled={!!user.delivery_section_code}
                                                className="block w-full rounded-2xl border-slate-200 bg-slate-50/30 px-4 py-3 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-medium disabled:opacity-50"
                                            >
                                                <option value="">Select a section</option>
                                                {sections.map((s: any) => (
                                                    <option key={s.id || s.section_code} value={s.section_code}>
                                                        {s.section_name || s.name} ({s.section_code})
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.section_code} />
                                        </div>

                                        <div className="relative">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Return Date *</label>
                                            <input
                                                type="date"
                                                value={data.return_date}
                                                onChange={(e) => setData('return_date', e.target.value)}
                                                className="block w-full rounded-2xl border-slate-200 bg-slate-50/30 px-4 py-3 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-medium"
                                            />
                                            <InputError message={errors.return_date} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <div className="h-2 w-2 rounded-full bg-vismass-blue animate-pulse" />
                                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Returned Items</h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            className="inline-flex items-center rounded-xl bg-vismass-blue px-4 py-2 text-xs font-bold text-white shadow-lg shadow-vismass-blue/20 hover:bg-vismass-blue/90 hover:-translate-y-0.5 transition-all active:scale-95 gap-1.5"
                                        >
                                            <Plus className="h-4 w-4" /> Add Item
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {data.items.length === 0 && (
                                            <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50/50">
                                                <Package className="h-10 w-10 text-slate-300 mb-3" />
                                                <p className="text-sm text-slate-400 font-medium italic">Click "Add Item" to start recording returns</p>
                                            </div>
                                        )}
                                        {data.items.map((it: any, idx: number) => (
                                            <div key={idx} className="group relative bg-slate-50/30 rounded-2xl p-5 border border-slate-200 hover:border-vismass-blue/30 transition-all hover:shadow-md hover:shadow-vismass-blue/5">
                                                <div className="grid grid-cols-1 md:grid-cols-13 gap-5 items-end">
                                                    <div className="md:col-span-5">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1">Product *</label>
                                                        <select
                                                            value={it.item_ky ? `${it.item_ky}::${it.batch_no || ''}` : ''}
                                                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                                                            disabled={!data.delivery_id || loadingItems}
                                                            className="block w-full rounded-xl border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 disabled:bg-slate-50 transition-all shadow-sm font-medium"
                                                        >
                                                            <option value="">Select product</option>
                                                            {deliveryItems.map(p => {
                                                                const uniqueId = `${p.item_ky}::${p.batch_no || ''}`;
                                                                const isSelectedElsewhere = data.items.some((otherItem: any, otherIdx: number) => 
                                                                    otherIdx !== idx && String(otherItem.item_ky) === String(p.item_ky) && (otherItem.batch_no || '') === (p.batch_no || '')
                                                                );
                                                                
                                                                return (
                                                                    <option 
                                                                        key={uniqueId} 
                                                                        value={uniqueId}
                                                                        disabled={isSelectedElsewhere}
                                                                    >
                                                                        {p.item_name} {p.item_code ? `(${p.item_code})` : ''}  {isSelectedElsewhere ? '(Already added)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                        <InputError message={clientErrors?.items?.[idx]} />
                                                    </div>

                                                    <div className="md:col-span-3">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1 text-slate-400">Batch</label>
                                                        <input
                                                            type="text"
                                                            value={it.batch_no || ''}
                                                            onChange={(e) => updateItemField(idx, 'batch_no', e.target.value)}
                                                            readOnly={!!it.item_ky && !!it.batch_no}
                                                            className="block w-full rounded-xl border-slate-200 bg-slate-100/50 px-3 py-2.5 text-sm text-slate-500 focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 read-only:bg-slate-100/80 transition-all shadow-sm font-mono"
                                                            placeholder="—"
                                                        />
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1 text-slate-400">Unit Price</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Rs.</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={it.unit_price}
                                                                readOnly
                                                                // onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                // onChange={(e) => updateItemField(idx, 'unit_price', e.target.value)}
                                                                className="block w-full rounded-xl border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-bold text-slate-600 bg-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1 flex items-center justify-between">
                                                            <span>Qty *</span>
                                                            {it.delivered_qty > 0 && (
                                                                <span className="text-[9px] text-vismass-blue font-bold uppercase bg-vismass-blue/10 px-2 py-0.5 rounded-full">max {it.delivered_qty}</span>
                                                            )}
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            min="1"
                                                            max={it.delivered_qty > 0 ? it.delivered_qty : undefined}
                                                            value={it.quantity}
                                                            // onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            onChange={(e) => updateItemField(idx, 'quantity', e.target.value)}
                                                            className={`block w-full rounded-xl px-3 py-2.5 text-sm focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-black bg-white ${it.delivered_qty > 0 && Number(it.quantity) > it.delivered_qty ? 'border-red-300 bg-red-50 text-red-600 focus:border-red-400' : 'border-slate-200 focus:border-vismass-blue'}`}
                                                        />
                                                    </div>

                                                    <div className="md:col-span-1 flex justify-center pb-1">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeItem(idx)} 
                                                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90 border border-red-100 shadow-sm"
                                                            title="Remove item"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                        placeholder="Any additional information about this return..."
                                        className="block w-full rounded-2xl border-slate-200 bg-slate-50/30 px-4 py-3 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-medium resize-none"
                                    />
                                    <InputError message={errors.notes} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-2">
                                            Refund Method *
                                        </label>
                                        <select
                                            value={data.refund_method}
                                            onChange={(e) => setData('refund_method', e.target.value)}
                                            className="block w-full rounded-2xl border-slate-200 bg-slate-50/30 px-4 py-3 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-medium"
                                        >
                                            <option value="cash">Cash Refund</option>
                                            <option value="credit_note">Account Credit (Credit Note)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1 flex items-center gap-2">
                                            Refund Amount *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">Rs.</span>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                value={data.refund_amount}
                                                onChange={(e) => setData('refund_amount', Number(e.target.value))}
                                                className="block w-full rounded-2xl border-slate-200 bg-slate-50/30 pl-12 pr-4 py-3 text-sm focus:border-vismass-blue focus:ring-4 focus:ring-vismass-blue/5 transition-all shadow-sm font-medium"
                                            />
                                        </div>
                                        <InputError message={errors.refund_amount || clientErrors.refund_amount} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total Returned</span>
                                    <span className="text-xl font-black text-slate-800">
                                        Rs. {totalReturnValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex gap-4">
                                    <Link
                                        href="/deliveries/returns"
                                        className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-3 text-sm font-bold text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-100 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing || data.items.length === 0}
                                        className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-vismass-blue to-blue-600 px-10 py-3 text-sm font-bold text-white shadow-xl shadow-vismass-blue/20 hover:shadow-vismass-blue/30 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:translate-y-0 disabled:shadow-none"
                                    >
                                        {processing ? (
                                            <span className="flex items-center gap-2">
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Recording...
                                            </span>
                                        ) : (
                                            'Record Return'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </AppLayout>
    );
}
