import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ItemMaster, SaleItem } from '../Create';

interface BatchSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: ItemMaster[];
    existingItems?: SaleItem[];
    onSelect: (item: ItemMaster) => void;
}

const BatchSelectionModal: React.FC<BatchSelectionModalProps> = ({ isOpen, onClose, items, existingItems = [], onSelect }) => {
    // Initialize hooks unconditionally (required by React Rules of Hooks)
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedIndexRef = useRef(0);

    const baseItem = items && items.length > 0 ? items[0] : null;

    // Helper to get effective stock
    const getEffectiveStock = useCallback((item: ItemMaster) => {
        const usedStock = existingItems
            .filter(i => i.item_code === item.item_code && i.batch_no === item.batch_no)
            .reduce((sum, i) => sum + Number(i.quantity || 0) + Number(i.free_quantity || 0), 0);
        return Math.max(0, item.stock - usedStock);
    }, [existingItems]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen || !items || items.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = Math.min(selectedIndexRef.current + 1, items.length - 1);
                selectedIndexRef.current = nextIndex;
                setSelectedIndex(nextIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = Math.max(selectedIndexRef.current - 1, 0);
                selectedIndexRef.current = prevIndex;
                setSelectedIndex(prevIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (items[selectedIndexRef.current]) {
                    const currentItem = items[selectedIndexRef.current];
                    const isService = currentItem.is_service === true;
                    if (isService || getEffectiveStock(currentItem) > 0) {
                        onSelect(currentItem);
                    }
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [isOpen, items, onSelect, onClose, getEffectiveStock]);

    // Add/remove keyboard event listeners
    useEffect(() => {
        if (isOpen && items && items.length > 0) {
            selectedIndexRef.current = 0;
            setSelectedIndex(0);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown, items]);

    // Early return after all hooks (allowed)
    if (!items || items.length === 0 || !baseItem) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-900">Select Batch</DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-muted-foreground text-sm space-y-1">
                            <div>
                                Multiple batches found for <span className="font-semibold text-blue-600">{baseItem.item_name}</span> ({baseItem.item_code})
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                                Use ↑↓ arrow keys to navigate, Enter to select, Escape to cancel
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3.5">Batch No</th>
                                <th className="px-4 py-3.5 text-right">Stock</th>
                                {/* <th className="px-4 py-3.5 text-right">Cost Price</th> */}
                                <th className="px-4 py-3.5 text-right">Retail Price</th>
                                <th className="px-4 py-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item, idx) => {
                                const effectiveStock = getEffectiveStock(item);
                                const isService = item.is_service === true;
                                const isSelectable = isService || effectiveStock > 0;
                                const isOutOfStock = effectiveStock <= 0 && !isService;

                                return (
                                    <tr
                                        key={idx}
                                        className={`transition-colors ${isOutOfStock
                                            ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                            : idx === selectedIndex
                                                ? 'bg-blue-100 border-blue-300 cursor-pointer'
                                                : 'hover:bg-blue-50 cursor-pointer'
                                            }`}
                                        onClick={() => {
                                            if (isSelectable) {
                                                selectedIndexRef.current = idx;
                                                setSelectedIndex(idx);
                                                onSelect(item);
                                            }
                                        }}
                                    >
                                        <td className="px-4 py-3 font-mono text-gray-800 whitespace-nowrap">
                                            {item.batch_no || 'N/A'}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${isOutOfStock ? 'text-red-500' : isService && effectiveStock <= 0 ? 'text-purple-600' : ''}`}>
                                            {isService && effectiveStock <= 0 ? '(Service)' : effectiveStock.toFixed(2)}
                                            {effectiveStock < item.stock && !isService && (
                                                <span className="text-xs text-gray-400 block">
                                                    (Orig: {Number(item.stock).toFixed(2)})
                                                </span>
                                            )}
                                        </td>
                                        {/* <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600">
                                            Rs. {Number(item.cost_price || 0).toFixed(2)}
                                        </td> */}
                                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-gray-900">
                                            Rs. {Number(item.retail_price || 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                disabled={!isSelectable}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSelectable) {
                                                        onSelect(item);
                                                    }
                                                }}
                                                className={`h-8 ${!isSelectable
                                                    ? 'bg-gray-400'
                                                    : idx === selectedIndex
                                                        ? 'bg-blue-700 hover:bg-blue-800'
                                                        : 'bg-blue-600 hover:bg-blue-700'
                                                    }`}
                                            >
                                                Select
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>Cancel</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BatchSelectionModal;
