import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, User, MapPin, FileText, Lock, Settings, ArrowLeft, Pencil, Trash2, Plus, Percent } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Company Profile',
        href: '/company/profile',
    },
];

interface Company {
    id: number;
    company_code: string;
    name: string;
    contact_person_name: string;
    contact_person_number: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    tax_id?: string;
    privilege_users_discount?: number;
    privilege_card_discount?: number;
    vat_rate?: number;
    vat_no?: string;
    vat_effective_date?: string;
}

interface VatRate {
    id: number;
    vat_rate: number;
    vat_no?: string;
    effective_date: string;
    end_date?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Props {
    company?: Company | null;
}

export default function CompanyProfile({ company }: Props) {
    const { data, setData, put, processing, errors, setError, clearErrors } = useForm({
        name: company?.name || '',
        contact_person_name: company?.contact_person_name || '',
        contact_person_number: company?.contact_person_number || '',
        email: company?.email || '',
        phone: company?.phone || '',
        address: company?.address || '',
        city: company?.city || '',
        state: company?.state || '',
        country: company?.country || '',
        postal_code: company?.postal_code || '',
        tax_id: company?.tax_id || '',
        privilege_users_discount: company?.privilege_users_discount || '',
        privilege_card_discount: company?.privilege_card_discount || '',
        vat_rate: company?.vat_rate || '',
        vat_no: company?.vat_no || '',
        vat_effective_date: company?.vat_effective_date || '',
        password: '',
        password_confirmation: '',
    });

    const [vatRates, setVatRates] = useState<VatRate[]>([]);
    const [loadingVatRates, setLoadingVatRates] = useState(false);
    const [isVatRateDialogOpen, setIsVatRateDialogOpen] = useState(false);
    const [editingVatRateId, setEditingVatRateId] = useState<number | null>(null);
    const [newVatRate, setNewVatRate] = useState({
        vat_rate: '',
        vat_no: '',
        effective_date: new Date().toISOString().split('T')[0],
        end_date: '',
    });
    const [processingVatRate, setProcessingVatRate] = useState(false);

    useEffect(() => {
        fetchVatRates();
    }, []);

    const fetchVatRates = async () => {
        setLoadingVatRates(true);
        try {
            const response = await axios.get(route('company.vat-rates.index'));
            setVatRates(response.data);

            // Update the main form VAT rate if an active one is found in the list
            const activeRate = response.data.find((r: VatRate) => r.is_active);
            if (activeRate) {
                setData(prev => ({
                    ...prev,
                    vat_rate: activeRate.vat_rate,
                    vat_no: activeRate.vat_no || prev.vat_no
                }));
            }
        } catch (error) {
            console.error('Error fetching VAT rates:', error);
        } finally {
            setLoadingVatRates(false);
        }
    };

    const openAddDialog = () => {
        setEditingVatRateId(null);
        setNewVatRate({
            vat_rate: '',
            vat_no: '',
            effective_date: new Date().toISOString().split('T')[0],
            end_date: '',
        });
        setIsVatRateDialogOpen(true);
    };

    const openEditDialog = (rate: VatRate) => {
        setEditingVatRateId(rate.id);
        setNewVatRate({
            vat_rate: rate.vat_rate.toString(),
            vat_no: rate.vat_no || '',
            effective_date: rate.effective_date.split('T')[0],
            end_date: rate.end_date ? rate.end_date.split('T')[0] : '',
        });
        setIsVatRateDialogOpen(true);
    };

    const handleSaveVatRate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessingVatRate(true);
        try {
            if (editingVatRateId) {
                await axios.put(route('company.vat-rates.update', editingVatRateId), newVatRate);
            } else {
                await axios.post(route('company.vat-rates.store'), newVatRate);
            }
            setIsVatRateDialogOpen(false);
            fetchVatRates();
            // Reset form
            setNewVatRate({
                vat_rate: '',
                vat_no: '',
                effective_date: new Date().toISOString().split('T')[0],
                end_date: '',
            });
            setEditingVatRateId(null);
        } catch (error) {
            console.error('Error saving VAT rate:', error);
        } finally {
            setProcessingVatRate(false);
        }
    };

    const handleDeleteVatRate = async (id: number) => {
        if (!confirm('Are you sure you want to delete this VAT rate?')) return;

        try {
            await axios.delete(route('company.vat-rates.destroy', id));
            fetchVatRates();
        } catch (error) {
            console.error('Error deleting VAT rate:', error);
        }
    };
    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        clearErrors();

        // Validate contact person number (must be + followed by 11 digits, not starting with 0)
        const phoneRegex = /^\+[1-9]\d{10}$/;
        if (!phoneRegex.test(data.contact_person_number)) {
            setError('contact_person_number', 'Contact person number must be in format +XXXXXXXXXXX (12 characters, not starting with 0 after +).');
            return;
        }

        // Validate business phone if provided (must be + followed by 11 digits, not starting with 0)
        if (data.phone && !/^\+[1-9]\d{10}$/.test(data.phone)) {
            setError('phone', 'Business phone must be in format +XXXXXXXXXXX (12 characters, not starting with 0 after +).');
            return;
        }

        put(route('company.profile.update'));
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title="Company Profile" />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <Link
                                    href="/dashboard"
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow border border-white/30">
                                    <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        Company Profile
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        Manage your company information and settings
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="p-4 sm:p-6">
                                <form id="company-profile-form" onSubmit={submit} className="space-y-8">
                                    {/* Basic Information Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Building2 className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <Building2 className="w-4 h-4 mr-2 text-blue-500" />
                                                    Company Name *
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={data.name}
                                                    readOnly
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-gray-100 cursor-not-allowed text-gray-500 backdrop-blur-sm"
                                                    placeholder="Enter company name"
                                                />
                                                <InputError message={errors.name} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <Settings className="w-4 h-4 mr-2 text-blue-500" />
                                                    Email Address *
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={data.email}
                                                    onChange={(e) => setData('email', e.target.value)}
                                                    required
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="company@example.com"
                                                />
                                                <InputError message={errors.email} />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <Settings className="w-4 h-4 mr-2 text-blue-500" />
                                                    Business Phone
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    value={data.phone}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^+\d]/g, '').slice(0, 12);
                                                        setData('phone', value);
                                                    }}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="+12345678901"
                                                />
                                                <InputError message={errors.phone} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Person Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <User className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-gray-800">Contact Person</h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="contact_person_name" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <User className="w-4 h-4 mr-2 text-blue-500" />
                                                    Contact Person Name *
                                                </Label>
                                                <Input
                                                    id="contact_person_name"
                                                    value={data.contact_person_name}
                                                    onChange={(e) => setData('contact_person_name', e.target.value)}
                                                    required
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="John Smith"
                                                />
                                                <InputError message={errors.contact_person_name} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="contact_person_number" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <Settings className="w-4 h-4 mr-2 text-blue-500" />
                                                    Contact Person Number *
                                                </Label>
                                                <Input
                                                    id="contact_person_number"
                                                    value={data.contact_person_number}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[^+\d]/g, '').slice(0, 12);
                                                        setData('contact_person_number', value);
                                                    }}
                                                    required
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="+12345678901"
                                                />
                                                <InputError message={errors.contact_person_number} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Address Information Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <MapPin className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-gray-800">Address Information</h2>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="address" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                                                    Street Address
                                                </Label>
                                                <Textarea
                                                    id="address"
                                                    value={data.address}
                                                    onChange={(e) => setData('address', e.target.value)}
                                                    rows={3}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="123 Business Street"
                                                />
                                                <InputError message={errors.address} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                                                    <Input
                                                        id="city"
                                                        value={data.city}
                                                        onChange={(e) => setData('city', e.target.value)}
                                                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                        placeholder="New York"
                                                    />
                                                    <InputError message={errors.city} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="state" className="text-sm font-medium text-gray-700">State</Label>
                                                    <Input
                                                        id="state"
                                                        value={data.state}
                                                        onChange={(e) => setData('state', e.target.value)}
                                                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                        placeholder="NY"
                                                    />
                                                    <InputError message={errors.state} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country</Label>
                                                    <Input
                                                        id="country"
                                                        value={data.country}
                                                        onChange={(e) => setData('country', e.target.value)}
                                                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                        placeholder="USA"
                                                    />
                                                    <InputError message={errors.country} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="postal_code" className="text-sm font-medium text-gray-700">Postal Code</Label>
                                                    <Input
                                                        id="postal_code"
                                                        value={data.postal_code}
                                                        onChange={(e) => setData('postal_code', e.target.value)}
                                                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                        placeholder="10001"
                                                    />
                                                    <InputError message={errors.postal_code} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tax Information Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-gray-800">Tax Information</h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="tax_id" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                                    Tax ID
                                                </Label>
                                                <Input
                                                    id="tax_id"
                                                    value={data.tax_id}
                                                    onChange={(e) => setData('tax_id', e.target.value)}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="Enter tax ID"
                                                />
                                                <InputError message={errors.tax_id} />
                                            </div>



                                            <div className="space-y-2">
                                                <Label htmlFor="vat_no" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                                    VAT Number
                                                </Label>
                                                <Input
                                                    id="vat_no"
                                                    value={data.vat_no}
                                                    onChange={(e) => setData('vat_no', e.target.value)}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="Enter VAT number"
                                                />
                                                <InputError message={errors.vat_no} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="vat_rate" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                                    VAT Rate (%)
                                                </Label>
                                                <Input
                                                    id="vat_rate"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={data.vat_rate}
                                                    onChange={(e) => setData('vat_rate', e.target.value)}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="15.00"
                                                />
                                                <InputError message={errors.vat_rate} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="vat_effective_date" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                                    VAT Effective Date
                                                </Label>
                                                <Input
                                                    id="vat_effective_date"
                                                    type="date"
                                                    value={data.vat_effective_date ? data.vat_effective_date.split('T')[0] : ''}
                                                    onChange={(e) => setData('vat_effective_date', e.target.value)}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                />
                                                <InputError message={errors.vat_effective_date} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Discount Information Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Percent className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-gray-800">Discount Information</h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="privilege_users_discount" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <Percent className="w-4 h-4 mr-2 text-blue-500" />
                                                    Privilege Cash Payment Discount (%)
                                                </Label>
                                                <Input
                                                    id="privilege_users_discount"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={data.privilege_users_discount}
                                                    onChange={(e) => setData('privilege_users_discount', e.target.value)}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="Enter cash discount percentage"
                                                />
                                                <InputError message={errors.privilege_users_discount} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="privilege_card_discount" className="text-sm font-medium text-gray-700 flex items-center">
                                                    <Percent className="w-4 h-4 mr-2 text-blue-500" />
                                                    Privilege Card Payment Discount (%)
                                                </Label>
                                                <Input
                                                    id="privilege_card_discount"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={data.privilege_card_discount}
                                                    onChange={(e) => setData('privilege_card_discount', e.target.value)}
                                                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                    placeholder="Enter card discount percentage"
                                                />
                                                <InputError message={errors.privilege_card_discount} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password Change Section */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Lock className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
                                        </div>

                                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-200/50">
                                            <p className="text-sm text-blue-700 mb-4">
                                                Leave blank if you don't want to change your password.
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center">
                                                        <Lock className="w-4 h-4 mr-2 text-blue-500" />
                                                        New Password
                                                    </Label>
                                                    <Input
                                                        id="password"
                                                        type="password"
                                                        value={data.password}
                                                        onChange={(e) => setData('password', e.target.value)}
                                                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                        placeholder="Enter new password"
                                                    />
                                                    <InputError message={errors.password} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="password_confirmation" className="text-sm font-medium text-gray-700 flex items-center">
                                                        <Lock className="w-4 h-4 mr-2 text-blue-500" />
                                                        Confirm New Password
                                                    </Label>
                                                    <Input
                                                        id="password_confirmation"
                                                        type="password"
                                                        value={data.password_confirmation}
                                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                                        placeholder="Confirm new password"
                                                    />
                                                    <InputError message={errors.password_confirmation} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="flex justify-end pt-6 border-t border-blue-200/50">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 font-medium"
                                        >
                                            {processing ? (
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Updating Profile...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <Settings className="w-5 h-5" />
                                                    <span>Update Profile</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-200/50 p-8 mt-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">VAT Rates Management</h2>
                                </div>
                            </div>

                            <Dialog open={isVatRateDialogOpen} onOpenChange={setIsVatRateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        onClick={openAddDialog}
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add VAT Rate</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>{editingVatRateId ? 'Edit VAT Rate' : 'Add New VAT Rate'}</DialogTitle>
                                        <DialogDescription>
                                            {editingVatRateId ? 'Update existing VAT rate details.' : 'Create a new VAT rate configuration for your company.'}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSaveVatRate} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new_vat_rate">VAT Rate (%)</Label>
                                            <Input
                                                id="new_vat_rate"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                value={newVatRate.vat_rate}
                                                onChange={(e) => setNewVatRate({ ...newVatRate, vat_rate: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new_vat_no">VAT Number</Label>
                                            <Input
                                                id="new_vat_no"
                                                value={newVatRate.vat_no}
                                                onChange={(e) => setNewVatRate({ ...newVatRate, vat_no: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="new_effective_date">Start Date</Label>
                                                <Input
                                                    id="new_effective_date"
                                                    type="date"
                                                    value={newVatRate.effective_date}
                                                    onChange={(e) => setNewVatRate({ ...newVatRate, effective_date: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new_end_date">End Date (Optional)</Label>
                                                <Input
                                                    id="new_end_date"
                                                    type="date"
                                                    value={newVatRate.end_date}
                                                    onChange={(e) => setNewVatRate({ ...newVatRate, end_date: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setIsVatRateDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={processingVatRate}>
                                                {processingVatRate ? 'Saving...' : (editingVatRateId ? 'Update Rate' : 'Add Rate')}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>VAT Rate (%)</TableHead>
                                        <TableHead>VAT Number</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead>End Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingVatRates ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                                    <span>Loading VAT rates...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : vatRates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No VAT rates configured yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        vatRates.map((rate) => (
                                            <TableRow key={rate.id}>
                                                <TableCell className="font-medium">{rate.vat_rate}%</TableCell>
                                                <TableCell>{rate.vat_no || '-'}</TableCell>
                                                <TableCell>{new Date(rate.effective_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{rate.end_date ? new Date(rate.end_date).toLocaleDateString() : '-'}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${rate.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {rate.is_active ? 'Active' : 'Expired/Inactive'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end space-x-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditDialog(rate)}
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteVatRate(rate.id)}
                                                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-slate-600">
                        <p className="text-sm">Company Profile Management • Keep your business information up to date</p>
                    </div>
                </main>
            </div >
        </AppSidebarLayout >
    );
}