import React from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Customer {
    customer_code: string;
    privCusName: string;
}

interface PointTransaction {
    id: number;
    pointDate: string;
    pointAmount: number;
    pointType: string;
    ordNo: string;
    claimed: boolean;
    status: string;
    tabelKey: string;
    entuser: string;
}

interface Summary {
    total_points: number;
    claimed_points: number;
    available_points: number;
}

interface Props {
    customer: Customer;
    pointHistory: PointTransaction[];
    summary: Summary;
}

export default function Show({ customer, pointHistory, summary }: Props) {
     const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Privilege Points',
            href: '/privilege-points',
        },
        {
            title: customer?.privCusName || 'Customer Details',
            href: '#',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Points - ${customer?.privCusName}`} />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">{customer?.privCusName}</h2>
                    <p className="text-muted-foreground">
                        Customer Code: {customer?.customer_code}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_points}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Claimed Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{summary.claimed_points}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{summary.available_points}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                     <CardHeader>
                        <CardTitle>History</CardTitle>
                        <CardDescription>Recent point transactions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Order No</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pointHistory.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            No history found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pointHistory.map((point) => (
                                        <TableRow key={point.id}>
                                            <TableCell>{point.pointDate}</TableCell>
                                            <TableCell>{point.ordNo || '-'}</TableCell>
                                            <TableCell>{point.pointType}</TableCell>
                                            <TableCell className={`text-right font-medium ${point.claimed ? 'text-red-500' : 'text-green-600'}`}>
                                                {point.pointAmount}
                                            </TableCell>
                                            <TableCell>
                                                {point.claimed ? (
                                                    <Badge variant="destructive">Claimed</Badge>
                                                ) : (
                                                    <Badge variant="outline">Active</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
