import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Building2, MapPin, Edit, ArrowLeft, Calendar, Tag } from 'lucide-react';

interface Section {
    id: number;
    uuid: string;
    section_code: string;
    name: string;
    contact_person_name: string | null;
    contact_person_number: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    section_type: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Props {
    section: Section;
}

export default function ShowSection({ section }: Props) {
    const getSectionTypeIcon = (type: string) => {
        switch (type) {
            case 'warehouse': return '🏭';
            case 'store': return '🏪';
            case 'office': return '🏢';
            default: return '📍';
        }
    };

    const getSectionTypeColor = (type: string) => {
        switch (type) {
            case 'warehouse': return 'from-orange-500 to-orange-600';
            case 'store': return 'from-green-500 to-green-600';
            case 'office': return 'from-purple-500 to-purple-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Sections', href: '/sections' },
            { title: section.name, href: `/sections/${section.id}` }
        ]}>
            <Head title={section.name} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/sections"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {section.name}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Section Details
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={`/sections/${section.id}/edit`}
                                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Edit className="mr-1.5 h-4 w-4" />
                                Edit Section
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                    {/* Main Content Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Information Card */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information */}
                            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Building2 className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">Basic Information</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <Tag className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">Section Code</p>
                                                <p className="font-medium text-slate-800">{section.section_code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Building2 className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">Section Name</p>
                                                <p className="font-medium text-slate-800">{section.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-lg">{getSectionTypeIcon(section.section_type)}</span>
                                            <div>
                                                <p className="text-sm text-slate-500">Type</p>
                                                <p className="font-medium text-slate-800 capitalize">{section.section_type}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">Created</p>
                                                <p className="font-medium text-slate-800">{formatDate(section.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">Updated</p>
                                                <p className="font-medium text-slate-800">{formatDate(section.updated_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${section.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div>
                                                <p className="text-sm text-slate-500">Status</p>
                                                <p className="font-medium text-slate-800">{section.is_active ? 'Active' : 'Inactive'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            {(section.address || section.city || section.state || section.country) && (
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <MapPin className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">Address Information</h2>
                                    </div>

                                    <div className="space-y-4">
                                        {section.address && (
                                            <div className="flex items-start space-x-3">
                                                <MapPin className="w-4 h-4 text-vismass-blue mt-1" />
                                                <div>
                                                    <p className="text-sm text-slate-500">Address</p>
                                                    <p className="font-medium text-slate-800">{section.address}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-7">
                                            {section.city && (
                                                <div>
                                                    <p className="text-sm text-slate-500">City</p>
                                                    <p className="font-medium text-slate-800">{section.city}</p>
                                                </div>
                                            )}
                                            {section.state && (
                                                <div>
                                                    <p className="text-sm text-slate-500">State</p>
                                                    <p className="font-medium text-slate-800">{section.state}</p>
                                                </div>
                                            )}
                                            {section.country && (
                                                <div>
                                                    <p className="text-sm text-slate-500">Country</p>
                                                    <p className="font-medium text-slate-800">{section.country}</p>
                                                </div>
                                            )}
                                        </div>

                                        {section.postal_code && (
                                            <div className="flex items-start space-x-3 ml-7">
                                                <div className="w-4 h-4"></div>
                                                <div>
                                                    <p className="text-sm text-slate-500">Postal Code</p>
                                                    <p className="font-medium text-slate-800">{section.postal_code}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contact Information Sidebar */}
                        <div className="space-y-6">
                            {/* Actions Card */}
                            {/* <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4">Actions</h2>
                                <div className="space-y-3">
                                    <Link
                                        href={`/sections/${section.id}/edit`}
                                        className="w-full bg-vismass-blue hover:bg-vismass-blue/90 text-white px-4 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium inline-flex items-center justify-center space-x-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Edit Section</span>
                                    </Link>
                                </div>
                            </div> */}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-12 text-slate-600">
                        <p className="text-sm">Section details • Part of your distribution network</p>
                    </div>
                </div>
                </main>
            </div>
        </AppLayout>
    );
}