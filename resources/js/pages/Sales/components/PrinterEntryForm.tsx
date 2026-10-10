import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Barcode, Search } from 'lucide-react';
import PriceTypeSelector from './PriceTypeSelector';

interface PrinterEntryFormProps {
    printerSearch: string;
    setPrinterSearch: (search: string) => void;
    setIsPrinterDialogOpen: (open: boolean) => void;
    searchPrinters: (query: string) => void;
    // price type state from parent form (retail/wholesale/extra)
    priceType: string;
    setPriceType: (value: string) => void;
}

const PrinterEntryForm: React.FC<PrinterEntryFormProps> = ({
    printerSearch,
    setPrinterSearch,
    setIsPrinterDialogOpen,
    searchPrinters,
    priceType,
    setPriceType
}) => {
    return (
        <div className="space-y-3 animate-in slide-in-from-right-5 duration-300">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Barcode className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Printer Entry</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* price type selector should affect how the printer prices are looked up */}
                <div className="col-span-1">
                    <PriceTypeSelector priceType={priceType} setPriceType={setPriceType} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="printer_serial" className="text-sm font-medium text-gray-700 flex items-center">
                        <Search className="w-4 h-4 mr-2 text-blue-500" />
                        Search Printer
                    </Label>
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <Input
                            id="printer_serial"
                            placeholder="Serial Number / Barcode / Item Name"
                            value={printerSearch}
                            onChange={(e) => {
                                setPrinterSearch(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    searchPrinters(printerSearch);
                                }
                            }}
                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                            autoFocus
                        />
                        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setIsPrinterDialogOpen(true)}>
                            <Search className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                searchPrinters(printerSearch);
                            }}
                            className="w-full bg-blue-600 sm:w-auto"
                        >
                            Find Printer
                        </Button>
                    </div>
                    <p className="text-xs text-blue-500">Search by serial number, barcode, or item name. Printers will be automatically added if a single exact match is found.</p>
                </div>
            </div>
        </div>
    );
};

export default PrinterEntryForm;
