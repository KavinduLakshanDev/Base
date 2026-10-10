import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Dialog from '@radix-ui/react-dialog';
import { t } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';
import { CheckCircle, PackagePlus } from 'lucide-react';

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
    RtQty1?: number;
    RtDis1?: number;
    RtDisType1?: 'fixed' | 'percentage';
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
    RtQty1?: number;
    RtDis1?: number;
    RtDisType1?: 'fixed' | 'percentage';
    warranty?: string;
    last_grn_cost?: number;
    last_grn_retail?: number;
    last_grn_wholesale?: number;
    last_grn_vehicle_sale?: number;
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

interface PrinterItemModalProps {
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

export default function PrinterItemModal({
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
}: PrinterItemModalProps) {
    const [barcodeSearching, setBarcodeSearching] = useState(false);
    const barcodeTimeoutRef = useRef<number | null>(null);
    const [barcodeMessage, setBarcodeMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [activeValue, setActiveValue] = useState<string>('');
    const serialRef = useRef<HTMLTextAreaElement | null>(null);
    const [multipleSerialNumbers, setMultipleSerialNumbers] = useState<string>('');
    const [dbDuplicates, setDbDuplicates] = useState<string[]>([]);
    const [isCheckingSerials, setIsCheckingSerials] = useState(false);

    if (!modalItem) return null;

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
                    
                    if (product.is_service) {
                        setBarcodeMessage({ type: 'error', text: 'Service items cannot be added to a purchase.' });
                        return;
                    }
                    const brandStr = product.brand || '';
                    const modelStr = product.model || '';
                    const nameStr = product.name || '';

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
                        RtQty1: product.RtQty1 || 0,
                        RtDis1: product.RtDis1 || 0,
                        RtDisType1: product.RtDisType1 || 'fixed',
                    });

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

    useEffect(() => {
        if (keepModalOpen && modalItem) {
            serialRef.current?.focus();
        }
    }, [modalItem, keepModalOpen]);

    // Check for duplicates in database
    useEffect(() => {
        const checkSerials = async () => {
            const allSerials = multipleSerialNumbers
                .split(/[\n,]+/)
                .map(s => s.trim())
                .filter(s => s !== '');
            
            if (allSerials.length === 0) {
                setDbDuplicates([]);
                return;
            }

            setIsCheckingSerials(true);
            try {
                const response = await fetch('/pos/api/purchases/check-serial-number', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({ serial_numbers: allSerials }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setDbDuplicates(data.duplicates || []);
                }
            } catch (error) {
                console.error('Error checking serial numbers:', error);
            } finally {
                setIsCheckingSerials(false);
            }
        };

        const timeoutId = setTimeout(checkSerials, 500);
        return () => clearTimeout(timeoutId);
    }, [multipleSerialNumbers]);

    // Sync qty and multipleSerialNumbers with modalItem
    useEffect(() => {
        const serials = multipleSerialNumbers
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(s => s !== '');
        
        const newQty = Array.from(new Set(serials)).length || 1;
        
        if (newQty !== modalItem.qty || multipleSerialNumbers !== modalItem.multipleSerialNumbers) {
            let itemDiscount = 0;
            if ((modalItem.discount_type || 'fixed') === 'fixed') {
                itemDiscount = modalItem.discount_rate;
            } else {
                itemDiscount = (modalItem.cost_price * newQty * modalItem.discount_rate) / 100;
            }

            const totalAmount = (modalItem.cost_price * newQty) - itemDiscount;
            const netCostPrice = newQty > 0 ? totalAmount / newQty : modalItem.cost_price;

            onModalItemChange({
                ...modalItem,
                qty: newQty,
                item_discount: itemDiscount,
                amount: totalAmount,
                new_cost_price: netCostPrice,
                multipleSerialNumbers: multipleSerialNumbers,
            });
        }
    }, [multipleSerialNumbers, modalItem.cost_price, modalItem.discount_rate, modalItem.discount_type]);

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-xl">
                    <div className="p-6">
                        <Dialog.Title className="mb-4 text-xl font-bold text-gray-900">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                <span>
                                    Printer Item
                                    {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName
                                        ? ` - Adding #${items.length + 1}`
                                        : modalItem?.product_name ? ` - ${modalItem.product_name}` : ''
                                    }
                                </span>
                                {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName && (
                                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                        Repeat Entry
                                    </span>
                                )}
                            </div>
                        </Dialog.Title>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">
                            {t('Enter printer details with serial number (required). Each serial number will create a separate inventory item.')}
                        </Dialog.Description>

                        <div className="space-y-6">
                            {/* Product Search & Select Section */}
                            {modalItem.product_id === 0 && (
                                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                    <Label className="text-base font-semibold mb-3 block">Search & Select Printer</Label>
                                    <div className="flex items-center gap-4 mb-4">
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
                                    </div>

                                    {/* Product List - Show only Printers (CAT001) */}
                                    <div className="max-h-60 overflow-y-auto">
                                        {filteredProducts.filter((product) => product.category_id === 'CAT001').length === 0 ? (
                                            <div className="text-center py-4">
                                                <div className="text-gray-500 text-sm mb-3">
                                                    {itemSearchQuery.trim() === '' 
                                                        ? 'Start typing to search for printers...'
                                                        : 'No printers found'
                                                    }
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {filteredProducts
                                                    .filter((product) => product.category_id === 'CAT001' && !product.is_service)
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
                                <div className="grid grid-cols-3 gap-4">
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

                            {/* Printer-specific Fields - Only Qty and Pricing (No Free Qty, No Extra Price) */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                    {/* <div>
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

                                                const itemDiscount = (modalItem.cost_price * newQty * modalItem.discount_rate) / 100;
                                                const totalAmount = modalItem.cost_price * newQty - itemDiscount;
                                                const newCostPrice = newQty > 0 ? totalAmount / newQty : modalItem.cost_price;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    qty: newQty,
                                                    item_discount: itemDiscount,
                                                    amount: totalAmount,
                                                    new_cost_price: newCostPrice,
                                                });
                                            }}
                                            className="mt-1"
                                        />
                                    </div> */}

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
                                                const newCostPrice = parseFloat(val) || 0;

                                                let itemDiscount = 0;
                                                if ((modalItem.discount_type || 'fixed') === 'fixed') {
                                                    itemDiscount = modalItem.discount_rate;
                                                } else {
                                                    itemDiscount = (newCostPrice * modalItem.qty * modalItem.discount_rate) / 100;
                                                }

                                                const totalAmount = newCostPrice * modalItem.qty - itemDiscount;
                                                const netCostPrice = modalItem.qty > 0 ? totalAmount / modalItem.qty : newCostPrice;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    cost_price: newCostPrice,
                                                    item_discount: itemDiscount,
                                                    amount: totalAmount,
                                                    new_cost_price: netCostPrice,
                                                });
                                            }}
                                            placeholder='0.00'
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
                                        <Label className="text-sm font-medium text-gray-700">Supplier gave Discount</Label>
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
                                                        const netCostPrice = modalItem.qty > 0 ? totalAmount / modalItem.qty : modalItem.cost_price;

                                                        onModalItemChange({
                                                            ...modalItem,
                                                            discount_type: type,
                                                            item_discount: itemDiscount,
                                                            amount: totalAmount,
                                                            new_cost_price: netCostPrice,
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
                                                        const netCostPrice = modalItem.qty > 0 ? totalAmount / modalItem.qty : modalItem.cost_price;

                                                        onModalItemChange({
                                                            ...modalItem,
                                                            discount_rate: newDiscountRate,
                                                            item_discount: itemDiscount,
                                                            amount: totalAmount,
                                                            new_cost_price: netCostPrice,
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

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

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Customer buy Min Qty</Label>
                                        <Input
                                            type="number"
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
                                                    RtQty1: parseInt(val) || 0
                                                });
                                            }}
                                            placeholder="0"
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Customer Discount Amount</Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
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
                                                        onModalItemChange({
                                                            ...modalItem,
                                                            RtDis1: parseFloat(val) || 0
                                                        });
                                                    }}
                                                    placeholder="0.00"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="w-28 mt-1">
                                                <Select
                                                    value={modalItem.RtDisType1 || 'fixed'}
                                                    onValueChange={(val) => onModalItemChange({
                                                        ...modalItem,
                                                        RtDisType1: val as 'fixed' | 'percentage'
                                                    })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="fixed">Fixed</SelectItem>
                                                        {/* <SelectItem value="percentage">Percent (%)</SelectItem> */}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* <div>
                                        <Label className="text-sm font-medium text-gray-700">CC Price</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'cc_price' ? activeValue : (modalItem.cc_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('cc_price');
                                                setActiveValue(modalItem.cc_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    cc_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div> */}
                                </div>
                            )}

                            {/* Multiple Serial Numbers Input - REQUIRED for Printers */}
                            {modalItem.product_id > 0 && (
                                <div className="mt-6 p-5 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-green-400 rounded-xl shadow-md">
                                    <h4 className="text-base font-bold text-emerald-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H3a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V6a1 1 0 00-1-1h-3a1 1 0 000-2h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                                        </svg>
                                        📋 Printer Serial Numbers (Required)
                                        <span className="ml-auto text-xs bg-red-200 text-red-800 px-3 py-1 rounded-full font-semibold">
                                            REQUIRED
                                        </span>
                                    </h4>

                                    {/* Product Summary */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 mb-4 border-b-2 border-green-200">
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600 uppercase">Product Code</Label>
                                            <p className="text-lg font-bold text-emerald-700">{modalItem.product_code}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600 uppercase">Product Name</Label>
                                            <p className="text-lg font-bold text-emerald-700">{modalItem.product_name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600 uppercase">Unit Cost Price</Label>
                                            <p className="text-lg font-bold text-emerald-700">Rs. {(modalItem.cost_price || 0).toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Multiple Serial Numbers Input */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M5 3a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V3z" />
                                            </svg>
                                            Enter Serial Numbers (One Per Line or Comma-Separated)
                                        </Label>
                                        <textarea
                                            ref={serialRef}
                                            placeholder="Examples:&#10;ABC123&#10;ABC124&#10;ABC125&#10;&#10;Or: ABC123, ABC124, ABC125"
                                            className="w-full h-30 p-3 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none font-mono text-sm bg-white"
                                            value={multipleSerialNumbers}
                                            onChange={(e) => setMultipleSerialNumbers(e.target.value)}
                                        />
                                    </div>

                                    {/* Show parsed serial numbers with duplicate validation */}
                                    {multipleSerialNumbers.trim() !== '' && (() => {
                                        const allSerials = multipleSerialNumbers
                                            .split(/[\n,]+/)
                                            .map(s => s.trim())
                                            .filter(s => s !== '');
                                        
                                        const uniqueSerials = Array.from(new Set(allSerials));
                                        const duplicates = allSerials.filter((item, index) => allSerials.indexOf(item) !== index);
                                        const duplicateSet = new Set(duplicates);
                                        const hasDuplicates = duplicateSet.size > 0;
                                        
                                        return (
                                            <div className={`mt-4 bg-white border-2 rounded-lg p-4 ${hasDuplicates ? 'border-red-400 bg-red-50' : 'border-green-200'}`}>
                                                <p className={`font-bold text-sm mb-3 flex items-center gap-2 ${hasDuplicates ? 'text-red-800' : 'text-emerald-800'}`}>
                                                    <CheckCircle className={`w-4 h-4 ${hasDuplicates ? 'text-red-600' : 'text-emerald-600'}`} />
                                                    Serial Numbers to Add:
                                                </p>
                                                
                                                <div className="mb-4">
                                                    <p className="text-xs font-medium text-gray-600 mb-2">✅ Valid (Unique):</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {uniqueSerials.map((serial, idx) => (
                                                            <span key={idx} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold border border-emerald-300">
                                                                {serial}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {hasDuplicates && (
                                                    <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                                                        <p className="text-xs font-bold text-red-800 mb-2">⚠️ Local Duplicate Serial Numbers Detected:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Array.from(duplicateSet).map((serial, idx) => (
                                                                <span key={idx} className="px-3 py-2 bg-red-200 text-red-800 rounded-full text-sm font-semibold border border-red-400">
                                                                    {serial}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-red-700 mt-2">These serial numbers are repeated in your current list above. Please remove the repeats.</p>
                                                    </div>
                                                )}

                                                {dbDuplicates.length > 0 && (
                                                    <div className="mb-4 p-3 bg-red-100 border-2 border-red-500 rounded-lg shadow-inner">
                                                        <p className="text-xs font-bold text-red-800 mb-2 flex items-center gap-2">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                            </svg>
                                                            DATABASE ERROR: Serial Numbers Already Exist In System
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {dbDuplicates.map((serial, idx) => (
                                                                <span key={idx} className="px-3 py-2 bg-red-600 text-white rounded-full text-sm font-bold border border-red-800 shadow-sm animate-pulse">
                                                                    {serial}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs font-bold text-red-600 mt-2">
                                                            CRITICAL: The highlighted serial numbers are already recorded in a previous GRN or are currently in stock. You cannot add them again.
                                                        </p>
                                                    </div>
                                                )}

                                                {isCheckingSerials && (
                                                    <p className="text-xs text-blue-600 animate-pulse mb-2 italic">Checking system for duplicates...</p>
                                                )}
                                                
                                                <div className={`text-sm font-semibold ${hasDuplicates || dbDuplicates.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                                    {hasDuplicates || dbDuplicates.length > 0 ? (
                                                        <>
                                                            ❌ {uniqueSerials.length} unique serial number(s) • {(hasDuplicates ? duplicateSet.size : 0) + dbDuplicates.length} error(s) found
                                                        </>
                                                    ) : (
                                                        <>
                                                            ✅ {uniqueSerials.length} serial number(s) ready to add
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <p className="text-xs text-gray-600 mt-3 italic">
                                        💡 Each serial number will create a separate GRN line item with the same printer details
                                    </p>
                                </div>
                            )}

                            {/* Calculations */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-2 gap-4 rounded-lg bg-blue-50 p-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Item Discount</Label>
                                        <p className="text-lg font-semibold text-red-600">Rs {(modalItem.item_discount || 0).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">Net Unit Cost</Label>
                                        <p className="text-lg font-semibold text-blue-600">Rs {(modalItem.new_cost_price || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-200">
                                        <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                                        <p className="text-2xl font-bold text-green-600">Rs {(modalItem.amount || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 border-t pt-4">
                                <Button variant="outline" onClick={onCancel}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={() => {
                                        const trimmedSerials = multipleSerialNumbers.trim();
                                        if (trimmedSerials === '') {
                                            alert('Serial number is required for printers');
                                            return;
                                        }

                                        if (dbDuplicates.length > 0) {
                                            alert('Cannot add item: Some serial numbers already exist in the system.');
                                            return;
                                        }

                                        const allSerials = trimmedSerials.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '');
                                        const hasLocalDuplicates = new Set(allSerials).size !== allSerials.length;
                                        if (hasLocalDuplicates) {
                                            alert('Please remove local duplicates before saving.');
                                            return;
                                        }

                                        onModalItemChange({ ...modalItem, multipleSerialNumbers: trimmedSerials });
                                        onConfirm();
                                    }}
                                    disabled={dbDuplicates.length > 0 || isCheckingSerials}
                                    className={`${dbDuplicates.length > 0 ? 'bg-red-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
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
