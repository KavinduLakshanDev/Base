import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Dialog from '@radix-ui/react-dialog';
import { t } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';
import { PackagePlus, Package, CreditCard } from 'lucide-react';

interface PurchaseItem {
    product_id: number;
    product_code: string;
    product_name: string;
    qty: number;
    cost_price: number;
    normal_cost: number;
    new_cost_price: number;
    discount_rate: number;
    free_qty: number;
    retail_price: number;
    wholesale_price: number;
    VehicleSalePrice: number;
    item_discount: number;
    amount: number;
    brand: string;
    model: string;
    serial_number: string;
    warranty: string;
    barcode?: string;
    category?: string;
    remark?: string;
    cus_discount_rate?: number;
    cus_discount_type?: 'fixed' | 'percentage';
    multipleSerialNumbers?: string;
    current_stock?: number;
    discount_type?: 'fixed' | 'percentage';
    RtDisType1?: 'fixed' | 'percentage';
    RtQty1?: number;
    RtQty2?: number;
    RtDis1?: number;
    RtDis2?: number;
    CredQty1?: number;
    CredQty2?: number;
    CredDis1?: number;
    CredDis2?: number;
}

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
    is_service?: boolean;
    last_grn_cost?: number;
    last_grn_retail?: number;
    last_grn_wholesale?: number;
    last_grn_vehicle_sale?: number;
    cus_discount_rate?: number;
    RtQty1?: number;
    RtQty2?: number;
    RtDis1?: number;
    RtDis2?: number;
    CredQty1?: number;
    CredQty2?: number;
    CredDis1?: number;
    CredDis2?: number;
}

interface Category {
    id: string;
    name: string;
}

interface Brand {
    id: number;
    name: string;
    category_id?: number;
    category_code?: string;
    models: string[];
}

interface StationaryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    modalItem: PurchaseItem | null;
    editingItemIndex: number | null;
    items: PurchaseItem[];
    categories: Category[];
    existingBrands: Brand[];
    mainStockCategory: string;
    mainStockBrand: string;
    mainStockItemName: string;
    onMainStockCategoryChange: (value: string) => void;
    onMainStockBrandChange: (value: string) => void;
    onMainStockItemNameChange: (value: string) => void;
    onModalItemChange: (item: PurchaseItem) => void;
    onConfirm: () => void;
    onCancel: () => void;
    itemSearchQuery: string;
    onItemSearchChange: (query: string) => void;
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
    filteredProducts: Product[];
    onSelectProduct: (product: Product) => void;
    currentProducts: Product[];
    onCreateProductClick?: () => void;
    keepModalOpen: boolean;
    onKeepModalChange: (value: boolean) => void;
}

export default function StationaryItemModal({
    isOpen,
    onClose,
    modalItem,
    editingItemIndex,
    items,
    categories,
    existingBrands,
    mainStockCategory,
    mainStockBrand,
    mainStockItemName,
    onMainStockCategoryChange,
    onMainStockBrandChange,
    onMainStockItemNameChange,
    onModalItemChange,
    onConfirm,
    onCancel,
    itemSearchQuery,
    onItemSearchChange,
    selectedCategory,
    onCategoryChange,
    filteredProducts,
    onSelectProduct,
    currentProducts,
    onCreateProductClick,
    keepModalOpen,
    onKeepModalChange,
}: StationaryItemModalProps) {
    const [barcodeSearching, setBarcodeSearching] = useState(false);
    const barcodeTimeoutRef = useRef<number | null>(null);
    const [barcodeMessage, setBarcodeMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [activeValue, setActiveValue] = useState<string>('');

    if (!modalItem) return null;

    const getModelsForSelectedBrand = () => {
        if (!mainStockBrand) return [];
        const selectedBrand = existingBrands.find(brand => brand.name === mainStockBrand);
        return selectedBrand?.models || [];
    };

    const availableModels = getModelsForSelectedBrand();

    useEffect(() => {
        if (modalItem && mainStockBrand) {
            const modelsForBrand = getModelsForSelectedBrand();
            if (modalItem.model && !modelsForBrand.includes(modalItem.model)) {
                onModalItemChange({ ...modalItem, model: '' });
            }
        }
    }, [mainStockBrand]);

    const searchByBarcode = async (barcode: string) => {
        if (!barcode || barcode.trim() === '') {
            setBarcodeMessage(null);
            return;
        }

        setBarcodeSearching(true);
        setBarcodeMessage({ type: 'info', text: 'Searching for product...' });

        try {
            const companyElement = document.querySelector('[data-company-id]');
            const companyId = companyElement?.getAttribute('data-company-id') || '1';

            const response = await fetch(`/pos/api/purchases/search-barcode?barcode=${encodeURIComponent(barcode)}&company_id=${companyId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                const data = await response.json();

                if (data.found) {
                    const product = data.product;
                    const categoryIdStr = product.category_id ? String(product.category_id) : '';
                    const brandStr = product.brand || '';
                    const modelStr = product.model || '';
                    const nameStr = product.name || '';

                    const categoryExists = categoryIdStr && categories.some(cat => String(cat.id) === categoryIdStr);

                    if (product.is_service) {
                        setBarcodeMessage({ type: 'error', text: 'Service items cannot be added to a purchase.' });
                        return;
                    }

                    onModalItemChange({
                        ...modalItem,
                        product_id: product.id,
                        product_code: product.code,
                        product_name: product.name,
                        barcode: product.barcode,
                        cost_price: product.cost_price,
                        normal_cost: product.normal_cost,
                        retail_price: product.retail_price,
                        wholesale_price: product.wholesale_price,
                        VehicleSalePrice: product.VehicleSalePrice,
                        brand: brandStr,
                        model: modelStr,
                        warranty: product.warranty || '',
                        category: categoryIdStr,
                        current_stock: product.current_stock,
                        cus_discount_rate: product.cus_discount_rate || 0,
                        RtQty1: product.RtQty1 || 0,
                        RtQty2: product.RtQty2 || 0,
                        RtDis1: product.RtDis1 || 0,
                        RtDis2: product.RtDis2 || 0,
                        CredQty1: product.CredQty1 || 0,
                        CredQty2: product.CredQty2 || 0,
                        CredDis1: product.CredDis1 || 0,
                        CredDis2: product.CredDis2 || 0,
                        discount_type: product.discount_type || 'fixed',
                    });

                    setTimeout(() => {
                        if (categoryExists) {
                            onMainStockCategoryChange(categoryIdStr);
                        }
                        if (brandStr) {
                            onMainStockBrandChange(brandStr);
                        }
                        if (nameStr) {
                            onMainStockItemNameChange(nameStr);
                        }
                    }, 100);

                    setBarcodeMessage({ type: 'success', text: data.message });
                } else {
                    setBarcodeMessage({ type: 'info', text: data.message });
                }
            } else {
                setBarcodeMessage({ type: 'error', text: 'Failed to search barcode. Please try again.' });
            }
        } catch (error) {
            console.error('Barcode search error:', error);
            setBarcodeMessage({ type: 'error', text: 'Error searching barcode. Please check your connection.' });
        } finally {
            setBarcodeSearching(false);
        }
    };

    const handleBarcodeChange = (barcode: string) => {
        onModalItemChange({ ...modalItem, barcode });
        setBarcodeMessage(null);

        if (barcodeTimeoutRef.current) {
            clearTimeout(barcodeTimeoutRef.current);
        }

        if (barcode && barcode.trim() !== '') {
            barcodeTimeoutRef.current = setTimeout(() => {
                searchByBarcode(barcode);
            }, 800) as unknown as number;
        }
    };

    const handleBarcodeBlur = () => {
        if (modalItem.barcode) {
            searchByBarcode(modalItem.barcode);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[95vh] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-xl sm:max-h-[90vh] sm:w-full">
                    <div className="p-4 sm:p-6">
                        <Dialog.Title className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                                <span>
                                    Stationary Item
                                    {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName
                                        ? ` - Adding #${items.length + 1}`
                                        : modalItem?.product_name ? ` - ${modalItem.product_name}` : ''
                                    }
                                </span>
                                {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName && (
                                    <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full sm:ml-2">
                                        Repeat Entry
                                    </span>
                                )}
                            </div>
                        </Dialog.Title>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">
                            {t('Select a stationary product and enter quantity and pricing details.')}
                        </Dialog.Description>

                        <div className="space-y-6">
                            {/* Product Search & Select Section */}
                            {modalItem.product_id === 0 && (
                                <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                                    <Label className="text-base font-semibold mb-3 block">Search & Select Product</Label>
                                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                        <div className="flex-1">
                                            <Input
                                                type="text"
                                                placeholder={t('Search by product code, name, or barcode...')}
                                                value={itemSearchQuery}
                                                onChange={(e) => onItemSearchChange(e.target.value)}
                                                className="w-full text-base p-3"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                                            <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                {t('Category')}:
                                            </Label>
                                            <Select
                                                value={selectedCategory}
                                                onValueChange={onCategoryChange}
                                            >
                                                <SelectTrigger className="w-full sm:w-40">
                                                    <SelectValue placeholder={t('All')} />
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
                                    </div>

                                    {/* Product List */}
                                    <div className="max-h-60 overflow-y-auto">
                                        {filteredProducts.length === 0 ? (
                                            <div className="text-center py-4">
                                                <div className="text-gray-500 text-sm mb-3">
                                                    {itemSearchQuery.trim() === ''
                                                        ? 'Start typing to search for products...'
                                                        : 'No products found'
                                                    }
                                                </div>
                                                {itemSearchQuery.trim() !== '' && onCreateProductClick && (
                                                    <Button
                                                        type="button"
                                                        onClick={onCreateProductClick}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <PackagePlus className="mr-2 h-4 w-4" />
                                                        Create New Product
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredProducts
                                                    .filter((product) => !product.code?.startsWith('PRN') && !product.is_service)
                                                    .map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                                                            onClick={() => onSelectProduct(product)}
                                                        >
                                                            <div className="flex-1">
                                                                <div className="font-medium text-gray-900 text-sm">
                                                                    {product.name}
                                                                </div>
                                                                <div className="text-xs text-gray-600">
                                                                    Code: {product.code} {product.barcode && `| Barcode: ${product.barcode}`}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    Stock: {product.current_stock} | Cost: Rs. {Math.round(product.cost_price)}
                                                                </div>
                                                            </div>
                                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                                Select
                                                            </Button>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Item Info - Only show if product selected */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Item Code</Label>
                                        <p className="text-lg font-semibold text-gray-900">{modalItem.product_code}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Item Name</Label>
                                        <p className="text-lg font-semibold text-gray-900">{modalItem.product_name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Current Stock</Label>
                                        <p className="text-lg font-semibold text-blue-600">
                                            {(() => {
                                                const product = currentProducts.find((p) => Number(p.id) === Number(modalItem.product_id));
                                                return product ? Math.round(product.current_stock) : (modalItem.current_stock ? Math.round(modalItem.current_stock) : '0');
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Stationary-specific Fields - Includes Qty, Free Qty, Extra Price */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Quantity</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={activeField === 'qty' ? activeValue : modalItem.qty}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('qty');
                                                setActiveValue(modalItem.qty.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const newQty = parseFloat(val) || 0;

                                                const itemDiscount = (modalItem.discount_type === 'percentage')
                                                    ? (modalItem.cost_price * newQty * modalItem.discount_rate) / 100
                                                    : (modalItem.discount_rate);

                                                const totalAmount = (modalItem.cost_price * newQty) - itemDiscount;
                                                const totalUnits = newQty + modalItem.free_qty;
                                                const newCostPrice = totalUnits > 0 ? totalAmount / totalUnits : modalItem.cost_price;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    qty: newQty,
                                                    item_discount: itemDiscount,
                                                    amount: totalAmount,
                                                    new_cost_price: newCostPrice, // Show net cost in the table
                                                });
                                            }}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Cost Price</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'cost_price' ? activeValue : (modalItem.cost_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('cost_price');
                                                setActiveValue(modalItem.cost_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const newCostPriceInput = parseFloat(val) || 0;

                                                const itemDiscount = (modalItem.discount_type === 'percentage')
                                                    ? (newCostPriceInput * modalItem.qty * modalItem.discount_rate) / 100
                                                    : (modalItem.discount_rate);

                                                const totalAmount = (newCostPriceInput * modalItem.qty) - itemDiscount;
                                                const totalUnits = modalItem.qty + modalItem.free_qty;
                                                const newCostPrice = totalUnits > 0 ? totalAmount / totalUnits : newCostPriceInput;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    cost_price: newCostPriceInput,
                                                    item_discount: itemDiscount,
                                                    amount: totalAmount,
                                                    new_cost_price: newCostPrice, // Show net cost in the table
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                        {/* Display last GRN cost if available */}
                                        {modalItem && modalItem.product_id > 0 && (() => {
                                            const product = filteredProducts.find(p => p.id === modalItem.product_id);
                                            if (product && product.last_grn_cost !== undefined && product.last_grn_cost !== null) {
                                                return (
                                                    <div className="mt-1 text-xs text-blue-600">
                                                        <span>Last GRN Cost: Rs {(product.last_grn_cost || 0).toFixed(2)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    {/* <div>
                                        <Label className="text-sm font-medium text-gray-700">New Cost Price</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'new_cost_price' ? activeValue : (modalItem.new_cost_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('new_cost_price');
                                                setActiveValue(modalItem.new_cost_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    new_cost_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div> */}

                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-gray-700">Supplier Give Discount</Label>
                                        <div className="flex gap-2 mt-1">
                                            <div className="w-[120px]">
                                                <Select
                                                    value={modalItem.discount_type || 'fixed'}
                                                    onValueChange={(value) => {
                                                        const type = value as 'fixed' | 'percentage';

                                                        let itemDiscount = 0;
                                                        if (type === 'fixed') {
                                                            itemDiscount = modalItem.discount_rate;
                                                        } else {
                                                            itemDiscount = (modalItem.cost_price * modalItem.qty * modalItem.discount_rate) / 100;
                                                        }

                                                        const totalAmount = (modalItem.cost_price * modalItem.qty) - itemDiscount;
                                                        const totalUnits = modalItem.qty + modalItem.free_qty;
                                                        const newCostPrice = totalUnits > 0 ? totalAmount / totalUnits : modalItem.cost_price;

                                                        onModalItemChange({
                                                            ...modalItem,
                                                            discount_type: type,
                                                            item_discount: itemDiscount,
                                                            amount: totalAmount,
                                                            new_cost_price: newCostPrice, // Show net cost in the table
                                                        });
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="fixed">Fixed (Rs)</SelectItem>
                                                        <SelectItem value="percentage">Perc (%)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={activeField === 'discount_rate' ? activeValue : (modalItem.discount_rate !== 0 ? modalItem.discount_rate : '')}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    placeholder={modalItem.discount_type === 'percentage' ? '0.00%' : '0.00'}
                                                    onFocus={(e) => {
                                                        setActiveField('discount_rate');
                                                        setActiveValue(modalItem.discount_rate !== 0 ? modalItem.discount_rate.toString() : '');
                                                        e.target.select();
                                                    }}
                                                    onBlur={() => setActiveField(null)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setActiveValue(val);
                                                        const newDiscountRate = parseFloat(val) || 0;

                                                        let itemDiscount = 0;
                                                        if ((modalItem.discount_type || 'fixed') === 'fixed') {
                                                            itemDiscount = newDiscountRate;
                                                        } else {
                                                            itemDiscount = (modalItem.cost_price * modalItem.qty * newDiscountRate) / 100;
                                                        }

                                                        const totalAmount = (modalItem.cost_price * modalItem.qty) - itemDiscount;
                                                        const totalUnits = modalItem.qty + modalItem.free_qty;
                                                        const newCostPrice = totalUnits > 0 ? totalAmount / totalUnits : modalItem.cost_price;

                                                        onModalItemChange({
                                                            ...modalItem,
                                                            discount_rate: newDiscountRate,
                                                            item_discount: itemDiscount,
                                                            amount: totalAmount,
                                                            new_cost_price: newCostPrice, // Show net cost in the table
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* <div>
                                        <Label className="text-sm font-medium text-gray-700">Cus Discount Amount (Rs)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'cus_discount_rate' ? activeValue : (modalItem.cus_discount_rate !== undefined && modalItem.cus_discount_rate !== 0 ? modalItem.cus_discount_rate : '')}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('cus_discount_rate');
                                                setActiveValue(modalItem.cus_discount_rate && modalItem.cus_discount_rate !== 0 ? modalItem.cus_discount_rate.toString() : '');
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    cus_discount_rate: parseFloat(val) || 0
                                                });
                                            }}
                                            placeholder="0.00"
                                            className="mt-1"
                                        />
                                    </div> */}

                                    {/* <div>
                                        <Label className="text-sm font-medium text-gray-700">Free Quantity</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'free_qty' ? activeValue : (modalItem.free_qty !== 0 ? modalItem.free_qty : '')}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('free_qty');
                                                setActiveValue(modalItem.free_qty !== 0 ? modalItem.free_qty.toString() : '');
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const newFreeQty = parseFloat(val) || 0;
                                                const totalQty = modalItem.qty + newFreeQty;

                                                const totalAmount = (modalItem.cost_price * modalItem.qty) - modalItem.item_discount;
                                                const newCostPrice = totalQty > 0 ? totalAmount / totalQty : modalItem.cost_price;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    free_qty: newFreeQty,
                                                    new_cost_price: newCostPrice, // Show net cost in the table
                                                });
                                            }}
                                            placeholder='0.00'
                                            className="mt-1"
                                        />
                                    </div> */}

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Retail Price</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'retail_price' ? activeValue : (modalItem.retail_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('retail_price');
                                                setActiveValue(modalItem.retail_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    retail_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                        {/* Display last GRN retail if available */}
                                        {modalItem && modalItem.product_id > 0 && (() => {
                                            const product = filteredProducts.find(p => p.id === modalItem.product_id);
                                            if (product && product.last_grn_retail !== undefined && product.last_grn_retail !== null) {
                                                return (
                                                    <div className="mt-1 text-xs text-blue-600">
                                                        <span>Last GRN Retail: Rs {(product.last_grn_retail || 0).toFixed(2)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Wholesale Price</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'wholesale_price' ? activeValue : (modalItem.wholesale_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('wholesale_price');
                                                setActiveValue(modalItem.wholesale_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    wholesale_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                        {/* Display last GRN wholesale if available */}
                                        {modalItem && modalItem.product_id > 0 && (() => {
                                            const product = filteredProducts.find(p => p.id === modalItem.product_id);
                                            if (product && product.last_grn_wholesale !== undefined && product.last_grn_wholesale !== null) {
                                                return (
                                                    <div className="mt-1 text-xs text-blue-600">
                                                        <span>Last GRN Wholesale: Rs {(product.last_grn_wholesale || 0).toFixed(2)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Vehicle Sale Price</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'VehicleSalePrice' ? activeValue : (modalItem.VehicleSalePrice || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('VehicleSalePrice');
                                                setActiveValue(modalItem.VehicleSalePrice.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    VehicleSalePrice: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                        {/* Display last GRN vehicle sale if available */}
                                        {modalItem && modalItem.product_id > 0 && (() => {
                                            const product = filteredProducts.find(p => p.id === modalItem.product_id);
                                            if (product && product.last_grn_vehicle_sale !== undefined && product.last_grn_vehicle_sale !== null) {
                                                return (
                                                    <div className="mt-1 text-xs text-blue-600">
                                                        <span>Last GRN Vehicle: Rs {(product.last_grn_vehicle_sale || 0).toFixed(2)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Discount Sections Wrapper */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

                                {/* Cash/Bank Transfer Discount */}
                                <div className="w-full">
                                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Package className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-slate-800">{t('Cash/Bank Discount')}</h2>
                                        <Select
                                            value={modalItem.RtDisType1 || 'fixed'}
                                            onValueChange={(value) => {
                                                onModalItemChange({
                                                    ...modalItem,
                                                    RtDisType1: value as 'fixed' | 'percentage',
                                                });
                                            }}
                                        >
                                            <SelectTrigger className="w-[140px] h-8 text-xs border-slate-300">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fixed">Fixed (Rs)</SelectItem>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-white p-6">
                                        <div className="mb-4 grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">Min Qty 1</p>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={activeField === 'RtQty1' ? activeValue : (modalItem.RtQty1 !== undefined && modalItem.RtQty1 !== 0 ? modalItem.RtQty1 : '')}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    onFocus={(e) => {
                                                        setActiveField('RtQty1');
                                                        setActiveValue(modalItem.RtQty1 && modalItem.RtQty1 !== 0 ? modalItem.RtQty1.toString() : '');
                                                        e.target.select();
                                                    }}
                                                    onBlur={() => setActiveField(null)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setActiveValue(val);
                                                        onModalItemChange({
                                                            ...modalItem,
                                                            RtQty1: parseFloat(val) || 0
                                                        });
                                                    }}
                                                    placeholder="e.g. 10"
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-center"
                                                />
                                            </div>
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">Min Qty 2</p>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={activeField === 'RtQty2' ? activeValue : (modalItem.RtQty2 !== undefined && modalItem.RtQty2 !== 0 ? modalItem.RtQty2 : '')}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    onFocus={(e) => {
                                                        setActiveField('RtQty2');
                                                        setActiveValue(modalItem.RtQty2 && modalItem.RtQty2 !== 0 ? modalItem.RtQty2.toString() : '');
                                                        e.target.select();
                                                    }}
                                                    onBlur={() => setActiveField(null)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setActiveValue(val);
                                                        onModalItemChange({
                                                            ...modalItem,
                                                            RtQty2: parseFloat(val) || 0
                                                        });
                                                    }}
                                                    placeholder="e.g. 20"
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-center"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">
                                                    {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? 'Min Dis 1 %' : 'Min Dis 1 Rs'}
                                                </p>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={activeField === 'RtDis1' ? activeValue : (modalItem.RtDis1 !== undefined && modalItem.RtDis1 !== 0 ? modalItem.RtDis1 : '')}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onFocus={(e) => {
                                                            setActiveField('RtDis1');
                                                            setActiveValue(modalItem.RtDis1 && modalItem.RtDis1 !== 0 ? modalItem.RtDis1.toString() : '');
                                                            e.target.select();
                                                        }}
                                                        onBlur={() => setActiveField(null)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setActiveValue(val);
                                                            onModalItemChange({ ...modalItem, RtDis1: parseFloat(val) || 0 });
                                                        }}
                                                        placeholder="e.g. 5"
                                                        className="w-full rounded border border-slate-200 px-3 py-2 text-right pr-8"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
                                                        {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? '%' : 'Rs'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">
                                                    {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? 'Min Dis 2 %' : 'Min Dis 2 Rs'}
                                                </p>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={activeField === 'RtDis2' ? activeValue : (modalItem.RtDis2 !== undefined && modalItem.RtDis2 !== 0 ? modalItem.RtDis2 : '')}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onFocus={(e) => {
                                                            setActiveField('RtDis2');
                                                            setActiveValue(modalItem.RtDis2 && modalItem.RtDis2 !== 0 ? modalItem.RtDis2.toString() : '');
                                                            e.target.select();
                                                        }}
                                                        onBlur={() => setActiveField(null)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setActiveValue(val);
                                                            onModalItemChange({ ...modalItem, RtDis2: parseFloat(val) || 0 });
                                                        }}
                                                        placeholder="e.g. 10"
                                                        className="w-full rounded border border-slate-200 px-3 py-2 text-right pr-8"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
                                                        {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? '%' : 'Rs'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Credit/Card Discounts */}
                                <div className="w-full">
                                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <CreditCard className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h2 className="text-lg font-semibold text-slate-800">{t('Credit/Card Discounts')}</h2>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                            (modalItem.RtDisType1 || 'fixed') === 'percentage'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? 'Percentage (%)' : 'Fixed (Rs)'}
                                        </span>
                                        <span className="text-xs text-slate-400 italic">(same as Cash/Bank)</span>
                                    </div>

                                    <div className="rounded-lg border border-slate-200 bg-white p-6">
                                        <div className="mb-4 grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">Min Qty 1</p>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={activeField === 'CredQty1' ? activeValue : (modalItem.CredQty1 !== undefined && modalItem.CredQty1 !== 0 ? modalItem.CredQty1 : '')}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    onFocus={(e) => {
                                                        setActiveField('CredQty1');
                                                        setActiveValue(modalItem.CredQty1 && modalItem.CredQty1 !== 0 ? modalItem.CredQty1.toString() : '');
                                                        e.target.select();
                                                    }}
                                                    onBlur={() => setActiveField(null)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setActiveValue(val);
                                                        onModalItemChange({
                                                            ...modalItem,
                                                            CredQty1: parseFloat(val) || 0
                                                        });
                                                    }}
                                                    placeholder="e.g. 10"
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-center"
                                                />
                                            </div>
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">Min Qty 2</p>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={activeField === 'CredQty2' ? activeValue : (modalItem.CredQty2 !== undefined && modalItem.CredQty2 !== 0 ? modalItem.CredQty2 : '')}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    onFocus={(e) => {
                                                        setActiveField('CredQty2');
                                                        setActiveValue(modalItem.CredQty2 && modalItem.CredQty2 !== 0 ? modalItem.CredQty2.toString() : '');
                                                        e.target.select();
                                                    }}
                                                    onBlur={() => setActiveField(null)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setActiveValue(val);
                                                        onModalItemChange({
                                                            ...modalItem,
                                                            CredQty2: parseFloat(val) || 0
                                                        });
                                                    }}
                                                    placeholder="e.g. 20"
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-center"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">
                                                    {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? 'Min Dis 1 %' : 'Min Dis 1 Rs'}
                                                </p>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={activeField === 'CredDis1' ? activeValue : (modalItem.CredDis1 !== undefined && modalItem.CredDis1 !== 0 ? modalItem.CredDis1 : '')}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onFocus={(e) => {
                                                            setActiveField('CredDis1');
                                                            setActiveValue(modalItem.CredDis1 && modalItem.CredDis1 !== 0 ? modalItem.CredDis1.toString() : '');
                                                            e.target.select();
                                                        }}
                                                        onBlur={() => setActiveField(null)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setActiveValue(val);
                                                            onModalItemChange({ ...modalItem, CredDis1: parseFloat(val) || 0 });
                                                        }}
                                                        placeholder="e.g. 5"
                                                        className="w-full rounded border border-slate-200 px-3 py-2 text-right pr-8"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
                                                        {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? '%' : 'Rs'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="mb-2 text-xs font-medium text-slate-700">
                                                    {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? 'Min Dis 2 %' : 'Min Dis 2 Rs'}
                                                </p>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={activeField === 'CredDis2' ? activeValue : (modalItem.CredDis2 !== undefined && modalItem.CredDis2 !== 0 ? modalItem.CredDis2 : '')}
                                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                        onFocus={(e) => {
                                                            setActiveField('CredDis2');
                                                            setActiveValue(modalItem.CredDis2 && modalItem.CredDis2 !== 0 ? modalItem.CredDis2.toString() : '');
                                                            e.target.select();
                                                        }}
                                                        onBlur={() => setActiveField(null)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setActiveValue(val);
                                                            onModalItemChange({ ...modalItem, CredDis2: parseFloat(val) || 0 });
                                                        }}
                                                        placeholder="e.g. 10"
                                                        className="w-full rounded border border-slate-200 px-3 py-2 text-right pr-8"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none">
                                                        {(modalItem.RtDisType1 || 'fixed') === 'percentage' ? '%' : 'Rs'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )}
                            {/* Calculations */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-1 gap-3 rounded-lg bg-blue-50 p-4 sm:grid-cols-3 sm:gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Subtotal</Label>
                                        <p className="text-lg font-semibold text-gray-900">Rs {((modalItem.cost_price || 0) * (modalItem.qty || 0)).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Item Discount</Label>
                                        <p className="text-lg font-semibold text-red-600">Rs {(modalItem.item_discount || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                                        <p className="text-lg font-semibold text-green-600">Rs {(modalItem.amount || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                                <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={onConfirm}
                                    className="w-full bg-amber-600 hover:bg-amber-700 sm:w-auto"
                                >
                                    {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
