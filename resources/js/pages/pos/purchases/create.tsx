import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CalendarIcon, Save, PackagePlus, Package, Printer } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Component imports
import ItemsTable from '@/components/pos/purchases/ItemsTable';
import PurchaseTotals from '@/components/pos/purchases/PurchaseTotals';
import PrinterItemModal from '@/components/pos/purchases/PrinterItemModal';
import StationaryItemModal from '@/components/pos/purchases/StationaryItemModal';
import ProductQuickCreateModal from '@/components/pos/purchases/ProductQuickCreateModal';
import { toast } from 'sonner';

// Date formatting utilities for DD/MM/YYYY display
const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const parseDateFromDisplay = (displayDate: string): string => {
    if (!displayDate) return '';
    const parts = displayDate.split('/');
    if (parts.length !== 3) return '';
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return '';
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const dateToDisplay = (date: Date | undefined) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const displayToDate = (displayDate: string): Date | undefined => {
    if (!displayDate) return undefined;
    const parts = displayDate.split('/');
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts.map(Number);
    return new Date(year, month - 1, day);
};

interface Supplier {
    id: number;
    code: string;
    name: string;
    contact?: string;
    email?: string;
    address?: string;
    acc_ky?: number;
    section_code?: string;
}

interface PurchaseType {
    code: string;
    name: string;
    description?: string;
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
    warranty?: string;
    sup_key?: number | null;
    item_type?: 'product' | 'printer' | string;
    is_service?: boolean;
    cus_discount_rate?: number;
    cus_discount_type?: 'fixed' | 'percentage';
    last_grn_cost?: number;
    last_grn_retail?: number;
    last_grn_wholesale?: number;
    last_grn_vehicle_sale?: number;
    discount_type?: 'fixed' | 'percentage';
    RtDisType1?: 'fixed' | 'percentage';
    RtQty1?: number;
    RtDis1?: number;
    RtQty2?: number;
    RtDis2?: number;
    CredQty1?: number;
    CredDis1?: number;
    CredQty2?: number;
    CredDis2?: number;
}

interface Category {
    id: string;
    code: string;
    name: string;
    is_printer_category?: boolean;
}

interface Company {
    id: number;
    company_code: string;
    name: string;
}

interface Branch {
    id: number;
    company_code: string;
    section_code: string;
    name: string;
    is_main_stock: boolean;
}

interface UserContext {
    company_id: number | null;
    branch_id: number | null;
    is_super_admin: boolean;
    is_company_admin: boolean;
    is_branch_admin: boolean;
    is_staff_user: boolean;
}

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
    discount_type?: 'fixed' | 'percentage';
    RtDisType1?: 'fixed' | 'percentage';
    RtQty1?: number;
    RtDis1?: number;
    RtQty2?: number;
    RtDis2?: number;
    CredQty1?: number;
    CredDis1?: number;
    CredQty2?: number;
    CredDis2?: number;
}

interface Brand {
    id: number;
    name: string;
    category_id?: number;
    category_code?: string;
    models: string[];
}

interface CreateProps {
    suppliers: Supplier[];
    purchaseTypes: PurchaseType[];
    products: Product[];
    categories: Category[];
    companies: Company[];
    branches: Branch[];
    nextPurchaseNo: number;
    userRole: number;
    userContext: UserContext;
    user: {
        company_code: string;
        branch_code: string;
    };
    type: string;
    existingBrands?: Brand[];
    existingModels?: string[];
    approvedPurchaseOrders?: any[];
}

export default function PurchaseCreate({
    suppliers,
    purchaseTypes,
    products,
    categories,
    companies,
    branches,
    nextPurchaseNo,
    userRole,
    userContext,
    user,
    type,
    existingBrands = [],
    existingModels = [],
    approvedPurchaseOrders = [],
}: CreateProps) {
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
        null,
    );
    const [selectedPoId, setSelectedPoId] = useState<string>('');
    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [searchTerms, setSearchTerms] = useState<{ [key: number]: string }>(
        {},
    );
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(
        null,
    );
    const [modalItem, setModalItem] = useState<PurchaseItem | null>(null);
    const [keepModalOpen, setKeepModalOpen] = useState(false); // keep modal open for batch serial entry
    const [isItemSelectionModalOpen, setIsItemSelectionModalOpen] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
    const [isProductQuickCreateModalOpen, setIsProductQuickCreateModalOpen] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL_CATEGORIES');
    const [mainStockCategory, setMainStockCategory] = useState<string>('');
    const [mainStockBrand, setMainStockBrand] = useState<string>('');
    const [mainStockItemName, setMainStockItemName] = useState<string>('');
    const [additionalDiscount, setAdditionalDiscount] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [currentProducts, setCurrentProducts] = useState<Product[]>(products);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);
    const [stockLocationType, setStockLocationType] = useState<'main_stock' | 'printing_section'>('main_stock');
    const [productType, setProductType] = useState<'printer' | 'stationary'>('stationary');
    const [poSearchQuery, setPoSearchQuery] = useState('');

    // Auto-select company based on user profile
    useEffect(() => {
        if (!selectedCompany && companies.length > 0) {
            // Priority 1: Use user context company_id directly if available (most reliable)
            if (userContext && userContext.company_id) {
                console.log('✓ Auto-selecting company from user context ID:', userContext.company_id);
                setSelectedCompany(userContext.company_id);
                setData("company_id", userContext.company_id);
                return;
            }

            // Priority 2: Use user.company_code
            if (user.company_code) {
                const userCompany = companies.find(c => c.company_code === user.company_code);
                console.log('Searching for company with code:', user.company_code, 'Found:', userCompany);
                if (userCompany) {
                    console.log('✓ Auto-selecting company from user profile code:', userCompany.name);
                    setSelectedCompany(userCompany.id);
                    setData("company_id", userCompany.id);
                    return;
                }
            }

            // Fallback: If only one company exists, select it
            if (companies.length === 1) {
                const companyToSelect = companies[0].id;
                console.log('✓ Auto-selecting single available company:', companyToSelect);
                setSelectedCompany(companyToSelect);
                setData("company_id", companyToSelect);
            }
        }
    }, [companies, selectedCompany, user.company_code, userContext]);

    // Auto-select branch when company changes or when branches are loaded
    useEffect(() => {
        if (!selectedCompany || branches.length === 0) {
            console.log('Branch auto-selection: waiting for company and branches', { selectedCompany, branchesCount: branches.length });
            return;
        }

        const selectedCompanyData = companies.find(c => c.id === selectedCompany);
        if (!selectedCompanyData) {
            console.log('Branch auto-selection: company data not found');
            return;
        }

        console.log('Branch auto-selection: Processing for company:', selectedCompanyData.name, 'Branches available:', branches.length);

        const isMalibu = selectedCompanyData.company_code === 'MAL001';

        if (isMalibu) {
            // For Malibu, auto-select Malibo Shop Stock (MAL-SEC-002)
            const maliboShopStock = branches.find(b => b.section_code === 'MAL-SEC-002' && b.company_code === 'MAL001');
            console.log('Branch auto-selection: Malibo Shop Stock found:', maliboShopStock ? maliboShopStock.name : 'NOT FOUND');
            if (maliboShopStock) {
                console.log('Branch auto-selection: Setting branch to Malibo Shop Stock:', maliboShopStock.name);
                setSelectedBranch(maliboShopStock.id);
                setData('branch_id', maliboShopStock.id);
                setData('from_section', maliboShopStock.section_code);
                return;
            } else {
                console.log('Branch auto-selection: Malibo Shop Stock not found, checking all branches:');
                branches.forEach(b => console.log(`  - ${b.name} (${b.section_code}) - ${b.company_code}`));
            }
        }

        // For non-Malibu companies, select first available branch
        const availableBranches = branches.filter(b => b.company_code === selectedCompanyData.company_code);
        console.log('Branch auto-selection: Available branches for company:', availableBranches.length);
        if (availableBranches.length > 0) {
            console.log('Branch auto-selection: Setting branch to first available:', availableBranches[0].name);
            setSelectedBranch(availableBranches[0].id);
            setData('branch_id', availableBranches[0].id);
            setData('from_section', availableBranches[0].section_code);
        } else {
            console.log('Branch auto-selection: No available branches found for company');
        }
    }, [selectedCompany, companies, branches]);

    // Force Malibu to always use main_stock (no printing_section GRN)
    useEffect(() => {
        if (selectedCompany) {
            const selectedCompanyData = companies.find(c => c.id === selectedCompany);
            if (selectedCompanyData?.company_code?.startsWith('MAL')) {
                // Malibu only supports main_stock
                if (stockLocationType !== 'main_stock') {
                    setStockLocationType('main_stock');
                }
            }
        }
    }, [selectedCompany, companies, stockLocationType]);

    // Auto-select branch based on user profile
    // DISABLED: Stock Location Type logic takes precedence
    /*
    useEffect(() => {
        console.log('=== Branch Auto-select Debug ===');
        console.log('selectedCompany:', selectedCompany);
        console.log('selectedBranch:', selectedBranch);
        console.log('branches:', branches);
        console.log('userContext:', userContext);
        console.log('user.branch_code:', user.branch_code);
        
        if (!selectedCompany) {
            console.log('⚠ Waiting for company selection');
            return; // Wait for company selection
        }
        if (selectedBranch) {
            console.log('⚠ Branch already selected:', selectedBranch);
            return; // Already selected
        }

        // Get available branches for the selected company
        const availableBranches = branches.filter(branch => {
            const selectedCompanyData = companies.find(c => c.id === selectedCompany);
            return selectedCompanyData && branch.company_code === selectedCompanyData.company_code;
        });
        console.log('Available branches for selected company:', availableBranches);

        if (availableBranches.length > 0) {
            // Priority 1: Use user context branch_id directly if available
            if (userContext && userContext.branch_id) {
                console.log('✓ Auto-selecting branch from user context ID:', userContext.branch_id);
                setSelectedBranch(userContext.branch_id);
                setData("branch_id", userContext.branch_id);
                return;
            }

            // Priority 2: Match user's assigned branch code (section_code)
            if (user.branch_code) {
                console.log('Searching for branch with section_code:', user.branch_code);
                const userBranch = availableBranches.find(b => {
                    console.log('Comparing:', b.section_code, 'with', user.branch_code);
                    return b.section_code === user.branch_code;
                });
                console.log('Found branch:', userBranch);
                if (userBranch) {
                    console.log('✓ Auto-selecting branch from user profile code:', userBranch.name);
                    setSelectedBranch(userBranch.id);
                    setData("branch_id", userBranch.id);
                    return;
                }
            }

            // Priority 3: If only one branch exists, select it
            if (availableBranches.length === 1) {
                console.log('✓ Auto-selecting single available branch:', availableBranches[0].name);
                setSelectedBranch(availableBranches[0].id);
                setData("branch_id", availableBranches[0].id);
            }
        } else {
            console.log('⚠ No available branches found for selected company');
        }
    }, [selectedCompany, branches, companies, user.branch_code, selectedBranch, userContext]);
    */

    // Update form data when company/branch selection changes
    useEffect(() => {
        setData('company_id', selectedCompany);
    }, [selectedCompany]);

    useEffect(() => {
        setData('branch_id', selectedBranch);
    }, [selectedBranch]);

    // Fetch products with branch-specific stock when branch changes
    useEffect(() => {
        if (selectedCompany && selectedBranch) {
            fetchProductsByBranch(selectedCompany, selectedBranch);
        }
    }, [selectedCompany, selectedBranch, userContext]);

    const fetchProductsByBranch = async (__companyId: number, branchId: number) => {
        setLoadingProducts(true);
        // Use user's company ID if available, otherwise the passed companyId
        const activeCompanyId = userContext?.company_id || __companyId;

        try {
            const response = await fetch(`/pos/api/purchases/products-by-branch?company_id=${activeCompanyId}&branch_id=${branchId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentProducts(data.products);
                console.log('Updated products with branch-specific stock:', data.products.length, 'products loaded');
            } else {
                console.error('Failed to fetch products by branch');
                // Fallback to original products
                setCurrentProducts(products);
            }
        } catch (error) {
            console.error('Error fetching products by branch:', error);
            // Fallback to original products
            setCurrentProducts(products);
        } finally {
            setLoadingProducts(false);
        }
    };

    const { data, setData, post, processing, errors } = useForm<{
        type: string;
        supplier_code: string;
        company_id: number | null;
        branch_id: number | null;
        from_section: string;
        to_section: string;
        grn_date: string;
        purchase_type: string;
        supplier_invoice_no: string;
        description: string;
        items: {
            product_id: number;
            product_name?: string;
            qty: number;
            cost_price: number;
            normal_cost: number;
            new_cost_price: number;
            discount_rate: number;
            free_qty: number;
            retail_price: number;
            wholesale_price: number;
            VehicleSalePrice: number;
            brand: string;
            model: string;
            serial_number: string;
            warranty: string;
            cus_discount_rate?: number;
        }[];
        total_amount: number;
        total_discount: number;
        total_payable: number;
        stock_location_type: 'main_stock' | 'printing_section';
    }>({
        type: type || 'supplier',
        supplier_code: '',
        company_id: null,
        branch_id: null,
        from_section: '',
        to_section: '',
        grn_date: (() => {
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        })(),
        purchase_type: 'TAX001', // Default to Tax Purchase
        supplier_invoice_no: '',
        description: '',
        items: [],
        total_amount: 0,
        total_discount: 0,
        total_payable: 0,
        stock_location_type: 'printing_section',
    });

    // Update section based on selected stock location type
    useEffect(() => {
        let targetBranch: Branch | undefined;

        // Get selected company info
        const selectedCompanyData = companies.find(c => c.id === selectedCompany);
        const isMalibu = selectedCompanyData?.company_code === 'MAL001';

        if (stockLocationType === 'main_stock') {
            if (isMalibu) {
                // For Malibu main_stock, select Malibo Shop Stock (MAL-SEC-002)
                targetBranch = branches.find(b => b.section_code === 'MAL-SEC-002');
            } else {
                // For Vismass, find branch marked as main stock
                targetBranch = branches.find(b => b.is_main_stock);
                // Fallback for main stock by code if flag not set
                if (!targetBranch) {
                    targetBranch = branches.find(b => b.section_code === 'VIS-SEC-003');
                }
            }
        } else if (stockLocationType === 'printing_section') {
            if (isMalibu) {
                // For Malibu printing_section, select Malibo Shop Stock (MAL-SEC-002)
                targetBranch = branches.find(b => b.section_code === 'MAL-SEC-002');
            } else {
                // For Vismass, find branch marked as printing/service section
                targetBranch = branches.find(b => b.is_main_stock);
                // Fallback for main stock by code if flag not set
                if (!targetBranch) {
                    targetBranch = branches.find(b => b.section_code === 'VIS-SEC-003');
                }
            }
        }

        // Final fallback - if still no branch found but we have branches, take the first one
        if (!targetBranch && branches.length > 0) {
            targetBranch = branches[0];
        }

        if (targetBranch) {
            setData('from_section', targetBranch.section_code);

            // Select the branch if different
            if (selectedBranch !== targetBranch.id) {
                setSelectedBranch(targetBranch.id);
            }
        } else {
            // If no matching branch found, reset selectedBranch
            // This will trigger the validation error on submit if not resolved
            setSelectedBranch(null);
        }
    }, [stockLocationType, branches, selectedCompany, companies]);

    const grnNo = useMemo(() => {
        if (!user.company_code) {
            return `GRN-${String(nextPurchaseNo).padStart(6, '0')}`;
        }

        // Only company code is shown in the GRN number now
        const companyNumber = user.company_code.replace(/[^0-9]/g, '') || '1';
        const formattedCompany = 'C' + companyNumber.padStart(2, '0');

        return `${formattedCompany}-${String(nextPurchaseNo).padStart(6, '0')}`;
    }, [nextPurchaseNo, user.company_code]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Purchases (GRN)'), href: '/pos/purchases' },
        { title: t('New GRN Entry'), href: '#' },
    ];

    // Get available branches for selected company
    const availableBranches = useMemo(() => {
        if (!selectedCompany) return [];

        const selectedCompanyData = companies.find(c => c.id === selectedCompany);
        if (!selectedCompanyData) return [];

        const filtered = branches.filter(branch => branch.company_code === selectedCompanyData.company_code);

        // Allow all branches for the selected company to be shown
        return filtered;
    }, [selectedCompany, companies, branches]);

    // Get suppliers (showing all suppliers for all sections)
    const filteredSuppliers = useMemo(() => {
        return suppliers;
    }, [suppliers]);

    // Filter brands based on selected category for printing section
    const filteredBrands = useMemo(() => {
        if (!mainStockCategory) {
            return existingBrands; // Return all brands if no category selected
        }

        // Filter brands that belong to the selected category (by category code like CAT002)
        const brandsInCategory = existingBrands.filter(brand =>
            brand.category_code === mainStockCategory
        );

        return brandsInCategory;
    }, [mainStockCategory, existingBrands]);

    // Filter purchase orders by search query — only show results when searching
    const filteredPurchaseOrders = useMemo(() => {
        if (!poSearchQuery.trim()) return [];
        const query = poSearchQuery.toLowerCase();
        return approvedPurchaseOrders.filter((po: any) =>
            po.purchase_order_no?.toLowerCase().includes(query)
        );
    }, [approvedPurchaseOrders, poSearchQuery]);

    // Clear brand selection if it's not in the filtered brands
    useEffect(() => {
        if (mainStockBrand && !filteredBrands.some(b => b.name === mainStockBrand)) {
            setMainStockBrand('');
        }
    }, [mainStockCategory, filteredBrands, mainStockBrand]);

    // Calculate totals whenever items or additional discount change
    useEffect(() => {
        const grossAmount = items.reduce((sum, item) => sum + (item.qty * item.cost_price), 0);
        const itemDiscountsTotal = items.reduce(
            (sum, item) => sum + item.item_discount,
            0,
        );
        const totalDiscount = itemDiscountsTotal + additionalDiscount;
        const totalPayable = grossAmount - totalDiscount;

        setData((data) => ({
            ...data,
            items: items.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name || '', // Include product_name for new items
                qty: item.qty,
                cost_price: item.cost_price,
                normal_cost: item.normal_cost,
                new_cost_price: item.new_cost_price,
                discount_rate: item.discount_rate,
                free_qty: item.free_qty,
                retail_price: item.retail_price,
                wholesale_price: item.wholesale_price,
                VehicleSalePrice: item.VehicleSalePrice,
                brand: item.brand || '',
                model: item.model || '',
                serial_number: item.serial_number || '',
                warranty: item.warranty || '',
                category: item.category || '',
                cus_discount_rate: item.cus_discount_rate,
                item_discount: item.item_discount,
                discount_type: item.discount_type || 'fixed',
            })),
            total_amount: grossAmount,
            total_discount: totalDiscount,
            total_payable: totalPayable,
        }));
    }, [items, additionalDiscount]);

    const handleSupplierChange = (suppCode: string) => {
        const supplier = filteredSuppliers.find((s) => s.code === suppCode);
        setSelectedSupplier(supplier || null);
        setData('supplier_code', suppCode);
    };

    // Check if serial number has been used in any previous GRN
    const checkSerialNumberInAllGrns = async (serialNumber: string): Promise<boolean> => {
        if (!serialNumber || serialNumber.trim() === '') {
            return false;
        }

        try {
            const response = await fetch(`/pos/api/purchases/check-serial-number?serial_number=${encodeURIComponent(serialNumber)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                return data.exists;
            }
            return false;
        } catch (error) {
            console.error('Error checking serial number:', error);
            return false;
        }
    };

    const openItemModal = (index: number, productId: number) => {
        // Check if we're editing an existing item or creating a new one
        const existingItem = items[index];

        if (existingItem) {
            // Editing existing item - use its data including brand, model, serial_number
            setModalItem({ ...existingItem });
            setEditingItemIndex(index);
            setIsItemModalOpen(true);
        } else {
            // Creating new item from product
            const product = currentProducts.find((p) => p.id === productId);
            if (product) {
                const itemData: PurchaseItem = {
                    product_id: product.id,
                    product_code: product.code,
                    product_name: product.name,
                    qty: 1,
                    cost_price: product.cost_price,
                    normal_cost: product.normal_cost,
                    new_cost_price: product.cost_price,
                    discount_rate: 0,
                    free_qty: 0,
                    retail_price: product.retail_price,
                    wholesale_price: product.wholesale_price,
                    VehicleSalePrice: product.VehicleSalePrice,
                    item_discount: 0,
                    amount: product.cost_price * 1, // qty * cost_price
                    brand: product.brand || '',
                    model: product.model || '',
                    serial_number: product.serial_number || '',
                    warranty: '',
                    cus_discount_rate: product.cus_discount_rate || 0,
                    cus_discount_type: product.cus_discount_type || 'fixed',
                    RtQty1: product.RtQty1 || 0,
                    RtDis1: product.RtDis1 || 0,
                    RtQty2: product.RtQty2 || 0,
                    RtDis2: product.RtDis2 || 0,
                    CredQty1: product.CredQty1 || 0,
                    CredDis1: product.CredDis1 || 0,
                    CredQty2: product.CredQty2 || 0,
                    CredDis2: product.CredDis2 || 0,
                };
                setModalItem(itemData);
                setEditingItemIndex(index);
                setIsItemModalOpen(true);
            }
        }
    };

    const confirmAddItem = async () => {
        if (modalItem) {
            // ✨ NEW: Handle multiple serial numbers for REGISTERED printer products
            if (productType === 'printer' && modalItem.product_id > 0) {
                // Get multiple serial numbers from modalItem (passed from ItemDetailsModal)
                const serialNumbersText = (modalItem as any).multipleSerialNumbers || '';
                const serials = serialNumbersText
                    .split(/[\n,]+/)
                    .map((s: string) => s.trim())
                    .filter((s: string) => s !== '');

                if (serials.length === 0) {
                    toast.error('Please enter at least one serial number');
                    return;
                }

                // Check if ANY serial number has duplicates in current items
                for (const serial of serials) {
                    // When editing, skip checking the item currently being replaced
                    const duplicateExists = items.some((item, idx) =>
                        item.serial_number === serial && idx !== editingItemIndex
                    );
                    if (duplicateExists) {
                        toast.error(`Serial number ${serial} already exists in this GRN. Each serial number can only be added once.`);
                        return;
                    }
                }

                // Check if ANY serial number has been used in previous GRNs
                for (const serial of serials) {
                    const existsInPreviousGrn = await checkSerialNumberInAllGrns(serial);
                    if (existsInPreviousGrn) {
                        toast.error(`Serial number ${serial} has already been used in a previous GRN. Each serial number can only be received once.`);
                        return;
                    }
                }

                // Create a separate item for each serial number
                const newItems = serials.map((serial: string) => ({
                    ...modalItem,
                    qty: 1, // Each serial is one unit
                    serial_number: serial,
                    item_discount: modalItem.item_discount / serials.length, // Pro-rate the discount
                    amount: modalItem.amount / serials.length, // Pro-rate the total amount
                    new_cost_price: modalItem.new_cost_price, // Net cost per unit
                }));

                // Add all items to the list — when editing, EXPAND the one row into N rows (one per serial)
                if (editingItemIndex !== null) {
                    const updatedItems = [...items];
                    // Replace the single edited item with all new serial rows
                    updatedItems.splice(editingItemIndex, 1, ...newItems);
                    setItems(updatedItems);
                } else {
                    // If adding new, append all items
                    setItems([...items, ...newItems]);
                }

                setIsItemModalOpen(false);
                setModalItem(null);
                setEditingItemIndex(null);
                setKeepModalOpen(false);
                return;
            }

            // 🔍 Validate serial number uniqueness for single serial entries (printing_section)
            if (productType === 'printer' && modalItem.serial_number) {
                // Check if serial already in current items
                if (editingItemIndex === null && items.some(item => item.serial_number === modalItem.serial_number)) {
                    toast.error(`Serial number ${modalItem.serial_number} already exists in this GRN. Each serial number can only be added once.`);
                    return;
                }

                // Check if serial has been used in previous GRNs
                const existsInPreviousGrn = await checkSerialNumberInAllGrns(modalItem.serial_number);
                if (existsInPreviousGrn) {
                    toast.error(`Serial number ${modalItem.serial_number} has already been used in a previous GRN. Each serial number can only be received once.`);
                    return;
                }
            }

            // Validate Main Stock required fields
            if (productType === 'stationary') {
                if (modalItem.product_id === 0 && (!mainStockCategory || !mainStockBrand || !mainStockItemName)) {
                    toast.error('Please fill in Category, Brand, and Item Name');
                    return;
                }
                if (modalItem.qty <= 0 || modalItem.cost_price <= 0 || modalItem.retail_price <= 0) {
                    toast.error('Please fill in Quantity, Cost Price, and Sales Price for Main Stock items');
                    return;
                }
                if (modalItem.product_id === 0 && !modalItem.serial_number) {
                    toast.error('Please fill in Serial Number for Main Stock items');
                    return;
                }
                if (modalItem.product_id === 0) {
                    modalItem.product_name = mainStockItemName;
                    modalItem.brand = mainStockBrand;
                    modalItem.category = mainStockCategory;
                    modalItem.product_code = `MS-${mainStockCategory}-${Date.now()}`;
                }
            }

            // Validate Printing Section required fields
            if (productType === 'printer') {
                if (modalItem.product_id === 0 && (!mainStockCategory || !mainStockBrand || !mainStockItemName)) {
                    toast.error('Please fill in Category, Brand, and Item Name');
                    return;
                }
                if (modalItem.qty <= 0 || modalItem.cost_price <= 0 || modalItem.retail_price <= 0) {
                    toast.error('Please fill in Quantity, Cost Price, and Sales Price for Printing Section items');
                    return;
                }
                if (modalItem.product_id === 0 && !modalItem.serial_number) {
                    toast.error('Please fill in Serial Number for Printing Section items');
                    return;
                }
                if (modalItem.product_id === 0) {
                    modalItem.product_name = mainStockItemName;
                    modalItem.brand = mainStockBrand;
                    modalItem.category = mainStockCategory;
                    modalItem.product_code = `PS-${mainStockCategory}-${Date.now()}`;
                }
            }

            // For Stationary items: item_discount and amount are already calculated in StationaryItemModal
            // Just use the values as provided from the modal
            if (editingItemIndex !== null) {
                const updatedItems = [...items];
                updatedItems[editingItemIndex] = modalItem;
                setItems(updatedItems);

                // reset and close when editing
                setIsItemModalOpen(false);
                setModalItem(null);
                setEditingItemIndex(null);
                setKeepModalOpen(false);
                return;
            }

            setItems([...items, modalItem]);

            if (keepModalOpen) {
                const next: PurchaseItem = { ...modalItem, serial_number: '' };
                setModalItem(next);
                setEditingItemIndex(null);
                return;
            }
        }

        // default close
        setIsItemModalOpen(false);
        setModalItem(null);
        setEditingItemIndex(null);
        setKeepModalOpen(false);
    };

    const cancelAddItem = () => {
        setIsItemModalOpen(false);
        setModalItem(null);
        setEditingItemIndex(null);
        setKeepModalOpen(false);

        // Only clear form data if no items have been added yet
        if (items.length === 0) {
            setMainStockCategory('');
            setMainStockBrand('');
            setMainStockItemName('');
        }
    };

    const addItem = () => {
        // Create empty modal item for new entry
        const newItem: PurchaseItem = {
            product_id: 0,
            product_code: '',
            product_name: '',
            qty: 1,
            cost_price: 0,
            normal_cost: 0,
            new_cost_price: 0,
            discount_rate: 0,
            free_qty: 0,
            retail_price: 0,
            wholesale_price: 0,
            VehicleSalePrice: 0,
            item_discount: 0,
            amount: 0,
            brand: '',
            model: '',
            serial_number: '',
            warranty: '',
            category: mainStockCategory,
            remark: '',
            cus_discount_rate: 0,
            discount_type: 'fixed',
            RtQty1: 0,
            RtDis1: 0,
        };

        // For main stock, if we have previous data, pre-fill the modal with the same details
        // but clear only the serial number for next entry
        if (productType === 'stationary' && items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName) {
            const lastItem = items[items.length - 1];
            newItem.qty = lastItem.qty;
            newItem.cost_price = lastItem.cost_price;
            newItem.normal_cost = lastItem.normal_cost;
            newItem.new_cost_price = lastItem.new_cost_price;
            newItem.discount_rate = lastItem.discount_rate;
            newItem.free_qty = lastItem.free_qty;
            newItem.retail_price = lastItem.retail_price;
            newItem.wholesale_price = lastItem.wholesale_price;
            newItem.VehicleSalePrice = lastItem.VehicleSalePrice;
            newItem.brand = lastItem.brand;
            newItem.model = lastItem.model;
            newItem.warranty = lastItem.warranty;
            newItem.barcode = lastItem.barcode;
            newItem.remark = lastItem.remark || '';
            // Calculate item_discount and amount based on the last item's values
            newItem.item_discount = (lastItem.cost_price * lastItem.qty * lastItem.discount_rate) / 100;
            newItem.amount = lastItem.cost_price * lastItem.qty - newItem.item_discount;
            newItem.cus_discount_rate = lastItem.cus_discount_rate;
            newItem.RtQty1 = lastItem.RtQty1 || 0;
            newItem.RtDis1 = lastItem.RtDis1 || 0;
            // Keep serial_number empty for new entry
            newItem.serial_number = '';
        }

        // For printing section, if we have previous data, pre-fill the modal with the same details
        // but clear only the serial number for next entry
        if (productType === 'printer' && items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName) {
            const lastItem = items[items.length - 1];
            newItem.qty = lastItem.qty;
            newItem.cost_price = lastItem.cost_price;
            newItem.retail_price = lastItem.retail_price;
            newItem.wholesale_price = lastItem.wholesale_price;
            newItem.VehicleSalePrice = lastItem.VehicleSalePrice;
            newItem.discount_rate = lastItem.discount_rate;
            newItem.model = lastItem.model;
            newItem.warranty = lastItem.warranty;
            newItem.barcode = lastItem.barcode;
            newItem.category = lastItem.category;
            newItem.category = lastItem.category;
            newItem.remark = lastItem.remark || '';
            newItem.cus_discount_rate = lastItem.cus_discount_rate;
            newItem.RtQty1 = lastItem.RtQty1 || 0;
            newItem.RtDis1 = lastItem.RtDis1 || 0;
            // Calculate amount for printing section
            newItem.amount = lastItem.cost_price * lastItem.qty;
            // Keep serial_number empty for new entry
            newItem.serial_number = '';
        }

        setModalItem(newItem);
        setEditingItemIndex(null);
        setItemSearchQuery('');
        setSelectedCategory('ALL_CATEGORIES');

        // Reset form fields only if this is the very first item for the respective stock type
        if (items.length === 0) {
            setMainStockCategory('');
            setMainStockBrand('');
            setMainStockItemName('');
        }

        setIsItemModalOpen(true);
    };

    // Filter products based on search query and category
    useEffect(() => {
        let filtered = currentProducts;

        // 1. Strict Product Type Filtering
        if (productType === 'stationary') {
            // Only show standard products that are NOT services
            filtered = filtered.filter(p => (p.item_type === 'product' || !p.item_type) && !p.is_service);
        } else if (productType === 'printer') {
            // Only show printer items that are NOT services
            filtered = filtered.filter(p => p.item_type === 'printer' && !p.is_service);
        }

        // 2. Apply supplier filter: only show products of the selected supplier OR products with no supplier
        if (selectedSupplier?.acc_ky) {
            filtered = filtered.filter((product) =>
                !product.sup_key || product.sup_key === 0 || product.sup_key === selectedSupplier.acc_ky
            );
        }

        // 3. Apply search filter
        if (itemSearchQuery.trim() !== '') {
            const searchLower = itemSearchQuery.toLowerCase();
            filtered = filtered.filter((product) =>
                product.code.toLowerCase().includes(searchLower) ||
                product.name.toLowerCase().includes(searchLower) ||
                (product.english_name && product.english_name.toLowerCase().includes(searchLower)) ||
                (product.barcode && product.barcode.toLowerCase().includes(searchLower))
            );
        }

        // 4. Apply category filter
        if (selectedCategory !== 'ALL_CATEGORIES') {
            filtered = filtered.filter((product) =>
                product.category_id === selectedCategory
            );
        }

        // Show first 50 products
        setFilteredProducts(filtered.slice(0, 50));
        setSelectedItemIndex(-1);
    }, [currentProducts, itemSearchQuery, selectedCategory, selectedSupplier, productType, categories]);

    // Keyboard navigation for item selection
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isItemSelectionModalOpen || filteredProducts.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedItemIndex(prev =>
                    prev < filteredProducts.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedItemIndex(prev =>
                    prev > 0 ? prev - 1 : filteredProducts.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedItemIndex >= 0 && selectedItemIndex < filteredProducts.length) {
                    selectItem(filteredProducts[selectedItemIndex]);
                }
                break;
            case 'Escape':
                setIsItemSelectionModalOpen(false);
                break;
        }
    };

    const selectItem = (product: Product) => {
        const newItem: PurchaseItem = {
            product_id: product.id,
            product_code: product.code,
            product_name: product.name,
            qty: 1,
            cost_price: product.cost_price,
            normal_cost: product.normal_cost,
            new_cost_price: product.cost_price,
            discount_rate: 0,
            free_qty: 0,
            retail_price: product.retail_price,
            wholesale_price: product.wholesale_price,
            VehicleSalePrice: product.VehicleSalePrice,
            item_discount: 0,
            amount: product.cost_price * 1, // qty * cost_price
            brand: product.brand || '',
            model: product.model || '',
            serial_number: product.serial_number || '',
            warranty: product.warranty || '',
            barcode: product.barcode || '',
            category: product.category_name,
            cus_discount_rate: product.cus_discount_rate || 0,
            cus_discount_type: product.cus_discount_type || 'fixed',
            RtDisType1: product.RtDisType1 || product.cus_discount_type || 'fixed',
            RtQty1: product.RtQty1 || 0,
            RtDis1: product.RtDis1 || 0,
            RtQty2: product.RtQty2 || 0,
            RtDis2: product.RtDis2 || 0,
            CredQty1: product.CredQty1 || 0,
            CredDis1: product.CredDis1 || 0,
            CredQty2: product.CredQty2 || 0,
            CredDis2: product.CredDis2 || 0,
            discount_type: product.RtDisType1 || product.discount_type || 'fixed',
        };
        setModalItem(newItem);
        setIsItemSelectionModalOpen(false);
        setIsItemModalOpen(true);
    };

    const handlePoChange = (poId: string) => {
        setSelectedPoId(poId);
        setPoSearchQuery('');
        
        const po = approvedPurchaseOrders.find(p => p.id.toString() === poId);
        if (!po) return;

        // Auto-select supplier
        if (po.supplier_code) {
            handleSupplierChange(po.supplier_code);
        }

        // Auto-switch product type based on PO item_type
        // item_type = 'product' → productType = 'stationary'
        // item_type = 'printer' → productType = 'printer'
        if (po.item_type === 'printer') {
            setProductType('printer');
        } else {
            setProductType('stationary');
        }

        // Clear existing cart items and map PO details to cart items
        const newItems: PurchaseItem[] = [];
        
        po.details.forEach((detail: any) => {
            const product = currentProducts.find(p => p.id == detail.product_id);
            if (product) {
                const qty = detail.qty || 1;
                const costPrice = product.cost_price || 0;
                const amount = costPrice * qty;
                
                newItems.push({
                    product_id: product.id,
                    product_code: product.code,
                    product_name: product.name,
                    qty: qty,
                    cost_price: costPrice,
                    normal_cost: product.normal_cost || 0,
                    new_cost_price: costPrice,
                    discount_rate: 0,
                    free_qty: 0,
                    retail_price: product.retail_price || 0,
                    wholesale_price: product.wholesale_price || 0,
                    VehicleSalePrice: product.VehicleSalePrice || 0,
                    item_discount: 0,
                    amount: amount,
                    brand: product.brand || '',
                    model: product.model || '',
                    serial_number: '',
                    warranty: product.warranty || '',
                    barcode: product.barcode,
                    category: product.category_name || '',
                    remark: '',
                    cus_discount_rate: product.cus_discount_rate || 0,
                    discount_type: product.cus_discount_type || 'fixed',
                    RtDisType1: product.RtDisType1 || product.cus_discount_type || 'fixed',
                    RtQty1: product.RtQty1 || 0,
                    RtDis1: product.RtDis1 || 0,
                    RtQty2: product.RtQty2 || 0,
                    RtDis2: product.RtDis2 || 0,
                    CredQty1: product.CredQty1 || 0,
                    CredDis1: product.CredDis1 || 0,
                    CredQty2: product.CredQty2 || 0,
                    CredDis2: product.CredDis2 || 0,
                });
            }
        });

        if (newItems.length > 0) {
            setItems(newItems);
            toast.success(`Loaded ${newItems.length} items from Purchase Order`);
        } else {
            toast.warning('No matching products found for this Purchase Order');
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
        setOpenRowIndex(null);
    };

    const updateItem = (
        index: number,
        field: keyof PurchaseItem,
        value: string | number,
    ) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        // If product changed, update all product fields
        if (field === 'product_id') {
            const product = currentProducts.find((p) => p.id === value);
            if (product) {
                updatedItems[index].product_code = product.code;
                updatedItems[index].product_name = product.name;
                updatedItems[index].cost_price = product.cost_price;
                updatedItems[index].normal_cost = product.normal_cost;
                updatedItems[index].new_cost_price = product.cost_price; // Initialize with cost_price
                updatedItems[index].retail_price = product.retail_price;
                updatedItems[index].wholesale_price = product.wholesale_price;
                updatedItems[index].VehicleSalePrice = product.VehicleSalePrice;
            }
        }

        // Recalculate discount and amount
        const item = updatedItems[index];
        const itemDiscount = item.discount_rate; // Fixed amount in Rs
        const amount = item.cost_price * item.qty - itemDiscount;

        updatedItems[index].item_discount = itemDiscount;
        updatedItems[index].amount = amount;

        // Recalculate new_cost_price if relevant fields changed
        if (['qty', 'free_qty', 'cost_price', 'discount_rate'].includes(field)) {
            const totalQty = item.qty + item.free_qty;
            const discountedCost = item.cost_price - (item.discount_rate / item.qty);
            updatedItems[index].new_cost_price =
                totalQty > 0 ? (discountedCost * item.qty) / totalQty : discountedCost;
        }

        setItems(updatedItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (submitted) return; // Prevent double submission

        setSubmitted(true);

        // Validate company and branch selection
        if (!selectedCompany) {
            toast.error(t('Please select a company'));
            setSubmitted(false);
            return;
        }

        if (!selectedBranch) {
            toast.error(t('Please select a branch'));
            setSubmitted(false);
            return;
        }

        // Filter out empty items
        // For both main_stock and printing_section, product_id can be 0 (allows creating new items)
        const validItems = items.filter((item) => {
            if (stockLocationType === 'main_stock' || stockLocationType === 'printing_section') return true;
            return item.product_id > 0;
        });

        // Check if there are any valid items
        if (validItems.length === 0) {
            toast.error(t('Please add at least one item to the GRN'));
            setSubmitted(false); // Reset if validation fails
            return;
        }

        // Temporarily update data with only valid items for submission
        const formData = {
            ...data,
            items: validItems.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                qty: item.qty,
                cost_price: item.cost_price,
                normal_cost: item.normal_cost,
                new_cost_price: item.new_cost_price,
                discount_rate: item.discount_rate,
                free_qty: item.free_qty,
                retail_price: item.retail_price,
                wholesale_price: item.wholesale_price,
                VehicleSalePrice: item.VehicleSalePrice,
                brand: item.brand,
                model: item.model,
                serial_number: item.serial_number,
                warranty: item.warranty,
                barcode: item.barcode,
                remark: item.remark,
                item_discount: item.item_discount,
                discount_type: item.discount_type,
                RtDisType1: item.RtDisType1 || item.discount_type || 'fixed',
                cus_discount_rate: item.cus_discount_rate,
                RtQty1: item.RtQty1 || 0,
                RtDis1: item.RtDis1 || 0,
                RtQty2: item.RtQty2 || 0,
                RtDis2: item.RtDis2 || 0,
                CredQty1: item.CredQty1 || 0,
                CredDis1: item.CredDis1 || 0,
                CredQty2: item.CredQty2 || 0,
                CredDis2: item.CredDis2 || 0,
            })),
        };

        // Submit with valid items only
        router.post('/pos/purchases', formData, {
            onSuccess: () => {
                router.visit('/pos/purchases');
            },
            onError: () => {
                setSubmitted(false); // Reset on error
            },
        });
    };

    // Global keyboard shortcuts handler
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Handle F2 key for adding items
            if (e.key === 'F2') {
                e.preventDefault();
                addItem();
                return;
            }

            // Handle Ctrl+A (or Cmd+A on Mac) for adding items
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                addItem();
                return;
            }

            // Handle F3 key in item details modal to confirm adding item
            if (e.key === 'F3' && isItemModalOpen) {
                e.preventDefault();
                confirmAddItem();
                return;
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [isItemModalOpen]);

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('New GRN Entry')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start space-x-3 sm:items-center">
                                <Link
                                    href="/pos/purchases"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <PackagePlus className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold text-white sm:text-xl">
                                        {t('New GRN Entry')}
                                    </h1>
                                    <p className="text-xs text-white/80 sm:text-sm">
                                        {t('Create a new Goods Received Note (GRN)')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6 lg:p-8">
                            {/* All Header Fields in One Unified Grid */}
                            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {/* GRN No */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-gray-700 font-medium">
                                        {t('GRN No')}
                                    </Label>
                                    <Input
                                        value={grnNo}
                                        disabled
                                        className="bg-gray-50 w-full border-gray-300 rounded-lg shadow-sm font-medium"
                                    />
                                </div>

                                {/* GRN Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="grn_date" className="flex items-center gap-2 text-gray-700 font-medium">
                                        {t('Date')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-full justify-start text-left font-normal border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white hover:bg-green-50 transition-all duration-300 hover:shadow-md ${!data.grn_date && 'text-muted-foreground'}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {data.grn_date ? new Date(data.grn_date).toLocaleDateString('en-GB') : t('DD/MM/YYYY')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white border-2 border-green-200 rounded-lg shadow-xl" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={data.grn_date ? new Date(data.grn_date) : undefined}
                                                onSelect={(selectedDate: Date | undefined) => {
                                                    if (selectedDate) {
                                                        setData('grn_date', selectedDate.toISOString().split('T')[0]);
                                                    }
                                                    setDatePickerOpen(false);
                                                }}
                                                initialFocus
                                                className="rounded-lg"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.grn_date && <p className="text-sm text-red-600 font-medium">{errors.grn_date}</p>}
                                </div>

                                {/* Company */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-gray-700 font-medium">{t('Company')}</Label>
                                    {userContext?.is_super_admin ? (
                                        <Select
                                            value={selectedCompany?.toString()}
                                            onValueChange={(val) => setSelectedCompany(parseInt(val))}
                                        >
                                            <SelectTrigger className="w-full border-gray-300 rounded-lg shadow-sm bg-white">
                                                <SelectValue placeholder={t('Select Company')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {companies.map(c => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            value={companies.find(c => c.id === selectedCompany)?.name || ''}
                                            disabled
                                            className="w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm font-medium"
                                        />
                                    )}
                                </div>

                                {/* Branch */}
                                {availableBranches.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-gray-700 font-medium">{t('Branch')}</Label>
                                        <Select
                                            value={selectedBranch?.toString()}
                                            onValueChange={(val) => setSelectedBranch(parseInt(val))}
                                        >
                                            <SelectTrigger className="w-full border-gray-300 rounded-lg shadow-sm bg-white">
                                                <SelectValue placeholder={t('Select Branch')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableBranches.map(branch => (
                                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                                        {branch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Load from Purchase Order */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-gray-700 font-medium">
                                        {t('Load from Purchase Order')}
                                    </Label>
                                    <Select value={selectedPoId} onValueChange={handlePoChange}>
                                        <SelectTrigger className="w-full border-gray-300 rounded-lg shadow-sm bg-white">
                                            <SelectValue placeholder={t('Select a PO...')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="p-2">
                                                <Input
                                                    placeholder={t('Search POs...')}
                                                    className="w-full"
                                                    value={poSearchQuery}
                                                    onInput={(e) => {
                                                        e.stopPropagation();
                                                        setPoSearchQuery((e.target as HTMLInputElement).value);
                                                    }}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    onKeyUp={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                            </div>
                                            {filteredPurchaseOrders.map(po => (
                                                <SelectItem key={po.id} value={po.id.toString()}>
                                                    {po.purchase_order_no}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Supplier Code */}
                                <div className="space-y-2">
                                    <Label htmlFor="supplier_code" className="flex items-center gap-2 text-gray-700 font-medium">
                                        {t('Supplier Code')}
                                    </Label>
                                    <Select value={data.supplier_code} onValueChange={handleSupplierChange}>
                                        <SelectTrigger id="supplier_code" className="w-full border-gray-300 rounded-lg shadow-sm bg-white">
                                            <SelectValue placeholder={t('Select code')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="p-2">
                                                <Input
                                                    placeholder={t('Search suppliers...')}
                                                    className="w-full"
                                                    onChange={(e) => {
                                                        // filter handled via filteredSuppliers
                                                    }}
                                                />
                                            </div>
                                            {filteredSuppliers.map((supplier) => (
                                                <SelectItem key={supplier.code} value={supplier.code}>
                                                    {supplier.code} - {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.supplier_code && <p className="text-sm text-red-600 font-medium">{errors.supplier_code}</p>}
                                </div>

                                {/* Supplier Name */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-gray-700 font-medium">{t('Supplier Name')}</Label>
                                    <Input
                                        value={selectedSupplier?.name || ''}
                                        disabled
                                        className="w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm font-medium"
                                        placeholder={t('Select supplier code first')}
                                    />
                                </div>

                                {/* Supplier Invoice No */}
                                <div className="space-y-2">
                                    <Label htmlFor="supplier_invoice_no" className="flex items-center gap-2 text-gray-700 font-medium">
                                        {t('Supplier Invoice No')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="supplier_invoice_no"
                                        value={data.supplier_invoice_no}
                                        onChange={(e) => setData('supplier_invoice_no', e.target.value)}
                                        placeholder={t('Enter invoice number')}
                                        className="w-full border-gray-300 rounded-lg shadow-sm"
                                        required
                                    />
                                    {errors.supplier_invoice_no && <p className="text-sm text-red-600 font-medium">{errors.supplier_invoice_no}</p>}
                                </div>
                            </div>

                            {/* Product Type Selector */}
                            <div className="mt-6">
                                <div className="max-w-sm space-y-2">
                                    <label className="flex gap-2 text-gray-700 font-medium text-sm">
                                        <Package className="w-4 h-4 text-vismass-blue" />
                                        {t('Product Type')}
                                    </label>
                                    <Select
                                        value={productType}
                                        onValueChange={(value: 'printer' | 'stationary') => setProductType(value)}
                                    >
                                    <SelectTrigger className="w-full border-slate-300 bg-white">
                                            <SelectValue placeholder={t('Select Product Type')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="stationary">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-amber-500" />
                                                    <span>{t('Stationary Item')}</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="printer">
                                                <div className="flex items-center gap-2">
                                                    <Printer className="w-4 h-4 text-green-500" />
                                                    <span>{t('Printer Item')}</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mt-6 overflow-x-auto">
                                <ItemsTable
                                    items={items}
                                    onAddItem={addItem}
                                    onEditItem={(item: PurchaseItem, index: number) => openItemModal(index, item.product_id)}
                                    onRemoveItem={removeItem}
                                    stockLocationType={stockLocationType}
                                    productType={productType}
                                    openRowIndex={openRowIndex}
                                    onRowOpenChange={setOpenRowIndex}
                                    currentProducts={currentProducts}
                                    searchTerms={searchTerms}
                                    onProductChange={() => {}}
                                    onSearchTermChange={() => {}}
                                    errors={errors}
                                />
                            </div>

                            {/* Totals Section */}
                            <div className="mt-6">
                                <PurchaseTotals
                                    items={items}
                                    totalAmount={data.total_amount}
                                    totalDiscount={data.total_discount}
                                    totalPayable={data.total_payable}
                                    additionalDiscount={additionalDiscount}
                                    onAdditionalDiscountChange={setAdditionalDiscount}
                                    processing={processing}
                                    submitted={submitted}
                                />
                            </div>

                            {/* Description */}
                            <div className="mt-6">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                    {t('Description')}
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-vismass-blue focus:ring-vismass-blue sm:text-sm"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:space-x-0">
                            <Link
                                href="/pos/purchases"
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none sm:w-auto"
                            >
                                {t('Cancel')}
                            </Link>
                            <button
                                type="submit"
                                disabled={processing || submitted}
                                className="inline-flex w-full items-center justify-center rounded-lg border border-transparent bg-vismass-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-vismass-blue/90 focus:outline-none focus:ring-2 focus:ring-vismass-blue focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {processing ? t('Saving...') : t('Save GRN')}
                            </button>
                        </div>
                    </form>
                </main>
            </div>

            {/* Printer Item Modal */}
            {isItemModalOpen && modalItem && productType === 'printer' && (
                <PrinterItemModal
                    isOpen={isItemModalOpen}
                    onClose={cancelAddItem}
                    modalItem={modalItem}
                    editingItemIndex={editingItemIndex}
                    items={items}
                    categories={categories}
                    existingBrands={filteredBrands}
                    mainStockCategory={mainStockCategory}
                    mainStockBrand={mainStockBrand}
                    mainStockItemName={mainStockItemName}
                    onMainStockCategoryChange={setMainStockCategory}
                    onMainStockBrandChange={setMainStockBrand}
                    onMainStockItemNameChange={setMainStockItemName}
                    onModalItemChange={setModalItem}
                    onConfirm={confirmAddItem}
                    onCancel={cancelAddItem}
                    itemSearchQuery={itemSearchQuery}
                    onItemSearchChange={setItemSearchQuery}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    filteredProducts={filteredProducts}
                    onSelectProduct={selectItem}
                    currentProducts={currentProducts}
                    onCreateProductClick={() => setIsProductQuickCreateModalOpen(true)}
                    keepModalOpen={keepModalOpen}
                    onKeepModalChange={setKeepModalOpen}
                />
            )}

            {/* Stationary Item Modal */}
            {isItemModalOpen && modalItem && productType === 'stationary' && (
                <StationaryItemModal
                    isOpen={isItemModalOpen}
                    onClose={cancelAddItem}
                    modalItem={modalItem}
                    editingItemIndex={editingItemIndex}
                    items={items}
                    categories={categories}
                    existingBrands={filteredBrands}
                    mainStockCategory={mainStockCategory}
                    mainStockBrand={mainStockBrand}
                    mainStockItemName={mainStockItemName}
                    onMainStockCategoryChange={setMainStockCategory}
                    onMainStockBrandChange={setMainStockBrand}
                    onMainStockItemNameChange={setMainStockItemName}
                    onModalItemChange={setModalItem}
                    onConfirm={confirmAddItem}
                    onCancel={cancelAddItem}
                    itemSearchQuery={itemSearchQuery}
                    onItemSearchChange={setItemSearchQuery}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    filteredProducts={filteredProducts}
                    onSelectProduct={selectItem}
                    currentProducts={currentProducts}
                    onCreateProductClick={() => setIsProductQuickCreateModalOpen(true)}
                    keepModalOpen={keepModalOpen}
                    onKeepModalChange={setKeepModalOpen}
                />
            )}

            {/* Item Selection Modal */}
            {/* {isItemSelectionModalOpen && (
                <ItemSelectionModal
                    isOpen={isItemSelectionModalOpen}
                    onClose={() => setIsItemSelectionModalOpen(false)}
                    filteredProducts={filteredProducts}
                    itemSearchQuery={itemSearchQuery}
                    selectedCategory={selectedCategory}
                    categories={categories}
                    selectedItemIndex={selectedItemIndex}
                    onSearchChange={setItemSearchQuery}
                    onCategoryChange={setSelectedCategory}
                    onClearFilters={() => {
                        setItemSearchQuery('');
                        setSelectedCategory('ALL_CATEGORIES');
                    }}
                    onSelectItem={selectItem}
                />
            )} */}

            {/* Product Quick Create Modal */}
            <ProductQuickCreateModal
                isOpen={isProductQuickCreateModalOpen}
                onClose={() => setIsProductQuickCreateModalOpen(false)}
                onProductCreated={(product) => {
                    // Add newly created product to the products list
                    setCurrentProducts(prev => [product, ...prev]);
                    // Auto-select the new product in the modal
                    selectItem(product);
                    // Close the quick create modal
                    setIsProductQuickCreateModalOpen(false);
                }}
                categories={categories}
                existingBrands={existingBrands}
                stockLocationType={stockLocationType}
                prefilledCategory={selectedCategory !== 'ALL_CATEGORIES' ? selectedCategory : ''}
                prefilledSupplierAccKy={selectedSupplier?.acc_ky ?? null}
                prefilledSupplierName={selectedSupplier?.name ?? ''}
            />
        </AppSidebarLayout>
    );
}
