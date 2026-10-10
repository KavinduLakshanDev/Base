import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRightLeft, Building2, Calendar, Check, ChevronsUpDown, Loader, MapPin, Package, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';

// ── date helpers ────────────────────────────────────────────────────────────

const formatDateForDisplay = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const parseDateFromDisplay = (d: string) => {
    if (!d) return '';
    const parts = d.split('/');
    if (parts.length !== 3) return d;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// ── types ───────────────────────────────────────────────────────────────────

interface Section {
    section_code: string;
    name: string;
    company_code: string;
}

interface ConvertibleItem {
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    transfer_unit_id: number | null;
    receiving_unit_id: number | null;
    transfer_conversion_factor: number;
    from_unit_name: string | null;
    to_unit_name: string | null;
}

interface StockBatch {
    id: number;
    batch_no: string | null;
    quantity: number;
    date: string;
}

interface Props {
    items: ConvertibleItem[];
    sections: Section[];
    initial?: {
        section_code?: string;
        item_id?: string;
        to_item_id?: string;
        input_quantity?: string;
        reverse?: boolean | string | number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    { title: t('Stock Conversions'), href: '/stock-conversions' },
    { title: t('New Conversion'), href: '#' },
];

export default function Create({ items = [], sections = [], initial = {} }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const pageErrors = usePage().props.errors as Record<string, string>;

    const { data, setData, post, processing, errors } = useForm({
        section_code: initial.section_code || '',
        item_id: initial.item_id || '',
        to_item_id: initial.to_item_id || '',
        stock_id: '' as string,
        input_quantity: initial.input_quantity ? Number(initial.input_quantity).toFixed(2) : '',
        output_quantity: '',
        to_batch_no: '',
        conversion_date: today,
        notes: '',
        reverse: initial.reverse ? true : false,
    });

    const [dateDisplay, setDateDisplay] = useState(formatDateForDisplay(today));
    const [itemOpen, setItemOpen] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [toItemOpen, setToItemOpen] = useState(false);
    const [toItemSearch, setToItemSearch] = useState('');
    const [batches, setBatches] = useState<StockBatch[]>([]);
    const [toBatches, setToBatches] = useState<StockBatch[]>([]);
    const [availableStock, setAvailableStock] = useState<number | null>(null);
    const [stockLoading, setStockLoading] = useState(false);

    // ── derived selected objects ─────────────────────────────────────────────
    const selectedItem = items.find((it) => it.ItmKy === data.item_id) ?? null;
    const selectedToItem = items.find((it) => it.ItmKy === data.to_item_id) ?? null;

    const inputUnitName = selectedItem ? selectedItem.from_unit_name : '';
    const outputUnitName = selectedToItem ? selectedToItem.from_unit_name : '';

    const displayFactor = (() => {
        const inQty = parseFloat(data.input_quantity);
        const outQty = parseFloat(data.output_quantity);
        if (isNaN(inQty) || isNaN(outQty) || inQty === 0) return null;
        return outQty / inQty;
    })();

    const outputQty = data.output_quantity ? parseFloat(data.output_quantity) : null;

    // ── fetch batches whenever item, section, or reverse direction changes ──────
    useEffect(() => {
        if (!data.item_id || !data.section_code) {
            setBatches([]);
            setAvailableStock(null);
            setData('stock_id', '');
            return;
        }

        // Reset selected batch when direction changes — available quantity per batch differs
        setData('stock_id', '');
        setStockLoading(true);
        fetch(
            `/stock-conversions/get-item-stock?item_id=${data.item_id}&section_code=${data.section_code}&reverse=0`,
            { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
        )
            .then((r) => r.json())
            .then((json) => {
                const newBatches: StockBatch[] = json.batches ?? [];
                setBatches(newBatches);
                // if a batch already selected, limit availableStock accordingly
                if (data.stock_id && newBatches.length > 0) {
                    const found = newBatches.find((b) => String(b.id) === data.stock_id);
                    setAvailableStock(found ? found.quantity : json.stock ?? 0);
                } else {
                    setAvailableStock(json.stock ?? 0);
                }
            })
            .catch(() => {
                setBatches([]);
                setAvailableStock(null);
            })
            .finally(() => setStockLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.item_id, data.section_code]);

    // update availableStock when user picks a batch or clears it
    useEffect(() => {
        if (!data.stock_id) {
            // show total if no specific batch
            const total = batches.reduce((sum, b) => sum + b.quantity, 0);
            setAvailableStock(total || null);
        } else {
            const found = batches.find((b) => String(b.id) === data.stock_id);
            if (found) {
                setAvailableStock(found.quantity);
            }
        }
    }, [data.stock_id, batches]);

    useEffect(() => {
        if (!data.to_item_id || !data.section_code) {
            setToBatches([]);
            return;
        }
        fetch(
            `/stock-conversions/get-item-stock?item_id=${data.to_item_id}&section_code=${data.section_code}&reverse=0`,
            { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
        )
            .then((r) => r.json())
            .then((json) => setToBatches(json.batches ?? []))
            .catch(() => setToBatches([]));
    }, [data.to_item_id, data.section_code]);

    // ── filtered items for combobox ──────────────────────────────────────────
    const filteredItems = itemSearch.length === 0
        ? []
        : items.filter(
              (it) =>
                  it.ItmNm.toLowerCase().includes(itemSearch.toLowerCase()) ||
                  it.ItemCode.toLowerCase().includes(itemSearch.toLowerCase()),
          );

    const filteredToItems = toItemSearch.length === 0
        ? []
        : items.filter(
              (it) =>
                  it.ItmNm.toLowerCase().includes(toItemSearch.toLowerCase()) ||
                  it.ItemCode.toLowerCase().includes(toItemSearch.toLowerCase()),
          );

    // ── submit ───────────────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/stock-conversions');
    };

    // ── date field helper ────────────────────────────────────────────────────
    const handleDateInputChange = (raw: string) => {
        setDateDisplay(raw);
        const parsed = parseDateFromDisplay(raw);
        if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
            setData('conversion_date', parsed);
        }
    };

    const handleDateNativeChange = (raw: string) => {
        setData('conversion_date', raw);
        setDateDisplay(formatDateForDisplay(raw));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Stock Conversion" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-3 sm:py-4">
                            <div className="flex min-w-0 items-center space-x-3">
                                <Link
                                    href="/stock-conversions"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <RefreshCw className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold text-white sm:text-xl">
                                        {t('New Stock Conversion')}
                                    </h1>
                                    <p className="text-xs text-white/80 sm:truncate">
                                        {t('Convert received bundles / packs into individual units in your stock')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 sm:py-8 lg:px-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:rounded-2xl sm:p-8">

                        {/* General error */}
                        {pageErrors.general && (
                            <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {pageErrors.general}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mb-6 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    setData({
                                        section_code: '',
                                        item_id: '',
                                        to_item_id: '',
                                        stock_id: '',
                                        input_quantity: '',
                                        output_quantity: '',
                                        to_batch_no: '',
                                        conversion_date: today,
                                        notes: '',
                                    });
                                    setDateDisplay(formatDateForDisplay(today));
                                    setBatches([]);
                                    setToBatches([]);
                                    setAvailableStock(null);
                                    setItemSearch('');
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none sm:w-auto"
                            >
                                <X className="w-4 h-4 inline mr-2" />
                                {t('Clear Form')}
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
                                {/* ── Left/main column (2/3) ─────────────── */}
                                <div className="lg:col-span-2 space-y-8">

                                    {/* Conversion Details */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Building2 className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{t('Conversion Details')}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {/* Section */}
                                            <div className="space-y-2">
                                                <Label htmlFor="section" className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Section')} *
                                                </Label>
                                                <Select
                                                    value={data.section_code}
                                                    onValueChange={(v) => {
                                                        setData('section_code', v);
                                                        setData('stock_id', '');
                                                    }}
                                                >
                                                    <SelectTrigger id="section" className={cn('border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20', errors.section_code && 'border-red-500')}>
                                                        <SelectValue placeholder={t('Select section…')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {sections.map((s) => (
                                                            <SelectItem key={s.section_code} value={s.section_code}>
                                                                {s.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.section_code && <p className="text-sm text-red-600">{errors.section_code}</p>}
                                            </div>

                                            {/* Conversion Date */}
                                            <div className="space-y-2">
                                                <Label htmlFor="conversion_date" className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Conversion Date')} *
                                                </Label>
                                                <input
                                                    id="conversion_date"
                                                    type="date"
                                                    value={data.conversion_date}
                                                    onChange={(e) => handleDateNativeChange(e.target.value)}
                                                    className={cn(
                                                        'w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1',
                                                        'border-slate-200 bg-background focus:border-vismass-blue focus:ring-vismass-blue/20',
                                                        errors.conversion_date && 'border-red-500',
                                                    )}
                                                />
                                                {errors.conversion_date && <p className="text-sm text-red-600">{errors.conversion_date}</p>}
                                            </div>

                                        </div>
                                    </div>

                                    {/* Item & Quantity */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Package className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{t('Item & Quantity')}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm sm:grid-cols-2">
                                            {/* Item combobox */}
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label className="text-sm font-medium text-slate-700">{t('Item')} *</Label>
                                                <Popover open={itemOpen} onOpenChange={setItemOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className={cn(
                                                                'w-full justify-between border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20',
                                                                errors.item_id && 'border-red-500',
                                                            )}
                                                        >
                                                            <span className="flex items-center gap-2 truncate">
                                                                <Package className="h-4 w-4 shrink-0 text-gray-400" />
                                                                {selectedItem
                                                                    ? `${selectedItem.ItemCode} — ${selectedItem.ItmNm}`
                                                                    : t('Search item…')}
                                                            </span>
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:min-w-[400px] sm:w-full">
                                                        <Command>
                                                            <CommandInput
                                                                placeholder={t('Type to search…')}
                                                                value={itemSearch}
                                                                onValueChange={setItemSearch}
                                                            />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    {itemSearch.length === 0 ? t('Type to search items…') : t('No items found.')}
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {filteredItems.map((it) => (
                                                                        <CommandItem
                                                                            key={it.ItmKy}
                                                                            value={`${it.ItemCode} ${it.ItmNm}`}
                                                                            onSelect={() => {
                                                                                setData('item_id', it.ItmKy);
                                                                                setData('stock_id', '');
                                                                                setItemSearch('');
                                                                                setItemOpen(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    'mr-2 h-4 w-4',
                                                                                    data.item_id === it.ItmKy ? 'opacity-100' : 'opacity-0',
                                                                                )}
                                                                            />
                                                                            <span className="flex-1">
                                                                                <span className="font-medium">{it.ItemCode}</span>
                                                                                <span className="ml-2 text-gray-500">{it.ItmNm}</span>
                                                                            </span>
                                                                            <span className="ml-2 text-xs text-blue-500">
                                                                                ×{it.transfer_conversion_factor}
                                                                            </span>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                {errors.item_id && <p className="text-sm text-red-600">{errors.item_id}</p>}
                                            </div>

                                            {/* Batch */}
                                            {data.item_id && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="stock_id" className="text-sm font-medium text-slate-700">{t('Batch')}</Label>

                                                    {/* always render dropdown; disable until section chosen */}
                                                    <Select
                                                        disabled={!data.section_code || stockLoading}
                                                        value={data.stock_id === '' ? '__all__' : data.stock_id}
                                                        onValueChange={(v) => setData('stock_id', v === '__all__' ? '' : v)}
                                                    >
                                                        <SelectTrigger id="stock_id" className={cn(
                                                            'border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20',
                                                            errors.stock_id && 'border-red-500',
                                                        )}>
                                                            <SelectValue
                                                                placeholder={
                                                                    data.section_code
                                                                        ? t('All available stock')
                                                                        : t('Select section first')
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {data.section_code && (
                                                                <>
                                                                    <SelectItem value="__all__">{t('All available stock')}</SelectItem>
                                                                    {batches.map((b) => (
                                                                        <SelectItem key={b.id} value={String(b.id)}>
                                                                            {b.batch_no ?? t('No batch')} — {Number(b.quantity).toFixed(2)} {t('units')}
                                                                        </SelectItem>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>

                                                    {!data.section_code && (
                                                        <p className="text-xs text-slate-500">
                                                            {t('Select a section first to load batches')}
                                                        </p>
                                                    )}

                                                    {errors.stock_id && <p className="text-sm text-red-600">{errors.stock_id}</p>}
                                                </div>
                                            )}

                                            {/* Input quantity */}
                                            <div className="space-y-2">
                                                <Label htmlFor="input_quantity" className="text-sm font-medium text-slate-700">
                                                    {t('Input Quantity')}
                                                    {inputUnitName && (
                                                        <span className="ml-1 text-xs text-slate-500">({inputUnitName})</span>
                                                    )}
                                                    {' '}*
                                                </Label>
                                                <Input
                                                    id="input_quantity"
                                                    type="number"
                                                    min="1"
                                                    step="any"
                                                    max={availableStock !== null ? String(availableStock) : undefined}
                                                    placeholder="0"
                                                    value={data.input_quantity}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (availableStock !== null && val !== '' && !isNaN(Number(val))) {
                                                            if (Number(val) > availableStock) {
                                                                val = String(availableStock);
                                                            }
                                                        }
                                                        setData('input_quantity', val);
                                                    }}
                                                    className={cn('border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20', errors.input_quantity && 'border-red-500')}
                                                />
                                                {availableStock !== null && (
                                                    <p className="text-xs text-slate-500">
                                                        {t('Available')}: <span className="font-semibold text-vismass-blue">{Number(availableStock).toFixed(2)}</span>{' '}
                                                        {inputUnitName ?? ''}
                                                    </p>
                                                )}
                                                {errors.input_quantity && <p className="text-sm text-red-600">{errors.input_quantity}</p>}
                                            </div>

                                            {/* Destination Item */}
                                            <div className="space-y-2 sm:col-span-2 mt-4 pt-4 border-t border-slate-200">
                                                        <Label className="text-sm font-medium text-slate-700">{t('Destination Item')} *</Label>
                                                        <Popover open={toItemOpen} onOpenChange={setToItemOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className={cn(
                                                                        'w-full justify-between border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20',
                                                                        errors.to_item_id && 'border-red-500',
                                                                    )}
                                                                >
                                                                    <span className="flex items-center gap-2 truncate">
                                                                        <Package className="h-4 w-4 shrink-0 text-gray-400" />
                                                                        {selectedToItem
                                                                            ? `${selectedToItem.ItemCode} — ${selectedToItem.ItmNm}`
                                                                            : t('Search destination item…')}
                                                                    </span>
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:min-w-[400px] sm:w-full">
                                                                <Command>
                                                                    <CommandInput
                                                                        placeholder={t('Type to search…')}
                                                                        value={toItemSearch}
                                                                        onValueChange={setToItemSearch}
                                                                    />
                                                                    <CommandList>
                                                                        <CommandEmpty>
                                                                            {toItemSearch.length === 0 ? t('Type to search items…') : t('No items found.')}
                                                                        </CommandEmpty>
                                                                        <CommandGroup>
                                                                            {filteredToItems.map((it) => (
                                                                                <CommandItem
                                                                                    key={`to-${it.ItmKy}`}
                                                                                    value={`${it.ItemCode} ${it.ItmNm}`}
                                                                                    onSelect={() => {
                                                                                        setData('to_item_id', it.ItmKy);
                                                                                        setToItemSearch('');
                                                                                        setToItemOpen(false);
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            'mr-2 h-4 w-4',
                                                                                            data.to_item_id === it.ItmKy ? 'opacity-100' : 'opacity-0',
                                                                                        )}
                                                                                    />
                                                                                    <span className="flex-1">
                                                                                        <span className="font-medium">{it.ItemCode}</span>
                                                                                        <span className="ml-2 text-gray-500">{it.ItmNm}</span>
                                                                                    </span>
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                        {errors.to_item_id && <p className="text-sm text-red-600">{errors.to_item_id}</p>}
                                                    </div>
                                                    
                                                    {/* Destination Batch */}
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <Label htmlFor="to_batch_no" className="text-sm font-medium text-slate-700">
                                                            {t('Destination Batch')} <span className="text-xs text-slate-500">({t('Optional')})</span>
                                                        </Label>
                                                        <div className="flex items-center space-x-2">
                                                            <Input
                                                                id="to_batch_no"
                                                                list="to_batches_list"
                                                                placeholder={t('Leave blank to use source batch')}
                                                                value={data.to_batch_no}
                                                                onChange={(e) => setData('to_batch_no', e.target.value)}
                                                                className={cn('flex-1 border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20', errors.to_batch_no && 'border-red-500')}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    if (!data.section_code) return;
                                                                    fetch(`/stock-conversions/next-batch?section_code=${data.section_code}`)
                                                                        .then(r => r.json())
                                                                        .then(res => setData('to_batch_no', res.batch_no))
                                                                        .catch(console.error);
                                                                }}
                                                                disabled={!data.section_code}
                                                            >
                                                                {t('Generate')}
                                                            </Button>
                                                        </div>
                                                        <datalist id="to_batches_list">
                                                            {toBatches.map((b, i) => (
                                                                b.batch_no ? <option key={`to-batch-${i}`} value={b.batch_no} /> : null
                                                            ))}
                                                        </datalist>
                                                        {errors.to_batch_no && <p className="text-sm text-red-600">{errors.to_batch_no}</p>}
                                                    </div>

                                                    {/* Output quantity */}
                                                    <div className="space-y-2 mt-4 pt-4 border-t border-slate-200 sm:col-span-2">
                                                        <Label htmlFor="output_quantity" className="text-sm font-medium text-slate-700">
                                                            {t('Output Quantity')}
                                                            {outputUnitName && (
                                                                <span className="ml-1 text-xs text-slate-500">({outputUnitName})</span>
                                                            )}
                                                            {' '}*
                                                        </Label>
                                                        <Input
                                                            id="output_quantity"
                                                            type="number"
                                                            min="1"
                                                            step="any"
                                                            placeholder="0"
                                                            value={data.output_quantity}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            onChange={(e) => setData('output_quantity', e.target.value)}
                                                            className={cn('border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20', errors.output_quantity && 'border-red-500')}
                                                        />
                                                        {errors.output_quantity && <p className="text-sm text-red-600">{errors.output_quantity}</p>}
                                                    </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <MapPin className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">{t('Additional Notes')}</h2>
                                        </div>
                                        <Input
                                            id="notes"
                                            placeholder={t('Optional notes…')}
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                        />
                                    </div>
                                </div>

                                {/* ── Right column: preview (1/3) ───────── */}
                                <div className="space-y-4">
                                    <Card className="border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-950">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                                                <ArrowRightLeft className="h-4 w-4" />
                                                {t('Conversion Preview')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {selectedItem && selectedToItem ? (
                                                <div className="space-y-3">
                                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        {selectedItem.ItmNm}
                                                        <span className="text-vismass-blue mx-2">→</span>
                                                        {selectedToItem.ItmNm}
                                                    </div>
                                                    <div className="flex flex-col items-center gap-3 rounded-md bg-white p-3 shadow-sm dark:bg-gray-800 sm:flex-row">
                                                        <div className="w-full flex-1 text-center">
                                                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                                                {data.input_quantity || '—'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {inputUnitName || t('sending unit')}
                                                            </p>
                                                        </div>
                                                        <div className="text-center">
                                                            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                                                            <p className="text-xs text-blue-500">
                                                                {displayFactor !== null ? `×${displayFactor.toFixed(4)}` : '—'}
                                                            </p>
                                                        </div>
                                                        <div className="w-full flex-1 text-center">
                                                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                                                                {outputQty !== null && !isNaN(outputQty) ? outputQty.toFixed(2) : '—'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {outputUnitName || t('receiving unit')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-center text-xs text-gray-500">
                                                        1 {inputUnitName || '…'} ={' '}
                                                        {displayFactor !== null ? displayFactor.toFixed(4) : '…'}{' '}
                                                        {outputUnitName || '…'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-center text-sm text-gray-400">
                                                    {t('Select source and destination items to see preview.')}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end border-t border-slate-200 pt-6">
                                <Button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        !data.section_code ||
                                        !data.item_id ||
                                        !data.input_quantity ||
                                        !data.conversion_date ||
                                        !data.to_item_id || 
                                        !data.output_quantity
                                    }
                                    className="w-full rounded-xl bg-vismass-blue px-8 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:bg-vismass-blue/90 sm:w-auto"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>{t('Processing…')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <RefreshCw className="w-5 h-5" />
                                            <span>{t('Perform Conversion')}</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-slate-600">
                        <p className="text-sm">Manage your inventory • Convert bundles efficiently</p>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
