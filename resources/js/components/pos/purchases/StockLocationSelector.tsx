import { MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t } from '@/lib/i18n';

interface StockLocationSelectorProps {
    stockLocationType: 'main_stock' | 'printing_section';
    onStockLocationChange: (value: 'main_stock' | 'printing_section') => void;
    companyCode?: string; // Optional: if Malibu, hide printer option
}

export default function StockLocationSelector({
    stockLocationType,
    onStockLocationChange,
    companyCode
}: StockLocationSelectorProps) {
    // Malibu only has Main Stock, no Printer GRN
    const isMalibu = companyCode?.startsWith('MAL');
    
    return (
        <div className="space-y-2">
            <Label className="flex gap-2 text-gray-700 font-medium">
                <MapPin className="w-4 h-4 text-green-500" />
                {t('Stock Location')}
            </Label>
            <Select
                value={stockLocationType}
                onValueChange={(value: 'main_stock' | 'printing_section') => {
                    onStockLocationChange(value);
                }}
            >
                <SelectTrigger className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
                    <SelectValue placeholder={t('Select Location')} />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-green-200 rounded-lg shadow-xl">
                    <SelectItem value="printing_section" className="hover:bg-green-50 focus:bg-green-50 transition-colors">
                        <div className="flex items-center gap-3 py-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold text-green-700">{t('Printer GRN')}</span>
                        </div>
                    </SelectItem>
                    <SelectItem value="main_stock" className="hover:bg-amber-50 focus:bg-amber-50 transition-colors">
                        <div className="flex items-center gap-3 py-2">
                            <div className="w-4 h-4 bg-amber-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold text-amber-700">{t('Main Stock')}</span>
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}