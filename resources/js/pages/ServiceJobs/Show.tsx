// resources/js/Pages/ServiceJobs/Show.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { BreadcrumbItem, ServiceJob, ServiceJobItem, ServiceJobStatus, Technician, ServiceCharge, PageProps, CustomerPayment } from '@/types';
import { 
    Wrench, 
    User, 
    Smartphone, 
    Calendar, 
    DollarSign, 
    Package,
    Plus,
    Save,
    CheckCircle,
    Clock,
    AlertCircle,
    ArrowLeft,
    FileText,
    CreditCard,
    Tag,
    Receipt,
    Trash2,
    Eye,
    Printer,
    Image as ImageIcon,
    MessageSquare,
    Send,
    X,
} from 'lucide-react';

interface ItemMaster {
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    SlsPri: string | number;
    Unit: string;
    BarCode: string;
    serial_number?: string;
    brand?: string;
    model?: string;
    batch_no?: string; // from purchase_det rows
    source: 'itemmaster' | 'purchase_det';
    purchase_det_ky?: string;
    vat_inclusive?: boolean;
    // when search results include batch info (added for parts dropdown)
    batches?: Array<{ batch_no: string | null; qty: number; sale_price?: string | number | null }>;
    // unit conversion
    transfer_conversion_factor?: number;
    from_unit_name?: string | null;
    to_unit_name?: string | null;
    bundle_stock?: number;
    nos_stock?: number;
    CredQty1?: number | null;
    CredDis1?: string | number | null;
    CredQty2?: number | null;
    CredDis2?: string | number | null;
}

interface QuotationItem {
    id?: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    item_type: 'part' | 'service_charge';
}

interface ShowProps extends PageProps {
    job: ServiceJob & {
        items?: ServiceJobItem[];
        statusHistory?: (ServiceJobStatus & { changedBy?: { first_name: string; last_name: string } })[];
        technician?: Technician;
        customer?: {
            AccKy: string;
            AccNm: string;
            AccCd?: string;
            AdrCd?: string;
            addresses?: Array<{
                AdrKy: number;
                Address: string;
                City?: string;
                Town?: string;
                Country?: string;
                TP1?: string;
                TP2?: string;
                TP3?: string;
                Email?: string;
                CtPerson?: string;
            }>;
        };
        createdBy?: { first_name: string; last_name: string };
        payments?: CustomerPayment[];
        quotations?: Array<{
            id: number;
            total_amount: string;
            notes: string | null;
            created_at: string;
            created_by?: {
                first_name: string;
                last_name: string;
            };
            items?: QuotationItem[];
        }>;
        photos?: Array<{ id: number; photo_path: string; original_name: string; url?: string }>;
        messages?: Array<{ id: number; message: string; created_at: string; sender?: { first_name: string; last_name: string } }>;
    };
    technicians: Technician[];
    serviceCharges: ServiceCharge[];
}

const Show: React.FC<ShowProps> = ({ job, technicians, serviceCharges, auth }) => {
    const roleLevel = String((auth?.user as any)?.role?.level ?? '').toLowerCase();
    const roleSlug = String((auth?.user as any)?.role?.slug ?? '').toLowerCase();
    const isTechnicianUser = roleLevel === 'technician' || roleSlug.includes('technician');
    const isCashierUser = roleLevel === 'cashier' || roleSlug === 'cashier' || roleSlug.endsWith('_cashier');
    const [addingItem, setAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        item_type: (isTechnicianUser ? 'service_charge' : 'part') as 'part' | 'service_charge' | 'other',
        ItmKy: '',
        item_name: '',
        batch_no: '',
        serial_number: '',
        brand: '',
        model: '',
        quantity: 1,
        unit_price: 0,
        discount_amount: 0,
        base_price: 0,
        description: '',
        vat_inclusive: false,
        source: '' as 'itemmaster' | 'purchase_det' | '',
    });
    
    // Store the raw item master to recalculate tiers dynamically
    const [selectedItemMaster, setSelectedItemMaster] = useState<ItemMaster | null>(null);
    
    // Batch handling for parts
    const [batches, setBatches] = useState<Array<{batch_no: string | null; available_quantity: number; sale_price?: string | number | null}>>([]);
    const [selectedBatch, setSelectedBatch] = useState<{batch_no: string | null; available_quantity: number; sale_price?: string | number | null} | null>(null);
    const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
    const batchDropdownRef = useRef<HTMLDivElement>(null);

    const [addingPayment, setAddingPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<string>('');

    const statusFormRef = useRef<HTMLFormElement>(null);

    // Auto-calculate tier discounts when quantity or base_price changes
    useEffect(() => {
        console.log("Tier discount effect triggered", {
            item_type: newItem.item_type,
            hasSelectedItemMaster: !!selectedItemMaster,
            qty: newItem.quantity,
            base_price: newItem.base_price,
            selectedItemMaster
        });

        if (newItem.item_type === 'part' && selectedItemMaster) {
            let unitDiscount = 0;
            const qty = newItem.quantity;
            
            const q1 = typeof selectedItemMaster.CredQty1 === 'string' ? parseFloat(selectedItemMaster.CredQty1) : (selectedItemMaster.CredQty1 || 0);
            const d1 = typeof selectedItemMaster.CredDis1 === 'string' ? parseFloat(selectedItemMaster.CredDis1) : (selectedItemMaster.CredDis1 || 0);
            const q2 = typeof selectedItemMaster.CredQty2 === 'string' ? parseFloat(selectedItemMaster.CredQty2) : (selectedItemMaster.CredQty2 || 0);
            const d2 = typeof selectedItemMaster.CredDis2 === 'string' ? parseFloat(selectedItemMaster.CredDis2) : (selectedItemMaster.CredDis2 || 0);

            console.log("Tier config:", { q1, d1, q2, d2, currentQty: qty });

            // Find highest matching tier
            if (q2 > 0 && qty >= q2 && d2 > 0) {
                unitDiscount = d2;
                console.log("Matched tier 2:", unitDiscount);
            } else if (q1 > 0 && qty >= q1 && d1 > 0) {
                unitDiscount = d1;
                console.log("Matched tier 1:", unitDiscount);
            }

            setNewItem(prev => ({
                ...prev,
                discount_amount: unitDiscount,
                unit_price: Math.max(0, prev.base_price - unitDiscount)
            }));
            console.log("Applied discount:", unitDiscount, "New Unit Price:", Math.max(0, newItem.base_price - unitDiscount));
        }
    }, [newItem.quantity, newItem.base_price, selectedItemMaster]);

    // Item search states
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState<ItemMaster[]>([]);
    const [showItemSearch, setShowItemSearch] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [itemSearchTimeout, setItemSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [itemStockInfo, setItemStockInfo] = useState<{ [key: string]: number }>({});
    const [loadingStockForItems, setLoadingStockForItems] = useState<Set<string>>(new Set());
    
    const itemSearchRef = useRef<HTMLDivElement>(null);

    // Unit conversion selection
    const [unitSelectionPendingItem, setUnitSelectionPendingItem] = useState<ItemMaster | null>(null);
    const [isUnitSelectionOpen, setIsUnitSelectionOpen] = useState(false);
    const [unitSelectionFocus, setUnitSelectionFocus] = useState<'bundle' | 'nos'>('bundle');

    useEffect(() => {
        if (!isUnitSelectionOpen) return;
        setUnitSelectionFocus('bundle');
        let cleanup: (() => void) | undefined;
        const timer = setTimeout(() => {
            const handleKey = (e: KeyboardEvent) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    setUnitSelectionFocus(prev => prev === 'bundle' ? 'nos' : 'bundle');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    setUnitSelectionFocus(prev => { confirmUnitSelection(prev); return prev; });
                } else if (e.key === 'Escape') {
                    setIsUnitSelectionOpen(false);
                    setUnitSelectionPendingItem(null);
                }
            };
            window.addEventListener('keydown', handleKey);
            cleanup = () => window.removeEventListener('keydown', handleKey);
        }, 50);
        return () => { clearTimeout(timer); cleanup?.(); };
    }, [isUnitSelectionOpen]);

    const confirmUnitSelection = (unitType: 'bundle' | 'nos') => {
        if (!unitSelectionPendingItem) return;
        const item = unitSelectionPendingItem;
        const factor = item.transfer_conversion_factor ?? 1;
        let basePrice = 0;
        if (typeof item.SlsPri === 'string') basePrice = parseFloat(item.SlsPri) || 0;
        else if (typeof item.SlsPri === 'number') basePrice = item.SlsPri;

        // Apply discount if present (treated as a flat fixed amount in Rs)
        let originalDiscount = 0;
        if (item.CredDis1) {
            originalDiscount = typeof item.CredDis1 === 'string' ? parseFloat(item.CredDis1) : item.CredDis1;
            if (originalDiscount > 0) {
                basePrice = Math.max(0, basePrice - originalDiscount);
            }
        }

        const price = unitType === 'nos' ? +(basePrice / factor).toFixed(4) : basePrice;
        const unitDiscount = unitType === 'nos' ? +(originalDiscount / factor).toFixed(4) : originalDiscount;
        const unitLabel = unitType === 'nos'
            ? (item.to_unit_name ?? item.Unit)
            : (item.from_unit_name ?? item.Unit);

        setIsUnitSelectionOpen(false);
        setUnitSelectionPendingItem(null);

        setNewItem(prev => ({
            ...prev,
            item_type: 'part',
            ItmKy: item.ItmKy || '',
            item_name: item.ItmNm || item.ItemCode,
            serial_number: '',
            brand: '',
            model: '',
            batch_no: item.batches?.[0]?.batch_no || '',
            unit_price: price,
            base_price: price,
            discount_amount: 0, // Effect will compute this
            description: unitLabel ? `Unit: ${unitLabel}` : '',
            vat_inclusive: item.vat_inclusive || false,
            source: item.source,
        }));
        setSelectedItemMaster(item);
        setItemSearchQuery(item.ItmNm || item.ItemCode);
        setShowItemSearch(false);
        setItemSearchResults([]);

        if (item.ItmKy && item.source === 'itemmaster') {
            const sectionCode = auth.user?.section_code || 'VIS-SEC-002';
            fetch(`/wastages/product-batches?product_id=${encodeURIComponent(item.ItmKy)}&section_code=${encodeURIComponent(sectionCode)}`)
                .then(resp => resp.ok ? resp.json() : [])
                .then((data: Array<any>) => {
                    setBatches(data);
                    if (data.length === 1) {
                        setSelectedBatch(data[0]);
                        setNewItem(p => ({ ...p, batch_no: data[0].batch_no || '' }));
                    } else {
                        setSelectedBatch(null);
                    }
                })
                .catch(() => { setBatches([]); setSelectedBatch(null); });
        }
    };

    const { data: statusData, setData: setStatusData, post: updateStatus } = useForm({
        status: job.status,
        notes: job.technician_notes || '',
        assigned_technician_id: job.assigned_technician_id || '',
    });

    const { data: photoData, setData: setPhotoData, post: uploadPhotos, processing: uploadingPhotos, progress, reset: resetPhotoForm } = useForm<{ photos: File[] }>({
        photos: []
    });

    const { data: messageData, setData: setMessageData, post: sendMessage, processing: sendingMessage, reset: resetMessageForm } = useForm({
        message: ''
    });

    const handlePhotoUpload = (e: React.FormEvent) => {
        e.preventDefault();
        uploadPhotos(`/service-jobs/${job.id}/upload-photos`, {
            preserveScroll: true,
            onSuccess: () => resetPhotoForm(),
        });
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(`/service-jobs/${job.id}/send-message`, {
            preserveScroll: true,
            onSuccess: () => resetMessageForm(),
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Service Jobs'),
            href: '/service-jobs',
        },
        {
            title: `${job.job_number}`,
            href: '#',
        },
    ];

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            assigned: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-purple-100 text-purple-800',
            waiting_for_parts: 'bg-orange-100 text-orange-800',
            quotation_received: 'bg-indigo-100 text-indigo-800',
            quotation_approved: 'bg-cyan-100 text-cyan-800',
            completed: 'bg-green-100 text-green-800',
            delivered: 'bg-teal-100 text-teal-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Pending',
            assigned: 'Assigned',
            in_progress: 'In Progress',
            waiting_for_parts: 'Waiting for Parts',
            quotation_received: 'Quotation Generated',
            quotation_rejected: 'Quotation Rejected',
            quotation_approved: 'Quotation Approved',
            completed: 'Completed',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
        };
        return labels[status] || status.replace('_', ' ');
    };

    const allowedStatusKeys = isCashierUser
        ? [
            'delivered',
            'cancelled',
        ]
        : isTechnicianUser
            ? ['pending', 'assigned', 'in_progress', 'quotation_received', 'quotation_rejected', 'quotation_approved', 'waiting_for_parts', 'completed']
            : ['pending', 'assigned', 'in_progress', 'quotation_received', 'quotation_rejected', 'quotation_approved', 'waiting_for_parts', 'completed', 'delivered', 'cancelled'];

    const statusOptions = allowedStatusKeys.includes(job.status)
        ? allowedStatusKeys
        : [job.status, ...allowedStatusKeys];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return CheckCircle;
            case 'in_progress': return Clock;
            case 'pending': return AlertCircle;
            default: return Clock;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount: string | number): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rs ${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const calculateTotals = () => {
        const partsTotal = (job.items || [])
            .filter(item => item.item_type === 'part')
            .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const serviceTotal = (job.items || [])
            .filter(item => item.item_type === 'service_charge')
            .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const subtotal = partsTotal + serviceTotal;
        const advancedPayment = parseFloat(job.advanced_payment?.toString() || '0');
        const paidAmount = parseFloat(job.paid_amount?.toString() || '0');
        const netTotal = subtotal - advancedPayment;
        const balance = job.balance_amount !== null ? parseFloat(job.balance_amount.toString()) : netTotal - paidAmount;
        
        return { partsTotal, serviceTotal, subtotal, advancedPayment, paidAmount, netTotal, balance };
    };

    // Search items from itemmaster table
    const searchItems = async (searchTerm: string) => {
        if (searchTerm.length <= 1) {
            setItemSearchResults([]);
            setShowItemSearch(false);
            return;
        }

        setIsSearching(true);

        try {
            const primaryUrl = `/service-jobs/search/items?search=${encodeURIComponent(searchTerm)}`;
            const resp = await fetch(primaryUrl);

            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }

            const results: ItemMaster[] = await resp.json();
            // normally we hide purchase rows, but if the user has scanned a serial
            // we still want to surface the matching purchase_det entry so they can
            // add that specific device.  The backend already includes `serial_number`
            // on purchase results.
            const filtered = results.filter(r => {
                if (r.source === 'itemmaster') {
                    return true;
                }
                if (r.source === 'purchase_det' && r.serial_number) {
                    // show only when the query exactly equals the serial
                    return r.serial_number === searchTerm;
                }
                return false;
            });
            setItemSearchResults(filtered);
            setShowItemSearch(filtered.length > 0);
            
            // Fetch stock info for each search result (only itemmaster items)
            // Always use Shop section (VIS-SEC-002) for parts availability, not user's current section
            const serviceSectionCode = 'VIS-SEC-002';
            filtered.forEach(item => {
                if (item.source === 'itemmaster' && item.ItmKy) {
                    fetchItemStockInService(item.ItmKy, serviceSectionCode);
                }
            });
        } catch (primaryError) {
            console.error('Item search error:', primaryError);
            setItemSearchResults([]);
            setShowItemSearch(false);
        } finally {
            setIsSearching(false);
        }
    };

    // Fetch stock availability for an item in the service section
    const fetchItemStockInService = async (itemId: string, sectionCode: string) => {
        if (!itemId || loadingStockForItems.has(itemId)) {
            return;
        }

        setLoadingStockForItems(prev => new Set(prev).add(itemId));
        try {
            const response = await fetch(
                `/wastages/product-batches?product_id=${encodeURIComponent(itemId)}&section_code=${encodeURIComponent(sectionCode)}`
            );
            
            if (response.ok) {
                const batches = await response.json();
                const totalStock = batches.reduce((sum: number, batch: any) => 
                    sum + (batch.available_quantity || 0), 0
                );
                setItemStockInfo(prev => ({
                    ...prev,
                    [itemId]: totalStock
                }));
            } else {
                setItemStockInfo(prev => ({
                    ...prev,
                    [itemId]: 0
                }));
            }
        } catch (error) {
            console.error(`Error fetching stock for item ${itemId}:`, error);
            setItemStockInfo(prev => ({
                ...prev,
                [itemId]: 0
            }));
        } finally {
            setLoadingStockForItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }
    };

    const handleItemSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        
        setNewItem(prev => ({ ...prev, item_name: value, batch_no: '', ItmKy: '', serial_number: '', brand: '', model: '' }));
        setItemSearchQuery(value);
        // clear previously loaded batches since name changed
        setBatches([]);
        setSelectedBatch(null);
        setIsBatchDropdownOpen(false);
        
        // Clear existing timeout
        if (itemSearchTimeout) {
            clearTimeout(itemSearchTimeout);
        }
        
        // Set new timeout for debounced search
        const timeout = setTimeout(() => {
            if (value.trim().length > 1 && newItem.item_type === 'part') {
                searchItems(value);
            } else {
                setItemSearchResults([]);
                setShowItemSearch(false);
            }
        }, 500);
        
        setItemSearchTimeout(timeout);
    };

    const selectItem = (item: ItemMaster) => {
        // If item has a unit conversion factor, show unit selection modal first
        if ((item.transfer_conversion_factor ?? 1) > 1 && item.to_unit_name) {
            setUnitSelectionPendingItem(item);
            setIsUnitSelectionOpen(true);
            setItemSearchResults([]);
            setShowItemSearch(false);
            return;
        }

        // Parse the sales price safely
        let unitPrice = 0;
        if (typeof item.SlsPri === 'string') {
            unitPrice = parseFloat(item.SlsPri);
        } else if (typeof item.SlsPri === 'number') {
            unitPrice = item.SlsPri;
        }

        // Build item description with source info
        let description = '';
        if (item.source === 'purchase_det') {
            const parts = [];
            if (item.serial_number) parts.push(`SN: ${item.serial_number}`);
            if (item.brand) parts.push(`Brand: ${item.brand}`);
            if (item.model) parts.push(`Model: ${item.model}`);
            description = parts.join(' | ');
        }
        
        setNewItem({
            ...newItem,
            item_type: 'part',
            ItmKy: item.ItmKy || '',
            item_name: item.ItmNm || item.ItemCode,
            serial_number: item.serial_number || '',
            brand: item.brand || '',
            model: item.model || '',
            batch_no: item.batch_no || '',
            unit_price: unitPrice,
            base_price: unitPrice, // Set base price for dynamic calculation
            discount_amount: 0, // Effect will calculate this
            description: description,
            vat_inclusive: item.vat_inclusive || false,
            source: item.source,
        });
        setSelectedItemMaster(item);
        setItemSearchQuery(item.ItmNm || item.ItemCode);
        setShowItemSearch(false);
        setItemSearchResults([]);

        // load batch options for this item (only for stock items)
        if (item.ItmKy && item.source === 'itemmaster') {
            // Always query Shop section (VIS-SEC-002) for available batches, not user's current section
            const serviceSectionCode = 'VIS-SEC-002';
            
            const url = `/wastages/product-batches?product_id=${encodeURIComponent(item.ItmKy)}&section_code=${encodeURIComponent(serviceSectionCode)}`;
            fetch(url)
                .then(resp => resp.ok ? resp.json() : [])
                .then((data: Array<any>) => {
                    console.log('Received batches from server:', {
                        sectionCode: serviceSectionCode,
                        batchCount: data.length,
                        batches: data,
                    });
                    setBatches(data);
                    if (data.length === 1) {
                        setSelectedBatch(data[0]);
                        setNewItem(prev => ({ 
                            ...prev, 
                            batch_no: data[0].batch_no || '',
                            ...(data[0].sale_price !== undefined && data[0].sale_price !== null && { 
                                base_price: typeof data[0].sale_price === 'string' ? parseFloat(data[0].sale_price) : data[0].sale_price 
                            })
                        }));
                    } else {
                        setSelectedBatch(null);
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch batches', err);
                    setBatches([]);
                    setSelectedBatch(null);
                });
        } else {
            // if not stock item (probably from purchase record), just clear previous batches
            setBatches([]);
            setSelectedBatch(null);
        }
    };

    const handleAddItem = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        
        const formData = new FormData();
        formData.append('item_type', newItem.item_type);
        
        // Include ItmKy for parts (required for stock deduction)
        if (newItem.ItmKy) {
            formData.append('ItmKy', newItem.ItmKy);
        }
        
        // include batch number if set
        if (newItem.batch_no) {
            formData.append('batch_no', newItem.batch_no);
        }
        
        // Include printer metadata for proper stock tracking
        if (newItem.serial_number) {
            formData.append('serial_number', newItem.serial_number);
        }
        if (newItem.brand) {
            formData.append('brand', newItem.brand);
        }
        if (newItem.model) {
            formData.append('model', newItem.model);
        }
        
        // For service charges, use "Service Charge" as default item name if not provided
        const itemName = newItem.item_type === 'service_charge' 
            ? (newItem.item_name || 'Service Charge')
            : newItem.item_name;
        formData.append('item_name', itemName);
        
        // For service charges, always use quantity 1
        const quantity = newItem.item_type === 'service_charge' ? 1 : newItem.quantity;
        formData.append('quantity', quantity.toString());
        
        formData.append('unit_price', newItem.unit_price.toString());
        if (newItem.discount_amount) {
            formData.append('discount_amount', newItem.discount_amount.toString());
        }
        if (newItem.description) {
            formData.append('description', newItem.description);
        }
        formData.append('vat_inclusive', newItem.vat_inclusive ? '1' : '0');
        if (newItem.source) {
            formData.append('source', newItem.source);
        }
        
        await router.post(`/service-jobs/${job.id}/add-item`, formData, {
            forceFormData: true
        });
        
        setAddingItem(false);
        setNewItem({
            item_type: 'part',
            ItmKy: '',
            item_name: '',
            batch_no: '',
            serial_number: '',
            brand: '',
            model: '',
            quantity: 1,
            unit_price: 0,
            base_price: 0,
            discount_amount: 0,
            description: '',
            vat_inclusive: false,
            source: '',
        });
        setSelectedItemMaster(null);
        // Reset batch states
        setBatches([]);
        setSelectedBatch(null);
        setIsBatchDropdownOpen(false);
        // Reset search states
        setItemSearchQuery('');
        setItemSearchResults([]);
        setShowItemSearch(false);
        setIsSearching(false);
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Use the dedicated customer payment creation endpoint
        router.post('/admin/customer-payments', {
            AccKy: job.AccKy,
            amount: parseFloat(paymentAmount),
            service_job_id: job.id,
            TrnDt: new Date().toISOString().split('T')[0],
            method: 'cash', // Default method, can be changed if needed
            notes: `Payment for Job ID ${job.job_number}`,
        }, {
            onSuccess: () => {
                setAddingPayment(false);
                setPaymentAmount('');
                // Inertia should automatically reload the job data with the updated balance
            }
        });
    };

    // Bottom button just triggers the status update form. Parts are added via the
    // inline "Add" button, which already posts to the server and updates stock.
    const handleSaveChanges = () => {
        statusFormRef.current?.requestSubmit();
    };

    const handleStatusUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateStatus(`/service-jobs/${job.id}/update-status`, {
            forceFormData: false,
            preserveScroll: true,
            preserveState: true,
        });
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showItemSearch && itemSearchRef.current && 
                !itemSearchRef.current.contains(e.target as Node)) {
                setShowItemSearch(false);
            }
            if (isBatchDropdownOpen && batchDropdownRef.current &&
                !batchDropdownRef.current.contains(e.target as Node)) {
                setIsBatchDropdownOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showItemSearch, isBatchDropdownOpen]);

    // If the show page was opened with ?print=1, auto-open the printable receipt
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('print') === '1') {
                const receiptUrl = `/service-jobs/${job.id}/receipt`;
                window.location.href = receiptUrl;
                
            }
        } catch (err) {
            console.error('Auto-open receipt failed:', err);
        }
    }, []);

    // If a new job was just created and requested an estimate, open estimate create page
    useEffect(() => {
        try {
            if (sessionStorage.getItem('openEstimateAfterCreate') === 'true') {
                sessionStorage.removeItem('openEstimateAfterCreate');
                // leave prefill in sessionStorage as `estimatePrefill`
                const url = `/estimates/create?service_job_id=${job.id}`;
                window.location.href = url;
                
            }
        } catch (err) {
            console.error('Auto-open estimate failed:', err);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showItemSearch && itemSearchRef.current && 
                !itemSearchRef.current.contains(e.target as Node)) {
                setShowItemSearch(false);
            }
            if (isBatchDropdownOpen && batchDropdownRef.current &&
                !batchDropdownRef.current.contains(e.target as Node)) {
                setIsBatchDropdownOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showItemSearch, isBatchDropdownOpen]);

    const totals = calculateTotals();
    const StatusIcon = getStatusIcon(job.status);

    return (
        <>
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Service Job')}: ${job.job_number}`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start space-x-2 sm:items-center">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title={t('Go Back')}
                                >
                                    <ArrowLeft className="h-4 w-4 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2">
                                    <Wrench className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg font-bold text-white sm:text-xl">
                                        {t('Service Job')}: {job.job_number}
                                    </h1>
                                    {job.invoice_number && (
                                        <p className="truncate text-sm font-medium text-white/90">
                                            {t('Invoice No')}: {job.invoice_number}
                                        </p>
                                    )}
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('View and manage service job details')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium sm:text-sm ${getStatusColor(job.status)}`}>
                                    <StatusIcon className="mr-1 h-4 w-4" />
                                    {t(getStatusLabel(job.status))}
                                </span>
                                <button
                                    onClick={() => router.visit(`/service-jobs/${job.id}/quotations/create`)}
                                    className="inline-flex items-center rounded-xl bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-vismass-blue transition-all hover:bg-slate-100 hover:shadow-lg"
                                >
                                    <Tag className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('Create Quotation')}</span>
                                </button>
                                {/* <button
                                    onClick={() => router.visit(`/service-jobs/${job.id}/invoice`)}
                                    className="inline-flex items-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white transition-all hover:bg-vismass-blue/90 hover:shadow-lg"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t('Print Invoice')}
                                </button> */}
                                <button
                                    onClick={() => window.location.href = `/service-jobs/${job.id}/receipt`}
                                    className="inline-flex items-center rounded-xl bg-vismass-grey px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white transition-all hover:bg-vismass-grey/90 hover:shadow-lg"
                                >
                                    <Receipt className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('Print Receipt')}</span>
                                </button>
                               
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            <div className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Parts Total')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {formatCurrency(totals.partsTotal)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2 shadow">
                                        <Wrench className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Service Charges')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {formatCurrency(totals.serviceTotal)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow">
                                        <CreditCard className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Advanced Payment')}</p>
                                        <p className="text-sm font-bold text-red-600 truncate">
                                            {formatCurrency(-totals.advancedPayment)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-emerald-600 p-2 shadow">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Net Total')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {formatCurrency(totals.netTotal)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-xl bg-white p-3 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-600 p-2 shadow">
                                        <AlertCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Balance')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {formatCurrency(totals.netTotal - parseFloat(job.paid_amount?.toString() || '0'))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Main Details */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Customer Information Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center">
                                                <User className="mr-2 h-4 w-4 text-white" />
                                                <h3 className="text-base font-semibold text-white">
                                                    {t('Customer Information')}
                                                </h3>
                                            </div>
                                            {/* <button
                                                onClick={() => window.location.href = `/service-jobs/${job.id}/receipt`}
                                                className="inline-flex items-center text-xs font-medium text-white transition-colors hover:text-white/80"
                                            >
                                                <Receipt className="mr-1 h-3 w-3" />
                                                {t('Print Job Receipt')}
                                            </button> */}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Customer Name')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">
                                                    {job.customer?.AccNm || job.customer_name || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Phone Number')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium flex items-center">
                                                    <Smartphone className="mr-1 h-3 w-3 text-gray-400" />
                                                    {job.customer?.addresses?.[0]?.TP1 || job.customer?.addresses?.[0]?.TP2 || job.customer_phone || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Email Address')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">
                                                    {job.customer?.addresses?.[0]?.Email || job.customer_email || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Address')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">
                                                    {job.customer?.addresses?.[0]?.Address || job.customer_address || '-'}
                                                </p>
                                            </div>
                                            {(job.customer?.AccCd || job.customer?.AdrCd || job.AccKy) && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                        {t('Customer Code')}
                                                    </label>
                                                    <p className="text-sm text-gray-900 font-medium">
                                                        {job.customer?.AccCd || job.customer?.AdrCd || job.AccKy}
                                                    </p>
                                                </div>
                                            )}
                                            {job.invoice_number && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                        {t('Invoice Number')}
                                                    </label>
                                                    <p className="text-sm text-gray-900 font-medium">{job.invoice_number}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Device Information Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center">
                                                <Smartphone className="mr-2 h-4 w-4 text-white" />
                                                <h3 className="text-base font-semibold text-white">
                                                    {t('Device Information')}
                                                </h3>
                                            </div>
                                            {/* <button
                                                onClick={() => window.location.href = `/service-jobs/${job.id}/receipt`}
                                                className="inline-flex items-center text-xs font-medium text-white transition-colors hover:text-white/80"
                                            >
                                                <Receipt className="mr-1 h-3 w-3" />
                                                {t('Print Job Receipt')}
                                            </button> */}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Device Name')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">{(job.device_brand || '-') + ' ' + (job.device_model || job.device_name || '-')}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Device Model')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">{job.device_model || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Brand')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">{job.device_brand || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Serial Number')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">{job.device_serial || '-'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="block text-xs font-medium text-gray-500 mb-2">
                                                {t('Problem Description')}
                                            </label>
                                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                                <p className="text-sm text-gray-900 whitespace-pre-line">{job.problem_description}</p>
                                            </div>
                                        </div>

                                        {/* Quotations Section */}
                                        {job.quotations && job.quotations.length > 0 && (
                                            <div className="mb-4">
                                                <label className="block text-xs font-medium text-gray-500 mb-2">
                                                    {t('Quotations')}
                                                </label>
                                                <div className="space-y-2">
                                                    {job.quotations.map((quotation) => (
                                                        <div key={quotation.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center space-x-2">
                                                                    <Tag className="h-4 w-4 text-blue-600" />
                                                                    <span className="text-sm font-semibold text-blue-900">
                                                                        {t('Quotation')} #{quotation.id}
                                                                    </span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-bold text-blue-900">
                                                                        {formatCurrency(quotation.total_amount)}
                                                                    </p>
                                                                    <p className="text-xs text-blue-600">
                                                                        {formatDate(quotation.created_at)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {quotation.created_by && (
                                                                <div className="flex items-center text-xs text-blue-700 mb-1">
                                                                    <User className="h-3 w-3 mr-1" />
                                                                    {t('Created by')}: {quotation.created_by.first_name} {quotation.created_by.last_name}
                                                                </div>
                                                            )}
                                                            {quotation.notes && (
                                                                <div className="text-xs text-blue-800 bg-white/50 rounded-lg p-2 mt-2">
                                                                    <strong>{t('Notes')}:</strong> {quotation.notes}
                                                                </div>
                                                            )}
                                                            {quotation.items && quotation.items.length > 0 && (
                                                                <div className="mt-2">
                                                                    {quotation.items.some(item => item.item_type === 'part') && (
                                                                        <div className="mb-2">
                                                                            <p className="text-xs font-medium text-blue-800 mb-1">{t('Parts')}:</p>
                                                                            <div className="space-y-1">
                                                                                {quotation.items.filter(item => item.item_type === 'part').map((item, index) => (
                                                                                    <div key={`part-${index}`} className="text-xs text-blue-700 bg-white/30 rounded p-1 flex justify-between">
                                                                                        <span>{item.item_name} (Qty = {item.quantity})</span>
                                                                                        <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {quotation.items.some(item => item.item_type === 'service_charge') && (
                                                                        <div>
                                                                            <p className="text-xs font-medium text-blue-800 mb-1">{t('Service Charges')}:</p>
                                                                            <div className="space-y-1">
                                                                                {quotation.items.filter(item => item.item_type === 'service_charge').map((item, index) => (
                                                                                    <div key={`service-${index}`} className="text-xs text-green-700 bg-green-50/30 rounded p-1 flex justify-between">
                                                                                        <span>{item.item_name}</span>
                                                                                        <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex justify-end mt-2">
                                                                <Link
                                                                    href={`/quotations/${quotation.id}`}
                                                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                                >
                                                                    <Eye className="mr-1 h-3 w-3" />
                                                                    {t('View Details')}
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                    </div>
                                </div>

                                {/* Parts & Charges Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center">
                                                <Package className="mr-2 h-4 w-4 text-white" />
                                                <h3 className="text-base font-semibold text-white">
                                                    {t('Parts & Service Charges')}
                                                </h3>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => window.location.href = `/service-jobs/${job.id}/parts-receipt`}
                                                    className="inline-flex items-center text-xs font-medium text-white hover:text-white/80"
                                                >
                                                    <Printer className="mr-1 h-3 w-3" />
                                                    {t('Print Parts Receipt')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => window.location.href = `/service-jobs/${job.id}/invoice`}
                                                    className="inline-flex items-center text-xs font-medium text-white hover:text-white/80"
                                                >
                                                    <FileText className="mr-1 h-3 w-3" />
                                                    {t('Generate Bill')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddingItem(true)}
                                                    className="inline-flex items-center text-xs font-medium text-white hover:text-white/80"
                                                >
                                                    <Plus className="mr-1 h-3 w-3" />
                                                    {t('Add Item')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4">
                                        {addingItem && (
                                            <div className="mb-4 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                                <h4 className="font-medium text-sm text-gray-700 mb-2">{t('Add New Item')}</h4>
                                                <form onSubmit={handleAddItem} className="space-y-2">
                                                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-5">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                {t('Type')}
                                                            </label>
                                                            <select
                                                                value={newItem.item_type}
                                                                onChange={e => {
                                                                    const newType = e.target.value as any;
                                                                    const updates: any = { item_type: newType };
                                                                    
                                                                    // Reset search states when changing type
                                                                    if (newType !== 'part') {
                                                                        setItemSearchQuery('');
                                                                        setItemSearchResults([]);
                                                                        setShowItemSearch(false);
                                                                        setIsSearching(false);
                                                                    }
                                                                    
                                                                    // Clear item name when switching to service charge
                                                                    if (newType === 'service_charge') {
                                                                        updates.item_name = '';
                                                                    }
                                                                    // clear batch info and ItmKy if not part
                                                                    if (newType !== 'part') {
                                                                        setBatches([]);
                                                                        setSelectedBatch(null);
                                                                        updates.batch_no = '';
                                                                        updates.ItmKy = '';
                                                                    }
                                                                    
                                                                    setNewItem({...newItem, ...updates});
                                                                }}
                                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition sm:w-24"
                                                            >
                                                                {!isTechnicianUser && <option value="part">{t('Part')}</option>}
                                                                <option value="service_charge">{t('Service')}</option>
                                                            </select>
                                                        </div>
                                                        
                                                        {/* Item Name always shown; search dropdown only for parts */}
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                {t('Item Name')} *
                                                            </label>
                                                            <div 
                                                                ref={itemSearchRef}
                                                                className="relative"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={itemSearchQuery || newItem.item_name}
                                                                    onChange={handleItemSearchChange}
                                                                    onFocus={() => {
                                                                        setShowItemSearch(true);
                                                                    }}
                                                                    placeholder={newItem.item_type === 'service_charge' ? t("Type to search services...") : t("Search item...")}
                                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                                    required
                                                                />
                                                                {isSearching && newItem.item_type === 'part' && (
                                                                    <div className="absolute right-2 top-1.5">
                                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-vismass-blue"></div>
                                                                    </div>
                                                                )}

                                                                {showItemSearch && newItem.item_type === 'service_charge' && (
                                                                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                                        {serviceCharges
                                                                            .filter(charge => charge.charge_name.toLowerCase().includes((itemSearchQuery || newItem.item_name).toLowerCase()))
                                                                            .map(charge => (
                                                                                <div
                                                                                    key={charge.id}
                                                                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-gray-100 text-xs"
                                                                                    onClick={() => {
                                                                                        setNewItem({
                                                                                            ...newItem,
                                                                                            item_name: charge.charge_name,
                                                                                            unit_price: parseFloat(charge.amount.toString()),
                                                                                            description: charge.description || ''
                                                                                        });
                                                                                        setItemSearchQuery('');
                                                                                        setShowItemSearch(false);
                                                                                    }}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="font-medium text-gray-900 truncate">
                                                                                            {charge.charge_name}
                                                                                        </div>
                                                                                        <span className="text-vismass-blue font-semibold">
                                                                                            Rs {parseFloat(charge.amount.toString()).toFixed(2)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        {serviceCharges.filter(charge => charge.charge_name.toLowerCase().includes((itemSearchQuery || newItem.item_name).toLowerCase())).length === 0 && (
                                                                            <div className="px-3 py-2 text-center text-gray-500 text-xs">
                                                                                {t('No predefined services found. You can manually enter this service.')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {(showItemSearch || isSearching) && newItem.item_type === 'part' && (
                                                                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                                        {isSearching ? (
                                                                            <div className="px-3 py-2 text-center text-gray-500 text-xs">
                                                                                <div className="flex items-center justify-center">
                                                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-vismass-blue mr-2"></div>
                                                                                    {t('Searching...')}
                                                                                </div>
                                                                            </div>
                                                                        ) : itemSearchResults.length > 0 ? (
                                                                            itemSearchResults.map((result, idx) => (
                                                                                <div
                                                                                    // include idx to guarantee uniqueness even if identical IDs appear
                                                                                    key={`${result.source}-${result.ItmKy ?? result.purchase_det_ky}-${idx}`}
                                                                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-gray-100 text-xs"
                                                                                    onClick={() => selectItem(result)}
                                                                                >
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="font-medium text-gray-900 truncate">
                                                                                            {result.ItmNm || result.ItemCode}
                                                                                        </div>
                                                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                                                                            result.source === 'itemmaster' 
                                                                                                ? 'bg-blue-100 text-blue-700' 
                                                                                                : 'bg-purple-100 text-purple-700'
                                                                                        }`}>
                                                                                            {result.source === 'itemmaster' ? t('Stock') : t('Purchase')}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-1 items-center justify-between">
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            <span>
                                                                                                {result.source === 'itemmaster' ? t('Code') : t('S/N')}: {result.ItemCode}
                                                                                            </span>
                                                                                            {result.BarCode && (
                                                                                                <span>
                                                                                                    {t('Barcode')}: {result.BarCode}
                                                                                                </span>
                                                                                            )}
                                                                                            {result.batches && result.batches.length > 0 && (
                                                                                                <span>
                                                                                                    {t('Batch')}: {result.batches[0].batch_no} ({t('Qty')}: {result.batches[0].qty})
                                                                                                </span>
                                                                                            )}
                                                                                            {/* also display batch number carried in purchase records */}
                                                                                            {result.source === 'purchase_det' && result.batch_no && (
                                                                                                <span>
                                                                                                    {t('Batch')}: {result.batch_no}
                                                                                                </span>
                                                                                            )}
                                                                                            <span className="text-vismass-blue font-semibold">
                                                                                                {result.CredDis1 && parseFloat(result.CredDis1.toString()) > 0 ? (
                                                                                                    <>
                                                                                                        <span className="line-through text-gray-400 mr-1.5 text-[10px]">
                                                                                                            Rs {(typeof result.SlsPri === 'string' ? parseFloat(result.SlsPri) : result.SlsPri).toFixed(2)}
                                                                                                        </span>
                                                                                                        <span>
                                                                                                            Rs {Math.max(0, (typeof result.SlsPri === 'string' ? parseFloat(result.SlsPri) : result.SlsPri) - parseFloat(result.CredDis1.toString())).toFixed(2)}
                                                                                                        </span>
                                                                                                        <span className="text-red-500 font-bold ml-1.5 text-[10px] bg-red-50 px-1 py-0.5 rounded">
                                                                                                            -Rs {parseFloat(result.CredDis1.toString()).toFixed(2)}
                                                                                                        </span>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    `Rs ${(typeof result.SlsPri === 'string' ? parseFloat(result.SlsPri) : result.SlsPri).toFixed(2)}`
                                                                                                )}
                                                                                            </span>
                                                                                        </div>
                                                                                        {/* Show stock in service section for itemmaster items */}
                                                                                        {result.source === 'itemmaster' && result.ItmKy && (
                                                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                                                                                (itemStockInfo[result.ItmKy] ?? 0) > 0 
                                                                                                    ? 'bg-green-100 text-green-700' 
                                                                                                    : 'bg-red-100 text-red-700'
                                                                                            }`}>
                                                                                                {loadingStockForItems.has(result.ItmKy) 
                                                                                                    ? '...' 
                                                                                                    : `Svc Stock: ${(itemStockInfo[result.ItmKy] ?? 0).toFixed(2)}`
                                                                                                }
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div className="px-3 py-2 text-center text-gray-500 text-xs">
                                                                                {t('No items found')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Show Quantity only for Parts */}
                                                        {newItem.item_type === 'part' && (
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                    {t('Qty')}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={newItem.quantity}
                                                                    onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                    step="0.0001"
                                                                    min="0.0001"
                                                                    className="w-16 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                                />
                                                            </div>
                                                        )}
                                                        
                                                        {/* Batch selection for parts */}
                                                        {newItem.item_type === 'part' && batches.length > 0 && (
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                    {t('Batch')}
                                                                </label>
                                                                <div className="relative" ref={batchDropdownRef}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                                                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                                                                    >
                                                                        <span className={selectedBatch ? 'text-gray-900' : 'text-gray-400'}>
                                                                            {selectedBatch
                                                                                ? `${selectedBatch.batch_no || t('N/A')} (${t('Available')}: ${selectedBatch.available_quantity})`
                                                                                : t('Select a batch...')
                                                                            }
                                                                        </span>
                                                                        <svg
                                                                            className="w-4 h-4 text-gray-400"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M19 9l-7 7-7-7"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    {isBatchDropdownOpen && (
                                                                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                                                                            {batches.map(b => (
                                                                                <div
                                                                                    key={b.batch_no || 'none'}
                                                                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs"
                                                                                    onClick={() => {
                                                                                        setSelectedBatch(b);
                                                                                        setNewItem(prev => ({ 
                                                                                            ...prev, 
                                                                                            batch_no: b.batch_no || '',
                                                                                            ...(b.sale_price !== undefined && b.sale_price !== null && { 
                                                                                                base_price: typeof b.sale_price === 'string' ? parseFloat(b.sale_price) : b.sale_price 
                                                                                            })
                                                                                        }));
                                                                                        setIsBatchDropdownOpen(false);
                                                                                    }}
                                                                                >
                                                                                    {b.batch_no || t('N/A')} ({t('Available')}: {b.available_quantity})
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {/* Show Unit Price for Parts, or Price for Service Charge */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                {newItem.item_type === 'service_charge' ? t('Price') : t('Unit Price')}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={newItem.item_type === 'part' && newItem.base_price ? newItem.base_price : newItem.unit_price}
                                                                onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value)})}
                                                                step="0.01"
                                                                min="0"
                                                                readOnly={newItem.item_type === 'part'}
                                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                            />
                                                        </div>
                                                    </div>
                                                    {newItem.item_type !== 'part' && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                {t('Description')}
                                                            </label>
                                                            <textarea
                                                                value={newItem.description}
                                                                onChange={e => setNewItem({...newItem, description: e.target.value})}
                                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                                rows={1}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAddingItem(false);
                                                                setBatches([]);
                                                                setSelectedBatch(null);
                                                                setIsBatchDropdownOpen(false);
                                                            }}
                                                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                                                        >
                                                            {t('Cancel')}
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            className="w-full rounded-lg bg-gradient-to-r from-vismass-blue to-vismass-grey px-3 py-1.5 text-xs text-white transition-all duration-200 hover:shadow-md sm:w-auto"
                                                        >
                                                            <Plus className="inline mr-2 h-3 w-3" />
                                                            {t('Add')}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                        
                                        {/* Quick Add Service Charges */}
                                        {!addingItem && serviceCharges && serviceCharges.length > 0 && (
                                            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                                                <div className="flex items-center mb-3">
                                                    <DollarSign className="w-4 h-4 text-purple-600 mr-2" />
                                                    <h4 className="font-semibold text-sm text-gray-800">{t('Quick Add Service Charges')}</h4>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                    {serviceCharges.map((charge) => (
                                                        <button
                                                            key={charge.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const formData = new FormData();
                                                                formData.append('item_type', 'service_charge');
                                                                formData.append('item_name', charge.charge_name);
                                                                formData.append('quantity', '1');
                                                                formData.append('unit_price', charge.amount.toString());
                                                                if (charge.description) {
                                                                    formData.append('description', charge.description);
                                                                }
                                                                
                                                                router.post(`/service-jobs/${job.id}/add-item`, formData, {
                                                                    forceFormData: true,
                                                                    preserveScroll: true
                                                                });
                                                            }}
                                                            className="flex flex-col items-start p-3 bg-white hover:bg-purple-50 border border-purple-200 rounded-lg transition-all duration-200 hover:shadow-md group"
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-1">
                                                                <span className="text-xs font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
                                                                    {charge.charge_name}
                                                                </span>
                                                                <Plus className="w-3 h-3 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                            <span className="text-lg font-bold text-purple-600">
                                                                Rs {parseFloat(charge.amount.toString()).toFixed(2)}
                                                            </span>
                                                            {charge.description && (
                                                                <span className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                                    {charge.description}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-gray-600 mt-3 flex items-center">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    {t('Click on a service charge to add it to the job')}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {(job.items || []).length > 0 ? (
                                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                                <table className="min-w-[760px] divide-y divide-slate-200">
                                                    <thead className="bg-slate-50">
                                                        <tr>
                                                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-900 uppercase">
                                                                {t('Type')}
                                                            </th>
                                                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-900 uppercase">
                                                                {t('Item Name')}
                                                            </th>
                                                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-900 uppercase">
                                                                {t('Batch')}
                                                            </th>
                                                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-900 uppercase">
                                                                {t('Qty')}
                                                            </th>
                                                            <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-900 uppercase">
                                                                {t('Unit Price')}
                                                            </th>
                                                            <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-900 uppercase">
                                                                {t('Total')}
                                                            </th>
                                                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-900 uppercase">
                                                                {t('Actions')}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-slate-200">
                                                        {(job.items || []).map((item) => (
                                                            <tr key={item.id} className="hover:bg-slate-50">
                                                                <td className="px-2 py-1.5">
                                                                    <span className={`px-1.5 py-0.5 text-xs rounded ${item.item_type === 'part' ? 'bg-vismass-blue/10 text-vismass-blue font-medium' : 'bg-vismass-grey/10 text-vismass-grey font-medium'}`}>
                                                                        {item.item_type === 'part' ? t('Part') : t('Service')}
                                                                    </span>
                                                                </td>
                                                                <td className="px-2 py-1.5">
                                                                    <div className="text-xs font-medium text-gray-900">{item.item_name}</div>
                                                                    {item.description && (
                                                                        <div className="text-gray-500 text-xs mt-0.5">{item.description}</div>
                                                                    )}
                                                                    {item.discount_amount && parseFloat(item.discount_amount.toString()) > 0 && (
                                                                        <div className="text-red-500 font-medium text-[10px] mt-0.5">
                                                                            {t('Disc')}: -{formatCurrency(item.discount_amount)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-xs">
                                                                    {item.batch_no || '-'}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-xs">{Number(item.quantity).toFixed(2)}</td>
                                                                <td className="px-2 py-1.5 text-xs text-right">
                                                                    {(Number(item.unit_price) + (Number(item.discount_amount || 0) / Number(item.quantity || 1))).toFixed(2)}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-xs font-medium text-right">
                                                                    {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                                                                </td>
                                                                <td className="px-2 py-1.5">
                                                                    {(!isTechnicianUser || item.item_type === 'service_charge') && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm(t('Are you sure you want to remove this item?'))) {
                                                                                    router.delete(`/service-jobs/${job.id}/items/${item.id}`);
                                                                                }
                                                                            }}
                                                                            className="text-red-600 hover:text-red-800 flex items-center text-xs"
                                                                        >
                                                                            <Trash2 className="mr-1 h-3 w-3" />
                                                                            {t('Remove')}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50">
                                                        <tr>
                                                            <td colSpan={5} className="px-2 py-1.5 text-right text-xs font-medium text-slate-900">
                                                                {t('Total')}:
                                                            </td>
                                                            <td className="px-2 py-1.5 text-xs font-bold text-vismass-blue">
                                                                {formatCurrency(totals.netTotal)}
                                                            </td>
                                                            <td></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                                <p className="text-gray-500">{t('No items added yet.')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Photos Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex items-center">
                                            <ImageIcon className="mr-2 h-4 w-4 text-white" />
                                            <h3 className="text-base font-semibold text-white">
                                                {t('Printer Photos')}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        {(!job.photos || job.photos.length < 4) && (
                                            <form onSubmit={handlePhotoUpload} className="mb-4">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept="image/jpeg, image/png, image/jpg"
                                                            onChange={(e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                
                                                                // Validate file type and size
                                                                const invalidFiles = files.filter(file => {
                                                                    const isValidType = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
                                                                    const isValidSize = file.size <= 2 * 1024 * 1024; // 2MB
                                                                    return !isValidType || !isValidSize;
                                                                });

                                                                if (invalidFiles.length > 0) {
                                                                    alert('Only JPEG and PNG images up to 2MB are allowed.');
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                const maxAllowed = 4 - (job.photos?.length || 0);
                                                                if (photoData.photos.length + files.length > maxAllowed) {
                                                                    alert(`You can only upload ${maxAllowed} more photo(s) in total.`);
                                                                    e.target.value = '';
                                                                    return;
                                                                }
                                                                setPhotoData('photos', [...photoData.photos, ...files]);
                                                                e.target.value = '';
                                                            }}
                                                            className="block w-full text-sm text-gray-500
                                                                file:mr-4 file:py-2 file:px-4
                                                                file:rounded-full file:border-0
                                                                file:text-sm file:font-semibold
                                                                file:bg-blue-50 file:text-vismass-blue
                                                                hover:file:bg-blue-100"
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={uploadingPhotos || photoData.photos.length === 0}
                                                            className="inline-flex justify-center items-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white hover:bg-vismass-blue/90 disabled:opacity-50 shrink-0"
                                                        >
                                                            {uploadingPhotos ? t('Uploading...') : t('Upload Selected')}
                                                        </button>
                                                    </div>

                                                    {/* Pending Upload Previews */}
                                                    {photoData.photos.length > 0 && (
                                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                            <p className="text-xs font-medium text-slate-500 mb-2">Selected for upload ({photoData.photos.length}):</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {photoData.photos.map((file, idx) => (
                                                                    <div key={idx} className="relative group">
                                                                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-300">
                                                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newPhotos = [...photoData.photos];
                                                                                newPhotos.splice(idx, 1);
                                                                                setPhotoData('photos', newPhotos);
                                                                            }}
                                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </form>
                                        )}
                                        {job.photos && job.photos.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {job.photos.map(photo => (
                                                    <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-200 h-32">
                                                        <img src={photo.url || `/storage/${photo.photo_path}`} alt={photo.original_name} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <a href={photo.url || `/storage/${photo.photo_path}`} target="_blank" rel="noopener noreferrer" className="text-white bg-vismass-blue rounded-full p-2 hover:bg-white hover:text-vismass-blue transition-colors mr-2 z-10" title="Open in new tab">
                                                                <Eye className="h-4 w-4" />
                                                            </a>
                                                            <Link
                                                                href={`/service-jobs/${job.id}/delete-photo/${photo.id}`}
                                                                method="delete"
                                                                as="button"
                                                                preserveScroll
                                                                onClick={(e) => {
                                                                    if (!confirm(t('Are you sure you want to delete this photo?'))) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                                className="text-white bg-red-500 rounded-full p-2 hover:bg-white hover:text-red-500 transition-colors z-10"
                                                                title="Delete photo"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">{t('No photos uploaded yet. Maximum 4 photos allowed.')}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Messages Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex items-center">
                                            <MessageSquare className="mr-2 h-4 w-4 text-white" />
                                            <h3 className="text-base font-semibold text-white">
                                                {t('Messages to Customer')}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="mb-3">
                                            <select
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue text-gray-600"
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        setMessageData('message', e.target.value);
                                                    }
                                                }}
                                                value=""
                                            >
                                                <option value="" disabled>{t('Select a predefined message...')}</option>
                                                <option value="Your service job has been received and is currently under review.">{t('Service job received and under review.')}</option>
                                                <option value="The repair for your service job has been completed. You can collect your item.">{t('Repair completed. Ready for collection.')}</option>
                                                <option value="We are currently waiting for spare parts to proceed with the repair.">{t('Waiting for spare parts.')}</option>
                                                <option value="The quotation for your service job has been prepared. Please review.">{t('Quotation prepared.')}</option>
                                                <option value="Your service job has been successfully delivered. Thank you!">{t('Job delivered.')}</option>
                                            </select>
                                        </div>
                                        <form onSubmit={handleSendMessage} className="mb-4">
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    value={messageData.message}
                                                    onChange={e => setMessageData('message', e.target.value)}
                                                    placeholder={t('Type a message to send to the customer via SMS...')}
                                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={sendingMessage || !messageData.message.trim()}
                                                    className="inline-flex justify-center items-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white hover:bg-vismass-blue/90 disabled:opacity-50 shrink-0"
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {sendingMessage ? t('Sending...') : t('Send SMS')}
                                                </button>
                                            </div>
                                        </form>
                                        {job.messages && job.messages.length > 0 ? (
                                            <div className="space-y-3">
                                                {job.messages.map(msg => (
                                                    <div key={msg.id} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                                        <p className="text-sm text-gray-800">{msg.message}</p>
                                                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                                                            <span>{msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : t('System')}</span>
                                                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">{t('No messages sent yet.')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Status, Payment, Timeline */}
                            <div className="space-y-6">
                                {/* Status Update Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex items-center">
                                            <Clock className="mr-2 h-4 w-4 text-white" />
                                            <h3 className="text-base font-semibold text-white">
                                                {t('Update Status')}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <form ref={statusFormRef} onSubmit={handleStatusUpdate} className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    {t('Status')}
                                                </label>
                                                <select
                                                    value={statusData.status}
                                                    onChange={e => setStatusData('status', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-sm"
                                                >
                                                    {statusOptions.map((statusKey) => (
                                                        <option
                                                            key={statusKey}
                                                            value={statusKey}
                                                            disabled={statusKey === job.status && !allowedStatusKeys.includes(statusKey)}
                                                        >
                                                            {t(getStatusLabel(statusKey))}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    {t('Assigned Technician')}
                                                </label>
                                                <select
                                                    value={statusData.assigned_technician_id?.toString() || ''}
                                                    onChange={e => setStatusData('assigned_technician_id', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-sm"
                                                >
                                                    <option value="">{t('Unassigned')}</option>
                                                    {technicians.map((technician) => (
                                                        <option key={technician.id} value={technician.id}>
                                                            {technician.first_name} {technician.last_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    {t('Technician Notes')}
                                                </label>
                                                <textarea
                                                    value={statusData.notes}
                                                    onChange={e => setStatusData('notes', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-sm"
                                                    rows={3}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={statusData.status === job.status && statusData.assigned_technician_id == job.assigned_technician_id}
                                                className={`w-full px-3 py-2 rounded-xl transition font-medium text-sm ${
                                                    statusData.status === job.status && statusData.assigned_technician_id == job.assigned_technician_id
                                                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-vismass-blue to-vismass-grey text-white hover:shadow-lg'
                                                }`}
                                            >
                                                <Save className="inline mr-2 h-3 w-3" />
                                                {statusData.status === job.status && statusData.assigned_technician_id == job.assigned_technician_id
                                                    ? t('No Changes')
                                                    : t('Update Status')
                                                }
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Payment Summary Card */}
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <CreditCard className="mr-2 h-4 w-4 text-white" />
                                                <h3 className="text-base font-semibold text-white">
                                                    {t('Payment Summary')}
                                                </h3>
                                            </div>
                                            {!addingPayment && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAddingPayment(true)}
                                                    className="text-white hover:text-white/80 text-xs font-medium transition-colors"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="space-y-1.5 mb-3 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">{t('Parts Total')}:</span>
                                                <span className="font-medium text-gray-900">{formatCurrency(totals.partsTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">{t('Service Charges')}:</span>
                                                <span className="font-medium text-gray-900">{formatCurrency(totals.serviceTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 mt-1">
                                                <span className="text-gray-700 font-medium text-xs">{t('Subtotal')}:</span>
                                                <span className="font-semibold text-gray-900 text-xs">{formatCurrency(totals.subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-600">{t('Less: Advanced Payment')}:</span>
                                                <span className="font-medium text-red-600 text-xs">{formatCurrency(-totals.advancedPayment)}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 bg-blue-50 -mx-4 px-4 py-1.5">
                                                <span className="text-gray-800 font-semibold text-xs">{t('Amount Due')}:</span>
                                                <span className="font-bold text-vismass-blue text-xs">{formatCurrency(totals.netTotal)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs mt-2">
                                                <span className="text-gray-600">{t('Additional Payments')}:</span>
                                                <span className="font-medium text-emerald-600">{formatCurrency(job.paid_amount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs bg-emerald-50 -mx-4 px-4 py-1">
                                                <span className="text-gray-600">{t('Total Paid (Advance + Additional)')}:</span>
                                                <span className="font-semibold text-emerald-700">{formatCurrency(totals.advancedPayment + (parseFloat(job.paid_amount?.toString() || '0')))}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-t-2 border-slate-200 pt-1.5 bg-slate-50 -mx-4 px-4 py-2 rounded-b-xl">
                                                <span className="text-gray-800 font-bold text-xs">{t('Outstanding Balance')}:</span>
                                                <span className={`font-bold text-sm ${totals.netTotal - parseFloat(job.paid_amount?.toString() || '0') > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {formatCurrency(totals.netTotal - parseFloat(job.paid_amount?.toString() || '0'))}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment History */}
                                        {job.payments && job.payments.length > 0 && (
                                            <div className="mt-3">
                                                <h4 className="text-xs font-medium text-gray-900 mb-2 flex items-center">
                                                    <Receipt className="mr-1 h-3 w-3" />
                                                    {t('Payment History')}
                                                </h4>
                                                <div className="space-y-1.5">
                                                    {job.payments.map((payment: CustomerPayment) => (
                                                        <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-xs font-medium text-gray-900">
                                                                        {formatCurrency(payment.amount)}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        ({payment.method})
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    {formatDate(payment.date)}
                                                                    {payment.notes && (
                                                                        <span className="ml-2 italic">"{payment.notes}"</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                #{payment.id}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {addingPayment && (
                                            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <h4 className="font-medium text-emerald-900 mb-2">{t('Record Payment')}</h4>
                                                <form onSubmit={handleAddPayment} className="space-y-3">
                                                    <div>
                                                        <label className="block text-sm font-medium text-emerald-800 mb-1">
                                                            {t('Payment Amount')} (Rs)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={paymentAmount}
                                                            onChange={e => setPaymentAmount(e.target.value)}
                                                            step="0.01"
                                                            min="0.01"
                                                            max={totals.netTotal - parseFloat(job.paid_amount?.toString() || '0')}
                                                            className="w-full px-3 py-2 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                            placeholder={t('Enter payment amount')}
                                                        />
                                                        <p className="text-xs text-emerald-600 mt-1">
                                                            {t('Maximum amount')}: {formatCurrency(totals.netTotal - parseFloat(job.paid_amount?.toString() || '0'))}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setAddingPayment(false);
                                                                setPaymentAmount('');
                                                            }}
                                                            className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-emerald-700 transition hover:bg-emerald-100/50 sm:w-auto"
                                                        >
                                                            {t('Cancel')}
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > (totals.netTotal - parseFloat(job.paid_amount?.toString() || '0'))}
                                                            className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
                                                        >
                                                            {t('Record Payment')}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status History Card */}
                                {/* <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                        <div className="flex items-center">
                                            <History className="mr-2 h-4 w-4 text-white" />
                                            <h3 className="text-lg font-semibold text-white">
                                                {t('Status History')}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="space-y-3">
                                            {(job.statusHistory || []).map((history, index) => (
                                                <div key={index} className="border-l-2 border-vismass-blue/30 pl-2 pb-3 last:pb-0">
                                                    <div className="flex justify-between items-start">
                                                        <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${getStatusColor(history.status)}`}>
                                                            {t(history.status.replace('_', ' '))}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDate(history.created_at)}
                                                        </span>
                                                    </div>
                                                    {history.notes && (
                                                        <p className="text-xs text-gray-600 mt-1 italic">"{history.notes}"</p>
                                                    )}
                                                    {history.changedBy && (
                                                        <p className="text-xs text-gray-400 mt-0.5 flex items-center">
                                                            <User className="h-2.5 w-2.5 mr-1" />
                                                            {t('By')}: {history.changedBy.first_name} {history.changedBy.last_name}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div> */}

                                {/* Dates Information Card */}
                                <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                        <div className="flex items-center">
                                            <Calendar className="mr-2 h-3 w-3 text-white" />
                                            <h3 className="text-base font-semibold text-white">
                                                {t('Dates')}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                    {t('Received Date')}
                                                </label>
                                                <p className="text-sm text-gray-900 font-medium">{formatDate(job.received_date)}</p>
                                            </div>
                                            {job.estimated_completion_date && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                        {t('Estimated Completion')}
                                                    </label>
                                                    <p className="text-sm text-gray-900 font-medium">{formatDate(job.estimated_completion_date)}</p>
                                                </div>
                                            )}
                                            {job.actual_completion_date && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                        {t('Actual Completion')}
                                                    </label>
                                                    <p className="text-sm text-vismass-blue font-bold">{formatDate(job.actual_completion_date)}</p>
                                                </div>
                                            )}
                                            {job.delivered_date && (
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                                        {t('Delivered')}
                                                    </label>
                                                    <p className="text-sm text-vismass-blue font-bold">{formatDate(job.delivered_date)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Save Button Section */}
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex justify-center">
                        <button
                            onClick={handleSaveChanges}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-3 text-base sm:text-lg font-medium text-white transition-all hover:bg-green-700 hover:shadow-lg sm:w-auto"
                        >
                            <Save className="mr-3 h-5 w-5" />
                            {t('Save Changes')}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-12 border-t border-slate-200 bg-white">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        <div className="flex flex-col items-center justify-between space-y-2 text-slate-400 sm:flex-row sm:space-y-0">
                            <p className="text-xs font-medium">VISMASS Sri Lanka - Yakkala • {t('Service Management')}</p>
                            <p className="text-xs">v1.0.1 • {t('Professional Service Solution')}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppSidebarLayout>

        {/* Unit Selection Modal */}
        {isUnitSelectionOpen && unitSelectionPendingItem && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-5 py-4">
                        <h3 className="text-base font-bold text-white">{t('Select Unit')}</h3>
                        <p className="text-xs text-white/80 mt-0.5">
                            {unitSelectionPendingItem.ItmNm || unitSelectionPendingItem.ItemCode}
                        </p>
                    </div>
                    <div className="p-5 space-y-3">
                        <p className="text-xs text-gray-500 text-center">
                            {t('Choose the unit to add this part in')}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Bundle unit */}
                            <button
                                type="button"
                                onClick={() => confirmUnitSelection('bundle')}
                                onMouseEnter={() => setUnitSelectionFocus('bundle')}
                                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-colors outline-none ${
                                    unitSelectionFocus === 'bundle'
                                        ? 'border-vismass-blue bg-blue-50 ring-2 ring-vismass-blue/30'
                                        : 'border-blue-200 bg-blue-50/50 hover:border-vismass-blue hover:bg-blue-50'
                                }`}
                            >
                                <span className="text-2xl">📦</span>
                                <span className="text-sm font-semibold text-vismass-blue">
                                    {unitSelectionPendingItem.from_unit_name ?? t('Bundle')}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {t('Price')}: {(() => {
                                        const p = typeof unitSelectionPendingItem.SlsPri === 'string'
                                            ? parseFloat(unitSelectionPendingItem.SlsPri)
                                            : unitSelectionPendingItem.SlsPri;
                                        return (p || 0).toFixed(2);
                                    })()}
                                </span>
                                <span className="text-xs font-medium text-blue-600">
                                    {t('Stock')}: {unitSelectionPendingItem.bundle_stock?.toFixed(2) ?? '—'}
                                </span>
                                {unitSelectionFocus === 'bundle' && (
                                    <span className="text-[10px] text-vismass-blue font-medium">↵ Enter</span>
                                )}
                            </button>

                            {/* Individual (NOS) unit */}
                            <button
                                type="button"
                                onClick={() => confirmUnitSelection('nos')}
                                onMouseEnter={() => setUnitSelectionFocus('nos')}
                                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-colors outline-none ${
                                    unitSelectionFocus === 'nos'
                                        ? 'border-green-500 bg-green-50 ring-2 ring-green-400/30'
                                        : 'border-green-200 bg-green-50/50 hover:border-green-500 hover:bg-green-50'
                                }`}
                            >
                                <span className="text-2xl">🏷️</span>
                                <span className="text-sm font-semibold text-green-700">
                                    {unitSelectionPendingItem.to_unit_name ?? t('Individual')}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {t('Price')}: {(() => {
                                        const p = typeof unitSelectionPendingItem.SlsPri === 'string'
                                            ? parseFloat(unitSelectionPendingItem.SlsPri)
                                            : unitSelectionPendingItem.SlsPri;
                                        const factor = unitSelectionPendingItem.transfer_conversion_factor ?? 1;
                                        return +((p || 0) / factor).toFixed(2);
                                    })()}
                                </span>
                                <span className="text-xs font-medium text-green-600">
                                    {t('Stock')}: {unitSelectionPendingItem.nos_stock?.toFixed(2) ?? '—'}
                                </span>
                                <span className="text-xs text-blue-400">
                                    1 {unitSelectionPendingItem.from_unit_name ?? t('Bundle')} = {unitSelectionPendingItem.transfer_conversion_factor ?? 1} {unitSelectionPendingItem.to_unit_name ?? t('pcs')}
                                </span>
                                {unitSelectionFocus === 'nos' && (
                                    <span className="text-[10px] text-green-600 font-medium">↵ Enter</span>
                                )}
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400">← → {t('Arrow keys to switch')} | Enter {t('to confirm')} | Esc {t('to cancel')}</p>
                        <button
                            type="button"
                            onClick={() => { setIsUnitSelectionOpen(false); setUnitSelectionPendingItem(null); }}
                            className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition"
                        >
                            {t('Cancel')}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default Show;
