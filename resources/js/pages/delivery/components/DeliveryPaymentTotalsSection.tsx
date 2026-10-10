import React, { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CreditCard, Save, RefreshCcw, Receipt, Landmark, FileText, X, CheckCircle2, PauseCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

interface DeliveryPaymentTotalsSectionProps {
    data: any;
    setData: (key: string, value: any) => void;
    processing: boolean;
    autoPrintEnabled: boolean;
    setAutoPrintEnabled: (enabled: boolean) => void;
    setIsMobilePreviewOpen: (open: boolean) => void;
    printReceipt: () => void;
    handleSave: (e: React.FormEvent) => void;
    handleHoldSale: () => void;
    setIsHoldModalOpen: (open: boolean) => void;
    heldSalesCount: number;
    handlePaymentModeChange: (mode: string) => void;
    cashPaymentRef: React.RefObject<HTMLInputElement | null>;
    cardPaymentRef: React.RefObject<HTMLInputElement | null>;
    bankAccounts?: Array<{ id: number; bank_name: string; branch_name: string }>;
    selectedCustomer?: any;
    vatBreakdown?: any;
    entryMode?: string;
    isOverallDiscountAuthorized?: boolean;
    onRequestOverallDiscountAuth?: () => void;
    onApplyCredit?: (amount: number) => void;
    onClearCredit?: () => void;
}


const DeliveryPaymentTotalsSection: React.FC<DeliveryPaymentTotalsSectionProps> = ({
    data,
    setData,
    processing,
    autoPrintEnabled,
    setAutoPrintEnabled,
    setIsMobilePreviewOpen,
    printReceipt,
    handleSave,
    handleHoldSale,
    setIsHoldModalOpen,
    heldSalesCount,
    handlePaymentModeChange,
    cashPaymentRef,
    cardPaymentRef,
    bankAccounts = [],
    selectedCustomer,
    vatBreakdown,
    entryMode,
    isOverallDiscountAuthorized = false,
    onRequestOverallDiscountAuth,
    onApplyCredit,
    onClearCredit,
}) => {
    // Check if customer is registered (not the default '0001' cash customer)
    const isRegisteredCustomer = data.customer_code && data.customer_code !== '0001';

    // ── Cheque dialog ──────────────────────────────────────────────────────────
    const [isChequeDialogOpen, setIsChequeDialogOpen] = useState(false);
    const chequeAmountRef = useRef<HTMLInputElement>(null);
    const chequeNoRef = useRef<HTMLInputElement>(null);
    const chequeBankRef = useRef<HTMLInputElement>(null);
    const chequeBranchRef = useRef<HTMLInputElement>(null);
    const chequeOkButtonRef = useRef<HTMLButtonElement>(null);
    const [chequeForm, setChequeForm] = useState({
        amount: '',
        cheque_no: '',
        bank: '',
        branch: '',
        date: new Date().toISOString().split('T')[0],
    });

    const openChequeDialog = () => {
        if (!isRegisteredCustomer) {
            toast.error('Please select a registered customer first before using cheque payment.');
            return;
        }

        setChequeForm({
            amount: data.cheque_payment ? String(data.cheque_payment) : '',
            cheque_no: data.cheque_no || '',
            bank: data.cheque_bank || '',
            branch: data.cheque_branch || '',
            date: data.cheque_date || new Date().toISOString().split('T')[0],
        });
        setIsChequeDialogOpen(true);
    };

    // ── Bank Transfer dialog state (must be declared before useEffect) ─────────
    const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
    const bankAccountRef = useRef<HTMLSelectElement>(null);
    const bankRefRef = useRef<HTMLInputElement>(null);
    const [bankForm, setBankForm] = useState({
        amount: '',
        bank_name: '',
        branch: '',
        ref: '',
        account_id: '',
    });

    // ── Card dialog ──────────────────────────────────────────────────────────
    const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
    const cardAmountRef = useRef<HTMLInputElement>(null);
    const cardAccountRef = useRef<HTMLSelectElement>(null);
    const [cardForm, setCardForm] = useState({
        amount: '',
        account_id: '',
        bank_name: '',
        branch: '',
    });

    const openBankDialog = () => {
        setBankForm({
            amount: data.bank_transfer_payment ? String(data.bank_transfer_payment) : '',
            bank_name: data.bank_name || '',
            branch: data.bank_branch || '',
            ref: data.bank_ref || '',
            account_id: data.bank_account_id ? String(data.bank_account_id) : '',
        });
        setIsBankDialogOpen(true);
    };

    const openCardDialog = () => {
        setCardForm({
            amount: data.card_payment ? String(data.card_payment) : '',
            account_id: data.card_bank_account_id ? String(data.card_bank_account_id) : '',
            bank_name: data.card_bank_name || '',
            branch: data.card_bank_branch || '',
        });
        setIsCardDialogOpen(true);
    };

    // Keyboard shortcuts: F1=Cash, F2=Credit, F3=Card, F4=Cheque, F5=Bank Transfer
    useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            // Always allow F1/F2/F3/F4/F5 to switch modes or open dialogs (even when focus is in an input)
            if (e.key === 'F1') {
                e.preventDefault();
                handlePaymentModeChange('cash');
                return;
            }
            if (e.key === 'F2') {
                e.preventDefault();
                if (isRegisteredCustomer) {
                    handlePaymentModeChange('credit');
                }
                return;
            }
            if (e.key === 'F3') {
                e.preventDefault();
                handlePaymentModeChange('card');
                openCardDialog();
                return;
            }
            if (e.key === 'F4') {
                e.preventDefault();
                if (isRegisteredCustomer) {
                    handlePaymentModeChange('cheque');
                    openChequeDialog();
                }
                return;
            }
            if (e.key === 'F5') {
                e.preventDefault();
                if (isRegisteredCustomer) {
                    handlePaymentModeChange('bank_transfer');
                    openBankDialog();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [handlePaymentModeChange, isRegisteredCustomer]);

    const handleChequeOk = async () => {
        const amt = Number(chequeForm.amount) || 0;
        
        if (!chequeForm.cheque_no) {
            toast.error('Cheque number is required');
            return;
        }
        if (!chequeForm.bank) {
            toast.error('Bank name is required');
            return;
        }
        if (!chequeForm.branch) {
            toast.error('Branch name is required');
            return;
        }

        try {
            // Check if cheque already exists in the same bank and branch
            const params = new URLSearchParams({
                cheque_no: chequeForm.cheque_no,
                bank_name: chequeForm.bank,
                branch: chequeForm.branch,
            });
            
            // If we are in edit mode (data.id exists), exclude the current sale from validation
            if (data.id) {
                params.append('exclude_sale_id', String(data.id));
            }

            const response = await fetch(`/sales/validate-cheque?${params.toString()}`);
            const result = await response.json();

            if (result.exists) {
                toast.error(`Cheque No. ${chequeForm.cheque_no} already exists for ${chequeForm.bank}, ${chequeForm.branch} branch.`);
                return;
            }
        } catch (error) {
            console.error('Error validating cheque:', error);
            // We continue if validation fails due to network error, or we could stop.
            // Decided to allow if API is down but log error.
        }

        setData('cheque_payment', amt);
        setData('cheque_no', chequeForm.cheque_no);
        setData('cheque_bank', chequeForm.bank);
        setData('cheque_branch', chequeForm.branch);
        setData('cheque_date', chequeForm.date);
        // Close dialog immediately - payment mode will auto-select via useEffect
        setIsChequeDialogOpen(false);
    };

    // Auto-detect and select cheque mode when cheque data is populated
    useEffect(() => {
        const hasChequeData = data.cheque_payment && Number(data.cheque_payment) > 0 && data.cheque_no && data.cheque_bank;
        if (hasChequeData && data.payment_mode !== 'cheque') {
            handlePaymentModeChange('cheque');
        }
    }, [data.cheque_payment, data.cheque_no, data.cheque_bank]);

    // Auto-detect and select bank transfer mode when bank data is populated
    useEffect(() => {
        const hasBankData = data.bank_transfer_payment && Number(data.bank_transfer_payment) > 0 && data.bank_name && data.bank_branch;
        if (hasBankData && data.payment_mode !== 'bank_transfer') {
            handlePaymentModeChange('bank_transfer');
        }
    }, [data.bank_transfer_payment, data.bank_name, data.bank_branch]);

    // Auto-open bank transfer dialog when payment mode is switched to bank_transfer
    useEffect(() => {
        if (data.payment_mode === 'bank_transfer' && !isBankDialogOpen) {
            // Small delay to ensure state updates are complete
            const timer = setTimeout(() => {
                openBankDialog();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [data.payment_mode]);

    // Auto-open cheque dialog when payment mode is switched to cheque
    useEffect(() => {
        if (data.payment_mode === 'cheque' && !isChequeDialogOpen && isRegisteredCustomer) {
            // Small delay to ensure state updates are complete
            const timer = setTimeout(() => {
                openChequeDialog();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [data.payment_mode, isRegisteredCustomer]);

    // Auto-open card dialog when payment mode is switched to card
    useEffect(() => {
        if (data.payment_mode === 'card' && !isCardDialogOpen) {
            const timer = setTimeout(() => {
                openCardDialog();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [data.payment_mode]);

    // Note: Pricing and discount clearing is now handled in Create.tsx's handlePaymentModeChange
    // This useEffect is kept as a safety net only for edge cases
    useEffect(() => {
        // Extra safeguard: if we're in a problematic state, try to fix it
        // This should rarely trigger if handlePaymentModeChange is working correctly
        if (data.discount_amount > 0 && (data.payment_mode === 'card' || data.payment_mode === 'credit')) {
            setData('discount_amount', 0);
        }
    }, [data.payment_mode]);

    const clearCheque = (e: React.MouseEvent) => {
        e.stopPropagation();
        setData('cheque_payment', '');
        setData('cheque_no', '');
        setData('cheque_bank', '');
        setData('cheque_branch', '');
        setData('cheque_date', new Date().toISOString().split('T')[0]);
        if (data.payment_mode === 'cheque') handlePaymentModeChange('cash');
    };



    const handleBankOk = () => {
        const amt = Number(bankForm.amount) || 0;
        setData('bank_transfer_payment', amt);
        setData('bank_name', bankForm.bank_name);
        setData('bank_branch', bankForm.branch);
        setData('bank_ref', bankForm.ref);
        setData('bank_account_id', bankForm.account_id ? Number(bankForm.account_id) : '');
        // Close dialog immediately - payment mode will auto-select via useEffect
        setIsBankDialogOpen(false);
    };

    const clearBank = (e: React.MouseEvent) => {
        e.stopPropagation();
        setData('bank_transfer_payment', '');
        setData('bank_name', '');
        setData('bank_branch', '');
        setData('bank_ref', '');
        setData('bank_account_id', '');
        if (data.payment_mode === 'bank_transfer') handlePaymentModeChange('cash');
    };



    const handleCardOk = () => {
        const amt = Number(cardForm.amount) || 0;
        setData('card_payment', amt);
        setData('card_bank_account_id', cardForm.account_id ? Number(cardForm.account_id) : '');
        // We use bank_name/branch for visual feedback if needed, though card_bank_account_id is primary
        setData('card_bank_name', cardForm.bank_name);
        setData('card_bank_branch', cardForm.branch);
        setIsCardDialogOpen(false);
    };

    const clearCard = (e: React.MouseEvent) => {
        e.stopPropagation();
        setData('card_payment', '');
        setData('card_bank_account_id', '');
        setData('card_bank_name', '');
        setData('card_bank_branch', '');
        if (data.payment_mode === 'card') handlePaymentModeChange('cash');
    };

    const chequeAmount = Number(data.cheque_payment) || 0;
    const bankAmount = Number(data.bank_transfer_payment) || 0;
    const cardAmount = Number(data.card_payment) || 0;

    return (
        <div className="space-y-2 pt-4 border-t-2 border-blue-50">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Payment Inputs Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-gray-700 flex items-center">
                            <CreditCard className="w-4 h-4 mr-2 text-blue-500" />
                            Payment Mode
                        </Label>
                        <div className="flex flex-wrap gap-3 rounded-lg border border-blue-200 bg-white/50 p-2 backdrop-blur-sm">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="payment_mode"
                                    value="cash"
                                    checked={data.payment_mode === 'cash'}
                                    onChange={() => handlePaymentModeChange('cash')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                                />
                                <span className="text-xs font-medium">Cash <span className="text-[10px] text-slate-400">(F1)</span></span>
                            </label>
                            <label className={`flex items-center space-x-2 ${!isRegisteredCustomer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name="payment_mode"
                                    value="credit"
                                    checked={data.payment_mode === 'credit'}
                                    onChange={() => isRegisteredCustomer && handlePaymentModeChange('credit')}
                                    disabled={!isRegisteredCustomer}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                                />
                                <span className="text-xs font-medium">Credit <span className="text-[10px] text-slate-400">(F2)</span></span>
                                {!isRegisteredCustomer && (
                                    <span className="text-[10px] text-orange-600 font-normal">(Requires registered customer)</span>
                                )}
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="payment_mode"
                                    value="card"
                                    checked={data.payment_mode === 'card'}
                                    onChange={() => handlePaymentModeChange('card')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                                />
                                <span className="text-xs font-medium">Card <span className="text-[10px] text-slate-400">(F3)</span></span>
                            </label>
                            <label className={`flex items-center space-x-2 ${!isRegisteredCustomer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name="payment_mode"
                                    value="cheque"
                                    checked={data.payment_mode === 'cheque'}
                                    onChange={() => isRegisteredCustomer && handlePaymentModeChange('cheque')}
                                    disabled={!isRegisteredCustomer}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                                />
                                <span className="text-xs font-medium">Cheque <span className="text-[10px] text-slate-400">(F4)</span></span>
                                {!isRegisteredCustomer && (
                                    <span className="text-[10px] text-orange-600 font-normal">(Requires registered customer)</span>
                                )}
                            </label>
                            <label className={`flex items-center space-x-2 ${!isRegisteredCustomer ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name="payment_mode"
                                    value="bank_transfer"
                                    checked={data.payment_mode === 'bank_transfer'}
                                    onChange={() => isRegisteredCustomer && handlePaymentModeChange('bank_transfer')}
                                    disabled={!isRegisteredCustomer}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                                />
                                <span className="text-xs font-medium">Bank Transfer <span className="text-[10px] text-slate-400">(F5)</span></span>
                                {!isRegisteredCustomer && (
                                    <span className="text-[10px] text-orange-600 font-normal">(Requires registered customer)</span>
                                )}
                            </label>                            
                            {/* <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="payment_mode"
                                    value="bank_transfer"
                                    checked={data.payment_mode === 'bank_transfer'}
                                    onChange={() => handlePaymentModeChange('bank_transfer')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                                />
                                <span className="text-xs font-medium">Bank Transfer <span className="text-[10px] text-slate-400">(F5)</span></span>
                            </label>                         */}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                            <Label htmlFor="cash_payment" className="text-xs font-medium text-gray-700">Cash Payment</Label>
                            <Input
                                ref={cashPaymentRef}
                                id="cash_payment"
                                type="number"
                                value={data.cash_payment}
                                onChange={(e) => setData('cash_payment', Number(e.target.value))}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSave(e as any);
                                    }
                                }}
                                className="h-9 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="discount_percentage" className="text-xs font-medium text-gray-700">Discount (%)</Label>
                            <div onClick={() => {
                                if (!isOverallDiscountAuthorized && onRequestOverallDiscountAuth) {
                                    onRequestOverallDiscountAuth();
                                }
                            }}>
                                <Input
                                    id="discount_percentage"
                                    type="number"
                                    value={data.discount_percentage}
                                    readOnly={!isOverallDiscountAuthorized}
                                    onChange={(e) => isOverallDiscountAuthorized && setData('discount_percentage', Number(e.target.value))}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    className={`h-9 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm ${!isOverallDiscountAuthorized ? 'cursor-pointer' : ''}`}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                             {/* Placeholder to maintain grid if needed, or we can add something else here */}
                        </div>
                    </div>

                    {/* ── Cheque & Bank Transfer icon buttons ── */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Additional Payment Methods</Label>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            {/* Card button */}
                            <div className="relative flex-1">
                                <button
                                    type="button"
                                    onClick={openCardDialog}
                                    className={`w-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 transition-all duration-200 select-none
                                        ${cardAmount > 0
                                            ? 'border-blue-400 bg-blue-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                                        }`}
                                >
                                    <CreditCard className={`w-7 h-7 ${cardAmount > 0 ? 'text-blue-500' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-semibold ${cardAmount > 0 ? 'text-blue-700' : 'text-slate-600'}`}>Card</span>
                                    {cardAmount > 0 && (
                                        <span className="text-[11px] font-bold text-blue-700">Rs {cardAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                                    )}
                                </button>
                                {cardAmount > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearCard}
                                        className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-blue-200 hover:bg-blue-300 z-10"
                                    >
                                        <X className="w-3 h-3 text-blue-700" />
                                    </button>
                                )}
                            </div>

                            {/* Cheque button */}
                            <div className="relative flex-1">
                                <button
                                    type="button"
                                    disabled={!isRegisteredCustomer}
                                    onClick={openChequeDialog}
                                    className={`w-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 transition-all duration-200 select-none
                                        ${!isRegisteredCustomer ? 'cursor-not-allowed opacity-60 border-slate-200 bg-slate-50' : 'cursor-pointer'}
                                        ${chequeAmount > 0
                                            ? 'border-amber-400 bg-amber-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                                        }`}
                                >
                                    <FileText className={`w-7 h-7 ${chequeAmount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-semibold ${chequeAmount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>Cheque</span>
                                    {chequeAmount > 0 && (
                                        <span className="text-[11px] font-bold text-amber-700">Rs {chequeAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                                    )}
                                </button>
                                {chequeAmount > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearCheque}
                                        className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-amber-200 hover:bg-amber-300 z-10"
                                    >
                                        <X className="w-3 h-3 text-amber-700" />
                                    </button>
                                )}
                            </div>

                            {/* Bank Transfer button */}
                            <div className="relative flex-1">
                                <button
                                    type="button"
                                    disabled={!isRegisteredCustomer}
                                    onClick={openBankDialog}
                                    className={`w-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 transition-all duration-200 select-none
                                        ${!isRegisteredCustomer ? 'cursor-not-allowed opacity-60 border-slate-200 bg-slate-50' : 'cursor-pointer'}
                                        ${bankAmount > 0
                                            ? 'border-indigo-400 bg-indigo-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                                        }`}
                                >
                                    <Landmark className={`w-7 h-7 ${bankAmount > 0 ? 'text-indigo-500' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-semibold ${bankAmount > 0 ? 'text-indigo-700' : 'text-slate-600'}`}>Bank</span>
                                    {bankAmount > 0 && (
                                        <span className="text-[11px] font-bold text-indigo-700">Rs {bankAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
                                    )}
                                </button>
                                {bankAmount > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearBank}
                                        className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-indigo-200 hover:bg-indigo-300 z-10"
                                    >
                                        <X className="w-3 h-3 text-indigo-700" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 p-2 bg-blue-50/50 rounded-lg border border-blue-200">
                        <input
                            type="checkbox"
                            id="auto-print"
                            checked={autoPrintEnabled}
                            onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                        />
                        <Label htmlFor="auto-print" className="text-xs cursor-pointer">
                            Auto-print receipt after saving
                        </Label>
                    </div>
                </div>

                {/* Order Summary Section */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-semibold text-blue-800 mb-2">Order Summary</h3>

                        {data.is_vat_invoice && (
                            <div className="flex justify-between text-[10px] text-green-600 font-bold bg-green-50 p-1 rounded mb-2">
                                <span>VAT Status:</span>
                                <span>VAT INVOICE</span>
                            </div>
                        )}

                        {!isRegisteredCustomer && (
                            <div className="flex justify-between text-[10px] text-orange-600 font-bold bg-orange-50 p-1 rounded mb-2">
                                <span>Payment Restriction:</span>
                                <span>Partial payments require registered customer</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Subtotal:</span>
                                <span className="font-medium">{Number(data.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Discount:</span>
                                <span className="font-medium text-red-600">-{Number(data.total_discount || 0).toFixed(2)}</span>
                            </div>
                            {data.is_vat_invoice && (
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span>VAT ({data.vat_rate}%):</span>
                                    <span className="font-medium text-green-600">{Number(data.tax_amount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-blue-800 border-t border-blue-200 pt-2">
                                <span>Total:</span>
                                <span>{Number(data.total_amount).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between text-sm font-semibold text-blue-600">
                                <span>Balance:</span>
                                <span>{Number(data.balance_amount).toFixed(2)}</span>
                            </div>

                            {isRegisteredCustomer && selectedCustomer && (
                                <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
                                    <div className="flex justify-between text-xs text-gray-700">
                                        <span className="font-semibold uppercase tracking-tight">Customer Outstanding:</span>
                                        <span className={`font-bold ${selectedCustomer.outstanding_balance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            Rs {Math.abs(selectedCustomer.outstanding_balance || 0).toFixed(2)}
                                            {selectedCustomer.outstanding_balance < 0 ? ' CR' : ''}
                                        </span>
                                    </div>

                                    {/* Apply Credit Balance panel — shown only when customer has credit */}
                                    {selectedCustomer.outstanding_balance < 0 && Number(data.total_amount) > 0 && (() => {
                                        const availableCredit = Math.abs(selectedCustomer.outstanding_balance || 0);
                                        const creditToApply = Math.min(availableCredit, Number(data.total_amount));
                                        const creditUsed = Number(data.credit_used) || 0;
                                        const isCreditApplied = creditUsed > 0;

                                        return (
                                            <div className={`rounded-lg border-2 p-2 transition-all duration-200 ${
                                                isCreditApplied
                                                    ? 'border-green-400 bg-green-50'
                                                    : 'border-dashed border-green-300 bg-green-50/50'
                                            }`}>
                                                {isCreditApplied ? (
                                                    // Applied state
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-green-700 uppercase tracking-wide flex items-center gap-1">
                                                                <span>✓</span> Credit Applied
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => onClearCredit && onClearCredit()}
                                                                className="text-[10px] text-red-500 hover:text-red-700 font-medium underline"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-green-700">Rs {creditUsed.toFixed(2)} from CR balance</span>
                                                            <span className="text-[10px] text-green-600">
                                                                CR left: Rs {(availableCredit - creditUsed).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Not applied state
                                                    <button
                                                        type="button"
                                                        onClick={() => onApplyCredit && onApplyCredit(creditToApply)}
                                                        className="w-full flex items-center justify-between group"
                                                    >
                                                        <div className="text-left">
                                                            <div className="text-[11px] font-bold text-green-700 uppercase tracking-wide">Apply Credit Balance</div>
                                                            <div className="text-[10px] text-green-600">
                                                                Use Rs {creditToApply.toFixed(2)} CR toward this sale
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-green-700 bg-green-200 group-hover:bg-green-300 px-2 py-1 rounded-md transition-colors">
                                                            Apply
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 font-medium"
                            disabled={processing || data.items.length === 0}
                        >
                            {processing ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="text-sm">Processing...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Save className="w-4 h-4" />
                                    <span className="text-sm">Save Sale (F11)</span>
                                </div>
                            )}
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 h-10 shadow-sm transition-all"
                                onClick={handleHoldSale}
                                disabled={data.items.length === 0}
                                title="Pause current sale (F9)"
                            >
                                <PauseCircle className="w-4 h-4 mr-2" />
                                <span className="text-xs">Pause (F9)</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 h-10 relative shadow-sm transition-all"
                                onClick={() => setIsHoldModalOpen(true)}
                                title="View paused sales"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                <span className="text-xs">Paused</span>
                                {heldSalesCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                        {heldSalesCount}
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Button type="button" variant="outline" size="sm" className="h-9 text-[11px]" onClick={() => router.visit('/admin/customer-payments/create')}>
                                <RefreshCcw className="w-3 h-3 mr-1.5" />
                                Customer Payment
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-9 text-[11px]" onClick={() => router.visit('/pos/cheque-return')}>
                                <Receipt className="w-3 h-3 mr-1.5" />
                                Cheque Return
                            </Button>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full text-sm"
                        >
                            Bill Re Print
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Cheque Dialog ──────────────────────────────────────────── */}
            <Dialog open={isChequeDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    // User is trying to close - check if data is incomplete
                    const hasAnyData = Boolean(chequeForm.amount || chequeForm.cheque_no);
                    const isIncomplete = !chequeForm.amount || !chequeForm.cheque_no;
                    
                    if (hasAnyData && isIncomplete) {
                        // Partial data entered - prevent closing
                        toast.error('Please fill all required fields (Amount & Cheque No.) before closing');
                        return;
                    }
                }
                setIsChequeDialogOpen(open);
            }}>
                <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Cheque Payment
                        </DialogTitle>
                        <DialogDescription>
                            Enter cheque details including the amount, cheque number, bank name, and branch information.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Amount <span className="text-red-500">*</span></Label>
                            <Input
                                ref={chequeAmountRef}
                                type="number"
                                autoFocus
                                value={chequeForm.amount}
                                onChange={(e) => setChequeForm(f => ({ ...f, amount: e.target.value }))}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onKeyDown={(e) => { 
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        chequeNoRef.current?.focus();
                                    }
                                }}
                                placeholder="0.00"
                                className="h-11 text-base font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Cheque No. <span className="text-red-500">*</span></Label>
                                <Input
                                    ref={chequeNoRef}
                                    type="text"
                                    value={chequeForm.cheque_no}
                                    onChange={(e) => setChequeForm(f => ({ ...f, cheque_no: e.target.value }))}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            chequeBankRef.current?.focus();
                                        }
                                    }}
                                    placeholder="e.g. 001234"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Cheque Date</Label>
                                <Input
                                    type="date"
                                    value={chequeForm.date}
                                    onChange={(e) => setChequeForm(f => ({ ...f, date: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Bank <span className="text-red-500">*</span></Label>
                                <Input
                                    ref={chequeBankRef}
                                    type="text"
                                    value={chequeForm.bank}
                                    onChange={(e) => setChequeForm(f => ({ ...f, bank: e.target.value }))}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            chequeBranchRef.current?.focus();
                                        }
                                    }}
                                    placeholder="e.g. Bank of Ceylon"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Branch <span className="text-red-500">*</span></Label>
                                <Input
                                    ref={chequeBranchRef}
                                    type="text"
                                    value={chequeForm.branch}
                                    onChange={(e) => setChequeForm(f => ({ ...f, branch: e.target.value }))}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            chequeOkButtonRef.current?.focus();
                                        }
                                    }}
                                    placeholder="e.g. Kandy"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            className="w-full sm:w-auto"
                            onClick={() => {
                                const hasAnyData = Boolean(chequeForm.amount || chequeForm.cheque_no);
                                const isIncomplete = !chequeForm.amount || !chequeForm.cheque_no;
                                
                                if (hasAnyData && isIncomplete) {
                                    toast.error('Please fill all required fields (Amount & Cheque No.) before closing');
                                    return;
                                }
                                setIsChequeDialogOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            ref={chequeOkButtonRef}
                            className="w-full bg-amber-500 text-white hover:bg-amber-600 sm:w-auto"
                            onClick={handleChequeOk}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChequeOk(); } }}
                            disabled={!chequeForm.amount || !chequeForm.cheque_no || !chequeForm.bank || !chequeForm.branch}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Card Payment Dialog ───────────────────────────────────── */}
            <Dialog open={isCardDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    const hasAnyData = Boolean(cardForm.amount || cardForm.account_id);
                    const isIncomplete = !cardForm.amount || !cardForm.account_id;
                    if (hasAnyData && isIncomplete) {
                        toast.error('Please fill required fields (Amount & Bank Account) before closing');
                        return;
                    }
                }
                setIsCardDialogOpen(open);
            }}>
                <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                            Card Payment Details
                        </DialogTitle>
                        <DialogDescription>
                            Select the bank account where the card payment will be deposited and enter any reference information.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Amount <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                autoFocus
                                value={cardForm.amount}
                                onChange={(e) => setCardForm(f => ({ ...f, amount: e.target.value }))}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onKeyDown={(e) => { 
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        cardAccountRef.current?.focus();
                                    }
                                }}
                                placeholder="0.00"
                                className="h-11 text-base font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Deposit Bank Account <span className="text-red-500">*</span></Label>
                            <select
                                ref={cardAccountRef}
                                value={cardForm.account_id}
                                onChange={(e) => {
                                    const accountId = e.target.value;
                                    const matched = bankAccounts.find(b => String(b.id) === accountId);
                                    setCardForm(f => ({
                                        ...f,
                                        account_id: accountId,
                                        bank_name: matched ? matched.bank_name : '',
                                        branch: matched ? matched.branch_name : ''
                                    }));
                                }}
                                className="block w-full rounded-lg border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 px-3 py-2"
                                required
                            >
                                <option value="">Select bank account</option>
                                {bankAccounts.map((b) => (
                                    <option key={b.id} value={String(b.id)}>{b.bank_name} — {b.branch_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-1">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Branch</Label>
                                <Input
                                    type="text"
                                    value={cardForm.branch}
                                    disabled
                                    className="bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsCardDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCardOk}
                            disabled={!cardForm.amount || !cardForm.account_id}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Bank Transfer Dialog ───────────────────────────────────── */}
            <Dialog open={isBankDialogOpen} onOpenChange={(open) => {
                // Only validate when intentionally closing via X button or outside click
                // (not when OK button is clicked - that's handled by handleBankOk)
                if (!open) {
                    const hasAnyData = Boolean(bankForm.amount || bankForm.bank_name || bankForm.ref);
                    const isIncomplete = !bankForm.amount || !bankForm.bank_name || !bankForm.ref;
                    
                    if (hasAnyData && isIncomplete) {
                        toast.error('Please fill all required fields (Amount, Bank Account & Reference) before closing');
                        return;
                    }
                }
                setIsBankDialogOpen(open);
            }}>
                <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-indigo-500" />
                            Bank Transfer Payment
                        </DialogTitle>
                        <DialogDescription>
                            Enter bank transfer details including the amount, bank name, branch, and reference number.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Amount <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                autoFocus
                                value={bankForm.amount}
                                onChange={(e) => setBankForm(f => ({ ...f, amount: e.target.value }))}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                onKeyDown={(e) => { 
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                        e.preventDefault();
                                        bankAccountRef.current?.focus();
                                    }
                                }}
                                placeholder="0.00"
                                className="h-11 text-base font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">Bank Account <span className="text-red-500">*</span></Label>
                            <select
                                ref={bankAccountRef}
                                value={bankForm.account_id}
                                onChange={(e) => {
                                    const accountId = e.target.value;
                                    const matched = bankAccounts.find(b => String(b.id) === accountId);
                                    setBankForm(f => ({
                                        ...f,
                                        account_id: accountId,
                                        bank_name: matched ? matched.bank_name : '',
                                        branch: matched ? matched.branch_name : ''
                                    }));
                                }}
                                onKeyDown={(e) => { 
                                    if (e.key === 'Tab') {
                                        e.preventDefault();
                                        bankRefRef.current?.focus();
                                    }
                                }}
                                className="block w-full rounded-lg border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 px-3 py-2"
                                required
                            >
                                <option value="">Select bank account</option>
                                {bankAccounts.map((b) => (
                                    <option key={b.id} value={String(b.id)}>{b.bank_name} — {b.branch_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Reference No. <span className="text-red-500">*</span></Label>
                                <Input
                                    ref={bankRefRef}
                                    type="text"
                                    value={bankForm.ref}
                                    onChange={(e) => setBankForm(f => ({ ...f, ref: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBankOk(); } }}
                                    placeholder="e.g. TRF123456"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">Branch</Label>
                                <Input
                                    type="text"
                                    value={bankForm.branch}
                                    onChange={(e) => setBankForm(f => ({ ...f, branch: e.target.value }))}
                                    placeholder="e.g. Colombo"
                                    disabled={!bankForm.bank_name}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            className="w-full sm:w-auto"
                            onClick={() => setIsBankDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBankOk}
                            disabled={!bankForm.amount || !bankForm.bank_name || !bankForm.ref}
                            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> OK
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DeliveryPaymentTotalsSection;
