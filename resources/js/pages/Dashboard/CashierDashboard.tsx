import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { AlertCircle, CreditCard, DollarSign, Package, ShoppingCart, TrendingUp, Wrench, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
    todays_sales: {
        total: number;
        count: number;
        returns: number;
        net_total: number;
        split: {
            cash: number;
            card: number;
            cheque: number;
            bank_transfer: number;
            points: number;
            credit: number;
        };
    };
    ready_for_collection: number;
    low_stock_items: {
        item_code: string;
        name: string;
        current_stock: number;
        reorder_level: number;
    }[];
    top_selling_items: {
        item_code: string;
        item_name: string;
        total_qty: number;
        total_amount: number;
    }[];
    recent_transactions: {
        id: number;
        invoice_no: string;
        customer_name: string;
        amount: number;
        time: string;
        status: string;
    }[];
}

export default function CashierDashboard({ stats }: { stats: DashboardStats }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatTime = (timeString: string) => {
        try {
            return new Date(timeString).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return timeString;
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return {
                    variant: 'default' as const,
                    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
                    icon: CheckCircle2,
                };
            case 'pending':
                return {
                    variant: 'secondary' as const,
                    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200',
                    icon: Clock,
                };
            default:
                return {
                    variant: 'outline' as const,
                    className: 'bg-slate-100 text-slate-700',
                    icon: XCircle,
                };
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 px-3 py-4 sm:p-6 lg:p-8">
            {/* Header Section */}
            <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                        Dashboard Overview
                    </h1>
                    <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                        Monitor your store performance and operations in real-time
                    </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    <Button asChild size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30">
                        <Link href={route('sales.create')}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            New Sale
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full border-2 hover:bg-slate-50 sm:w-auto">
                        <Link href={route('service-jobs.create')}>
                            <Wrench className="mr-2 h-4 w-4" />
                            New Job
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-4 grid gap-3 sm:mb-6 sm:gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Sales</CardTitle>
                        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        <div className="text-2xl font-semibold text-slate-900">{formatCurrency(stats.todays_sales.total)}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-slate-400" />
                                {stats.todays_sales.count} transactions
                            </p>
                            {stats.todays_sales.returns > 0 && (
                                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-100 py-0 h-4">
                                    Returns: {formatCurrency(stats.todays_sales.returns)}
                                </Badge>
                            )}
                        </div>
                        {stats.todays_sales.returns > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1">
                                Net: {formatCurrency(stats.todays_sales.net_total)}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Payment Split</CardTitle>
                        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
                            <CreditCard className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        <div className="space-y-1.5 max-h-[120px] overflow-auto pr-1 custom-scrollbar">
                            {Object.entries(stats.todays_sales.split).map(([key, value]) => {
                                if (value === 0) return null;
                                const label = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                                return (
                                    <div key={key} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">{label}:</span>
                                        <span className="font-semibold text-slate-900">{formatCurrency(value)}</span>
                                    </div>
                                );
                            })}
                            {Object.values(stats.todays_sales.split).every(v => v === 0) && (
                                <div className="text-center py-4 text-xs text-slate-400 italic">
                                    No payments recorded today
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ready for Collection</CardTitle>
                        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
                            <Package className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        <div className="text-2xl font-semibold text-slate-900">{stats.ready_for_collection}</div>
                        <p className="text-xs text-slate-500 mt-2">Service jobs completed</p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">System Status</CardTitle>
                        <div className="p-2 rounded-md bg-slate-50">
                            {stats.low_stock_items.length > 0 ? (
                                <AlertCircle className="h-5 w-5 text-rose-500" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        {stats.low_stock_items.length > 0 ? (
                            <>
                                <div className="text-2xl font-semibold text-rose-600">{stats.low_stock_items.length}</div>
                                <p className="text-xs text-slate-500 mt-2">Low Stock Alerts</p>
                            </>
                        ) : (
                            <>
                                <div className="text-lg font-semibold text-slate-700">All Systems Go</div>
                                <p className="text-xs text-slate-500 mt-2">No critical alerts</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                {/* Recent Transactions */}
                <Card className="lg:col-span-2 border-0 shadow-lg">
                    <CardHeader className="border-b bg-slate-50/50">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <CardTitle className="text-lg sm:text-xl">Recent Transactions</CardTitle>
                                <CardDescription className="mt-1">
                                    Latest sales processed today
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="w-full sm:w-auto">
                                <Link href={route('sales.index')}>View All</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4 md:hidden">
                            {stats.recent_transactions.length > 0 ? (
                                stats.recent_transactions.map((sale) => {
                                    const statusConfig = getStatusConfig(sale.status);
                                    const StatusIcon = statusConfig.icon;
                                    return (
                                        <div key={sale.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold">{sale.invoice_no}</p>
                                                    <p className="text-xs text-slate-500">{sale.customer_name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold">{formatCurrency(sale.amount)}</p>
                                                    <p className="text-xs text-slate-500">{formatTime(sale.time)}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <Badge variant={statusConfig.variant} className={`${statusConfig.className} gap-1`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {sale.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <ShoppingCart className="h-8 w-8 text-slate-300" />
                                        <p>No transactions found today</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="hidden max-h-[500px] overflow-auto md:block">
                            <Table className="min-w-[760px]">
                                <TableHeader className="sticky top-0 bg-slate-50 z-10">
                                    <TableRow>
                                        <TableHead className="font-semibold">Invoice</TableHead>
                                        <TableHead className="font-semibold">Customer</TableHead>
                                        <TableHead className="font-semibold">Time</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="text-right font-semibold">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.recent_transactions.length > 0 ? (
                                        stats.recent_transactions.map((sale) => {
                                            const statusConfig = getStatusConfig(sale.status);
                                            const StatusIcon = statusConfig.icon;
                                            return (
                                                <TableRow key={sale.id} className="hover:bg-slate-50 transition-colors">
                                                    <TableCell className="font-mono text-sm font-medium">{sale.invoice_no}</TableCell>
                                                    <TableCell className="font-medium">{sale.customer_name}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {formatTime(sale.time)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={statusConfig.variant} className={`${statusConfig.className} gap-1`}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {sale.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">{formatCurrency(sale.amount)}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <ShoppingCart className="h-8 w-8 text-slate-300" />
                                                    <p>No transactions found today</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Side Widgets */}
                <div className="flex flex-col gap-6">
                    {/* Low Stock Alerts */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    Low Stock Alerts
                                </CardTitle>
                                {stats.low_stock_items.length > 0 && (
                                    <Badge variant="destructive">{stats.low_stock_items.length}</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 sm:pt-6">
                            <div className="max-h-[240px] space-y-3 overflow-auto sm:max-h-[200px] sm:space-y-4">
                                {stats.low_stock_items.length > 0 ? (
                                    stats.low_stock_items.map((item, index) => (
                                        <div 
                                            key={`low-stock-${item.item_code}-${index}`}
                                            className={`flex items-start justify-between rounded-lg border border-rose-100 bg-rose-50 p-3 transition-colors hover:bg-rose-100 ${
                                                index !== stats.low_stock_items.length - 1 ? 'mb-3' : ''
                                            }`}
                                        >
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <p className="text-sm font-semibold leading-none truncate">{item.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{item.item_code}</p>
                                            </div>
                                            <div className="ml-3 text-right sm:ml-4">
                                                <div className="text-base font-bold text-rose-600 sm:text-lg">{item.current_stock}</div>
                                                <div className="text-xs text-muted-foreground">Min: {item.reorder_level}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Selling Items */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                Top Selling Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 sm:pt-6">
                            <div className="max-h-[240px] space-y-3 overflow-auto sm:max-h-[200px] sm:space-y-4">
                                {stats.top_selling_items.length > 0 ? (
                                    stats.top_selling_items.map((item, index) => (
                                        <div 
                                            key={`top-selling-${item.item_code}-${index}`}
                                            className={`flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-3 transition-colors hover:bg-blue-100 ${
                                                index !== stats.top_selling_items.length - 1 ? 'mb-3' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <p className="text-sm font-semibold leading-none truncate">{item.item_name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatCurrency(item.total_amount)}</p>
                                                </div>
                                            </div>
                                            <div className="ml-3 text-right sm:ml-4">
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                    {item.total_qty} sold
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">No sales data yet today</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
