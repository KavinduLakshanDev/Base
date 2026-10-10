import { CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { t } from '@/lib/i18n';

interface GrnDetailsProps {
    grnNo: string;
    grnDate: string;
    datePickerOpen: boolean;
    onDateChange: (date: string) => void;
    onDatePickerToggle: (open: boolean) => void;
    errors: any;
}

export default function GrnDetails({
    grnNo,
    grnDate,
    datePickerOpen,
    onDateChange,
    onDatePickerToggle,
    errors,
}: GrnDetailsProps) {
    const formatDateForDisplay = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const displayToDate = (displayDate: string): Date | undefined => {
        if (!displayDate) return undefined;
        const parts = displayDate.split('/');
        if (parts.length !== 3) return undefined;
        const [day, month, year] = parts.map(Number);
        return new Date(year, month - 1, day);
    };

    return (
        <>
            {/* GRN No */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 font-medium">
                    {t('GRNNo')}
                </Label>
                <Input
                    value={grnNo}
                    disabled
                    className="bg-gray-50 w-full border-gray-300 rounded-lg shadow-sm font-medium"
                />
            </div>

            {/* Date */}
            <div className="space-y-2">
                <Label htmlFor="grn_date" className="flex items-center gap-2 text-gray-700 font-medium">
                    {t('Date')}{' '}
                    <span className="text-red-500">*</span>
                </Label>
                <Popover open={datePickerOpen} onOpenChange={onDatePickerToggle}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white hover:bg-green-50 transition-all duration-300 hover:shadow-md ${!grnDate && 'text-muted-foreground'
                                }`}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formatDateForDisplay(grnDate) || t('DD/MM/YYYY')}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-2 border-green-200 rounded-lg shadow-xl" align="start">
                        <Calendar
                            mode="single"
                            selected={displayToDate(formatDateForDisplay(grnDate))}
                            onSelect={(selectedDate: Date | undefined) => {
                                if (selectedDate) {
                                    const formattedDate = selectedDate.toISOString().split('T')[0];
                                    onDateChange(formattedDate);
                                }
                                onDatePickerToggle(false);
                            }}
                            initialFocus
                            className="rounded-lg"
                        />
                    </PopoverContent>
                </Popover>
                {errors.grn_date && (
                    <p className="text-sm text-red-600 font-medium">
                        {errors.grn_date}
                    </p>
                )}
            </div>
        </>
    );
}