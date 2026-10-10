import React, { useState } from 'react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, History, AlertCircle, BarChart3, FileCode, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import axios from 'axios';
import { t } from '@/lib/i18n';

interface JobSummary {
    id: number;
    job_number: string;
    received_date: string | null;
    status: string;
    problem_description: string;
    technician_name: string;
    customer_name: string;
    total_amount: number;
}

interface DeviceSummary {
    brand: string;
    model: string;
    warranty: string;
    serial: string;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Device Service History', href: '/reports/device-service-history' },
];

export default function DeviceServiceHistoryReport() {
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState<JobSummary[]>([]);
    const [deviceSummary, setDeviceSummary] = useState<DeviceSummary | null>(null);
    const [error, setError] = useState('');

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!serial.trim()) {
            setError(t('Please enter a serial number to search.'));
            return;
        }

        setLoading(true);
        setError('');
        setJobs([]);
        setDeviceSummary(null);

        try {
            const response = await axios.get('/reports/device-service-history/search', {
                params: { serial: serial.trim() }
            });

            if (response.data.success) {
                setJobs(response.data.data);
                setDeviceSummary(response.data.device_summary);
            } else {
                setError(response.data.message || t('No service history found.'));
            }
        } catch (err: any) {
            setError(err.response?.data?.message || t('Failed to fetch service history.'));
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (exportFormat: 'pdf' | 'excel') => {
        if (!serial.trim()) {
            toast.error(t('Please search for a serial number first'));
            return;
        }
        
        if (jobs.length === 0) {
            toast.error(t('No service history to export'));
            return;
        }

        const params = new URLSearchParams();
        params.append('serial', serial.trim());
        params.append('format', exportFormat);

        window.location.href = `/reports/device-service-history/export?${params.toString()}`;
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Printer Service History')} />
            
            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <History className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Printer Service History')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('Search and view the complete service lifecycle of any printer by its serial number')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Printer Service History')}</h3>
                                    </div>
                                    <div className="text-white/80 text-sm whitespace-nowrap">{t('Date')}: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                {/* Search Section */}
                                <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200 no-print">
                                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="grid w-full max-w-sm items-center gap-1.5">
                                            <Label htmlFor="serial" className="text-slate-700">{t('Serial Number')}</Label>
                                            <Input 
                                                type="text" 
                                                id="serial" 
                                                placeholder={t("e.g. SN123456789")} 
                                                value={serial}
                                                onChange={(e) => setSerial(e.target.value)}
                                                autoComplete="off"
                                                className="bg-white border-gray-300 focus:ring-vismass-blue focus:border-vismass-blue"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex items-center justify-center bg-vismass-blue text-white px-5 py-2 text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-70 h-10"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/> {t('Searching...')}</span>
                                            ) : (
                                                <span className="flex items-center gap-2"><Search className="h-4 w-4" /> {t('Search')}</span>
                                            )}
                                        </button>
                                    </form>
                                    
                                    {error && (
                                        <Alert variant="destructive" className="mt-4 max-w-lg bg-red-50 border-red-200 text-red-800">
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                            <AlertTitle className="text-red-800">{t('Notice')}</AlertTitle>
                                            <AlertDescription className="text-red-700">{error}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                {deviceSummary && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                        <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200 md:col-span-4">
                                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                                                <div className="flex items-center gap-2">
                                                    <FileCode className="h-5 w-5 text-vismass-blue" />
                                                    <CardTitle className="text-lg text-slate-800">{t('Device Profile')}</CardTitle>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 pb-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Brand')}</p>
                                                        <p className="font-semibold text-slate-800 mt-1">{deviceSummary.brand || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Model')}</p>
                                                        <p className="font-semibold text-slate-800 mt-1">{deviceSummary.model || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Serial Number')}</p>
                                                        <p className="font-bold text-vismass-blue mt-1">{deviceSummary.serial}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Warranty')}</p>
                                                        <p className="font-semibold text-slate-800 mt-1">{deviceSummary.warranty || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {jobs.length > 0 && (
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardHeader className="bg-gradient-to-r from-slate-100 to-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b">
                                            <CardTitle className="text-slate-800 flex items-center">
                                                <BarChart3 className="mr-2 h-5 w-5 text-vismass-blue" />
                                                {t('Service History')} <span className="ml-2 text-sm font-normal text-slate-500">({jobs.length} {t('Records')})</span>
                                            </CardTitle>
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    onClick={() => handleExport('pdf')}
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                                                >
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    {t('Export PDF')}
                                                </Button>
                                                <Button
                                                    onClick={() => handleExport('excel')}
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    {t('Export Excel')}
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <Table className="min-w-[980px]">
                                                    <TableHeader className="bg-slate-50">
                                                        <TableRow>
                                                            <TableHead>{t('#')}</TableHead>
                                                            <TableHead>{t('Date')}</TableHead>
                                                            <TableHead>{t('Job Number')}</TableHead>
                                                            <TableHead>{t('Customer')}</TableHead>
                                                            <TableHead>{t('Problem')}</TableHead>
                                                            <TableHead>{t('Technician')}</TableHead>
                                                            <TableHead className="text-center">{t('Status')}</TableHead>
                                                            <TableHead className="text-right">{t('Total Amount')}</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {jobs.map((job, idx) => (
                                                            <TableRow key={job.id} className="hover:bg-slate-50">
                                                                <TableCell className="text-slate-500">{idx + 1}</TableCell>
                                                                <TableCell className="whitespace-nowrap">{job.received_date || 'N/A'}</TableCell>
                                                                <TableCell className="font-medium text-vismass-blue">
                                                                    <Link href={`/service-jobs/${job.id}`} className="hover:underline">
                                                                        {job.job_number}
                                                                    </Link>
                                                                </TableCell>
                                                                <TableCell>{job.customer_name}</TableCell>
                                                                <TableCell className="max-w-xs truncate text-slate-600" title={job.problem_description}>
                                                                    {job.problem_description || 'N/A'}
                                                                </TableCell>
                                                                <TableCell>{job.technician_name}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs capitalize text-slate-700">
                                                                        {job.status.replace(/_/g, ' ')}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right font-semibold">
                                                                    Rs {parseFloat(job.total_amount.toString()).toFixed(2)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}
