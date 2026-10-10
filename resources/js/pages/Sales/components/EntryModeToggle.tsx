import React from 'react';
import { Button } from '@/components/ui/button';
import { Package, Barcode } from 'lucide-react';

interface EntryModeToggleProps {
    entryMode: 'item' | 'printer';
    setEntryMode: (mode: 'item' | 'printer') => void;
}

const EntryModeToggle: React.FC<EntryModeToggleProps> = ({ entryMode, setEntryMode }) => {
    return (
        <div className="flex flex-col gap-2 sm:flex-row">
            <Button
                type="button"
                variant={entryMode === 'item' ? 'default' : 'outline'}
                onClick={() => setEntryMode('item')}
                size="sm"
                className={`w-full sm:w-auto ${entryMode === 'item' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            >
                <Package className="w-4 h-4 mr-2" />
                Item Entry
            </Button>
            <Button
                type="button"
                variant={entryMode === 'printer' ? 'default' : 'outline'}
                onClick={() => setEntryMode('printer')}
                size="sm"
                className={`w-full sm:w-auto ${entryMode === 'printer' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            >
                <Barcode className="w-4 h-4 mr-2" />
                Printer Entry
            </Button>

            {/* <Button
                type="button"
                // variant={entryMode === 'printer' ? 'default' : 'outline'}
                 onClick={() => router.visit('/admin/day-opening-balances')}
                size="sm"
               className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
                Day Opening Balances
            </Button> */}
            {/* <Button
                type="button"
                // variant={entryMode === 'printer' ? 'default' : 'outline'}
                 onClick={() => router.visit('')}
                size="sm"
               className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
                Item Return
            </Button>
            <Button
                type="button"
                // variant={entryMode === 'printer' ? 'default' : 'outline'}
                 onClick={() => router.visit('/admin/petty-cash-categories/create')}
                size="sm"
               className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
                Petty Cash
            </Button>
             <Button
                type="button"
                // variant={entryMode === 'printer' ? 'default' : 'outline'}
                 onClick={() => router.visit('/admin/privilege-users/create')}
                size="sm"
               className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
                Privilage User
            </Button> */}

        </div>
    );
};

export default EntryModeToggle;
