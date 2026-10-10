import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from '@/utils/currency';
import { FileText, Plus, Search, Calendar, Truck, Store, ArrowLeft, Filter, Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface SalesIndexProps {
    deliveries: {
        data: any[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    sections: any[];
    shops: any[];
    filters: {
        date_from?: string;
        date_to?: string;
        section_code?: string;
        shop_id?: string;
        invoice_no?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Direct Delivery Sales', href: '/deliveries/delivery-sales' },
];

export default function SalesIndex({ deliveries, sections, shops, filters }: SalesIndexProps) {
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [sectionCode, setSectionCode] = useState(filters.section_code || 'all');
    const [shopId, setShopId] = useState(filters.shop_id || 'all');
    const [invoiceNo, setInvoiceNo] = useState(filters.invoice_no || '');
    const [shopOpen, setShopOpen] = useState(false);

    const applyFilters = () => {
        router.get('/deliveries/delivery-sales', {
            date_from: dateFrom,
            date_to: dateTo,
            section_code: sectionCode === 'all' ? '' : sectionCode,
            shop_id: shopId === 'all' ? '' : shopId,
            invoice_no: invoiceNo,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setDateFrom('');
        setDateTo('');
        setSectionCode('all');
        setShopId('all');
        setInvoiceNo('');
        router.get('/deliveries/delivery-sales');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Direct Delivery Sales" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        Direct Delivery Sales
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        View and manage all sales made directly from vehicles
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/deliveries/delivery-sales/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">New Direct Sale</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    {/* Deliveries List */}
                    <div className="px-4 sm:px-0">
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">Sales List</h3>
                                        <p className="text-white/80 text-xs mt-0.5">Manage direct delivery sales</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                                        <div className="grid gap-1.5 flex-1 min-w-[150px]">
                                            <Label className="flex items-center gap-2 text-xs font-medium text-gray-700"><FileText className="h-3.5 w-3.5 text-gray-500" /> Invoice No</Label>
                                            <Input type="text" placeholder="Search invoice..." value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="h-9 text-sm" />
                                        </div>
                                        <div className="grid gap-1.5 flex-1 min-w-[150px]">
                                            <Label className="flex items-center gap-2 text-xs font-medium text-gray-700"><Calendar className="h-3.5 w-3.5 text-gray-500" /> Date From</Label>
                                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
                                        </div>
                                        <div className="grid gap-1.5 flex-1 min-w-[150px]">
                                            <Label className="flex items-center gap-2 text-xs font-medium text-gray-700"><Calendar className="h-3.5 w-3.5 text-gray-500" /> Date To</Label>
                                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
                                        </div>
                                        <div className="grid gap-1.5 flex-1 min-w-[150px]">
                                            <Label className="flex items-center gap-2 text-xs font-medium text-gray-700"><Store className="h-3.5 w-3.5 text-gray-500" /> Section</Label>
                                            <Select value={sectionCode} onValueChange={setSectionCode}>
                                                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Sections" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Sections</SelectItem>
                                                    {sections.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.section_code)}>{s.name} ({s.section_code})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5 flex-1 min-w-[150px]">
                                            <Label className="flex items-center gap-2 text-xs font-medium text-gray-700"><Store className="h-3.5 w-3.5 text-gray-500" /> Shop/Customer</Label>
                                            <Popover open={shopOpen} onOpenChange={setShopOpen}>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-vismass-blue disabled:cursor-not-allowed disabled:opacity-50",
                                                            !shopId && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <span className="truncate">
                                                            {shopId && shopId !== 'all' 
                                                                ? shops.find((s) => String(s.id) === shopId)?.name 
                                                                : "All Shops"}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[200px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search shop..." />
                                                        <CommandList>
                                                            <CommandEmpty>No shop found.</CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    value="all"
                                                                    onSelect={() => {
                                                                        setShopId("all")
                                                                        setShopOpen(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            shopId === "all" ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    All Shops
                                                                </CommandItem>
                                                                {shops.map((shop) => (
                                                                    <CommandItem
                                                                        key={shop.id}
                                                                        value={shop.name}
                                                                        onSelect={() => {
                                                                            setShopId(String(shop.id))
                                                                            setShopOpen(false)
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                shopId === String(shop.id) ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {shop.name}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                            <button
                                                onClick={applyFilters}
                                                className="inline-flex items-center justify-center rounded-lg bg-vismass-blue px-3 py-2 text-sm font-medium text-white shadow hover:bg-vismass-blue/90 transition-all h-9"
                                            >
                                                <Search className="mr-1.5 h-3.5 w-3.5" /> Filter
                                            </button>
                                            <button
                                                onClick={resetFilters}
                                                className="inline-flex items-center justify-center rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-300 transition-all h-9"
                                            >
                                                <Filter className="mr-1.5 h-3.5 w-3.5" /> Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                {deliveries.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Invoice #</th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Date</th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Customer / Shop</th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Vehicle</th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">Items</th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">Total Amount</th>
                                                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {deliveries.data.map((delivery) => (
                                                    <tr key={delivery.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">{delivery.delivery_number}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900">{delivery.delivery_date}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs font-medium text-gray-900">{delivery.shop?.name || delivery.customer_name}</div>
                                                            <div className="text-xs text-gray-500">{delivery.customer_phone}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {delivery.vehicle ? (
                                                                <div>
                                                                    <div className="text-xs font-medium text-gray-900">{delivery.vehicle.name}</div>
                                                                    <div className="text-xs text-gray-500">{delivery.vehicle.registration_no}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">N/A</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-right">
                                                            {delivery.items?.length || 0}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-green-600 text-right">
                                                            {formatCurrency(delivery.total_amount || 0)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-center">
                                                            <Link
                                                                href={`/deliveries/${delivery.id}/receipt`}
                                                                target="_blank"
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                title="Receipt"
                                                            >
                                                                <FileText className="mr-1 h-3.5 w-3.5" />
                                                                Receipt
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <FileText className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">No direct delivery sales found</h3>
                                        <p className="text-xs text-gray-500">
                                            Try adjusting your search criteria or create a new sale.
                                        </p>
                                    </div>
                                )}

                                {/* Pagination */}
                                {deliveries.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                                        <div className="text-xs text-gray-500">
                                            Showing <span className="font-medium text-gray-900">{(deliveries.current_page - 1) * 20 + 1}</span> to{' '}
                                            <span className="font-medium text-gray-900">{Math.min(deliveries.current_page * 20, deliveries.total)}</span> of{' '}
                                            <span className="font-medium text-gray-900">{deliveries.total}</span> results
                                        </div>
                                        <div className="flex gap-1">
                                            {deliveries.links.map((link, i) => (
                                                <Link
                                                    key={i}
                                                    href={link.url || '#'}
                                                    className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                                        link.active 
                                                            ? 'bg-vismass-blue text-white' 
                                                            : link.url 
                                                                ? 'text-gray-700 hover:bg-gray-200 bg-gray-100' 
                                                                : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                                    }`}
                                                    preserveState
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS Delivery Management • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}