// resources/js/Pages/ServiceJobs/CreateQuotation.tsx
import React, { useState, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
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
    Trash,
} from 'lucide-react';

interface ItemMaster {
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    SlsPri: string | number;
    Unit: string;
    BarCode: string;
    company_code?: string;
    vat_inclusive?: boolean;
}

interface QuotationItem {
    id?: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    item_type: 'part' | 'service_charge' | 'other';
}

interface CreateQuotationProps extends PageProps {
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

const CreateQuotation: React.FC<CreateQuotationProps> = ({ job, serviceCharges, auth }) => {
    const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
    const [quotationNotes, setQuotationNotes] = useState('');
    const [creatingQuotation, setCreatingQuotation] = useState(false);
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
        // Validation: item_name required, quantity > 0 for parts and other items, unit_price >= 0 (allow 0 for free charges)
        const quantityRequired = newItem.item_type !== 'service_charge';
        if (!newItem.item_name || (quantityRequired && newItem.quantity <= 0) || newItem.unit_price < 0) {
            toast.error(t('Please fill in all required fields correctly'));
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

    const handleCreateQuotation = (e: React.FormEvent) => {
        e.preventDefault();
        if (quotationItems.length === 0) {
            toast.error(t('Please add at least one item to the quotation'));
            return;
        }

        setCreatingQuotation(true);

        router.post('/quotations', {
            service_job_id: job.id,
            items: JSON.stringify(quotationItems),
            notes: quotationNotes,
            total_amount: calculateQuotationTotal(),
        }, {
            onSuccess: () => {
                toast.success(t('Quotation created successfully!'));
                router.visit(`/service-jobs/${job.id}`);
            },
            onError: () => {
                toast.error(t('Failed to create quotation. Please try again.'));
            },
            onFinish: () => setCreatingQuotation(false),
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
                            <h1>${t('Service Quotation')}</h1>
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
                                <strong>${t('Date Generated')}</strong>
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
        { title: t('Create Quotation'), href: '#' },
    ];

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Create Quotation')} - ${job.job_number}`} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between gap-3 py-4">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="mr-1 shrink-0 rounded-lg border border-white/30 bg-white/20 p-2 backdrop-blur-sm transition-all duration-200 hover:bg-white/30"
                                    title={t('Go Back')}
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Package className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Create Quotation')}
                                    </h1>
                                    <p className="truncate text-xs text-white/80">
                                        {t('Service Job')}: {job.job_number}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                    <form onSubmit={handleCreateQuotation} className="space-y-6">
                        {/* Tab Selection */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="grid grid-cols-2 border-b border-slate-200">
                                {/* Add Part Tab */}
                                <button
                                    type="button"
                                    onClick={() => switchTab('part')}
                                    className={`relative px-3 py-4 text-center transition-all duration-200 sm:px-6 ${
                                        activeTab === 'part'
                                            ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-700'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {activeTab === 'part' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                                    )}
                                    <Box className={`mx-auto mb-2 h-6 w-6 ${activeTab === 'part' ? 'text-blue-600' : 'text-gray-500'}`} />
                                    <h3 className={`text-sm font-semibold ${activeTab === 'part' ? 'text-blue-700' : 'text-gray-700'}`}>
                                        {t('Add Part')}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">{t('From Inventory')}</p>
                                </button>

                                {/* Add Service Charges Tab */}
                                <button
                                    type="button"
                                    onClick={() => switchTab('service_charge')}
                                    className={`relative border-l border-r border-slate-200 px-3 py-4 text-center transition-all duration-200 sm:px-6 ${
                                        activeTab === 'service_charge'
                                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {activeTab === 'service_charge' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                                    )}
                                    <Wrench className={`mx-auto mb-2 h-6 w-6 ${activeTab === 'service_charge' ? 'text-emerald-600' : 'text-gray-500'}`} />
                                    <h3 className={`text-sm font-semibold ${activeTab === 'service_charge' ? 'text-emerald-700' : 'text-gray-700'}`}>
                                        {t('Add Service')}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">{t('Service Charges')}</p>
                                </button>

                                {/* Add Other Tab */}
                                {/* <button
                                    type="button"
                                    onClick={() => switchTab('other')}
                                    className={`flex-1 px-6 py-4 text-center transition-all duration-200 relative ${
                                        activeTab === 'other'
                                            ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 text-orange-700'
                                            : 'bg-white text-gray-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {activeTab === 'other' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                                    )}
                                    <MoreHorizontal className={`mx-auto mb-2 h-6 w-6 ${activeTab === 'other' ? 'text-orange-600' : 'text-gray-500'}`} />
                                    <h3 className={`text-sm font-semibold ${activeTab === 'other' ? 'text-orange-700' : 'text-gray-700'}`}>
                                        {t('Add Other')}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">{t('Custom Items')}</p>
                                </button> */}
                            </div>
                        </div>

                        {/* Tab Content - Add Part */}
                        {activeTab === 'part' && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 px-4 py-4 sm:px-8 sm:py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                            <Box className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-white">
                                                {t('Add Part to Quotation')}
                                            </h3>
                                            <p className="mt-0.5 text-xs sm:text-sm text-blue-100">{t('Search from inventory and add parts')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6 p-4 sm:p-8">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {t('Search Part by Name, Code or Barcode')} <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative" ref={quotationSearchRef}>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Type at least 2 characters to search parts...')}
                                                    value={quotationSearchQuery}
                                                    onChange={handleQuotationSearchChange}
                                                    onFocus={() => {
                                                        if (quotationSearchQuery && quotationSearchResults.length > 0) {
                                                            setShowQuotationSearch(true);
                                                        }
                                                    }}
                                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-base"
                                                />
                                            </div>
                                            {showQuotationSearch && quotationSearchResults.length > 0 && (
                                                <div className="absolute z-50 mt-2 w-full bg-white border-2 border-blue-300 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                                                    {quotationSearchResults.map((item) => (
                                                        <button
                                                            key={`${item.ItmKy}-${item.company_code ?? 'no-company'}-${item.ItemCode}`}
                                                            type="button"
                                                            onClick={() => addQuotationItem(item)}
                                                            className="w-full text-left px-5 py-4 hover:bg-blue-50 border-b last:border-b-0 transition-colors duration-150"
                                                        >
                                                            <div className="font-semibold text-gray-900 text-base">{item.ItmNm || item.ItemCode}</div>
                                                            <div className="text-sm text-gray-600 mt-1.5 flex items-center">
                                                                <span className="inline-block bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md text-xs font-semibold mr-2">
                                                                    {item.ItemCode}
                                                                </span>
                                                                <span className="text-gray-700 font-medium">Rs {typeof item.SlsPri === 'string' ? parseFloat(item.SlsPri).toFixed(2) : (item.SlsPri as number).toFixed(2)}</span>
                                                                <span className="text-gray-500 mx-2">•</span>
                                                                <span className="text-gray-500">{item.Unit}</span>
                                                                {/* {item.company_code && (
                                                                    <>
                                                                        <span className="text-gray-500 mx-2">•</span>
                                                                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                                                                            item.company_code === auth?.user?.company_code
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-slate-100 text-slate-700'
                                                                        }`}>
                                                                            {item.company_code}
                                                                            {item.company_code === auth?.user?.company_code ? ` (${t('Current Company')})` : ''}
                                                                        </span>
                                                                    </>
                                                                )} */}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                {t('Product Name')} <span className="text-gray-400 text-xs">({t('Selected item')})</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.item_name}
                                                readOnly
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-slate-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-base"
                                                placeholder={t('Product name appears here after selection')}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                {t('Quantity')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.quantity}
                                                onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 1})}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                step="0.01"
                                                min="0.01"
                                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-base"
                                                placeholder="1.00"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                {t('Unit Price')} (Rs) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.unit_price}
                                                onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-base"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm text-gray-500">
                                            <span className="font-medium">Total:</span> Rs {(newItem.quantity * newItem.unit_price).toFixed(2)}
                                        </div>
                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setNewItem({
                                                    item_type: 'part',
                                                    item_name: '',
                                                    quantity: 1,
                                                    unit_price: 0,
                                                    description: '',
                                                })}
                                                className="w-full rounded-xl border-2 border-gray-300 px-5 py-2.5 font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 sm:w-auto"
                                            >
                                                {t('Clear')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddQuotationItemManual}
                                                disabled={!newItem.item_name || newItem.quantity <= 0 || newItem.unit_price < 0}
                                                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 font-semibold text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 sm:w-auto"
                                            >
                                                <Plus className="mr-2 h-5 w-5" />
                                                {t('Add Part')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content - Add Service Charges */}
                        {activeTab === 'service_charge' && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 px-4 py-4 sm:px-8 sm:py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                            <Wrench className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-white">
                                                {t('Add Service Charge to Quotation')}
                                            </h3>
                                            <p className="mt-0.5 text-xs sm:text-sm text-emerald-100">{t('Select from predefined service charges or create custom')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6 p-4 sm:p-8">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {t('Service Charge Name')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={t('e.g., Installation Charge, Service Fee, Delivery Charge, etc.')}
                                            value={newItem.item_name}
                                            onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                                            className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-base"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                {t('Quantity')} <span className="text-gray-400 text-xs">({t('Optional')})</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.quantity}
                                                onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 1})}
                                                step="0.01"
                                                min="0.01"
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-base"
                                                placeholder="1.00"
                                            />
                                        </div> */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                {t('Amount')} (Rs) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.unit_price}
                                                onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                                                step="0.01"
                                                min="0"
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-base"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {t('Description')} <span className="text-gray-400 text-xs">({t('Optional')})</span>
                                        </label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={e => setNewItem({...newItem, description: e.target.value})}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-base"
                                            rows={3}
                                            placeholder={t('Add any additional details about this charge...')}
                                        />
                                    </div>
                                    <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                                        <p className="text-sm text-emerald-800 flex items-start">
                                            <span className="text-lg mr-2">💡</span>
                                            <span><strong>Example:</strong> You can add charges like installation fee, service charge, delivery charge, warranty fee, consultation fee, etc. with any amount you need. <strong>Quantity is optional</strong> - leave it blank for single charges.</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm text-gray-500">
                                            <span className="font-medium">Total:</span> Rs {(newItem.quantity * newItem.unit_price).toFixed(2)}
                                        </div>
                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setNewItem({
                                                    item_type: 'service_charge',
                                                    item_name: '',
                                                    quantity: 1,
                                                    unit_price: 0,
                                                    description: '',
                                                })}
                                                className="w-full rounded-xl border-2 border-gray-300 px-5 py-2.5 font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 sm:w-auto"
                                            >
                                                {t('Clear')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddQuotationItemManual}
                                                disabled={!newItem.item_name || (newItem.item_type !== 'service_charge' && newItem.quantity <= 0) || newItem.unit_price < 0}
                                                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-2.5 font-semibold text-white shadow-md transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 sm:w-auto"
                                            >
                                                <Plus className="mr-2 h-5 w-5" />
                                                {t('Add Charge')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content - Add Other */}
                        {/* {activeTab === 'other' && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 px-8 py-5">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                            <MoreHorizontal className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">
                                                {t('Add Custom Item to Quotation')}
                                            </h3>
                                            <p className="text-orange-100 text-sm mt-0.5">{t('Create a custom item not in inventory')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {t('Item Name / Description')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={t('Enter custom item description, e.g., External Component, Labor Cost, etc.')}
                                            value={newItem.item_name}
                                            onChange={e => setNewItem({...newItem, item_name: e.target.value})}
                                            className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-base"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                {t('Quantity')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.quantity}
                                                onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 1})}
                                                step="0.01"
                                                min="0.01"
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-base"
                                                placeholder="1.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                {t('Unit Price')} (Rs) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.unit_price}
                                                onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                                                step="0.01"
                                                min="0"
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-base"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {t('Details')} <span className="text-gray-400 text-xs">({t('Optional')})</span>
                                        </label>
                                        <textarea
                                            value={newItem.description}
                                            onChange={e => setNewItem({...newItem, description: e.target.value})}
                                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition text-base"
                                            rows={3}
                                            placeholder={t('Add any details about this custom item...')}
                                        />
                                    </div>
                                    <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                        <p className="text-sm text-orange-800 flex items-start">
                                            <span className="text-lg mr-2">ℹ️</span>
                                            <span><strong>Note:</strong> Use this section for miscellaneous items, external components, labor costs, or any custom charges that don't fit in parts or service categories.</span>
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                        <div className="text-sm text-gray-500">
                                            <span className="font-medium">Total:</span> Rs {(newItem.quantity * newItem.unit_price).toFixed(2)}
                                        </div>
                                        <div className="flex space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => setNewItem({
                                                    item_type: 'other',
                                                    item_name: '',
                                                    quantity: 1,
                                                    unit_price: 0,
                                                    description: '',
                                                })}
                                                className="px-5 py-2.5 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                                            >
                                                {t('Clear')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddQuotationItemManual}
                                                disabled={!newItem.item_name || newItem.quantity <= 0 || newItem.unit_price < 0}
                                                className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center shadow-md hover:shadow-lg"
                                            >
                                                <Plus className="mr-2 h-5 w-5" />
                                                {t('Add Item')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )} */}

                        {/* Items Table */}
                        {quotationItems.length > 0 && (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 px-4 py-4 sm:px-8 sm:py-5">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                                <Package className="h-6 w-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-bold text-white">
                                                    {t('Quotation Items')}
                                                </h3>
                                                <p className="mt-0.5 text-xs sm:text-sm text-slate-200">{t('Review and edit items before creating quotation')}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                                            <span className="text-white font-bold text-lg">{quotationItems.length}</span>
                                            <span className="text-slate-200 text-sm ml-1">{quotationItems.length === 1 ? t('Item') : t('Items')}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="min-w-[860px] w-full">
                                        <thead className="sticky top-0 z-20 bg-white border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                    {t('TYPE')}
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                    {t('ITEM NAME')}
                                                </th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider w-32">
                                                    {t('QUANTITY')}
                                                </th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider w-36">
                                                    {t('UNIT PRICE (RS)')}
                                                </th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider w-36">
                                                    {t('TOTAL (RS)')}
                                                </th>
                                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider w-20">
                                                    {t('ACTION')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {quotationItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors duration-150">
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ${
                                                            item.item_type === 'part' 
                                                                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' 
                                                                : item.item_type === 'service_charge'
                                                                ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800'
                                                                : 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800'
                                                        }`}>
                                                            {item.item_type === 'part' ? t('Part') : item.item_type === 'service_charge' ? t('Service') : t('Other')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-900 font-semibold text-base">{item.item_name}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQuotationItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-24 px-2 py-2 border-2 border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateQuotationItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="w-28 px-2 py-2 border-2 border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-gray-900 text-base">
                                                        {(item.quantity * item.unit_price).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeQuotationItem(idx)}
                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                            className="text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-lg transition-all duration-200"
                                                            title={t('Remove Item')}
                                                        >
                                                            <Trash className="h-5 w-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {/* <tfoot className="bg-gradient-to-r from-slate-50 to-slate-100 border-t-2 border-slate-300">
                                            <tr>
                                                <td colSpan={4} className="px-8 py-5 text-right font-bold text-gray-900 text-xl">
                                                    {t('Grand Total')}:
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="inline-block bg-gradient-to-r from-vismass-blue to-blue-700 text-white px-6 py-3 rounded-xl shadow-md">
                                                        <span className="font-bold text-2xl">Rs {calculateQuotationTotal().toFixed(2)}</span>
                                                    </div>
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot> */}
                                    </table>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 shadow-inner sm:px-6 sm:py-4">
                                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
                                        <span className="text-sm text-slate-600 font-semibold">{t('Grand Total')}</span>
                                        <span className="text-xl text-vismass-blue font-bold">Rs {calculateQuotationTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes Section */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 px-4 py-4 sm:px-8 sm:py-5">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-white">
                                            {t('Notes & Terms')}
                                        </h3>
                                        <p className="mt-0.5 text-xs sm:text-sm text-slate-200">{t('Add payment terms, warranty info, or other notes')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 sm:p-8">
                                <textarea
                                    value={quotationNotes}
                                    onChange={(e) => setQuotationNotes(e.target.value)}
                                    placeholder={t('Example:\n\u2022 Payment Terms: 50% advance, 50% on completion\n\u2022 Warranty: 6 months on parts and labor\n\u2022 Delivery: 3-5 business days\n\u2022 Prices are subject to change without notice')}
                                    className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition text-base"
                                    rows={5}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:justify-end sm:space-x-4">
                            <button
                                type="button"
                                onClick={() => window.history.back()}
                                className="inline-flex w-full items-center justify-center rounded-xl border-2 border-gray-300 px-8 py-3.5 font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 sm:w-auto"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                {t('Cancel')}
                            </button>
                            {/* <button
                                type="button"
                                onClick={printQuotation}
                                disabled={quotationItems.length === 0}
                                className="inline-flex items-center px-8 py-3.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                            >
                                <Printer className="mr-2 h-5 w-5" />
                                {t('Print Preview')}
                            </button> */}
                            <button
                                type="submit"
                                disabled={creatingQuotation || quotationItems.length === 0}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-vismass-blue to-blue-700 px-8 py-3.5 font-semibold text-white shadow-md transition-all duration-200 hover:from-blue-600 hover:to-blue-800 hover:shadow-lg disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 sm:w-auto"
                            >
                                <Save className="mr-2 h-5 w-5" />
                                {creatingQuotation ? t('Saving...') : t('Create Quotation')}
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
        </AppSidebarLayout>
    );
};

export default CreateQuotation;
