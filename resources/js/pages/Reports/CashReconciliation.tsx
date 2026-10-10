import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Printer, Save, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, ArrowLeft, FileText, DollarSign, Calendar, RefreshCcw, Pencil, Trash2, X } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/utils/currency';
import { t } from '@/lib/i18n';
import axios from 'axios';
import { type BreadcrumbItem } from '@/types';

interface ExpectedData {
    opening_balance: number;
    cash_sales: number;
    sales_cash: number;
    sales_card: number;
    sales_bank: number;
    sales_cheque: number;
    sales_credit: number;
    sales_credit_applied?: number;
    sales_returns: number;
    credit_payments: number;
    collections_cash: number;
    collections_card: number;
    collections_bank: number;
    collections_cheque: number;
    collections_credit_applied?: number;
    expenses: number;
    bank_transfer_payments?: number;
    cheque_payments?: number;
    card_payments?: number;
    transfers?: number;
    bbf?: number;
    expected_closing: number;
    existing_reconciliation?: any;
}

interface DenominationCounts {
    notes_5000: number;
    notes_2000: number;
    notes_1000: number;
    notes_500: number;
    notes_100: number;
    notes_50: number;
    notes_20: number;
    coins: number;
}

interface Props {
    sections?: Array<{ id: number; name: string; section_code: string }>;
    users?: Array<{ id: number; username: string; full_name: string }>;
    currentUser?: { id: number; username: string; full_name: string; section_code?: string; can_view_all_users: boolean };
    initialData?: any[];
    filters?: {
        date?: string;
        section_code?: string;
        user_id?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    // { title: 'Reports', href: '/reports' },
    { title: 'Cash Reconciliation', href: '/reports/cash-reconciliation' },
];

export default function CashReconciliation({ sections = [], users = [], currentUser, initialData = [], filters: initialFilters }: Props) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [expectedData, setExpectedData] = useState<ExpectedData | null>(null);
    const [reconciliationId, setReconciliationId] = useState<number | null>(null);
    
    const [filters, setFilters] = useState({
        date: initialFilters?.date || new Date().toISOString().split('T')[0],
        sectionCode: initialFilters?.section_code || currentUser?.section_code || sections?.[0]?.section_code || '',
        userId: initialFilters?.user_id || '',
    });

    const [denominations, setDenominations] = useState<DenominationCounts>({
        notes_5000: 0,
        notes_2000: 0,
        notes_1000: 0,
        notes_500: 0,
        notes_100: 0,
        notes_50: 0,
        notes_20: 0,
        coins: 0,
    });

    const [cheques, setCheques] = useState({
        actual_cheques: 0,
        actual_cheques_amount: 0,
    });

    const [transferOutward, setTransferOutward] = useState<number>(0);

    // Auto-load data if redirected with a specific date
    React.useEffect(() => {
        if (initialFilters?.date || initialFilters?.user_id) {
            loadExpectedData();
        }
    }, []);

    const [notes, setNotes] = useState('');

    const existingReconciliation = expectedData?.existing_reconciliation;
    const canManageExisting = !!existingReconciliation && !!currentUser?.can_view_all_users;
    const isReadOnly = !!existingReconciliation && !isEditing;

    const applyExistingReconciliation = (existing: any) => {
        setDenominations({
            notes_5000: parseInt(existing.notes_5000) || 0,
            notes_2000: parseInt(existing.notes_2000) || 0,
            notes_1000: parseInt(existing.notes_1000) || 0,
            notes_500: parseInt(existing.notes_500) || 0,
            notes_100: parseInt(existing.notes_100) || 0,
            notes_50: parseInt(existing.notes_50) || 0,
            notes_20: parseInt(existing.notes_20) || 0,
            coins: parseFloat(existing.coins) || 0,
        });
        setCheques({
            actual_cheques: parseInt(existing.actual_cheques) || 0,
            actual_cheques_amount: parseFloat(existing.actual_cheques_amount) || 0,
        });
        setTransferOutward(parseFloat(existing.transfers) || 0);
        setNotes(existing.notes || '');
        setReconciliationId(existing.id);
    };

    // Calculate actual cash from denominations
    const calculateActualCash = (): number => {
        const coinsValue = typeof denominations.coins === 'number' && !isNaN(denominations.coins) 
            ? denominations.coins 
            : 0;
            
        return (
            (denominations.notes_5000 || 0) * 5000 +
            (denominations.notes_2000 || 0) * 2000 +
            (denominations.notes_1000 || 0) * 1000 +
            (denominations.notes_500 || 0) * 500 +
            (denominations.notes_100 || 0) * 100 +
            (denominations.notes_50 || 0) * 50 +
            (denominations.notes_20 || 0) * 20 +
            coinsValue
        );
    };

    const actualCash = calculateActualCash();
    const variance = expectedData ? actualCash - expectedData.expected_closing : 0;
    const bbf = actualCash - (transferOutward || 0);
    
    const expectedCheques = expectedData ? (expectedData.sales_cheque || 0) + (expectedData.collections_cheque || 0) : 0;
    const chequeVariance = cheques.actual_cheques_amount - expectedCheques;

    const loadExpectedData = async () => {
        if (!filters.sectionCode) {
            alert('Please select a section.');
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                date: filters.date,
                section_code: filters.sectionCode,
            });
            
            // Add user_id if selected by admin
            if (filters.userId) {
                params.append('user_id', filters.userId);
            }

            const response = await fetch(`/reports/cash-reconciliation/expected-data?${params}`, {
                headers: {
                    Accept: 'application/json',
                },
            });
            if (response.ok) {
                const result = await response.json();
                console.log('Expected Data:', result);
                setExpectedData(result);
                
                // If reconciliation already exists, load it
                if (result.existing_reconciliation) {
                    applyExistingReconciliation(result.existing_reconciliation);
                    setIsEditing(false);
                } else {
                    // Reset denominations for new reconciliation
                    setDenominations({
                        notes_5000: 0,
                        notes_2000: 0,
                        notes_1000: 0,
                        notes_500: 0,
                        notes_100: 0,
                        notes_50: 0,
                        notes_20: 0,
                        coins: 0,
                    });
                    setCheques({
                        actual_cheques: 0,
                        actual_cheques_amount: 0,
                    });
                    setTransferOutward(0);
                    setNotes('');
                    setReconciliationId(null);
                    setIsEditing(false);
                }
            } else {
                const contentType = response.headers.get('content-type') || '';
                let errorMessage = 'Failed to load expected data';

                if (contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('Failed to load expected data:', errorData);
                    errorMessage = errorData.error || errorMessage;
                } else {
                    const errorText = await response.text();
                    console.error('Failed to load expected data (non-JSON response):', errorText);
                }

                alert(errorMessage);
                setExpectedData(null);
            }
        } catch (error) {
            console.error('Error loading expected data:', error);
            alert('Error loading data. Please try again.');
            setExpectedData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDenominationChange = (field: keyof DenominationCounts, value: string) => {
        let numValue: number;
        
        if (field === 'coins') {
            const parsed = parseFloat(value);
            numValue = isNaN(parsed) ? 0 : parsed;
        } else {
            const parsed = parseInt(value);
            numValue = isNaN(parsed) ? 0 : parsed;
        }
        
        setDenominations(prev => ({
            ...prev,
            [field]: numValue,
        }));
    };

    const downloadPdf = async (id: number) => {
        try {
            const response = await axios.get(`/reports/cash-reconciliation/download-pdf`, {
                params: { reconciliation_id: id },
                responseType: 'blob',
                headers: {
                    'Accept': 'application/pdf',
                },
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `cash-reconciliation-${filters.date}.pdf`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // Cleanup after a short delay to ensure download starts
            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
            }, 500);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Error downloading PDF. Please try again.');
        }
    };

    const handleSave = async () => {
        if (!expectedData) {
            alert('Please load expected data first.');
            return;
        }

        if (expectedData.existing_reconciliation) {
            alert('Reconciliation for this date already exists. Data has been loaded for viewing.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                section_code: filters.sectionCode,
                reconciliation_date: filters.date,
                user_id: filters.userId || undefined, // Include user_id if selected by admin
                ...denominations,
                ...cheques,
                actual_cash: actualCash,
                opening_balance: expectedData.opening_balance,
                cash_sales: expectedData.cash_sales,
                sales_cash: expectedData.sales_cash,
                sales_card: expectedData.sales_card,
                sales_bank: expectedData.sales_bank,
                sales_cheque: expectedData.sales_cheque,
                sales_credit: expectedData.sales_credit,
                sales_credit_applied: expectedData.sales_credit_applied,
                sales_returns: expectedData.sales_returns,
                credit_payments: expectedData.credit_payments,
                collections_cash: expectedData.collections_cash,
                collections_card: expectedData.collections_card,
                collections_bank: expectedData.collections_bank,
                collections_cheque: expectedData.collections_cheque,
                collections_credit_applied: expectedData.collections_credit_applied,
                transfers: transferOutward,
                bbf: bbf,
                expected_cheques: expectedCheques,
                cheque_variance: chequeVariance,
                expenses: expectedData.expenses,
                bank_transfer_payments: expectedData.bank_transfer_payments,
                cheque_payments: expectedData.cheque_payments,
                card_payments: expectedData.card_payments,
                expected_closing: expectedData.expected_closing,
                variance: variance,
                notes: notes,
            };

            // Use axios with withCredentials to ensure XSRF-TOKEN cookie is sent
            // Laravel's VerifyCsrfToken middleware automatically checks the X-XSRF-TOKEN header
            const response = await axios.post('/reports/cash-reconciliation', payload, {
                withCredentials: true,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = response.data;
            console.log('Reconciliation saved:', result);
            const savedId = result.reconciliation.id;
            setReconciliationId(savedId);
            
            alert('Cash reconciliation saved successfully! Downloading PDF...');
            
            // Automatically download PDF after saving
            await downloadPdf(savedId);
        } catch (error: any) {
            console.error('Error saving reconciliation:', error);
            
            if (error.response?.status === 419) {
                alert(t('Session expired (CSRF token mismatch). Please refresh the page and try again.'));
                window.location.reload();
                return;
            }

            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error saving reconciliation. Please try again.';
            alert(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = () => {
        if (!canManageExisting) {
            alert('You do not have permission to edit this reconciliation.');
            return;
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        if (existingReconciliation) {
            applyExistingReconciliation(existingReconciliation);
        }
        setIsEditing(false);
    };

    const handleUpdate = async () => {
        if (!expectedData || !existingReconciliation) {
            alert('Please load an existing reconciliation first.');
            return;
        }
        if (!canManageExisting) {
            alert('You do not have permission to update this reconciliation.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                section_code: existingReconciliation.section_code,
                reconciliation_date: existingReconciliation.reconciliation_date,
                ...denominations,
                ...cheques,
                actual_cash: actualCash,
                opening_balance: expectedData.opening_balance,
                cash_sales: expectedData.cash_sales,
                sales_cash: expectedData.sales_cash,
                sales_card: expectedData.sales_card,
                sales_bank: expectedData.sales_bank,
                sales_cheque: expectedData.sales_cheque,
                sales_credit: expectedData.sales_credit,
                sales_credit_applied: expectedData.sales_credit_applied,
                sales_returns: expectedData.sales_returns,
                credit_payments: expectedData.credit_payments,
                collections_cash: expectedData.collections_cash,
                collections_card: expectedData.collections_card,
                collections_bank: expectedData.collections_bank,
                collections_cheque: expectedData.collections_cheque,
                collections_credit_applied: expectedData.collections_credit_applied,
                transfers: transferOutward,
                bbf: bbf,
                expected_cheques: expectedCheques,
                cheque_variance: chequeVariance,
                expenses: expectedData.expenses,
                bank_transfer_payments: expectedData.bank_transfer_payments,
                cheque_payments: expectedData.cheque_payments,
                card_payments: expectedData.card_payments,
                expected_closing: expectedData.expected_closing,
                variance: variance,
                notes: notes,
            };

            const response = await axios.put(`/reports/cash-reconciliation/${existingReconciliation.id}`, payload, {
                withCredentials: true,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const result = response.data;
            console.log('Reconciliation updated:', result);
            alert('Cash reconciliation updated successfully.');
            setExpectedData((prev) => prev ? { ...prev, existing_reconciliation: result.reconciliation } : prev);
            setReconciliationId(result.reconciliation.id);
            setIsEditing(false);
        } catch (error: any) {
            console.error('Error updating reconciliation:', error);

            if (error.response?.status === 419) {
                alert(t('Session expired (CSRF token mismatch). Please refresh the page and try again.'));
                window.location.reload();
                return;
            }

            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error updating reconciliation. Please try again.';
            alert(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existingReconciliation) {
            alert('Please load an existing reconciliation first.');
            return;
        }
        if (!canManageExisting) {
            alert('You do not have permission to delete this reconciliation.');
            return;
        }
        if (!confirm('Are you sure you want to delete this cash reconciliation? This action cannot be undone.')) {
            return;
        }

        setDeleting(true);
        try {
            await axios.delete(`/reports/cash-reconciliation/${existingReconciliation.id}`, {
                withCredentials: true,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            alert('Cash reconciliation deleted successfully.');
            setExpectedData(null);
            setReconciliationId(null);
            setIsEditing(false);
            setDenominations({
                notes_5000: 0,
                notes_2000: 0,
                notes_1000: 0,
                notes_500: 0,
                notes_100: 0,
                notes_50: 0,
                notes_20: 0,
                coins: 0,
            });
            setNotes('');
            await loadExpectedData();
        } catch (error: any) {
            console.error('Error deleting reconciliation:', error);

            if (error.response?.status === 419) {
                alert(t('Session expired (CSRF token mismatch). Please refresh the page and try again.'));
                window.location.reload();
                return;
            }

            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error deleting reconciliation. Please try again.';
            alert(errorMessage);
        } finally {
            setDeleting(false);
        }
    };

    const exportUrl = () => {
        const params = new URLSearchParams();
        params.set('date', filters.date);
        params.set('section_code', filters.sectionCode);
        if (filters.userId) {
            params.set('user_id', filters.userId);
        }
        return `/reports/cash-reconciliation/export?${params.toString()}`;
    };

    const handleExportCsv = () => {
        window.location.href = exportUrl();
    };

    const parseFilterDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatFilterDate = (date?: Date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handlePrint = async () => {
        if (!reconciliationId) {
            alert('Please save the reconciliation first.');
            return;
        }

        await downloadPdf(reconciliationId);
    };

    const getVarianceColor = () => {
        if (Math.abs(variance) < 0.01) return 'text-green-600';
        if (variance < 0) return 'text-red-600';
        return 'text-yellow-600';
    };

    const getVarianceIcon = () => {
        if (Math.abs(variance) < 0.01) return <CheckCircle2 className="h-8 w-8 text-green-600" />;
        if (variance < 0) return <TrendingDown className="h-8 w-8 text-red-600" />;
        return <TrendingUp className="h-8 w-8 text-yellow-600" />;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Cash Reconciliation')} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all"
                                    title={t('Go Back')}
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Calculator className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Cash Reconciliation')}</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">{t('Count physical cash and reconcile with expected closing balance.')}</p>
                                </div>
                            </div>

                            <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
                                <button onClick={handleExportCsv} className="no-print inline-flex w-full items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto">
                                    <FileText className="mr-1.5 h-4 w-4" />
                                    Export CSV
                                </button>
                                <button onClick={handlePrint} className="no-print inline-flex w-full items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Stats Cards */}
                <main className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
                    {/* Real-time Status Card */}
                    <div className="mb-6">
                        <Card className="overflow-hidden border-none shadow-xl bg-white">
                            <div className={`h-2 ${variance === 0 && expectedData ? 'bg-green-500' : (variance < 0 ? 'bg-red-500' : 'bg-amber-500')}`} />
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl ${Math.abs(variance) < 0.01 && expectedData ? 'bg-green-50' : (variance < 0 ? 'bg-red-50' : 'bg-amber-50')} transition-colors duration-500`}>
                                            {getVarianceIcon()}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">
                                                {expectedData ? (
                                                    Math.abs(variance) < 0.01 ? t('Perfectly Balanced') : 
                                                    variance < 0 ? t('Cash Shortage') : t('Cash Surplus')
                                                ) : t('Pending Count')}
                                            </h2>
                                            <p className="text-slate-500 text-sm font-medium">
                                                {expectedData ? t('Variance calculated against system records') : t('Select filter and load data to begin counting')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 pr-4">
                                        <div className="text-right sm:text-left">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('Expected Closing')}</p>
                                            <p className="text-xl font-semibold text-slate-800">{formatCurrency(expectedData?.expected_closing ?? 0)}</p>
                                        </div>
                                        <div className="text-right sm:text-left">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('Physical Count')}</p>
                                            <p className="text-xl font-semibold text-vismass-blue">{formatCurrency(actualCash)}</p>
                                        </div>
                                        <div className="text-right sm:text-left">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('Closing B/B/F')}</p>
                                            <p className="text-xl font-semibold text-orange-500">{formatCurrency(bbf)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('Variance')}</p>
                                            <p className={`text-xl font-bold ${getVarianceColor()}`}>
                                                {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Filters & Summary */}
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-vismass-blue" />
                                        {t('Filters & Controls')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-semibold text-xs uppercase">{t('Transaction Date')}</Label>
                                            <DatePicker
                                                date={filters.date ? parseFilterDate(filters.date) : undefined}
                                                onDateChange={(date) => {
                                                    if (date) {
                                                        setFilters(prev => ({ ...prev, date: formatFilterDate(date) }));
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-600 font-semibold text-xs uppercase">{t('Business Section')}</Label>
                                            <Select value={filters.sectionCode} onValueChange={(value) => setFilters(prev => ({ ...prev, sectionCode: value }))}>
                                                <SelectTrigger className="bg-slate-50 border-slate-200">
                                                    <SelectValue placeholder={t('Select Section')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sections.map(section => (
                                                        <SelectItem key={section.id} value={section.section_code}>
                                                            {section.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {currentUser?.can_view_all_users && (
                                            <div className="space-y-2">
                                                <Label className="text-slate-600 font-semibold text-xs uppercase">{t('Cashier / User')}</Label>
                                                <Select value={filters.userId || undefined} onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}>
                                                    <SelectTrigger className="bg-slate-50 border-slate-200">
                                                        <SelectValue placeholder={t('Selected Cashier')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {users.map(user => (
                                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                                {user.full_name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 flex flex-col gap-2">
                                        <Button onClick={loadExpectedData} className="w-full bg-vismass-blue hover:bg-blue-800 shadow-md transition-all active:scale-95" disabled={!filters.sectionCode || loading}>
                                            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                            {loading ? t('Syncing...') : t('Fetch System Records')}
                                        </Button>
                                        
                                        {expectedData && !expectedData.existing_reconciliation && (
                                            <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-95" disabled={saving}>
                                                <Save className="mr-2 h-4 w-4" />
                                                {saving ? t('Saving...') : t('Finalize & Save')}
                                            </Button>
                                        )}

                                        {expectedData && expectedData.existing_reconciliation && canManageExisting && !isEditing && (
                                            <Button onClick={handleStartEdit} className="w-full bg-amber-500 hover:bg-amber-600 shadow-md transition-all active:scale-95">
                                                <Pencil className="mr-2 h-4 w-4" />
                                                {t('Edit')}
                                            </Button>
                                        )}

                                        {expectedData && expectedData.existing_reconciliation && canManageExisting && isEditing && (
                                            <>
                                                <Button onClick={handleUpdate} className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-95" disabled={saving}>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    {saving ? t('Updating...') : t('Update')}
                                                </Button>
                                                <Button onClick={handleCancelEdit} variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm">
                                                    <X className="mr-2 h-4 w-4" />
                                                    {t('Cancel')}
                                                </Button>
                                            </>
                                        )}

                                        {expectedData && expectedData.existing_reconciliation && canManageExisting && (
                                            <Button onClick={handleDelete} variant="destructive" className="w-full" disabled={deleting}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {deleting ? t('Deleting...') : t('Delete')}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {expectedData && (
                                <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-indigo-50/30">
                                    <CardHeader className="py-4 border-b border-indigo-100 bg-indigo-50/50">
                                        <CardTitle className="text-sm font-bold text-indigo-900 uppercase tracking-tighter">{t('System Load Summary')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">{t('Opening Balance')}</span>
                                                <span className="font-bold text-slate-700">{formatCurrency(expectedData.opening_balance)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">{t('Cash Sales (+) ')}</span>
                                                <span className="font-bold text-emerald-600">+{formatCurrency(expectedData.cash_sales)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">{t('Collections (+) ')}</span>
                                                <span className="font-bold text-emerald-600">+{formatCurrency(expectedData.credit_payments)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">{t('Petty Cash (-) ')}</span>
                                                <span className="font-bold text-red-600">-{formatCurrency(expectedData.expenses)}</span>
                                            </div>

                                            <div className="pt-3 border-t border-indigo-100 space-y-2">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{t('Sales Breakdown')}</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Cash')}</span>
                                                    <span className="font-semibold text-emerald-600">+{formatCurrency(expectedData.sales_cash || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Card')}</span>
                                                    <span className="font-semibold text-slate-700">{formatCurrency(expectedData.sales_card || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Bank Transfer')}</span>
                                                    <span className="font-semibold text-slate-700">{formatCurrency(expectedData.sales_bank || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Cheques')}</span>
                                                    <span className="font-semibold text-slate-700">{formatCurrency(expectedData.sales_cheque || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs border-t border-dashed border-indigo-50 mt-1 pt-1">
                                                    <span className="text-slate-500 italic">{t('Credit Sales (Unpaid)')}</span>
                                                    <span className="font-semibold text-slate-400 italic">{formatCurrency(expectedData.sales_credit || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 italic">{t('Credit Applied (Advance)')}</span>
                                                    <span className="font-semibold text-slate-400 italic">{formatCurrency(expectedData.sales_credit_applied || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Sales Returns')}</span>
                                                    <span className="font-semibold text-red-500">-{formatCurrency(expectedData.sales_returns || 0)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-indigo-100 space-y-2">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{t('Debt Collections Breakdown')}</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Cash')}</span>
                                                    <span className="font-semibold text-emerald-600">+{formatCurrency(expectedData.collections_cash || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Card')}</span>
                                                    <span className="font-semibold text-slate-700">{formatCurrency(expectedData.collections_card || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Bank Transfer')}</span>
                                                    <span className="font-semibold text-slate-700">{formatCurrency(expectedData.collections_bank || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Cheques')}</span>
                                                    <span className="font-semibold text-slate-700">{formatCurrency(expectedData.collections_cheque || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 italic">{t('Credit Applied (Advance)')}</span>
                                                    <span className="font-semibold text-slate-400 italic">{formatCurrency(expectedData.collections_credit_applied || 0)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-indigo-100 space-y-2">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{t('Other Adjustments')}</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500">{t('Transfers (-)')}</span>
                                                    <span className="font-semibold text-red-600">-{formatCurrency(expectedData.transfers || 0)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-indigo-100 flex justify-between items-center">
                                                <span className="font-bold text-indigo-900">{t('Expected Total')}</span>
                                                <span className="text-lg font-black text-indigo-900">{formatCurrency(expectedData.expected_closing)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column: Counting Field */}
                        <div className="lg:col-span-8">
                            {expectedData ? (
                                <Card className="rounded-2xl border-slate-200 shadow-lg overflow-hidden h-full">
                                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-lg">
                                                <Calculator className="h-5 w-5 text-emerald-400" />
                                            </div>
                                            <h3 className="text-white font-bold">{t('Denomination Worksheet')}</h3>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400 uppercase font-bold">{t('Current Physical Total')}</p>
                                            <p className="text-xl font-bold text-white">{formatCurrency(actualCash)}</p>
                                        </div>
                                    </div>
                                    
                                    <CardContent className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                            <DenominationInput
                                                label="5000 Notes"
                                                value={denominations.notes_5000}
                                                onChange={(val) => handleDenominationChange('notes_5000', val)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                denomination={5000}
                                                disabled={isReadOnly}
                                            />
                                            <DenominationInput
                                                label="2000 Notes"
                                                value={denominations.notes_2000}
                                                onChange={(val) => handleDenominationChange('notes_2000', val)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                denomination={2000}
                                                disabled={isReadOnly}
                                            />
                                            <DenominationInput
                                                label="1000 Notes"
                                                value={denominations.notes_1000}
                                                onChange={(val) => handleDenominationChange('notes_1000', val)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                denomination={1000}
                                                disabled={isReadOnly}
                                            />
                                            <DenominationInput
                                                label="500 Notes"
                                                value={denominations.notes_500}
                                                onChange={(val) => handleDenominationChange('notes_500', val)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                denomination={500}
                                                disabled={isReadOnly}
                                            />
                                            <DenominationInput
                                                label="100 Notes"
                                                value={denominations.notes_100}
                                                onChange={(val) => handleDenominationChange('notes_100', val)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                denomination={100}
                                                disabled={isReadOnly}
                                            />
                                            <DenominationInput
                                                label="50 Notes"
                                                value={denominations.notes_50}
                                                onChange={(val) => handleDenominationChange('notes_50', val)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                denomination={50}
                                                disabled={isReadOnly}
                                            />
                                            <DenominationInput
                                                label="20 Notes"
                                                value={denominations.notes_20}
                                                onChange={(val) => handleDenominationChange('notes_20', val)}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                denomination={20}
                                                disabled={isReadOnly}
                                            />
                                            <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                <Label htmlFor="coins" className="text-slate-700 font-bold">{t('Coins & Loose Change')}</Label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        id="coins"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={denominations.coins}
                                                        onChange={(e) => handleDenominationChange('coins', e.target.value)}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        className="pl-9 bg-white border-slate-200"
                                                        placeholder="0.00"
                                                        disabled={isReadOnly}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cheques Section */}
                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="bg-slate-100 p-2 rounded-lg">
                                                    <FileText className="h-5 w-5 text-slate-500" />
                                                </div>
                                                <h3 className="text-slate-700 font-bold">{t('Physical Cheques')}</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                                    <Label htmlFor="actual_cheques" className="text-slate-700 font-bold flex justify-between">
                                                        <span>{t('Actual Cheque Count')}</span>
                                                    </Label>
                                                    <Input
                                                        id="actual_cheques"
                                                        type="number"
                                                        min="0"
                                                        value={cheques.actual_cheques}
                                                        onChange={(e) => setCheques(prev => ({ ...prev, actual_cheques: parseInt(e.target.value) || 0 }))}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        className="bg-white border-slate-200"
                                                        placeholder="0"
                                                        disabled={isReadOnly}
                                                    />
                                                </div>
                                                <div className="space-y-2 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                                    <Label htmlFor="actual_cheques_amount" className="text-slate-700 font-bold flex justify-between">
                                                        <span>{t('Total Cheques Amount')}</span>
                                                        <span className="text-xs text-indigo-500 font-semibold uppercase">{t('Expected:')} {formatCurrency(expectedCheques)}</span>
                                                    </Label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                        <Input
                                                            id="actual_cheques_amount"
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={cheques.actual_cheques_amount}
                                                            onChange={(e) => setCheques(prev => ({ ...prev, actual_cheques_amount: parseFloat(e.target.value) || 0 }))}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className={`pl-9 bg-white ${Math.abs(chequeVariance) > 0 ? 'border-red-300 focus-visible:ring-red-500' : 'border-slate-200'}`}
                                                            placeholder="0.00"
                                                            disabled={isReadOnly}
                                                        />
                                                    </div>
                                                    {Math.abs(chequeVariance) > 0 && (
                                                        <p className={`text-xs font-bold ${chequeVariance > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                                            {chequeVariance > 0 ? t('Cheque Surplus:') : t('Cheque Shortage:')} {formatCurrency(Math.abs(chequeVariance))}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transfer Section */}
                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="bg-slate-100 p-2 rounded-lg">
                                                    <DollarSign className="h-5 w-5 text-slate-500" />
                                                </div>
                                                <h3 className="text-slate-700 font-bold">{t('Transfer to Main Cash Book')}</h3>
                                            </div>
                                            <div className="space-y-2 p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                                                <Label htmlFor="transfer_outward" className="text-slate-700 font-bold flex justify-between">
                                                    <span>{t('Transfer Amount')}</span>
                                                    <span className="text-xs text-orange-500 font-semibold uppercase">{t('BBF after transfer:')} {formatCurrency(bbf)}</span>
                                                </Label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        id="transfer_outward"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={transferOutward}
                                                        onChange={(e) => setTransferOutward(parseFloat(e.target.value) || 0)}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        className="pl-9 bg-white border-slate-200"
                                                        placeholder="0.00"
                                                        disabled={isReadOnly}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {t('This amount will be deducted from your physical cash and transferred to the main cash book. The remaining will be your BBF for the next shift.')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Notes Section */}
                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            <Label htmlFor="notes" className="text-slate-700 font-bold mb-2 flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-400" />
                                                {t('Reconciliation Remarks')}
                                            </Label>
                                            <Textarea
                                                id="notes"
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder={t('Optional: Explain any significant cash variances or operational issues here...')}
                                                className="mt-2 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                                rows={3}
                                                disabled={isReadOnly}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center p-12">
                                    <div className="bg-slate-50 p-6 rounded-full mb-4">
                                        <AlertTriangle className="h-12 w-12 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700 mb-2">{t('No Records Loaded')}</h3>
                                    <p className="text-slate-500 max-w-sm">
                                        {t('Select a date and business section on the left to pull system data and start counting physical cash.')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>


            </div>
        </AppLayout>
    );
}

interface DenominationInputProps {
    label: string;
    value: number;
    onChange: (value: string) => void;
    onWheel?: (e: React.WheelEvent<HTMLInputElement>) => void;
    denomination: number;
    disabled?: boolean;
}

const DenominationInput: React.FC<DenominationInputProps> = ({ label, value, onChange, onWheel, denomination, disabled }) => {
    // Ensure value is always a valid number
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const total = numValue * denomination;

    return (
        <div className="group space-y-2 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
            <div className="flex justify-between items-center mb-1">
                <Label htmlFor={label} className="text-slate-600 font-medium text-sm group-hover:text-vismass-blue transition-colors">{t(label)}</Label>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">× {denomination}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Input
                        id={label}
                        type="number"
                        min="0"
                        value={numValue === 0 ? '' : numValue}
                        onChange={(e) => onChange(e.target.value)}
                        onWheel={onWheel}
                        className="bg-white border-slate-200 focus:ring-vismass-blue text-center font-bold text-lg h-12"
                        placeholder="0"
                        disabled={disabled}
                    />
                </div>
                <div className="min-w-[100px] text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{t('Amount')}</p>
                    <p className="text-sm font-black text-slate-700">
                        {formatCurrency(total)}
                    </p>
                </div>
            </div>
        </div>
    );
};
