import React from 'react';

interface PriceTypeSelectorProps {
    priceType: string;
    setPriceType: (value: string) => void;
}

const PriceTypeSelector: React.FC<PriceTypeSelectorProps> = ({ priceType, setPriceType }) => {
    return (
        <div className="flex flex-wrap gap-3">
            <label className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="radio"
                    name="price_type"
                    value="retail"
                    checked={priceType === 'retail'}
                    onChange={() => setPriceType('retail')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-sm font-medium">Retail Price (F1)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="radio"
                    name="price_type"
                    value="wholesale"
                    checked={priceType === 'wholesale'}
                    onChange={() => setPriceType('wholesale')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-sm font-medium">Wholesale Price (F2)</span>
            </label>
        </div>
    );
};

export default PriceTypeSelector;
