import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { t, setLanguage, getLanguage } from '@/lib/i18n';
import { Head, router, usePage, Link } from '@inertiajs/react';
import React, { useEffect, useState, useReducer } from 'react';
import { toast } from 'sonner';
import AppSidebarLayout from '../../../layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { TrendingUp, Package, Settings, Plus, Edit, ArrowLeft, X, Barcode, Trash2, CreditCard } from 'lucide-react';
import ConfirmationModal from '@/components/ui/confirmation-modal';

interface ItemOption {
    id: number;
    name: string;
    code: string;
}

interface CategoryOption {
    cname: string;
    id: string;
    name: string;
}

interface SupplierOption {
    AdrKy: number;
    AccKy: any;
    full_name: any;
    FstNm: any;
    id: number;
    name: string;
}

interface UnitOption {
    id: number;
    name: string;
}

interface BrandOption {
    id: number;
    code: string;
    name: string;
    description?: string;
}

interface ItemCodeOption {
    id: number;
    code: string;
    name: string;
    categoryName?: string;
}

interface Product {
    ItmKy: number;
    fInAct?: boolean;
    Status?: string;
    ItemCode: string;
    BarCode?: string;
    batch_no?: string;
    brand_id?: number;
    brand?: string; // Keep for backward compatibility
    model?: string;
    serial_number?: string;
    warranty?: string;
    ItmNm: string;
    catkey?: string;
    UnitKy?: number;
    CosPri?: number;
    NewCostPrice?: number;
    VehicleSalePrice?: number;
    WholePrice?: number;
    ReOrdlLvl?: number;
    SupKey?: number;
    RtQty1?: number;
    RtDis1?: number;
    RtQty2?: number;
    RtDis2?: number;

    CredQty1?: number;
    CredDis1?: number;
    CredQty2?: number;
    CredDis2?: number;

    SlsPri?: number;
    VATItem?: boolean;
    is_service?: boolean;
    branch_code?: string;
    company_code?: string;
    available_business_units?: string[];
    free_issue_scheme_buy_qty?: number;
    free_issue_scheme_get_qty?: number;

    transfer_unit_id?: number;
    receiving_unit_id?: number;
    transfer_conversion_factor?: number;
    category?: any;
    ScallItem?: boolean;
    RtDisType1?: string;
}

interface PriceHistory {
    ItemPriceKey: number;
    ItmKy: number;
    CosPri?: number;
    SlsPri?: number;
    WholePrice?: number;
    VehicleSalePrice?: number;
    ChangedDate?: string;
    RtQty1?: number;
    RtDis1?: number;
    RtQty2?: number;
    RtDis2?: number;
    CredQty1?: number;
    CredDis1?: number;
    CredQty2?: number;
    CredDis2?: number;
}

interface Branch {
    id: string;
    branch_code: string;
    name: string;
}

interface CreateProps {
    product?: Product;
    priceHistory?: PriceHistory[];
    branches?: Branch[];
    suppliers?: SupplierOption[];
    categories?: CategoryOption[];
    units?: UnitOption[];
    userBranchCode?: string;
    canViewAllBranches?: boolean;
    canManageReorderLevels?: boolean;
    nextItemCode?: string;
    flash?: {
        success?: string;
        error?: string;
    };
    canDelete?: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('product.titles.productManagement'),
        href: '/products',
    },
    {
        title: t('Create Product'),
        href: '#',
    },
];

const Create: React.FC<CreateProps> = ({
    product,
    priceHistory,
    branches = [],

    suppliers = [],
    categories = [],
    units = [],
    userBranchCode = '',
    canViewAllBranches = false,
    canManageReorderLevels = true,
    nextItemCode = '',
    flash,
    canDelete,
}) => {
    const { auth } = usePage().props as any;
    const [currentLang, setCurrentLang] = useState(getLanguage());
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const [isLimitReached, setIsLimitReached] = useState(false);

    useEffect(() => {
        // Only check limit if we are creating a new product (not editing)
        if (!product) {
            const company = auth?.user?.company;
            if (company?.package_details?.max_products) {
                const maxProducts = company.package_details.max_products;
                const currentProducts = company.current_products_count || 0;

                if (currentProducts >= maxProducts) {
                    setIsLimitReached(true);
                    toast.error(
                        t('You have reached the maximum number of products allowed for your package ', {
                            limit: maxProducts,
                        }),
                        {
                            duration: Infinity,
                            description: t('Please upgrade your package to add more products.'),

                        }
                    );
                }
            }
        }
    }, [auth, product]);

    const initialFormState = {
        fInAct: 'false', // false = Active, true = Inactive (default to Active)
        Status: '',
        ItmKy: '',
        ItemCode: '',
        BarCode: '',
        batch_no: '',
        brand_id: '',
        brand: '',
        model: '',
        serial_number: '',
        warranty: '',
        ItmNm: '',
        catkey: '',
        UnitKy: '',
        CosPri: '',
        NewCostPrice: '',
        VehicleSalePrice: '',
        WholePrice: '',
        ReOrdlLvl: '',
        SupKey: '',
        RtQty1: '',
        RtDis1: '',
        RtQty2: '',
        RtDis2: '',

        CredQty1: '',
        CredDis1: '',
        CredQty2: '',
        CredDis2: '',

        SlsPri: '',
        VATItem: 'false',
        is_service: 'false',
        branch_code: userBranchCode || '',
        share_with_other_unit: false,
        free_issue_scheme_buy_qty: '',
        free_issue_scheme_get_qty: '',

        transfer_unit_id: '',
        receiving_unit_id: '',
        transfer_conversion_factor: '',
        ScallItem: 'false',
        RtDisType1: 'fixed',
    };

    // Initialize form with product data if provided (edit mode)
    const getInitialFormState = () => {
        if (product) {
            const isActive = !product.fInAct; // fInAct = true means inactive, false means active
            return {
                fInAct: product.fInAct ? 'true' : 'false',
                Status: isActive ? 'Active' : 'Inactive',
                ItmKy: product.ItmKy?.toString() || '',
                ItemCode: product.ItemCode || '',
                BarCode: product.BarCode || '',
                batch_no: product.batch_no || '',
                brand_id: product.brand_id?.toString() || '',
                brand: product.brand || '',
                model: product.model || '',
                serial_number: product.serial_number || '',
                warranty: product.warranty || '',
                ItmNm: product.ItmNm || '',
                catkey: product.catkey || '',
                UnitKy: product.UnitKy?.toString() || '',
                CosPri: product.CosPri && product.CosPri !== 0 ? parseFloat(product.CosPri.toString()).toFixed(2) : '',
                NewCostPrice: product.NewCostPrice && product.NewCostPrice !== 0 ? parseFloat(product.NewCostPrice.toString()).toFixed(2) : '',
                VehicleSalePrice: product.VehicleSalePrice && product.VehicleSalePrice !== 0 ? parseFloat(product.VehicleSalePrice.toString()).toFixed(2) : '',
                WholePrice: product.WholePrice && product.WholePrice !== 0 ? parseFloat(product.WholePrice.toString()).toFixed(2) : '',
                ReOrdlLvl: product.ReOrdlLvl?.toString() || '',
                SupKey: product.SupKey?.toString() || '',
                RtQty1: product.RtQty1 && product.RtQty1 !== 0 ? Number(product.RtQty1).toString() : '',
                RtDis1: product.RtDis1 && product.RtDis1 !== 0 ? parseFloat(product.RtDis1.toString()).toFixed(2) : '',
                RtQty2: product.RtQty2 && product.RtQty2 !== 0 ? Number(product.RtQty2).toString() : '',
                RtDis2: product.RtDis2 && product.RtDis2 !== 0 ? parseFloat(product.RtDis2.toString()).toFixed(2) : '',

                CredQty1: product.CredQty1 && product.CredQty1 !== 0 ? Number(product.CredQty1).toString() : '',
                CredDis1: product.CredDis1 && product.CredDis1 !== 0 ? parseFloat(product.CredDis1.toString()).toFixed(2) : '',
                CredQty2: product.CredQty2 && product.CredQty2 !== 0 ? Number(product.CredQty2).toString() : '',
                CredDis2: product.CredDis2 && product.CredDis2 !== 0 ? parseFloat(product.CredDis2.toString()).toFixed(2) : '',

                SlsPri: product.SlsPri && product.SlsPri !== 0 ? parseFloat(product.SlsPri.toString()).toFixed(2) : '',
                VATItem: product.VATItem ? 'true' : 'false',
                is_service: product.is_service ? 'true' : 'false',
                branch_code: product.branch_code || userBranchCode || '',
                share_with_other_unit: product.available_business_units ? (
                    (auth?.user?.company_code?.toUpperCase().startsWith('MAL') && product.available_business_units.includes('vismass')) ||
                    (!auth?.user?.company_code?.toUpperCase().startsWith('MAL') && product.available_business_units.includes('malibo'))
                ) : false,
                free_issue_scheme_buy_qty: product.free_issue_scheme_buy_qty && product.free_issue_scheme_buy_qty !== 0 ? product.free_issue_scheme_buy_qty.toString() : '',
                free_issue_scheme_get_qty: product.free_issue_scheme_get_qty && product.free_issue_scheme_get_qty !== 0 ? product.free_issue_scheme_get_qty.toString() : '',

                transfer_unit_id: product.transfer_unit_id?.toString() || '',
                receiving_unit_id: product.receiving_unit_id?.toString() || '',
                transfer_conversion_factor: product.transfer_conversion_factor && product.transfer_conversion_factor !== 0 ? parseFloat(product.transfer_conversion_factor.toString()).toString() : '',
                ScallItem: product.ScallItem ? 'true' : 'false',
                RtDisType1: product.RtDisType1 || 'fixed',
            };
        }
        // For new products, use the auto-generated ItemCode
        return { ...initialFormState, ItemCode: nextItemCode || '' };
    };

    const [form, setForm] = useState(getInitialFormState());
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState('');
    const [isEditMode, setIsEditMode] = useState(!!product); // Set edit mode based on product prop

    // track whether user manually picked a sending unit; once set we stop auto-syncing
    const [userPickedSending, setUserPickedSending] = useState<boolean>(
        !!(product && product.transfer_unit_id),
    );
    const [baseItemData, setBaseItemData] = useState<Product | null>(product || null);

    const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>(
        categories,
    );
    const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>(
        suppliers,
    );
    const [unitOptions, setUnitOptions] = useState<UnitOption[]>(units);
    const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
    const [itemCodeOptions, setItemCodeOptions] = useState<ItemCodeOption[]>(
        [],
    );

    // Log initial units passed from backend
    useEffect(() => {
        console.log('Initial units prop from backend:', units);
        console.log('Initial unitOptions state:', unitOptions);
        console.log('Number of units:', units?.length || 0);
    }, []);

    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
        setCurrentLang(lang);
        forceUpdate(); // Force re-render to update translations
    };
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [saveToPrice, setSaveToPrice] = useState(isEditMode); // Default to true in edit mode
    const [currentPriceHistory, setCurrentPriceHistory] = useState<
        PriceHistory[]
    >(priceHistory || []);
    const [selectedPriceHistory, setSelectedPriceHistory] =
        useState<PriceHistory | null>(null); // Track selected price history for editing
    const [currentReorderLevel, setCurrentReorderLevel] = useState<number>(0);
    const [hasReorderLevel, setHasReorderLevel] = useState<boolean>(false);
    const [reorderLevelId, setReorderLevelId] = useState<number | null>(null);
    const [selectedBranchForReorder, setSelectedBranchForReorder] =
        useState<string>(userBranchCode || '');
    const [showPriceSelection, setShowPriceSelection] =
        useState<boolean>(false);
    const [availablePrices, setAvailablePrices] = useState<PriceHistory[]>([]);
    const [showItemSelection, setShowItemSelection] = useState<boolean>(false);
    const [availableItems, setAvailableItems] = useState<Product[]>([]);
    const [deleteModal, setDeleteModal] = useState<{
        show: boolean;
        product: Product | null;
    }>({
        show: false,
        product: null,
    });
    const [justCreated, setJustCreated] = useState<boolean>(false); // Track if item was just created

    const [batchOptions, setBatchOptions] = useState<string[]>([]);

    const { ziggy } = usePage().props;

    const fetchDropdownData = async () => {
        try {
            setLoading(true);

            const headers: Record<string, string> = {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };

            const csrfToken = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');
            if (csrfToken) {
                headers['X-CSRF-TOKEN'] = csrfToken;
            }

            const fetchOptions: RequestInit = {
                headers,
                credentials: 'include' as RequestCredentials,
            };

            const endpoints = [
                {
                    url: '/pos/api/categories',
                    setter: setCategoryOptions,
                    fallback: [],
                },
                {
                    url: '/pos/api/units',
                    setter: setUnitOptions,
                    fallback: [],
                },
            ];

            const fetchPromises = endpoints.map(
                async ({ url, setter, fallback }) => {
                    const cacheKey = url.replace('/pos/api/', '').replace('/', '_') + '_cache_v6';
                    const cached = localStorage.getItem(cacheKey);

                    // Use shorter cache duration for categories and units (5 minutes) since they can be added frequently
                    const cacheDuration = (url.includes('categories') || url.includes('units')) ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min for categories/units, 1 hour for others

                    if (cached) {
                        try {
                            const { data, timestamp } = JSON.parse(cached);
                            if (Date.now() - timestamp < cacheDuration) {
                                setter(data);
                                console.log(`Loaded from cache: ${url}`, data);
                                return data;
                            }
                        } catch (error) {
                            console.error('Error parsing cache:', error);
                        }
                    }
                    try {
                        console.log(`Fetching from: ${url}`);
                        const response = await fetch(url, fetchOptions);

                        if (!response.ok) {
                            console.warn(
                                `API ${url} failed: ${response.status}`,
                            );
                            setter(fallback);
                            return null;
                        }

                        const data = await response.json();

                        let safeData;
                        if (Array.isArray(data)) {
                            safeData = data;
                        } else if (Array.isArray(data?.data)) {
                            safeData = data.data;
                        } else {
                            safeData = fallback;
                        }

                        setter(safeData);
                        // Cache the data
                        localStorage.setItem(cacheKey, JSON.stringify({ data: safeData, timestamp: Date.now() }));
                        console.log(`Data from ${url}:`, safeData);
                        if (url.includes('units')) {
                            console.log('Units fetched:', safeData.length, 'units');
                            console.log('Unit details:', safeData);
                        }
                        return safeData;
                    } catch (error) {
                        console.error(`Error fetching ${url}:`, error);
                        setter(fallback);
                        return null;
                    }
                },
            );

            await Promise.all(fetchPromises);
        } catch (error) {
            console.error('Error in fetchDropdownData:', error);
            setMessage(
                'Failed to load dropdown data. Some features may not work properly.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDropdownData();
    }, []);

    // Function to manually refresh dropdown data (clears cache and refetches)
    const refreshDropdownData = () => {
        // Clear all cached dropdown data
        const cacheKeys = ['categories_cache_v6', 'units_cache_v6'];
        cacheKeys.forEach(key => localStorage.removeItem(key));

        // Refetch data
        fetchDropdownData();
        toast.success('Dropdown data refreshed successfully');
    };

    // Fetch reorder level for current item code and selected branch
    const fetchReorderLevel = async (itemCode: string, branchCode: string) => {
        if (!itemCode || !branchCode) {
            setCurrentReorderLevel(0);
            setHasReorderLevel(false);
            setReorderLevelId(null);
            return;
        }

        try {
            const response = await fetch(
                `/pos/api/reorder-level-check?item_code=${itemCode}&branch_code=${branchCode}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                },
            );

            if (response.ok) {
                const data = await response.json();
                setCurrentReorderLevel(data.reorder_level || 0);
                setHasReorderLevel(data.exists || false);
                setReorderLevelId(data.id || null);

                // Update form with the reorder level
                setForm((prev) => ({
                    ...prev,
                    ReOrdlLvl: data.reorder_level?.toString() || '0',
                }));
            }
        } catch (error) {
            console.error('Error fetching reorder level:', error);
            setCurrentReorderLevel(0);
            setHasReorderLevel(false);
            setReorderLevelId(null);
        }
    };

    // Fetch reorder level when item code or selected branch changes
    useEffect(() => {
        if (form.ItemCode && selectedBranchForReorder) {
            // fetchReorderLevel(form.ItemCode, selectedBranchForReorder); // API route not implemented
        }
    }, [form.ItemCode, selectedBranchForReorder]);

    // Fetch batches when ItemCode changes
    useEffect(() => {
        if (form.ItemCode) {
            fetchBatches(form.ItemCode);
            // If we already have a batch number (e.g. in edit mode), load its prices
            if (form.batch_no) {
                fetchPricesForBatch(form.ItemCode, form.batch_no);
            }
        } else {
            setBatchOptions([]);
        }
    }, [form.ItemCode]);

    const fetchBatches = async (itemCode: string) => {
        try {
            const response = await fetch(
                `/pos/products/get-batches?item_code=${itemCode}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                },
            );

            if (response.ok) {
                const batches = await response.json();
                setBatchOptions(batches);
            } else {
                setBatchOptions([]);
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            setBatchOptions([]);
        }
    };

    const fetchPricesForBatch = async (itemCode: string, batchNo: string) => {
        try {
            const timestamp = new Date().getTime();
            const response = await fetch(
                `/pos/products/get-prices-for-batch?item_code=${encodeURIComponent(itemCode)}&batch_no=${encodeURIComponent(batchNo)}&_t=${timestamp}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include',
                },
            );

            if (response.ok) {
                const priceData = await response.json();
                if (priceData && Object.keys(priceData).length > 0) {
                    setForm((prev) => ({
                        ...prev,
                        CosPri: priceData.CosPri != null ? parseFloat(priceData.CosPri.toString()).toFixed(2) : (baseItemData?.CosPri != null ? parseFloat(baseItemData.CosPri.toString()).toFixed(2) : prev.CosPri),
                        NewCostPrice: priceData.NewCostPrice != null ? parseFloat(priceData.NewCostPrice.toString()).toFixed(2) : prev.NewCostPrice,
                        SlsPri: priceData.SlsPri != null ? parseFloat(priceData.SlsPri.toString()).toFixed(2) : (baseItemData?.SlsPri != null ? parseFloat(baseItemData.SlsPri.toString()).toFixed(2) : prev.SlsPri),
                        WholePrice: priceData.WholePrice != null ? parseFloat(priceData.WholePrice.toString()).toFixed(2) : (baseItemData?.WholePrice != null ? parseFloat(baseItemData.WholePrice.toString()).toFixed(2) : prev.WholePrice),
                        VehicleSalePrice: priceData.VehicleSalePrice != null ? parseFloat(priceData.VehicleSalePrice.toString()).toFixed(2) : (baseItemData?.VehicleSalePrice != null ? parseFloat(baseItemData.VehicleSalePrice.toString()).toFixed(2) : prev.VehicleSalePrice),
                        RtQty1: priceData.RtQty1 != null ? Number(priceData.RtQty1).toString() : (baseItemData?.RtQty1 != null ? Number(baseItemData.RtQty1).toString() : ''),
                        RtDis1: priceData.RtDis1 != null ? parseFloat(priceData.RtDis1.toString()).toFixed(2) : (baseItemData?.RtDis1 != null ? parseFloat(baseItemData.RtDis1.toString()).toFixed(2) : '0.00'),
                        RtQty2: priceData.RtQty2 != null ? Number(priceData.RtQty2).toString() : (baseItemData?.RtQty2 != null ? Number(baseItemData.RtQty2).toString() : ''),
                        RtDis2: priceData.RtDis2 != null ? parseFloat(priceData.RtDis2.toString()).toFixed(2) : (baseItemData?.RtDis2 != null ? parseFloat(baseItemData.RtDis2.toString()).toFixed(2) : '0.00'),
                        CredQty1: priceData.CredQty1 != null ? Number(priceData.CredQty1).toString() : (baseItemData?.CredQty1 != null ? Number(baseItemData.CredQty1).toString() : ''),
                        CredDis1: priceData.CredDis1 != null ? parseFloat(priceData.CredDis1.toString()).toFixed(2) : (baseItemData?.CredDis1 != null ? parseFloat(baseItemData.CredDis1.toString()).toFixed(2) : '0.00'),
                        CredQty2: priceData.CredQty2 != null ? Number(priceData.CredQty2).toString() : (baseItemData?.CredQty2 != null ? Number(baseItemData.CredQty2).toString() : ''),
                        CredDis2: priceData.CredDis2 != null ? parseFloat(priceData.CredDis2.toString()).toFixed(2) : (baseItemData?.CredDis2 != null ? parseFloat(baseItemData.CredDis2.toString()).toFixed(2) : '0.00'),
                        RtDisType1: priceData.RtDisType1 || (baseItemData?.RtDisType1 ?? prev.RtDisType1),

                    }));
                    setMessage(`Loaded prices for batch ${batchNo}`);
                    toast.dismiss('batch-price-loading');
                    toast.success(t('Prices loaded for batch') + ' ' + batchNo);
                    setTimeout(() => setMessage(''), 500);
                } else {
                    if (isEditMode && product) {
                        // In edit mode, if no special batch prices are found, keep the original product prices
                        setForm((prev) => ({
                            ...prev,
                            CosPri: product.CosPri ? parseFloat(product.CosPri.toString()).toFixed(2) : '0.00',
                            SlsPri: product.SlsPri ? parseFloat(product.SlsPri.toString()).toFixed(2) : '0.00',
                            WholePrice: product.WholePrice ? parseFloat(product.WholePrice.toString()).toFixed(2) : '0.00',
                            VehicleSalePrice: product.VehicleSalePrice ? parseFloat(product.VehicleSalePrice.toString()).toFixed(2) : '0.00',
                            RtQty1: '',
                            RtDis1: '0.00',
                            RtQty2: '',
                            RtDis2: '0.00',
                            CredQty1: '',
                            CredDis1: '0.00',
                            CredQty2: '',
                            CredDis2: '0.00',
                            RtDisType1: product.RtDisType1 || 'fixed',

                        }));
                        toast.dismiss('batch-price-loading');
                        setMessage(`No specific pricing found for batch ${batchNo}. Using product defaults.`);
                    } else {
                        // No price data found for this batch - reset price fields but keep the batch no
                        setForm((prev) => ({
                            ...prev,
                            CosPri: '0.00',
                            SlsPri: '0.00',
                            WholePrice: '0.00',
                            VehicleSalePrice: '0.00',
                            RtQty1: '',
                            RtDis1: '0.00',
                            RtQty2: '',
                            RtDis2: '0.00',
                            CredQty1: '',
                            CredDis1: '0.00',
                            CredQty2: '',
                            CredDis2: '0.00',
                            RtDisType1: prev.RtDisType1 || 'fixed',

                        }));
                        toast.dismiss('batch-price-loading');
                        setMessage(`No pricing found for batch ${batchNo}. Please enter prices manually.`);
                    }
                }
            }
        } catch (error) {
            toast.dismiss('batch-price-loading');
            console.error('Error fetching prices for batch:', error);
            toast.error(t('Failed to fetch prices for batch'));
        }
    };

    // Initialize selected branch on mount
    useEffect(() => {
        if (userBranchCode && !selectedBranchForReorder) {
            setSelectedBranchForReorder(userBranchCode);
        }
    }, [userBranchCode]);

    const handleManualItemCodeChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        setForm({
            ...form,
            ItemCode: e.target.value,
        });
    };

    const handleItemNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({
            ...prev,
            ItmNm: e.target.value,
        }));
    };

    const handleItemCodeSelect = async (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const selectedCode = e.target.value;

        if (!selectedCode) {
            clearForm();
            return;
        }

        const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
        const cacheKey = 'item_details_' + selectedCode;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    // Use cached data
                    const newForm = { ...form };
                    const priceFields = ['CosPri', 'VehicleSalePrice', 'WholePrice', 'RtDis1', 'RtDis2', 'SlsPri'];
                    for (const key in form) {
                        if (key in data) {
                            const value = data[key];
                            if (value !== null) {
                                if (priceFields.includes(key)) {
                                    newForm[key as keyof typeof form] = parseFloat(String(value)).toFixed(2);
                                } else {
                                    newForm[key as keyof typeof form] = String(value);
                                }
                            } else {
                                newForm[key as keyof typeof form] = '';
                            }
                        }
                    }
                    setForm(newForm);

                    // Check if this is a PRN item (printer)
                    if (selectedCode.toUpperCase().startsWith('PRN')) {
                        setMessage('⚠️ This is a Printer item (PRN prefix). Printers must be managed through the Printer Registration section, not here.');
                    } else {
                        setMessage('Item loaded successfully.');
                    }
                    setIsEditMode(true);
                    setSearching(false);
                    return;
                }
            } catch (error) {
                console.error('Error parsing cache:', error);
            }
        }

        try {
            setSearching(true);
            setMessage('Loading item...');

            const response = await fetch(
                `/pos/api/item-details/${selectedCode}`,
            );
            const data = await response.json();

            if (response.ok && data) {
                const newForm = { ...form };
                const priceFields = ['CosPri', 'VehicleSalePrice', 'WholePrice', 'SlsPri'];
                const discountFields = ['RtDis1', 'RtDis2'];
                for (const key in form) {
                    if (key in data) {
                        const value = data[key];
                        if (value !== null) {
                            if (priceFields.includes(key)) {
                                newForm[key as keyof typeof form] = parseFloat(String(value)).toFixed(2);
                            } else if (discountFields.includes(key)) {
                                newForm[key as keyof typeof form] = parseFloat(String(value)).toFixed(2);
                            } else {
                                newForm[key as keyof typeof form] = String(value);
                            }
                        } else {
                            newForm[key as keyof typeof form] = '';
                        }
                    }
                }
                setForm(newForm);
                // Cache the data
                localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));

                // If the item has a batch_no, fetch its prices
                if (data.batch_no) {
                    fetchPricesForBatch(data.ItemCode, data.batch_no);
                }

                // Check if this is a PRN item (printer)
                if (data.ItemCode && data.ItemCode.toUpperCase().startsWith('PRN')) {
                    setMessage('⚠️ This is a Printer item (PRN prefix). Printers must be managed through the Printer Registration section, not here.');
                } else {
                    setMessage('Item loaded successfully.');
                }
                setIsEditMode(true);
            } else {
                setMessage('Item not found.');
                setIsEditMode(false);
            }
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                setMessage('Error occurred while fetching data.');
            }
            setIsEditMode(false);
        } finally {
            setSearching(false);
        }
    };

    const handleItemNameSelect = async (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const selectedName = e.target.value;

        setForm((prev) => ({
            ...prev,
            ItmNm: selectedName,
        }));

        if (!selectedName) {
            setMessage('');
            setIsEditMode(false);
            return;
        }

        try {
            setSearching(true);
            setMessage('Loading item...');

            const selectedItem = itemOptions.find(
                (item) => item.name === selectedName,
            );

            if (selectedItem && selectedItem.code) {
                const response = await fetch(
                    `/pos/api/item-details/${selectedItem.code}`,
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data) {
                    const newForm = { ...initialFormState };
                    const priceFields = ['CosPri', 'VehicleSalePrice', 'WholePrice', 'SlsPri'];
                    const discountFields = ['RtDis1', 'RtDis2'];

                    for (const key in newForm) {
                        if (
                            key in data &&
                            data[key] !== null &&
                            data[key] !== undefined
                        ) {
                            if (priceFields.includes(key)) {
                                (newForm as any)[key] = parseFloat(String(data[key])).toFixed(2);
                            } else if (discountFields.includes(key)) {
                                (newForm as any)[key] = parseFloat(String(data[key])).toFixed(2);
                            } else if (key !== 'share_with_other_unit') {
                                (newForm as any)[key] = String(data[key]);
                            }
                        }
                    }

                    setForm(newForm);
                    toast.success('Item loaded successfully.');
                    setIsEditMode(true);
                } else {
                    toast.error('Item not found.');
                    setIsEditMode(false);
                }
            } else {
                toast.error(t('product.messages.itemNotFound'));
                setIsEditMode(false);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error occurred while fetching data.');
            setIsEditMode(false);
        } finally {
            setSearching(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;

        // if user modifies the sending unit dropdown explicitly, remember it
        if (name === 'transfer_unit_id') {
            setUserPickedSending(true);
        }

        // Special handling for Status field to sync with fInAct
        if (name === 'Status') {
            setForm(prev => ({
                ...prev,
                Status: value,
                fInAct: value === 'Active' ? 'false' : 'true',
            }));
        } else {
            setForm(prev => ({
                ...prev,
                [name]: value,
            }));
        }

        // If batch_no changed, fetch prices for that batch immediately
        if (name === 'batch_no' && value) {
            // Use form.ItemCode if available, otherwise it's a new product without code yet
            if (form.ItemCode) {
                toast.loading(t('Fetching prices for batch...') + ' ' + value, { id: 'batch-price-loading' });
                fetchPricesForBatch(form.ItemCode, value);
            }
        }
    };

    const handleSelectItem = async (item: Product) => {
        setShowItemSelection(false);
        setAvailableItems([]);
        setSearching(true);
        // setIsEditMode(false); // Removed to avoid flickering if already in edit mode

        try {
            // First load the basic item data
            const newForm = { ...initialFormState };
            const priceFields = ['CosPri', 'ExtraPrice', 'WholePrice', 'SlsPri'];
            const discountFields = ['RtDis1', 'RtDis2'];
            for (const key in newForm) {
                if (
                    key in item &&
                    (item as any)[key] !== null &&
                    (item as any)[key] !== undefined
                ) {
                    if (priceFields.includes(key)) {
                        (newForm as any)[key] = parseFloat(String((item as any)[key])).toFixed(2);
                    } else if (discountFields.includes(key)) {
                        (newForm as any)[key] = parseFloat(String((item as any)[key])).toFixed(2);
                    } else if (key !== 'share_with_other_unit') {
                        (newForm as any)[key] = String((item as any)[key]);
                    }
                }
            }
            setForm(newForm);
            setBaseItemData(item);

            // If the item has a batch_no, fetch its prices
            if (item.batch_no) {
                fetchPricesForBatch(item.ItemCode, item.batch_no);
            }

            // Check if this is a PRN item (printer)
            if (item.ItemCode && item.ItemCode.toUpperCase().startsWith('PRN')) {
                toast.error('⚠️ This is a Printer item (PRN prefix). Printers must be managed through the Printer Registration section, not here.');
                setIsEditMode(false);
                setSearching(false);
                return;
            }

            // Fetch price history for this item
            try {
                const priceCacheKey = 'price_history_' + item.ItmKy;
                const priceCached = localStorage.getItem(priceCacheKey);
                let priceData;

                if (priceCached) {
                    try {
                        const { data: cachedPriceData, timestamp } = JSON.parse(priceCached);
                        if (Date.now() - timestamp < 60 * 60 * 1000) { // 1 hour
                            priceData = cachedPriceData;
                        }
                    } catch (error) {
                        console.error('Error parsing price cache:', error);
                    }
                }

                if (!priceData) {
                    const priceResponse = await fetch(
                        `/pos/api/price-history/${item.ItmKy}`,
                        {
                            headers: {
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'include',
                        },
                    );

                    if (priceResponse.ok) {
                        priceData = await priceResponse.json();
                        // Cache the price data
                        localStorage.setItem(priceCacheKey, JSON.stringify({ data: priceData, timestamp: Date.now() }));
                    }
                }

                if (priceData) {
                    const prices = Array.isArray(priceData) ? priceData : [];

                    if (prices.length > 0) {
                        const sortedPrices = prices.sort((a, b) =>
                            new Date(b.ChangedDate || 0).getTime() - new Date(a.ChangedDate || 0).getTime()
                        );

                        setCurrentPriceHistory(sortedPrices);

                        if (prices.length > 1) {
                            setMessage(`Item loaded successfully. ${prices.length} price records found. Select a batch to view specific pricing.`);
                        } else {
                            setMessage(`Item loaded successfully. 1 price record found. Select a batch to view specific pricing.`);
                            toast.success(t('product.messages.itemLoaded'));
                        }
                    } else {
                        toast.success(t('product.messages.itemLoaded'));
                    }
                } else {
                    toast.success(t('product.messages.itemLoaded'));
                }
            } catch (priceError) {
                console.error('Error fetching price history:', priceError);
                toast.success(t('product.messages.itemLoaded'));
            }

            setIsEditMode(true);

            // Update URL to the edit route without reloading the page
            if (!window.location.pathname.includes('/edit')) {
                window.history.pushState({}, '', `/pos/products/${item.ItmKy}/edit`);
            }
        } catch (error) {
            console.error('Error loading item data:', error);
            toast.error('Failed to load item details');
        } finally {
            setSearching(false);
        }
    };

    const handleDelete = () => {
        if (product) {
            setDeleteModal({ show: true, product: product });
        }
    };

    const confirmDelete = () => {
        if (deleteModal.product) {
            router.delete(`/pos/products/${deleteModal.product.ItmKy}`, {
                onSuccess: () => {
                    setDeleteModal({ show: false, product: null });
                },
                onError: () => {
                    setDeleteModal({ show: false, product: null });
                },
            });
        }
    };

    const handleSearch = async () => {
        if (!form.ItemCode && !form.ItmNm && !form.BarCode) {
            toast.error(t('product.messages.enterCodeOrName'));
            return;
        }

        setSearching(true);
        toast(t('product.messages.searching'));

        try {
            const searchTerm = form.ItemCode || form.ItmNm || form.BarCode;
            const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
            const cacheKey = 'search_' + searchTerm;
            const cached = localStorage.getItem(cacheKey);
            let data;

            if (cached) {
                try {
                    const { itemData, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_DURATION) {
                        data = { item: itemData };
                    }
                } catch (error) {
                    console.error('Error parsing search cache:', error);
                }
            }

            if (!data) {
                // Use fetch with proper headers for API call
                const response = await fetch(
                    `/pos/products/search?search_term=${encodeURIComponent(searchTerm)}`,
                    {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRF-TOKEN':
                                document
                                    .querySelector('meta[name="csrf-token"]')
                                    ?.getAttribute('content') || '',
                        },
                        credentials: 'same-origin',
                    },
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                data = await response.json();

                // Cache the item data - only if single item found to keep cache simple
                if (data && data.items && data.items.length === 1) {
                    localStorage.setItem(cacheKey, JSON.stringify({ itemData: data.items[0], timestamp: Date.now() }));
                }
            }

            if (data && data.items && data.items.length > 0) {
                if (data.items.length > 1) {
                    // Multiple items found - show selection modal
                    setAvailableItems(data.items);
                    setShowItemSelection(true);
                    toast.success(`${data.items.length} products found with this barcode.`);
                } else {
                    // Exactly one item found
                    handleSelectItem(data.items[0]);
                }
            } else if (data && data.item) {
                // Fallback for cached data or legacy API structure
                handleSelectItem(data.item);
            } else {
                toast.error(t('product.messages.itemNotFound'));
                setIsEditMode(false);
            }
        } catch (error) {
            console.error(error);
            setMessage(t('item code not found you can add'));
            setIsEditMode(false);
        } finally {
            setSearching(false);
        }
    };

    const generateBarCode = () => {
        const timestamp = Date.now().toString();
        let barCode = timestamp;
        if (barCode.length > 13) {
            barCode = barCode.substring(0, 13);
        } else if (barCode.length < 13) {
            const remainingLength = 13 - barCode.length;
            const randomArray = new Uint32Array(1);
            window.crypto.getRandomValues(randomArray);
            const randomDigits = (randomArray[0] % Math.pow(10, remainingLength))
                .toString()
                .padStart(remainingLength, '0');
            barCode += randomDigits;
        }

        setForm({
            ...form,
            BarCode: barCode,
        });
    };

    const handleDeletePriceHistory = async (priceHistoryId: number) => {
        if (
            !confirm(
                'Is it okay to delete this price record? This cannot be undone..',
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                `/pos/products/delete-price-history/${priceHistoryId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN':
                            document
                                .querySelector('meta[name="csrf-token"]')
                                ?.getAttribute('content') || '',
                    },
                },
            );

            if (response.ok) {
                // Remove the deleted record from the current state
                setCurrentPriceHistory((prev) =>
                    prev.filter(
                        (record) => record.ItemPriceKey !== priceHistoryId,
                    ),
                );
                setMessage('Price record successfully deleted.');
                setTimeout(() => setMessage(''), 3000);
            } else {
                throw new Error('Failed to delete price record');
            }
        } catch (error) {
            console.error('Delete error:', error);
            setMessage('Error deleting price record. Please try again.');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleSelectPriceHistory = (priceHistory: PriceHistory) => {
        // Populate form with selected price history data
        setForm((prev) => ({
            ...prev,
            CosPri: priceHistory.CosPri ? parseFloat(priceHistory.CosPri.toString()).toFixed(2) : '',
            SlsPri: priceHistory.SlsPri ? parseFloat(priceHistory.SlsPri.toString()).toFixed(2) : '',
            WholePrice: priceHistory.WholePrice ? parseFloat(priceHistory.WholePrice.toString()).toFixed(2) : '',
            VehicleSalePrice: priceHistory.VehicleSalePrice ? parseFloat(priceHistory.VehicleSalePrice.toString()).toFixed(2) : '',
            RtQty1: priceHistory.RtQty1 ? Number(priceHistory.RtQty1).toString() : '0',
            RtDis1: priceHistory.RtDis1 ? parseFloat(priceHistory.RtDis1.toString()).toFixed(2) : '0',
            RtQty2: priceHistory.RtQty2 ? Number(priceHistory.RtQty2).toString() : '0',
            RtDis2: priceHistory.RtDis2 ? parseFloat(priceHistory.RtDis2.toString()).toFixed(2) : '0',
            CredQty1: priceHistory.CredQty1 ? Number(priceHistory.CredQty1).toString() : '0',
            CredDis1: priceHistory.CredDis1 ? parseFloat(priceHistory.CredDis1.toString()).toFixed(2) : '0',
            CredQty2: priceHistory.CredQty2 ? Number(priceHistory.CredQty2).toString() : '0',
            CredDis2: priceHistory.CredDis2 ? parseFloat(priceHistory.CredDis2.toString()).toFixed(2) : '0',
        }));
        setSelectedPriceHistory(priceHistory);
        setMessage(
            `Selected price record from ${new Date(priceHistory.ChangedDate || '').toLocaleDateString('en-GB')}. You can now update this specific price record.`,
        );
        setTimeout(() => setMessage(''), 5000);
    };



    const handleCancelPriceSelection = () => {
        setShowPriceSelection(false);
        setAvailablePrices([]);
        setMessage(t('product.messages.itemLoaded'));
    };

    const handleClearPriceSelection = () => {
        // Clear selection and reset form to current product data
        if (product) {
            setForm((prev) => ({
                ...prev,
                CosPri: product.CosPri ? parseFloat(product.CosPri.toString()).toFixed(2) : '',
                SlsPri: product.SlsPri ? parseFloat(product.SlsPri.toString()).toFixed(2) : '',
                WholePrice: product.WholePrice ? parseFloat(product.WholePrice.toString()).toFixed(2) : '',
                VehicleSalePrice: product.VehicleSalePrice ? parseFloat(product.VehicleSalePrice.toString()).toFixed(2) : '',
            }));
        }
        setSelectedPriceHistory(null);
        setMessage(t('product.messages.clearedPriceSelection'));
        setTimeout(() => setMessage(''), 3000);
    };

    const clearForm = () => {
        setForm(initialFormState);
        setMessage('');
        setIsEditMode(false);
        setSaveToPrice(false);
        setShowPriceSelection(false);
        setAvailablePrices([]);
        setSelectedPriceHistory(null);
        setCurrentPriceHistory([]);

        // Update URL to the create route without reloading the page
        if (window.location.pathname.includes('/edit')) {
            window.history.pushState({}, '', '/pos/products/create');
        }
    };

    // Check if any price field has changed from the original product
    const hasPriceChanged = () => {
        if (!product || !isEditMode) return true; // If creating new, always consider prices as changed

        const priceFields = ['CosPri', 'SlsPri', 'WholePrice', 'VehicleSalePrice'];

        return priceFields.some(field => {
            const currentValue = parseFloat(form[field as keyof typeof form] || '0');
            const originalValue = parseFloat(product[field as keyof Product]?.toString() || '0');
            return Math.abs(currentValue - originalValue) > 0.01; // Allow for small floating point differences
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.ItemCode || !form.ItmNm) {
            alert('Please fill required fields: Item Code and Item Name');
            return;
        }

        // Prevent saving items with PRN prefix (printers are managed separately)
        if (form.ItemCode.toUpperCase().startsWith('PRN')) {
            toast.error('Cannot save items with PRN prefix. Printers must be registered through the Printer Registration section.');
            return;
        }

        const selectedUnit = unitOptions.find(unit => unit.id === parseInt(form.UnitKy || '0'));
        const selectedCategory = categoryOptions.find(cat => cat.id === form.catkey);
        const selectedSupplier = supplierOptions.find(sup => sup.id === parseInt(form.SupKey || '0'));

        // Check if prices have changed
        const pricesChanged = hasPriceChanged();

        const payload = {
            // Always exclude product-specific fields that shouldn't go to price operations
            // Note: we keep batch_no so price records can be linked to a specific purchase batch.
            ...Object.fromEntries(
                Object.entries(form).filter(([key]) =>
                    !['brand', 'model', 'serial_number', 'warranty'].includes(key)
                )
            ),
            fInAct: form.fInAct === 'true',
            ScallItem: form.ScallItem === 'true',

            VATItem: form.VATItem === 'true',
            is_service: form.is_service === 'true',

            ItmKy: isEditMode && form.ItmKy ? parseInt(form.ItmKy) : null,
            catkey: form.catkey || null,
            category_name: selectedCategory ? selectedCategory.name : '',
            UnitKy: form.UnitKy ? parseInt(form.UnitKy) : null,
            Unit: selectedUnit ? selectedUnit.name : '',
            CosPri: form.CosPri ? parseFloat(form.CosPri) : 0,
            VehicleSalePrice: form.VehicleSalePrice ? parseFloat(form.VehicleSalePrice) : 0,
            WholePrice: form.WholePrice ? parseFloat(form.WholePrice) : 0,
            ReOrdlLvl: form.ReOrdlLvl ? parseInt(form.ReOrdlLvl) : 0,
            SupKey: form.SupKey ? parseInt(form.SupKey) : null,
            supplier_name: selectedSupplier ? selectedSupplier.name : '',
            RtQty1: form.RtQty1 !== '' ? parseInt(form.RtQty1) : 0,
            RtDis1: form.RtDis1 !== '' ? parseFloat(form.RtDis1) : 0,
            RtQty2: form.RtQty2 !== '' ? parseInt(form.RtQty2) : 0,
            RtDis2: form.RtDis2 !== '' ? parseFloat(form.RtDis2) : 0,
            CredQty1: form.CredQty1 !== '' ? parseInt(form.CredQty1) : 0,
            CredDis1: form.CredDis1 !== '' ? parseFloat(form.CredDis1) : 0,
            CredQty2: form.CredQty2 !== '' ? parseInt(form.CredQty2) : 0,
            CredDis2: form.CredDis2 !== '' ? parseFloat(form.CredDis2) : 0,
            RtDisType1: form.RtDisType1,

            free_issue_scheme_buy_qty: form.free_issue_scheme_buy_qty ? parseInt(form.free_issue_scheme_buy_qty) : null,
            free_issue_scheme_get_qty: form.free_issue_scheme_get_qty ? parseInt(form.free_issue_scheme_get_qty) : null,
            transfer_unit_id: form.transfer_unit_id ? parseInt(form.transfer_unit_id) : null,
            receiving_unit_id: form.receiving_unit_id ? parseInt(form.receiving_unit_id) : null,
            // if user leaves factor blank treat it as 1 so database default is not violated
            transfer_conversion_factor: form.transfer_conversion_factor ? parseFloat(form.transfer_conversion_factor) : 1,

            SlsPri: form.SlsPri ? parseFloat(form.SlsPri) : 0,
            ItemCode: form.ItemCode,
            Status: form.Status,
            ItmNm: form.ItmNm,
            BarCode: form.BarCode,
            batch_no: form.batch_no,
            brand_id: form.brand_id ? parseInt(form.brand_id) : null,
            model: form.model,
            serial_number: form.serial_number,
            warranty: form.warranty,
            // Only save to price history if prices changed AND user wants to save (or editing specific price history)
            keep_price: selectedPriceHistory ? false : (pricesChanged && saveToPrice),
            selectedPriceHistoryId: selectedPriceHistory?.ItemPriceKey || null, // For editing specific price history
        };

        setProcessing(true);
        if (isEditMode) {
            router.put('/pos/products/' + form.ItmKy, payload, {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            });
        } else {
            router.post('/pos/products', payload, {
                onSuccess: () => handleSuccessfulCreate(),
                onFinish: () => setProcessing(false),
            });
        }

    };

    const handleSuccessfulCreate = () => {
        // Reset form to initial state (nextItemCode will be provided by page reload)
        setForm({
            ...initialFormState,
            ItemCode: nextItemCode || '',
            branch_code: userBranchCode || '', // Keep the branch code
        });

        // Reset other states
        setIsEditMode(false);
        setSaveToPrice(false);
        setShowPriceSelection(false);
        setAvailablePrices([]);
        setSelectedPriceHistory(null);
        setCurrentPriceHistory([]);
        setCurrentReorderLevel(0);
        setHasReorderLevel(false);
        setReorderLevelId(null);

        // Clear search message
        setMessage('');

        // Set just created flag and clear it after animation
        setJustCreated(true);
        setTimeout(() => setJustCreated(false), 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Enter key disabled for form submission - use Save button instead
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const userCompanyCode = auth?.user?.company_code || '';
    const isMalibo = userCompanyCode.toUpperCase().startsWith('MAL');
    const otherUnitName = isMalibo ? 'Vismass' : 'Malibo';

    // keep transfer unit in sync with primary unit unless user has chosen a different sending unit
    useEffect(() => {
        if (form.UnitKy && !userPickedSending) {
            setForm(prev => ({ ...prev, transfer_unit_id: form.UnitKy }));
        }
    }, [form.UnitKy, userPickedSending]);

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={isEditMode ? t('Edit Product') : t('New Product Entry')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/pos/products"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    {isEditMode ? <Edit className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {isEditMode ? t('Edit Product') : t('Create New Product')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {isEditMode ? t('Update product information and pricing') : t('Add a new product to your inventory')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">

                    {/* Quick Stats */}
                    {/* {!isEditMode && (
                        <div className="px-4 sm:px-0 mb-6">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                    <p className="text-xs text-slate-600">{t('Total Products')}</p>
                                    <p className="text-lg font-semibold text-slate-800">New</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                    <p className="text-xs text-slate-600">{t('Active Status')}</p>
                                    <p className="text-lg font-semibold text-slate-800">{form.Status || 'Active'}</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                    <p className="text-xs text-slate-600">{t('Selling Price')}</p>
                                    <p className="text-lg font-semibold text-slate-800">Rs {form.SlsPri || '0.00'}</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                    <p className="text-xs text-slate-600">{t('Categories')}</p>
                                    <p className="text-lg font-semibold text-slate-800">{categoryOptions.length}</p>
                                </div>
                            </div>
                        </div>
                    )} */}
                    {loading && (
                        <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center">
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600"></div>
                                <span className="text-sm text-slate-700">
                                    {t('Loading data...')}
                                </span>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div
                            className={`mb-4 rounded border p-3 ${isEditMode
                                ? 'border-green-300 bg-green-50 text-green-800'
                                : message.includes('Error') ||
                                    message.includes('not found')
                                    ? 'border-red-300 bg-red-50 text-red-800'
                                    : 'border-blue-300 bg-blue-50 text-blue-800'
                                }`}
                        >
                            <p className="text-sm">{message}</p>
                        </div>
                    )}

                    {/* Flash Messages */}
                    {flash && (
                        <div className="mb-4 space-y-2">
                            {flash.success && (
                                <Alert className="border-green-200 bg-green-50">
                                    <AlertDescription className="text-sm text-green-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm text-green-700">
                                            Form has been reset. Item code retained for next entry.
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {flash.error && (
                                <Alert
                                    variant="destructive"
                                    className="border-red-200 bg-red-50"
                                >
                                    <AlertDescription className="text-sm text-red-800">
                                        {flash.error}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    {/* Form Reset Indicator */}
                    {justCreated && (
                        <div className="mb-4">
                            <Alert className="border-blue-200 bg-blue-50">
                                <AlertDescription className="text-sm text-blue-800">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span className="font-medium">
                                            🔄 Form has been reset for new entry - Item code preserved
                                        </span>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {/* Form Container */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        {/* Action Buttons */}
                        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={refreshDropdownData}
                                    className="rounded-lg border border-vismass-blue bg-white px-4 py-2 text-sm font-medium text-vismass-blue hover:bg-vismass-blue/10 focus:outline-none transition-colors"
                                    title="Refresh dropdowns (categories, units)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {t('Refresh Data')}
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Basic Information Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Package className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Basic Product Information')}</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <Barcode className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('product.fields.itemCode')}
                                                <span className="ml-1 text-red-600">
                                                    *
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={t('product.fields.itemCode')}
                                                value={form.ItemCode}
                                                onChange={handleManualItemCodeChange}
                                                className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 bg-slate-50"
                                                disabled={loading}
                                                readOnly={!isEditMode && !!nextItemCode}
                                            />
                                        </div>


                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700">
                                                {t('product.fields.itemName')}
                                            </label>
                                            <input
                                                type="text"
                                                name="ItmNm"
                                                list="itemNameList"
                                                placeholder={`${t('product.options.typeOrSelect')} ${t('or')} ${t('product.fields.barcode').toLowerCase()}`}
                                                value={form.ItmNm}
                                                onChange={handleItemNameInput}
                                                onKeyDown={handleKeyDown}
                                                className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                disabled={loading}
                                            />
                                            <datalist id="itemNameList">
                                                {Array.isArray(itemOptions) &&
                                                    itemOptions.map(
                                                        (option, index) => (
                                                            <option
                                                                key={
                                                                    option.id ??
                                                                    index
                                                                }
                                                                value={option.name}
                                                            />
                                                        ),
                                                    )}
                                            </datalist>
                                        </div>

                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700">
                                                {t('product.fields.category')}
                                            </label>
                                            <select
                                                name="catkey"
                                                value={form.catkey}
                                                onChange={handleChange}
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                disabled={
                                                    loading ||
                                                    categoryOptions.length === 0
                                                }
                                            >
                                                <option value="">
                                                    {t(
                                                        'product.options.selectCategory',
                                                    )}
                                                </option>
                                                {Array.isArray(categoryOptions) &&
                                                    categoryOptions.map(
                                                        (option, index) => (
                                                            <option
                                                                key={
                                                                    option.id ||
                                                                    index
                                                                }
                                                                value={option.id}
                                                            >
                                                                {option.name ||
                                                                    option.cname}
                                                            </option>
                                                        ),
                                                    )}
                                            </select>
                                        </div>

                                        {/* <div className="group">
                                        <label className="mb-2 flex items-center text-sm font-bold text-slate-800">
                                            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                                            Batch No
                                        </label>
                                        <input
                                            type="text"
                                            name="batch_no"
                                            placeholder="Enter batch number"
                                            value={form.batch_no}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 group-hover:border-purple-300 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div> */}

                                        {/* <div className="group">
                                        <label className="mb-2 flex items-center text-sm font-bold text-slate-800">
                                            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                                            Serial Number
                                        </label>
                                        <input
                                            type="text"
                                            name="serial_number"
                                            placeholder="Enter serial number"
                                            value={form.serial_number}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 group-hover:border-purple-300 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div> */}
                                    </div>

                                    {/* Right Column - Enhanced */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700">
                                                {t('product.fields.barcode')}
                                            </label>
                                            <div className="flex space-x-2">
                                                <input
                                                    type="text"
                                                    name="BarCode"
                                                    placeholder={t(
                                                        'product.fields.barcode',
                                                    )}
                                                    value={form.BarCode}
                                                    onChange={handleChange}
                                                    onKeyDown={handleKeyDown}
                                                    className="block w-full flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={generateBarCode}
                                                    className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 whitespace-nowrap focus:outline-none"
                                                >
                                                    <span className="flex items-center">
                                                        <svg
                                                            className="mr-2 h-5 w-5"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 4v16m8-8H4"
                                                            />
                                                        </svg>
                                                        Generate
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* <div className="group">
                                        <label className="mb-2 flex items-center text-sm font-bold text-slate-800">
                                            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                                            Batch No
                                        </label>
                                        <input
                                            type="text"
                                            name="batch_no"
                                            placeholder="Enter batch number"
                                            value={form.batch_no}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 group-hover:border-purple-300 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div> */}

                                        {/* <div className="group">
                                        <label className="mb-2 flex items-center text-sm font-bold text-slate-800">
                                            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                                            Brand
                                        </label>
                                        <select
                                            name="brand_id"
                                            value={form.brand_id}
                                            onChange={handleChange}
                                            className="block w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-all duration-200 group-hover:border-purple-300 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                            disabled={loading || brandOptions.length === 0}
                                        >
                                            <option value="">
                                                {t('Select Brand (Optional)')}
                                            </option>
                                            {Array.isArray(brandOptions) &&
                                                brandOptions.map((option) => (
                                                    <option
                                                        key={option.id}
                                                        value={option.id}
                                                    >
                                                        {option.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="group">
                                        <label className="mb-2 flex items-center text-sm font-bold text-slate-800">
                                            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                                            Model
                                        </label>
                                        <input
                                            type="text"
                                            name="model"
                                            placeholder="Enter model"
                                            value={form.model}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 group-hover:border-purple-300 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div>

                                    <div className="group">
                                        <label className="mb-2 flex items-center text-sm font-bold text-slate-800">
                                            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                                            Warranty
                                        </label>
                                        <input
                                            type="text"
                                            name="warranty"
                                            placeholder="Enter warranty period (e.g., 1 year, 6 months)"
                                            value={form.warranty}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 group-hover:border-purple-300 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div> */}

                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700">
                                                {t('product.fields.supplier')}
                                            </label>
                                            <select
                                                name="SupKey"
                                                value={form.SupKey}
                                                onChange={handleChange}
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                disabled={loading}
                                            >
                                                <option value="">
                                                    {t(
                                                        'product.options.selectSupplier',
                                                    )}
                                                </option>
                                                {Array.isArray(supplierOptions) &&
                                                    supplierOptions.map(
                                                        (option, index) => (
                                                            <option
                                                                key={
                                                                    option.id ||
                                                                    index
                                                                }
                                                                value={
                                                                    option.id
                                                                }
                                                            >
                                                                {option.name}
                                                            </option>
                                                        ),
                                                    )}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                {t('product.fields.status')}
                                            </label>
                                            <select
                                                name="Status"
                                                value={form.Status}
                                                onChange={handleChange}
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            >
                                                <option value="Active">
                                                    {t('product.status.active')}
                                                </option>
                                                <option value="Inactive">
                                                    {t('product.status.inactive')}
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Pricing Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Pricing Information')}</h2>
                                </div>

                                <div className="mb-6">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Batch No
                                    </label>
                                    <select
                                        name="batch_no"
                                        value={form.batch_no}
                                        onChange={handleChange}
                                        className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        disabled={!form.ItemCode || batchOptions.length === 0}
                                    >
                                        <option value="">
                                            {form.ItemCode ? 'Select Batch' : 'Enter Item Code first'}
                                        </option>
                                        {batchOptions.map((batch) => (
                                            <option key={batch} value={batch}>
                                                {batch}
                                            </option>
                                        ))}
                                    </select>
                                    {form.ItemCode && batchOptions.length === 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            No batches found for this item
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {t('product.fields.costPrice')}
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            name="CosPri"
                                            value={form.CosPri}
                                            onChange={handleChange}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-right text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {t('product.fields.newCostPrice')}
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            name="NewCostPrice"
                                            value={form.NewCostPrice}
                                            onChange={handleChange}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-right text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none bg-slate-50"
                                            readOnly
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {t('product.fields.sellingPrice')}
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            name="SlsPri"
                                            value={form.SlsPri}
                                            onChange={handleChange}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onKeyDown={handleKeyDown}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-right text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>

                                    {/* <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {t('product.fields.wholesalePrice')}
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            name="WholePrice"
                                            value={form.WholePrice}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-right text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div> */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {t('Vehicle Sale Price')}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="VehicleSalePrice"
                                            value={form.VehicleSalePrice}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-right text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {t('product.fields.unit')}
                                        </label>
                                        <select
                                            name="UnitKy"
                                            value={form.UnitKy}
                                            onChange={handleChange}
                                            className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        >
                                            <option value="">Select Unit</option>
                                            {unitOptions.map((option) => (
                                                <option
                                                    key={option.id}
                                                    value={option.id}
                                                >
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            {t('Reorder Level')}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            name="ReOrdlLvl"
                                            value={form.ReOrdlLvl}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-right text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            placeholder={t('Enter reorder level...')}
                                        />
                                    </div> */}
                                </div>
                            </div>
                            {/* Discount Sections Wrapper */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                {/* Cash/Bank Transfer Discount */}
                                <div className="w-full">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Package className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Cash/Bank Discount')}</h2>
                                    <select
                                        name="RtDisType1"
                                        value={form.RtDisType1}
                                        onChange={handleChange}
                                        className="ml-4 rounded border border-slate-200 bg-white px-3 py-1 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                    >
                                        <option value="fixed">Fixed</option>
                                        <option value="percentage">Percentage</option>
                                    </select>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-6">
                                    <div className="mb-2 grid grid-cols-2 gap-2">
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {t('Min Qty 1')}
                                            </p>
                                            <input
                                                type="number"
                                                name="RtQty1"
                                                value={form.RtQty1}
                                                onChange={handleChange}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                tabIndex={101}
                                                className="w-full rounded border border-slate-200 px-3 py-2 text-center focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                placeholder="e.g. 10"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {t('Min Qty 2')}
                                            </p>
                                            <input
                                                type="number"
                                                name="RtQty2"
                                                value={form.RtQty2}
                                                onChange={handleChange}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                tabIndex={103}
                                                className="w-full rounded border border-slate-200 px-3 py-2 text-center focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                placeholder="e.g. 20"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {form.RtDisType1 === 'percentage' ? 'Min Dis 1 %' : 'Min Dis 1 Rs'}
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name="RtDis1"
                                                    value={form.RtDis1 && form.RtDis1 !== '0' && form.RtDis1 !== '0.00' ? form.RtDis1 : ''}
                                                    onChange={handleChange}
                                                    tabIndex={102}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-right focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none pr-8"
                                                    placeholder="e.g. 5"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                                                    {form.RtDisType1 === 'percentage' ? '%' : 'Rs'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {form.RtDisType1 === 'percentage' ? 'Min Dis 2 %' : 'Min Dis 2 Rs'}
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name="RtDis2"
                                                    value={form.RtDis2 && form.RtDis2 !== '0' && form.RtDis2 !== '0.00' ? form.RtDis2 : ''}
                                                    onChange={handleChange}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    tabIndex={104}
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-right focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none pr-8"
                                                    placeholder="e.g. 10"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                                                    {form.RtDisType1 === 'percentage' ? '%' : 'Rs'}
                                                </span>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                            <div className="w-full">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <CreditCard className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Credit/Card Discounts')}</h2>
                                    <span className="ml-4 rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                                        {form.RtDisType1 === 'percentage' ? 'Percentage' : 'Fixed'}
                                    </span>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white p-6">
                                    <div className="mb-2 grid grid-cols-2 gap-2">
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {t('Min Qty 1')}
                                            </p>
                                            <input
                                                type="number"
                                                name="CredQty1"
                                                value={form.CredQty1}
                                                onChange={handleChange}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                tabIndex={109}
                                                className="w-full rounded border border-slate-200 px-3 py-2 text-center focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                placeholder="e.g. 10"
                                            />
                                        </div>
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {t('Min Qty 2')}
                                            </p>
                                            <input
                                                type="number"
                                                name="CredQty2"
                                                value={form.CredQty2}
                                                onChange={handleChange}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                tabIndex={111}
                                                className="w-full rounded border border-slate-200 px-3 py-2 text-center focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                placeholder="e.g. 20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {form.RtDisType1 === 'percentage' ? 'Min Dis 1 %' : 'Min Dis 1 Rs'}
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name="CredDis1"
                                                    value={form.CredDis1 && form.CredDis1 !== '0' && form.CredDis1 !== '0.00' ? form.CredDis1 : ''}
                                                    onChange={handleChange}
                                                    tabIndex={110}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-right focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none pr-8"
                                                    placeholder="e.g. 5"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                                                    {form.RtDisType1 === 'percentage' ? '%' : 'Rs'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="mb-2 text-xs font-medium text-slate-700">
                                                {form.RtDisType1 === 'percentage' ? 'Min Dis 2 %' : 'Min Dis 2 Rs'}
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name="CredDis2"
                                                    value={form.CredDis2 && form.CredDis2 !== '0' && form.CredDis2 !== '0.00' ? form.CredDis2 : ''}
                                                    onChange={handleChange}
                                                    tabIndex={112}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="w-full rounded border border-slate-200 px-3 py-2 text-right focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none pr-8"
                                                    placeholder="e.g. 10"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                                                    {form.RtDisType1 === 'percentage' ? '%' : 'Rs'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            </div>
                            {/* Free Issue Scheme Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    {/* <div className="p-2 bg-indigo-100 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                        </svg>
                                    </div> */}
                                    <h2 className="text-xl font-semibold text-slate-800">{t('')}</h2>
                                </div>

                                {/* <div className="rounded-lg border border-slate-200 bg-white p-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                {t('Buy Quantity')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    name="free_issue_scheme_buy_qty"
                                                    placeholder="e.g. 5"
                                                    value={form.free_issue_scheme_buy_qty}
                                                    onChange={handleChange}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    onKeyDown={handleKeyDown}
                                                    min="0"
                                                    step="1"
                                                    className="block w-full rounded border border-slate-200 pl-3 pr-12 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <span className="text-gray-400 text-xs">{t('Qty')}</span>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">{t('Customer buys this amount')}</p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                {t('Get Free Quantity')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    name="free_issue_scheme_get_qty"
                                                    placeholder="e.g. 1"
                                                    value={form.free_issue_scheme_get_qty}
                                                    onChange={handleChange}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    onKeyDown={handleKeyDown}
                                                    min="0"
                                                    step="1"
                                                    className="block w-full rounded border border-slate-200 pl-3 pr-12 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <span className="text-gray-400 text-xs">{t('Free')}</span>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">{t('Customer gets this amount free')}</p>
                                        </div>
                                    </div>
                                </div> */}


                            </div>

                            {/* Cross-Company Unit Conversion Section */}
                            {/* 
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Cross-Company Unit Conversion')}</h2>
                                        <p className="text-xs text-slate-500 mt-0.5">{t('Optional — define how quantity converts when transferring to another company (e.g. 1 Bundle → 10 Sheets)')}</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                {t('Sending Unit')}
                                            </label>
                                            <select
                                                name="transfer_unit_id"
                                                value={form.transfer_unit_id}
                                                className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500/20 focus:outline-none bg-white"
                                            >
                                                <option value="">{t('Same as primary unit')}</option>
                                                {unitOptions.map((unit) => (
                                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-slate-500">{t('Unit used when sending (e.g. Bundle)')}</p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                {t('Receiving Unit')}
                                            </label>
                                            <select
                                                name="receiving_unit_id"
                                                value={form.receiving_unit_id}
                                                className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-500/20 focus:outline-none bg-white"
                                            >
                                                <option value="">{t('No conversion')}</option>
                                                {unitOptions.map((unit) => (
                                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-slate-500">{t('Unit received by other company (e.g. Sheet)')}</p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                {t('Conversion Factor')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    name="transfer_conversion_factor"
                                                    placeholder="e.g. 10"
                                                    value={form.transfer_conversion_factor}
                                                    min="1"
                                                    step="0.0001"
                                                    className="block w-full rounded border border-slate-200 pl-3 pr-12 py-2 text-sm focus:border-amber-500 focus:ring-amber-500/20 focus:outline-none transition-colors"
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <span className="text-gray-400 text-xs">×</span>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">{t('How many receiving units = 1 sending unit')}</p>
                                        </div>
                                    </div>

                                    Live preview - removed nested comment tags
                                    {form.receiving_unit_id && form.transfer_conversion_factor && parseFloat(form.transfer_conversion_factor) > 1 && (() => {
                                        const sendingUnitName = unitOptions.find(u => u.id === parseInt(form.transfer_unit_id || '0'))?.name
                                            || unitOptions.find(u => u.id === parseInt(form.UnitKy || '0'))?.name
                                            || t('unit');
                                        const receivingUnitName = unitOptions.find(u => u.id === parseInt(form.receiving_unit_id || '0'))?.name || t('unit');
                                        return (
                                            <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-100 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-800">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {t('Preview')}: 1 {sendingUnitName} → {form.transfer_conversion_factor} {receivingUnitName}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            */}


                            {/* Additional Options */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Settings className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Additional Options')}</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                                        <div className="space-y-4">
                                            <label className="flex cursor-pointer items-center p-2">
                                                <input
                                                    type="checkbox"
                                                    name="active"
                                                    checked={form.fInAct === 'false'}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            fInAct: e.target.checked
                                                                ? 'false'
                                                                : 'true',
                                                            Status: e.target.checked ? 'Active' : 'Inactive',
                                                        })
                                                    }
                                                    tabIndex={109}
                                                    className="h-4 w-4 rounded border-slate-200"
                                                />
                                                <span className="ml-2 text-sm text-slate-700">
                                                    Active
                                                </span>
                                            </label>

                                        <label className="flex cursor-pointer items-center p-2">
                                            <input
                                                type="checkbox"
                                                name="VATItem"
                                                checked={form.VATItem === 'true'}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        VATItem: e.target.checked
                                                            ? 'true'
                                                            : 'false',
                                                    })
                                                }
                                                tabIndex={110}
                                                className="h-4 w-4 rounded border-slate-200"
                                            />
                                            <span className="ml-2 text-sm text-slate-700">
                                                Include VAT
                                            </span>
                                        </label>

                                        <label className="flex cursor-pointer items-center p-2">
                                            <input
                                                type="checkbox"
                                                name="is_service"
                                                checked={form.is_service === 'true'}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        is_service: e.target.checked ? 'true' : 'false',
                                                    })
                                                }
                                                className="h-4 w-4 rounded border-slate-200"
                                            />
                                            <span className="ml-2 text-sm text-slate-700">
                                                Is Service Item (No Stock)
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {/* Price Table - Hidden during updates as requested */}
                            {!isEditMode && (
                                <div className="mb-10">
                                    <div className="mb-6 flex items-center border-b border-slate-200 pb-3">
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            {t('Base Prices')}
                                        </h2>
                                    </div>

                                    <div className="overflow-x-auto rounded border border-slate-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-800 uppercase">
                                                        Number
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-800 uppercase">
                                                        Cost Price
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-800 uppercase">
                                                        Selling Price
                                                    </th>
                                                    {/* <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-800 uppercase">
                                                        Wholesale Price
                                                    </th> */}
                                                    <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-800 uppercase">
                                                        Vehicle Sales Price
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                <tr>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={1}
                                                            readOnly
                                                            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                                                        />
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={form.CosPri}
                                                            readOnly
                                                            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={form.SlsPri}
                                                            readOnly
                                                            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                                                        />
                                                    </td>
                                                    {/* <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={form.WholePrice}
                                                            readOnly
                                                            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                                                        />
                                                    </td> */}
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={form.VehicleSalePrice}
                                                            readOnly
                                                            className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {/* Price History Section - Separated Active and Historical */}
                            {isEditMode &&
                                currentPriceHistory &&
                                currentPriceHistory.length > 0 && (
                                    <div className="mb-10">
                                        <div className="mb-4">
                                            <h3 className="mb-2 text-base font-medium text-slate-800">
                                                Price Information
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                {currentPriceHistory.length} price records found
                                            </p>
                                        </div>

                                        {/* Selected Price Indicator */}
                                        {selectedPriceHistory && (
                                            <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <span className="font-medium text-green-600">
                                                            ✓ Selected for editing:
                                                        </span>
                                                        <span className="ml-2 text-sm text-slate-700">
                                                            Price from{' '}
                                                            {new Date(
                                                                selectedPriceHistory.ChangedDate ||
                                                                '',
                                                            ).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={
                                                            handleClearPriceSelection
                                                        }
                                                        className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                                                    >
                                                        {t(
                                                            'product.buttons.clearSelection',
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Price History - Only show if there are historical records */}
                                        {currentPriceHistory.length > 1 && (
                                            <div>
                                                <h4 className="text-sm mb-3 font-medium text-slate-700">
                                                    Price History (
                                                    {currentPriceHistory.length - 1}{' '}
                                                    previous records)
                                                </h4>
                                                <div className="rounded border border-slate-200 bg-white">
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full">
                                                            <thead className="border-b border-slate-200 bg-slate-50">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-700">
                                                                        {t(
                                                                            'product.priceHistory.tableHeaders.date',
                                                                        )}
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                                                                        {t(
                                                                            'product.priceHistory.tableHeaders.cost',
                                                                        )}
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                                                                        {t(
                                                                            'product.priceHistory.tableHeaders.selling',
                                                                        )}
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                                                                        {t(
                                                                            'product.priceHistory.tableHeaders.vehicleSales',
                                                                        )}
                                                                    </th>
                                                                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                                                                        {t(
                                                                            'product.priceHistory.tableHeaders.actions',
                                                                        )}
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {currentPriceHistory
                                                                    .slice(1)
                                                                    .map(
                                                                        (
                                                                            history,
                                                                        ) => (
                                                                            <tr
                                                                                key={
                                                                                    history.ItemPriceKey
                                                                                }
                                                                                className={`${selectedPriceHistory?.ItemPriceKey === history.ItemPriceKey ? 'border-l-4 border-green-500 bg-green-100' : 'bg-white'} transition-colors hover:bg-slate-50`}
                                                                            >
                                                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                                                    {history.ChangedDate
                                                                                        ? new Date(
                                                                                            history.ChangedDate,
                                                                                        ).toLocaleDateString('en-GB')
                                                                                        : '-'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                                                    {history.CosPri
                                                                                        ? `Rs. ${parseFloat(history.CosPri.toString()).toFixed(2)}`
                                                                                        : '-'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm font-medium text-green-600">
                                                                                    {history.SlsPri
                                                                                        ? `Rs. ${parseFloat(history.SlsPri.toString()).toFixed(2)}`
                                                                                        : '-'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-sm font-medium text-amber-600">
                                                                                    {history.VehicleSalePrice
                                                                                        ? `Rs. ${parseFloat(history.VehicleSalePrice.toString()).toFixed(2)}`
                                                                                        : '-'}
                                                                                </td>
                                                                                <td className="space-x-2 px-4 py-3 text-center">
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleSelectPriceHistory(
                                                                                                history,
                                                                                            )
                                                                                        }
                                                                                        className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium transition-colors ${selectedPriceHistory?.ItemPriceKey ===
                                                                                            history.ItemPriceKey
                                                                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                                                                            : 'border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                                                            }`}
                                                                                        title="Select this price record for editing"
                                                                                    >
                                                                                        {selectedPriceHistory?.ItemPriceKey ===
                                                                                            history.ItemPriceKey
                                                                                            ? 'Selected'
                                                                                            : 'Select/Edit'}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleDeletePriceHistory(
                                                                                                history.ItemPriceKey,
                                                                                            )
                                                                                        }
                                                                                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                                                                        title="Delete record"
                                                                                    >
                                                                                        Delete
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ),
                                                                    )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="rounded-b-lg border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-gray-500">
                                                        {t(
                                                            'product.priceHistory.footer',
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* Keep It Price Checkbox - Only for Edit Mode and when no price history is selected */}
                            {isEditMode && !selectedPriceHistory && (
                                <div className="mb-6 rounded border border-slate-200 bg-slate-50 p-4">
                                    {!hasPriceChanged() ? (
                                        <div className="flex items-start">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-800">
                                                    {t('No price changes detected')}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {t('No new price record will be created since Cost Price, Normal Cost Price, Selling Price, Wholesale Price, Vehicle Sales Price, and Card Price have not changed.')}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <label className="flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={saveToPrice}
                                                    onChange={(e) =>
                                                        setSaveToPrice(e.target.checked)
                                                    }
                                                    className="h-4 w-4 rounded border-slate-200"
                                                />
                                                <span className="ml-2 text-sm font-medium text-slate-800">
                                                    {t(
                                                        'product.priceHistory.keepOldPriceLabel',
                                                    )}
                                                </span>
                                            </label>
                                            <p className="mt-2 ml-6 text-sm text-slate-600">
                                                {t(
                                                    'product.priceHistory.keepOldPriceDescription',
                                                )}
                                            </p>
                                            <p className="mt-1 ml-6 text-xs text-amber-600">
                                                <strong>{t('Note:')}</strong> {t('Price changes detected. Check this box to save the new prices as a price history record.')}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex items-center justify-end border-t border-slate-200 pt-6 gap-4">
                                {isEditMode && canDelete && (
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        className="inline-flex items-center space-x-2 rounded-xl bg-red-50 px-6 py-3 text-sm font-medium text-red-600 shadow-sm transition-all duration-200 hover:bg-red-100 hover:text-red-700 focus:outline-none"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        <span>{t('Delete')}</span>
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLimitReached}
                                    tabIndex={114}
                                    className={`rounded-xl px-8 py-3 text-sm font-medium shadow-lg transition-all duration-200 focus:outline-none ${isLimitReached
                                        ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                                        : 'bg-vismass-blue hover:bg-vismass-blue/90 text-white'
                                        }`}
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Plus className="w-5 h-5" />
                                            <span>
                                                {selectedPriceHistory
                                                    ? `Update Selected Price (${new Date(selectedPriceHistory.ChangedDate || '').toLocaleDateString('en-GB')})`
                                                    : isEditMode
                                                        ? 'Update Product'
                                                        : t('product.buttons.create')}
                                            </span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-slate-600">
                        <p className="text-sm">Build your product inventory • Manage your products efficiently</p>
                    </div>
                </main>
            </div>

            {/* Item Selection Modal (for shared barcodes) */}
            {showItemSelection && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Multiple Products Found</h3>
                                <p className="text-sm text-slate-500 mt-1">Found {availableItems.length} products with barcode: {form.BarCode}</p>
                            </div>
                            <button
                                onClick={() => setShowItemSelection(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-6">
                            <div className="grid gap-4">
                                {availableItems.map((item) => (
                                    <div
                                        key={item.ItmKy}
                                        onClick={() => handleSelectItem(item)}
                                        className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-vismass-blue hover:bg-vismass-blue/5 hover:shadow-md"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-vismass-blue/10">
                                                    <Package className="w-6 h-6 text-slate-600 group-hover:text-vismass-blue" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 group-hover:text-vismass-blue">{item.ItmNm}</h4>
                                                    <div className="flex items-center space-x-3 mt-1 text-sm text-slate-500">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{item.ItemCode}</span>
                                                        <span>{item.category?.name || 'Uncategorized'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-800">Rs. {parseFloat(String(item.SlsPri)).toFixed(2)}</div>
                                                <div className="text-xs text-slate-500">Retail Price</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-center">
                            <button
                                onClick={() => setShowItemSelection(false)}
                                className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel and search again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, product: null })}
                onConfirm={confirmDelete}
                title={t('product.list.deleteProduct')}
                message={
                    deleteModal.product
                        ? `${t('product.list.areYouSureDelete')} "${deleteModal.product.ItmNm}"? ${t('product.list.cannotBeUndone')}`
                        : ''
                }
                type="danger"
                confirmText={t('product.list.delete')}
                cancelText={t('product.list.cancel')}
            />
        </AppSidebarLayout>
    );
};

export default Create;
