import { Head, Link, router } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Receipt } from 'lucide-react';

declare const route: (name: string, params?: any) => string;

interface Props {
    customerReturn: any;
    company: any;
}

export default function Show({ customerReturn, company }: Props) {
    const breadcrumbs = [
        { title: 'Home', href: '/company/dashboard' },
        { title: 'Customer Returns', href: '/customer-returns' },
        { title: customerReturn.return_no, href: `/customer-returns/${customerReturn.id}` },
    ];

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            processed: 'secondary',
            completed: 'default',
            cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={`Customer Return - ${customerReturn.return_no}`} />

            {/* header gradient */}
            <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-3 py-4">
                        <div className="flex min-w-0 items-center space-x-3">
                            <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                <Receipt className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-lg sm:text-xl font-bold text-white">Customer Return Details</h1>
                                <p className="text-xs text-white/80">{customerReturn.return_no}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/customer-returns">
                                <Button variant="outline" className="bg-white text-vismass-blue hover:bg-slate-100 border-white px-3 sm:px-4">
                                    <ArrowLeft className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Back to List</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Customer Return Details</h1>
                        <p className="text-muted-foreground">{customerReturn.return_no}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Link href="/customer-returns">
                            <Button variant="outline" className="w-full sm:w-auto">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to List
                            </Button>
                        </Link>
                        <a href={route('customer-returns.receipt', customerReturn.id)} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full sm:w-auto">
                                <Printer className="mr-2 h-4 w-4" />
                                Print Receipt
                            </Button>
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Return Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Return Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Return No</div>
                                        <div className="font-medium">{customerReturn.return_no}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Return Date</div>
                                        <div className="font-medium">
                                            {new Date(customerReturn.return_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Customer</div>
                                        <div className="font-medium">{customerReturn.customer_name}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Original Invoice</div>
                                        <div className="font-medium">{customerReturn.original_invoice_no || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Return Type</div>
                                        <div className="font-medium capitalize">{customerReturn.return_type}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Status</div>
                                        <div>{getStatusBadge(customerReturn.status)}</div>
                                    </div>
                                    {customerReturn.reason && (
                                        <div className="sm:col-span-2">
                                            <div className="text-sm text-muted-foreground">Reason for Return</div>
                                            <div className="font-medium">{customerReturn.reason}</div>
                                        </div>
                                    )}
                                    {customerReturn.notes && (
                                        <div className="sm:col-span-2">
                                            <div className="text-sm text-muted-foreground">Notes</div>
                                            <div className="font-medium">{customerReturn.notes}</div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Returned Items */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Returned Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                <Table className="min-w-[720px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Condition</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customerReturn.items.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium">{item.item_name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {item.serial_number && `SN: ${item.serial_number}`}
                                                        {item.batch_no && `Batch: ${item.batch_no}`}
                                                    </div>
                                                    {item.damage_notes && (
                                                        <div className="text-xs text-red-600 mt-1">
                                                            Damage: {item.damage_notes}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={item.condition === 'good' ? 'default' : 'destructive'}>
                                                        {item.condition}
                                                    </Badge>
                                                    {item.add_to_stock && (
                                                        <div className="text-xs text-green-600 mt-1">Added to stock</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    Rs. {Number(item.unit_price).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    Rs. {Number(item.total_amount).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Panel */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Refund Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Total Return Amount:</span>
                                        <span className="font-medium">
                                            Rs. {Number(customerReturn.total_return_amount).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Refund Method:</span>
                                        <span className="font-medium capitalize">{customerReturn.refund_method}</span>
                                    </div>
                                    {customerReturn.refund_method === 'cash' && (
                                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                                            <span>Cash Refund:</span>
                                            <span className="text-green-600">
                                                Rs. {Number(customerReturn.refund_amount).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    {customerReturn.refund_method === 'exchange' && (
                                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                                            <span>Exchange Value:</span>
                                            <span className="text-blue-600">
                                                Rs. {Number(customerReturn.total_return_amount).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    {customerReturn.refund_method === 'partial' && (
                                        <>
                                            <div className="flex justify-between font-medium border-t pt-2">
                                                <span>Cash Refund:</span>
                                                <span className="text-green-600">
                                                    Rs. {Number(customerReturn.refund_amount).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between font-medium">
                                                <span>Exchange Amount:</span>
                                                <span className="text-blue-600">
                                                    Rs. {Number(customerReturn.exchange_amount).toFixed(2)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Processing Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {customerReturn.processed_by && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Recorded By</div>
                                        <div className="font-medium">
                                            {customerReturn.processed_by.name || `${customerReturn.processed_by.first_name} ${customerReturn.processed_by.last_name}`}
                                        </div>
                                    </div>
                                )}
                                {customerReturn.processed_at && (
                                    <div>
                                        <div className="text-sm text-muted-foreground">Processed at</div>
                                        <div className="font-medium">
                                            {new Date(customerReturn.processed_at).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Stock Impact</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Items Added to Stock:</span>
                                    <span className="font-medium text-green-600">
                                        {customerReturn.items.filter((i: any) => i.add_to_stock).length}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Damaged Items:</span>
                                    <span className="font-medium text-red-600">
                                        {customerReturn.items.filter((i: any) => !i.add_to_stock).length}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppSidebarLayout>
    );
}
