import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Package, Barcode, DollarSign, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

export interface StockItem {
    itm_ky: number;
    item_code: string;
    item_name: string;
    barcode: string;
    batch_no: string | null;
    available_qty: number;
    unit_price: number;
    cost_price: number;
    unit: string;
    tier1_qty?: number | null;
    tier1_discount?: number | null;
    tier2_qty?: number | null;
    tier2_discount?: number | null;
    cred_tier1_qty?: number | null;
    cred_tier1_discount?: number | null;
    cred_tier2_qty?: number | null;
    cred_tier2_discount?: number | null;
    cus_discount_type?: string | null;
    cus_discount_rate?: number;
    discount_amount?: number;
}


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
    selectedItem: StockItem | null;
    items: StockItem[];
    isDropdownOpen: boolean;
    setIsDropdownOpen: (open: boolean) => void;
    setIsItemDialogOpen?: (open: boolean) => void;
    searchItems: (query: string) => void;
    selectItem: (item: StockItem) => void;
    onBatchSelect?: (item: StockItem) => void;
    setBatchCandidates?: React.Dispatch<React.SetStateAction<StockItem[]>>;  
    setIsBatchModalOpen?: (open: boolean) => void;
    addItem: () => void;
    resetItemInput: () => void;
    sectionCode?: string;
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

    // Add state for visible groups
    const [visibleGroups, setVisibleGroups] = useState<StockItem[][]>([]);
    
    // Group items by itm_ky so batches are consolidated
    useEffect(() => {
        const groups: { [key: number]: StockItem[] } = {};
        items.forEach(item => {
            if (!groups[item.itm_ky]) {
                groups[item.itm_ky] = [];
            }
            groups[item.itm_ky].push(item);
        });
        setVisibleGroups(Object.values(groups));
    }, [items]);

    const [shouldFocusQuantity, setShouldFocusQuantity] = useState(false);

    useEffect(() => {
        if (isDropdownOpen && visibleGroups.length > 0) {
            setSelectedIndex(0);
        } else {
            setSelectedIndex(-1);
        }
    }, [isDropdownOpen, visibleGroups]);

    // Scroll selected item into view
    useEffect(() => {
        if (isDropdownOpen && selectedIndex >= 0) {
            const el = document.getElementById(`dropdown-item-${selectedIndex}`);
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, isDropdownOpen]);

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
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
                                if (isDropdownOpen && visibleGroups.length > 0) {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setSelectedIndex(prev => prev < visibleGroups.length - 1 ? prev + 1 : 0);
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setSelectedIndex(prev => prev > 0 ? prev - 1 : visibleGroups.length - 1);
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (selectedIndex >= 0) {
                                            const itemGroup = visibleGroups[selectedIndex];
                                            const item = itemGroup[0];
                                            const itemBatches = itemGroup;
                                            
                                            if (itemBatches.length > 1) {
                                                setIsDropdownOpen(false);
                                                setSelectedIndex(-1);
                                                setShouldFocusQuantity(true);
                                                // Use setTimeout to ensure state updates before opening modal
                                                setTimeout(() => {
                                                    setBatchCandidates?.(itemBatches);
                                                    setIsBatchModalOpen?.(true);
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
                        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setIsItemDialogOpen && setIsItemDialogOpen(true)}>
                            <Search className="w-4 h-4" />
                        </Button>

                        {/* Dropdown for search results */}
                        {isDropdownOpen && items.length > 0 && (
                            <div className="absolute left-0 top-12 z-50 max-h-96 w-[300px] sm:w-[450px] md:w-[600px] max-w-[85vw] overflow-auto rounded-lg border border-gray-200 bg-white shadow-2xl">
                                {visibleGroups.length > 0 ? (
                                    visibleGroups.map((itemGroup, idx) => {
                                        const item = itemGroup[0];
                                        const hasMultipleBatches = itemGroup.length > 1;
                                        return (
                                            <div
                                                id={`dropdown-item-${idx}`}
                                                key={item.item_code + idx}
                                                className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${idx === selectedIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                                onClick={() => {
                                                    const itemBatches = itemGroup;
                                                    if (itemBatches.length > 1) {
                                                        setBatchCandidates?.(itemBatches);
                                                        setIsBatchModalOpen?.(true);
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
                                                            Code: {item.item_code} | Stock: <span className={item.available_qty > 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>{item.available_qty}</span>
                                                            {hasMultipleBatches ? (
                                                                <span className="text-[9px] block text-orange-600 font-semibold">{itemGroup.length} Batches Available</span>
                                                            ) : (
                                                                item.batch_no && (
                                                                    <span className="text-[9px] block">Batch: {item.batch_no}</span>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <div className="text-sm font-medium text-blue-600">
                                                            Rs. {item.unit_price?.toFixed(2)}
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

                <div className="space-y-2 md:col-span-2 lg:col-span-2">
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
                            onChange={(e) => {
                                let val = Number(e.target.value);
                                if (selectedItem && val > selectedItem.available_qty) {
                                    val = selectedItem.available_qty;
                                    toast.error(`Only ${selectedItem.available_qty} available in vehicle`);
                                }
                                setItemInput({ ...itemInput, quantity: val });
                            }}
                            min={1}
                            max={selectedItem?.available_qty || undefined}
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
