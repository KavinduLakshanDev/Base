import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Building, CheckCircle, MapPin, Phone, Save, Truck, User, FileText, Mail, Edit, Globe, RotateCcw, Trash2 } from 'lucide-react';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { router } from '@inertiajs/react';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { FormEventHandler, useState, useEffect } from 'react';
import { update } from '@/routes/suppliers';

interface Supplier {
    AdrKy: number;
    FstNm: string;
    Address: string | null;
    Country: string | null;
    CtPerson: string | null;
    TP1: string | null;
    Fax: string | null;
    Email: string | null;
    Website: string | null;
    VATNo: string | null;
    fVATRegistered: boolean;
}

interface Props {
    supplier: Supplier;
    canDelete?: boolean;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function SupplierEdit({ supplier, flash, canDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { data, setData, put, processing, errors, reset } = useForm({
        FstNm: supplier.FstNm || '',
        Address: supplier.Address || '',
        Country: supplier.Country || '',
        CtPerson: supplier.CtPerson || '',
        TP1: supplier.TP1 || '',
        Fax: supplier.Fax || '',
        Email: supplier.Email || '',
        Website: supplier.Website || '',
        fVATRegistered: Boolean(supplier.fVATRegistered),
        VATNo: supplier.VATNo || '',
    });

    const [showVatField, setShowVatField] = useState(Boolean(supplier.fVATRegistered));

    useEffect(() => {
        setShowVatField(Boolean(supplier.fVATRegistered));
    }, [supplier.fVATRegistered]);

    const handleVatCheckboxChange = (checked: boolean) => {
        setData('fVATRegistered', checked);
        setShowVatField(checked);
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        put(update.url(supplier.AdrKy));
    };

    const handleReset = () => {
        reset();
        setShowVatField(supplier.fVATRegistered || false);
    };

    const handleDelete = () => {
        setIsDeleting(true);
    };

    const confirmDelete = () => {
        router.delete(`/suppliers/${supplier.AdrKy}`, {
            onSuccess: () => {
                setIsDeleting(false);
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Suppliers', href: '/suppliers' },
        { title: 'Edit', href: `/suppliers/${supplier.AdrKy}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Supplier" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start space-x-3 sm:items-center">
                                <Link
                                    href={`/suppliers/${supplier.AdrKy}`}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Edit className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold text-white sm:text-xl">
                                        Edit Supplier
                                    </h1>
                                    <p className="truncate text-xs text-white/80 sm:text-sm">
                                        {supplier.FstNm}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6 lg:p-8">
                        {/* Success/Error Messages */}
                        {flash?.success && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                <div className="flex">
                                    <div className="shrink-0">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
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

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                {/* Left Column */}
                                <div className="space-y-8">
                                    {/* Company Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Building className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">Company Information</h2>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <Truck className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Supplier Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={data.FstNm}
                                                onChange={(e) => setData('FstNm', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Supplier or Company name"
                                                required
                                            />
                                            {errors.FstNm && (
                                                <p className="mt-1 text-sm text-red-600">{errors.FstNm}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Address Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <MapPin className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">Address Information</h2>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Address
                                            </label>
                                            <textarea
                                                value={data.Address}
                                                onChange={(e) => setData('Address', e.target.value)}
                                                rows={3}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Full address"
                                            />
                                            {errors.Address && (
                                                <p className="mt-1 text-sm text-red-600">{errors.Address}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Country</label>
                                            <input
                                                type="text"
                                                value={data.Country}
                                                onChange={(e) => setData('Country', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Country"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-8">
                                    {/* Contact Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Phone className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">Contact Information</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <User className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    Contact Person
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.CtPerson}
                                                    onChange={(e) => setData('CtPerson', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Name"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Phone className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={data.TP1}
                                                    onChange={(e) => setData('TP1', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Phone number"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Mail className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={data.Email}
                                                    onChange={(e) => setData('Email', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Email address"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Globe className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    Website
                                                </label>
                                                <input
                                                    type="url"
                                                    value={data.Website}
                                                    onChange={(e) => setData('Website', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Website URL"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* VAT Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <FileText className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-lg font-semibold text-slate-800 sm:text-xl">VAT Information</h2>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <input
                                                    id="vat-registered"
                                                    type="checkbox"
                                                    checked={data.fVATRegistered}
                                                    onChange={(e) => handleVatCheckboxChange(e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue/20"
                                                />
                                                <label htmlFor="vat-registered" className="text-sm font-semibold text-slate-800">
                                                    VAT Registered
                                                </label>
                                            </div>

                                            {showVatField && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                                        <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                        VAT Number *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={data.VATNo}
                                                        onChange={(e) => setData('VATNo', e.target.value)}
                                                        className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                        placeholder="Enter VAT number"
                                                        required={data.fVATRegistered}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end sm:items-center">
                                {canDelete && (
                                    <Button
                                        type="button"
                                        onClick={handleDelete}
                                        variant="outline"
                                        className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 px-6 py-3 font-medium sm:w-auto sm:mr-auto"
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            <Trash2 className="h-4 w-4" />
                                            <span>Delete Supplier</span>
                                        </div>
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={processing}
                                    variant="outline"
                                    className="w-full rounded-xl px-6 py-3 font-medium sm:w-auto"
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <RotateCcw className="h-4 w-4" />
                                        <span>Reset</span>
                                    </div>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded-xl bg-vismass-blue px-8 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-vismass-blue/90 sm:w-auto"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Updating...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Save className="w-5 h-5" />
                                            <span>Update Supplier</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-slate-600">
                        <p className="text-sm">Keep your supplier information up to date • Manage your procurement network efficiently</p>
                    </div>
                </main>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleting}
                onClose={() => setIsDeleting(false)}
                onConfirm={confirmDelete}
                title={t('Delete Supplier')}
                message={`${t('Are you sure you want to delete supplier')} "${supplier.FstNm}"? ${t('This action cannot be undone and will fail if the supplier has transaction history.')}`}
                type="danger"
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
            />
        </AppLayout>
    );
}
