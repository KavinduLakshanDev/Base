import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { Head, router, useForm, Link, usePage } from '@inertiajs/react';
import { Calendar, Loader, Truck, Building2, Printer, Search, X, Plus, Package, FileText, Trash2, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';

interface Section {
    id: number;
    section_code: string;
    name: string;
    is_main_stock: boolean;
    company_code: string;
}

interface Printer {
    id: number;
    item: {
        ItmKy: string;
        ItemCode: string;
        ItmNm: string;
    } | null;
    brand: string;
    model: string;
    serial_number: string;
    batch_no?: string;
    warranty: string;
    qty: number;
    section_code: string;
    cost_price?: number;
}

interface SelectedPrinter extends Printer {
    transfer_qty: number;
    cost_price?: number;
}

interface Props {
    sections?: Section[];
}

export default function Create({ sections = [] }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        from_section_code: '',
        to_section_code: '',
        stock_transfers: [] as Array<{
            stock_id: string;
            quantity: number;
            batch_no?: string;
            brand?: string;
            model?: string;
            serial_number?: string;
            warranty?: string;
            cost_price?: number;
        }>,
        transfer_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const [searchData, setSearchData] = useState({
        serial_number: '',
        brand: '',
        model: '',
    });

    const [searchResults, setSearchResults] = useState<Printer[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedPrinters, setSelectedPrinters] = useState<SelectedPrinter[]>([]);
    const [totalSectionStock, setTotalSectionStock] = useState<number | null>(null);
    const [fetchingStock, setFetchingStock] = useState(false);

    useEffect(() => {
        if (data.from_section_code) {
            fetchTotalSectionStock(data.from_section_code);
        } else {
            setTotalSectionStock(null);
        }
        // Clear selected printers and search results if the source section changes
        setSelectedPrinters([]);
        setSearchResults([]);
    }, [data.from_section_code]);

    const fetchTotalSectionStock = async (sectionCode: string) => {
        setFetchingStock(true);
        try {
            const response = await fetch(`/printer-transfers/section-trf-in-stock?section_code=${sectionCode}`);
            if (response.ok) {
                const result = await response.json();
                setTotalSectionStock(result.total_trf_in_stock);
            }
        } catch (error) {
            console.error('Error fetching section stock:', error);
        } finally {
            setFetchingStock(false);
        }
    };

    useEffect(() => {
        const stockTransfers = selectedPrinters.map(p => ({
            stock_id: p.id.toString(),
            quantity: p.transfer_qty || 1,
            item_code: p.item?.ItemCode,
            item_name: p.item?.ItmNm,
            batch_no: p.batch_no || undefined,
            brand: p.brand || undefined,
            model: p.model || undefined,
            serial_number: p.serial_number || undefined,
            warranty: p.warranty || undefined,
            cost_price: p.cost_price || undefined,
        }));
        setData('stock_transfers', stockTransfers);
    }, [selectedPrinters]);

    const { auth } = usePage<any>().props;
    const userCompanyCode = auth?.user?.company_code;

    // Show only sections belonging to the current user's company
    const filteredSections = sections.filter(s => {
        if (!userCompanyCode) return true;
        return s.company_code === userCompanyCode;
    });

    const fromSectionObj = sections.find(s => s.section_code === data.from_section_code);

    // From/To helpers mirror stock transfer behaviour
    const availableFromSections = filteredSections.filter(section =>
        !data.to_section_code || section.section_code.trim() !== data.to_section_code.trim()
    );
    const availableToSections = filteredSections.filter(section => {
        if (data.from_section_code && section.section_code.trim() === data.from_section_code.trim()) {
            return false;
        }
        
        if (fromSectionObj && fromSectionObj.company_code && section.company_code && fromSectionObj.company_code !== section.company_code) {
            return false;
        }
        
        return true;
    });

    // default from section = main stock or first in list
    useEffect(() => {
        if (filteredSections.length > 0 && !data.from_section_code) {
            const mainStock = filteredSections.find(s => s.is_main_stock);
            if (mainStock) {
                setData('from_section_code', mainStock.section_code);
            } else if (filteredSections[0]) {
                setData('from_section_code', filteredSections[0].section_code);
            }
        }
    }, [filteredSections]);

    // clear to section when it equals from section
    useEffect(() => {
        if (data.from_section_code && data.to_section_code === data.from_section_code) {
            setData('to_section_code', '');
        }
    }, [data.from_section_code, data.to_section_code]);

    const handleSearch = async () => {
        if (!data.from_section_code) {
            alert(t('Please select From Section first'));
            return;
        }

        setSearching(true);
        try {
            const params = new URLSearchParams();
            if (searchData.serial_number) params.append('serial_number', searchData.serial_number);
            if (searchData.brand) params.append('brand', searchData.brand);
            if (searchData.model) params.append('model', searchData.model);
            // Filter by the selected from section
            params.append('from_section_code', data.from_section_code);

            const response = await fetch(`/printer-transfers/search-printers?${params}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const printers = await response.json();
                setSearchResults(printers);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const addToTransfer = (printer: Printer) => {
        const isAlreadySelected = selectedPrinters.some(p => p.id === printer.id);

        if (!isAlreadySelected) {
            setSelectedPrinters([...selectedPrinters, { ...printer, transfer_qty: 1, cost_price: Number(printer.cost_price || 0) }]);
        }
    };

    const removeFromTransfer = (printerId: number) => {
        setSelectedPrinters(selectedPrinters.filter(p => p.id !== printerId));
    };

    const updatePrinterQuantity = (printerId: number, quantity: number) => {
        setSelectedPrinters(selectedPrinters.map(p =>
            p.id === printerId ? { ...p, transfer_qty: quantity } : p
        ));
    };

    const updatePrinterField = (printerId: number, field: string, value: string) => {
        setSelectedPrinters(selectedPrinters.map(p =>
            p.id === printerId ? { ...p, [field]: value } : p
        ));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedPrinters.length === 0) {
            alert(t('Please select at least one printer to transfer.'));
            return;
        }

        Swal.fire({
            title: t('Are you sure?'),
            text: t('Are you sure you want to complete this transfer? This will seal the confirmation.'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: t('Yes, complete it!')
        }).then((result) => {
            if (result.isConfirmed) {
                post('/printer-transfers', {
                    onSuccess: (page: any) => {
                        const props = page?.props || {};
                        const flash = props.flash || {};

                        if (flash.transfer_ids && flash.transfer_ids.length > 0) {
                            // Construct batch download URL
                            const ids = Array.isArray(flash.transfer_ids) ? flash.transfer_ids.join(',') : flash.transfer_ids;
                            const downloadUrl = `/printer-transfers/download-pdf-batch?ids=${ids}`;

                            // Auto-download via iframe
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = downloadUrl;
                            document.body.appendChild(iframe);

                            setTimeout(() => {
                                document.body.removeChild(iframe);
                            }, 5000);

                            Swal.fire({
                                title: t('Transfer Successful'),
                                text: t('Printer transfers completed. Report is downloading.'),
                                icon: 'success',
                                confirmButtonColor: '#3B82F6',
                                confirmButtonText: t('OK'),
                                footer: `<a href="${downloadUrl}" target="_blank" style="color: #3B82F6; text-decoration: underline;">${t('Click here if download did not start')}</a>`
                            }).then(() => {
                                router.visit('/printer-transfers');
                            });
                        } else {
                            // Fallback
                            Swal.fire({
                                title: t('Success'),
                                text: t('Printer transfers created successfully.'),
                                icon: 'success'
                            }).then(() => {
                                router.visit('/printer-transfers');
                            });
                        }
                    },
                });
            }
        });
    };

    const handleDownloadPdf = async (preview = true) => {
        if (selectedPrinters.length === 0) {
            alert(t('Please select at least one printer to download PDF.'));
            return;
        }

        if (!data.from_section_code || !data.to_section_code) {
            alert(t('Please select both From and To sections.'));
            return;
        }

        try {
            // Create PDF data
            const pdfData = {
                from_section_code: data.from_section_code,
                to_section_code: data.to_section_code,
                transfer_date: data.transfer_date,
                notes: data.notes,
                stock_transfers: selectedPrinters.map(p => ({
                    stock_id: p.id.toString(),
                    quantity: p.transfer_qty || 1,
                    batch_no: p.batch_no || undefined,
                    brand: p.brand || undefined,
                    model: p.model || undefined,
                    serial_number: p.serial_number || undefined,
                    warranty: p.warranty || undefined,
                    cost_price: Number(p.cost_price || 0),
                    item: p.item,
                })),
                preview: preview // Flag to indicate this is a preview
            };

            const response = await fetch('/printer-transfers/preview-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(pdfData),
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            // Create a blob and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `printer-transfer${preview ? '-preview' : ''}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert(t('Failed to generate PDF'));
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Printer Transfers', href: '/printer-transfers' },
            { title: 'Create Printer Transfer', href: '/printer-transfers/create' }
        ]}>
            <Head title={t('Create Printer Transfer')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/printer-transfers"
                                    className="rounded-xl bg-white/20 p-3 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Create Printer Transfer')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Transfer printers between sections')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    {/* <div className="px-4 sm:px-0">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-vismass-blue to-vismass-grey bg-clip-text text-transparent mb-2">
                            {t('Create Printer Transfer')}
                        </h1>
                        <p className="text-slate-600 text-lg">
                            {t('Transfer printers between sections in your distribution network')}
                        </p>
                    </div> */}

                    <div className="px-4 sm:px-0 mt-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Step 1: Select From and To Sections */}
                            <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
                                <CardHeader className="space-y-1 pb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <Building2 className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <CardTitle className="text-xl font-semibold text-slate-800">
                                            {t('Step 1: Select Sections')}
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* From Section */}
                                        <div>
                                            <Label htmlFor="from_section_code" className="text-sm font-medium text-slate-700 mb-2 block flex items-center">
                                                <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('From Section')} <span className="text-red-500 ml-1">*</span>
                                            </Label>
                                            <Select value={data.from_section_code} onValueChange={(value) => setData('from_section_code', value)}>
                                                <SelectTrigger className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20">
                                                    <SelectValue placeholder={t('Select source section')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableFromSections.map((section) => (
                                                        <SelectItem key={section.section_code} value={section.section_code}>
                                                            {section.name} {section.is_main_stock ? '(Main Stock)' : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {fetchingStock && (
                                                <div className="mt-1 flex items-center text-xs text-vismass-blue animate-pulse">
                                                    <Loader className="mr-1 h-3 w-3 animate-spin" />
                                                    {t('Calculating current stock...')}
                                                </div>
                                            )}
                                            {totalSectionStock !== null && !fetchingStock && (
                                                <div className="mt-2 p-3 bg-vismass-blue/10 border border-vismass-blue/20 rounded-md flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-vismass-blue uppercase tracking-wider">{t('Total Printers in Section')}</span>
                                                    <span className="text-lg font-bold text-vismass-blue">{totalSectionStock}</span>
                                                </div>
                                            )}
                                            {errors.from_section_code && (
                                                <p className="mt-1 text-sm text-red-600">{errors.from_section_code}</p>
                                            )}
                                        </div>

                                        {/* To Section */}
                                        <div>
                                            <Label htmlFor="to_section_code" className="text-sm font-medium text-slate-700 mb-2 block flex items-center">
                                                <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('To Section')} <span className="text-red-500 ml-1">*</span>
                                            </Label>
                                            <Select value={data.to_section_code} onValueChange={(value) => setData('to_section_code', value)}>
                                                <SelectTrigger className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20">
                                                    <SelectValue placeholder={t('Select destination section')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableToSections.map((section) => (
                                                        <SelectItem key={section.section_code} value={section.section_code}>
                                                            {section.name} {section.is_main_stock ? '(Main Stock)' : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.to_section_code && (
                                                <p className="mt-1 text-sm text-red-600">{errors.to_section_code}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Step 2: Search Printers */}
                            {data.from_section_code && (
                                <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
                                    <CardHeader className="space-y-1 pb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Search className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <CardTitle className="text-xl font-semibold text-slate-800">
                                                {t('Step 2: Search Printers')}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <Label htmlFor="serial_number" className="text-sm font-medium text-slate-700">
                                                    {t('Serial Number')}
                                                </Label>
                                                <Input
                                                    id="serial_number"
                                                    value={searchData.serial_number}
                                                    onChange={(e) => setSearchData({ ...searchData, serial_number: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSearch();
                                                        }
                                                    }}
                                                    placeholder={t('Enter serial number')}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="brand" className="text-sm font-medium text-slate-700">
                                                    {t('Brand')}
                                                </Label>
                                                <Input
                                                    id="brand"
                                                    value={searchData.brand}
                                                    onChange={(e) => setSearchData({ ...searchData, brand: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSearch();
                                                        }
                                                    }}
                                                    placeholder={t('Enter brand')}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="model" className="text-sm font-medium text-slate-700">
                                                    {t('Model')}
                                                </Label>
                                                <Input
                                                    id="model"
                                                    value={searchData.model}
                                                    onChange={(e) => setSearchData({ ...searchData, model: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSearch();
                                                        }
                                                    }}
                                                    placeholder={t('Enter model')}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    type="button"
                                                    onClick={handleSearch}
                                                    disabled={searching}
                                                    className="w-full bg-vismass-blue hover:bg-vismass-blue/90"
                                                >
                                                    {searching ? (
                                                        <>
                                                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                                                            {t('Searching...')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Search className="mr-2 h-4 w-4" />
                                                            {t('Search')}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Search Results Table */}
                                        {searchResults.length > 0 && (
                                            <div className="mt-6">
                                                <h3 className="text-lg font-semibold text-slate-800 mb-3">
                                                    {t('Search Results')} ({searchResults.length})
                                                </h3>
                                                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Serial Number')}</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Batch No')}</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Brand')}</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Model')}</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Section')}</th>
                                                                <th className="px-4 py-3 text-center font-semibold text-slate-700">{t('Stock')}</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Warranty (Months)')}</th>
                                                                <th className="px-4 py-3 text-center font-semibold text-slate-700">{t('Action')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {searchResults.map((printer) => (
                                                                <tr key={printer.id} className="border-t border-slate-200 hover:bg-slate-50">
                                                                    <td className="px-4 py-3">{printer.serial_number}</td>
                                                                    <td className="px-4 py-3 text-slate-500">{printer.batch_no || '-'}</td>
                                                                    <td className="px-4 py-3">{printer.brand}</td>
                                                                    <td className="px-4 py-3">{printer.model}</td>

                                                                    <td className="px-4 py-3"
                                                                        >{printer.section_code}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                                            Number(printer.qty) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {printer.qty ?? 0}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">{printer.warranty || 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={() => addToTransfer(printer)}
                                                                            disabled={selectedPrinters.some(p => p.id === printer.id)}
                                                                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                                                                        >
                                                                            <Plus className="mr-1 h-3 w-3" />
                                                                            {selectedPrinters.some(p => p.id === printer.id) ? t('Added') : t('Add')}
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {searchResults.length === 0 && !searching && (searchData.serial_number || searchData.brand || searchData.model) && (
                                            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-yellow-800">{t('No printers found matching your criteria')}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Selected Printers */}
                            {selectedPrinters.length > 0 && (
                                <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
                                    <CardHeader className="space-y-1 pb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Package className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <CardTitle className="text-xl font-semibold text-slate-800">
                                                {t('Step 3: Selected Printers')} ({selectedPrinters.length})

                                            </CardTitle>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-6 space-y-4">
                                        <div className="w-full md:w-1/3">
                                            <Label htmlFor="transfer_date" className="text-sm font-medium text-slate-700 mb-2 block flex items-center">
                                                <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('Transfer Date')} <span className="text-red-500 ml-1">*</span>
                                            </Label>
                                            <Input
                                                id="transfer_date"
                                                type="date"
                                                value={data.transfer_date}
                                                onChange={(e) => setData('transfer_date', e.target.value)}
                                                className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                            />
                                            {errors.transfer_date && (
                                                <p className="mt-1 text-sm text-red-600">{errors.transfer_date}</p>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg">

                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Serial Number')}</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Brand')}</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Model')}</th>
                                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">{t('Cost Price')}</th>
                                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">{t('Total')}</th>
                                                        <th className="px-4 py-3 text-center font-semibold text-slate-700">{t('Action')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedPrinters.map((printer) => (
                                                        <tr key={printer.id} className="border-t border-slate-200 hover:bg-slate-50">
                                                            <td className="px-4 py-3">{printer.serial_number}</td>
                                                            <td className="px-4 py-3">{printer.brand}</td>
                                                            <td className="px-4 py-3">{printer.model}</td>

                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={Number(printer.cost_price || 0).toFixed(2)}
                                                                        readOnly
                                                                        className="w-30 px-2 py-1 border border-gray-300 rounded text-center bg-gray-50"
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center font-semibold text-green-600">
                                                                {(Number(printer.cost_price || 0) * (printer.transfer_qty || 1)).toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() => removeFromTransfer(printer.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                                    {/* {t('Remove')} */}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-vismass-blue/10 border-t-2 border-vismass-blue/20">
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-3 text-right font-semibold text-vismass-blue">
                                                            {t('Grand Total')}:
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-lg text-vismass-blue">
                                                            Rs. {selectedPrinters.reduce((total, printer) => total + (Number(printer.cost_price || 0) * (printer.transfer_qty || 1)), 0).toFixed(2)}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 4: Transfer Details */}
                            {selectedPrinters.length > 0 && (
                                <Card className="bg-white rounded-2xl shadow-lg border border-slate-200">
                                    <CardHeader className="space-y-1 pb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Calendar className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <CardTitle className="text-xl font-semibold text-slate-800">
                                                {t('Step 4: Transfer Details')}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">


                                        <div>
                                            <Label htmlFor="notes" className="text-sm font-medium text-slate-700 mb-2 block">
                                                {t('Notes')}
                                            </Label>
                                            <textarea
                                                id="notes"
                                                value={data.notes}
                                                onChange={(e) => setData('notes', e.target.value)}
                                                placeholder={t('Add any notes about this transfer')}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-vismass-blue/20 focus:border-vismass-blue"
                                                rows={3}
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-6 border-t border-slate-200">
                                            <Button
                                                type="button"
                                                onClick={() => handleDownloadPdf()}
                                                disabled={!data.from_section_code || !data.to_section_code || selectedPrinters.length === 0}
                                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50"
                                            >
                                                <FileText className="mr-2 h-5 w-5" />
                                                {t('Preview Draft')}
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={processing || !data.from_section_code || !data.to_section_code || selectedPrinters.length === 0}
                                                className="flex-1 bg-vismass-blue hover:bg-vismass-blue/90 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50"
                                            >
                                                {processing ? (
                                                    <>
                                                        <Loader className="mr-2 h-5 w-5 animate-spin" />
                                                        {t('Processing...')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Truck className="mr-2 h-5 w-5" />
                                                        {t('Complete Transfer')}
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => router.visit('/printer-transfers')}
                                                variant="outline"
                                                className="flex-1 border-slate-200 hover:bg-slate-50 font-semibold py-3 rounded-xl"
                                            >
                                                {t('Cancel')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-slate-600 px-4">
                        <p className="text-sm">Manage your printer inventory • Transfer printers efficiently</p>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
