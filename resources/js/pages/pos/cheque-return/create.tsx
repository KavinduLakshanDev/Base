import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Check,
    CheckCircle,
    CreditCard,
    MapPin,
    RefreshCw,
    Search,
    User,
    X,
    Truck,
} from 'lucide-react';
import { t } from '@/lib/i18n';
import axios from 'axios';
import { DatePicker } from '@/components/ui/date-picker';

interface BankAccountOption {
    id: number;
    account_name: string;
    bank_name: string;
    branch_name: string | null;
}

interface AddressDetails {
    address?: string;
    city?: string;
    phone?: string;
}

interface Customer {
    AccKy: number;
    AccCd: string;
    AccNm: string;
    address_details?: AddressDetails;
}

interface Cheque {
    AccTrnKy: number;
    ChqueNo: string;
    BankNm: string;
    BranchNm: string;
    Amt: number;
    RBDT: string;
    customer: Customer;
    source_type?: 'acc_trn' | 'sales' | 'delivery';
    source_sale_id?: number | null;
    delivery_payment_id?: number | null;
}

interface Props {
    bankAccounts: BankAccountOption[];
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    // { title: 'POS', href: '/pos' },
    { title: 'Cheque Return', href: '/pos/cheque-return' },
];

export default function ChequeReturnCreate({ bankAccounts }: Props) {
    const searchData = useForm({
        cheque_no: '',
        bank_name: '',
        branch_name: '',
    });

    const returnData = useForm({
        cheque_id: null as number | null,
        source_type: 'acc_trn' as 'acc_trn' | 'sales' | 'delivery',
        source_sale_id: null as number | null,
        delivery_payment_id: null as number | null,
        return_reason: '',
        return_date: '',
        service_charge: '' as string | number,
    });

    const [searchResults, setSearchResults] = useState<Cheque[]>([]);
    const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchMessage, setSearchMessage] = useState<string | null>(null);
    const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);

    const clearError = () => setError(null);
    const clearSuccess = () => setSuccess(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        setError(null);
        setSearchMessage(null);
        setSearchResults([]);
        setSelectedCheque(null);

        try {
            const response = await axios.post('/pos/cheque-return/search', searchData.data);
            if (response.data.success) {
                setSearchResults(response.data.cheques);
                setSearchMessage(response.data.message);
            } else {
                setError(response.data.message || 'Search failed');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to search cheques. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectCheque = (cheque: Cheque) => {
        setSelectedCheque(cheque);
        returnData.setData('cheque_id', cheque.AccTrnKy);
        returnData.setData('source_type', cheque.source_type || 'acc_trn');
        returnData.setData('source_sale_id', cheque.source_sale_id ?? null);
        returnData.setData('delivery_payment_id', (cheque as any).delivery_payment_id ?? null);
        setError(null);
    };

    const formatDateForSubmission = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleReturnCheque = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCheque || !returnData.data.cheque_id) {
            setError('Please select a cheque to return');
            return;
        }

        if (!returnDate) {
            setError('Please select a return date');
            return;
        }

        setIsProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/pos/cheque-return/process', {
                ...returnData.data,
                return_date: formatDateForSubmission(returnDate),
            });

            if (response.data.success) {
                const sc = Number(response.data.service_charge ?? 0);
                const scText = sc > 0 ? ` + Service Charge: Rs.${sc.toFixed(2)}` : '';
                setSuccess(
                    `Cheque returned successfully! Return # ${response.data.return_number}. Amount: Rs.${Number(response.data.return_amount).toFixed(2)}${scText}`
                );
                // Clear selection and search results
                setSelectedCheque(null);
                setSearchResults([]);
                returnData.reset();
                searchData.reset();
                setReturnDate(undefined);
                // Redirect to history page
                router.visit(route('pos.cheque-return.index'), {
                    onSuccess: () => {
                        // success message is flashed from controller if we had one, but we have local state success too
                    }
                });
            } else {
                setError(response.data.message || 'Failed to process return');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'An error occurred while processing the return.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNewReturn = () => {
        searchData.reset();
        returnData.reset();
        setSearchResults([]);
        setSelectedCheque(null);
        setError(null);
        setSuccess(null);
        setSearchMessage(null);
        setReturnDate(undefined);
    };

    const handleBackToPOS = () => {
        router.visit('/pos/dashboard'); // Assuming there's a POS dashboard or main POS page
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Cheque Return')} />

            <div className="min-h-screen bg-slate-50">
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
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <RefreshCw className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Cheque Return Management')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Search and process returned cheques')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => router.visit('/vismass/sales/create')}
                                    className="inline-flex items-center rounded-lg bg-white text-vismass-blue hover:bg-slate-100 px-4 py-2 text-sm font-medium"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    {t('Back to Sales')}
                                </button>
                                <button
                                    onClick={handleNewReturn}
                                    className="inline-flex items-center rounded-lg bg-white text-vismass-blue hover:bg-slate-100 px-4 py-2 text-sm font-medium"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {t('New Return')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-sky-500 p-2 shadow-sm">
                                        <CreditCard className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Cheques Found')}</p>
                                        <p className="text-lg font-bold text-gray-900">{searchResults.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-sky-500 p-2 shadow-sm">
                                        <AlertTriangle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Selected Cheque')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {selectedCheque ? '1' : '0'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-sky-500 p-2 shadow-sm">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Customers')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {Array.from(new Set(searchResults.map(c => c.customer?.AccKy).filter(Boolean))).length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-sky-500 p-2 shadow-sm">
                                        <RefreshCw className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Amount')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            Rs.{Math.abs(searchResults.reduce((sum, cheque) => sum + cheque.Amt, 0)).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Notifications */}
                        <div className="mb-6">
                            {error && (
                                <div className="mb-4 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-400" />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h3 className="text-sm font-medium text-red-800">
                                                {t('Error')}
                                            </h3>
                                            <div className="mt-1 text-sm text-red-700">
                                                {error}
                                            </div>
                                        </div>
                                        <div className="ml-auto pl-3">
                                            <button
                                                onClick={clearError}
                                                className="inline-flex rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {success && (
                                <div className="mb-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <Check className="h-5 w-5 text-green-400" />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h3 className="text-sm font-medium text-green-800">
                                                {t('Success')}
                                            </h3>
                                            <div className="mt-1 text-sm text-green-700">
                                                {success}
                                            </div>
                                        </div>
                                        <div className="ml-auto pl-3">
                                            <button
                                                onClick={clearSuccess}
                                                className="inline-flex rounded-lg bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {searchMessage && !error && (
                                <div className="mb-4 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertTriangle className="h-5 w-5 text-sky-400" />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <div className="mt-1 text-sm text-sky-700">
                                                {searchMessage}
                                            </div>
                                        </div>
                                        <div className="ml-auto pl-3">
                                            <button
                                                onClick={clearError}
                                                className="inline-flex rounded-lg bg-sky-50 p-1.5 text-sky-500 hover:bg-sky-100 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Cheque Return Management System')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Search and process returned cheques efficiently')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Column - Search */}
                                    <div className="space-y-6">
                                        {/* Search Form */}
                                        <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6">
                                            <div className="mb-4 flex items-center gap-2">
                                                <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2 shadow">
                                                    <Search className="h-5 w-5 text-white" />
                                                </div>
                                                <h2 className="text-lg font-semibold text-sky-900">
                                                    {t('Search Cheque')}
                                                </h2>
                                            </div>

                                            <form onSubmit={handleSearch} className="space-y-4">
                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                                        {t('Cheque Number')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={searchData.data.cheque_no}
                                                        onChange={(e) => searchData.setData('cheque_no', e.target.value)}
                                                        placeholder={t('Enter cheque number')}
                                                        className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                                        {t('Bank Name')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={searchData.data.bank_name}
                                                        onChange={(e) => searchData.setData('bank_name', e.target.value)}
                                                        placeholder={t('Enter or search bank name')}
                                                        className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                                        {t('Branch Name')} <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={searchData.data.branch_name}
                                                        onChange={(e) => searchData.setData('branch_name', e.target.value)}
                                                        placeholder={t('Enter or search branch name')}
                                                        className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                        required
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isSearching}
                                                    className="inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isSearching ? (
                                                        <>
                                                            <svg className="mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            {t('Searching...')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Search className="mr-2 h-4 w-4" />
                                                            {t('Search Cheque')}
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        </div>

                                        {/* Search Results */}
                                        {searchResults.length > 0 && (
                                            <div className="rounded-xl border border-sky-200 bg-white p-6 shadow-sm">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h2 className="text-lg font-semibold text-sky-900">
                                                        {t('Valid Cheques Found')}
                                                    </h2>
                                                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-2.5 py-0.5 text-xs font-medium text-white">
                                                        {searchResults.length}
                                                    </span>
                                                </div>

                                                <div className="space-y-3">
                                                    {searchResults.map((cheque) => (
                                                        <div
                                                            key={cheque.AccTrnKy}
                                                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedCheque?.AccTrnKy === cheque.AccTrnKy
                                                                ? 'border-sky-500 bg-gradient-to-r from-sky-50 to-blue-50 shadow-sm'
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                            onClick={() => handleSelectCheque(cheque)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center space-x-2">
                                                                        <CreditCard className="h-4 w-4 text-sky-600" />
                                                                        <span className="font-medium">{cheque.ChqueNo || <span className="text-slate-400 italic font-normal">({t('No Number')})</span>}</span>
                                                                        {cheque.source_type === 'delivery' && (
                                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                                                                                <Truck className="mr-1 h-3 w-3" />
                                                                                {t('Delivery')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">
                                                                        {cheque.BankNm} - {cheque.BranchNm}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">
                                                                        {t('Customer')}: {cheque.customer?.AccNm || (cheque as any).customer_name}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-lg text-green-600">
                                                                        Rs.{Math.abs(cheque.Amt).toFixed(2)}
                                                                    </div>
                                                                    <div className="text-sm text-gray-600">
                                                                        {new Date(cheque.RBDT).toLocaleDateString('en-GB')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {selectedCheque?.AccTrnKy === cheque.AccTrnKy && (
                                                                <div className="mt-2 pt-2 border-t border-sky-200">
                                                                    <div className="flex items-center text-sm text-green-600">
                                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                                        {t('Selected for return')}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column - Return Processing */}
                                    <div className="space-y-6">
                                        {/* Selected Cheque Details */}
                                        {selectedCheque && (
                                            <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6">
                                                <div className="mb-4 flex items-center gap-2">
                                                    <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-2 shadow">
                                                        <CreditCard className="h-5 w-5 text-white" />
                                                    </div>
                                                    <h2 className="text-lg font-semibold text-sky-900">
                                                        {t('Selected Cheque Details')}
                                                    </h2>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-500">{t('Cheque Number')}</label>
                                                            <div className="text-lg font-semibold text-sky-900">{selectedCheque.ChqueNo}</div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-500">{t('Amount')}</label>
                                                            <div className="text-lg font-semibold text-green-600">
                                                                Rs.{Math.abs(selectedCheque.Amt).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-500">{t('Bank')}</label>
                                                            <div>{selectedCheque.BankNm}</div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-500">{t('Branch')}</label>
                                                            <div>{selectedCheque.BranchNm}</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-500">{t('Customer')}</label>
                                                        <div className="flex items-center space-x-2">
                                                            <User className="h-4 w-4 text-gray-400" />
                                                            <span className="font-medium">{selectedCheque.customer?.AccNm || (selectedCheque as any).customer_name}</span>
                                                            <span className="text-gray-500">({selectedCheque.customer?.AccCd || (selectedCheque as any).customer_code})</span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-gray-500">{t('Cheque Date')}</label>
                                                        <div className="flex items-center space-x-2">
                                                            <Calendar className="h-4 w-4 text-gray-400" />
                                                            <span>{new Date(selectedCheque.RBDT).toLocaleDateString('en-GB')}</span>
                                                        </div>
                                                    </div>

                                                    {selectedCheque.customer.address_details && (
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-500">{t('Customer Address')}</label>
                                                            <div className="text-sm">
                                                                <div className="flex items-start space-x-2">
                                                                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                                                    <div>
                                                                        <div>{selectedCheque.customer.address_details.address}</div>
                                                                        <div className="text-gray-600">{selectedCheque.customer.address_details.city}</div>
                                                                        <div className="text-gray-600">{selectedCheque.customer.address_details.phone}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Return Form */}
                                        {selectedCheque && (
                                            <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-red-50 to-pink-50 p-6">
                                                <div className="mb-4 flex items-center gap-2">
                                                    <div className="rounded-lg bg-gradient-to-br from-red-500 to-pink-600 p-2 shadow">
                                                        <AlertTriangle className="h-5 w-5 text-white" />
                                                    </div>
                                                    <h2 className="text-lg font-semibold text-red-900">
                                                        {t('Process Return')}
                                                    </h2>
                                                </div>

                                                <form onSubmit={handleReturnCheque} className="space-y-4">
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                                            {t('Return Date')} <span className="text-red-500">*</span>
                                                        </label>
                                                        <DatePicker
                                                            date={returnDate}
                                                            onDateChange={setReturnDate}
                                                            placeholder={t('Select return date')}
                                                            className="w-full rounded-xl border-gray-300 shadow-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                                            {t('Service Charge')} <span className="text-gray-400 text-xs">({t('optional')})</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={returnData.data.service_charge}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            onChange={(e) => returnData.setData('service_charge', e.target.value)}
                                                            placeholder={t('0.00')}
                                                            className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                                            {t('Return Reason')} <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                            value={returnData.data.return_reason}
                                                            onChange={(e) => returnData.setData('return_reason', e.target.value)}
                                                            placeholder={t('Enter reason for cheque return')}
                                                            rows={3}
                                                            className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Warning Alert */}
                                                    <div className="rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                                        <div className="flex">
                                                            <div className="flex-shrink-0">
                                                                <AlertTriangle className="h-5 w-5 text-red-400" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <p className="text-sm font-medium text-red-800">
                                                                    {t('Important Notice')}
                                                                </p>
                                                                <p className="mt-1 text-sm text-red-700">
                                                                    {t("This action will increase the customer's outstanding balance by")} <strong>Rs.{Math.abs(selectedCheque.Amt).toFixed(2)}</strong>
                                                                    {Number(returnData.data.service_charge) > 0 && (
                                                                        <> {t('plus service charge')} <strong>Rs.{Number(returnData.data.service_charge).toFixed(2)}</strong></>
                                                                    )}.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={isProcessing}
                                                        className="inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-gradient-to-r from-red-600 to-pink-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:from-red-700 hover:to-pink-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {isProcessing ? (
                                                            <>
                                                                <svg className="mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                {t('Processing Return...')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertTriangle className="mr-2 h-4 w-4" />
                                                                {t('Process Cheque Return')}
                                                            </>
                                                        )}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS • Cheque Return Management • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}


