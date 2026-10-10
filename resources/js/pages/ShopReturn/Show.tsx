import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Truck, ArrowLeft, Calendar, User, MapPin, Package, FileText, BarChart3, Hash, CreditCard, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function ShopReturnShow({ shopReturn }: any) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'Deliveries', href: '/deliveries' }, 
            { title: 'Shop Returns', href: '/deliveries/returns' },
            { title: `Return #SR-${shopReturn.id.toString().padStart(6, '0')}`, href: `/deliveries/returns/${shopReturn.id}` }
        ]}>
            <Head title={`Shop Return Detail - #SR-${shopReturn.id}`} />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/deliveries/returns"
                                    className="rounded-xl bg-white/10 p-2.5 text-white hover:bg-white/20 transition-all backdrop-blur-sm border border-white/10"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-2xl font-bold text-white tracking-tight">Return Details</h1>
                                        <span className="px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-100 text-[10px] font-bold uppercase tracking-wider border border-green-500/30 backdrop-blur-md">
                                            {shopReturn.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white/70 flex items-center gap-1.5 mt-1">
                                        <Hash className="h-3.5 w-3.5" /> Reference #SR-{shopReturn.id.toString().padStart(6, '0')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a 
                                    href={`/deliveries/returns/${shopReturn.id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-sm border border-white/20 hover:bg-white/20 transition-all active:scale-95 gap-2"
                                >
                                    <FileText className="h-4 w-4" /> Print PDF
                                </a>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Summary Column */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6 uppercase tracking-wider">
                                    <BarChart3 className="h-4 w-4 text-vismass-blue" /> Overview
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> Return Date</span>
                                        <span className="text-sm font-bold text-slate-900">{format(new Date(shopReturn.return_date), 'MMMM dd, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><MapPin className="h-4 w-4" /> Shop</span>
                                        <span className="text-sm font-bold text-slate-900">{shopReturn.shop?.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Truck className="h-4 w-4" /> Vehicle</span>
                                        <span className="text-sm font-bold text-slate-900">{shopReturn.vehicle?.registration_no || 'Direct to Stock'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><Hash className="h-4 w-4" /> Delivery No</span>
                                        <span className="text-sm font-bold text-slate-900">{shopReturn.delivery?.delivery_number || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Refund Method</span>
                                        <span className="text-sm font-bold text-slate-900 uppercase">{shopReturn.refund_method || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Refund Amount</span>
                                        <span className="text-sm font-bold text-slate-900">Rs. {parseFloat(shopReturn.refund_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-slate-500 flex items-center gap-2"><User className="h-4 w-4" /> Recorded By</span>
                                        <span className="text-sm font-bold text-slate-900">{shopReturn.user?.name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes Section */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 uppercase tracking-wider">
                                    <FileText className="h-4 w-4 text-vismass-blue" /> Internal Notes
                                </h3>
                                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 text-slate-600 text-sm leading-relaxed">
                                    {shopReturn.notes ? (
                                        <p className="whitespace-pre-wrap">{shopReturn.notes}</p>
                                    ) : (
                                        <span className="italic text-slate-400">No notes provided for this return record.</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Items Table Column */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                                        <Package className="h-4 w-4 text-vismass-blue" /> Returned Items
                                    </h3>
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                        {shopReturn.items?.length || 0} Products
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Product / Code</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Batch</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">Quantity</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Unit Price</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right whitespace-nowrap">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {shopReturn.items?.map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col min-w-[200px]">
                                                            <span className="text-sm font-bold text-slate-900">{item.item_name}</span>
                                                            <span className="text-xs text-slate-400 mt-0.5">{item.ItemCode}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                                            {item.batch_no || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                                        <span className="text-sm font-bold text-slate-900">{parseFloat(item.quantity).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        <span className="text-sm text-slate-600">Rs. {parseFloat(item.unit_price).toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        <span className="text-sm font-bold text-slate-900">Rs. {(item.quantity * item.unit_price).toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-50/80 border-t-2 border-slate-200">
                                                <td colSpan={4} className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                                    Total Return Value
                                                </td>
                                                <td className="px-6 py-4 text-right text-lg font-black text-vismass-blue whitespace-nowrap">
                                                    Rs. {shopReturn.items?.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price), 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100/50 flex items-start gap-4">
                                <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-sm flex-shrink-0">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Inventory Action</h4>
                                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                                        Recording this return has automatically credited the above quantities back to the 
                                        <span className="font-semibold text-slate-800">{shopReturn.vehicle_id ? ` vehicle stock (${shopReturn.vehicle?.registration_no})` : ' main section stock'}</span>. 
                                        Delivery balances have been adjusted accordingly.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
