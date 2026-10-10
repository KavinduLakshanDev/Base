// resources/js/Pages/ServiceJobs/EditQuotation.tsx
import React, { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { PageProps, BreadcrumbItem } from '@/types';
import { 
    Package,
    Plus,
    Save,
    X,
    ArrowLeft,
    Search,
    Printer,
    Wrench,
    Box,
    MoreHorizontal,
    Trash
} from 'lucide-react';

interface ItemMaster {
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    SlsPri: string | number;
    Unit: string;
    BarCode: string;
    vat_inclusive?: boolean;
}

interface QuotationItem {
    id?: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    item_type: 'part' | 'service_charge' | 'other';
}

interface EditQuotationProps extends PageProps {
    quotation: {
        id: number;
        items: QuotationItem[];
        notes: string | null;
        total_amount: string | number;
        created_at: string;
    };
    job: {
        id: number;
        job_number: string;
        customer_name: string;
    };
    serviceCharges: Array<{
        id: string | number;
        charge_name: string;
        charge_value: string | number;
        description?: string | null;
    }>;
}

const EditQuotation: React.FC<EditQuotationProps> = ({ quotation, job, serviceCharges, auth }) => {
    const [quotationItems, setQuotationItems] = useState<QuotationItem[]>(quotation.items || []);
    const [quotationNotes, setQuotationNotes] = useState(quotation.notes || '');
    const [updatingQuotation, setUpdatingQuotation] = useState(false);
    const [activeTab, setActiveTab] = useState<'part' | 'service_charge' | 'other'>('part');

    // New item form states
    const [newItem, setNewItem] = useState({
        item_type: 'part' as const as 'part' | 'service_charge' | 'other',
        item_name: '',
        quantity: 1,
        unit_price: 0,
        description: '',
    });

    // Search states
    const [quotationSearchQuery, setQuotationSearchQuery] = useState('');
    const [quotationSearchResults, setQuotationSearchResults] = useState<ItemMaster[]>([]);
    const [showQuotationSearch, setShowQuotationSearch] = useState(false);
    const [quotationSearchTimeout, setQuotationSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const quotationSearchRef = useRef<HTMLDivElement>(null);

    const searchQuotationItems = async (query: string) => {
        try {
            const response = await fetch(`/service-jobs/search/items?search=${encodeURIComponent(query)}&scope=quotation`);
            if (!response.ok) throw new Error('Search failed');
            const results = await response.json();
            setQuotationSearchResults(results);
            setShowQuotationSearch(results.length > 0);
        } catch (error) {
            console.error('Quotation item search error:', error);
            setQuotationSearchResults([]);
            setShowQuotationSearch(false);
        }
    };

    const handleQuotationSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuotationSearchQuery(value);

        if (quotationSearchTimeout) clearTimeout(quotationSearchTimeout);

        const timeout = setTimeout(() => {
            if (value.trim().length > 1) {
                searchQuotationItems(value);
            } else {
                setQuotationSearchResults([]);
                setShowQuotationSearch(false);
            }
        }, 500);

        setQuotationSearchTimeout(timeout);
    };

    const addQuotationItem = (item: ItemMaster) => {
        let unitPrice = 0;
        if (typeof item.SlsPri === 'string') {
            unitPrice = parseFloat(item.SlsPri);
        } else if (typeof item.SlsPri === 'number') {
            unitPrice = item.SlsPri;
        }

        const selectedName = item.ItmNm || item.ItemCode;

        // Update form fields with selected item
        setNewItem({
            item_type: 'part',
            item_name: selectedName,
            quantity: 1,
            unit_price: unitPrice,
            description: `${item.ItemCode} - ${item.Unit}`,
        });

        // clear search input after selecting item
        setQuotationSearchQuery('');
        setShowQuotationSearch(false);
        setQuotationSearchResults([]);
    };

    const handleAddQuotationItemManual = () => {
        // Validation: item_name required, quantity > 0, unit_price >= 0 (allow 0 for free charges)
        if (!newItem.item_name || newItem.quantity <= 0 || newItem.unit_price < 0) {
            alert(t('Please fill in all required fields correctly'));
            return;
        }

        const quotationItem: QuotationItem = {
            item_name: newItem.item_name,
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
            item_type: newItem.item_type,
        };

        setQuotationItems([...quotationItems, quotationItem]);

        // Reset form
        setNewItem({
            item_type: activeTab,
            item_name: '',
            quantity: 1,
            unit_price: 0,
            description: '',
        });
        setQuotationSearchQuery('');
        setShowQuotationSearch(false);
        setQuotationSearchResults([]);
    };

    const switchTab = (tab: 'part' | 'service_charge' | 'other') => {
        setActiveTab(tab);
        setNewItem({
            item_type: tab,
            item_name: '',
            quantity: 1,
            unit_price: 0,
            description: '',
        });
        setQuotationSearchQuery('');
        setShowQuotationSearch(false);
        setQuotationSearchResults([]);
    };

    const removeQuotationItem = (index: number) => {
        setQuotationItems(quotationItems.filter((_, i) => i !== index));
    };

    const updateQuotationItem = (index: number, field: keyof QuotationItem, value: any) => {
        const updated = [...quotationItems];

        if (field === 'quantity') {
            value = Number(value);
            if (Number.isNaN(value) || value <= 0) {
                value = 1;
            }
        }

        if (field === 'unit_price') {
            value = Number(value);
            if (Number.isNaN(value) || value < 0) {
                value = 0;
            }
        }

        updated[index] = { ...updated[index], [field]: value };
        setQuotationItems(updated);
    };

    const calculateQuotationTotal = () => {
        return quotationItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const handleUpdateQuotation = (e: React.FormEvent) => {
        e.preventDefault();
        if (quotationItems.length === 0) {
            alert(t('Please add at least one item to the quotation'));
            return;
        }

        setUpdatingQuotation(true);

        router.put(`/quotations/${quotation.id}`, {
            items: JSON.stringify(quotationItems),
            notes: quotationNotes,
            total_amount: calculateQuotationTotal(),
        }, {
            onSuccess: () => {
                alert(t('Quotation updated successfully!'));
                router.visit(`/quotations/${quotation.id}`);
            },
            onError: (errors) => {
                console.error('Update errors:', errors);
                alert(t('Failed to update quotation. Please try again.'));
            },
            onFinish: () => setUpdatingQuotation(false),
        });
    };

    const printQuotation = () => {
        const total = calculateQuotationTotal();
        const printWindow = window.open('', '', 'height=900,width=1200');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>${t('Quotation')} - ${job.job_number}</title>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                        background-color: #f1f5f9; 
                        color: #1e293b;
                        line-height: 1.6;
                    }
                    
                    .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
                    
                    .print-header { 
                        background: linear-gradient(to right, #00aeef, #737578); 
                        color: white; 
                        padding: 30px; 
                        border-radius: 8px 8px 0 0; 
                        display: flex;
                        align-items: center;
                        gap: 20px;
                    }
                    .print-header-icon { 
                        width: 50px; 
                        height: 50px; 
                        background: rgba(255,255,255,0.2); 
                        border-radius: 8px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-size: 28px; 
                    }
                    .print-header h1 { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
                    .print-header p { font-size: 14px; opacity: 0.9; }
                    
                    .info-section { 
                        background: white; 
                        padding: 20px; 
                        border-radius: 0 0 8px 8px; 
                        border: 1px solid #e2e8f0; 
                        border-top: none; 
                        margin-bottom: 20px; 
                    }
                    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
                    .info-item strong { 
                        display: block; 
                        font-size: 11px; 
                        color: #64748b; 
                        text-transform: uppercase; 
                        margin-bottom: 5px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                    }
                    .info-item p { font-size: 14px; color: #1e293b; font-weight: 500; }
                    
                    .table-section { 
                        background: white; 
                        border: 1px solid #e2e8f0; 
                        border-radius: 8px; 
                        overflow: hidden; 
                        margin-bottom: 20px;
                    }
                    .table-header { 
                        background: linear-gradient(to right, #f0f9ff, #e0f2fe); 
                        padding: 12px 16px; 
                        border-bottom: 2px solid #0284c7; 
                    }
                    .table-header h3 { font-size: 14px; font-weight: 600; color: #0c4a6e; }
                    .table-header p { font-size: 11px; color: #0369a1; margin-top: 3px; }
                    
                    table { width: 100%; border-collapse: collapse; }
                    thead { background-color: #f0f9ff; }
                    th { 
                        padding: 10px 16px; 
                        text-align: left; 
                        font-size: 11px; 
                        font-weight: 600; 
                        color: #0c4a6e; 
                        text-transform: uppercase; 
                        border-bottom: 1px solid #e2e8f0;
                        letter-spacing: 0.5px;
                    }
                    td { 
                        padding: 12px 16px; 
                        font-size: 13px; 
                        color: #334155; 
                        border-bottom: 1px solid #f1f5f9; 
                    }
                    tbody tr:hover { background-color: #f0f9ff; }
                    .text-right { text-align: right; }
                    .text-bold { font-weight: 600; }
                    
                    .summary-section { 
                        background: white; 
                        padding: 20px; 
                        border: 1px solid #e2e8f0; 
                        border-radius: 8px; 
                        display: grid; 
                        grid-template-columns: 2fr 1fr; 
                        gap: 20px;
                    }
                    .summary-notes strong { 
                        display: block; 
                        font-size: 11px; 
                        color: #64748b; 
                        text-transform: uppercase; 
                        margin-bottom: 8px;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                    }
                    .summary-notes p { 
                        font-size: 13px; 
                        color: #475569; 
                        line-height: 1.6; 
                    }
                    
                    .total-box { 
                        background: linear-gradient(135deg, #00aeef 0%, #0284c7 100%); 
                        color: white; 
                        padding: 20px; 
                        border-radius: 8px; 
                        text-align: right; 
                        box-shadow: 0 4px 12px rgba(0, 174, 239, 0.3);
                    }
                    .total-label { 
                        font-size: 11px; 
                        opacity: 0.9; 
                        text-transform: uppercase;
                        font-weight: 600;
                        letter-spacing: 0.5px;
                    }
                    .total-amount { 
                        font-size: 32px; 
                        font-weight: bold; 
                        margin-top: 5px;
                    }
                    
                    .footer { 
                        text-align: center; 
                        margin-top: 20px; 
                        padding: 15px; 
                        border-top: 1px solid #e2e8f0; 
                        font-size: 11px; 
                        color: #64748b; 
                    }
                    
                    @media print {
                        @page { size: A4 landscape; margin: 10mm; }
                        body { background-color: white; }
                        .container { padding: 0; margin: 0; }
                        .print-header { border-radius: 0; }
                        .info-section { border: 1px solid #000; }
                        .table-section { border: 1px solid #000; }
                        .summary-section { border: 1px solid #000; }
                        table { page-break-inside: avoid; }
                        tr { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <!-- Header -->
                    <div class="print-header">
                        <div class="print-header-icon">📋</div>
                        <div>
                            <h1>${t('Service Quotation')} (${t('Updated')})</h1>
                            <p>${t('Job')} #${job.job_number}</p>
                        </div>
                    </div>
                    
                    <!-- Customer Info -->
                    <div class="info-section">
                        <div class="info-grid">
                            <div class="info-item">
                                <strong>${t('Customer')}</strong>
                                <p>${job.customer_name}</p>
                            </div>
                            <div class="info-item">
                                <strong>${t('Job Number')}</strong>
                                <p>${job.job_number}</p>
                            </div>
                            <div class="info-item">
                                <strong>${t('Date Updated')}</strong>
                                <p>${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <div class="info-item">
                                <strong>${t('Total Items')}</strong>
                                <p>${quotationItems.length}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Items Table -->
                    <div class="table-section">
                        <div class="table-header">
                            <h3>${t('Quotation Items')}</h3>
                            <p>${t('Itemized list of parts and services')}</p>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>${t('Item Description')}</th>
                                    <th style="width: 80px;" class="text-right">${t('Quantity')}</th>
                                    <th style="width: 120px;" class="text-right">${t('Unit Price (Rs)')}</th>
                                    <th style="width: 120px;" class="text-right">${t('Total (Rs)')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${quotationItems.map(item => `
                                    <tr>
                                        <td>${item.item_name}</td>
                                        <td class="text-right text-bold">${item.quantity}</td>
                                        <td class="text-right">Rs ${Number(item.unit_price).toFixed(2)}</td>
                                        <td class="text-right text-bold">Rs ${(item.quantity * item.unit_price).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Summary -->
                    <div class="summary-section">
                        <div class="summary-notes">
                            ${quotationNotes ? `
                                <strong>${t('Notes & Terms')}</strong>
                                <p>${quotationNotes}</p>
                            ` : `
                                <strong>${t('Notes')}</strong>
                                <p>${t('No additional notes provided.')}</p>
                            `}
                        </div>
                        <div class="total-box">
                            <div class="total-label">${t('Quotation Total')}</div>
                            <div class="total-amount">Rs ${total.toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <p>${t('Generated by VISMASS POS System')} | ${new Date().toLocaleString('en-GB')}</p>
                    </div>
                </div>
                
                <script>
                    window.print();
                    setTimeout(() => { window.close(); }, 1000);
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Service Jobs'), href: '/service-jobs' },
        { title: job.job_number, href: `/service-jobs/${job.id}` },
        { title: t('Edit Quotation'), href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Edit Quotation')} - ${job.job_number}`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="mr-1 rounded-lg bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-all duration-200 border border-white/30"
                                    title={t('Go Back')}
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Package className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Edit Quotation')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Job')}: {job.job_number} - {t('Customer')}: {job.customer_name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                    <form onSubmit={handleUpdateQuotation} className="space-y-4">
                        {/* Tab Selection */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="grid grid-cols-3 gap-0">
                                {/* Add Part Tab */}
                                <button
                                    type="button"
                                    onClick={() => switchTab('part')}
                                    className={`p-6 text-center transition-all duration-300 border-b-4 ${
                                        activeTab === 'part'
                                            ? 'border-b-blue-500 bg-blue-50'
                                            : 'border-b-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <Box className={`mx-auto mb-2 h-8 w-8 ${activeTab === 'part' ? 'text-blue-600' : 'text-slate-600'}`} />
                                    <h3 className={`text-lg font-semibold ${activeTab === 'part' ? 'text-blue-600' : 'text-slate-700'}`}>
                                        {t('Add Part')}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{t('Search and add parts')}</p>
                                </button>

                                {/* Add Service Charges Tab */}
                               <button
                                    type="button"
                                    onClick={() => switchTab('service_charge')}
                                    className={`p-6 text-center transition-all duration-300 border-b-4 border-l border-r ${
                                        activeTab === 'service_charge'
                                            ? 'border-b-emerald-500 bg-emerald-50'
                                            : 'border-b-slate-200 border-l-slate-200 border-r-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <Wrench className={`mx-auto mb-2 h-8 w-8 ${activeTab === 'service_charge' ? 'text-emerald-600' : 'text-slate-600'}`} />
                                    <h3 className={`text-lg font-semibold ${activeTab === 'service_charge' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                        {t('Add Service Charge')}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{t('Add service charges')}</p>
                                </button>

                                {/* Add Other Tab */}
                                {/* <button
                                    type="button"
                                    onClick={() => switchTab('other')}
                                    className={`p-6 text-center transition-all duration-300 border-b-4 ${
                                        activeTab === 'other'
                                            ? 'border-b-orange-500 bg-orange-50'
                                            : 'border-b-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <MoreHorizontal className={`mx-auto mb-2 h-8 w-8 ${activeTab === 'other' ? 'text-orange-600' : 'text-slate-600'}`} />
                                    <h3 className={`text-lg font-semibold ${activeTab === 'other' ? 'text-orange-600' : 'text-slate-700'}`}>
                                        {t('Add Other')}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{t('Add custom items')}</p>
                                </button> */}
                            </div>
                        </div>

                        {/* Tab Content - Add Part */}
                        {activeTab === 'part' && (
                            <div className="rounded-lg border border-blue-200 bg-white shadow overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center">
                                        <Box className="mr-2 h-5 w-5" />
                                        {t('Add Parts or Products')}
                                    </h3>
                                    <p className="text-blue-100 text-sm mt-1">{t('Search for items from inventory')}</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('Search Item')} *
                                        </label>
                                        <div className="relative" ref={quotationSearchRef}>
                                            <input
                                                type="text"
                                                value={quotationSearchQuery}
                                                onChange={handleQuotationSearchChange}
                                                placeholder={t('Type to search by name, code, or barcode...')}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            />
                                            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            
                                            {showQuotationSearch && quotationSearchResults.length > 0 && (
                                                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-300 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                                                    {quotationSearchResults.map((item) => (
                                                        <button
                                                            key={item.ItmKy}
                                                            type="button"
                                                            onClick={() => addQuotationItem(item)}
                                                            className="w-full px-4 py-3 hover:bg-blue-50 flex justify-between items-center transition border-b last:border-b-0 text-left"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-gray-900">{item.ItmNm}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    {item.ItemCode} {item.BarCode && `| ${item.BarCode}`} | {item.Unit}
                                                                </p>
                                                            </div>
                                                            <span className="text-blue-600 font-semibold">
                                                                Rs {Number(item.SlsPri).toFixed(2)}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Item Name')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.item_name}
                                                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                                                placeholder={t('Enter item name')}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Quantity')} *
                                            </label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                value={newItem.quantity}
                                                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Unit Price (Rs)')} *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={newItem.unit_price}
                                                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddQuotationItemManual}
                                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:shadow-lg transition font-medium flex items-center justify-center"
                                    >
                                        <Plus className="mr-2 h-5 w-5" />
                                        {t('Add to Quotation')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tab Content - Add Service Charges */}
                        {activeTab === 'service_charge' && (
                            <div className="rounded-lg border border-emerald-200 bg-white shadow overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center">
                                        <Wrench className="mr-2 h-5 w-5" />
                                        {t('Add Service Charges')}
                                    </h3>
                                    <p className="text-emerald-100 text-sm mt-1">{t('Add standard service charges')}</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('Select Service Charge')}
                                        </label>
                                        <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-4">
                                            {serviceCharges.map((charge) => (
                                                <button
                                                    key={charge.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewItem({
                                                            item_type: 'service_charge',
                                                            item_name: charge.charge_name,
                                                            quantity: 1,
                                                            unit_price: typeof charge.charge_value === 'string' 
                                                                ? parseFloat(charge.charge_value) 
                                                                : charge.charge_value,
                                                            description: charge.description || '',
                                                        });
                                                    }}
                                                    className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 flex justify-between items-center"
                                                >
                                                    <div>
                                                        <p className="font-medium text-gray-900">{charge.charge_name}</p>
                                                        {charge.description && (
                                                            <p className="text-sm text-gray-500 mt-1">{charge.description}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-emerald-600 font-semibold">
                                                        Rs {Number(charge.charge_value).toFixed(2)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Service Name')} *
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.item_name}
                                                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                                                placeholder={t('Enter service name')}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Quantity')} *
                                            </label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                value={newItem.quantity}
                                                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('Charge Amount (Rs)')} *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={newItem.unit_price}
                                            onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddQuotationItemManual}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl hover:shadow-lg transition font-medium flex items-center justify-center"
                                    >
                                        <Plus className="mr-2 h-5 w-5" />
                                        {t('Add to Quotation')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Tab Content - Add Other */}
                        {activeTab === 'other' && (
                            <div className="rounded-lg border border-orange-200 bg-white shadow overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center">
                                        <MoreHorizontal className="mr-2 h-5 w-5" />
                                        {t('Add Custom Item')}
                                    </h3>
                                    <p className="text-orange-100 text-sm mt-1">{t('Add miscellaneous charges or items')}</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('Item Description')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={newItem.item_name}
                                            onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                                            placeholder={t('Enter item description')}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Quantity')} *
                                            </label>
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                value={newItem.quantity}
                                                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 1 })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('Unit Price (Rs)')} *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={newItem.unit_price}
                                                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddQuotationItemManual}
                                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl hover:shadow-lg transition font-medium flex items-center justify-center"
                                    >
                                        <Plus className="mr-2 h-5 w-5" />
                                        {t('Add to Quotation')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Items Table */}
                        {quotationItems.length > 0 && (
                            <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                                <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                    <h3 className="text-lg font-semibold text-white">
                                        {t('Quotation Items')} ({quotationItems.length})
                                    </h3>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="sticky top-0 z-20 bg-white border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">{t('Item')}</th>
                                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase w-32">{t('Quantity')}</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase w-36">{t('Unit Price')}</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase w-36">{t('Total')}</th>
                                                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase w-24">{t('Action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {quotationItems.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50 transition">
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="text"
                                                            value={item.item_name}
                                                            onChange={(e) => updateQuotationItem(index, 'item_name', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuotationItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-center"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateQuotationItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-28 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-right"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                                        Rs {(item.quantity * item.unit_price).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeQuotationItem(index)}
                                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition"
                                                            title={t('Remove')}
                                                        >
                                                            <Trash className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {/* <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                            <tr>
                                                <td colSpan={3} className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                                                    {t('Grand Total')}:
                                                </td>
                                                <td className="px-6 py-4 text-right text-xl font-bold text-green-600">
                                                    Rs {calculateQuotationTotal().toFixed(2)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot> */}
                                    </table>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-6 py-4 shadow-inner">
                                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                                        <span className="text-sm text-slate-600 font-semibold">{t('Grand Total')}</span>
                                        <span className="text-xl text-vismass-blue font-bold">Rs {calculateQuotationTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes Section */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                <h3 className="text-lg font-semibold text-white">
                                    {t('Notes')} ({t('Optional')})
                                </h3>
                            </div>
                            <div className="p-6">
                                <textarea
                                    value={quotationNotes}
                                    onChange={(e) => setQuotationNotes(e.target.value)}
                                    placeholder={t('Add payment terms, delivery notes, warranty information, or any other relevant details...')}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pb-4">
                            <button
                                type="button"
                                onClick={() => router.visit(`/quotations/${quotation.id}`)}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                            >
                                {t('Cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={printQuotation}
                                disabled={quotationItems.length === 0}
                                className="inline-flex items-center px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                {t('Print Preview')}
                            </button>
                            <button
                                type="submit"
                                disabled={updatingQuotation || quotationItems.length === 0}
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-vismass-blue to-vismass-grey text-white rounded-lg hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {updatingQuotation ? t('Updating...') : t('Update Quotation')}
                            </button>
                        </div>
                    </form>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS POS System • {t('Quotation Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
};

export default EditQuotation;
