import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, Filter, Plus, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';
import BatchManagementModal from './BatchManagementModal';
import { toast } from 'sonner';

interface Batch {
    id: string;
    batch_no: string;
    item_code: string;
    item_name: string;
    category: string;
    quantity: number;
    cost_price: number;
    selling_price: number;
    expiry_date?: string;
    created_at: string;
    updated_at: string;
    status: 'active' | 'expired' | 'low_stock' | 'out_of_stock';
    section_code: string;
    section_name: string;
}

interface BatchListViewProps {
    initialBatches?: Batch[];
    businessUnit: 'vismass' | 'malibo';
}

export default function BatchListView({ initialBatches = [], businessUnit }: BatchListViewProps) {
    const [batches, setBatches] = useState<Batch[]>(initialBatches);
    const [filteredBatches, setFilteredBatches] = useState<Batch[]>(initialBatches);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filter batches based on search and filters
    useEffect(() => {
        let filtered = batches;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(batch =>
                batch.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                batch.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                batch.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                batch.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(batch => batch.status === statusFilter);
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(batch => batch.category === categoryFilter);
        }

        setFilteredBatches(filtered);
    }, [batches, searchTerm, statusFilter, categoryFilter]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'expired': return 'bg-red-100 text-red-800 border-red-200';
            case 'low_stock': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'out_of_stock': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="h-3 w-3" />;
            case 'expired': return <AlertTriangle className="h-3 w-3" />;
            case 'low_stock': return <AlertTriangle className="h-3 w-3" />;
            case 'out_of_stock': return <Package className="h-3 w-3" />;
            default: return <Package className="h-3 w-3" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    const getUniqueCategories = () => {
        return [...new Set(batches.map(batch => batch.category))].sort();
    };

    const getStatistics = () => {
        const total = batches.length;
        const active = batches.filter(b => b.status === 'active').length;
        const lowStock = batches.filter(b => b.status === 'low_stock').length;
        const expired = batches.filter(b => b.status === 'expired').length;
        const outOfStock = batches.filter(b => b.status === 'out_of_stock').length;
        const totalValue = batches.reduce((sum, batch) => sum + (batch.quantity * batch.selling_price), 0);

        return { total, active, lowStock, expired, outOfStock, totalValue };
    };

    const stats = getStatistics();

    const handleBatchSelect = (batch: Batch) => {
        setSelectedBatch(batch);
        // Handle batch selection logic here
        toast.info(`Selected batch: ${batch.batch_no}`);
    };

    const handleCreateBatch = (batchData: Partial<Batch>) => {
        // Handle batch creation logic here
        console.log('Creating batch:', batchData);
        toast.success('Batch creation initiated');
    };

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Batches</p>
                                <p className="text-2xl font-semibold">{stats.total}</p>
                            </div>
                            <Package className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Active</p>
                                <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Low Stock</p>
                                <p className="text-2xl font-semibold text-yellow-600">{stats.lowStock}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Expired</p>
                                <p className="text-2xl font-semibold text-red-600">{stats.expired}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Value</p>
                                <p className="text-lg font-semibold text-purple-600">
                                    {formatCurrency(stats.totalValue)}
                                </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Batch Filters
                        </span>
                        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            New Batch
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search batches..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="low_stock">Low Stock</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {getUniqueCategories().map(category => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Batches List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBatches.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No batches found</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                                ? 'Try adjusting your search criteria'
                                : 'Get started by creating your first batch'}
                        </p>
                        <Button onClick={() => setIsModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Batch
                        </Button>
                    </div>
                ) : (
                    filteredBatches.map((batch) => (
                        <Card 
                            key={batch.id} 
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleBatchSelect(batch)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold text-lg">{batch.batch_no}</h3>
                                    <Badge className={`flex items-center gap-1 ${getStatusColor(batch.status)}`}>
                                        {getStatusIcon(batch.status)}
                                        {batch.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                </div>
                                
                                <div className="space-y-2">
                                    <div>
                                        <p className="font-medium text-gray-900">{batch.item_name}</p>
                                        <p className="text-sm text-gray-500">{batch.item_code}</p>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Category:</span>
                                        <span className="font-medium">{batch.category}</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Quantity:</span>
                                        <span className="font-medium">{batch.quantity} units</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Selling Price:</span>
                                        <span className="font-medium">{formatCurrency(batch.selling_price)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Section:</span>
                                        <span className="font-medium">{batch.section_name}</span>
                                    </div>
                                    
                                    {batch.expiry_date && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Expires:</span>
                                            <span className="font-medium text-orange-600">
                                                {formatDate(batch.expiry_date)}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="pt-2 border-t">
                                        <div className="text-xs text-gray-500">
                                            Created: {formatDate(batch.created_at)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Batch Management Modal */}
            <BatchManagementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                batches={batches}
                onBatchSelect={handleBatchSelect}
                onBatchCreate={handleCreateBatch}
            />
        </div>
    );
}