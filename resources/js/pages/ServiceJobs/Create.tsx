// resources/js/Pages/ServiceJobs/Create.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { BreadcrumbItem, Technician, ServiceCharge, PageProps } from '@/types';
import {
    Package,
    User,
    Smartphone,
    Calendar,
    Wrench,
    Plus,
    Search,
    X,
    Save,
    ArrowLeft,
    Tag,
    Barcode,
    Radio,
    Shield,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface Customer {
    AccKy: number;
    AccCd: string;
    AccNm: string;
    CurBal: number;
    CrLmt: number;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
}

interface CreateProps extends PageProps {
    customers: Customer[];
    technicians: Technician[];
    serviceCharges: ServiceCharge[];
    flash?: {
        success?: string;
        error?: string;
        created_customer?: {
            AccKy: number;
            AccCd?: string;
            full_name: string;
            TP1: string;
            EMail: string;
            Address: string;
        };
    };
}

interface Item {
    item_type: 'part' | 'service_charge';
    ItmKy?: string;
    item_code?: string;
    item_name: string;
    batch_no?: string | null;
    barcode?: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    description?: string | null;
    vat_inclusive?: boolean;
}

interface ItemMaster {
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    SlsPri: string | number;
    Unit: string;
    BarCode: string;
    vat_inclusive?: boolean;
}

interface DeviceDetails {
    device_model?: string;
    device_brand?: string;
    device_serial?: string;
    device_barcode?: string;
    device_warranty?: string;
}

const Create: React.FC<CreateProps> = ({ customers, technicians, serviceCharges, auth, flash }) => {
    const { data, setData, errors, processing, post } = useForm({
        AccKy: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        customer_address: '',
        device_model: '',
        device_brand: '',
        device_serial: '',
        device_barcode: '',
        device_warranty: '',
        problem_description: '',
        received_date: new Date().toISOString().split('T')[0],
        estimated_completion_date: '',
        assigned_technician_id: '',
        advanced_payment: 0,
        items: [] as Item[],
    });

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
            title: t('Create Service Job'),
            href: '#',
        },
    ];

    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(customers);
    const [isNewCustomer, setIsNewCustomer] = useState(false);


    const [itemSearchQueries, setItemSearchQueries] = useState<{ [key: number]: string }>({});
    const [itemSearchResults, setItemSearchResults] = useState<{ [key: number]: ItemMaster[] }>({});
    const [showItemSearch, setShowItemSearch] = useState<{ [key: number]: boolean }>({});
    const [isSearching, setIsSearching] = useState<{ [key: number]: boolean }>({});
    const [itemSearchTimeouts, setItemSearchTimeouts] = useState<{ [key: number]: ReturnType<typeof setTimeout> }>({});

    // Batch dropdown state per row
    const [rowBatches, setRowBatches] = useState<{ [key: number]: Array<{batch_no: string | null; available_quantity: number}> }>({});
    const [rowBatchDropdownOpen, setRowBatchDropdownOpen] = useState<{ [key: number]: boolean }>({});
    const batchDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
    const [isSearchingByDevice, setIsSearchingByDevice] = useState(false);
    const [deviceSearchType, setDeviceSearchType] = useState<'serial' | 'barcode'>('serial');
    const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
    const [saleDate, setSaleDate] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [customerFromDeviceSearch, setCustomerFromDeviceSearch] = useState(false);

    // Calculate warranty status
    const calculateWarrantyStatus = () => {
        if (!saleDate || !data.device_warranty) {
            return null;
        }

        // Parse warranty period in months
        const warrantyMatch = data.device_warranty.match(/(\d+)/);
        if (!warrantyMatch) {
            return null;
        }

        const warrantyMonths = parseInt(warrantyMatch[0], 10);
        const saleDateObj = new Date(saleDate);
        const currentDate = new Date();

        // Calculate warranty end date
        const warrantyEndDate = new Date(saleDateObj);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);

        // Calculate months difference
        const monthsDiff = (warrantyEndDate.getFullYear() - currentDate.getFullYear()) * 12 +
            (warrantyEndDate.getMonth() - currentDate.getMonth());

        const isExpired = currentDate > warrantyEndDate;

        return {
            warrantyMonths,
            warrantyEndDate,
            monthsRemaining: Math.max(0, monthsDiff),
            isExpired,
            saleDateFormatted: saleDateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            warrantyEndFormatted: warrantyEndDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
    };

    const [deviceDetails, setDeviceDetails] = useState<DeviceDetails>({
        device_model: '',
        device_brand: '',
        device_serial: '',
        device_barcode: '',
        device_warranty: '',
    });

    const [serialNumbers, setSerialNumbers] = useState<string[]>([]);
    const [isLoadingSerialNumbers, setIsLoadingSerialNumbers] = useState(false);

    // Printer brands and models
    const [brands, setBrands] = useState<Array<{id: number, name: string, code: string}>>([]);
    const [models, setModels] = useState<Array<{id: number, name: string, code: string, brand_id: number}>>([]);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    
    // New model creation
    const [newModelName, setNewModelName] = useState('');
    const [isCreatingModel, setIsCreatingModel] = useState(false);
    const [modelCreationError, setModelCreationError] = useState<string | null>(null);

    const customerSearchRef = useRef<HTMLDivElement>(null);
    const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
    const itemSearchRefs = useRef<{ [key: number]: HTMLDivElement }>({});

    useEffect(() => {
        // This effect should run only once when the component mounts or when flash changes.
        const processFlashData = () => {
            if (flash?.created_customer) {
                const createdCustomer = flash.created_customer;

                setData(prevData => ({
                    ...prevData,
                    AccKy: createdCustomer.AccKy.toString(),
                    customer_name: createdCustomer.full_name,
                    customer_phone: createdCustomer.TP1 || '',
                    customer_email: createdCustomer.EMail || '',
                    customer_address: createdCustomer.Address || '',
                }));

                if (createdCustomer.AccCd) {
                    sessionStorage.setItem('createdCustomerCode', createdCustomer.AccCd);
                }

                // Set customer search display text
                setCustomerSearch(createdCustomer.full_name);
                setIsNewCustomer(false);
                setShowCustomerSearch(false);

                // Show success notification
                setTimeout(() => {
                    toast.success(`Customer ${createdCustomer.full_name} has been successfully registered and added to this service job!`);
                }, 100);
            }
        };

        processFlashData();
    }, [flash]);

    // Handle customer search by name, code, phone, or email
    const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomerSearch(value);

        if (value.length > 0) {
            const filtered = customers.filter(customer =>
                customer.AccNm.toLowerCase().includes(value.toLowerCase()) ||
                customer.AccCd.toLowerCase().includes(value.toLowerCase()) ||
                (customer.phone && customer.phone.includes(value)) ||
                (customer.email && customer.email.toLowerCase().includes(value.toLowerCase()))
            );
            setFilteredCustomers(filtered);
            setShowCustomerSearch(true);
        } else {
            setFilteredCustomers(customers);
            setShowCustomerSearch(false);
        }
    };

    // Search customer by device serial or barcode from sales_transactions
    const searchCustomerByDevice = async () => {
        if (!deviceSearchQuery.trim()) {
            return;
        }

        setIsSearchingByDevice(true);
        setSearchError(null); // Clear previous errors
        setSaleDate(null); // Clear previous sale date

        try {
            const params = new URLSearchParams();
            const trimmedQuery = deviceSearchQuery.trim();

            if (deviceSearchType === 'serial') {
                params.append('serial', trimmedQuery);
            } else {
                params.append('barcode', trimmedQuery);
                if (data.device_serial?.trim()) {
                    params.append('serial', data.device_serial.trim());
                }
            }

            const response = await fetch(`/service-jobs/get-customer-by-device?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json();
                const message = errorData.message || errorData.error || 'Search failed';

                if (response.status === 409 && errorData.error === 'Device already under service') {
                    const existingJob = errorData.existing_job;
                    const duplicateMessage =
                        `This device is already under service!\n\n` +
                        `Job Number: ${existingJob.job_number}\n` +
                        `Status: ${existingJob.status.replace('_', ' ')}\n` +
                        `Customer: ${existingJob.customer_name}\n` +
                        `Technician: ${existingJob.technician_name || 'Not assigned'}\n` +
                        `Received: ${new Date(existingJob.received_date).toLocaleDateString()}\n` +
                        `Estimated Completion: ${existingJob.estimated_completion_date ? new Date(existingJob.estimated_completion_date).toLocaleDateString() : 'Not set'}\n\n` +
                        `Please complete or cancel the existing service job before creating a new one.`;

                    setSearchError(duplicateMessage);
                    toast.error(duplicateMessage);
                    throw new Error(duplicateMessage);
                }

                toast.error(message);
                throw new Error(message);
            }

            const result = await response.json();

            if (result.device_serial || result.device_brand || result.device_model) {
                setData(prev => ({
                    ...prev,
                    device_model: result.device_model || prev.device_model,
                    device_brand: result.device_brand || prev.device_brand,
                    device_serial: result.device_serial || prev.device_serial,
                    device_barcode: result.device_barcode || prev.device_barcode,
                    device_warranty: result.device_warranty || prev.device_warranty,
                }));
            }

            if (result.customer) {
                setCustomerFromDeviceSearch(true);

                setData(prev => ({
                    ...prev,
                    AccKy: result.customer.AccKy?.toString() || result.customer.AdrKy?.toString() || '',
                    customer_name: result.customer.customer_name || result.customer.AccNm || result.customer.full_name || '',
                    customer_phone: result.customer.customer_phone || result.customer.TP1 || result.address?.TP1 || result.address?.TP2 || result.address?.TP3 || '',
                    customer_email: result.customer.customer_email || result.customer.Email || result.address?.Email || '',
                    customer_address: result.customer.customer_address || result.customer.Address || result.address?.Address || '',
                }));

                if (result.sale_date) {
                    setSaleDate(result.sale_date);
                }

                setCustomerSearch(result.customer.customer_name || result.customer.AccNm || result.customer.full_name || '');
                setIsNewCustomer(false);
                setShowCustomerSearch(false);
            } else {
                const message = result.device_serial || result.device_brand
                    ? t('Device details found but no customer information available. Please enter customer details manually.')
                    : t('No sale record found for this serial number. Please enter details manually.');

                setSearchError(message);
                toast.error(message);
            }
        } catch (error: any) {
            console.error('Error searching customer by device:', error);
            const message = error.message || t('Unable to search for sale record. Please check the serial number and try again.');
            setSearchError(message);
            toast.error(message);
        } finally {
            setIsSearchingByDevice(false);
        }
    };

    // Search device details by serial number
    const searchDeviceDetails = async () => {
        if (!data.device_serial.trim()) return;

        setIsSearchingByDevice(true);
        try {
            const response = await axios.get(`/api/device-details?serial_number=${data.device_serial}`);
            const { brand, model, warranty } = response.data;

            setDeviceDetails({
                ...deviceDetails,
                device_brand: brand || '',
                device_model: model || '',
                device_warranty: warranty || '',
            });

            setData({
                ...data,
                device_brand: brand || '',
                device_model: model || '',
                device_warranty: warranty || '',
            });
        } catch (error) {
            console.error('Error fetching device details:', error);
        } finally {
            setIsSearchingByDevice(false);
        }
    };

    // Fetch serial numbers for dropdown
    const fetchSerialNumbers = async () => {
        setIsLoadingSerialNumbers(true);
        try {
            const response = await axios.get('/api/device-serial-numbers');
            setSerialNumbers(response.data);
        } catch (error) {
            console.error('Error fetching serial numbers:', error);
        } finally {
            setIsLoadingSerialNumbers(false);
        }
    };

    // Fetch printer brands
    const fetchBrands = async () => {
        setIsLoadingBrands(true);
        try {
            const response = await axios.get('/api/printer-brands');
            console.log('Brands API response:', response.data);
            setBrands(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching brands:', error);
            setBrands([]);
        } finally {
            setIsLoadingBrands(false);
        }
    };

    // Fetch printer models for selected brand
    const fetchModels = async (brandId: number) => {
        setIsLoadingModels(true);
        try {
            const response = await axios.get(`/api/printer-models?brand_id=${brandId}`);
            console.log('Models API response for brand', brandId, ':', response.data);
            setModels(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching models:', error);
            setModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    // Create a new printer model
    const createNewModel = async () => {
        if (!newModelName.trim() || !data.device_brand) {
            setModelCreationError('Please enter a model name and select a brand');
            return;
        }

        // Check if model already exists in dropdown
        if (models.some(m => m.name.toLowerCase() === newModelName.toLowerCase())) {
            setModelCreationError('This model already exists in the list');
            return;
        }

        setIsCreatingModel(true);
        setModelCreationError(null);

        try {
            // Find the brand ID from the selected brand name
            const selectedBrand = brands.find(b => b.name === data.device_brand);
            if (!selectedBrand) {
                setModelCreationError('Selected brand not found');
                return;
            }

            const response = await axios.post('/api/printer-models', {
                brand_id: selectedBrand.id,
                model_name: newModelName.trim(),
            });

            console.log('New model created:', response.data);

            // Add the new model to the list
            setModels(prev => [...prev, response.data]);
            
            // Set the newly created model as selected
            setData('device_model', response.data.name);
            
            // Clear the input
            setNewModelName('');
            
            // Show success message
            alert(`Model "${response.data.name}" created successfully for ${selectedBrand.name}`);
        } catch (error: any) {
            console.error('Error creating model:', error);
            const errorMessage = error.response?.data?.error?.model_name?.[0] 
                || error.response?.data?.error 
                || error.message 
                || 'Failed to create model';
            setModelCreationError(errorMessage);
        } finally {
            setIsCreatingModel(false);
        }
    };

    // Auto-search customer by device when serial/barcode is entered
    useEffect(() => {
        const timer = setTimeout(() => {
            if (data.device_serial && data.device_serial.length > 2) {
                setDeviceSearchQuery(data.device_serial);
                setDeviceSearchType('serial');
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [data.device_serial]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (data.device_barcode && data.device_barcode.length > 2) {
                setDeviceSearchQuery(data.device_barcode);
                setDeviceSearchType('barcode');
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [data.device_barcode]);

    // Trigger search when deviceSearchQuery changes
    useEffect(() => {
        if (deviceSearchQuery && deviceSearchQuery.trim().length > 2) {
            searchCustomerByDevice();
        }
    }, [deviceSearchQuery, deviceSearchType]);

    // Fetch customer details when AccKy changes
    useEffect(() => {
        const fetchCustomerData = async () => {
            if (data.AccKy && data.AccKy.trim() !== '') {
                setIsLoadingCustomer(true);
                try {
                    console.log('Fetching customer details for AccKy:', data.AccKy);
                    const response = await fetch(`/service-jobs/customer-details/${data.AccKy}`);

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Server error response:', errorData);
                        throw new Error(errorData.error || errorData.message || 'Failed to fetch customer details');
                    }

                    const result = await response.json();
                    console.log('Customer details received:', result);

                    if (result.customer) {
                        const phoneNumber = result.address?.TP1 || result.address?.TP2 || result.address?.TP3 || '';
                        const email = result.address?.Email || '';
                        const address = result.address?.Address || '';

                        console.log('Setting customer data:', {
                            name: result.customer.AccNm,
                            phone: phoneNumber,
                            email: email,
                            address: address
                        });

                        setData(prev => ({
                            ...prev,
                            customer_name: result.customer.AccNm || '',
                            customer_phone: phoneNumber,
                            customer_email: email,
                            customer_address: address,
                        }));
                    } else {
                        console.warn('No customer data in response');
                    }
                } catch (error: any) {
                    console.error('Error fetching customer details:', error);
                    console.error('Error details:', {
                        message: error.message,
                        stack: error.stack
                    });

                    // Fallback to customers prop if available
                    const customer = customers.find(c => c.AccKy.toString() === data.AccKy);
                    if (customer) {
                        console.log('Using fallback customer data from props');
                        setData(prev => ({
                            ...prev,
                            customer_name: customer.AccNm || '',
                            customer_phone: customer.phone || '',
                            customer_email: customer.email || '',
                            customer_address: customer.address || '',
                        }));
                    } else {
                        console.error('No fallback customer data available');
                        alert(t('Error loading customer details. Please try again or enter manually.'));
                    }
                } finally {
                    setIsLoadingCustomer(false);
                }
            }
        };

        if (data.AccKy && !isNewCustomer && data.AccKy !== '' && !customerFromDeviceSearch) {
            fetchCustomerData();
        }
    }, [data.AccKy, isNewCustomer, customerFromDeviceSearch]);

    const selectCustomer = (customer: Customer) => {
        setCustomerFromDeviceSearch(false); // Reset flag for manual selection
        setData({
            ...data,
            AccKy: customer.AccKy.toString(),
            customer_name: customer.AccNm,
            customer_phone: customer.phone || '',
            customer_email: customer.email || '',
            customer_address: customer.address || '',
        });
        setShowCustomerSearch(false);
        setIsNewCustomer(false);
        setCustomerSearch(customer.AccNm);
    };

    const addNewItem = () => {
        const newItem: Item = {
            item_type: 'part',
            item_name: '',
            batch_no: '',
            quantity: 1,
            unit_price: 0,
            cost_price: 0,
            description: undefined,
        };

        const newIndex = data.items.length;
        setData(prevData => ({
            ...prevData,
            items: [...prevData.items, newItem]
        }));

        setItemSearchQueries(prev => ({ ...prev, [newIndex]: '' }));
        setItemSearchResults(prev => ({ ...prev, [newIndex]: [] }));
        setShowItemSearch(prev => ({ ...prev, [newIndex]: false }));
        setIsSearching(prev => ({ ...prev, [newIndex]: false }));
    };

    const updateItem = (index: number, field: keyof Item, value: any) => {
        setData(prevData => {
            const newItems = [...prevData.items];
            newItems[index] = { ...newItems[index], [field]: value };
            return {
                ...prevData,
                items: newItems
            };
        });
    };

    const removeItem = (index: number) => {
        setData(prevData => {
            const newItems = [...prevData.items];
            newItems.splice(index, 1);
            return {
                ...prevData,
                items: newItems
            };
        });

        const newSearchQueries = { ...itemSearchQueries };
        const newSearchResults = { ...itemSearchResults };
        const newShowSearch = { ...showItemSearch };
        const newSearching = { ...isSearching };

        delete newSearchQueries[index];
        delete newSearchResults[index];
        delete newShowSearch[index];
        delete newSearching[index];

        setItemSearchQueries(newSearchQueries);
        setItemSearchResults(newSearchResults);
        setShowItemSearch(newShowSearch);
        setIsSearching(newSearching);

        if (itemSearchTimeouts[index]) {
            clearTimeout(itemSearchTimeouts[index]);
        }

        // also remove batch metadata for this row
        setRowBatches(prev => { const c = { ...prev }; delete c[index]; return c; });
        setRowBatchDropdownOpen(prev => { const c = { ...prev }; delete c[index]; return c; });
        delete batchDropdownRefs.current[index];
    };

    // Search items from itemmaster table - use ServiceJobController::searchItems
    const searchItems = async (searchTerm: string, index: number) => {
        if (searchTerm.length <= 1) {
            setItemSearchResults(prev => ({ ...prev, [index]: [] }));
            setShowItemSearch(prev => ({ ...prev, [index]: false }));
            return;
        }

        setIsSearching(prev => ({ ...prev, [index]: true }));

        try {
            const primaryUrl = `/service-jobs/search/items?search=${encodeURIComponent(searchTerm)}`;
            const resp = await fetch(primaryUrl);

            if (!resp.ok) {
                throw new Error(`Primary search failed: ${resp.status}`);
            }

            const results: ItemMaster[] = await resp.json();
            setItemSearchResults(prev => ({ ...prev, [index]: results }));
            setShowItemSearch(prev => ({ ...prev, [index]: results.length > 0 }));
        } catch (primaryError) {
            console.error('Primary item search error:', primaryError);

            // Try fallback endpoint (same controller route, kept for resilience)
            try {
                const fallbackUrl = `/service-jobs/search/items?search=${encodeURIComponent(searchTerm)}`;
                const resp2 = await fetch(fallbackUrl);
                if (resp2.ok) {
                    const results2: ItemMaster[] = await resp2.json();
                    setItemSearchResults(prev => ({ ...prev, [index]: results2 }));
                    setShowItemSearch(prev => ({ ...prev, [index]: results2.length > 0 }));
                } else {
                    setItemSearchResults(prev => ({ ...prev, [index]: [] }));
                    setShowItemSearch(prev => ({ ...prev, [index]: false }));
                }
            } catch (fallbackError) {
                console.error('Fallback item search error:', fallbackError);
                setItemSearchResults(prev => ({ ...prev, [index]: [] }));
                setShowItemSearch(prev => ({ ...prev, [index]: false }));
            }
        } finally {
            setIsSearching(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleItemSearchChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;

        updateItem(index, 'item_name', value);
        setItemSearchQueries(prev => ({ ...prev, [index]: value }));

        // Clear item master details if user changes the name
        if (value && data.items[index]?.ItmKy) {
            setData(prevData => {
                const newItems = [...prevData.items];
                newItems[index] = {
                    ...newItems[index],
                    ItmKy: undefined,
                    item_code: undefined,
                    barcode: undefined,
                    unit_price: 0,
                    cost_price: 0,
                    batch_no: '',
                };
                return {
                    ...prevData,
                    items: newItems
                };
            });
            // also clear any batch options stored for this row
            setRowBatches(prev => ({ ...prev, [index]: [] }));
            setRowBatchDropdownOpen(prev => ({ ...prev, [index]: false }));
        }

        // Clear existing timeout
        if (itemSearchTimeouts[index]) {
            clearTimeout(itemSearchTimeouts[index]);
        }

        // Set new timeout for debounced search
        const timeout = setTimeout(() => {
            if (value.trim().length > 1) {
                searchItems(value, index);
            } else {
                setItemSearchResults(prev => ({ ...prev, [index]: [] }));
                setShowItemSearch(prev => ({ ...prev, [index]: false }));
            }
        }, 500);

        setItemSearchTimeouts(prev => ({ ...prev, [index]: timeout }));
    };

    const selectItem = (item: ItemMaster, index: number) => {
        // Parse the sales price safely
        let unitPrice = 0;
        if (typeof item.SlsPri === 'string') {
            unitPrice = parseFloat(item.SlsPri);
        } else if (typeof item.SlsPri === 'number') {
            unitPrice = item.SlsPri;
        }

        // Update the item in the list
        setData(prevData => {
            const newItems = [...prevData.items];
            newItems[index] = {
                ...newItems[index],
                item_type: 'part',
                ItmKy: item.ItmKy,
                item_code: item.ItemCode,
                item_name: item.ItmNm || item.ItemCode,
                barcode: item.BarCode,
                unit_price: unitPrice,
                cost_price: 0,
                description: undefined,
                vat_inclusive: item.vat_inclusive || false,
            };
            return {
                ...prevData,
                items: newItems
            };
        });

        setItemSearchQueries(prev => ({ ...prev, [index]: item.ItmNm || item.ItemCode }));
        setShowItemSearch(prev => ({ ...prev, [index]: false }));
        setItemSearchResults(prev => ({ ...prev, [index]: [] }));

        // fetch batch options for this product
        if (item.ItmKy) {
            fetchBatchesForRow(item.ItmKy, index);
        } else {
            setRowBatches(prev => ({ ...prev, [index]: [] }));
        }
    };

    const fetchBatchesForRow = async (productId: string, index: number) => {
        try {
            // Always query Service section (VIS-SEC-001) for available batches
            const sectionCode = 'VIS-SEC-001';
            const url = `/wastages/product-batches?product_id=${encodeURIComponent(productId)}&section_code=${encodeURIComponent(sectionCode)}`;
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error('Batch API error');
            }
            const data: Array<{batch_no: string|null; available_quantity: number}> = await resp.json();
            setRowBatches(prev => ({ ...prev, [index]: data }));
            // if only one batch auto-select
            if (data.length === 1) {
                updateItem(index, 'batch_no', data[0].batch_no || '');
            }
        } catch (err) {
            console.error('Failed to fetch batches for row', index, err);
            setRowBatches(prev => ({ ...prev, [index]: [] }));
        }
    };

    const selectServiceChargeForRow = (chargeId: number | string, index: number) => {
        const charge = serviceCharges.find(c => c.id.toString() === chargeId.toString());
        if (!charge) return;

        setData(prevData => {
            const newItems = [...prevData.items];
            newItems[index] = {
                ...newItems[index],
                item_type: 'service_charge',
                item_name: charge.charge_name,
                quantity: 1,
                unit_price: parseFloat(charge.amount.toString()),
                cost_price: 0,
                description: charge.description || undefined,
                ItmKy: undefined,
                item_code: undefined,
                barcode: undefined,
            };
            return {
                ...prevData,
                items: newItems
            };
        });

        setItemSearchQueries(prev => ({ ...prev, [index]: charge.charge_name }));
        setShowItemSearch(prev => ({ ...prev, [index]: false }));
        setItemSearchResults(prev => ({ ...prev, [index]: [] }));
    };

    const addServiceCharge = (charge: ServiceCharge) => {
        const newItem: Item = {
            item_type: 'service_charge',
            item_name: charge.charge_name,
            quantity: 1,
            unit_price: parseFloat(charge.amount.toString()),
            cost_price: 0,
            description: charge.description || undefined,
        };

        const newIndex = data.items.length;
        setData(prevData => ({
            ...prevData,
            items: [...prevData.items, newItem]
        }));

        setItemSearchQueries(prev => ({ ...prev, [newIndex]: charge.charge_name }));
        setItemSearchResults(prev => ({ ...prev, [newIndex]: [] }));
        setShowItemSearch(prev => ({ ...prev, [newIndex]: false }));
        setIsSearching(prev => ({ ...prev, [newIndex]: false }));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!data.customer_name.trim()) {
            toast.error(t('Customer Name is required'));
            return;
        }

        if (!data.customer_phone.trim()) {
            toast.error(t('Phone Number is required'));
            return;
        }

        if (!data.problem_description.trim()) {
            toast.error(t('Problem Description is required'));
            return;
        }

        const formData = new FormData();

        // If AccKy exists, we're using an existing customer - only send the AccKy
        // If AccKy is empty, send customer details to create a new customer
        if (data.AccKy && data.AccKy.trim() !== '' && !isNewCustomer) {
            // Existing customer - only send AccKy to link the service job
            formData.append('AccKy', data.AccKy);
            // Still send display data for backend to use in job record
            formData.append('customer_name', data.customer_name);
            formData.append('customer_phone', data.customer_phone);
            formData.append('customer_email', data.customer_email || '');
            formData.append('customer_address', data.customer_address || '');
            formData.append('is_existing_customer', '1'); // Flag to indicate existing customer
        } else {
            // New customer - send empty AccKy and full customer details
            formData.append('AccKy', '');
            formData.append('customer_name', data.customer_name);
            formData.append('customer_phone', data.customer_phone);
            formData.append('customer_email', data.customer_email || '');
            formData.append('customer_address', data.customer_address || '');
            formData.append('is_existing_customer', '0'); // Flag to indicate new customer
        }

        // Device and service job details
        formData.append('device_brand', data.device_brand || '');
        formData.append('device_model', data.device_model || '');
        formData.append('device_serial', data.device_serial || '');
        formData.append('device_barcode', data.device_barcode || '');
        formData.append('device_warranty', data.device_warranty || '');
        formData.append('problem_description', data.problem_description);
        formData.append('received_date', data.received_date);
        formData.append('estimated_completion_date', data.estimated_completion_date || '');
        formData.append('assigned_technician_id', data.assigned_technician_id || '');
        formData.append('advanced_payment', data.advanced_payment.toString());
        formData.append('items', JSON.stringify(data.items));

        router.post('/service-jobs', formData, {
            forceFormData: true,
            onError: (errors) => {
                console.error('Form validation errors:', errors);
                console.log('Full error object:', JSON.stringify(errors, null, 2));

                // Build a detailed error message
                const errorMessages: string[] = [];
                for (const [field, messages] of Object.entries(errors)) {
                    if (Array.isArray(messages)) {
                        errorMessages.push(`${field}: ${messages.join(', ')}`);
                    } else {
                        errorMessages.push(`${field}: ${messages}`);
                    }
                }

                if (errorMessages.length > 0) {
                    toast.error('Validation Errors: ' + errorMessages.join('; '));
                } else if ('message' in errors && errors.message) {
                    toast.error(errors.message as string);
                }
            },
            onSuccess: () => {
                try {
                    const prefill = {
                        AccKy: data.AccKy,
                        customer_name: data.customer_name,
                        customer_phone: data.customer_phone,
                        customer_email: data.customer_email,
                        customer_address: data.customer_address,
                        device_model: data.device_model,
                        device_brand: data.device_brand,
                        device_serial: data.device_serial,
                    };
                    sessionStorage.setItem('estimatePrefill', JSON.stringify(prefill));
                    sessionStorage.setItem('openEstimateAfterCreate', 'true');
                } catch (e) {
                    // ignore storage errors
                }
                // Controller typically redirects to the created job show page
            }
        });
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showCustomerSearch && customerSearchRef.current &&
                !customerSearchRef.current.contains(e.target as Node)) {
                setShowCustomerSearch(false);
            }

            Object.keys(showItemSearch).forEach(index => {
                if (showItemSearch[parseInt(index)] &&
                    itemSearchRefs.current[parseInt(index)] &&
                    !itemSearchRefs.current[parseInt(index)].contains(e.target as Node)) {
                    setShowItemSearch(prev => ({ ...prev, [parseInt(index)]: false }));
                }
            });

            // also close batch dropdowns
            Object.keys(rowBatchDropdownOpen).forEach(index => {
                const idx = parseInt(index);
                if (rowBatchDropdownOpen[idx] && batchDropdownRefs.current[idx] &&
                    !batchDropdownRefs.current[idx].contains(e.target as Node)) {
                    setRowBatchDropdownOpen(prev => ({ ...prev, [idx]: false }));
                }
            });
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showCustomerSearch, showItemSearch, rowBatchDropdownOpen]);

    useEffect(() => {
        return () => {
            Object.values(itemSearchTimeouts).forEach(timeout => {
                if (timeout) clearTimeout(timeout);
            });
        };
    }, [itemSearchTimeouts]);

    const handleItemTypeChange = (index: number, value: 'part' | 'service_charge') => {
        // Clear search data states
        setItemSearchQueries(prev => ({ ...prev, [index]: '' }));
        setItemSearchResults(prev => ({ ...prev, [index]: [] }));
        setShowItemSearch(prev => ({ ...prev, [index]: false }));

        // clear batch metadata for this row
        setRowBatches(prev => { const c = { ...prev }; delete c[index]; return c; });
        setRowBatchDropdownOpen(prev => { const c = { ...prev }; delete c[index]; return c; });

        // Update the item type and reset related fields
        setData(prevData => {
            const newItems = [...prevData.items];
            newItems[index] = {
                ...newItems[index],
                item_type: value,
                item_name: '',
                ItmKy: '',
                item_code: '',
                barcode: '',
                batch_no: '',
                quantity: 1,
                unit_price: 0,
                cost_price: 0,
                description: undefined,
            };
            return {
                ...prevData,
                items: newItems
            };
        });
    };

    const setItemSearchRef = (index: number, el: HTMLDivElement | null) => {
        if (el) {
            itemSearchRefs.current[index] = el;
        }
    };

    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // Add-new-customer functionality removed per request

    // Fetch serial numbers when component mounts
    useEffect(() => {
        fetchSerialNumbers();
        fetchBrands();
    }, []);

    // Fetch models when brand changes
    useEffect(() => {
        if (data.device_brand) {
            // Find the selected brand object to get its ID
            const selectedBrand = brands.find(b => b.name === data.device_brand);
            if (selectedBrand) {
                console.log('Fetching models for brand:', selectedBrand.name, 'ID:', selectedBrand.id);
                fetchModels(selectedBrand.id);
            } else {
                console.warn('Brand not found in brands list:', data.device_brand);
                setModels([]);
            }
        } else {
            console.log('Clearing models - no brand selected');
            setModels([]);
        }
    }, [data.device_brand]);

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Create Service Job')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-start justify-between gap-3 py-3 sm:items-center">
                            <div className="flex min-w-0 items-start space-x-2 sm:items-center">
                                <Link
                                    href="/service-jobs"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-4 w-4 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2">
                                    <Wrench className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-base font-bold text-white sm:text-lg">
                                        {t('Create Service Job')}
                                    </h1>
                                    <p className="truncate text-xs text-white/80">
                                        {t('Create a new service job for customer')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <form onSubmit={handleFormSubmit}>
                            {/* Device Details */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <Smartphone className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h2 className="text-base font-semibold text-gray-800">{t('Device Details')}</h2>
                                </div>

                                {/* Device Search Section */}
                                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                        <div className="flex items-center">
                                            <Radio className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Search Customer by Device')}
                                        </div>
                                    </label>

                                    <div className="grid grid-cols-1 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                {t('Device Serial Number')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={data.device_serial}
                                                    onChange={e => setData('device_serial', e.target.value)}
                                                    placeholder={t('Enter device serial number...')}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    list="serial-numbers-list"
                                                />
                                                <datalist id="serial-numbers-list">
                                                    {serialNumbers.map((sn, idx) => (
                                                        <option key={idx} value={sn} />
                                                    ))}
                                                </datalist>
                                                {isSearchingByDevice && (
                                                    <div className="absolute right-2 top-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vismass-blue"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {t('Enter serial number to search for existing customer')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start text-xs text-vismass-blue">
                                        <Barcode className="mr-1.5 h-3.5 w-3.5" />
                                        <span>
                                            {t('Tip: Enter serial number to auto-find customer. If found, customer details will be auto-filled.')}
                                        </span>
                                    </div>
                                </div>

                                {/* Error Message Display */}
                                {searchError && (
                                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-4 w-4 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-2 flex-1">
                                                <p className="text-xs text-amber-800">
                                                    {searchError}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSearchError(null)}
                                                className="flex-shrink-0 ml-2 text-amber-600 hover:text-amber-800"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Device Brand')}
                                        </label>
                                        <select
                                            value={data.device_brand}
                                            onChange={e => setData('device_brand', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                            disabled={isLoadingBrands}
                                        >
                                            <option value="">{isLoadingBrands ? 'Loading...' : 'Select Brand'}</option>
                                            {brands.map(brand => (
                                                <option key={brand.id} value={brand.name}>
                                                    {brand.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Device Model')}
                                        </label>
                                        <div className="space-y-2">
                                            {/* Existing Models Dropdown */}
                                            <select
                                                value={data.device_model}
                                                onChange={e => {
                                                    setData('device_model', e.target.value);
                                                    setNewModelName('');
                                                    setModelCreationError(null);
                                                }}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                                disabled={isLoadingModels || !data.device_brand}
                                            >
                                                <option value="">
                                                    {!data.device_brand 
                                                        ? 'Select brand first' 
                                                        : isLoadingModels 
                                                            ? 'Loading...' 
                                                            : 'Select Model'
                                                    }
                                                </option>
                                                {models.map(model => (
                                                    <option key={model.id} value={model.name}>
                                                        {model.name}
                                                    </option>
                                                ))}
                                                {/* If current device_model is not in the models list, add it as a temporary option */}
                                                {data.device_model && !models.some(m => m.name === data.device_model) && (
                                                    <option value={data.device_model}>
                                                        {data.device_model} (Auto-detected)
                                                    </option>
                                                )}
                                            </select>
                                            
                                            {/* Or create new model */}
                                            {data.device_brand && (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newModelName}
                                                        onChange={e => {
                                                            setNewModelName(e.target.value);
                                                            setModelCreationError(null);
                                                        }}
                                                        placeholder="Or type new model name..."
                                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                                        disabled={isCreatingModel}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={createNewModel}
                                                        disabled={!newModelName.trim() || isCreatingModel}
                                                        className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                                                    >
                                                        {isCreatingModel ? 'Creating...' : 'Create'}
                                                    </button>
                                                </div>
                                            )}
                                            
                                            {/* Error message */}
                                            {modelCreationError && (
                                                <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                                    {modelCreationError}
                                                </p>
                                            )}
                                            
                                            {/* Helper text */}
                                            {data.device_brand && (
                                                <p className="text-xs text-gray-500">
                                                    {models.length > 0 
                                                        ? 'Select from dropdown or create a new model'
                                                        : 'No models found. Create a new one.'
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Device Warranty (in months)')}
                                        </label>
                                        <input
                                            type="text"
                                            value={data.device_warranty}
                                            onChange={e => setData('device_warranty', e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder={t('e.g., 12')}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                        />
                                    </div>
                                </div>

                                {/* Sale Date Display */}
                                {saleDate && (
                                    <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                        <div className="space-y-2">
                                            {/* Sale Date */}
                                            <div className="flex items-start">
                                                <Calendar className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-semibold text-green-800 mb-0.5">
                                                        {t('Device Sale Date')}
                                                    </p>
                                                    <p className="text-sm text-green-700 font-medium">
                                                        {new Date(saleDate).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Warranty Status */}
                                            {(() => {
                                                const warrantyStatus = calculateWarrantyStatus();
                                                if (!warrantyStatus) return null;

                                                return (
                                                    <>
                                                        <div className="border-t border-green-200 pt-2">
                                                            <div className="flex items-start">
                                                                <Shield className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-semibold text-gray-800 mb-1">
                                                                        {t('Warranty Information')}
                                                                    </p>
                                                                    <p className="text-sm text-gray-700">
                                                                        {t('Period')}: <span className="font-medium">{warrantyStatus.warrantyMonths} {t('months')}</span>
                                                                    </p>
                                                                    <p className="text-sm text-gray-700">
                                                                        {t('Valid Until')}: <span className="font-medium">{warrantyStatus.warrantyEndFormatted}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Warranty Status Badge */}
                                                        <div className="border-t border-green-200 pt-3">
                                                            {warrantyStatus.isExpired ? (
                                                                <div className="flex items-center p-3 bg-red-100 border border-red-300 rounded-lg">
                                                                    <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                                                                    <div>
                                                                        <p className="text-sm font-bold text-red-800">
                                                                            {t('WARRANTY EXPIRED')}
                                                                        </p>
                                                                        <p className="text-xs text-red-700 mt-0.5">
                                                                            {t('Expired on')} {warrantyStatus.warrantyEndFormatted}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center p-2 bg-blue-100 border border-blue-300 rounded-lg">
                                                                    <CheckCircle className="h-4 w-4 text-blue-600 mr-1.5 flex-shrink-0" />
                                                                    <div>
                                                                        <p className="text-xs font-bold text-blue-800">
                                                                            {t('WARRANTY ACTIVE')}
                                                                        </p>
                                                                        <p className="text-xs text-blue-700 mt-0.5">
                                                                            {warrantyStatus.monthsRemaining} {t('months remaining')}
                                                                            {warrantyStatus.monthsRemaining === 0 && t(' (expires this month)')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        {t('Problem Description')} *
                                    </label>
                                    <textarea
                                        value={data.problem_description}
                                        onChange={e => setData('problem_description', e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                        rows={3}
                                        required
                                    />
                                    {errors.problem_description && (
                                        <p className="text-red-500 text-xs mt-1">{errors.problem_description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Customer Section */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h2 className="text-base font-semibold text-gray-800">{t('Customer Details')}</h2>
                                </div>

                                <div className="mb-3" ref={customerSearchRef}>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        <div className="flex items-center">
                                            <Search className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Search Existing Customer by Name/Code/Phone/Email')}
                                        </div>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={customerSearch}
                                            onChange={handleCustomerSearch}
                                            onFocus={() => setShowCustomerSearch(true)}
                                            placeholder={t('Type customer name, code, phone or email...')}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                            disabled={isNewCustomer}
                                        />
                                        {isLoadingCustomer && (
                                            <div className="absolute right-3 top-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-vismass-blue"></div>
                                            </div>
                                        )}
                                        {showCustomerSearch && !isNewCustomer && filteredCustomers.length > 0 && (
                                            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {filteredCustomers.map(customer => (
                                                    <div
                                                        key={customer.AccKy}
                                                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-gray-100"
                                                        onClick={() => selectCustomer(customer)}
                                                    >
                                                        <div className="text-xs font-medium text-gray-900">{customer.AccNm}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {t('Code')}: {customer.AccCd} | {t('Phone')}: {customer.phone || 'N/A'}
                                                        </div>
                                                        {customer.email && (
                                                            <div className="text-xs text-gray-400 mt-0.5">
                                                                {t('Email')}: {customer.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {t('Search by customer name, code, phone or email. Details will be auto-filled.')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Customer Name')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={data.customer_name}
                                            onChange={e => setData('customer_name', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                            required
                                            readOnly={!!data.AccKy && !isNewCustomer}
                                        />
                                        {errors.customer_name && (
                                            <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Phone Number')} *
                                        </label>
                                        <input
                                            type="tel"
                                            maxLength={10}
                                            placeholder={t('Enter 10-digit phone number')}
                                            value={data.customer_phone}
                                            onChange={e => {
                                                const value = e.target.value;
                                                // Allow only numbers
                                                setData('customer_phone', value.replace(/\D/g, ''));
                                            }}
                                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition ${errors.customer_phone ? 'border-red-500' : 'border-gray-300'}`}
                                            required
                                            // always allow editing phone number so that users can populate
                                            // a missing value or correct an existing one; the controller
                                            // synchronises the address record when the job is saved.
                                            readOnly={false}
                                        />
                                        {errors.customer_phone && (
                                            <p className="text-red-500 text-xs mt-1">{errors.customer_phone}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Email Address')}
                                        </label>
                                        <input
                                            type="email"
                                            value={data.customer_email}
                                            onChange={e => setData('customer_email', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                            readOnly={!!data.AccKy && !isNewCustomer}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Address')}
                                        </label>
                                        <textarea
                                            value={data.customer_address}
                                            onChange={e => setData('customer_address', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                            rows={2}
                                            readOnly={!!data.AccKy && !isNewCustomer}
                                        />
                                    </div>
                                </div>

                                {data.AccKy && !isNewCustomer && (
                                    <div className="mt-2 p-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg border border-sky-200">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-xs text-sky-800 font-medium flex items-center">
                                                    <svg className="w-3 h-3 mr-1.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <strong>{t('Existing Customer Selected')}:</strong> {data.customer_name}
                                                </p>
                                                <p className="text-xs text-sky-600 mt-0.5 ml-4.5">
                                                    {t('Customer Code')}: {customers.find(c => c.AccKy.toString() === data.AccKy)?.AccCd || sessionStorage.getItem('createdCustomerCode') || 'N/A'}
                                                </p>
                                                <p className="text-xs text-green-700 mt-1 ml-4.5 flex items-center">
                                                    <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    {t('Service job will be linked to this existing customer (no new customer record will be created)')}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setData({
                                                        ...data,
                                                        AccKy: '',
                                                        customer_name: '',
                                                        customer_phone: '',
                                                        customer_email: '',
                                                        customer_address: '',
                                                    });
                                                    setCustomerSearch('');
                                                    setIsNewCustomer(false);
                                                    // Show all customers in dropdown after clearing
                                                    setFilteredCustomers(customers);
                                                    setShowCustomerSearch(true);
                                                    sessionStorage.removeItem('createdCustomerCode');
                                                    window.requestAnimationFrame(() => {
                                                        customerSearchInputRef.current?.focus();
                                                    });
                                                }}
                                                className="inline-flex items-center text-xs text-red-600 hover:text-red-800"
                                            >
                                                <X className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear Selection')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dates and Technician */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2 mb-3">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h2 className="text-base font-semibold text-gray-800">{t('Service Information')}</h2>
                                </div>

                                <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Received Date')} *
                                        </label>
                                        <input
                                            type="date"
                                            value={data.received_date}
                                            onChange={e => setData('received_date', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                            required
                                        />
                                        {errors.received_date && (
                                            <p className="text-red-500 text-xs mt-1">{errors.received_date}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Estimated Completion')}
                                        </label>
                                        <input
                                            type="date"
                                            value={data.estimated_completion_date}
                                            onChange={e => setData('estimated_completion_date', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Assign Technician')}
                                        </label>
                                        <select
                                            value={data.assigned_technician_id}
                                            onChange={e => setData('assigned_technician_id', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                        >
                                            <option value="">{t('Select Technician')}</option>
                                            {technicians.map(tech => (
                                                <option key={tech.id} value={tech.id}>
                                                    {tech.first_name} {tech.last_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                            {t('Advanced Payment')}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.advanced_payment === 0 ? '' : data.advanced_payment}
                                            onChange={e => setData('advanced_payment', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">{t('Amount paid in advance by customer')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Items/Charges (removed) */}
                            {/* eslint-disable-next-line no-constant-binary-expression */}
                            {false && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                            <Package className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h2 className="text-base font-semibold text-gray-800">{t('Parts & Service Charges')}</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addNewItem}
                                        className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30 border border-white/30 shadow-md shadow-blue-500/20"
                                    >
                                        <Plus className="mr-1.5 h-3.5 w-3.5 drop-shadow-sm" />
                                        {t('Add Part')}
                                    </button>
                                </div>

                                {/* Service Charges */}
                                {serviceCharges.length > 0 && (
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium text-gray-700 mb-2">
                                            {t('Quick Add Service Charges')}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {serviceCharges.map(charge => (
                                                <button
                                                    type="button"
                                                    key={charge.id}
                                                    onClick={() => addServiceCharge(charge)}
                                                    className="inline-flex items-center bg-gradient-to-r from-emerald-100 to-green-100 hover:from-emerald-200 hover:to-green-200 text-emerald-800 px-3 py-1.5 rounded-lg transition-all duration-200 text-xs border border-emerald-200"
                                                >
                                                    <Tag className="mr-1.5 h-3 w-3" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Items Table */}
                                {data.items.length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-blue-200/50 shadow-lg shadow-blue-500/10">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Type')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Item Name')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Code/Barcode')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Batch')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Qty')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Unit Price')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Cost Price')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Total')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {data.items.map((item, index) => (
                                                    <tr key={index} className="hover:bg-sky-50/50">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <select
                                                                value={item.item_type}
                                                                onChange={e => handleItemTypeChange(index, e.target.value as any)}
                                                                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                                            >
                                                                <option value="part">{t('Part')}</option>
                                                                <option value="service_charge">{t('Service Charge')}</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div
                                                                ref={el => setItemSearchRef(index, el)}
                                                                className="relative"
                                                            >
                                                                {item.item_type === 'service_charge' ? (
                                                                    <select
                                                                        value={serviceCharges.find(sc => sc.charge_name === item.item_name)?.id ?? ''}
                                                                        onChange={(e) => selectServiceChargeForRow(e.target.value, index)}
                                                                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition bg-white"
                                                                    >
                                                                        <option value="">{t('Select service charge')}</option>
                                                                        {serviceCharges.map(sc => (
                                                                            <option key={sc.id} value={sc.id}>{sc.charge_name} ({t('LKR')} {parseFloat(sc.amount.toString()).toFixed(2)})</option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <>
                                                                        <input
                                                                            type="text"
                                                                            value={itemSearchQueries[index] || item.item_name}
                                                                            onChange={(e) => handleItemSearchChange(e, index)}
                                                                            onFocus={() => {
                                                                                if (item.item_type === 'part') {
                                                                                    setShowItemSearch(prev => ({ ...prev, [index]: true }));
                                                                                }
                                                                            }}
                                                                            placeholder={
                                                                                item.item_type === 'part'
                                                                                    ? t("Search item by name, code or barcode...")
                                                                                    : t("Enter item name")
                                                                            }
                                                                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                                                            required
                                                                        />
                                                                        {item.item_type === 'part' && isSearching[index] && (
                                                                            <div className="absolute right-3 top-2">
                                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-sky-600"></div>
                                                                            </div>
                                                                        )}
                                                                        {item.item_type === 'part' && (showItemSearch[index] || isSearching[index]) && (
                                                                            <div className="absolute z-50 mt-0.5 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                                                {isSearching[index] ? (
                                                                                    <div className="px-3 py-2 text-center text-gray-500">
                                                                                        <div className="flex items-center justify-center">
                                                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-sky-600 mr-2"></div>
                                                                                            {t('Searching items...')}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : itemSearchResults[index] && itemSearchResults[index].length > 0 ? (
                                                                                    itemSearchResults[index].map(result => (
                                                                                        <div
                                                                                            key={result.ItmKy}
                                                                                            className="px-3 py-2 hover:bg-sky-50 cursor-pointer border-b border-gray-100"
                                                                                            onClick={() => selectItem(result, index)}
                                                                                        >
                                                                                            <div className="font-medium text-gray-900">
                                                                                                {result.ItmNm || result.ItemCode}
                                                                                            </div>
                                                                                            <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-2">
                                                                                                <span>
                                                                                                    {t('Code')}: {result.ItemCode}
                                                                                                </span>
                                                                                                <span>
                                                                                                    {t('Barcode')}: {result.BarCode || 'N/A'}
                                                                                                </span>
                                                                                                <span>
                                                                                                    {t('Price')}: {t('LKR')} {
                                                                                                        typeof result.SlsPri === 'string'
                                                                                                            ? parseFloat(result.SlsPri).toFixed(2)
                                                                                                            : result.SlsPri.toFixed(2)
                                                                                                    }
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                ) : itemSearchQueries[index] && itemSearchQueries[index].length > 1 ? (
                                                                                    <div className="px-4 py-3 text-center text-gray-500">
                                                                                        {t('No items found')}
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                            {item.description && (
                                                                <div className="mt-1">
                                                                    <textarea
                                                                        value={item.description || ''}
                                                                        onChange={e => updateItem(index, 'description', e.target.value)}
                                                                        placeholder={t("Description (optional)")}
                                                                        className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1"
                                                                        rows={1}
                                                                    />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="space-y-1">
                                                                {item.item_code && (
                                                                    <div className="flex items-center text-xs">
                                                                        <Tag className="mr-1 h-3 w-3 text-gray-400" />
                                                                        <span className="font-medium">{t('Code')}:</span> {item.item_code}
                                                                    </div>
                                                                )}
                                                                {item.barcode && (
                                                                    <div className="flex items-center text-xs">
                                                                        <Barcode className="mr-1 h-3 w-3 text-gray-400" />
                                                                        <span className="font-medium">{t('Barcode')}:</span> {item.barcode}
                                                                    </div>
                                                                )}
                                                                {!item.item_code && !item.barcode && (
                                                                    <span className="text-xs text-gray-400">{t('N/A')}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                                                            {item.item_type === 'part' && rowBatches[index] && rowBatches[index].length > 0 ? (
                                                                <div className="relative" ref={el => { batchDropdownRefs.current[index] = el; }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setRowBatchDropdownOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                                                                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white flex justify-between items-center"
                                                                    >
                                                                        <span className={item.batch_no ? 'text-gray-900' : 'text-gray-400'}>
                                                                            {item.batch_no
                                                                                ? `${item.batch_no} (${t('Available')}: ${rowBatches[index].find(b=>b.batch_no===item.batch_no)?.available_quantity ?? ''})`
                                                                                : t('Select batch...')
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
                                                                    {rowBatchDropdownOpen[index] && (
                                                                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                                                                            {rowBatches[index].map(b => (
                                                                                <div
                                                                                    key={b.batch_no || 'none'}
                                                                                    className="px-3 py-2 hover:bg-sky-50 cursor-pointer text-xs"
                                                                                    onClick={() => {
                                                                                        updateItem(index, 'batch_no', b.batch_no || '');
                                                                                        setRowBatchDropdownOpen(prev => ({ ...prev, [index]: false }));
                                                                                    }}
                                                                                >
                                                                                    {b.batch_no || t('N/A')} ({t('Available')}: {b.available_quantity})
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                item.batch_no || '-'
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            {item.item_type === 'service_charge' ? null : (
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                                    step="0.0001"
                                                                    min="0.0001"
                                                                    className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <input
                                                                type="number"
                                                                value={item.unit_price}
                                                                onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                                step="0.01"
                                                                min="0"
                                                                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <input
                                                                type="number"
                                                                value={item.cost_price}
                                                                onChange={e => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                                                                step="0.01"
                                                                min="0"
                                                                className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {t('LKR')} {(item.quantity * item.unit_price).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(index)}
                                                                className="text-red-600 hover:text-red-800 flex items-center"
                                                            >
                                                                <X className="mr-1 h-4 w-4" />
                                                                {t('Remove')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gradient-to-r from-blue-50 to-blue-100">
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-2.5 text-right text-sm font-medium text-blue-900">
                                                        {t('Total Amount')}:
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm font-bold text-blue-900">
                                                        {t('LKR')} {totalAmount.toFixed(2)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                                            <Package className="h-12 w-12" />
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-900 mb-2">{t('No items added yet')}</h3>
                                        <p className="text-sm text-gray-500 mb-4">
                                            {t('Click "Add Part" to add items or select service charges above.')}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={addNewItem}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Add First Item')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Information Note */}
                            <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3 mb-3">
                                <div className="flex items-start space-x-2">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-blue-800 mb-0.5">
                                            {t('Automatic Invoice & SMS Creation')}
                                        </h4>
                                        <p className="text-xs text-blue-700">
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end border-t border-slate-200 pt-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded-lg bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-slate-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-75 sm:w-auto"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Creating Service Job...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Save className="w-4 h-4" />
                                            <span>{t('Create Service Job')}</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 text-slate-600">
                        <p className="text-xs">{t('Manage your service jobs efficiently • Professional service solutions')}</p>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
};

export default Create;
