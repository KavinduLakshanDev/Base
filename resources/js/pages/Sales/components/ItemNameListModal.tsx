import React, { useState, useEffect} from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Loader2 } from 'lucide-react';
import axios from 'axios';
import { ItemMaster } from '../Create';

interface ItemNameListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: ItemMaster) => void;
    setBatchCandidates: React.Dispatch<React.SetStateAction<ItemMaster[]>>;
    setIsBatchModalOpen: (open: boolean) => void;
    items?: ItemMaster[]; // Made optional as we fetch from server
    initialSearchQuery?: string;
}

const ItemNameListModal: React.FC<ItemNameListModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    setBatchCandidates,
    setIsBatchModalOpen,
    initialSearchQuery = '',
}) => {
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [priceSearchQuery, setPriceSearchQuery] = useState<string>('');
    const [filteredItems, setFilteredItems] = useState<ItemMaster[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [suppliers, setSuppliers] = useState<{ AccKy: number; AccNm: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Update search query when modal opens with new initial query
    useEffect(() => {
        if (isOpen) {
            setSearchQuery(initialSearchQuery);
        }
    }, [isOpen, initialSearchQuery]);

    // Fetch categories and suppliers on mount/open
    useEffect(() => {
        if (isOpen && categories.length === 0) {
            axios.get('/sales/search/categories')
                .then(res => setCategories(res.data))
                .catch(err => console.error('Error fetching categories:', err));
        }
        if (isOpen && suppliers.length === 0) {
            axios.get('/sales/search/suppliers')
                .then(res => setSuppliers(res.data))
                .catch(err => console.error('Error fetching suppliers:', err));
        }
    }, [isOpen]);

    // Fetch items with debounce
    useEffect(() => {
        if (!isOpen) return;

        const timeoutId = setTimeout(() => {
            fetchItems();
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [isOpen, searchQuery, selectedCategory, selectedSupplier, priceSearchQuery]);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (searchQuery.trim()) params.query = searchQuery;
            if (selectedCategory !== 'all') params.category = selectedCategory;
            if (selectedSupplier !== 'all') params.supplier = selectedSupplier;
            if (priceSearchQuery.trim()) params.price = priceSearchQuery;

            const res = await axios.get('/sales/search/items', { params });
            // Filter out printer items (PRN prefix)
            const filteredData = res.data.filter((item: ItemMaster) => !item.item_code?.toUpperCase().startsWith('PRN'));
            setFilteredItems(filteredData);
        } catch (error) {
            console.error('Error fetching items:', error);
            setFilteredItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemClick = (item: ItemMaster) => {
        // If the item has multiple batches (populated by backend)
        if (item.batches && item.batches.length > 1) {
            setBatchCandidates(item.batches);
            setIsBatchModalOpen(true);
        } else if (item.batches && item.batches.length === 1) {
            // Only one batch, select it directly
            onSelect(item.batches[0]);
            onClose();
        } else {
            // Fallback or no stock, just select the base item
            onSelect(item);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[85vh] w-[95vw] max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Item Name List</DialogTitle>
                    <DialogDescription>Browse and select items from the complete item list</DialogDescription>
                </DialogHeader>

                <div className="max-h-[calc(85vh-180px)] space-y-4 overflow-y-auto">
                    {/* Search and Filter Section */}
                    <div className="space-y-3 sticky top-0 bg-white p-4 -m-4 mb-4 border-b rounded-t-lg z-10">
                        <div className="space-y-3">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search code, name, or barcode (min 2 chars)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 border-gray-300 focus:border-blue-400 focus:ring-blue-400/20"
                                    autoFocus
                                />
                            </div>

                            {/* Filters Row */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {/* Category Filter */}
                                <div className="flex flex-col space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Category
                                    </label>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="bg-white border-gray-300">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map(cat => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Supplier Filter */}
                                <div className="flex flex-col space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Supplier
                                    </label>
                                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                        <SelectTrigger className="bg-white border-gray-300">
                                            <SelectValue placeholder="All Suppliers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Suppliers</SelectItem>
                                            {suppliers.map(sup => (
                                                <SelectItem key={sup.AccKy} value={String(sup.AccKy)}>
                                                    {sup.AccNm}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Price Search (Type and Auto Search) */}
                                <div className="flex flex-col space-y-1">
                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Filter className="w-4 h-4" />
                                        Price
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="Type price..."
                                        value={priceSearchQuery}
                                        onChange={(e) => setPriceSearchQuery(e.target.value)}
                                        className="bg-white border-gray-300"
                                    />
                                </div>

                                {/* Results Count */}
                                {/* <div className="flex items-end">
                                    <p className="text-sm text-gray-600">
                                        {isLoading ? (
                                            <span className="flex items-center gap-2 text-blue-600">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                            </span>
                                        ) : (
                                            <>
                                                <span className="font-semibold text-blue-600">{filteredItems.length}</span> items found
                                            </>
                                        )}
                                    </p>
                                </div> */}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-auto rounded-lg border">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-gray-50 border-b sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[10%]">ITEM CODE</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[15%]">NAME</th>
                                    {/* <th className="px-4 py-3 text-left font-semibold text-gray-700 w-[15%]">CATEGORY</th> */}
                                    <th className="px-3 py-3 text-right font-semibold text-gray-700 w-[5%]">PRICE (Rs.)</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700 w-[5%]">STOCK</th>
                                    {/* <th className="px-4 py-3 text-center font-semibold text-gray-700 w-[10%]">ACTION</th> */}
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="h-40 text-center">
                                            <div className="flex justify-center items-center h-full text-gray-500">
                                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                                Loading items...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                            No items found matching your filters
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, idx) => (
                                        <tr key={item.item_code + idx} className="hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => handleItemClick(item)}>
                                            <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                                                {item.item_code}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{item.item_name}</div>
                                                {item.batches && item.batches.length > 1 && (
                                                    <div className="text-xs text-orange-600 font-medium">
                                                        {item.batches.length} Batches Available
                                                    </div>
                                                )}
                                                {item.batches && item.batches.length === 1 && item.batches[0].batch_no && (
                                                    <div className="text-xs text-gray-500">Batch: {item.batches[0].batch_no}</div>
                                                )}
                                            </td>
                                            {/* <td className="px-4 py-3 text-gray-600">{item.category || '-'}</td> */}
                                            <td className="px-4 py-3 text-right font-semibold text-green-600">
                                                {Number(item.retail_price).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${item.stock > 0
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {Number(item.stock).toFixed(0)}
                                                </span>
                                            </td>
                                            {/* <td className="px-4 py-3 text-center">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleItemClick(item);
                                                    }}
                                                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 hover:text-blue-700"
                                                >
                                                    Select
                                                </Button>
                                            </td> */}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ItemNameListModal;
