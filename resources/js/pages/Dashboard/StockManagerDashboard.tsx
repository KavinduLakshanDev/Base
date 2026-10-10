import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { AlertCircle, Package, ArrowRightLeft, Trash2, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface KPI {
    total_items: number;
    low_stock_alerts: number;
    todays_transfers: number;
    monthly_wastage: number;
}

interface CriticalReorderItem {
    item_code: string;
    item_name: string;
    current_stock: number;
    reorder_level: number;
}

interface RecentTransfer {
    id: number;
    transfer_no: string;
    date: string;
    status: string;
}

interface StockManagerStats {
    kpis: KPI;
    critical_reorder_list: CriticalReorderItem[];
    recent_transfers: RecentTransfer[];
}

export default function StockManagerDashboard({ stats }: { stats: StockManagerStats }) {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Stock Manager Dashboard</h1>

            {/* Top KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{stats.kpis.low_stock_alerts}</div>
                        <p className="text-xs text-muted-foreground">Items below reorder level</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpis.total_items}</div>
                        <p className="text-xs text-muted-foreground">Tracked in inventory</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Transfers</CardTitle>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpis.todays_transfers}</div>
                        <p className="text-xs text-muted-foreground">Transfers processed today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Wastage</CardTitle>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rs. {stats.kpis.monthly_wastage.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Value this month</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap gap-4">
                <Button asChild>
                    <Link href="/stock-transfers/create">
                        <Plus className="mr-2 h-4 w-4" /> New Stock Transfer
                    </Link>
                </Button>
                <Button variant="secondary" asChild>
                    <Link href="/wastages/create">
                        <Plus className="mr-2 h-4 w-4" /> Record Wastage
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/stock-adjustments/create">
                        <Plus className="mr-2 h-4 w-4" /> Stock Adjustment
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/reports/stock-movement">
                        View Bin Card
                    </Link>
                </Button>
            </div>

            {/* Data Tables */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Critical Reorder List</CardTitle>
                        <CardDescription>Top 10 items furthest below their reorder level.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.critical_reorder_list.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-right">Reorder At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.critical_reorder_list.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <div className="font-medium">{item.item_name}</div>
                                                <div className="text-xs text-muted-foreground">{item.item_code}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-destructive">
                                                {item.current_stock}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.reorder_level}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground border rounded">
                                No items are below their reorder levels.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Stock Transfers</CardTitle>
                        <CardDescription>Last 5 transfers initialized.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.recent_transfers.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Transfer No</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.recent_transfers.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell className="font-medium">{t.transfer_no}</TableCell>
                                            <TableCell>{t.date}</TableCell>
                                            <TableCell className="capitalize">{t.status}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground border rounded">
                                No recent transfers.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
