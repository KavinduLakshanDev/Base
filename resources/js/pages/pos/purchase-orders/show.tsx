import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Head, Link } from '@inertiajs/react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Download, Package, ListOrdered, Info } from 'lucide-react';

const statusColor: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-green-100 text-green-800',
    Completed: 'bg-blue-100 text-blue-800',
    Cancelled: 'bg-red-100 text-red-800',
};

export default function Show({ purchaseOrder }: any) {
    return (
        <AppSidebarLayout breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Purchase Orders', href: '/pos/purchase-orders' },
            { title: purchaseOrder.purchase_order_no, href: '#' }
        ]}>
            <div className="min-h-screen bg-slate-50">
                <Head title={`Purchase Order ${purchaseOrder.purchase_order_no}`} />

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
                                    <Eye className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Purchase Order: {purchaseOrder.purchase_order_no}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        View purchase order details
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0">
                                    <Link href={`/pos/purchase-orders/${purchaseOrder.id}/edit`}>
                                        Edit Order
                                    </Link>
                                </Button>
                                <Button asChild className="bg-white text-vismass-blue hover:bg-slate-100">
                                    <a href={`/pos/purchase-orders/${purchaseOrder.id}/download-pdf`} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" /> Download PDF
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-8">

                        {/* Order Information */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                    <Info className="w-5 h-5 text-vismass-blue" />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800">Order Information</h2>
                            </div>

                            <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-3">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Item Type</p>
                                    <p className="font-semibold capitalize">{purchaseOrder.item_type || 'Product'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Supplier</p>
                                    <p className="font-semibold">{purchaseOrder.supplier_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Date</p>
                                    <p className="font-semibold">{purchaseOrder.date}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Status</p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor[purchaseOrder.status] || 'bg-gray-100 text-gray-800'}`}>
                                        {purchaseOrder.status}
                                    </span>
                                </div>
                                {purchaseOrder.description && (
                                    <div className="sm:col-span-3 space-y-1">
                                        <p className="text-sm text-slate-500">Description</p>
                                        <p className="font-semibold">{purchaseOrder.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="pt-6 border-t border-slate-200">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                    <Package className="w-5 h-5 text-vismass-blue" />
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800">Order Items</h2>
                            </div>

                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase bg-slate-700 text-white">
                                    <tr>
                                        <th className="px-4 py-3">#</th>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3 text-right">Qty</th>
                                        <th className="px-4 py-3 text-right">Unit Price</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchaseOrder.items.map((item: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                                            <td className="px-4 py-2 font-medium">{item.product_name}</td>
                                            <td className="px-4 py-2 text-right">{Number(item.qty).toFixed(0)}</td>
                                            <td className="px-4 py-2 text-right">{Number(item.unit_price).toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right font-semibold text-slate-800">
                                                Rs {Number(item.line_total).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
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
                                                    {Number(purchaseOrder.cost_total).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            <tr className="border-b border-slate-200">
                                                <td className="py-2 px-4 font-medium text-slate-600">TAX RATE {purchaseOrder.vat_rate}%</td>
                                                <td className="py-2 px-4 text-right font-semibold text-amber-600">
                                                    {Number(purchaseOrder.tax_amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            <tr className="bg-vismass-blue text-white">
                                                <td className="py-3 px-4 font-bold text-base">TOTAL</td>
                                                <td className="py-3 px-4 text-right font-bold text-base">
                                                    {Number(purchaseOrder.grand_total).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}
