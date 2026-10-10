import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle,
    CreditCard,
    Plus,
    RefreshCw,
    User,
    X,
    Building2,
    History,
    CheckSquare,
    Square,
    Truck,
    Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import axios from 'axios';
import { DatePicker } from '@/components/ui/date-picker';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BankAccountOption {
    id: number;
    account_name: string;
    bank_name: string;


    
    branch_name: string | null;
}

interface DepositHistoryItem {
    id: number;
    cheque_no: string;
    bank_name: string;
    branch: string | null;
    amount: number;
    cheque_date: string;
    deposited_at: string;
    deposit_bank: string;
    customer_name: string;
}

interface PendingCheque {
    id: number;
    type: 'customer' | 'delivery';
    cheque_no: string;
    bank_name: string;
    branch: string | null;
    amount: number;
    cheque_date: string;
    customer_name: string;
}

interface Props {
    bankAccounts: BankAccountOption[];
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    // { title: 'POS', href: '/pos' },
    { title: 'Cheque Deposit', href: '/pos/cheque-deposit' },
];

export default function ChequeDepositIndex({ bankAccounts }: Props) {
    const [pendingCheques, setPendingCheques] = useState<PendingCheque[]>([]);
    const [selectedCheques, setSelectedCheques] = useState<{id: number, type: 'customer' | 'delivery'}[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [depositDate, setDepositDate] = useState<Date>(new Date());
    const [selectedBankId, setSelectedBankId] = useState<number | ''>('');
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchPendingCheques();
    }, []);

    const fetchPendingCheques = async () => {
        setIsFetching(true);
        try {
            const response = await axios.get('/pos/cheque-deposit/pending');
            if (response.data.success) {
                setPendingCheques(response.data.cheques);
            }
        } catch (err: any) {
            console.error(err);
            setError('Failed to fetch pending cheques.');
        } finally {
            setIsFetching(false);
        }
    };

    const toggleChequeSelection = (id: number, type: 'customer' | 'delivery') => {
        setSelectedCheques(prev => {
            const exists = prev.find(item => item.id === id && item.type === type);
            if (exists) {
                return prev.filter(item => !(item.id === id && item.type === type));
            } else {
                return [...prev, { id, type }];
            }
        });
    };

    const filteredCheques = pendingCheques.filter(cheque => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            (cheque.cheque_no?.toLowerCase() || '').includes(search) ||
            (cheque.customer_name?.toLowerCase() || '').includes(search) ||
            (cheque.amount?.toString() || '').includes(search) ||
            (cheque.cheque_date?.toLowerCase() || '').includes(search) ||
            (cheque.bank_name?.toLowerCase() || '').includes(search) ||
            (cheque.branch?.toLowerCase() || '').includes(search)
        );
    });

    const selectAllCheques = () => {
        if (selectedCheques.length === filteredCheques.length && filteredCheques.length > 0) {
            setSelectedCheques([]);
        } else {
            setSelectedCheques(filteredCheques.map(c => ({ id: c.id, type: c.type })));
        }
    };

    const formatDateForSubmission = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCheques.length === 0) {
            setError('Please select at least one cheque to deposit.');
            return;
        }
        if (!selectedBankId) {
            setError('Please select a destination bank account.');
            return;
        }

        // Use local date (not UTC) so UTC+5:30 users aren't blocked between midnight local and 05:30 UTC
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const hasFutureCheques = pendingCheques.some(c => 
            selectedCheques.some(s => s.id === c.id && s.type === c.type) && 
            c.cheque_date.substring(0, 10) > todayStr
        );

        if (hasFutureCheques) {
            setError('One or more selected cheques have a future date. Post-dated cheques cannot be deposited.');
            return;
        }

        setIsConfirmDialogOpen(true);
    };

    const handleDeposit = async () => {
        setIsConfirmDialogOpen(false);
        setIsProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/pos/cheque-deposit/process', {
                cheque_items: selectedCheques,
                bank_account_id: selectedBankId,
                deposit_date: formatDateForSubmission(depositDate),
            });

            if (response.data.success) {
                router.get(route('pos.cheque-deposit.index'));
            } else {
                setError(response.data.message || 'Failed to process deposit.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'An error occurred while processing the deposit.');
        } finally {
            setIsProcessing(false);
        }
    };

    const totalSelectedAmount = pendingCheques
        .filter(c => selectedCheques.some(s => s.id === c.id && s.type === c.type))
        .reduce((sum, c) => sum + c.amount, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Cheque Deposit')} />

            <div className="min-h-screen bg-slate-50 pb-12">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Cheque Deposit Management')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Select received cheques and deposit to bank')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={fetchPendingCheques}
                                className="inline-flex items-center rounded-lg bg-white/20 p-2 text-white hover:bg-white/30 transition-all"
                                title="Refresh"
                            >
                                <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Notifications */}
                        {error && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                                    <span className="text-sm text-red-800">{error}</span>
                                </div>
                                <button onClick={() => setError(null)}><X className="h-4 w-4 text-red-500" /></button>
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                    <span className="text-sm text-green-800">{success}</span>
                                </div>
                                <button onClick={() => setSuccess(null)}><X className="h-4 w-4 text-green-500" /></button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {/* Pending Cheques List */}
                            <div className="lg:col-span-2 xl:col-span-3">
                                <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                                    <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-5 w-5 text-vismass-blue" />
                                            <h3 className="font-semibold text-slate-800">{t('Pending Cheques')}</h3>
                                        </div>
                                        <div className="flex items-center gap-4 flex-1 justify-between ml-4">
                                            <div className="relative w-64">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <Search className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <Input
                                                    type="text"
                                                    placeholder={t('Search cheques...')}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-9 h-8 text-sm bg-slate-50 border-slate-200"
                                                />
                                            </div>
                                            <button 
                                                onClick={selectAllCheques}
                                                className="text-xs font-medium text-vismass-blue hover:underline whitespace-nowrap"
                                            >
                                                {selectedCheques.length === filteredCheques.length && filteredCheques.length > 0 ? t('Deselect All') : t('Select All')}
                                            </button>
                                        </div>
                                    </div>

                                    {isFetching ? (
                                        <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                                            <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                                            <p>{t('Fetching pending cheques...')}</p>
                                        </div>
                                    ) : filteredCheques.length === 0 ? (
                                        <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                                            <Search className="h-12 w-12 mb-3 opacity-20" />
                                            <p>{searchQuery ? t('No cheques match your search.') : t('No pending cheques for deposit.')}</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-[600px] overflow-auto relative">
                                            <table className="min-w-full text-sm text-left">
                                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                                                    <tr>
                                                        <th scope="col" className="px-4 py-3 w-12 text-center">
                                                            {/* Empty header for checkbox */}
                                                        </th>
                                                        <th scope="col" className="px-4 py-3 whitespace-nowrap">{t('Cheque No')}</th>
                                                        <th scope="col" className="px-4 py-3">{t('Customer')}</th>
                                                        <th scope="col" className="px-4 py-3 text-right">{t('Amount')}</th>
                                                        <th scope="col" className="px-4 py-3">{t('Chq Date')}</th>
                                                        <th scope="col" className="px-4 py-3">{t('Bank & Branch')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredCheques.map((cheque) => (
                                                        <tr 
                                                            key={`${cheque.type}-${cheque.id}`}
                                                            onClick={() => toggleChequeSelection(cheque.id, cheque.type)}
                                                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                                                selectedCheques.some(s => s.id === cheque.id && s.type === cheque.type) ? 'bg-blue-50/50' : ''
                                                            }`}
                                                        >
                                                            <td className="px-4 py-3 text-center">
                                                                {selectedCheques.some(s => s.id === cheque.id && s.type === cheque.type) ? (
                                                                    <CheckSquare className="h-5 w-5 text-vismass-blue inline-block" />
                                                                ) : (
                                                                    <Square className="h-5 w-5 text-slate-300 inline-block" />
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                                                {cheque.cheque_no || <span className="text-slate-400 italic font-normal">({t('No Number')})</span>}
                                                                {cheque.type === 'delivery' && (
                                                                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                                                                        <Truck className="mr-1 h-3 w-3" />
                                                                        {t('Delivery')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{cheque.customer_name}</td>
                                                            <td className="px-4 py-3 font-bold text-vismass-blue text-right whitespace-nowrap">
                                                                Rs.{Number(cheque.amount).toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>{new Date(cheque.cheque_date).toLocaleDateString('en-GB')}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>{cheque.bank_name} {cheque.branch ? `- ${cheque.branch}` : ''}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Deposit Actions (1/3 width on lg, 1/4 width on xl) */}
                            <div className="lg:col-span-1 xl:col-span-1">
                                <div className="sticky top-8 space-y-6">
                                    <div className="rounded-lg border border-slate-200 bg-white shadow p-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">{t('Process Deposit')}</h3>
                                        
                                        <form onSubmit={onFormSubmit} className="space-y-4">
                                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('Total Selected')}</p>
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-sm font-medium text-slate-600">{selectedCheques.length} {t('Cheques')}</span>
                                                    <span className="text-2xl font-bold text-vismass-blue">Rs.{totalSelectedAmount.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    {t('Destination Bank')} <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={selectedBankId}
                                                    onChange={(e) => setSelectedBankId(e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring-vismass-blue transition-all"
                                                    required
                                                >
                                                    <option value="">{t('Select Bank Account')}</option>
                                                    {bankAccounts.map((acc) => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.bank_name} - {acc.account_name} ({acc.branch_name})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    {t('Deposit Date')} <span className="text-red-500">*</span>
                                                </label>
                                                <DatePicker 
                                                    date={depositDate}
                                                    onDateChange={(d) => d && setDepositDate(d)}
                                                    className="w-full"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isProcessing || selectedCheques.length === 0}
                                                className="w-full inline-flex items-center justify-center rounded-xl bg-vismass-blue px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                                        {t('Processing...')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="mr-2 h-5 w-5" />
                                                        {t('Confirm Deposit')}
                                                    </>
                                                )}
                                            </button>
                                        </form>

                                        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('Confirm Deposit')}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {t('Are you sure you want to deposit')} <strong className="text-slate-900">{selectedCheques.length} {t('cheque(s)')}</strong> {t('totaling')} <strong className="text-slate-900">Rs.{totalSelectedAmount.toFixed(2)}</strong> {t('to the selected bank account?')}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>{t('Cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeposit} className="bg-vismass-blue text-white hover:bg-blue-700">
                                                        {t('Confirm')}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>

                                    {/* Quick Help */}
                                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                        <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            {t('Note')}
                                        </h4>
                                        <p className="text-xs text-blue-800 leading-relaxed">
                                            {t('Depositing cheques will update the selected bank account balance immediately. Make sure the deposit date matches your bank slip.')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
