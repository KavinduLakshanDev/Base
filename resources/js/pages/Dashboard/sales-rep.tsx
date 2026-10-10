import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { Truck, CreditCard, CheckCircle, Calendar, User, MapPin, DollarSign, Eye, PieChartIcon, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Props extends SharedData {
    stats: any;
}

export default function SalesRepDashboard() {
    const { auth, stats } = usePage<Props>().props;

    const fmt = (v: number | string | undefined | null) => {
        const n = typeof v === 'number' ? v : parseFloat(String(v || 0));
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const markDelivered = (id: number) => {
        if (!confirm('Mark this delivery as delivered?')) return;
        router.patch(`/deliveries/${id}/status`, { status: 'delivered' });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Sales Rep Dashboard', href: '/dashboard/sales-rep' }]}>
            <Head title="Sales Rep Dashboard" />

            <div className="p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Sales Representative Dashboard</h1>
                        <p className="text-sm text-slate-500 mt-1">Overview of your deliveries, collections and van stock</p>
                    </div>
                    <div className="text-left lg:text-right">
                        <div className="text-sm font-semibold">{auth.user?.name || ''}</div>
                        <div className="text-xs text-slate-400">Sales Representative</div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500">Total Deliveries</div>
                        <div className="mt-2 text-xl font-bold text-slate-900">{stats.assigned_count}</div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500">Assigned</div>
                        <div className="mt-2 text-xl font-bold text-amber-600">{stats.assigned_status_count}</div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500">In Transit</div>
                        <div className="mt-2 text-xl font-bold text-blue-600">{stats.in_transit_count}</div>
                    </div>

                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                        <div className="text-xs text-slate-500">Delivered</div>
                        <div className="mt-2 text-xl font-bold text-green-600">{stats.delivered_count}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent deliveries */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Your Deliveries</h3>
                            <div className="text-sm text-slate-500">Quick actions: mark delivered · record payment</div>
                        </div>

                        {stats.recent_deliveries && stats.recent_deliveries.length > 0 ? (
                            <>
                                <div className="md:hidden space-y-4 px-4 py-4">
                                    {stats.recent_deliveries.map((d: any) => (
                                        <div key={d.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-semibold">{d.delivery_number}</p>
                                                        <p className="text-xs text-slate-500">{d.customer_name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold">{fmt(d.total_amount)}</p>
                                                        <p className="text-xs text-slate-500">{d.delivery_date ?? '—'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <span className="text-xs font-medium text-slate-700 capitalize">{d.status}</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Link href={`/deliveries/${d.id}`} className="text-vismass-blue text-xs font-medium">View</Link>
                                                        {d.status !== 'delivered' && (
                                                            <button onClick={() => markDelivered(d.id)} className="text-green-600 text-xs font-medium">Mark delivered</button>
                                                        )}
                                                        <Link href={`/deliveries/${d.id}#payments`} className="text-slate-600 text-xs font-medium">Record payment</Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Delivery #</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Outstanding</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {stats.recent_deliveries.map((d: any) => (
                                                <tr key={d.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{d.delivery_number}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-700">{d.customer_name}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-700">{d.delivery_date ?? '—'}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{fmt(d.total_amount)}</td>
                                                    <td className="px-4 py-3 text-sm text-rose-600 text-right">{fmt(d.outstanding)}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-700 capitalize">{d.status}</td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <Link href={`/deliveries/${d.id}`} className="text-vismass-blue" title="View"><Eye className="w-4 h-4" /></Link>
                                                            {d.status !== 'delivered' && (
                                                                <button onClick={() => markDelivered(d.id)} className="text-green-600 text-sm">Mark delivered</button>
                                                            )}
                                                            <Link href={`/deliveries/${d.id}#payments`} className="text-slate-600 text-sm">Record payment</Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-slate-400">No deliveries assigned to you.</div>
                        )}
                    </div>

                    {/* Side panel: Collections & Vehicle */}
                    <aside className="space-y-6">
                        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-slate-500" />
                                    <div className="text-sm font-semibold">Collections & Returns</div>
                                </div>
                                <div className="text-xs text-slate-400">Today</div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Collected (All Methods)</span>
                                    <span className="text-sm font-bold text-slate-700">LKR {fmt(stats.todays_collections)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                                    <span className="text-xs text-slate-500">Shop Returns (Value)</span>
                                    <span className="text-sm font-bold text-rose-600">LKR {fmt(stats.todays_returns)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-50 pt-2">
                                    <span className="text-xs text-slate-500">Net Cash in Hand</span>
                                    <span className="text-sm font-bold text-emerald-600">LKR {fmt(stats.todays_cash)}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 border-t border-slate-50 pt-2">
                                    Outstanding: LKR {fmt(stats.outstanding_total)}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChartIcon className="w-4 h-4 text-slate-500" />
                                <div className="text-sm font-semibold">Delivery Progress</div>
                            </div>
                            
                            {stats.assigned_count > 0 ? (
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Pending', value: stats.assigned_status_count, color: '#f59e0b' },
                                                    { name: 'In Transit', value: stats.in_transit_count, color: '#3b82f6' },
                                                    { name: 'Delivered', value: stats.delivered_count, color: '#10b981' }
                                                ].filter(d => d.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={65}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {([
                                                    { name: 'Pending', value: stats.assigned_status_count, color: '#f59e0b' },
                                                    { name: 'In Transit', value: stats.in_transit_count, color: '#3b82f6' },
                                                    { name: 'Delivered', value: stats.delivered_count, color: '#10b981' }
                                                ].filter(d => d.value > 0)).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                formatter={(value) => [value, 'Deliveries']}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
                                    <PieChartIcon className="w-8 h-8 opacity-20" />
                                    <span className="text-sm">No active deliveries today</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-4 h-4 text-slate-500" />
                                <div className="text-sm font-semibold">Financial Overview</div>
                            </div>
                            
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: 'Collections', value: stats.todays_collections, color: '#34d399' },
                                            { name: 'Returns', value: stats.todays_returns, color: '#fb7185' },
                                            { name: 'Outstanding', value: stats.outstanding_total, color: '#94a3b8' }
                                        ]}
                                        margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => `LKR ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`} />
                                        <RechartsTooltip 
                                            formatter={(value: number | undefined) => ['LKR ' + fmt(value ?? 0), '']}
                                            labelStyle={{ display: 'none' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                            {[
                                                { color: '#34d399' },
                                                { color: '#fb7185' },
                                                { color: '#94a3b8' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
