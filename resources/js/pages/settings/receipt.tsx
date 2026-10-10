import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import SettingsLayout from '@/layouts/settings/layout';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
    receipt_width_mm: number;
}

const Receipt: React.FC<Props> = ({ receipt_width_mm }) => {
    const { data, setData, post, processing, errors } = useForm({
        receipt_width_mm: receipt_width_mm,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/settings/receipt');
    };

    return (
        <SettingsLayout>
            <Head title={t('Receipt Settings')} />

            <div className="container mx-auto py-6">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Receipt Settings')}</CardTitle>
                            <CardDescription>
                                {t('Configure receipt printing dimensions for thermal printers')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="receipt_width_mm">
                                        {t('Receipt Width (mm)')}
                                    </Label>
                                    <Input
                                        id="receipt_width_mm"
                                        type="number"
                                        min="58"
                                        max="100"
                                        value={data.receipt_width_mm}
                                        onChange={(e) => setData('receipt_width_mm', parseInt(e.target.value))}
                                        className="w-full"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        {t('Recommended sizes: 80mm (professional standard), 76mm (POS standard), 58mm (compact)')}
                                    </p>
                                    {errors.receipt_width_mm && (
                                        <p className="text-sm text-red-600">{errors.receipt_width_mm}</p>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? t('Saving...') : t('Save Settings')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </SettingsLayout>
    );
};

export default Receipt;