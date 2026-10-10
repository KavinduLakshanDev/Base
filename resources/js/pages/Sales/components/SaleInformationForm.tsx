import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, User, Receipt, Search, Crown } from 'lucide-react';

interface SaleInformationFormProps {
    data: any;
    setData: (key: string, value: any) => void;
    setIsCustomerDialogOpen: (open: boolean) => void;
    setIsPrivilegeModalOpen: (open: boolean) => void;
    fetchCustomerByCode: (code: string) => void;
    items?: any[];
}

const SaleInformationForm: React.FC<SaleInformationFormProps> = ({
    data,
    setData,
    setIsCustomerDialogOpen,
    setIsPrivilegeModalOpen,
    fetchCustomerByCode,
    items = []
}) => {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="transaction_date" className="text-sm font-medium text-gray-700 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                        Transaction Date
                    </Label>
                    <Input
                        id="transaction_date"
                        type="date"
                        value={data.transaction_date}
                        onChange={(e) => setData('transaction_date', e.target.value)}
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customer_code" className="text-sm font-medium text-gray-700 flex items-center">
                        <User className="w-4 h-4 mr-2 text-blue-500" />
                        Customer Code
                    </Label>
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <Input
                            id="customer_code"
                            key={`customer_code_${data.customer_code}`}
                            value={data.customer_code}
                            onChange={(e) => setData('customer_code', e.target.value)}
                            onBlur={(e) => fetchCustomerByCode(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    fetchCustomerByCode(data.customer_code);
                                }
                            }}
                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                            placeholder="e.g., CUST001"
                        />
                        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setIsCustomerDialogOpen(true)}>
                            <Search className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setIsPrivilegeModalOpen(true)}
                            className="h-10 w-10 shrink-0 text-yellow-600 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700"
                            title="Privilege Customer">
                            <Crown className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="customer_name" className="text-sm font-medium text-gray-700 flex items-center">
                        <User className="w-4 h-4 mr-2 text-blue-500" />
                        Customer Name
                    </Label>
                    <Input
                        id="customer_name"
                        value={data.customer_name}
                        readOnly
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm bg-muted"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center">
                        <Receipt className="w-4 h-4 mr-2 text-blue-500" />
                        VAT Status
                    </Label>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center space-x-2 border border-blue-200 p-3 rounded-lg bg-white/50 backdrop-blur-sm">
                            <input
                                type="checkbox"
                                id="is_vat_invoice"
                                checked={data.is_vat_invoice}
                                onChange={(e) => setData('is_vat_invoice', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-400"
                            />
                            <Label htmlFor="is_vat_invoice" className="cursor-pointer text-sm font-medium">
                                Generate VAT Invoice
                            </Label>
                            {data.is_vat_invoice && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold ml-2">VAT</span>}
                        </div>
                        <div className="flex items-center space-x-2 px-1">
                            <Label htmlFor="vat_rate" className="text-xs font-medium text-gray-600">VAT Rate (%):</Label>
                            <Input
                                id="vat_rate"
                                type="number"
                                value={data.vat_rate}
                                readOnly
                                className="w-24 h-8 text-xs border-blue-200 bg-muted"
                                step="0.01"
                            />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SaleInformationForm;
