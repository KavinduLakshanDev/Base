import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Truck, ArrowLeft, Save, X, ShoppingCart, Plus, Package } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useRef } from 'react';

interface Product {
    id: number;
    name: string;
    code: string;
    barcode: string;
    category: string;
    unit: string;
    cost_price: number;
    sale_price: number;
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

export default function DeliveryEdit({ delivery, routes, salesReps, products, sections, vehicles, shops }: { delivery: any, routes: any[], salesReps: any[], products: Product[], sections: Section[], vehicles: any[], shops: any[] }) {
    const [deliveryItems, setDeliveryItems] = useState<any[]>(delivery.items || []);
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
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemPrice, setItemPrice] = useState('');

    const { data, setData, put, processing, errors } = useForm({
        // if the delivery is linked to a shop, prefill customer fields from shop data
        customer_name: delivery.shop ? delivery.shop.name || '' : delivery.customer_name || '',
        customer_address: delivery.shop ? delivery.shop.address || '' : delivery.customer_address || '',
        customer_phone: delivery.shop ? delivery.shop.contact_phone || '' : delivery.customer_phone || '',
        route_id: delivery.delivery_route_id ? delivery.delivery_route_id.toString() : '',
        assigned_user_id: delivery.assigned_user_id ? delivery.assigned_user_id.toString() : '',
        vehicle_id: delivery.vehicle_id ? delivery.vehicle_id.toString() : '',
        shop_id: delivery.shop_id ? delivery.shop_id.toString() : '',
        delivery_date: delivery.delivery_date || '',
        delivery_time: delivery.delivery_time || '',
        priority: delivery.priority || 'normal',
        status: delivery.status || 'assigned',
        notes: delivery.notes || '',
        section_id: delivery.section_id || (sections.length > 0 ? sections[0].id.toString() : ''),
        items: delivery.items || [],
    });

// Set selectedSection based on data.section_id
useEffect(() => {
    if (sections.length > 0) {
        const section = sections.find(s => s.id.toString() === data.section_id);
        if (section) {
            setSelectedSection(section.section_code);
        }
    }
}, [data.section_id, sections]);

// whenever shop_id changes, update the customer fields so they reflect the selected shop
useEffect(() => {
    if (data.shop_id) {
        const shop = shops.find(s => String(s.id) === data.shop_id);
        if (shop) {
            setData('customer_name', shop.name || '');
            setData('customer_phone', shop.contact_phone || '');
            setData('customer_address', shop.address || '');
        }
    }
}, [data.shop_id]);

// --- Route-aware helpers (edit) ---
const selectedRoute = routes.find(r => String(r.id) === data.route_id) as any | undefined;
const routeUserIds = selectedRoute?.users?.map((u: any) => u.id) ?? [];
// collect shop ids from both pivot relation and the delivery_route_id column
const routeShopIdsFromPivot = selectedRoute?.shops?.map((s: any) => s.id) ?? [];
const routeShopIdsFromColumn = shops
    .filter((s: any) => String(s.delivery_route_id) === data.route_id)
    .map((s: any) => s.id);
const combinedRouteShopIds = Array.from(new Set([...routeShopIdsFromPivot, ...routeShopIdsFromColumn]));

const filteredSalesReps = routeUserIds.length > 0 ? salesReps.filter((sr: any) => routeUserIds.includes(sr.id)) : salesReps;
const filteredShops = data.route_id
    ? shops.filter((s: any) => combinedRouteShopIds.includes(s.id))
    : shops;
const filteredVehicles = routeUserIds.length > 0 ? vehicles.filter((v: any) => !v.assigned_user_id || routeUserIds.includes(v.assigned_user_id)) : vehicles;

useEffect(() => {
    if (!data.route_id) return;

    if (routeUserIds.length === 1) {
        setData('assigned_user_id', String(routeUserIds[0]));
    } else if (data.assigned_user_id && !routeUserIds.includes(Number(data.assigned_user_id))) {
        setData('assigned_user_id', '');
    }

    if (data.vehicle_id && !filteredVehicles.some((v: any) => String(v.id) === String(data.vehicle_id))) {
        setData('vehicle_id', '');
    }
    if (data.shop_id && !filteredShops.some((s: any) => String(s.id) === String(data.shop_id))) {
        setData('shop_id', '');
    }
}, [data.route_id, routes, vehicles, shops]);

useEffect(() => {
    if (!data.vehicle_id) return;
    const v = vehicles.find((ve: any) => String(ve.id) === String(data.vehicle_id));
    if (v && v.assigned_user_id) {
        if (!data.route_id || routeUserIds.length === 0 || routeUserIds.includes(v.assigned_user_id)) {
            setData('assigned_user_id', String(v.assigned_user_id));
        }
    }
}, [data.vehicle_id, vehicles, data.route_id]);

    useEffect(() => {
        if (data.vehicle_id && data.delivery_date && data.route_id && data.delivery_time) {
            fetch(`/deliveries/vehicle-availability?vehicle_id=${data.vehicle_id}&delivery_date=${encodeURIComponent(data.delivery_date)}&route_id=${data.route_id}&delivery_time=${encodeURIComponent(data.delivery_time)}`)
                .then(r => r.json())
                .then(js => setVehicleError(js.available ? '' : js.message || 'Vehicle unavailable'))
                .catch(() => setVehicleError(''));
        } else {
            setVehicleError('');
        }
    }, [data.vehicle_id, data.delivery_date, data.route_id, data.delivery_time]);

// ------------------------------

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

    // whenever the vehicle is changed we need to clear any product/search state
    useEffect(() => {
        setSelectedProduct(null);
        setSearchTerm('');
        setSearchResults([]);
        setIsDropdownOpen(false);
    }, [data.vehicle_id]);

    // Fetch batches when product, section or vehicle changes
    useEffect(() => {
        // whenever vehicle or product changes we should clear any previous batch to avoid stale selection
        setSelectedBatch(null);

        if (selectedProduct && data.section_id) {
            fetchBatches();
        } else {
            setBatches([]);
            setSelectedBatch(null);
        }
    }, [selectedProduct, data.section_id, data.vehicle_id]);

    const fetchBatches = async () => {
        try {
            let url = `/deliveries/product-batches?product_id=${selectedProduct?.id}&section_id=${data.section_id}`;
            // if vehicle selected, include it so backend returns stock only from that vehicle
            if (data.vehicle_id) {
                url += `&vehicle_id=${data.vehicle_id}`;
            }
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
        setItemPrice(product.sale_price?.toString() || '0');
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
            // if no vehicle is selected, we don't want to return anything (strict vehicle-only behaviour)
            if (!data.vehicle_id) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            let url = `/deliveries/unified-search?term=${encodeURIComponent(value)}`;
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
        // guard against missing vehicle
        if (!data.vehicle_id) {
            alert('Please select a vehicle first');
            return;
        }

        if (!selectedProduct || !itemQuantity || !itemPrice) return;

        if (!selectedBatch) {
            alert('Please select a batch');
            return;
        }

        if (parseFloat(itemQuantity) > selectedBatch.available_quantity) {
            alert(`Insufficient stock. Available: ${selectedBatch.available_quantity}`);
            return;
        }

        const newItem = {
            ItmKy: selectedProduct.id,
            batch_no: selectedBatch.batch_no,
            section_code: selectedSection,
            ItemCode: selectedProduct.code,
            ItemName: selectedProduct.name,
            Unit: selectedProduct.unit,
            quantity: parseFloat(itemQuantity),
            unit_price: parseFloat(itemPrice),
        };

        const updatedItems = [...deliveryItems, newItem];
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/deliveries/${delivery.id}`);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Deliveries', href: '/deliveries' },
            { title: `Edit Delivery #${delivery.delivery_number}`, href: `/deliveries/${delivery.id}/edit` }
        ]}>
            <Head title={`Edit Delivery #${delivery.delivery_number} - POS System`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}


                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={`/deliveries/${delivery.id}`}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Edit Delivery #{delivery.delivery_number}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Update delivery information and details
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Customer Information */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-6">Customer Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="customer_name" className="text-sm font-medium text-slate-700">
                                        Customer Name *
                                    </Label>
                                    <Input
                                        id="customer_name"
                                        type="text"
                                        value={data.customer_name}
                                        onChange={(e) => setData('customer_name', e.target.value)}
                                        className="mt-1 block w-full border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue"
                                        required
                                    />
                                    <InputError message={errors.customer_name} />
                                </div>

                                <div>
                                    <Label htmlFor="customer_phone" className="text-sm font-medium text-slate-700">
                                        Phone Number *
                                    </Label>
                                    <Input
                                        id="customer_phone"
                                        type="tel"
                                        value={data.customer_phone}
                                        onChange={(e) => setData('customer_phone', e.target.value)}
                                        className="mt-1 block w-full border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue"
                                        required
                                    />
                                    <InputError message={errors.customer_phone} />
                                </div>

                                <div className="md:col-span-2">
                                    <Label htmlFor="customer_address" className="text-sm font-medium text-slate-700">
                                        Delivery Address *
                                    </Label>
                                    <Textarea
                                        id="customer_address"
                                        value={data.customer_address}
                                        onChange={(e) => setData('customer_address', e.target.value)}
                                        rows={3}
                                        className="mt-1 block w-full border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue"
                                        required
                                    />
                                    <InputError message={errors.customer_address} />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-6">Delivery Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="delivery_route_id" className="text-sm font-medium text-slate-700">
                                        Delivery Route *
                                    </Label>
                                    <Select value={data.route_id || undefined} onValueChange={(value) => setData('route_id', value)}>
                                        <SelectTrigger className="mt-1 border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue">
                                            <SelectValue placeholder="Select a route" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {routes.map((route) => (
                                                <SelectItem key={route.id} value={route.id.toString()}>
                                                    {route.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.route_id} />
                                </div>

                                <div>
                                    <Label htmlFor="vehicle_id" className="text-sm font-medium text-slate-700">
                                        Vehicle (optional)
                                    </Label>
                                    <Select value={data.vehicle_id || undefined} onValueChange={(value) => setData('vehicle_id', value)}>
                                        <SelectTrigger className="mt-1 border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue">
                                            <SelectValue placeholder="Select vehicle (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredVehicles.length === 0 && routeUserIds.length > 0 ? (
                                                <SelectItem value="none" disabled>— no vehicles available for selected route —</SelectItem>
                                            ) : (
                                                filteredVehicles.map((v: any) => (
                                                    <SelectItem key={v.id} value={v.id.toString()}>
                                                        {v.name} {v.registration_no ? `(${v.registration_no})` : ''}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.vehicle_id || vehicleError} />
                                </div>

                                <div>
                                    <Label htmlFor="assigned_user_id" className="text-sm font-medium text-slate-700">
                                        Sales Representative
                                    </Label>
                                    <Select value={data.assigned_user_id || undefined} onValueChange={(value) => setData('assigned_user_id', value)}>
                                        <SelectTrigger className="mt-1 border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue">
                                            <SelectValue placeholder="Select a sales representative (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredSalesReps.length === 0 && routeUserIds.length > 0 ? (
                                                <SelectItem value="none" disabled>— no sales reps assigned to this route —</SelectItem>
                                            ) : (
                                                filteredSalesReps.map((salesRep: any) => (
                                                    <SelectItem key={salesRep.id} value={salesRep.id.toString()}>
                                                        {salesRep.first_name} {salesRep.last_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.assigned_user_id} />
                                </div>

                                <div>
                                    <Label htmlFor="shop_id" className="text-sm font-medium text-slate-700">Shop (optional)</Label>
                                    <Select value={data.shop_id || undefined} onValueChange={(value) => setData('shop_id', value)}>
                                        <SelectTrigger className="mt-1 border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue">
                                            <SelectValue placeholder="Select shop (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {data.route_id && filteredShops.length === 0 ? (
                                                <SelectItem value="none" disabled>— no shops assigned to this route —</SelectItem>
                                            ) : (
                                                filteredShops.map((s: any) => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.shop_id} />
                                </div>

                                <div>
                                    <Label htmlFor="status" className="text-sm font-medium text-slate-700">
                                        Status *
                                    </Label>
                                    <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                        <SelectTrigger className="mt-1 border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="assigned">Assigned</SelectItem>
                                            <SelectItem value="delivering">Delivering</SelectItem>
                                            <SelectItem value="delivered">Delivered</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.status} />
                                </div>

                                <div>
                                    <Label htmlFor="priority" className="text-sm font-medium text-slate-700">
                                        Priority
                                    </Label>
                                    <Select value={data.priority} onValueChange={(value) => setData('priority', value)}>
                                        <SelectTrigger className="mt-1 border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.priority} />
                                </div>

                                <div>
                                    <Label htmlFor="delivery_date" className="text-sm font-medium text-slate-700">
                                        Delivery Date
                                    </Label>
                                    <Input
                                        id="delivery_date"
                                        type="date"
                                        value={data.delivery_date}
                                        onChange={(e) => setData('delivery_date', e.target.value)}
                                        className="mt-1 block w-full border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue"
                                    />
                                    <InputError message={errors.delivery_date} />
                                </div>

                                <div>
                                    <Label htmlFor="delivery_time" className="text-sm font-medium text-slate-700">
                                        Delivery Time
                                    </Label>
                                    <Select value={data.delivery_time || undefined} onValueChange={(value) => setData('delivery_time', value)}>
                                        <SelectTrigger className="mt-1 border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue">
                                            <SelectValue placeholder="Select delivery time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                                            <SelectItem value="afternoon">Afternoon (12PM - 4PM)</SelectItem>
                                            <SelectItem value="evening">Evening (4PM - 8PM)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.delivery_time} />
                                </div>

                                <div className="md:col-span-2">
                                    <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
                                        Notes
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows={3}
                                        className="mt-1 block w-full border-slate-300 focus:border-vismass-blue focus:ring-vismass-blue"
                                    />
                                    <InputError message={errors.notes} />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Items */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                    <ShoppingCart className="w-5 h-5 text-vismass-blue" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800">Delivery Items</h3>
                                <span className="ml-1 text-red-600">*</span>
                            </div>

                            {/* Global Settings */}
                            {/* <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                    Delivery Settings (applies to all items)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    Section Selection
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Section *
                                        </label>
                                        <select
                                            value={data.section_id}
                                            onChange={(e) => setData('section_id', e.target.value)}
                                            className="w-full rounded-lg border-slate-300 shadow-sm focus:border-vismass-blue focus:ring focus:ring-vismass-blue/50"
                                            required
                                        >
                                            {sections.map((section) => (
                                                <option key={section.id} value={section.id}>
                                                    {section.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div> */}

                            {/* Add Item Form */}
                            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 mb-6">
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                                    {/* <div>
                                        <label className="mb-2 text-sm font-medium text-slate-700">Section</label>
                                        <select
                                            value={selectedSection}
                                            onChange={(e) => {
                                                setSelectedSection(e.target.value);
                                                setSelectedProduct(null);
                                                setSelectedBatch(null);
                                                setBatches([]);
                                                setItemPrice('');
                                                setItemQuantity('');
                                            }}
                                            className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        >
                                            <option value="">Select section</option>
                                            {sections.map((section) => (
                                                <option key={section.id} value={section.section_code}>
                                                    {section.section_code} - {section.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div> */}
                                    <div className="relative group">
                                        <label className="mb-2 text-sm font-medium text-slate-700">Product</label>
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
                                                                        <span className="font-medium text-slate-700">Rs. {Number(product.sale_price).toFixed(2)}</span>
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
                                    <div>
                                        <label className="mb-2 text-sm font-medium text-slate-700">Batch</label>
                                        <select
                                            value={selectedBatch?.batch_no || ''}
                                            onChange={(e) => setSelectedBatch(batches.find(b => b.batch_no === e.target.value) || null)}
                                            className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            disabled={!selectedProduct}
                                        >
                                            <option value="">Select batch</option>
                                            {batches.map((batch) => (
                                                <option key={batch.batch_no} value={batch.batch_no || ''}>
                                                    {batch.batch_no} | Stock: {Number(batch.available_quantity).toFixed(2)} {selectedProduct?.unit || ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 text-sm font-medium text-slate-700">Quantity</label>
                                        <input
                                            type="number"
                                            value={itemQuantity}
                                            onChange={(e) => setItemQuantity(e.target.value)}
                                            placeholder="0"
                                            step="0.01"
                                            min="0.01"
                                            className="block w-18 rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            disabled={!selectedBatch}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 text-sm font-medium text-slate-700">Unit Price</label>
                                        <input
                                            type="number"
                                            value={itemPrice}
                                            onChange={(e) => setItemPrice(e.target.value)}
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                            className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            disabled={!selectedProduct}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={addItem}
                                            disabled={!data.vehicle_id || !selectedBatch || !itemQuantity || !itemPrice}
                                            className="w-full rounded bg-vismass-blue hover:bg-vismass-blue/90 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Plus className="w-4 h-4 inline mr-1" />
                                            Add Item
                                        </button>
                                    </div>
                                </div>

                                {/* Stock Display Box */}
                                {selectedBatch && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <Package className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-blue-900">Available Stock</h4>
                                                    <p className="text-xs text-blue-700">
                                                        {selectedProduct ? `${selectedProduct.code} - ${selectedProduct.name}` : ''}
                                                    </p>
                                                    <p className="text-xs font-medium text-blue-800 mt-1">
                                                        Batch: {selectedBatch.batch_no}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {Number(selectedBatch.available_quantity).toFixed(2)}
                                                </div>
                                                <div className="text-xs text-blue-600">
                                                    {selectedProduct?.unit || 'units'} available
                                                </div>
                                            </div>
                                        </div>
                                        {(() => {
                                            const stock = selectedBatch.available_quantity;
                                            const requestedQty = parseFloat(itemQuantity) || 0;

                                            if (requestedQty > stock) {
                                                return (
                                                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                                                        ⚠️ Warning: Requested quantity ({requestedQty}) exceeds available stock ({stock})
                                                    </div>
                                                );
                                            } else if (requestedQty > 0 && requestedQty <= stock * 0.1) {
                                                return (
                                                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
                                                        ⚠️ Low stock warning: Only {stock} units remaining
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            {deliveryItems.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                        <h4 className="text-sm font-medium text-slate-700">Selected Items ({deliveryItems.length})</h4>
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
                                                                Batch: <span className="font-medium">{item.batch_no || 'N/A'}</span> | Quantity: {Number(item.quantity).toFixed(2)} {item.Unit} × Rs.{Number(item.unit_price).toFixed(2)} = Rs.{(item.quantity * item.unit_price).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-600 hover:text-red-800 p-1"
                                                >
                                                    <X className="w-4 h-4" />
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

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-4">
                            <Link
                                href={`/deliveries/${delivery.id}`}
                                className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                            >
                                Cancel
                            </Link>
                            <Button
                                type="submit"
                                disabled={processing || deliveryItems.length === 0 || !!vehicleError}
                                className="bg-vismass-blue hover:bg-vismass-blue/90 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {processing ? 'Updating...' : 'Update Delivery'}
                            </Button>
                        </div>
                    </form>
                </main>
            </div>
        </AppLayout>
    );
}