import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { t } from '@/lib/i18n';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, Plus, Printer, RotateCcw, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Brand {
    id: number;
    name: string;
    code: string;
    category_id?: number;
}

interface Model {
    id: number;
    name: string;
    code: string;
}

interface Category {
    id: string;
    name: string;
}

interface Unit {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface CreateProps {
    brands: Brand[];
    categories: Category[];
    units: Unit[];
    suppliers: Supplier[];
    nextPrinterCode: string;
}

export default function PrinterCreate({
    brands,
    categories,
    units,
    suppliers,
    nextPrinterCode,
}: CreateProps) {
    const { auth } = usePage().props as any;
    const { data, setData, post, processing, errors } = useForm({
        printer_code: nextPrinterCode,
        printer_name: '',
        model_id: '',
        brand_id: '',
        supplier_id: '',
        cost_price: '',
        retail_price: '',
        wholesale_price: '',
        wholesale_min_qty: '',
        vehicle_sale_price: '',
        warranty: '',
        vat_applicable: true,
        barcode: '',
        RtQty1: '',
        RtDis1: '',
        RtDisType1: 'fixed',
    });

    const [models, setModels] = useState<Model[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // Fetch models when brand is selected
    useEffect(() => {
        if (data.brand_id) {
            setLoadingModels(true);
            axios
                .get(`/pos/printers/api/models-by-brand/${data.brand_id}`)
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
        } else {
            setModels([]);
            setData('model_id', ''); // Clear model when brand is cleared
        }
    }, [data.brand_id]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        // { title: t('POS'), href: '/pos' },
        { title: 'Printer Registration', href: '/pos/printers' },
        { title: 'New Printer', href: '#' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!data.printer_name.trim()) {
            toast.error('Printer name is required');
            return;
        }

        if (!data.cost_price || parseFloat(data.cost_price) <= 0) {
            toast.error('Cost price must be greater than 0');
            return;
        }

        if (!data.barcode.trim()) {
            toast.error('Barcode is required');
            return;
        }

        post('/pos/printers', {
            onSuccess: () => {
                toast.success('Printer registered successfully!');
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
            setData({
                printer_code: nextPrinterCode,
                printer_name: '',
                model_id: '',
                brand_id: '',
                supplier_id: '',
                cost_price: '',
                retail_price: '',
                wholesale_price: '',
                wholesale_min_qty: '',
                vehicle_sale_price: '',
                warranty: '',
                vat_applicable: true,
                barcode: '',
                RtQty1: '',
                RtDis1: '',
                RtDisType1: 'fixed',
            });
        }
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title="Register New Printer" />

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
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Printer Registration
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Add a new printer to your inventory
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
                                    New Printer Entry
                                </h2>
                            </div>
                            <p className="text-sm text-slate-600 sm:text-base">
                                Register a new printer model and configure pricing details for POS usage.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">


                            {/* Basic Information Section */}
                            <Card className="border-2">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                                    <CardTitle className="text-base font-bold text-gray-900">Basic Information</CardTitle>
                                    <CardDescription className="text-sm mt-1">
                                        Enter the printer name, brand, and supplier details
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4 sm:space-y-6 sm:pt-6">
                                    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                                        {/* Printer Name */}
                                        <div className="space-y-2">
                                            <Label htmlFor="printer_name" className="text-sm font-semibold text-gray-700">
                                                Printer Name <span className="text-red-500 font-bold">*</span>
                                            </Label>
                                            <Input
                                                id="printer_name"
                                                placeholder="e.g., Canon ImageRunner 2520"
                                                value={data.printer_name}
                                                onChange={(e) => setData('printer_name', e.target.value)}
                                                className={`${errors.printer_name ? 'border-red-500 bg-red-50' : ''
                                                    }`}
                                            />
                                            {errors.printer_name ? (
                                                <div className="flex items-center gap-2 text-sm text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.printer_name}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Full model name of the printer</p>
                                            )}
                                        </div>

                                        {/* Brand */}
                                        <div className="space-y-2">
                                            <Label htmlFor="brand_id" className="text-sm font-semibold text-gray-700">
                                                Brand
                                            </Label>
                                            <Select
                                                value={data.brand_id}
                                                onValueChange={(value) => setData('brand_id', value)}
                                            >
                                                <SelectTrigger id="brand_id" className={`${errors.brand_id ? 'border-red-500 bg-red-50' : ''
                                                    }`}>
                                                    <SelectValue placeholder="Select brand..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {brands.map((brand) => (
                                                        <SelectItem key={brand.id} value={brand.id.toString()}>
                                                            {brand.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.brand_id ? (
                                                <div className="flex items-center gap-2 text-sm text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.brand_id}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Select the manufacturer/brand of this printer</p>
                                            )}
                                        </div>

                                        {/* Model */}
                                        <div className="space-y-2">
                                            <Label htmlFor="model" className="text-sm font-semibold text-gray-700">
                                                Model
                                            </Label>
                                            <Select
                                                value={data.model_id}
                                                onValueChange={(value) => setData('model_id', value)}
                                                disabled={!data.brand_id || loadingModels}
                                            >
                                                <SelectTrigger id="model" className={`${errors.model_id ? 'border-red-500 bg-red-50' : ''
                                                    } ${!data.brand_id ? 'bg-slate-50 cursor-not-allowed' : ''}`}>
                                                    <SelectValue placeholder={loadingModels ? 'Loading models...' : 'Select model...'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {models.length > 0 ? (
                                                        models.map((model) => (
                                                            <SelectItem key={model.id} value={model.id.toString()}>
                                                                {model.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-sm text-gray-500">
                                                            {loadingModels ? 'Loading...' : data.brand_id ? 'No models available' : 'Select a brand first'}
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            {errors.model_id ? (
                                                <div className="flex items-center gap-2 text-sm text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.model_id}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Model number or series of this printer</p>
                                            )}
                                        </div>

                                        {/* Supplier */}
                                        <div className="space-y-2">
                                            <Label htmlFor="supplier_id" className="text-sm font-semibold text-gray-700">
                                                Supplier
                                            </Label>
                                            <Select
                                                value={data.supplier_id}
                                                onValueChange={(value) => setData('supplier_id', value)}
                                            >
                                                <SelectTrigger id="supplier_id" className={`${errors.supplier_id ? 'border-red-500 bg-red-50' : ''
                                                    }`}>
                                                    <SelectValue placeholder="Select supplier..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {suppliers.map((supplier) => (
                                                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                                            {supplier.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.supplier_id ? (
                                                <div className="flex items-center gap-2 text-sm text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.supplier_id}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Select primary supplier for this printer model</p>
                                            )}
                                        </div>

                                        {/* Barcode */}
                                        <div className="space-y-2">
                                            <Label htmlFor="barcode" className="text-sm font-semibold text-gray-700">
                                                Barcode <span className="text-red-500 font-bold">*</span>
                                            </Label>
                                            <Input
                                                id="barcode"
                                                placeholder="Enter barcode value"
                                                value={data.barcode}
                                                onChange={(e) => setData('barcode', e.target.value)}
                                                className={`${errors.barcode ? 'border-red-500 bg-red-50' : ''}`}
                                            />
                                            {errors.barcode ? (
                                                <div className="flex items-center gap-2 text-sm text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.barcode}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Barcode for this printer.</p>
                                            )}
                                        </div>

                                        {/* Warranty */}
                                        <div className="space-y-2">
                                            <Label htmlFor="warranty" className="text-sm font-semibold text-gray-700">
                                                Warranty (Months)
                                            </Label>
                                            <Input
                                                id="warranty"
                                                type="number"
                                                min="0"
                                                placeholder="Enter warranty period in months"
                                                value={data.warranty}
                                                onChange={(e) => setData('warranty', e.target.value)}
                                                className={`${errors.warranty ? 'border-red-500 bg-red-50' : ''}`}
                                            />
                                            {errors.warranty ? (
                                                <div className="flex items-center gap-2 text-sm text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.warranty}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Enter warranty period in months (optional)</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Pricing Section */}
                            <Card className="border-2">
                                <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-t-lg">
                                    <CardTitle className="text-base font-bold text-gray-900">Pricing Information</CardTitle>
                                    <CardDescription className="text-sm mt-1">
                                        Set multiple price levels for this printer model
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4 sm:space-y-6 sm:pt-6">
                                    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                                        {/* Cost Price */}
                                        <div className="space-y-2">
                                            <Label htmlFor="cost_price" className="text-sm font-semibold text-gray-700">
                                                Cost Price <span className="text-red-500 font-bold">*</span>
                                            </Label>
                                            <Input
                                                id="cost_price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={data.cost_price}
                                                onChange={(e) => setData('cost_price', e.target.value)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                                className={`${errors.cost_price ? 'border-red-500 bg-red-50' : ''
                                                    }`}
                                            />
                                            {errors.cost_price ? (
                                                <div className="flex items-center gap-2 text-sm text-red-600">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {errors.cost_price}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Your cost/purchase price per unit</p>
                                            )}
                                        </div>

                                        {/* Retail Price */}
                                        <div className="space-y-2">
                                            <Label htmlFor="retail_price" className="text-sm font-semibold text-gray-700">
                                                Retail Price <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                            </Label>
                                            <Input
                                                id="retail_price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={data.retail_price}
                                                onChange={(e) => setData('retail_price', e.target.value)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                            />
                                            <p className="text-xs text-gray-500">Standard retail/selling price</p>
                                        </div>

                                        {/* Wholesale Price */}
                                        <div className="space-y-2">
                                            <Label htmlFor="wholesale_price" className="text-sm font-semibold text-gray-700">
                                                Wholesale Price <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                            </Label>
                                            <Input
                                                id="wholesale_price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={data.wholesale_price}
                                                onChange={(e) => setData('wholesale_price', e.target.value)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                            />
                                            <p className="text-xs text-gray-500">Bulk/wholesale pricing</p>
                                        </div>


                                        {/* Extra Price */}
                                        <div className="space-y-2">
                                            <Label htmlFor="vehicle_sale_price" className="text-sm font-semibold text-gray-700">
                                                Vehicle Sale Price <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                            </Label>
                                            <Input
                                                id="vehicle_sale_price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="0.00"
                                                value={data.vehicle_sale_price}
                                                onChange={(e) => setData('vehicle_sale_price', e.target.value)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                            />
                                            <p className="text-xs text-gray-500">Vehicle or special delivery pricing</p>
                                        </div>

                                        {/* Customer Min Qty */}
                                        <div className="space-y-2">
                                            <Label htmlFor="RtQty1" className="text-sm font-semibold text-gray-700">
                                                Customer buy Min Qty <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                            </Label>
                                            <Input
                                                id="RtQty1"
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={data.RtQty1}
                                                onChange={(e) => setData('RtQty1', e.target.value)}
                                                onWheel={(e) => e.currentTarget.blur()}
                                            />
                                            <p className="text-xs text-gray-500">Minimum quantity required for discount</p>
                                        </div>

                                        {/* Customer Discount */}
                                        <div className="space-y-2">
                                            <Label htmlFor="RtDis1" className="text-sm font-semibold text-gray-700">
                                                Customer Discount <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                                            </Label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        id="RtDis1"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={data.RtDis1}
                                                        onChange={(e) => setData('RtDis1', e.target.value)}
                                                        onWheel={(e) => e.currentTarget.blur()}
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
                                        </div>
                                    </div>

                                    {/* VAT Section */}
                                    <div className="mt-4 border-t pt-4">
                                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <Checkbox
                                                id="vat_applicable"
                                                checked={data.vat_applicable}
                                                onCheckedChange={(checked) => setData('vat_applicable', checked as boolean)}
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1">
                                                <label
                                                    htmlFor="vat_applicable"
                                                    className="text-sm font-semibold text-gray-700 cursor-pointer"
                                                >
                                                    VAT Applicable
                                                </label>
                                                <p className="text-xs text-gray-600 mt-1">
                                                    {data.vat_applicable
                                                        ? '✓ This printer includes VAT in pricing'
                                                        : '✗ This printer does NOT include VAT'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Form Actions */}
                            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => window.history.back()}
                                    disabled={processing}
                                    className="w-full sm:w-auto"
                                    size="lg"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                    disabled={processing}
                                    className="w-full gap-2 sm:w-auto"
                                    size="lg"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Reset Form
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full gap-2 bg-vismass-blue px-8 text-white hover:bg-vismass-blue/90 sm:w-auto"
                                    size="lg"
                                >
                                    <Save className="h-4 w-4" />
                                    {processing ? 'Registering...' : 'Register Printer'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="mt-6 text-center text-slate-600 sm:mt-8">
                        <p className="text-sm">Build your printer inventory • Manage printer models efficiently</p>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}
