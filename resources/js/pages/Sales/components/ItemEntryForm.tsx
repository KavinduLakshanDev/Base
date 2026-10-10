import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Package, Barcode, DollarSign, Plus, Search } from 'lucide-react';
import { ItemMaster } from '../Create';

interface ItemEntryFormProps {
    itemInput: {
        code: string;
        name: string;
        price: number;
        quantity: number;
        barcode: string;
        serial_number: string;
    };
    setItemInput: React.Dispatch<React.SetStateAction<{
        code: string;
        name: string;
        price: number;
        quantity: number;
        barcode: string;
        serial_number: string;
    }>>;
    itemCodeRef: React.RefObject<HTMLInputElement | null>;
    quantityRef: React.RefObject<HTMLInputElement | null>;
    plusButtonRef: React.RefObject<HTMLButtonElement | null>;
    selectedItem: ItemMaster | null;
    items: ItemMaster[];
    isDropdownOpen: boolean;
    setIsDropdownOpen: (open: boolean) => void;
    setIsItemDialogOpen: (open: boolean) => void;
    searchItems: (query: string) => void;
    selectItem: (item: ItemMaster) => void;
    onBatchSelect?: (item: ItemMaster) => void;
    setBatchCandidates: React.Dispatch<React.SetStateAction<ItemMaster[]>>;
    setIsBatchModalOpen: (open: boolean) => void;
    addItem: () => void;
    resetItemInput: () => void;
}

const ItemEntryForm: React.FC<ItemEntryFormProps> = ({
    itemInput,
    setItemInput,
    itemCodeRef,
    quantityRef,
    plusButtonRef,
    selectedItem,
    items,
    isDropdownOpen,
    setIsDropdownOpen,
    setIsItemDialogOpen,
    searchItems,
    selectItem,
    onBatchSelect,
    setBatchCandidates,
    setIsBatchModalOpen,
    addItem,
    resetItemInput
}) => {
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // API now returns unique items grouped with batches, so no need to de-duplicate
    const uniqueItems = items;
    // Filter out items with 0 stock (except service items which can be sold without stock) and printer items (PRN prefix) for display
    const visibleItems = uniqueItems.filter(item => {
        const isPrinter = item.item_code?.toUpperCase().startsWith('PRN');
        const isService = item.is_service === true;
        const hasStock = item.stock > 0;
        return !isPrinter && (hasStock || isService);
    });
    const [shouldFocusQuantity, setShouldFocusQuantity] = useState(false);

    useEffect(() => {
        if (isDropdownOpen && visibleItems.length > 0) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [isDropdownOpen, visibleItems]);

    // Focus quantity field after item selection
    useEffect(() => {
        if (selectedItem && !isDropdownOpen && shouldFocusQuantity) {
            setTimeout(() => {
                if (quantityRef.current) {
                    quantityRef.current.focus();
                    quantityRef.current.select();
                }
                setShouldFocusQuantity(false);
            }, 150);
        }
    }, [selectedItem, isDropdownOpen, shouldFocusQuantity, quantityRef]);

    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Item Entry</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
                <div className="space-y-2 relative">
                    <Label htmlFor="item_code" className="text-sm font-medium text-gray-700 flex items-center">
                        <Barcode className="w-4 h-4 mr-2 text-blue-500" />
                        Item Code
                    </Label>
                    <div className="relative flex flex-wrap gap-2 sm:flex-nowrap">
                        <Input
                            id="item_code"
                            ref={itemCodeRef}
                            placeholder="Scan barcode, enter code or name"
                            value={itemInput.code}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setItemInput({ ...itemInput, code: newVal });
                                // Trigger search when typing
                                if (newVal.length > 0) {
                                    searchItems(newVal);
                                } else {
                                    setIsDropdownOpen(false);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (isDropdownOpen && visibleItems.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setSelectedIndex(prev => prev < visibleItems.length - 1 ? prev + 1 : 0);
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setSelectedIndex(prev => prev > 0 ? prev - 1 : visibleItems.length - 1);
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (selectedIndex >= 0) {
                                            const item = visibleItems[selectedIndex];
                                            const itemBatches = item.batches || [];

                                            if (itemBatches.length > 1) {
                                                setIsDropdownOpen(false);
                                                setSelectedIndex(-1);
                                                setShouldFocusQuantity(true);
                                                // Use setTimeout to ensure state updates before opening modal
                                                setTimeout(() => {
                                                    setBatchCandidates(itemBatches);
                                                    setIsBatchModalOpen(true);
                                                }, 50);
                                            } else {
                                                if (itemBatches.length === 1) {
                                                    if (onBatchSelect) {
                                                        onBatchSelect(itemBatches[0]);
                                                    } else {
                                                        selectItem(itemBatches[0]);
                                                    }
                                                } else {
                                                    if (onBatchSelect) {
                                                        onBatchSelect(item);
                                                    } else {
                                                        selectItem(item);
                                                    }
                                                }
                                                setIsDropdownOpen(false);
                                                setSelectedIndex(-1);
                                                setTimeout(() => {
                                                    if (quantityRef.current) {
                                                        quantityRef.current.focus();
                                                        quantityRef.current.select();
                                                    }
                                                }, 150);
                                            }
                                        }
                                    } else if (e.key === 'Escape') {
                                        setIsDropdownOpen(false);
                                        setSelectedIndex(-1);
                                    }
                                } else {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (itemInput.code.trim() === '') {
                                            return;
                                        }
                                    }
                                }
                            }}
                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                        />
                        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setIsItemDialogOpen(true)}>
                            <Search className="w-4 h-4" />
                        </Button>

                        {/* Dropdown for search results */}
                        {isDropdownOpen && items.length > 0 && (
                            <div className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-auto rounded-lg border border-gray-200 bg-white shadow-2xl sm:left-auto sm:right-auto sm:min-w-[600px]">
                                {visibleItems.length > 0 ? (
                                    visibleItems.map((item, idx) => {
                                        const hasMultipleBatches = item.batches && item.batches.length > 1;
                                        return (
                                            <div
                                                key={item.item_code + idx}
                                                className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${idx === selectedIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                                onClick={() => {
                                                    const itemBatches = item.batches || [];

                                                    if (itemBatches.length > 1) {
                                                        setBatchCandidates(itemBatches);
                                                        setIsBatchModalOpen(true);
                                                        setIsDropdownOpen(false);
                                                        setShouldFocusQuantity(true);
                                                    } else {
                                                        if (itemBatches.length === 1) {
                                                            if (onBatchSelect) {
                                                                onBatchSelect(itemBatches[0]);
                                                            } else {
                                                                selectItem(itemBatches[0]);
                                                            }
                                                        } else {
                                                            if (onBatchSelect) {
                                                                onBatchSelect(item);
                                                            } else {
                                                                selectItem(item);
                                                            }
                                                        }
                                                        setIsDropdownOpen(false);
                                                        setShouldFocusQuantity(true);
                                                    }
                                                    setSelectedIndex(-1);
                                                }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">{item.item_name}</div>
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            Code: {item.item_code} | Stock: <span className={item.is_service ? "font-medium text-purple-600" : item.stock > 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>{item.is_service ? '(Service Item)' : item.stock}</span>
                                                            {item.batches && item.batches.length === 1 && item.batches[0].batch_no && (
                                                                <span className="text-[9px] block">Batch: {item.batches[0].batch_no}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <div className="text-sm font-medium text-blue-600">
                                                            Rs. {item.retail_price?.toFixed(2)}
                                                        </div>
                                                        {hasMultipleBatches && (
                                                            <div className="text-xs text-orange-600 mt-1">
                                                                Multiple batches available
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-3 text-center text-gray-500 text-sm">
                                        No items found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="item_name" className="text-sm font-medium text-gray-700 flex items-center">
                        <Package className="w-4 h-4 mr-2 text-blue-500" />
                        Item Name
                    </Label>
                    <Input
                        id="item_name"
                        value={itemInput.name}
                        readOnly
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm bg-muted"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="unit_price" className="text-sm font-medium text-gray-700 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2 text-blue-500" />
                        Unit Price
                    </Label>
                    <Input
                        id="unit_price"
                        type="number"
                        value={itemInput.price}
                        readOnly
                        // onChange={(e) => setItemInput({ ...itemInput, price: Number(e.target.value) })}
                        // onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full border-blue-200 bg-white/50 backdrop-blur-sm focus:border-blue-400 focus:ring-blue-400/20 sm:w-28"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 flex">
                        <Package className="w-4 h-4 mr-2 text-blue-500" />
                        Quantity
                    </Label>
                    <div className="flex flex-wrap gap-1 sm:flex-nowrap">
                        <Input
                            id="quantity"
                            type="number"
                            ref={quantityRef}
                            value={itemInput.quantity}
                            onChange={(e) => setItemInput({ ...itemInput, quantity: Number(e.target.value) })}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addItem();
                                }
                            }}
                            className="min-w-[68px] flex-1 border-blue-200 bg-white/50 backdrop-blur-sm focus:border-blue-400 focus:ring-blue-400/20"
                        />
                        <Button
                            type="button"
                            ref={plusButtonRef}
                            onClick={addItem}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addItem();
                                }
                            }}
                            className="bg-blue-500 hover:bg-blue-600 sm:w-auto"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetItemInput}>
                            Reset
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemEntryForm;
