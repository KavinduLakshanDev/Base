// import { t } from '@/lib/i18n';
// import { router, useForm } from '@inertiajs/react';
// import { useEffect, useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { ArrowDownToLine, Save } from 'lucide-react';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// interface ReimbursementFormData {
//     type: string;
//     amount: string;
//     transaction_date: string;
//     notes: string;
//     [key: string]: string;
// }

// interface Props {
//     open: boolean;
//     onOpenChange: (open: boolean) => void;
//     nextTransactionNo?: string;
// }

// export default function ReimbursementDialog({ open, onOpenChange, nextTransactionNo }: Props) {
//     const { data, setData, processing, errors, reset } = useForm<ReimbursementFormData>({
//         type: 'received',
//         amount: '',
//         transaction_date: new Date().toISOString().split('T')[0],
//         notes: '',
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
//         router.post('/admin/delivery-petty-cash-transactions', data, {
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
//                         <span className="p-1.5 bg-emerald-100 rounded-lg">
//                             <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
//                         </span>
//                         <span>{t('Add Reimbursement')}</span>
//                     </DialogTitle>
//                     <DialogDescription>
//                         {t('Record cash received into the delivery petty cash float')}
//                     </DialogDescription>
//                 </DialogHeader>

//                 <form onSubmit={onFormSubmit} className="space-y-4">
//                     <div className="space-y-2">
//                         <Label htmlFor="reimbursement_transaction_no">{t('Transaction No.')}</Label>
//                         <Input
//                             id="reimbursement_transaction_no"
//                             value={nextTransactionNo || ''}
//                             readOnly
//                             className="bg-slate-50 text-slate-500 cursor-not-allowed"
//                         />
//                     </div>

//                     <div className="space-y-2">
//                         <Label htmlFor="reimbursement_amount">{t('Amount Received (Rs)')} *</Label>
//                         <Input
//                             id="reimbursement_amount"
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
//                         <Label htmlFor="reimbursement_date">{t('Date')} *</Label>
//                         <Input
//                             id="reimbursement_date"
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
//                         <Label htmlFor="reimbursement_notes">{t('Particulars')}</Label>
//                         <Input
//                             id="reimbursement_notes"
//                             value={data.notes}
//                             onChange={(e) => setData('notes', e.target.value)}
//                             placeholder={t('e.g. Petty cash float top-up')}
//                         />
//                         {errors.notes && (
//                             <div className="text-sm text-red-600">{errors.notes}</div>
//                         )}
//                     </div>

//                     <DialogFooter className="gap-2 sm:gap-0">
//                         <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
//                             {t('Cancel')}
//                         </Button>
//                         <Button
//                             type="submit"
//                             disabled={processing}
//                             className="bg-emerald-600 hover:bg-emerald-700 text-white"
//                         >
//                             {processing ? (
//                                 <div className="flex items-center space-x-2">
//                                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
//                                     <span>{t('Saving...')}</span>
//                                 </div>
//                             ) : (
//                                 <div className="flex items-center space-x-2">
//                                     <Save className="w-4 h-4" />
//                                     <span>{t('Save Reimbursement')}</span>
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
//                                 {t('Are you sure you want to save this reimbursement record?')}
//                             </AlertDialogDescription>
//                         </AlertDialogHeader>
//                         <AlertDialogFooter>
//                             <AlertDialogCancel onClick={() => setIsConfirmDialogOpen(false)}>{t('Cancel')}</AlertDialogCancel>
//                             <AlertDialogAction onClick={confirmSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
//                                 {t('Confirm')}
//                             </AlertDialogAction>
//                         </AlertDialogFooter>
//                     </AlertDialogContent>
//                 </AlertDialog>
//             </DialogContent>
//         </Dialog>
//     );
// }