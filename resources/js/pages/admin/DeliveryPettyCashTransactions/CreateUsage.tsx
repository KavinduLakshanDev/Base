// import { t } from '@/lib/i18n';
// import { router, useForm } from '@inertiajs/react';
// import { useEffect, useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Plus, Save } from 'lucide-react';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// interface Category {
//     id: number;
//     name: string;
// }

// interface UsageFormData {
//     type: string;
//     delivery_petty_cash_category_id: number;
//     amount: string;
//     transaction_date: string;
//     notes: string;
//     slip: File | null;
//     [key: string]: any;
// }

// interface Props {
//     open: boolean;
//     onOpenChange: (open: boolean) => void;
//     categories: Category[];
//     availableBalance?: number | string;
//     nextTransactionNo?: string;
// }

// export default function UsageDialog({ open, onOpenChange, categories, availableBalance = 0, nextTransactionNo }: Props) {
//     const { data, setData, processing, errors, reset, post } = useForm<UsageFormData>({
//         type: 'usage',
//         delivery_petty_cash_category_id: 0,
//         amount: '',
//         transaction_date: new Date().toISOString().split('T')[0],
//         notes: '',
//         slip: null,
//     });

//     useEffect(() => {
//         if (open) {
//             setData('transaction_date', new Date().toISOString().split('T')[0]);
//         }
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [open]);

//     const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

//     const onFormSubmit = (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsConfirmDialogOpen(true);
//     };

//     const confirmSubmit = () => {
//         setIsConfirmDialogOpen(false);
//         post('/admin/delivery-petty-cash-transactions', {
//             onSuccess: () => {
//                 reset();
//                 onOpenChange(false);
//             },
//         });
//     };

//     return (
//         <Dialog open={open} onOpenChange={onOpenChange}>
//             <DialogContent className="sm:max-w-md">
//                 <DialogHeader>
//                     <DialogTitle className="flex items-center space-x-2">
//                         <span className="p-1.5 bg-vismass-blue/10 rounded-lg">
//                             <Plus className="h-5 w-5 text-vismass-blue" />
//                         </span>
//                         <span>{t('Add Expenses')}</span>
//                     </DialogTitle>
//                     <DialogDescription>
//                         {t('Record delivery petty cash spent against a category')}
//                     </DialogDescription>
//                 </DialogHeader>

//                 {availableBalance !== undefined && (
//                     <div className="rounded-md bg-violet-50 p-3 border border-violet-100 mb-2">
//                         <div className="flex justify-between items-center">
//                             <span className="text-sm font-medium text-violet-800">{t('Available Balance')}</span>
//                             <span className="text-sm font-bold text-violet-900">
//                                 Rs. {Number(availableBalance).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//                             </span>
//                         </div>
//                     </div>
//                 )}

//                 <form onSubmit={onFormSubmit} className="space-y-4">
//                     <div className="space-y-2">
//                         <Label htmlFor="usage_transaction_no">{t('Transaction No.')}</Label>
//                         <Input
//                             id="usage_transaction_no"
//                             value={nextTransactionNo || ''}
//                             readOnly
//                             className="bg-slate-50 text-slate-500 cursor-not-allowed"
//                         />
//                     </div>

//                     <div className="space-y-2">
//                         <Label htmlFor="usage_category">{t('Category')} *</Label>
//                         <select
//                             id="usage_category"
//                             value={data.delivery_petty_cash_category_id}
//                             onChange={(e) => setData('delivery_petty_cash_category_id', parseInt(e.target.value, 10))}
//                             className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
//                             required
//                         >
//                             <option value="">-- {t('Select Category')} --</option>
//                             {categories.map((cat) => (
//                                 <option key={cat.id} value={cat.id}>{cat.name}</option>
//                             ))}
//                         </select>
//                         {errors.delivery_petty_cash_category_id && (
//                             <div className="text-sm text-red-600">{errors.delivery_petty_cash_category_id}</div>
//                         )}
//                     </div>

//                     <div className="space-y-2">
//                         <Label htmlFor="usage_amount">{t('Amount Used (Rs)')} *</Label>
//                         <Input
//                             id="usage_amount"
//                             type="number"
//                             step="0.01"
//                             min="0"
//                             value={data.amount}
//                             onChange={(e) => setData('amount', e.target.value)}
//                             onKeyDown={(e) => {
//                                 if (['e', 'E', '+', '-'].includes(e.key)) {
//                                     e.preventDefault();
//                                 }
//                             }}
//                             onWheel={(e) => (e.target as HTMLInputElement).blur()}
//                             placeholder="0.00"
//                             required
//                         />
//                         {errors.amount && (
//                             <div className="text-sm text-red-600">{errors.amount}</div>
//                         )}
//                     </div>

//                     <div className="space-y-2">
//                         <Label htmlFor="usage_date">{t('Date')} *</Label>
//                         <Input
//                             id="usage_date"
//                             type="date"
//                             value={data.transaction_date}
//                             onChange={(e) => setData('transaction_date', e.target.value)}
//                             required
//                         />
//                         {errors.transaction_date && (
//                             <div className="text-sm text-red-600">{errors.transaction_date}</div>
//                         )}
//                     </div>

//                     <div className="space-y-2">
//                         <Label htmlFor="usage_notes">{t('Particulars')}</Label>
//                         <Input
//                             id="usage_notes"
//                             value={data.notes}
//                             onChange={(e) => setData('notes', e.target.value)}
//                             placeholder={t('e.g. Bought stationery from ABC shop')}
//                         />
//                         {errors.notes && (
//                             <div className="text-sm text-red-600">{errors.notes}</div>
//                         )}
//                     </div>

//                     <div className="space-y-2">
//                         <Label htmlFor="usage_slip">{t('Upload Slip')}</Label>
//                         <Input
//                             id="usage_slip"
//                             type="file"
//                             accept="image/*,.pdf"
//                             onChange={(e) => setData('slip', e.target.files ? e.target.files[0] : null)}
//                         />
//                         {errors.slip && (
//                             <div className="text-sm text-red-600">{errors.slip}</div>
//                         )}
//                         <p className="text-xs text-slate-500">{t('Optional. Max size: 5MB. Formats: JPG, PNG, PDF.')}</p>
//                     </div>

//                     <DialogFooter className="gap-2 sm:gap-0">
//                         <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
//                             {t('Cancel')}
//                         </Button>
//                         <Button
//                             type="submit"
//                             disabled={processing}
//                             className="bg-vismass-blue hover:bg-vismass-blue/90 text-white"
//                         >
//                             {processing ? (
//                                 <div className="flex items-center space-x-2">
//                                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
//                                     <span>{t('Saving...')}</span>
//                                 </div>
//                             ) : (
//                                 <div className="flex items-center space-x-2">
//                                     <Save className="w-4 h-4" />
//                                     <span>{t('Save Usage')}</span>
//                                 </div>
//                             )}
//                         </Button>
//                     </DialogFooter>
//                 </form>

//                 <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
//                     <AlertDialogContent>
//                         <AlertDialogHeader>
//                             <AlertDialogTitle>{t('Confirm Save')}</AlertDialogTitle>
//                             <AlertDialogDescription>
//                                 {t('Are you sure you want to save this usage record?')}
//                             </AlertDialogDescription>
//                         </AlertDialogHeader>
//                         <AlertDialogFooter>
//                             <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>{t('Cancel')}</AlertDialogCancel>
//                             <AlertDialogAction onClick={confirmSubmit} className="bg-vismass-blue hover:bg-vismass-blue/90 text-white">
//                                 {t('Confirm')}
//                             </AlertDialogAction>
//                         </AlertDialogFooter>
//                     </AlertDialogContent>
//                 </AlertDialog>
//             </DialogContent>
//         </Dialog>
//     );
// }