import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, Barcode, ChevronRight } from 'lucide-react';

interface BarcodeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: any[];
    onSelect: (product: any) => void;
    searchTerm?: string;
}

const BarcodeSelectionModal: React.FC<BarcodeSelectionModalProps> = ({ 
    isOpen, 
    onClose, 
    products, 
    onSelect,
    searchTerm 
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedIndexRef = useRef(0);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen || !products || products.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = Math.min(selectedIndexRef.current + 1, products.length - 1);
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
                if (products[selectedIndexRef.current]) {
                    onSelect(products[selectedIndexRef.current]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onClose();
                break;
        }
    }, [isOpen, products, onSelect, onClose]);

    // Add/remove keyboard event listeners
    useEffect(() => {
        if (isOpen && products && products.length > 0) {
            selectedIndexRef.current = 0;
            setSelectedIndex(0);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown, products]);

    if (!products || products.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-2xl bg-white border-2 border-blue-100 shadow-2xl overflow-hidden p-0">
                <div className="p-6">
                    <DialogHeader className="border-b border-gray-100 pb-4">
                        <div className="flex items-center space-x-3 mb-1">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Barcode className="w-5 h-5 text-blue-600" />
                            </div>
                            <DialogTitle className="text-xl font-bold text-gray-900">Multiple Products Found</DialogTitle>
                        </div>
                        <DialogDescription className="text-gray-500 font-medium">
                            Found {products.length} products with barcode: <span className="text-blue-600 font-bold">{searchTerm || products[0].barcode}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 max-h-[50vh] overflow-y-auto px-1">
                        <div className="space-y-3">
                            {products.map((product, idx) => (
                                <div
                                    key={product.item_code + idx}
                                    className={`group flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                        idx === selectedIndex
                                            ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-400'
                                            : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                                    }`}
                                    onClick={() => {
                                        setSelectedIndex(idx);
                                        selectedIndexRef.current = idx;
                                        onSelect(product);
                                    }}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-3 rounded-xl transition-colors ${
                                            idx === selectedIndex ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-50'
                                        }`}>
                                            <Package className={`w-6 h-6 ${
                                                idx === selectedIndex ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-400'
                                            }`} />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold transition-colors ${
                                                idx === selectedIndex ? 'text-blue-800' : 'text-gray-900'
                                            }`}>
                                                {product.item_name}
                                            </h4>
                                            <div className="flex items-center space-x-3 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono font-medium">
                                                    {product.item_code}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {product.category || 'Uncategorized'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <div className={`text-sm font-bold ${
                                                idx === selectedIndex ? 'text-blue-700' : 'text-gray-900'
                                            }`}>
                                                Rs. {parseFloat(String(product.retail_price || 0)).toFixed(2)}
                                            </div>
                                            {product.stock !== undefined && (
                                                <div className={`text-[10px] font-bold uppercase tracking-wider ${
                                                    product.stock > 0 ? 'text-emerald-600' : 'text-red-500'
                                                }`}>
                                                    Stock: {product.stock}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight className={`w-5 h-5 transition-transform ${
                                            idx === selectedIndex ? 'text-blue-500 translate-x-1' : 'text-gray-300'
                                        }`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3 border-t border-gray-100 pt-4">
                        <div className="hidden sm:flex flex-1 items-center text-xs text-gray-400 italic">
                            Use ↑↓ arrow keys to navigate, Enter to select
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full sm:w-auto border-gray-200 text-gray-600 hover:bg-gray-50" 
                            onClick={onClose}
                        >
                            Cancel Search
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BarcodeSelectionModal;
