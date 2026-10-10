import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Trash2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface HoldSalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    heldSales: any[];
    onResume: (index: number) => void;
    onDelete: (index: number) => void;
}

const HoldSalesModal: React.FC<HoldSalesModalProps> = ({
    isOpen,
    onClose,
    heldSales,
    onResume,
    onDelete,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Paused Sales
                    </DialogTitle>
                    <DialogDescription>
                        Select a paused sale to resume or delete it.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
                    {heldSales.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 italic">
                            No paused sales found.
                        </div>
                    ) : (
                        heldSales.map((sale, index) => (
                            <div 
                                key={index} 
                                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                        {sale.customer_name || 'Walk-in Customer'}
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                        <span className="bg-white px-2 py-0.5 rounded border border-gray-100 font-mono">
                                            Items: {sale.items?.length || 0}
                                        </span>
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                                            Rs {Number(sale.total_amount || 0).toFixed(2)}
                                        </span>
                                        <span>
                                            {sale.timestamp ? format(new Date(sale.timestamp), 'HH:mm:ss') : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => onDelete(index)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        className="h-9 px-3 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                                        onClick={() => onResume(index)}
                                    >
                                        <Play className="w-4 h-4 mr-2 fill-current" />
                                        Resume
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default HoldSalesModal;
