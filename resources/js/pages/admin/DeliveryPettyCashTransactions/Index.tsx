// import AppLayout from '@/layouts/app-layout';
// import {
//     AlertDialog,
//     AlertDialogAction,
//     AlertDialogCancel,
//     AlertDialogContent,
//     AlertDialogDescription,
//     AlertDialogFooter,
//     AlertDialogHeader,
//     AlertDialogTitle,
// } from '@/components/ui/alert-dialog';
// import { type BreadcrumbItem } from '@/types';
// import { Head, router } from '@inertiajs/react';
// import {
//     ArrowsUpFromLine,
//     BadgeDollarSign,
//     Coins,
//     Filter,
//     ListChecks,
//     Plus,
//     Printer,
//     Search,
//     Trash2,
//     TrendingDown,
//     Wallet,
// } from 'lucide-react';
// import { useState, useEffect, useRef } from 'react';

// import { t } from '@/lib/i18n';
// import ReimbursementDialog from '@/pages/admin/DeliveryPettyCashTransactions/CreateReimbursement';
// import UsageDialog from '@/pages/admin/DeliveryPettyCashTransactions/CreateUsage';

// const breadcrumbs: BreadcrumbItem[] = [
//     {
//         title: t('Dashboard'),
//         href: '/dashboard',
//     },
//     {
//         title: t('Admin'),
//         href: '#',
//     },
//     {
//         title: t('Delivery Petty Cash Ledger'),
//         href: '#',
//     },
// ];

// interface Category {
//     id: number;
//     name: string;
// }

// interface Transaction {
//     id: number;
//     transaction_no: string | null;
//     type: string;
//     category: Category | null;
//     delivery_petty_cash_category_id: number | null;
//     amount: number | string;
//     notes?: string | null;
//     slip_path?: string | null;
//     transaction_date: string;
//     balance: number | string;
// }

// interface CategoryUsage {
//     category_id: number;
//     category_name: string;
//     usage_count: number;
//     total: number | string;
// }

// interface Stats {
//     cash_received: number | string;
//     total_usage: number | string;
//     received_count: number;
//     usage_count: number;
//     available_balance: number | string;
// }

// interface Filters {
//     search?: string;
//     category_id?: number | string;
//     type?: string;
//     from_date?: string;
//     to_date?: string;
// }

// interface Props {
//     next_transaction_no: string;
//     transactions: Transaction[];
//     stats: Stats;
//     by_category: CategoryUsage[];
//     categories: Category[];
//     filters: Filters;
// }

// const money = (value: number | string): string =>
//     Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// export default function DeliveryPettyCashTransactionIndex({ next_transaction_no, transactions, stats, by_category, categories, filters }: Props) {
//     const [searchTerm, setSearchTerm] = useState(filters.search || '');
//     const [selectedCategory, setSelectedCategory] = useState<number | ''>(filters.category_id ? Number(filters.category_id) : '');
//     const [typeFilter, setTypeFilter] = useState(filters.type || '');
//     const [fromDate, setFromDate] = useState(filters.from_date || '');
//     const [toDate, setToDate] = useState(filters.to_date || '');
//     const [deleteModal, setDeleteModal] = useState<{ show: boolean; transaction: Transaction | null }>({
//         show: false,
//         transaction: null,
//     });
//     const [deleteProcessing, setDeleteProcessing] = useState(false);
//     const [reimbursementOpen, setReimbursementOpen] = useState(false);
//     const [usageOpen, setUsageOpen] = useState(false);
//     const initialRender = useRef(true);

//     useEffect(() => {
//         if (initialRender.current) {
//             initialRender.current = false;
//             return;
//         }

//         const delayDebounceFn = setTimeout(() => {
//             router.get(
//                 '/admin/delivery-petty-cash-transactions',
//                 {
//                     search: searchTerm,
//                     category_id: selectedCategory === '' ? undefined : selectedCategory,
//                     type: typeFilter,
//                     from_date: fromDate,
//                     to_date: toDate,
//                     page: 1,
//                 },
//                 {
//                     preserveState: true,
//                     replace: true,
//                     preserveScroll: true,
//                 },
//             );
//         }, 300);

//         return () => clearTimeout(delayDebounceFn);
//     }, [searchTerm, selectedCategory, typeFilter, fromDate, toDate]);

//     const resetFilters = () => {
//         setSearchTerm('');
//         setSelectedCategory('');
//         setTypeFilter('');
//         setFromDate('');
//         setToDate('');
//     };

//     const handlePrint = () => {
//         window.print();
//     };

//     const handleDelete = (transaction: Transaction) => {
//         setDeleteModal({ show: true, transaction });
//     };

//     const confirmDelete = () => {
//         if (deleteModal.transaction) {
//             setDeleteProcessing(true);
//             router.delete(`/admin/delivery-petty-cash-transactions/${deleteModal.transaction.id}`, {
//                 onSuccess: () => {
//                     setDeleteModal({ show: false, transaction: null });
//                 },
//                 onError: () => {
//                     setDeleteModal({ show: false, transaction: null });
//                 },
//                 onFinish: () => {
//                     setDeleteProcessing(false);
//                 },
//             });
//         }
//     };

//     const particulars = (tx: Transaction) => {
//         if (tx.type === 'received') {
//             return tx.notes || t('Petty cash reimbursement');
//         }
//         if (tx.notes) {
//             return tx.notes;
//         }
//         return tx.category?.name || t('Petty cash usage');
//     };

//     const categoryTotals = new Map<number, number>();
//     by_category.forEach((c) => categoryTotals.set(c.category_id, Number(c.total)));

//     const receivedTotal = by_category.length > 0 || transactions.length > 0 ? Number(stats.cash_received) : 0;
//     const usageTotal = Number(stats.total_usage);
//     const balanceTotal = Number(stats.available_balance);

//     return (
//         <AppLayout breadcrumbs={breadcrumbs}>
//             <Head title={t('Delivery Petty Cash Ledger')} />

//             <div className="min-h-screen bg-slate-50">
//                 {/* Header */}
//                 <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
//                     <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//                         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
//                             <div className="flex items-center space-x-3">
//                                 <div className="rounded-lg bg-white/20 p-2 shadow">
//                                     <Wallet className="h-5 w-5 text-white" />
//                                 </div>
//                                 <div>
//                                     <h1 className="text-xl font-bold text-white">
//                                         {t('Delivery Petty Cash Book')}
//                                     </h1>
//                                     <p className="text-xs text-white/80">
//                                         {t('Track reimbursements, usage and the running balance')}
//                                     </p>
//                                 </div>
//                             </div>
//                             <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
//                                 <button
//                                     onClick={() => setReimbursementOpen(true)}
//                                     className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 transition-all duration-200 sm:w-auto"
//                                 >
//                                     <ArrowsUpFromLine className="mr-1.5 h-4 w-4" />
//                                     {t('Add Reimbursement')}
//                                 </button>
//                                 <button
//                                     onClick={() => setUsageOpen(true)}
//                                     className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto"
//                                 >
//                                     <Plus className="mr-1.5 h-4 w-4" />
//                                     {t('Add Expenses')}
//                                 </button>
//                                 <button
//                                     onClick={handlePrint}
//                                     className="inline-flex w-full items-center justify-center rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow hover:bg-white/20 transition-all duration-200 sm:w-auto"
//                                     title={t('Print Ledger')}
//                                 >
//                                     <Printer className="mr-1.5 h-4 w-4" />
//                                     {t('Print')}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </header>

//                 {/* Main Content */}
//                 <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
//                     <div className="px-4 sm:px-0 space-y-4">
//                         {/* Stats Cards */}
//                         <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 no-print">
//                             <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-emerald-500 p-2 shadow-sm">
//                                         <Coins className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3 min-w-0">
//                                         <p className="text-xs font-medium text-gray-600">{t('Cash Received')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-emerald-600">
//                                             {money(stats.cash_received)}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
//                                         <TrendingDown className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3 min-w-0">
//                                         <p className="text-xs font-medium text-gray-600">{t('Total Usage')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-vismass-blue">
//                                             {money(stats.total_usage)}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-amber-500 p-2 shadow-sm">
//                                         <ListChecks className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3 min-w-0">
//                                         <p className="text-xs font-medium text-gray-600">{t('Received Count')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-amber-600">
//                                             {stats.received_count}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
//                                         <ListChecks className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3 min-w-0">
//                                         <p className="text-xs font-medium text-gray-600">{t('Usage Count')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-orange-600">
//                                             {stats.usage_count}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-violet-500 p-2 shadow-sm">
//                                         <BadgeDollarSign className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3 min-w-0">
//                                         <p className="text-xs font-medium text-gray-600">{t('Available Balance')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-violet-600">
//                                             {money(stats.available_balance)}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Search Box */}
//                         <div className="relative no-print">
//                             <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                             <input
//                                 type="text"
//                                 value={searchTerm}
//                                 onChange={(e) => setSearchTerm(e.target.value)}
//                                 placeholder={t('Search by particulars or category...')}
//                                 className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
//                             />
//                         </div>

//                         {/* Filter Section */}
//                         <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm no-print">
//                             <div className="flex items-center justify-between">
//                                 <div className="flex items-center space-x-2">
//                                     <Filter className="h-4 w-4 text-vismass-blue" />
//                                     <h3 className="text-sm font-semibold text-slate-700">{t('Filters')}</h3>
//                                 </div>
//                                 <button
//                                     onClick={resetFilters}
//                                     className="text-xs font-medium text-vismass-blue hover:text-vismass-blue/70"
//                                 >
//                                     {t('Reset')}
//                                 </button>
//                             </div>

//                             <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
//                                 <div className="space-y-1">
//                                     <label className="text-xs font-medium text-slate-600">{t('Category')}</label>
//                                     <select
//                                         value={selectedCategory}
//                                         onChange={(e) => setSelectedCategory(e.target.value === '' ? '' : Number(e.target.value))}
//                                         className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
//                                     >
//                                         <option value="">{t('All Categories')}</option>
//                                         {categories.map((cat) => (
//                                             <option key={cat.id} value={cat.id}>{cat.name}</option>
//                                         ))}
//                                     </select>
//                                 </div>

//                                 <div className="space-y-1">
//                                     <label className="text-xs font-medium text-slate-600">{t('Type')}</label>
//                                     <select
//                                         value={typeFilter}
//                                         onChange={(e) => setTypeFilter(e.target.value)}
//                                         className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
//                                     >
//                                         <option value="">{t('All Types')}</option>
//                                         <option value="received">{t('Received')}</option>
//                                         <option value="usage">{t('Usage')}</option>
//                                     </select>
//                                 </div>

//                                 <div className="space-y-1">
//                                     <label className="text-xs font-medium text-slate-600">{t('From Date')}</label>
//                                     <input
//                                         type="date"
//                                         value={fromDate}
//                                         onChange={(e) => setFromDate(e.target.value)}
//                                         className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
//                                     />
//                                 </div>

//                                 <div className="space-y-1">
//                                     <label className="text-xs font-medium text-slate-600">{t('To Date')}</label>
//                                     <input
//                                         type="date"
//                                         value={toDate}
//                                         onChange={(e) => setToDate(e.target.value)}
//                                         className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
//                                     />
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Table Section */}
//                         <div id="printable-ledger" className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
//                             <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3 no-print">
//                                 <h3 className="text-base font-semibold text-white">{t('Ledger Entries')}</h3>
//                             </div>

//                             {/* Print Header */}
//                             <div className="print-header px-4 pt-4" style={{ display: 'none' }}>
//                                 <div className="text-center mb-4">
//                                     <div className="text-3xl font-black" style={{ marginBottom: '5px' }}>
//                                         <span style={{ color: '#00aeef' }}>VIS</span>
//                                         <span style={{ color: '#737578' }}>MASS</span>
//                                     </div>
//                                     <div className="text-sm text-slate-600">Delivery Petty Cash Ledger Report</div>
//                                     <div className="text-xs text-slate-500">
//                                         Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
//                                     </div>
//                                 </div>
//                             </div>

//                             {transactions.length === 0 ? (
//                                 <div className="text-center py-12">
//                                     <Wallet className="mx-auto h-10 w-10 text-slate-300" />
//                                     <h3 className="mt-3 text-base font-semibold text-slate-700">{t('No entries yet')}</h3>
//                                     <p className="mt-1 text-sm text-slate-500">
//                                         {t('Record a reimbursement or a usage entry to get started.')}
//                                     </p>
//                                 </div>
//                             ) : (
//                                 <div className="overflow-x-auto">
//                                     <table className="min-w-full divide-y divide-slate-200">
//                                         <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
//                                             <tr>
//                                                 <th className="px-3 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('#')}
//                                                 </th>
//                                                 <th className="px-3 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('Trx No.')}
//                                                 </th>
//                                                 <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('Date')}
//                                                 </th>
//                                                 <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('Particulars')}
//                                                 </th>
//                                                 <th className="px-3 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('Cash Received')}
//                                                 </th>
//                                                 <th className="px-3 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('Total Usage')}
//                                                 </th>
//                                                 <th className="px-3 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('Balance')}
//                                                 </th>
//                                                 {categories.map((cat) => (
//                                                     <th key={cat.id} className="px-3 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider whitespace-nowrap">
//                                                         {cat.name}
//                                                     </th>
//                                                 ))}
//                                                 {/* <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                     {t('Actions')}
//                                                 </th> */}
//                                             </tr>
//                                         </thead>
//                                         <tbody className="bg-white divide-y divide-slate-200">
//                                             {transactions.map((tx, index) => (
//                                                 <tr key={tx.id} className="hover:bg-slate-50">
//                                                     <td className="px-3 py-2 text-center text-xs text-slate-500">
//                                                         {index + 1}
//                                                     </td>
//                                                     <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-vismass-blue text-center">
//                                                         {tx.transaction_no || '-'}
//                                                     </td>
//                                                     <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
//                                                         {new Date(tx.transaction_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
//                                                     </td>
//                                                     <td className="px-3 py-2 text-xs font-medium text-slate-900">
//                                                         <div>{particulars(tx)}</div>
//                                                         {tx.slip_path && (
//                                                             <a href={`/storage/${tx.slip_path}`} target="_blank" rel="noreferrer" className="text-vismass-blue hover:underline text-[10px] mt-1 inline-flex items-center no-print">
//                                                                 <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//                                                                 </svg>
//                                                                 {t('View Slip')}
//                                                             </a>
//                                                         )}
//                                                     </td>
//                                                     <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
//                                                         {tx.type === 'received' ? (
//                                                             <span className="font-semibold text-green-600">{money(tx.amount)}</span>
//                                                         ) : (
//                                                             <span className="text-slate-300">-</span>
//                                                         )}
//                                                     </td>
//                                                     <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
//                                                         {tx.type === 'usage' ? (
//                                                             <span className="font-semibold text-red-600">{money(tx.amount)}</span>
//                                                         ) : (
//                                                             <span className="text-slate-300">-</span>
//                                                         )}
//                                                     </td>
//                                                     <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-semibold text-slate-900">
//                                                         {money(tx.balance)}
//                                                     </td>
//                                                     {categories.map((cat) => (
//                                                         <td key={cat.id} className="px-3 py-2 whitespace-nowrap text-right text-xs">
//                                                             {tx.type === 'usage' && tx.delivery_petty_cash_category_id === cat.id ? (
//                                                                 <span className="font-semibold text-red-600">{money(tx.amount)}</span>
//                                                             ) : (
//                                                                 <span className="text-slate-300">-</span>
//                                                             )}
//                                                         </td>
//                                                     ))}
//                                                     {/* <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
//                                                         <button
//                                                             onClick={() => handleDelete(tx)}
//                                                             className="inline-flex items-center p-1.5 rounded-md transition-colors text-red-600 hover:text-red-800 hover:bg-red-50"
//                                                             title={t('Delete')}
//                                                         >
//                                                             <Trash2 className="h-4 w-4" />
//                                                         </button>
//                                                     </td> */}
//                                                 </tr>
//                                             ))}
//                                         </tbody>
//                                         <tfoot className="bg-gradient-to-r from-slate-50 to-sky-50">
//                                             <tr>
//                                                 <td className="px-3 py-2.5" colSpan={4}>
//                                                     <span className="text-sm font-bold text-slate-700">{t('Total')}</span>
//                                                 </td>
//                                                 <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-bold text-green-700">
//                                                     {money(receivedTotal)}
//                                                 </td>
//                                                 <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-bold text-red-700">
//                                                     {money(usageTotal)}
//                                                 </td>
//                                                 <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-bold text-slate-900">
//                                                     {money(balanceTotal)}
//                                                 </td>
//                                                 {categories.map((cat) => (
//                                                     <td key={cat.id} className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-bold text-red-700">
//                                                         {money(categoryTotals.get(cat.id) ?? 0)}
//                                                     </td>
//                                                 ))}
//                                                 <td></td>
//                                             </tr>
//                                         </tfoot>
//                                     </table>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </main>

//                 {/* Footer */}
//                 <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50 no-print">
//                     <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
//                         <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
//                             <p className="text-xs text-gray-500">© VISMASS {t('Delivery Petty Cash Management')} • v1.0.0</p>
//                         </div>
//                     </div>
//                 </footer>
//             </div>

//             {/* Reimbursement Dialog */}
//             <ReimbursementDialog open={reimbursementOpen} onOpenChange={setReimbursementOpen} nextTransactionNo={next_transaction_no} />

//             {/* Usage Dialog */}
//             <UsageDialog open={usageOpen} onOpenChange={setUsageOpen} categories={categories} availableBalance={stats.available_balance} nextTransactionNo={next_transaction_no} />

//             {/* Delete Confirmation Dialog */}
//             <AlertDialog open={deleteModal.show} onOpenChange={(open) => {
//                 if (!open) setDeleteModal({ show: false, transaction: null });
//             }}>
//                 <AlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle>{t('Delete Transaction')}</AlertDialogTitle>
//                         <AlertDialogDescription>
//                             {deleteModal.transaction && (
//                                 <>
//                                     {t('Are you sure you want to delete this delivery petty cash entry')} "{particulars(deleteModal.transaction)}"?{' '}
//                                     {t('This action cannot be undone.')}
//                                 </>
//                             )}
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel asChild>
//                             <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
//                                 {t('Cancel')}
//                             </button>
//                         </AlertDialogCancel>
//                         <AlertDialogAction asChild>
//                             <button
//                                 className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
//                                 disabled={deleteProcessing}
//                                 onClick={confirmDelete}
//                             >
//                                 {deleteProcessing ? t('Deleting...') : t('Delete')}
//                             </button>
//                         </AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>

//             <style>{`
//                 @media print {
//                     @page {
//                         size: A4 landscape;
//                         margin: 10mm;
//                         margin-top: 5mm;
//                     }

//                     body * {
//                         visibility: hidden;
//                     }

//                     #printable-ledger,
//                     #printable-ledger * {
//                         visibility: visible;
//                     }

//                     #printable-ledger {
//                         position: absolute;
//                         left: 0;
//                         top: 0;
//                         width: 100%;
//                         background: white !important;
//                         border: none !important;
//                         box-shadow: none !important;
//                     }

//                     .no-print {
//                         display: none !important;
//                     }

//                     .print-header {
//                         margin-bottom: 20px;
//                         border-bottom: 2pt solid #000;
//                         padding-bottom: 10px;
//                         display: block !important;
//                     }

//                     table {
//                         width: 100% !important;
//                         border-collapse: collapse !important;
//                         font-size: 8pt !important;
//                         color: #000 !important;
//                         page-break-inside: auto;
//                     }

//                     tr {
//                         page-break-inside: avoid;
//                         page-break-after: auto;
//                     }

//                     thead {
//                         display: table-header-group;
//                     }

//                     th, td {
//                         border: 0.5pt solid #000 !important;
//                         padding: 4pt !important;
//                         color: #000 !important;
//                         white-space: normal !important;
//                         text-align: left;
//                     }

//                     th {
//                         background-color: #f1f5f9 !important;
//                         -webkit-print-color-adjust: exact;
//                         font-weight: bold;
//                         text-transform: uppercase;
//                     }

//                     .text-right {
//                         text-align: right !important;
//                     }

//                     .text-center {
//                         text-align: center !important;
//                     }

//                     .print-footer {
//                         margin-top: 30px;
//                         padding-top: 10px;
//                         border-top: 1pt solid #e0e0e0;
//                         font-size: 8pt;
//                         display: flex !important;
//                         justify-content: space-between;
//                         color: #666 !important;
//                     }
//                 }
//             `}</style>
//         </AppLayout>
//     );
// }