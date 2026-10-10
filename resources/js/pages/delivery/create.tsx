import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState, useEffect, useRef } from 'react';
import { Truck, Plus, MapPin, Package, Calendar, Clock, ArrowLeft, ShoppingCart, Trash } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    code: string;
    barcode: string;
    category: string;
    unit: string;
    cost_price: number;
    sale_price: number;
    VehicleSalePrice: number;
    tiers?: {
        tier1: { qty: number; discount: number };
        tier2: { qty: number; discount: number };
        tier3: { qty: number; discount: number };
        tier4: { qty: number; discount: number };
    };
}

interface Section {
    id: number;
    section_code: string;
    name: string;
}

interface Batch {
    batch_no: string | null;
    serial_number: string | null;
    available_quantity: number;
    brand: string | null;
    model: string | null;
    warranty: string | null;
    last_date: string;
}

export default function CreateDelivery({ routes, salesReps, products, sections, vehicles, shops }: { routes: any[], salesReps: any[], products: Product[], sections: Section[], vehicles: any[], shops: any[] }) {
    const [deliveryItems, setDeliveryItems] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
    const batchDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [vehicleError, setVehicleError] = useState<string>('');
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    // Auto-set price when product is selected
    useEffect(() => {
        if (selectedProduct && !itemPrice) {
            setItemPrice(selectedProduct.VehicleSalePrice.toString());
        }
    }, [selectedProduct]);

    const { data, setData, post, processing, errors } = useForm({
        customer_name: '',
        customer_address: '',
        customer_phone: '',
        delivery_route_id: '',
        assigned_user_id: '',
        vehicle_id: '',
        shop_id: '',
        delivery_date: '',
        delivery_time: '',
        priority: 'normal',
        notes: '',
        section_id: sections.length > 0 ? sections[0].id.toString() : '',
        items: [] as any[],
    });

    // Set initial selectedSection to first section
    useEffect(() => {
        if (sections.length > 0) {
            const section = sections.find(s => s.id.toString() === data.section_id);
            if (section) {
                setSelectedSection(section.section_code);
            }
        }
    }, [data.section_id, sections]);

    // --- Route-aware helpers (filter / auto-select to avoid conflicts) ---
    const selectedRoute = routes.find(r => String(r.id) === data.delivery_route_id) as any | undefined;
    const routeUserIds = selectedRoute?.users?.map((u: any) => u.id) ?? [];
    const routeShopIds = selectedRoute?.shops?.map((s: any) => s.id) ?? [];

    const filteredSalesReps = routeUserIds.length > 0 ? salesReps.filter((sr: any) => routeUserIds.includes(sr.id)) : salesReps;
    const filteredShops = routeShopIds.length > 0 ? shops.filter((s: any) => routeShopIds.includes(s.id)) : shops;
    const filteredVehicles = routeUserIds.length > 0 ? vehicles.filter((v: any) => !v.assigned_user_id || routeUserIds.includes(v.assigned_user_id)) : vehicles;

    // When route changes: ensure selected salesRep/vehicle/shop remain valid for the route.
    useEffect(() => {
        if (!data.delivery_route_id) return;

        // auto-select single-route sales rep
        if (routeUserIds.length === 1) {
            setData('assigned_user_id', String(routeUserIds[0]));
        } else if (data.assigned_user_id && !routeUserIds.includes(Number(data.assigned_user_id))) {
            // clear rep if it's not part of selected route
            setData('assigned_user_id', '');
        }

        // clear vehicle/shop if they don't match filtered lists
        if (data.vehicle_id && !filteredVehicles.some((v: any) => String(v.id) === String(data.vehicle_id))) {
            setData('vehicle_id', '');
        }
        if (data.shop_id && !filteredShops.some((s: any) => String(s.id) === String(data.shop_id))) {
            setData('shop_id', '');
        }
    }, [data.delivery_route_id, routes, vehicles, shops]);

    // When vehicle is selected, if it has an assigned_user, set the sales rep (only if compatible with route)
    useEffect(() => {
        if (!data.vehicle_id) return;
        const v = vehicles.find((ve: any) => String(ve.id) === String(data.vehicle_id));
        if (v && v.assigned_user_id) {
            const assignedIdStr = String(v.assigned_user_id);
            if (!data.delivery_route_id || routeUserIds.length === 0 || routeUserIds.includes(v.assigned_user_id)) {
                setData('assigned_user_id', assignedIdStr);
            }
        }
    }, [data.vehicle_id, vehicles, data.delivery_route_id]);

    // validate vehicle availability against other deliveries whenever key fields change
    useEffect(() => {
        if (data.vehicle_id && data.delivery_date && data.delivery_route_id && data.delivery_time) {
            fetch(`/deliveries/vehicle-availability?vehicle_id=${data.vehicle_id}&delivery_date=${encodeURIComponent(data.delivery_date)}&route_id=${data.delivery_route_id}&delivery_time=${encodeURIComponent(data.delivery_time)}`)
                .then(r => r.json())
                .then(js => {
                    setVehicleError(js.available ? '' : js.message || 'Vehicle unavailable');
                })
                .catch(() => setVehicleError(''));
        } else {
            setVehicleError('');
        }
    }, [data.vehicle_id, data.delivery_date, data.delivery_route_id, data.delivery_time]);

    // ---------------------------------------------------------------------


    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (
                batchDropdownRef.current &&
                !batchDropdownRef.current.contains(event.target as Node)
            ) {
                setIsBatchDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch batches when product, section, or vehicle changes
    useEffect(() => {
        if (selectedProduct && (data.section_id || data.vehicle_id)) {
            fetchBatches();
        } else {
            setBatches([]);
            setSelectedBatch(null);
        }
    }, [selectedProduct, data.section_id, data.vehicle_id]);

    const fetchBatches = async () => {
        if (!data.vehicle_id) return; // Strict: vehicle only

        try {
            let url = `/deliveries/product-batches?product_id=${selectedProduct?.id}`;
            // If vehicle is selected, strictly filter by vehicle stock
            url += `&vehicle_id=${data.vehicle_id}`;
            const response = await fetch(url);
            const batchData = await response.json();
            setBatches(batchData);
        } catch (error) {
            console.error('Error fetching batches:', error);
            setBatches([]);
        }
    };

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setSearchTerm(product.name);
        setIsDropdownOpen(false);
        setItemPrice(product.VehicleSalePrice ? Number(product.VehicleSalePrice).toFixed(2) : '0.00');
        // Reset batch selection when product changes
        setSelectedBatch(null);
    };

    const handleBatchSelect = (batch: Batch) => {
        setSelectedBatch(batch);
        setIsBatchDropdownOpen(false);
    };

    const handleSearchChange = async (value: string) => {
        setSearchTerm(value);

        if (!value || value.length < 2) {
            setSearchResults([]);
            setIsDropdownOpen(false);
            return;
        }

        setIsSearching(true);
        setIsDropdownOpen(true);

        try {
            let url = `/deliveries/unified-search?term=${encodeURIComponent(value)}`;

            if (!data.vehicle_id) {
                // Strict: vehicle only
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            // If vehicle is selected, strictly filter by vehicle stock
            url += `&vehicle_id=${data.vehicle_id}`;

            const response = await fetch(url);
            const results = await response.json();
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const addItem = () => {
        if (!selectedProduct || !itemQuantity || !itemPrice) return;

        if (!selectedSection) {
            alert('Please select a section');
            return;
        }

        if (!selectedBatch) {
            alert('Please select a batch');
            return;
        }

        const qty = parseFloat(itemQuantity);
        if (qty > selectedBatch.available_quantity) {
            alert(`Insufficient stock. Available: ${selectedBatch.available_quantity}`);
            return;
        }

        // check for existing line with same product + batch
        const existingIndex = deliveryItems.findIndex(it =>
            it.ItmKy === selectedProduct.id && it.batch_no === selectedBatch.batch_no
        );

        let updatedItems;
        if (existingIndex >= 0) {
            // merge quantities
            const existing = { ...deliveryItems[existingIndex] };
            const combinedQty = existing.quantity + qty;
            if (combinedQty > selectedBatch.available_quantity) {
                alert(`Insufficient stock when combining lines. Available: ${selectedBatch.available_quantity}`);
                return;
            }
            existing.quantity = combinedQty;
            updatedItems = [...deliveryItems];
            updatedItems[existingIndex] = existing;
        } else {
            const newItem = {
                ItmKy: selectedProduct.id,
                batch_no: selectedBatch.batch_no,
                section_code: selectedSection,
                ItemCode: selectedProduct.code,
                ItemName: selectedProduct.name,
                Unit: selectedProduct.unit,
                quantity: qty,
                unit_price: parseFloat(itemPrice),
                original_price: selectedProduct.VehicleSalePrice,
            };
            updatedItems = [...deliveryItems, newItem];
        }

        setDeliveryItems(updatedItems);
        setData('items', updatedItems);

        // Reset form
        setSelectedProduct(null);
        setSearchTerm('');
        setBatches([]);
        setSelectedBatch(null);
        setItemQuantity('');
        setItemPrice('');
    };

    const removeItem = (index: number) => {
        const updatedItems = deliveryItems.filter((_, i) => i !== index);
        setDeliveryItems(updatedItems);
        setData('items', updatedItems);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/deliveries');
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Deliveries', href: '/deliveries' },
            { title: 'Assign New Delivery', href: '/deliveries/create' }
        ]}>
            <Head title="Assign New Delivery - POS System" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Assign New Delivery
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Create and assign a new delivery to your distribution network
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    {/* Form Container */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        <form onSubmit={submit} className="space-y-8">

                            {/* Delivery Details Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Truck className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">Delivery Details</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Delivery Route
                                                <span className="ml-1 text-red-600">*</span>
                                            </label>
                                            <select
                                                value={data.delivery_route_id}
                                                onChange={(e) => setData('delivery_route_id', e.target.value)}
                                                required
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            >
                                                <option value="">Select delivery route</option>
                                                {routes.map((route) => (
                                                    <option key={route.id} value={route.id}>
                                                        🚛 {route.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.delivery_route_id} />
                                        </div>

                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Delivery Date
                                                <span className="ml-1 text-red-600">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={data.delivery_date}
                                                onChange={(e) => setData('delivery_date', e.target.value)}
                                                required
                                                className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            />
                                            <InputError message={errors.delivery_date} />
                                        </div>

                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Priority Level
                                            </label>
                                            <select
                                                value={data.priority}
                                                onChange={(e) => setData('priority', e.target.value)}
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            >
                                                <option value="low">🟢 Low Priority</option>
                                                <option value="normal">🟡 Normal Priority</option>
                                                <option value="high">🔴 High Priority</option>
                                                <option value="urgent">🚨 Urgent</option>
                                            </select>
                                            <InputError message={errors.priority} />
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <Truck className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Vehicle
                                                <span className="ml-1 text-red-600">*</span>
                                            </label>
                                            <select
                                                value={data.vehicle_id}
                                                onChange={(e) => setData('vehicle_id', e.target.value)}
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            >
                                                <option value="">Select vehicle</option>
                                                {filteredVehicles.length === 0 ? (
                                                    <option disabled>— no vehicles available for selected route —</option>
                                                ) : (
                                                    filteredVehicles.map((v: any) => (
                                                        <option key={v.id} value={v.id}>
                                                            🚚 {v.name} {v.registration_no ? `(${v.registration_no})` : ''}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            {data.delivery_route_id && <p className="text-xs text-gray-500 mt-1">Showing vehicles assigned to the selected route's sales reps (or unassigned vehicles).</p>}
                                            <InputError message={errors.vehicle_id || vehicleError} />
                                        </div>

                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <Truck className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Sale Representative
                                            </label>
                                            <select
                                                value={data.assigned_user_id}
                                                onChange={(e) => setData('assigned_user_id', e.target.value)}
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            >
                                                <option value="">Select sales representative</option>
                                                {filteredSalesReps.length === 0 && routeUserIds.length > 0 ? (
                                                    <option disabled>— no active sales reps assigned to this route —</option>
                                                ) : (
                                                    filteredSalesReps.map((salesRep: any) => (
                                                        <option key={salesRep.id} value={salesRep.id}>
                                                            👤 {salesRep.first_name} {salesRep.last_name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            {data.delivery_route_id && <p className="text-xs text-gray-500 mt-1">Showing sales reps assigned to the selected route.</p>}
                                            <InputError message={errors.assigned_user_id} />
                                        </div>

                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Shop
                                                <span className="ml-1 text-red-600">*</span>
                                            </label>
                                            <select
                                                value={data.shop_id}
                                                onChange={(e) => setData('shop_id', e.target.value)}
                                                required
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            >
                                                <option value="">Select shop</option>
                                                {filteredShops.length === 0 && routeShopIds.length > 0 ? (
                                                    <option disabled>— no shops assigned to this route —</option>
                                                ) : (
                                                    filteredShops.map((s: any) => (
                                                        <option key={s.id} value={s.id}>
                                                            🏬 {s.name}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            {data.delivery_route_id && <p className="text-xs text-gray-500 mt-1">Showing shops assigned to the selected route.</p>}
                                            <InputError message={errors.shop_id} />
                                        </div>

                                        <div>
                                            <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                                <Clock className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Preferred Time
                                            </label>
                                            <select
                                                value={data.delivery_time}
                                                onChange={(e) => setData('delivery_time', e.target.value)}
                                                className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            >
                                                <option value="">Select preferred time</option>
                                                <option value="morning">🌅 Morning (9:00 AM - 12:00 PM)</option>
                                                <option value="afternoon">☀️ Afternoon (12:00 PM - 5:00 PM)</option>
                                                <option value="evening">🌆 Evening (5:00 PM - 8:00 PM)</option>
                                                <option value="anytime">🕐 Anytime</option>
                                            </select>
                                            <InputError message={errors.delivery_time} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Package className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">Additional Information</h2>
                                </div>

                                <div>
                                    <label className="mb-2 text-sm font-medium text-slate-700 flex items-center">
                                        <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                        Delivery Notes
                                    </label>
                                    <textarea
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={4}
                                        className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none resize-none"
                                        placeholder="e.g., Special delivery instructions, package details, or customer preferences..."
                                    />
                                    <InputError message={errors.notes} />
                                </div>
                            </div>

                            {/* Delivery Items Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <ShoppingCart className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">Delivery Items</h2>
                                    <span className="ml-1 text-red-600">*</span>
                                </div>

                                {/* Add Item Form */}
                                <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <Plus className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800">
                                                    Add Delivery Item
                                                </h3>
                                                <p className="text-xs text-slate-500">Search products, select batch, and define quantity.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                        {/* Product Search - Spans 7 cols */}
                                        <div className="lg:col-span-7 space-y-2 relative" ref={dropdownRef}>
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                                                Search Product <span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Package className={`h-5 w-5 ${!data.vehicle_id ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-vismass-blue'}`} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={searchTerm}
                                                    onChange={(e) => handleSearchChange(e.target.value)}
                                                    onFocus={() => {
                                                        if (data.vehicle_id) setIsDropdownOpen(true);
                                                    }}
                                                    disabled={!data.vehicle_id}
                                                    className={`block w-full pl-10 pr-3 py-2.5 border ${!data.vehicle_id ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400' : 'border-slate-300 bg-white focus:ring-2 focus:ring-vismass-blue/20 focus:border-vismass-blue'} rounded-xl shadow-sm transition-all duration-200 sm:text-sm`}
                                                    placeholder={!data.vehicle_id ? "Select a vehicle first" : "Type product code, name, or scan barcode..."}
                                                    autoComplete="off"
                                                />
                                                {/* Category Badge if selected */}
                                                {selectedProduct && (
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                                            {selectedProduct.category || 'Item'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Search Dropdown */}
                                            {isDropdownOpen && (
                                                <div className="absolute z-50 mt-1 w-full rounded-xl bg-white shadow-xl border border-slate-200 max-h-72 overflow-y-auto ring-1 ring-black ring-opacity-5">
                                                    {isSearching ? (
                                                        <div className="px-4 py-8 text-center text-slate-500 flex flex-col items-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vismass-blue mb-2"></div>
                                                            <span className="text-xs">Searching inventory...</span>
                                                        </div>
                                                    ) : searchResults.length > 0 ? (
                                                        <div className="py-2">
                                                            {searchResults.map((product) => (
                                                                <div
                                                                    key={product.id}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleProductSelect(product);
                                                                    }}
                                                                    className="px-4 py-3 cursor-pointer hover:bg-vismass-blue/5 border-b border-slate-50 last:border-b-0 group"
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-semibold text-slate-800 group-hover:text-vismass-blue transition-colors">
                                                                                {product.name}
                                                                            </p>
                                                                            <div className="flex items-center mt-1 space-x-2 text-xs text-slate-500">
                                                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{product.code}</span>
                                                                                {product.barcode && <span>• Barcode: {product.barcode}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="font-medium text-slate-700">Rs. {Number(product.VehicleSalePrice).toFixed(2)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        searchTerm.length > 1 && (
                                                            <div className="px-4 py-8 text-center text-slate-500">
                                                                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-50" />
                                                                <p className="text-sm">No products found matching "{searchTerm}"</p>
                                                                <p className="text-xs text-slate-400 mt-1">Try checking the vehicle inventory.</p>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Batch Selection - Spans 5 cols */}
                                        <div className="lg:col-span-5 space-y-2 relative" ref={batchDropdownRef}>
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                                                Select Batch <span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                                                    disabled={!selectedProduct || batches.length === 0}
                                                    className={`w-full rounded-xl border px-4 py-2.5 text-left flex items-center justify-between shadow-sm transition-all duration-200 ${!selectedProduct
                                                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                                        : 'bg-white border-slate-300 hover:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20'
                                                        }`}
                                                >
                                                    <span className={`block truncate ${selectedBatch ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                                                        {selectedBatch
                                                            ? `${selectedBatch.batch_no || 'Unknown Batch'} (Qty: ${selectedBatch.available_quantity})`
                                                            : (batches.length === 0 && selectedProduct ? 'No stock available' : 'Select a batch...')}
                                                    </span>
                                                    <div className="ml-2 flex flex-col justify-center">
                                                        {isBatchDropdownOpen ? (
                                                            <div className="h-0 w-0 border-x-4 border-x-transparent border-b-[6px] border-b-slate-500" />
                                                        ) : (
                                                            <div className="h-0 w-0 border-x-4 border-x-transparent border-t-[6px] border-t-slate-500" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Batch Dropdown */}
                                                {isBatchDropdownOpen && batches.length > 0 && (
                                                    <div className="absolute z-40 mt-1 w-full rounded-xl bg-white shadow-xl border border-slate-200 max-h-60 overflow-y-auto ring-1 ring-black ring-opacity-5">
                                                        {batches.map((batch, index) => (
                                                            <div
                                                                key={index}
                                                                onClick={() => handleBatchSelect(batch)}
                                                                className="px-4 py-3 cursor-pointer hover:bg-vismass-blue/5 border-b border-slate-50 last:border-b-0 group transition-colors"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <span className="font-semibold text-slate-700 group-hover:text-vismass-blue">
                                                                            {batch.batch_no || 'N/A'}
                                                                        </span>
                                                                        {batch.warranty && (
                                                                            <p className="text-xs text-slate-400 mt-0.5">Warranty: {batch.warranty}</p>
                                                                        )}
                                                                    </div>
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                        {batch.available_quantity} available
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Divider for visual separation */}
                                        <div className="hidden lg:block lg:col-span-12 border-t border-slate-200 my-2"></div>

                                        {/* Quantity - Spans 3 cols */}
                                        <div className="lg:col-span-3 space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                                                Quantity <span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={itemQuantity}
                                                    onChange={(e) => setItemQuantity(e.target.value)}
                                                    disabled={!selectedBatch}
                                                    className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/20 py-2.5 px-3 disabled:bg-slate-50 disabled:text-slate-400"
                                                    placeholder="0"
                                                />
                                                {/* <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <span className="text-slate-400 text-xs">
                                                        {selectedProduct?.unit || 'Units'}
                                                    </span>
                                                </div> */}
                                            </div>
                                            {selectedBatch && (
                                                <div className="text-xs text-slate-500 text-right">
                                                    Max: {selectedBatch.available_quantity}
                                                </div>
                                            )}
                                        </div>

                                        {/* Unit Price - Spans 3 cols */}
                                        <div className="lg:col-span-3 space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                                                Unit Price <span className="text-red-500 ml-1">*</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-slate-400 text-sm">Rs.</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={itemPrice}
                                                    onChange={(e) => setItemPrice(e.target.value)}
                                                    disabled={!selectedBatch}
                                                    className="block w-full rounded-xl border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/20 py-2.5 pl-10 pr-3 disabled:bg-slate-50 disabled:text-slate-400"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                                <div className="h-4"></div>
                                            </div>

                                        {/* Line Total Preview - Spans 3 cols */}
                                        <div className="lg:col-span-3 space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                Line Total
                                            </label>
                                            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-right font-mono text-slate-700 shadow-inner">
                                                Rs. {((parseFloat(itemQuantity) || 0) * (parseFloat(itemPrice) || 0)).toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Add Button - Spans 3 cols (Action) */}
                                        <div className="lg:col-span-3 flex items-start pt-6">
                                            <button
                                                type="button"
                                                onClick={addItem}
                                                disabled={!selectedProduct || !selectedSection || !selectedBatch || !itemQuantity || !itemPrice}
                                                className="w-full h-[42px] rounded-xl bg-vismass-blue hover:bg-vismass-blue/90 text-white font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center transform active:scale-[0.98]"
                                            >
                                                <Plus className="w-5 h-5 mr-2" />
                                                Add to List
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Items List */}
                                {deliveryItems.length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                            <h3 className="text-sm font-medium text-slate-700">Selected Items ({deliveryItems.length})</h3>
                                        </div>
                                        <div className="divide-y divide-slate-200">
                                            {deliveryItems.map((item, index) => (
                                                <div key={index} className="px-4 py-3 flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3">
                                                            <Package className="w-4 h-4 text-vismass-blue" />
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-800">
                                                                    {item.ItemCode} - {item.ItemName}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    Batch: <span className="font-medium">{item.batch_no || 'N/A'}</span> | Quantity: {Number(item.quantity).toFixed(2)} {item.quantity} × Rs.{Number(item.unit_price).toFixed(2)}
                                                                    = Rs.{(item.quantity * item.unit_price).toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-700">Total Items: {deliveryItems.length}</span>
                                                <span className="text-sm font-medium text-slate-700">
                                                    Total Value: Rs.{deliveryItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {deliveryItems.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                        <p>No items added yet. Please add at least one item for delivery.</p>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-6 border-t border-slate-200">
                                <button
                                    type="submit"
                                    disabled={processing || deliveryItems.length === 0 || !!vehicleError}
                                    className="rounded-lg bg-vismass-blue hover:bg-vismass-blue/90 text-white px-6 py-3 text-sm font-medium disabled:opacity-50 focus:outline-none transition-colors"
                                >
                                    {processing ? (
                                        <span className="flex items-center">
                                            <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Assigning Delivery...
                                        </span>
                                    ) : (
                                        <span className="flex items-center">
                                            <Plus className="w-5 h-5 mr-2" />
                                            Assign Delivery
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}