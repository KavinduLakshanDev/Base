import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Package, Check, ChevronsUpDown, XCircle, Edit } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface OrderItem {
    product_id: number;
    product_name: string;
    qty: number;
    unit_price: number;
    tax_rate: number;
}

export default function Create({ suppliers, products, companies, branches, nextPoNo }: any) {
    const company = companies[0];
    const vatRate = company?.vat_rate || 0;

    const { data, setData, post, processing, errors } = useForm({
        company_id: companies[0]?.id || '',
        branch_id: branches[0]?.id || '',
        supplier_code: '',
        po_date: new Date().toISOString().split('T')[0],
        description: '',
        item_type: 'product',
        items: [] as OrderItem[],
    });

    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [open, setOpen] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Derived totals - computed on every render from state array
    const totals = useMemo(() => {
        const subtotal = data.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        const taxAmount = subtotal * vatRate / 100;
        const grandTotal = subtotal + taxAmount;
        return { subtotal, taxAmount, grandTotal };
    }, [data.items, vatRate]);

    const addItem = () => {
        if (!selectedProduct || !qty) return;
        const product = products.find((p: any) => p.ItmKy.toString() === selectedProduct);
        if (!product) return;

        const newItem: OrderItem = {
            product_id: product.ItmKy,
            product_name: product.ItmNm,
            qty: parseFloat(qty) || 1,
            unit_price: parseFloat(unitPrice) || 0,
            tax_rate: 0,
        };

        setData(data => ({
            ...data,
            items: [...data.items, newItem]
        }));

        setSelectedProduct('');
        setQty('');
        setUnitPrice('');
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/pos/purchase-orders');
    };

    return (
        <AppSidebarLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Purchase Orders', href: '/pos/purchase-orders' },
            { title: 'Create', href: '#' }
        ]}>
            <div className="min-h-screen bg-slate-50">
                <Head title="Create Purchase Order" />

                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/pos/purchase-orders"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Create New Purchase Order (PO-{nextPoNo.toString().padStart(6, '0')})
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Create a new purchase order to request items
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                    <Package className="w-5 h-5 text-vismass-blue" />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800">Order Information</h2>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Item Type</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={data.item_type}
                                        onChange={e => {
                                            setData('item_type', e.target.value);
                                            setData('items', []);
                                            setSelectedProduct('');
                                        }}
                                        disabled={data.items.length > 0}
                                    >
                                        <option value="product">Product</option>
                                        <option value="printer">Printer</option>
                                    </select>
                                    {data.items.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground mt-1">Remove all items to change type</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Supplier</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                                        value={data.supplier_code}
                                        onChange={e => setData('supplier_code', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map((s: any) => (
                                            <option key={s.AdrCd} value={s.AdrCd}>{s.AccNm}</option>
                                        ))}
                                    </select>
                                    {errors.supplier_code && <div className="text-sm text-destructive">{errors.supplier_code}</div>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" value={data.po_date} onChange={e => setData('po_date', e.target.value)} required />
                                </div>
                                <div className="space-y-2 sm:col-span-3 lg:col-span-3">
                                    <Label>Description / Comments</Label>
                                    <Textarea
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        placeholder="Optional description or comments..."
                                        className="min-h-[120px]"
                                    />
                                </div>
                            </div>
                        </div>
                        <form onSubmit={submit} className="space-y-8">
                            <div className="pt-6 border-t border-slate-200">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Package className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">Order Items</h2>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-12 items-end">
                                    <div className="space-y-4 sm:col-span-6">
                                        <Label>Product</Label>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between font-normal border-input bg-transparent shadow-sm"
                                                >
                                                    {selectedProduct
                                                        ? (() => {
                                                            const product = products.find((p: any) => p.ItmKy.toString() === selectedProduct);
                                                            return product ? `${product.ItemCode} - ${product.ItmNm}` : 'Select Item';
                                                        })()
                                                        : 'Select Item'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>

                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                <Command>
                                                    <CommandInput
                                                        placeholder="Search by name, code, or barcode..."
                                                        value={itemSearch}
                                                        onValueChange={setItemSearch}
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>No product found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {products
                                                                .filter((p: any) => (p.item_type || 'product') === data.item_type)
                                                                .filter((item: any) => {
                                                                    if (!itemSearch) return true;
                                                                    const term = itemSearch.toLowerCase();
                                                                    return (
                                                                        (item.ItmNm && item.ItmNm.toLowerCase().includes(term)) ||
                                                                        (item.ItemCode && item.ItemCode.toLowerCase().includes(term)) ||
                                                                        (item.barcode && item.barcode.toLowerCase().includes(term))
                                                                    );
                                                                })
                                                                .map((p: any) => (
                                                                    <CommandItem
                                                                        key={p.ItmKy}
                                                                        value={`${p.ItemCode} ${p.ItmNm} ${p.barcode || ''}`}
                                                                        onSelect={() => {
                                                                            setSelectedProduct(p.ItmKy.toString());
                                                                            setUnitPrice(Number(p.CosPri || 0).toFixed(2));
                                                                            setOpen(false);
                                                                            setItemSearch('');
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedProduct === p.ItmKy.toString() ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {p.ItemCode} - {p.ItmNm}
                                                                    </CommandItem>
                                                                ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>Quantity</Label>
                                        <Input type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label>Unit Price (Rs.)</Label>
                                        <Input type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} onBlur={e => e.target.value && setUnitPrice(Number(e.target.value).toFixed(2))} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Button type="button" onClick={addItem} variant="secondary" className="w-full">Add Item</Button>
                                    </div>
                                </div>

                                {data.items.length > 0 && (
                                    <div className="mt-6">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs uppercase bg-slate-700 text-white">
                                                <tr>
                                                    <th className="px-4 py-3">#</th>
                                                    <th className="px-4 py-3">Item</th>
                                                    <th className="px-4 py-3 text-right">Qty</th>
                                                    <th className="px-4 py-3 text-right">Unit Price</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                    <th className="px-4 py-3 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.items.map((item, i) => {
                                                    const lineTotal = item.qty * item.unit_price;
                                                    return (
                                                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                                            <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                                                            <td className="px-4 py-2 font-medium">{item.product_name}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                {editingIndex === i ? (
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        step="1"
                                                                        value={item.qty}
                                                                        onChange={(e) => {
                                                                            const newItems = [...data.items];
                                                                            newItems[i] = { ...newItems[i], qty: e.target.value as any };
                                                                            setData('items', newItems);
                                                                        }}
                                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                        className="w-20 text-right ml-auto h-8"
                                                                    />
                                                                ) : (
                                                                    Number(item.qty).toFixed(0)
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                {editingIndex === i ? (
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={item.unit_price}
                                                                        onChange={(e) => {
                                                                            const newItems = [...data.items];
                                                                            newItems[i] = { ...newItems[i], unit_price: e.target.value as any };
                                                                            setData('items', newItems);
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            if (e.target.value) {
                                                                                const newItems = [...data.items];
                                                                                newItems[i] = { ...newItems[i], unit_price: Number(e.target.value).toFixed(2) as any };
                                                                                setData('items', newItems);
                                                                            }
                                                                        }}
                                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                        className="w-24 text-right ml-auto h-8"
                                                                    />
                                                                ) : (
                                                                    Number(item.unit_price).toFixed(2)
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-semibold text-slate-800">
                                                                Rs {lineTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-4 py-2 w-[100px] text-center">
                                                                {editingIndex === i ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setEditingIndex(null)}
                                                                    >
                                                                        <Check className="h-4 w-4 text-green-600" />
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setEditingIndex(i)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        if (editingIndex === i) setEditingIndex(null);
                                                                        const newItems = data.items.filter((_, index) => index !== i);
                                                                        setData('items', newItems);
                                                                    }}
                                                                >
                                                                    <XCircle className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Financial Summary - Bottom Right */}
                                        <div className="flex justify-end mt-6">
                                            <div className="w-80">
                                                <table className="w-full text-sm">
                                                    <tbody>
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 px-4 font-medium text-slate-600">SUBTOTAL</td>
                                                            <td className="py-2 px-4 text-right font-semibold text-slate-800">
                                                                {totals.subtotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-b border-slate-200">
                                                            <td className="py-2 px-4 font-medium text-slate-600">TAX RATE {vatRate}%</td>
                                                            <td className="py-2 px-4 text-right font-semibold text-amber-600">
                                                                {totals.taxAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                        <tr className="bg-vismass-blue text-white">
                                                            <td className="py-3 px-4 font-bold text-base">TOTAL</td>
                                                            <td className="py-3 px-4 text-right font-bold text-base">
                                                                {totals.grandTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {errors.items && <div className="text-sm text-destructive mt-2">{errors.items}</div>}
                            </div>

                            <div className="flex justify-end pt-6 border-t border-slate-200">
                                <Button type="submit" disabled={processing || data.items.length === 0} className="bg-vismass-blue hover:bg-vismass-blue/90 text-white">
                                    Save Purchase Order
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}
