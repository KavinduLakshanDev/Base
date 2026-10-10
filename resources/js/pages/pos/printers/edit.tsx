import { Head, useForm, Link } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ArrowLeft, Edit3, Loader2, Printer, RotateCcw, Save } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';
import { type BreadcrumbItem } from '@/types';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import axios from 'axios';

interface Brand {
    id: number;
    name: string;
    code: string;
    category_id?: number;
}

interface Supplier {
    id: number;
    name: string;
}

interface Model {
    id: number;
    name: string;
    code: string;
}

interface Printer {
    ItmKy: number;
    ItemCode: string;
    ItmNm: string;
    CosPri: number;
    SlsPri: number;
    WholePrice?: number;
    wholesale_min_qty?: number;
    VehicleSalePrice?: number;
    brand_id?: number;
    SupKey?: number;
    VATPer?: number;
    VATItem?: boolean | number;
    warranty?: number | string;
    barcode?: string;
    batch_no?: string;
    RtQty1?: number | string;
    RtDis1?: number | string;
    RtDisType1?: string;
    model?: {
        id: number;
        name: string;
        code: string;
    };
}

interface EditProps {
    printer: Printer;
    brands: Brand[];
    suppliers: Supplier[];
}

export default function Edit({ printer, brands, suppliers }: EditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        // { title: 'POS', href: '/pos' },
        { title: 'Printer Registration', href: '/pos/printers' },
        { title: 'Edit', href: '#' },
    ];

    const initialFormData = {
        printer_name: printer.ItmNm || '',
        model_id: printer.model?.id?.toString() || '',
        brand_id: printer.brand_id?.toString() || '',
        supplier_id: printer.SupKey?.toString() || '',
        cost_price: printer.CosPri ? parseFloat(printer.CosPri.toString()).toFixed(2) : '',
        retail_price: printer.SlsPri ? parseFloat(printer.SlsPri.toString()).toFixed(2) : '',
        wholesale_price: printer.WholePrice ? parseFloat(printer.WholePrice.toString()).toFixed(2) : '',
        wholesale_min_qty: printer.wholesale_min_qty?.toString() || '',
        vehicle_sale_price: printer.VehicleSalePrice ? parseFloat(printer.VehicleSalePrice.toString()).toFixed(2) : '',
        warranty: printer.warranty?.toString() || '',
        barcode: printer.barcode || '',
        batch_no: printer.batch_no || '',
        vat_applicable: Boolean(printer.VATItem),
        RtQty1: printer.RtQty1 ? printer.RtQty1.toString() : '',
        RtDis1: printer.RtDis1 ? parseFloat(printer.RtDis1.toString()).toFixed(2) : '',
        RtDisType1: printer.RtDisType1 || 'fixed',
    };

    const { data, setData, put, processing, errors } = useForm(initialFormData);

    const [models, setModels] = useState<Model[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [batchOptions, setBatchOptions] = useState<string[]>([]);

    const fetchBatches = async (itemCode: string) => {
        try {
            const response = await fetch(
                `/pos/products/get-batches?item_code=${itemCode}`,
                { headers: { Accept: 'application/json' } }
            );
            if (response.ok) {
                const batches = await response.json();
                setBatchOptions(batches);
            } else {
                setBatchOptions([]);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            setBatchOptions([]);
        }
    };

    const fetchPricesForBatch = async (itemCode: string, batchNo: string) => {
        try {
            const response = await fetch(
                `/pos/products/get-prices-for-batch?item_code=${itemCode}&batch_no=${batchNo}`,
                { headers: { Accept: 'application/json' } }
            );

            if (response.ok) {
                const priceData = await response.json();
                if (priceData && Object.keys(priceData).length > 0) {
                    setData((prev) => ({
                        ...prev,
                        cost_price: priceData.CosPri ? parseFloat(priceData.CosPri.toString()).toFixed(2) : prev.cost_price,
                        retail_price: priceData.SlsPri ? parseFloat(priceData.SlsPri.toString()).toFixed(2) : prev.retail_price,
                        wholesale_price: priceData.WholePrice ? parseFloat(priceData.WholePrice.toString()).toFixed(2) : prev.wholesale_price,
                        vehicle_sale_price: priceData.VehicleSalePrice ? parseFloat(priceData.VehicleSalePrice.toString()).toFixed(2) : prev.vehicle_sale_price,
                        // Load batch-wise customer discount fields
                        RtQty1: priceData.RtQty1 != null && priceData.RtQty1 !== 0 ? priceData.RtQty1.toString() : prev.RtQty1,
                        RtDis1: priceData.RtDis1 != null && priceData.RtDis1 !== 0 ? parseFloat(priceData.RtDis1.toString()).toFixed(2) : prev.RtDis1,
                        RtDisType1: priceData.RtDisType1 || prev.RtDisType1,
                    }));
                    toast.success(`Prices loaded for batch ${batchNo}`);
                }
            }
        } catch (error) {
            console.error('Error fetching prices for batch:', error);
            toast.error('Failed to fetch prices for batch');
        }
    };


    useEffect(() => {
        if (printer.ItemCode) {
            fetchBatches(printer.ItemCode);
            if (data.batch_no) {
                fetchPricesForBatch(printer.ItemCode, data.batch_no);
            }
        }
    }, [printer.ItemCode]);

    // Load initial models if brand exists
    useEffect(() => {
        if (printer.brand_id && !loadingModels) {
            setLoadingModels(true);
            axios
                .get(`/pos/printers/api/models-by-brand/${printer.brand_id}`)
                .then((response) => {
                    if (response.data.success) {
                        setModels(response.data.data);
                    }
                })
                .catch((error) => {
                    console.error('Error fetching models:', error);
                    toast.error('Failed to load models for selected brand');
                    setModels([]);
                })
                .finally(() => {
                    setLoadingModels(false);
                });
        }
    }, []); // Run only on mount

    // Fetch models when brand is selected/changed
    useEffect(() => {
        if (data.brand_id && data.brand_id !== printer.brand_id?.toString()) {
            setLoadingModels(true);
            axios
                .get(`/pos/printers/api/models-by-brand/${data.brand_id}`)
                .then((response) => {
                    if (response.data.success) {
                        setModels(response.data.data);
                        // Clear model if it's not in the new brand's models
                        if (data.model_id && !response.data.data.some((m: Model) => m.id.toString() === data.model_id)) {
                            setData('model_id', '');
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error fetching models:', error);
                    toast.error('Failed to load models for selected brand');
                    setModels([]);
                })
                .finally(() => {
                    setLoadingModels(false);
                });
        }
    }, [data.brand_id]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('pos.printers.update', printer.ItmKy), {
            onSuccess: () => {
                toast.success('Printer updated successfully!');
            },
            onError: (errors) => {
                console.error('Validation errors:', errors);
                Object.entries(errors).forEach(([key, message]) => {
                    toast.error(`${key}: ${message}`);
                });
            },
        });
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset all fields?')) {
            setData(initialFormData);
        }
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title="Edit Printer" />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/pos/printers"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Edit3 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Edit Printer
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Update printer details and pricing information
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6 lg:p-8">
                        {/* Intro */}
                        <div className="mb-6 space-y-2 border-b border-slate-200 pb-4">
                            <div className="flex items-center space-x-2 text-vismass-blue">
                                <Printer className="h-5 w-5" />
                                <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">
                                    {printer.ItmNm}
                                </h2>
                            </div>
                            <p className="text-sm text-slate-600 sm:text-base">
                                Modify basic printer information and adjust prices for POS.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Printer Code (Read-only) */}
                            {/* <div className="space-y-2">
                                        <Label
                                            htmlFor="printer_code"
                                            className="text-sm font-medium"
                                        >
                                            Printer Code
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="printer_code"
                                                value={printer.ItemCode}
                                                readOnly
                                                className="bg-slate-100 cursor-not-allowed font-mono font-semibold"
                                            />
                                            <div className="px-3 py-2 bg-blue-100 border border-blue-300 rounded text-blue-700 text-sm font-medium">
                                                Read-only
                                            </div>
                                        </div>
                                    </div> */}

                            {/* Basic Information */}
                            <div className="pt-2 sm:pt-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {/* Printer Name */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="printer_name"
                                            className="text-sm font-medium"
                                        >
                                            Printer Name{' '}
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="printer_name"
                                            type="text"
                                            placeholder="e.g., Canon ImageRunner"
                                            value={data.printer_name}
                                            onChange={(e) =>
                                                setData('printer_name', e.target.value)
                                            }
                                            className={
                                                errors.printer_name
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        {errors.printer_name && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.printer_name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Brand */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="brand_id"
                                            className="text-sm font-medium"
                                        >
                                            Brand
                                        </Label>
                                        <Select
                                            value={data.brand_id}
                                            onValueChange={(value) =>
                                                setData('brand_id', value)
                                            }
                                        >
                                            <SelectTrigger
                                                id="brand_id"
                                                className={
                                                    errors.brand_id
                                                        ? 'border-red-500'
                                                        : ''
                                                }
                                            >
                                                <SelectValue placeholder="Select a brand" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {brands.map((brand) => (
                                                    <SelectItem
                                                        key={brand.id}
                                                        value={brand.id.toString()}
                                                    >
                                                        {brand.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.brand_id && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.brand_id}
                                            </div>
                                        )}
                                    </div>

                                    {/* Model */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="model"
                                            className="text-sm font-medium"
                                        >
                                            Model
                                        </Label>
                                        <Select
                                            value={data.model_id}
                                            onValueChange={(value) =>
                                                setData('model_id', value)
                                            }
                                            disabled={!data.brand_id || loadingModels}
                                        >
                                            <SelectTrigger
                                                id="model"
                                                className={
                                                    errors.model_id
                                                        ? 'border-red-500'
                                                        : ''
                                                }
                                            >
                                                <SelectValue placeholder={loadingModels ? 'Loading models...' : 'Select a model'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {models.map((model) => (
                                                    <SelectItem
                                                        key={model.id}
                                                        value={model.id.toString()}
                                                    >
                                                        {model.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.model_id && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.model_id}
                                            </div>
                                        )}
                                    </div>

                                    {/* Supplier */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="supplier_id"
                                            className="text-sm font-medium"
                                        >
                                            Supplier
                                        </Label>
                                        <Select
                                            value={data.supplier_id}
                                            onValueChange={(value) =>
                                                setData('supplier_id', value)
                                            }
                                        >
                                            <SelectTrigger
                                                id="supplier_id"
                                                className={
                                                    errors.supplier_id
                                                        ? 'border-red-500'
                                                        : ''
                                                }
                                            >
                                                <SelectValue placeholder="Select a supplier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((supplier) => (
                                                    <SelectItem
                                                        key={supplier.id}
                                                        value={supplier.id.toString()}
                                                    >
                                                        {supplier.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.supplier_id && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.supplier_id}
                                            </div>
                                        )}
                                    </div>

                                    {/* Barcode */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="barcode"
                                            className="text-sm font-medium"
                                        >
                                            Barcode
                                        </Label>
                                        <Input
                                            id="barcode"
                                            type="text"
                                            placeholder="Enter barcode value"
                                            value={data.barcode}
                                            onChange={(e) =>
                                                setData('barcode', e.target.value)
                                            }
                                            className={
                                                errors.barcode
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        {errors.barcode && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.barcode}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500">Unique barcode for this printer</p>
                                    </div>

                                    {/* Warranty */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="warranty"
                                            className="text-sm font-medium"
                                        >
                                            Warranty (Months)
                                        </Label>
                                        <Input
                                            id="warranty"
                                            type="number"
                                            min="0"
                                            placeholder="Enter warranty period in months"
                                            value={data.warranty}
                                            onChange={(e) =>
                                                setData('warranty', e.target.value)
                                            }
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className={
                                                errors.warranty
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        {errors.warranty && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.warranty}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500">Enter warranty period in months (optional)</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Information */}
                            <div className="border-t pt-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                                    Pricing Information
                                </h3>

                                <div className="mb-6">
                                    <Label className="mb-2 block text-sm font-medium text-slate-700">
                                        Batch No
                                    </Label>
                                    <Select
                                        value={data.batch_no}
                                        onValueChange={(value) => {
                                            setData('batch_no', value);
                                            if (value) {
                                                fetchPricesForBatch(printer.ItemCode, value);
                                            }
                                        }}
                                        disabled={!printer.ItemCode || batchOptions.length === 0}
                                    >
                                        <SelectTrigger className={(errors as any).batch_no ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={printer.ItemCode ? 'Select Batch' : 'Enter Item Code first'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {batchOptions.map((batch) => (
                                                <SelectItem key={batch} value={batch}>
                                                    {batch}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {printer.ItemCode && batchOptions.length === 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            No batches found for this item
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {/* Cost Price */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="cost_price"
                                            className="text-sm font-medium"
                                        >
                                            Cost Price{' '}
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="cost_price"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={data.cost_price}
                                            onChange={(e) =>
                                                setData('cost_price', e.target.value)
                                            }
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className={
                                                errors.cost_price
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        {errors.cost_price && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.cost_price}
                                            </div>
                                        )}
                                    </div>

                                    {/* Retail Price */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="retail_price"
                                            className="text-sm font-medium"
                                        >
                                            Retail Price
                                        </Label>
                                        <Input
                                            id="retail_price"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={data.retail_price}
                                            onChange={(e) =>
                                                setData('retail_price', e.target.value)
                                            }
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className={
                                                errors.retail_price
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        {errors.retail_price && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.retail_price}
                                            </div>
                                        )}
                                    </div>

                                    {/* Wholesale Price */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="wholesale_price"
                                            className="text-sm font-medium"
                                        >
                                            Wholesale Price
                                        </Label>
                                        <Input
                                            id="wholesale_price"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={data.wholesale_price}
                                            onChange={(e) =>
                                                setData('wholesale_price', e.target.value)
                                            }
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className={
                                                errors.wholesale_price
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        {errors.wholesale_price && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.wholesale_price}
                                            </div>
                                        )}
                                    </div>

                                    {/* Wholesale Min. Quantity */}
                                    {/* <div className="space-y-2">
                                                <Label
                                                    htmlFor="wholesale_min_qty"
                                                    className="text-sm font-medium"
                                                >
                                                    Wholesale Min. Quantity
                                                </Label>
                                                <Input
                                                    id="wholesale_min_qty"
                                                    type="number"
                                                    step="1"
                                                    placeholder="0"
                                                    value={data.wholesale_min_qty}
                                                    onChange={(e) =>
                                                        setData('wholesale_min_qty', e.target.value)
                                                    }
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className={
                                                        errors.wholesale_min_qty
                                                            ? 'border-red-500'
                                                            : ''
                                                    }
                                                />
                                                <p className="text-xs text-gray-500">
                                                    When sale quantity reaches this amount, wholesale price is auto-applied
                                                </p>
                                                {errors.wholesale_min_qty && (
                                                    <div className="flex items-center gap-2 text-sm text-red-500">
                                                        <AlertCircle className="h-4 w-4" />
                                                        {errors.wholesale_min_qty}
                                                    </div>
                                                )}
                                            </div> */}

                                    {/* Extra Price */}
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="vehicle_sale_price"
                                            className="text-sm font-medium"
                                        >
                                            Vehicle Sale Price
                                        </Label>
                                        <Input
                                            id="vehicle_sale_price"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={data.vehicle_sale_price}
                                            onChange={(e) =>
                                                setData('vehicle_sale_price', e.target.value)
                                            }
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className={
                                                errors.vehicle_sale_price
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        <p className="text-xs text-gray-500">Vehicle or special delivery pricing</p>
                                        {errors.vehicle_sale_price && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.vehicle_sale_price}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="RtQty1"
                                            className="text-sm font-medium"
                                        >
                                            Customer buy Min Qty
                                        </Label>
                                        <Input
                                            id="RtQty1"
                                            type="number"
                                            placeholder="0"
                                            value={data.RtQty1}
                                            onChange={(e) =>
                                                setData('RtQty1', e.target.value)
                                            }
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className={
                                                errors.RtQty1
                                                    ? 'border-red-500'
                                                    : ''
                                            }
                                        />
                                        <p className="text-xs text-gray-500">Minimum quantity required for discount</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="RtDis1"
                                            className="text-sm font-medium"
                                        >
                                            Customer Discount
                                        </Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    id="RtDis1"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={data.RtDis1}
                                                    onChange={(e) =>
                                                        setData('RtDis1', e.target.value)
                                                    }
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className={
                                                        errors.RtDis1
                                                            ? 'border-red-500'
                                                            : ''
                                                    }
                                                />
                                            </div>
                                            <div className="w-32">
                                                <Select
                                                    value={data.RtDisType1}
                                                    onValueChange={(value) => setData('RtDisType1', value)}
                                                >
                                                    <SelectTrigger id="RtDisType1">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="fixed">Fixed (Rs)</SelectItem>
                                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Default discount {data.RtDisType1 === 'percentage' ? 'percentage' : 'amount'} for customers
                                        </p>
                                        {errors.RtDis1 && (
                                            <div className="flex items-center gap-2 text-sm text-red-500">
                                                <AlertCircle className="h-4 w-4" />
                                                {errors.RtDis1}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="border-t pt-6">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                                    Additional Information
                                </h3>
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <Checkbox
                                        id="vat_applicable"
                                        checked={data.vat_applicable}
                                        onCheckedChange={(checked) => setData('vat_applicable', checked as boolean)}
                                        className="mt-0.5 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <Label
                                            htmlFor="vat_applicable"
                                            className="text-sm font-semibold text-slate-700 cursor-pointer"
                                        >
                                            VAT Applicable
                                        </Label>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {data.vat_applicable
                                                ? '✓ This printer includes VAT in pricing'
                                                : '✗ This printer does NOT include VAT'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => window.history.back()}
                                    disabled={processing}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                    disabled={processing}
                                    className="w-full gap-2 sm:w-auto"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Reset Form
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full gap-2 bg-vismass-blue px-8 text-white hover:bg-vismass-blue/90 sm:w-auto"
                                >
                                    <Save className="h-4 w-4" />
                                    {processing && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {processing ? 'Updating...' : 'Update Printer'}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-6 text-center text-slate-600 sm:mt-8">
                            <p className="text-sm">Manage your printer inventory • Keep printer records up to date</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}
