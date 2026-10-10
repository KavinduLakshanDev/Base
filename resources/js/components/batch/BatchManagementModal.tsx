import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Package, Calendar, DollarSign } from 'lucide-react';
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

interface BatchManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId?: string;
    batches?: Batch[];
    onBatchSelect?: (batch: Batch) => void;
    onBatchCreate?: (batchData: Partial<Batch>) => void;
}

export default function BatchManagementModal({
    isOpen,
    onClose,
    productId,
    batches = [],
    onBatchSelect,
    onBatchCreate
}: BatchManagementModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingBatch, setIsCreatingBatch] = useState(false);
    const [newBatchData, setNewBatchData] = useState({
        batch_no: '',
        quantity: 0,
        cost_price: 0,
        selling_price: 0,
        expiry_date: ''
    });

    const filteredBatches = batches.filter(batch =>
        batch.batch_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.item_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateBatch = () => {
        if (!newBatchData.batch_no.trim()) {
            toast.error('Batch number is required');
            return;
        }

        if (onBatchCreate) {
            onBatchCreate({
                ...newBatchData,
                status: 'active' as const
            });
        }

        // Reset form
        setNewBatchData({
            batch_no: '',
            quantity: 0,
            cost_price: 0,
            selling_price: 0,
            expiry_date: ''
        });
        setIsCreatingBatch(false);
        toast.success('Batch created successfully');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'low_stock': return 'bg-yellow-100 text-yellow-800';
            case 'out_of_stock': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount: number) => {
        return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Batch Management
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search and Actions */}
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search batches by batch number or item name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            onClick={() => setIsCreatingBatch(true)}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            New Batch
                        </Button>
                    </div>

                    {/* Create New Batch Form */}
                    {isCreatingBatch && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Create New Batch</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="batch_no">Batch Number *</Label>
                                        <Input
                                            id="batch_no"
                                            value={newBatchData.batch_no}
                                            onChange={(e) => setNewBatchData(prev => ({...prev, batch_no: e.target.value}))}
                                            placeholder="e.g., BATCH001"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            min="0"
                                            value={newBatchData.quantity}
                                            onChange={(e) => setNewBatchData(prev => ({...prev, quantity: parseInt(e.target.value) || 0}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cost_price">Cost Price</Label>
                                        <Input
                                            id="cost_price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newBatchData.cost_price}
                                            onChange={(e) => setNewBatchData(prev => ({...prev, cost_price: parseFloat(e.target.value) || 0}))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="selling_price">Selling Price</Label>
                                        <Input
                                            id="selling_price"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newBatchData.selling_price}
                                            onChange={(e) => setNewBatchData(prev => ({...prev, selling_price: parseFloat(e.target.value) || 0}))}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
                                        <Input
                                            id="expiry_date"
                                            type="date"
                                            value={newBatchData.expiry_date}
                                            onChange={(e) => setNewBatchData(prev => ({...prev, expiry_date: e.target.value}))}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleCreateBatch} className="flex-1">
                                        Create Batch
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setIsCreatingBatch(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Batches List */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredBatches.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No batches found</p>
                                {searchTerm && (
                                    <p className="text-sm">Try adjusting your search terms</p>
                                )}
                            </div>
                        ) : (
                            filteredBatches.map((batch) => (
                                <Card 
                                    key={batch.id} 
                                    className="cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => onBatchSelect?.(batch)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold">{batch.batch_no}</h3>
                                                    <Badge className={getStatusColor(batch.status)}>
                                                        {batch.status.replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">{batch.item_name}</p>
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Package className="h-3 w-3 text-gray-400" />
                                                        <span>{batch.quantity} units</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3 text-gray-400" />
                                                        <span>{formatCurrency(batch.selling_price)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3 text-gray-400" />
                                                        <span>{formatDate(batch.created_at)}</span>
                                                    </div>
                                                </div>
                                                {batch.expiry_date && (
                                                    <div className="mt-2 text-sm text-orange-600">
                                                        Expires: {formatDate(batch.expiry_date)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}