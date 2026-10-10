import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ScanBarcode, KeyRound } from 'lucide-react';
import { t } from '@/lib/i18n';
import axios from 'axios';

interface AdminAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    saleDetails?: {
        invoice_no: string;
        customer_name: string;
        total_amount: number | string;
    };
    saleId?: number;
    title?: string;
    description?: string;
}

type AuthMode = 'barcode' | 'credentials';

export default function AdminAuthModal({
    isOpen,
    onClose,
    onSuccess,
    saleDetails,
    saleId,
    title = 'Admin Authorization Required',
    description = 'Enter admin credentials or scan barcode to proceed.'
}: AdminAuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('barcode');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [adminError, setAdminError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus barcode input when modal opens or mode changes to barcode
    useEffect(() => {
        if (isOpen && mode === 'barcode') {
            const timer = setTimeout(() => {
                barcodeInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, mode]);

    const handleBarcodeSubmit = async () => {
        if (!barcodeInput.trim()) {
            setAdminError(t('Please scan or enter an admin barcode.'));
            return;
        }

        setVerifying(true);
        setAdminError('');
        try {
            await axios.post('/sales/verify-admin-barcode', {
                barcode: barcodeInput.trim(),
                sale_id: saleId || null,
            });

            setBarcodeInput('');
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.message || t('Invalid or expired admin barcode.');
            setAdminError(msg);
            setBarcodeInput('');
            // Re-focus barcode input for retry
            setTimeout(() => barcodeInputRef.current?.focus(), 100);
        } finally {
            setVerifying(false);
        }
    };

    const handleCredentialSubmit = async () => {
        if (!adminEmail || !adminPassword) {
            setAdminError(t('Please enter admin email and password.'));
            return;
        }

        setVerifying(true);
        setAdminError('');
        try {
            await axios.post('/sales/verify-admin', {
                email: adminEmail,
                password: adminPassword,
                sale_id: saleId || null,
            });

            setAdminEmail('');
            setAdminPassword('');
            onSuccess();
        } catch (err: any) {
            const msg = err?.response?.data?.message || t('Invalid admin credentials.');
            setAdminError(msg);
        } finally {
            setVerifying(false);
        }
    };

    const handleClose = () => {
        setAdminEmail('');
        setAdminPassword('');
        setBarcodeInput('');
        setAdminError('');
        setMode('barcode');
        onClose();
    };

    const handleModeSwitch = (newMode: AuthMode) => {
        setMode(newMode);
        setAdminError('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleClose();
        }}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <div className="flex items-center space-x-2 mb-1">
                        <ShieldCheck className="h-5 w-5 text-vismass-blue" />
                        <DialogTitle>{t(title)}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {t(description)}
                    </DialogDescription>
                </DialogHeader>

                <style>{`
                    input[type="password"]::-ms-reveal,
                    input[type="password"]::-ms-clear {
                        display: none;
                    }
                `}</style>

                {saleDetails && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-1">
                        <p><span className="font-medium text-slate-600">{t('Invoice')}:</span> {saleDetails.invoice_no}</p>
                        <p><span className="font-medium text-slate-600">{t('Customer')}:</span> {saleDetails.customer_name}</p>
                        <p><span className="font-medium text-slate-600">{t('Total')}:</span> Rs. {Number(saleDetails.total_amount).toFixed(2)}</p>
                    </div>
                )}

                {/* Mode Toggle Tabs */}
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    <button
                        onClick={() => handleModeSwitch('barcode')}
                        disabled={verifying}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'barcode'
                                ? 'bg-vismass-blue text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <ScanBarcode className="h-4 w-4" />
                        {t('Scan Barcode')}
                    </button>
                    <button
                        onClick={() => handleModeSwitch('credentials')}
                        disabled={verifying}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'credentials'
                                ? 'bg-vismass-blue text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <KeyRound className="h-4 w-4" />
                        {t('Enter Credentials')}
                    </button>
                </div>

                <div className="space-y-4 mt-2">
                    {mode === 'barcode' ? (
                        /* Barcode Scan Mode */
                        <div className="space-y-1.5">
                            <Label htmlFor="barcode-input" className="text-sm font-medium">
                                {t('Admin Barcode')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                ref={barcodeInputRef}
                                id="barcode-input"
                                type="password"
                                value={barcodeInput}
                                onChange={(e) => { setBarcodeInput(e.target.value); setAdminError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                                placeholder={t('Scan or type admin barcode...')}
                                autoComplete="off"
                                disabled={verifying}
                                className="font-mono tracking-wider"
                            />
                            <p className="text-xs text-slate-500">
                                {t('Point the barcode scanner at the admin barcode and press Enter.')}
                            </p>
                        </div>
                    ) : (
                        /* Credentials Mode */
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="admin-email" className="text-sm font-medium">{t('Admin Email')} <span className="text-red-500">*</span></Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    value={adminEmail}
                                    onChange={(e) => { setAdminEmail(e.target.value); setAdminError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCredentialSubmit()}
                                    placeholder="admin@example.com"
                                    autoComplete="off"
                                    disabled={verifying}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="admin-password" className="text-sm font-medium">{t('Admin Password')} <span className="text-red-500">*</span></Label>
                                <Input
                                    id="admin-password"
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => { setAdminPassword(e.target.value); setAdminError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCredentialSubmit()}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    disabled={verifying}
                                />
                            </div>
                        </>
                    )}

                    {adminError && (
                        <p className="text-sm text-red-600 font-medium">{adminError}</p>
                    )}
                </div>

                <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={handleClose} disabled={verifying}>
                        {t('Cancel')}
                    </Button>
                    <Button
                        onClick={mode === 'barcode' ? handleBarcodeSubmit : handleCredentialSubmit}
                        disabled={verifying}
                        className="bg-vismass-blue hover:bg-vismass-blue/90"
                    >
                        {verifying ? (
                            <span className="flex items-center space-x-1">
                                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                <span>{t('Verifying...')}</span>
                            </span>
                        ) : (
                            <span className="flex items-center space-x-1">
                                <ShieldCheck className="h-4 w-4" />
                                <span>{t('Authorize')}</span>
                            </span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
