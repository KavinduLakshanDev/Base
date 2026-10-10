// import React from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';

// interface PriceRecord {
//     ItemPriceKey: number;
//     SlsPri: number;
//     ChangedDate: string;
//     WholePrice?: number;
//     ExtraPrice?: number;
//     CCPrice?: number;
//     NCostPrice?: number;
// }

// interface PriceSelectionModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     prices: PriceRecord[];
//     onSelect: (price: PriceRecord) => void;
//     itemName: string;
// }

// const PriceSelectionModal: React.FC<PriceSelectionModalProps> = ({
//     isOpen,
//     onClose,
//     prices,
//     onSelect,
//     itemName,
// }) => {
//     // Initialize hooks unconditionally (required by React Rules of Hooks)
//     const [selectedIndex, setSelectedIndex] = React.useState(0);
//     const selectedIndexRef = React.useRef(0);

//     const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
//         if (!isOpen || !prices || prices.length === 0) return;

//         switch (e.key) {
//             case 'ArrowDown':
//                 e.preventDefault();
//                 const next = Math.min(selectedIndexRef.current + 1, prices.length - 1);
//                 selectedIndexRef.current = next;
//                 setSelectedIndex(next);
//                 break;
//             case 'ArrowUp':
//                 e.preventDefault();
//                 const prev = Math.max(selectedIndexRef.current - 1, 0);
//                 selectedIndexRef.current = prev;
//                 setSelectedIndex(prev);
//                 break;
//             case 'Enter':
//                 e.preventDefault();
//                 if (prices[selectedIndexRef.current]) {
//                     onSelect(prices[selectedIndexRef.current]);
//                 }
//                 break;
//             case 'Escape':
//                 e.preventDefault();
//                 onClose();
//                 break;
//         }
//     }, [isOpen, prices, onSelect, onClose]);

//     React.useEffect(() => {
//         if (isOpen && prices && prices.length > 0) {
//             selectedIndexRef.current = 0;
//             setSelectedIndex(0);
//             document.addEventListener('keydown', handleKeyDown);
//         }
//         return () => document.removeEventListener('keydown', handleKeyDown);
//     }, [isOpen, handleKeyDown, prices]);

//     // Early return after all hooks (allowed)
//     if (!prices || prices.length === 0) return null;

//     return (
//         <Dialog open={isOpen} onOpenChange={onClose}>
//             <DialogContent className="max-w-2xl">
//                 <DialogHeader>
//                     <DialogTitle>Select Price</DialogTitle>
//                     <DialogDescription asChild>
//                         <div className="text-muted-foreground text-sm space-y-1">
//                             <div>
//                                 Select a price for <span className="font-semibold text-blue-600">{itemName}</span>
//                             </div>
//                             <div className="text-xs text-gray-500 mt-2">
//                                 Use ↑↓ to move, Enter to select, Esc to cancel
//                             </div>
//                         </div>
//                     </DialogDescription>
//                 </DialogHeader>

//                 <div className="mt-4 border rounded-lg overflow-hidden">
//                     <table className="w-full text-sm text-left">
//                         <thead className="bg-gray-100 text-gray-700 font-semibold">
//                             <tr>
//                                 <th className="px-4 py-3">Date</th>
//                                 <th className="px-4 py-3 text-right">Retail Price</th>
//                                 <th className="px-4 py-3 text-right">Wholesale Price</th>
//                                 <th className="px-4 py-3 text-right">Card Price</th>
//                                 <th className="px-4 py-3 text-right">Action</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-gray-100">
//                             {prices.map((price, idx) => (
//                                 <tr
//                                     key={price.ItemPriceKey}
//                                     className={`transition-colors ${idx === selectedIndex ? 'bg-blue-100 border-blue-300 cursor-pointer' : 'hover:bg-blue-50 cursor-pointer'}`}
//                                 >
//                                     <td className="px-4 py-3 font-mono text-gray-800">
//                                         {new Date(price.ChangedDate).toLocaleDateString('en-GB')}
//                                     </td>
//                                     <td className="px-4 py-3 text-right">
//                                         {Number(price.SlsPri).toFixed(2)}
//                                     </td>
//                                     <td className="px-4 py-3 text-right">
//                                         {price.WholePrice ? Number(price.WholePrice).toFixed(2) : '-'}
//                                     </td>
//                                     <td className="px-4 py-3 text-right">
//                                         {price.CCPrice ? Number(price.CCPrice).toFixed(2) : '-'}
//                                     </td>
//                                     <td className="px-4 py-3 text-right">
//                                         <Button
//                                             size="sm"
//                                             onClick={(e) => {
//                                                 e.stopPropagation();
//                                                 onSelect(price);
//                                             }}
//                                             className="bg-blue-600 hover:bg-blue-700"
//                                         >
//                                             Select
//                                         </Button>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>

//                 <div className="flex justify-end mt-4">
//                     <Button variant="outline" onClick={onClose}>Cancel</Button>
//                 </div>
//             </DialogContent>
//         </Dialog>
//     );
// };

// export default PriceSelectionModal;