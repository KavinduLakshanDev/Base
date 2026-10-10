export type DiscountType = 'fixed' | 'percentage';

export interface TierLike {
    qty?: number | null;
    discount?: number | null;
}

export interface TierCarrier {
    tier1_qty?: number | null;
    tier1_discount?: number | null;
    tier2_qty?: number | null;
    tier2_discount?: number | null;
    cred_tier1_qty?: number | null;
    cred_tier1_discount?: number | null;
    cred_tier2_qty?: number | null;
    cred_tier2_discount?: number | null;
    cus_discount_rate?: number;
    cus_discount_type?: string | null;
    discount_type?: string | null;
}

export const resolveDiscountType = (type?: string | null): DiscountType =>
    type === 'percentage' ? 'percentage' : 'fixed';

export const getDiscountType = (item?: TierCarrier | null): DiscountType =>
    resolveDiscountType(item?.cus_discount_type ?? item?.discount_type);

/** Per-unit discount for a tier/rate. percentage = % of unit price, fixed = Rs. */
export const calcUnitDiscount = (
    unitPrice: number,
    rate: number | null | undefined,
    type?: string | null
): number => {
    if (!rate || rate <= 0 || !unitPrice || unitPrice <= 0) return 0;
    return resolveDiscountType(type) === 'percentage'
        ? unitPrice * (rate / 100)
        : rate;
};

/** Total line discount for a quantity using the first matching tier (highest qty first). */
export const calcTierDiscount = (
    unitPrice: number,
    quantity: number,
    tiers: TierLike[],
    type?: string | null
): number => {
    for (const tier of tiers) {
        if (
            tier.qty !== null &&
            tier.qty !== undefined &&
            quantity >= tier.qty &&
            tier.discount !== null &&
            tier.discount !== undefined &&
            tier.discount > 0
        ) {
            return calcUnitDiscount(unitPrice, tier.discount, type) * quantity;
        }
    }
    return 0;
};

/**
 * Tier set by payment mode:
 * - card/credit → Cred tiers (CredQty/CredDis)
 * - cash/bank_transfer → retail tiers (RtQty/RtDis)
 * - other → none
 */
export const getTiersForMode = (
    item: TierCarrier,
    mode: string
): TierLike[] => {
    if (['card', 'credit', 'cheque'].includes(mode)) {
        return [
            { qty: item.cred_tier2_qty, discount: item.cred_tier2_discount },
            { qty: item.cred_tier1_qty, discount: item.cred_tier1_discount },
        ];
    }
    if (['cash', 'bank_transfer', 'transfer'].includes(mode)) {
        return [
            { qty: item.tier2_qty, discount: item.tier2_discount },
            { qty: item.tier1_qty, discount: item.tier1_discount },
        ];
    }
    return [];
};

/** Full tier discount for an item at a given qty/price/payment mode. */
export const calcTierDiscountForItem = (
    item: TierCarrier,
    quantity: number,
    unitPrice: number,
    mode: string
): number => {
    const tierDiscount = calcTierDiscount(
        unitPrice,
        quantity,
        getTiersForMode(item, mode),
        getDiscountType(item)
    );
    
    // If no tier discount applies, fallback to the generic customer discount rate
    // ONLY for cash-like payment modes. Card/credit/cheque modes do not get this discount.
    const cashLikeModes = ['cash', 'bank_transfer', 'transfer'];
    if (tierDiscount === 0 && item.cus_discount_rate && item.cus_discount_rate > 0 && cashLikeModes.includes(mode)) {
        return calcUnitDiscount(unitPrice, item.cus_discount_rate, getDiscountType(item)) * quantity;
    }
    
    return tierDiscount;
};
