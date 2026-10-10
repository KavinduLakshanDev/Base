/**
 * Currency formatting utilities
 */

export function formatCurrency(amount: number | null | undefined | string, currency = 'LKR'): string {
    if (amount === null || amount === undefined || amount === '') {
        return `${currency} 0.00`;
    }

    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Handle NaN or invalid numbers
    if (isNaN(numAmount)) {
        return `${currency} 0.00`;
    }

    return `${currency} ${numAmount.toFixed(2)}`;
}

export function formatCurrencyWithoutSymbol(amount: number | null | undefined | string): string {
    if (amount === null || amount === undefined || amount === '') {
        return '0.00';
    }

    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Handle NaN or invalid numbers
    if (isNaN(numAmount)) {
        return '0.00';
    }

    return numAmount.toFixed(2);
}

export function parseCurrency(value: string): number {
    // Remove currency symbols and commas, then parse
    const cleaned = value.replace(/[Rs.\s,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}