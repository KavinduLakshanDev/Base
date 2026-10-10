import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Checkbox } from '@/components/ui/checkbox';

import { Receipt, ArrowLeft } from 'lucide-react';

interface Props {
    nextReturnNo: string;
    currentDate: string;
    section: any;
}

export default function Create({ nextReturnNo, currentDate, section }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        return_date: currentDate,
        customer_name: '',
        customer_code: '',
        customer_id: null,
        original_invoice_no: '',
        return_type: 'item',
        refund_method: 'cash',
        reason: '',
        notes: '',
        items: [] as any[],
        refund_amount: 0,
        exchange_amount: 0,
        exchange_items: [] as any[],
        refund_details: {},
    });

    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
    const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<Set<number>>(new Set());
    // hold user-entered quantities as strings so the input can be edited
    // freely (empty string, partial decimals, etc.) and we parse when needed.
    const [returnQuantities, setReturnQuantities] = useState<Map<number, string>>(new Map());

    // ── Exchange items state ───────────────────────────────────────────────────────
    const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');
    const [exchangeSearchResults, setExchangeSearchResults] = useState<any[]>([]);
    const [exchangeSearchLoading, setExchangeSearchLoading] = useState(false);
    // batches belonging to the currently-selected exchange item
    const [exchangeItemBatches, setExchangeItemBatches] = useState<any[]>([]);
    const [currentExchangeItem, setCurrentExchangeItem] = useState({
        item_code: '',
        item_ky: null as null | number,
        item_name: '',
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        tax_amount: 0,
        batch_no: '',
        item_type: 'item',
    });

    // Search items or printers

    // Select item from search results


    // Remove item from list
    const removeItem = (index: number) => {
        const newItems = data.items.filter((_, i) => i !== index);
        setData('items', newItems);
    };

    // Update item condition in the return list
    const updateItemCondition = (index: number, condition: string) => {
        const updatedItems = [...data.items];
        updatedItems[index] = {
            ...updatedItems[index],
            condition: condition,
            add_to_stock: condition === 'good',
        };
        setData('items', updatedItems);
    };

    // Update damage notes for an item
    const updateDamageNotes = (index: number, notes: string) => {
        const updatedItems = [...data.items];
        updatedItems[index] = {
            ...updatedItems[index],
            damage_notes: notes,
        };
        setData('items', updatedItems);
    };

    // Calculate total return amount using useMemo
    const calculatedTotal = useMemo(() => {
        return data.items.reduce((sum, item) => {
            const itemTotal = (item.quantity * item.unit_price) - item.discount_amount + item.tax_amount;
            return sum + itemTotal;
        }, 0);
    }, [data.items]);

    // Calculate total value of exchange items (goods going out to customer)
    const calculatedExchangeTotal = useMemo(() => {
        return data.exchange_items.reduce((sum, item) => {
            return sum + (item.quantity * item.unit_price)
                       - (item.discount_amount || 0)
                       + (item.tax_amount || 0);
        }, 0);
    }, [data.exchange_items]);

    // Track previous total to avoid infinite updates
    const prevTotalRef = useRef(0);

    // Update refund amount when calculated total changes
    // For 'cash' and 'credit_note': auto-update refund_amount to match total
    // For 'exchange': don't auto-update (user manages exchange items instead)
    useEffect(() => {
        if (data.refund_method === 'cash' || data.refund_method === 'credit_note') {
            let refund = calculatedTotal;
            if (data.refund_method === 'cash' && invoiceData && invoiceData.paid_amount !== undefined) {
                const paidAmount = parseFloat(invoiceData.paid_amount);
                refund = Math.min(calculatedTotal, paidAmount);
            }
            if (refund !== data.refund_amount) {
                setData('refund_amount', refund);
            }
        }
    }, [calculatedTotal, data.refund_method]);

    // Search invoice and load items
    const searchInvoice = async () => {
        if (!data.original_invoice_no) return;

        // strip optional suffix (e.g. ":1") before sending request
        let invoiceParam = data.original_invoice_no.trim();
        invoiceParam = invoiceParam.split(':')[0];

        // we expect Ziggy to provide the helper, but there have been
        // intermittent bugs where the generated route list shipped to the
        // browser did not include customer-returns.search-invoice.  Instead of
        // letting `route()` throw and abort the call we fall back to the hard‑
        // coded URL and log the problem for debugging.
        let endpoint: string;
        try {
            endpoint = route('customer-returns.search-invoice');
        } catch (e: any) {
            console.error('Ziggy route lookup failed for customer-returns.search-invoice', e);
            endpoint = '/customer-returns/search-invoice';
        }

        try {
            const response = await axios.get(endpoint, {
                params: { invoice_no: invoiceParam }
            });
            
            if (response.data.sale) {
                setData('customer_name', response.data.sale.customer_name);
                setData('customer_code', response.data.sale.customer_code);
                setData('customer_id', response.data.sale.customer_id);
                setInvoiceData(response.data.sale);
                setInvoiceItems(response.data.items || []);
                setSelectedInvoiceItems(new Set());
                
                // Initialize return quantities with the RETURNABLE quantity
                // (sold qty minus what has already been returned on previous returns).
                const quantities = new Map<number, string>();
                response.data.items?.forEach((item: any) => {
                    const returnable = item.returnable_qty != null
                        ? parseFloat(item.returnable_qty)
                        : parseFloat(item.quantity);
                    quantities.set(item.id, Math.max(0, returnable).toString());
                });
                setReturnQuantities(quantities);
                
                toast.success('Invoice found - Select items to return');
            }
        } catch (error: any) {
            const message = error.response?.data?.error || 'Invoice not found';
            
            // Silently ignore abort errors
            if (error.code === 'ECONNABORTED' || error.message === 'Request aborted') {
                console.warn('Invoice search was cancelled');
                return;
            }
            
            toast.error(message);
            setInvoiceData(null);
            setInvoiceItems([]);
            setReturnQuantities(new Map());
            
            // Log for debugging
            console.error('Invoice search failed:', {
                invoice: invoiceParam,
                error: error.response?.data || error.message
            });
        }
    };

    // Toggle invoice item selection
    const toggleInvoiceItem = (itemId: number) => {
        const newSelected = new Set(selectedInvoiceItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedInvoiceItems(newSelected);
    };

    // Update return quantity for an item.  We store as string so the user can
    // type freely; parsing is done elsewhere when the number is actually used.
    const updateReturnQuantity = (itemId: number, quantity: string) => {
        const newQuantities = new Map(returnQuantities);
        newQuantities.set(itemId, quantity);
        setReturnQuantities(newQuantities);
    };

    // Add selected invoice items to return list
    const addSelectedItemsToReturn = () => {
        if (selectedInvoiceItems.size === 0) {
            toast.error('Please select at least one item');
            return;
        }

        // Validate return quantities against the dynamically calculated RETURNABLE qty
        const invalidItems = Array.from(selectedInvoiceItems).filter(itemId => {
            const item = invoiceItems.find(i => i.id === itemId);
            const raw = returnQuantities.get(itemId) || '';
            const returnQty = parseFloat(raw) || 0;
            
            const qtyAlreadyInReturnList = data.items
                .filter(i => i.original_sale_item_id === itemId)
                .reduce((sum, i) => sum + i.quantity, 0);

            const maxQty = (item?.returnable_qty != null
                ? parseFloat(item.returnable_qty)
                : parseFloat(item?.quantity || '0')) - qtyAlreadyInReturnList;
                
            return returnQty <= 0 || returnQty > maxQty;
        });

        if (invalidItems.length > 0) {
            toast.error('Invalid return quantity. Must be greater than 0 and not exceed the remaining returnable quantity.');
            return;
        }

        const itemsToAdd = invoiceItems
            .filter(item => selectedInvoiceItems.has(item.id))
            .map(item => {
                const qtyAlreadyInReturnList = data.items
                    .filter(i => i.original_sale_item_id === item.id)
                    .reduce((sum, i) => sum + i.quantity, 0);
                    
                const maxReturnableQty = (item.returnable_qty != null
                    ? parseFloat(item.returnable_qty)
                    : parseFloat(item.quantity)) - qtyAlreadyInReturnList;

                const raw = returnQuantities.get(item.id) || '';
                const returnQty = parseFloat(raw) || Math.max(0, maxReturnableQty);
                
                const origQty = parseFloat(item.quantity) || 1;
                const unitPrice = parseFloat(item.unit_price) || 0;
                
                const appliedDiscount = (parseFloat(item.discount_amount) || 0) / origQty * returnQty;
                const appliedTax = (parseFloat(item.tax_amount) || 0) / origQty * returnQty;
                
                const itemTotal = (returnQty * unitPrice) - appliedDiscount + appliedTax;
                
                return {
                    item_code: item.item_code,
                    item_ky: item.item_ky,
                    item_name: item.item_name,
                    quantity: returnQty,
                    unit_price: unitPrice,
                    discount_amount: appliedDiscount,
                    tax_amount: appliedTax,
                    batch_no: item.batch_no || '',
                    serial_number: item.serial_number || '',
                    brand: item.brand || '',
                    model: item.model || '',
                    warranty: item.warranty || '',
                    item_type: item.item_type,
                    condition: 'good',
                    damage_notes: '',
                    add_to_stock: true,
                    total_amount: itemTotal,
                    original_sale_item_id: item.id,
                };
            });

        setData('items', [...data.items, ...itemsToAdd]);
        setSelectedInvoiceItems(new Set());
        toast.success(`Added ${itemsToAdd.length} item(s) to return`);
    };

    // ── Exchange item helpers ──────────────────────────────────────────────────────
    const handleExchangeSearch = async () => {
        if (!exchangeSearchQuery.trim()) {
            toast.error('Please enter a search term');
            return;
        }
        
        setExchangeSearchLoading(true);
        try {
            const response = await axios.get(route('customer-returns.search-items'), {
                params: { search: exchangeSearchQuery },
            });
            
            if (!response.data || response.data.length === 0) {
                toast.info('No items found matching your search');
                setExchangeSearchResults([]);
            } else {
                setExchangeSearchResults(response.data);
                toast.success(`Found ${response.data.length} item(s)`);
            }
        } catch (error: any) {
            // Silently ignore abort errors
            if (error.code === 'ECONNABORTED' || error.message === 'Request aborted') {
                console.warn('Exchange search was cancelled');
                setExchangeSearchResults([]);
                setExchangeSearchLoading(false);
                return;
            }
            
            console.error('Exchange search failed:', error);
            const errorMsg = error.response?.data?.error || 'Exchange item search failed';
            toast.error(errorMsg);
            setExchangeSearchResults([]);
        } finally {
            setExchangeSearchLoading(false);
        }
    };

    // Group search results by item_code so we display one row per item.
    const groupedExchangeResults = useMemo(() => {
        const map = new Map<string, any>();
        exchangeSearchResults.forEach((row) => {
            const key = row.item_code;
            if (!map.has(key)) {
                map.set(key, { ...row, batches: [] });
            }
            map.get(key)!.batches.push({
                batch_no: row.batch_no || '',
                stock: row.stock ?? 0,
                batch_price: row.batch_price,
            });
        });
        return Array.from(map.values());
    }, [exchangeSearchResults]);

    const selectExchangeItem = (item: any) => {
        // item.batches is the list of batches for this item from groupedExchangeResults
        const batches: any[] = item.batches || [];
        setExchangeItemBatches(batches);

        // Pre-select the first batch and its price
        const firstBatch = batches[0];
        const price = firstBatch?.batch_price != null && firstBatch.batch_price !== ''
            ? parseFloat(firstBatch.batch_price)
            : parseFloat(item.retail_price) || 0;

        setCurrentExchangeItem({
            item_code: item.item_code,
            item_ky: item.item_ky,
            item_name: item.item_name,
            quantity: 1,
            unit_price: price,
            discount_amount: 0,
            tax_amount: 0,
            batch_no: firstBatch?.batch_no || '',
            item_type: 'item',
        });
        setExchangeSearchResults([]);
        setExchangeSearchQuery('');
    };

    const addExchangeItem = () => {
        if (!currentExchangeItem.item_code) {
            toast.error('Please select an item to exchange');
            return;
        }
        if (currentExchangeItem.quantity <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }
        const total = (currentExchangeItem.quantity * currentExchangeItem.unit_price)
                    - currentExchangeItem.discount_amount
                    + currentExchangeItem.tax_amount;
        setData('exchange_items', [
            ...data.exchange_items,
            { ...currentExchangeItem, total_amount: total },
        ]);
        setCurrentExchangeItem({
            item_code: '', item_ky: null, item_name: '', quantity: 1,
            unit_price: 0, discount_amount: 0, tax_amount: 0,
            batch_no: '', item_type: 'item',
        });
        setExchangeItemBatches([]);
    };

    const removeExchangeItem = (index: number) => {
        setData('exchange_items', data.exchange_items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (data.items.length === 0) {
            toast.error('Please add at least one item to return');
            return;
        }

        // For exchange method, require at least one exchange item
        if (data.refund_method === 'exchange' && data.exchange_items.length === 0) {
            toast.error('Please add at least one exchange item to process the exchange');
            return;
        }

        // For exchange with price difference, show a warning instead of blocking
        if (data.refund_method === 'exchange') {
            const returnTotal = data.items.reduce((sum, item) => {
                return sum + (item.quantity * item.unit_price) - item.discount_amount + item.tax_amount;
            }, 0);

            const exchangeTotal = data.exchange_items.reduce((sum, item) => {
                return sum + (item.quantity * item.unit_price) - (item.discount_amount || 0) + (item.tax_amount || 0);
            }, 0);

            if (returnTotal !== exchangeTotal && !data.customer_id) {
                // Warn about price difference but allow walk-in customers to proceed
                const difference = Math.abs(exchangeTotal - returnTotal);
                const owed = exchangeTotal > returnTotal ? 'Collect' : 'Credit';
                console.warn(`Exchange price difference: ${owed} Rs. ${difference.toFixed(2)} (walk-in customer)`);
            }
        }

        // Validate that damaged/defective items have notes
        const itemsWithoutNotes = data.items.filter(
            item => (item.condition === 'damaged' || item.condition === 'defective') && !item.damage_notes?.trim()
        );

        if (itemsWithoutNotes.length > 0) {
            toast.error('Please add damage notes for all damaged/defective items');
            return;
        }
        
        try {
            // Replace inertia post with axios to get JSON response
            const response = await axios.post('/customer-returns', data);
            
            if (response.data.success && response.data.return_id) {
                // Show success toast
                toast.success('Customer return processed successfully!', {
                    description: `Return #${response.data.return_no} has been saved.`,
                    duration: 3000,
                });

                // Auto-download receipt PDF
                const receiptUrl = route('customer-returns.receipt', response.data.return_id);
                window.open(receiptUrl, '_blank');

                // Redirect to show page after a brief delay to allow receipt download
                setTimeout(() => {
                    window.location.href = route('customer-returns.show', response.data.return_id);
                }, 500);
            }
        } catch (error: any) {
            // Silently ignore abort errors (request cancelled)
            if (error.code === 'ECONNABORTED' || error.message === 'Request aborted') {
                console.warn('Return request was cancelled');
                return;
            }
            
            const message = error.response?.data?.message || error.message || 'Failed to create return';
            toast.error(message);
            console.error('Return creation error:', error.response?.data || error);
        }
    };

    const breadcrumbs = [
        { title: 'Home', href: '/company/dashboard' },
        { title: 'Customer Returns', href: '/customer-returns' },
        { title: 'Create Return', href: '/customer-returns/create' },
    ];

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Customer Return" />

            {/* header section matching customer payment style */}
            <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between gap-3 py-4">
                        <div className="flex min-w-0 items-center space-x-3">
                            <div className="rounded-lg bg-white/20 p-2 shadow">
                                <Receipt className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                    Create Customer Return
                                </h1>
                                <p className="hidden sm:block text-xs text-white/80">
                                    Process goods returned by customers
                                </p>
                            </div>
                        </div>
                        <a
                            href="/customer-returns"
                            className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                        >
                            <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                            <span>Back</span>
                        </a>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Return Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Return Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Return No</Label>
                                            <Input value={nextReturnNo} disabled />
                                        </div>
                                        <div>
                                            <Label>Return Date</Label>
                                            <Input
                                                type="date"
                                                value={data.return_date}
                                                onChange={(e) => setData('return_date', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Original Invoice No (Optional)</Label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Input
                                                value={data.original_invoice_no}
                                                onChange={(e) => setData('original_invoice_no', e.target.value)}
                                                placeholder="Enter invoice number"
                                            />
                                            <Button type="button" onClick={searchInvoice} className="w-full sm:w-auto">
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Customer Name *</Label>
                                        <Input
                                            value={data.customer_name}
                                            onChange={(e) => setData('customer_name', e.target.value)}
                                            required
                                        />
                                        {errors.customer_name && <span className="text-red-500 text-sm">{errors.customer_name}</span>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Refund Method *</Label>
                                            <Select value={data.refund_method} onValueChange={(val) => setData('refund_method', val)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash Refund</SelectItem>
                                                    <SelectItem value="exchange">Exchange</SelectItem>
                                                    <SelectItem value="credit_note">Account Credit</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Return Type</Label>
                                            <Select value={data.return_type} onValueChange={(val) => setData('return_type', val)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="item">Items</SelectItem>
                                                    <SelectItem value="printer">Printers</SelectItem>
                                                    <SelectItem value="mixed">Mixed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>Reason for Return</Label>
                                        <Textarea
                                            value={data.reason}
                                            onChange={(e) => setData('reason', e.target.value)}
                                            placeholder="Why is the customer returning this?"
                                        />
                                    </div>

                                    <div>
                                        <Label>Notes</Label>
                                        <Textarea
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            placeholder="Additional notes"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Invoice Details & Item Selection */}
                            {invoiceData && (
                                <Card className="border-green-200 bg-green-50/50">
                                    <CardHeader>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <CardTitle className="flex items-center gap-2">
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                Invoice Details
                                            </CardTitle>
                                            <span className="text-sm text-muted-foreground">
                                                {invoiceData.invoice_date}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Invoice Summary */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white rounded-md border">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Subtotal</div>
                                                <div className="font-semibold">Rs. {invoiceData.subtotal}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Discount</div>
                                                <div className="font-semibold text-orange-600">Rs. {invoiceData.total_discount}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Tax</div>
                                                <div className="font-semibold text-blue-600">Rs. {invoiceData.total_tax}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Grand Total</div>
                                                <div className="font-bold text-lg">Rs. {invoiceData.grand_total}</div>
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                                <Label className="text-base">Select Items to Return</Label>
                                                <Button
                                                    type="button"
                                                    onClick={addSelectedItemsToReturn}
                                                    disabled={selectedInvoiceItems.size === 0}
                                                    size="sm"
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add Selected ({selectedInvoiceItems.size})
                                                </Button>
                                            </div>
                                            
                                            <div className="overflow-x-auto border rounded-md">
                                                <Table className="min-w-[760px]">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-12"></TableHead>
                                                            <TableHead>Item</TableHead>
                                                            <TableHead className="text-right">Sold Qty</TableHead>
                                                            <TableHead className="text-center">Return Qty</TableHead>
                                                            <TableHead className="text-right">Price (Rs.)</TableHead>
                                                            <TableHead className="text-right">Discount (Rs.)</TableHead>
                                                            <TableHead className="text-right">Tax (Rs.)</TableHead>
                                                            <TableHead className="text-right">Total (Rs.)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {invoiceItems.map((item) => {
                                                            const qtyAlreadyInReturnList = data.items
                                                                .filter(i => i.original_sale_item_id === item.id)
                                                                .reduce((sum, i) => sum + i.quantity, 0);

                                                            const returnableQty = (item.returnable_qty != null
                                                                ? parseFloat(item.returnable_qty)
                                                                : parseFloat(item.quantity)) - qtyAlreadyInReturnList;

                                                            const returnedQty = (item.returned_qty != null
                                                                ? parseFloat(item.returned_qty)
                                                                : 0) + qtyAlreadyInReturnList;

                                                            const isFullyReturned = returnableQty <= 0;
                                                            const rawQty = returnQuantities.get(item.id);
                                                            const returnQtyNum = rawQty !== undefined ? parseFloat(rawQty) || 0 : Math.max(0, returnableQty);
                                                            const returnQtyStr = rawQty !== undefined ? rawQty : Math.max(0, returnableQty).toString();
                                                            const isPartialReturn = !isFullyReturned && returnQtyNum < returnableQty;

                                                            return (
                                                                <TableRow
                                                                    key={item.id}
                                                                    className={isFullyReturned ? 'opacity-50 bg-muted/30' : 'hover:bg-accent'}
                                                                >
                                                                    <TableCell className="cursor-pointer">
                                                                        <Checkbox
                                                                            checked={selectedInvoiceItems.has(item.id)}
                                                                            disabled={isFullyReturned}
                                                                            onCheckedChange={() => {
                                                                                if (!isFullyReturned) toggleInvoiceItem(item.id);
                                                                            }}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell
                                                                        onClick={() => { if (!isFullyReturned) toggleInvoiceItem(item.id); }}
                                                                        className={isFullyReturned ? '' : 'cursor-pointer'}
                                                                    >
                                                                        <div className="font-medium">{item.item_name}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {item.item_code}
                                                                            {item.serial_number && ` | S/N: ${item.serial_number}`}
                                                                            {item.batch_no && ` | Batch: ${item.batch_no}`}
                                                                        </div>
                                                                        {isFullyReturned && (
                                                                            <span className="inline-block mt-1 text-xs font-semibold text-destructive">
                                                                                Fully Returned
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right" onClick={() => { if (!isFullyReturned) toggleInvoiceItem(item.id); }}>
                                                                        <div>{item.quantity}</div>
                                                                        {returnedQty > 0 && (
                                                                            <div className="text-xs text-orange-600">
                                                                                {returnedQty} returned
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {isFullyReturned ? (
                                                                            <div className="text-center text-xs text-muted-foreground">—</div>
                                                                        ) : item.item_type === 'printer' ? (
                                                                            <div className="text-center">
                                                                                <div className="font-medium">1</div>
                                                                                <div className="text-xs text-muted-foreground">Printer</div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <Input
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0.01"
                                                                                    max={returnableQty}
                                                                                    value={returnQtyStr}
                                                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                                    onChange={(e) => {
                                                                                        const raw = e.target.value;
                                                                                        // allow empty string for user editing
                                                                                        updateReturnQuantity(item.id, raw);
                                                                                    }}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="w-24 text-center"
                                                                                />
                                                                                {isPartialReturn && (
                                                                                    <span className="text-xs text-orange-600">
                                                                                        Partial
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">{item.unit_price}</TableCell>
                                                                    <TableCell className="text-right">{item.discount_amount}</TableCell>
                                                                    <TableCell className="text-right">{item.tax_amount}</TableCell>
                                                                    <TableCell className="text-right font-semibold">{item.total}</TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}


                            {/* Items List */}
                            {data.items.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Return Items ({data.items.length})</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                        <Table className="min-w-[700px]">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead className="text-right">Qty</TableHead>
                                                    <TableHead className="text-right">Price</TableHead>
                                                    <TableHead>Condition *</TableHead>
                                                    <TableHead>Notes</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.items.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <div className="font-medium">{item.item_name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.item_code}
                                                                {item.serial_number && ` | SN: ${item.serial_number}`}
                                                                {item.batch_no && ` | Batch: ${item.batch_no}`}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                                        <TableCell className="text-right">Rs. {item.unit_price.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={item.condition}
                                                                onValueChange={(val) => updateItemCondition(idx, val)}
                                                            >
                                                                <SelectTrigger className="w-full min-w-[150px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="good">
                                                                        <span className="flex items-center gap-2">
                                                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                                            Good (Add to Stock)
                                                                        </span>
                                                                    </SelectItem>
                                                                    <SelectItem value="damaged">
                                                                        <span className="flex items-center gap-2">
                                                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                                                            Damaged (No Stock)
                                                                        </span>
                                                                    </SelectItem>
                                                                    <SelectItem value="defective">
                                                                        <span className="flex items-center gap-2">
                                                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                                            Defective (No Stock)
                                                                        </span>
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.condition !== 'good' && (
                                                                <Input
                                                                    type="text"
                                                                    placeholder="Damage description"
                                                                    value={item.damage_notes || ''}
                                                                    onChange={(e) => updateDamageNotes(idx, e.target.value)}
                                                                    className="w-full min-w-[170px]"
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            Rs. {((item.quantity * item.unit_price) - item.discount_amount + item.tax_amount).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeItem(idx)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* ── Exchange Items ────────────────────────────────────────── */}
                            {data.refund_method === 'exchange' && (
                                <Card className="border-blue-200">
                                    <CardHeader>
                                        <CardTitle className="text-blue-700">
                                            Exchange Items
                                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                                (items given to customer as replacement)
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Exchange item search */}
                                        <div>
                                            <Label>Search Item to Give in Exchange</Label>
                                            <div className="flex flex-col sm:flex-row gap-2 relative">
                                                <Input
                                                    value={exchangeSearchQuery}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setExchangeSearchQuery(newVal);
                                                        // Auto-search as user types
                                                        if (newVal.length > 0) {
                                                            setExchangeSearchLoading(true);
                                                            // Simulate auto-search
                                                            const searchExchange = async () => {
                                                                try {
                                                                    const response = await axios.get(route('customer-returns.search-items'), {
                                                                        params: { search: newVal },
                                                                    });
                                                                    if (response.data) {
                                                                        setExchangeSearchResults(response.data);
                                                                    }
                                                                } catch (error: any) {
                                                                    // Silently ignore abort errors
                                                                    if (error.code === 'ECONNABORTED' || error.message === 'Request aborted') {
                                                                        return;
                                                                    }
                                                                    console.error('Auto-search failed:', error);
                                                                } finally {
                                                                    setExchangeSearchLoading(false);
                                                                }
                                                            };
                                                            searchExchange();
                                                        } else {
                                                            setExchangeSearchResults([]);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleExchangeSearch())}
                                                    placeholder="Search by code, name, or barcode"
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                />
                                                <Button type="button" onClick={handleExchangeSearch} disabled={exchangeSearchLoading} className="w-full sm:w-auto">
                                                    <Search className={`h-4 w-4 ${exchangeSearchLoading ? 'animate-spin' : ''}`} />
                                                    {exchangeSearchLoading ? 'Searching...' : 'Search'}
                                                </Button>

                                                {/* Dropdown results - positioned absolutely like ItemEntryForm */}
                                                {exchangeSearchQuery && exchangeSearchResults.length > 0 && (
                                                    <div className="absolute top-full mt-1 left-0 right-0 sm:right-auto sm:min-w-[600px] z-50 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-[70vh] overflow-y-auto">
                                                        {groupedExchangeResults.filter(item => {
                                                            // Only show items that have at least one batch with available stock
                                                            return item.batches && item.batches.some((b: any) => (b.stock ?? 0) > 0);
                                                        }).length > 0 ? (
                                                            <>
                                                                <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b">
                                                                    <div className="text-xs font-medium text-muted-foreground">
                                                                        {groupedExchangeResults.filter(item => 
                                                                            item.batches && item.batches.some((b: any) => (b.stock ?? 0) > 0)
                                                                        ).length} item(s) in stock — Click to select
                                                                    </div>
                                                                </div>
                                                                {groupedExchangeResults.map((item, idx) => {
                                                                    // Check if item has stock
                                                                    const hasStock = item.batches && item.batches.some((b: any) => (b.stock ?? 0) > 0);
                                                                    if (!hasStock) return null;
                                                                    
                                                                    // Calculate total available stock
                                                                    const totalStock = item.batches?.reduce((sum: number, b: any) => sum + (b.stock ?? 0), 0) || 0;
                                                                    
                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            className="p-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition-colors"
                                                                            onClick={() => selectExchangeItem(item)}
                                                                        >
                                                                            <div className="flex justify-between items-start">
                                                                                <div>
                                                                                    <div className="font-medium text-gray-900">{item.item_name}</div>
                                                                                    <div className="text-sm text-gray-600">
                                                                                        Code: <span className="font-mono">{item.item_code}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <div className="text-sm font-semibold text-gray-900">
                                                                                        Rs. {item.retail_price || 0}
                                                                                    </div>
                                                                                    <div className="text-xs text-green-600 font-medium">
                                                                                        ✓ {totalStock} in stock
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </>
                                                        ) : (
                                                            <div className="p-3 text-center text-gray-500 text-sm">
                                                                No items with available stock
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* No results message */}
                                                {exchangeSearchQuery && !exchangeSearchLoading && (
                                                    <>
                                                        {exchangeSearchResults.length === 0 && (
                                                            <div className="absolute top-full mt-1 left-0 right-0 sm:right-auto sm:min-w-[600px] z-50 bg-white border border-gray-200 rounded-lg shadow-2xl p-3">
                                                                <div className="text-center text-gray-500 text-sm">
                                                                    No items found. Try a different search.
                                                                </div>
                                                            </div>
                                                        )}
                                                        {exchangeSearchResults.length > 0 && !groupedExchangeResults.some(item => 
                                                            item.batches && item.batches.some((b: any) => (b.stock ?? 0) > 0)
                                                        ) && (
                                                            <div className="absolute top-full mt-1 left-0 right-0 sm:right-auto sm:min-w-[600px] z-50 bg-white border border-yellow-200 rounded-lg shadow-2xl p-3 bg-yellow-50">
                                                                <div className="text-center text-gray-600 text-sm">
                                                                    <div className="font-medium">No items with available stock</div>
                                                                    <div className="text-xs text-gray-500 mt-1">The search found items, but none have stock available.</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Selected exchange item form */}
                                        {currentExchangeItem.item_name && (
                                            <div className="space-y-3 border p-4 rounded-md bg-blue-50/50">
                                                <div className="font-medium">Selected: {currentExchangeItem.item_name}</div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    <div>
                                                        <Label>Quantity *</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            value={currentExchangeItem.quantity}
                                                            onChange={(e) => setCurrentExchangeItem({
                                                                ...currentExchangeItem,
                                                                quantity: parseFloat(e.target.value) || 0,
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Unit Price *</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={currentExchangeItem.unit_price}
                                                            onChange={(e) => setCurrentExchangeItem({
                                                                ...currentExchangeItem,
                                                                unit_price: parseFloat(e.target.value) || 0,
                                                            })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Batch No</Label>
                                                        {exchangeItemBatches.length > 0 ? (
                                                            <Select
                                                                value={currentExchangeItem.batch_no}
                                                                onValueChange={(val) => {
                                                                    const batch = exchangeItemBatches.find((b) => b.batch_no === val);
                                                                    setCurrentExchangeItem({
                                                                        ...currentExchangeItem,
                                                                        batch_no: val,
                                                                        unit_price:
                                                                            batch?.batch_price != null && batch.batch_price !== ''
                                                                                ? parseFloat(batch.batch_price)
                                                                                : currentExchangeItem.unit_price,
                                                                    });
                                                                }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select batch" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {exchangeItemBatches.map((b, i) => (
                                                                        <SelectItem key={i} value={b.batch_no || ''}>
                                                                            {b.batch_no || 'No Batch'}
                                                                            <span className="ml-2 text-muted-foreground text-xs">
                                                                                (Stock: {b.stock})
                                                                            </span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                value={currentExchangeItem.batch_no}
                                                                onChange={(e) => setCurrentExchangeItem({
                                                                    ...currentExchangeItem,
                                                                    batch_no: e.target.value,
                                                                })}
                                                                placeholder="e.g. B001"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={addExchangeItem}
                                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Add to Exchange List
                                                </Button>
                                            </div>
                                        )}

                                        {/* Exchange items table */}
                                        {data.exchange_items.length > 0 ? (
                                            <div className="overflow-x-auto">
                                            <Table className="min-w-[640px]">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Item</TableHead>
                                                        <TableHead className="text-right">Qty</TableHead>
                                                        <TableHead className="text-right">Price</TableHead>
                                                        <TableHead className="text-right">Total</TableHead>
                                                        <TableHead></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data.exchange_items.map((item, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div className="font-medium">{item.item_name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {item.item_code}{item.batch_no ? ` | Batch: ${item.batch_no}` : ''}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                                            <TableCell className="text-right">Rs. {Number(item.unit_price).toFixed(2)}</TableCell>
                                                            <TableCell className="text-right font-semibold">
                                                                Rs. {((item.quantity * item.unit_price) - (item.discount_amount || 0) + (item.tax_amount || 0)).toFixed(2)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeExchangeItem(idx)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No exchange items added yet — search above to add items.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                        </div>

                        {/* Summary Panel */}
                        <div>
                            <Card className="lg:sticky lg:top-6">
                                <CardHeader>
                                    <CardTitle>Return Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Total Items:</span>
                                            <span className="font-medium">{data.items.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Good Condition:</span>
                                            <span className="font-medium text-green-600">
                                                {data.items.filter(i => i.condition === 'good').length}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Damaged/Defective:</span>
                                            <span className="font-medium text-red-600">
                                                {data.items.filter(i => i.condition !== 'good').length}
                                            </span>
                                        </div>
                                        <div className="h-px bg-border my-2"></div>

                                        {data.refund_method === 'exchange' ? (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span>Return Value:</span>
                                                    <span className="font-medium">Rs. {calculatedTotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-blue-700">
                                                    <span>Exchange Value:</span>
                                                    <span className="font-medium">Rs. {calculatedExchangeTotal.toFixed(2)}</span>
                                                </div>
                                                <div className="h-px bg-border my-1"></div>
                                                {calculatedExchangeTotal === calculatedTotal ? (
                                                    <div className="flex justify-between text-sm font-semibold text-green-600">
                                                        <span>Net:</span>
                                                        <span>Equal exchange ✓</span>
                                                    </div>
                                                ) : calculatedTotal > calculatedExchangeTotal ? (
                                                    <div className="flex justify-between text-sm font-semibold text-orange-600">
                                                        <span>Adjustment due:</span>
                                                        <span>Rs. {(calculatedTotal - calculatedExchangeTotal).toFixed(2)} (credit)</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-between text-sm font-semibold text-red-600">
                                                        <span>Adjustment due:</span>
                                                        <span>Rs. {(calculatedExchangeTotal - calculatedTotal).toFixed(2)} (additional)</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Return Value:</span>
                                                    <span className="font-medium">Rs. {calculatedTotal.toFixed(2)}</span>
                                                </div>
                                                {data.refund_method === 'cash' && invoiceData && invoiceData.paid_amount !== undefined && (
                                                    <div className="flex justify-between text-sm text-muted-foreground">
                                                        <span>Customer Paid:</span>
                                                        <span>Rs. {parseFloat(invoiceData.paid_amount).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="h-px bg-border my-1"></div>
                                                <div className="flex justify-between items-center font-bold text-lg">
                                                    <span>Total Refund Amount:</span>
                                                    <div className="flex items-center gap-2">
                                                        <span>Rs.</span>
                                                        <Input 
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={data.refund_amount}
                                                            onChange={(e) => setData('refund_amount', parseFloat(e.target.value) || 0)}
                                                            className="w-32 text-right font-bold text-green-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>



                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={processing || data.items.length === 0}
                                    >
                                        Process Return
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </div>
        </AppSidebarLayout>
    );
}
