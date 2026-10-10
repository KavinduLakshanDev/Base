import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface PointSummary {
    company_code: string;
    section_code: string;
    customer_code: string;
    customer_name: string;
    total_points: number;
}

interface Props {
    pointsSummary: PointSummary[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Privilege Points',
        href: '/privilege-points',
    },
];

export default function Index({ pointsSummary }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Privilege Points" />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="flex items-center justify-between">
                     <div>
                        <h2 className="text-2xl font-bold tracking-tight">Privilege Points Summary</h2>
                        <p className="text-muted-foreground">
                            Overview of accumulated points per customer.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                         <CardTitle>Points Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead className="text-right">Total Points</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pointsSummary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No points data found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pointsSummary.map((item) => (
                                        <TableRow key={`${item.company_code}-${item.section_code}-${item.customer_code}`}>
                                            <TableCell>
                                                <div className="font-medium">{item.customer_name}</div>
                                                <div className="text-xs text-muted-foreground">{item.customer_code}</div>
                                            </TableCell>
                                            <TableCell>{item.section_code}</TableCell>
                                            <TableCell className="text-right font-bold">{item.total_points}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/privilege-points/${item.company_code}/${item.section_code}/${item.customer_code}`}>
                                                        <Eye className="h-4 w-4" />
                                                        <span className="sr-only">View Details</span>
                                                    </Link>
                                                </Button>
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
