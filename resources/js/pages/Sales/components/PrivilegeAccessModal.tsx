import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ShieldCheck } from 'lucide-react';
import { t } from '@/lib/i18n';
import axios from 'axios';
import { toast } from 'sonner';

interface PrivilegeAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerSelect: (customer: any) => void;
}

export default function PrivilegeAccessModal({
    isOpen,
    onClose,
    onCustomerSelect
}: PrivilegeAccessModalProps) {
    const [searchMode, setSearchMode] = useState<'card' | 'phone'>('phone');
    const [searchValue, setSearchValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [customer, setCustomer] = useState<any>(null);

    const handleSearch = async () => {
        if (!searchValue) return;
        setIsLoading(true);
        try {
            const response = await axios.post('/api/privilege-users/search', {
                type: searchMode,
                value: searchValue
            });
            
            if (response.data && response.data.customer) {
                setCustomer(response.data.customer);
                toast.success(t('Customer found'));
            } else {
                setCustomer(null);
                toast.error(t('Customer not found'));
            }
        } catch (error) {
            console.error(error);
            toast.error(t('Error searching customer'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('Privilege Customer Selection')}</DialogTitle>
                    <DialogDescription>
                        {t('Search by card number or mobile phone')}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="phone" onValueChange={(v) => setSearchMode(v as 'card' | 'phone')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="card">{t('Privilege Card No')}</TabsTrigger>
                        <TabsTrigger value="phone">{t('Mobile No')}</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex gap-2 mt-4">
                        <Input 
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={searchMode === 'card' ? t('Enter privilege card number') : t('Enter mobile number')}
                            autoFocus
                        />
                        <Button onClick={handleSearch} disabled={isLoading}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </Tabs>

                {customer && (
                    <div className="space-y-4 mt-4 border rounded-md p-4 bg-slate-50">
                        <h3 className="font-semibold text-sm text-gray-700 border-b pb-2">{t('Customer Details')}</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="block text-gray-500">{t('Customer Code')}</span>
                                <span className="font-medium">{customer.customer_code}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">{t('Customer Name')}</span>
                                <span className="font-medium">{customer.name}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">{t('NIC Number')}</span>
                                <span className="font-medium">{customer.nic || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-gray-500">{t('Phone')}</span>
                                <span className="font-medium">{customer.phone}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button className="flex-1" onClick={() => onCustomerSelect(customer)}>
                                {t('Select Customer')}
                            </Button>
                        </div>
                    </div>
                )}
                
                <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
                     <div className="flex gap-2">
                        <Button variant="secondary" size="sm">
                             <ShieldCheck className="h-4 w-4 mr-2" />
                             {t('Get Permission')}
                        </Button>
                     </div>
                     <Button variant="outline" onClick={onClose}>{t('Close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
