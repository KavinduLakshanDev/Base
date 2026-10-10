import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Dialog from '@radix-ui/react-dialog';
import { t } from '@/lib/i18n';

interface Product {
    id: number;
    code: string;
    name: string;
    english_name?: string;
    barcode?: string;
    category_id?: string;
    category_name?: string;
    cost_price: number;
    normal_cost: number;
    retail_price: number;
    wholesale_price: number;
    VehicleSalePrice: number;
    current_stock: number;
    free_stock: number;
    brand?: string;
    model?: string;
    serial_number?: string;
}

interface Category {
    id: string;
    code: string;
    name: string;
}

interface ItemSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    filteredProducts: Product[];
    itemSearchQuery: string;
    selectedCategory: string;
    categories: Category[];
    selectedItemIndex: number;
    onSearchChange: (query: string) => void;
    onCategoryChange: (category: string) => void;
    onClearFilters: () => void;
    onSelectItem: (product: Product) => void;
}

export default function ItemSelectionModal({
    isOpen,
    onClose,
    filteredProducts,
    itemSearchQuery,
    selectedCategory,
    categories,
    selectedItemIndex,
    onSearchChange,
    onCategoryChange,
    onClearFilters,
    onSelectItem,
}: ItemSelectionModalProps) {
    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-6xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-xl">
                    <div className="p-6">
                        <Dialog.Title className="mb-4 text-xl font-bold text-gray-900">
                            {t('Select Item')}
                        </Dialog.Title>
                        <Dialog.Description className="mb-6 text-sm text-gray-600">
                            {t('Search for products by code, name, or barcode. Filter by category. Use arrow keys to navigate and Enter to select.')}
                        </Dialog.Description>

                        {/* Search and Filter Section */}
                        <div className="mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Input
                                        type="text"
                                        placeholder={t('Search by product code, name, or barcode...')}
                                        value={itemSearchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        className="w-full text-lg p-4"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex items-center gap-3 min-w-0">
                                    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                        {t('Category')}:
                                    </Label>
                                    <Select value={selectedCategory} onValueChange={onCategoryChange}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder={t('All Categories')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(itemSearchQuery.trim() !== '' || (selectedCategory !== '' && selectedCategory !== 'ALL_CATEGORIES')) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={onClearFilters}
                                        className="whitespace-nowrap"
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Product List */}
                        <div className="max-h-96 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    {itemSearchQuery.trim() === '' && selectedCategory === 'ALL_CATEGORIES'
                                        ? 'Start typing to search for products or select a category...'
                                        : 'No products found matching your search criteria'
                                    }
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredProducts.map((product, index) => (
                                        <div
                                            key={product.id}
                                            className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer transition-colors ${
                                                selectedItemIndex === index
                                                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                                                    : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => onSelectItem(product)}
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {product.name}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Code: {product.code}
                                                    {product.barcode && ` | Barcode: ${product.barcode}`}
                                                    {product.category_name && ` | Category: ${product.category_name}`}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    Stock: {product.current_stock} | Cost: Rs. {Math.round(product.cost_price)}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    Select
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}