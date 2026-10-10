import { Head, Link } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit3, Power, Printer } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { t } from '@/lib/i18n';

interface Printer {
    ItmKy: number;
    ItemCode: string;
    ItmNm: string;
    CosPri: number;
    SlsPri: number;
    brand_id?: number;
    brand?: {
        id: number;
        name: string;
    };
    SupKey?: number;
    VATItem?: boolean | number;
    RtDis1?: number;
    created_at: string;
    updated_at: string;
}

interface ShowProps {
    printer: Printer;
}

export default function Show({ printer }: ShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        // { title: 'POS', href: '/pos' },
        { title: 'Printer Registration', href: '/pos/printers' },
        { title: printer.ItmNm, href: '#' },
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={`${printer.ItmNm} - Printer`} />

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
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {printer.ItmNm}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        View printer details and information
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
                                    Printer Details
                                </h2>
                            </div>
                            <p className="text-sm text-slate-600 sm:text-base">
                                View complete details, pricing, and status of this printer record.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:gap-6">
                            {/* Main Details Card */}
                            <Card className="rounded-xl border border-slate-200 shadow-sm sm:rounded-2xl">
                                <CardHeader className="pb-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="font-mono">
                                                    {printer.ItemCode}
                                                </Badge>
                                                <Badge variant="secondary">
                                                    PRINTER
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                            <Link href={`/pos/printers/${printer.ItmKy}/edit`}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full gap-2 sm:w-auto"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                    Edit
                                                </Button>
                                            </Link>
                                            <form
                                                method="POST"
                                                action={`/pos/printers/${printer.ItmKy}/toggle`}
                                                onSubmit={(e) => {
                                                    if (!confirm('Toggle printer activation status?')) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                            >
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full gap-2 sm:w-auto"
                                                >
                                                    <Power className="h-4 w-4" />
                                                    Toggle
                                                </Button>
                                            </form>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Basic Information */}
                                    <div className="space-y-2">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-500">
                                                    Printer Code
                                                </label>
                                                <p className="text-base font-mono font-semibold">
                                                    {printer.ItemCode}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-500">
                                                    Brand
                                                </label>
                                                <p className="text-base">
                                                    {printer.brand?.name || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing Information */}
                                    <div className="border-t pt-4">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-4">
                                            Pricing Information
                                        </h3>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-500">
                                                    Cost Price
                                                </label>
                                                <p className="text-lg font-semibold text-slate-900">
                                                   Rs. {parseFloat(printer.CosPri.toString()).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-500">
                                                    Retail Price
                                                </label>
                                                <p className="text-lg font-semibold text-slate-900">
                                                    Rs. {parseFloat(printer.SlsPri.toString()).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-500">
                                                    Customer Discount
                                                </label>
                                                <p className="text-lg font-semibold text-red-600">
                                                    Rs. {parseFloat((printer.RtDis1 || 0).toString()).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Information */}
                                    <div className="border-t pt-4">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-4">
                                            Additional Information
                                        </h3>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-500">
                                                    VAT Applicable
                                                </label>
                                                <p className="text-base">
                                                    {printer.VATItem ? 'Yes' : 'No'}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-500">
                                                    Registered
                                                </label>
                                                <p className="text-base">
                                                    {formatDate(printer.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Back Button */}
                        <div className="mt-2">
                            <Link href="/pos/printers">
                                <Button variant="outline" className="w-full gap-2 sm:w-auto">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to List
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-6 text-center text-slate-600 sm:mt-8">
                            <p className="text-sm">Manage your printer inventory • Keep printer records up to date</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}
