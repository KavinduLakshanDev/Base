import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Truck, MapPin, Edit, ArrowLeft, Calendar, Tag, Eye, ToggleLeft, ToggleRight } from 'lucide-react';

interface DeliveryRoute {
    id: number;
    name: string;
    areas: string[] | null;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    company_code: string;
    // Assigned sales reps (optional when not provided)
    users?: Array<{
        id: number;
        first_name: string;
        last_name: string;
    }>;
}

interface Props {
    route: DeliveryRoute;
}

export default function ShowRoute({ route }: Props) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleToggleStatus = () => {
        if (confirm(`Are you sure you want to ${route.is_active ? 'deactivate' : 'activate'} this route?`)) {
            router.patch(`/deliveries/routes/${route.id}/status`, {}, {
                onSuccess: () => {
                    // Refresh the page to show updated status
                    window.location.reload();
                }
            });
        }
    };


    return (
        <AppLayout breadcrumbs={[
            { title: 'Delivery Routes', href: '/deliveries/routes' },
            { title: route.name, href: `/deliveries/routes/${route.id}` }
        ]}>
            <Head title={route.name} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <Link
                                    href="/deliveries/routes"
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {route.name}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        Route Details
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={`/deliveries/routes/${route.id}/edit`}
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Edit className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Edit Route</span>
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
                                            <Truck className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">Route Information</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <Tag className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">Route Name</p>
                                                    <p className="font-medium text-slate-800">{route.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Calendar className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">Created</p>
                                                    <p className="font-medium text-slate-800">{formatDate(route.created_at)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Calendar className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">Last Updated</p>
                                                    <p className="font-medium text-slate-800">{formatDate(route.updated_at)}</p>
                                                </div>
                                            </div>

                                            {/* Assigned Sales Reps */}
                                            {route.users && route.users.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-sm text-slate-500">Assigned Sales Reps</p>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {route.users.map((u: any) => (
                                                            <span key={u.id} className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 text-xs px-2 py-1 rounded-full">
                                                                <svg className="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-3-3.87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path><path d="M4 21v-2a4 4 0 0 1 3-3.87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path><circle cx="12" cy="7" r="4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></circle></svg>
                                                                {u.first_name} {u.last_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${route.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                <div>
                                                    <p className="text-sm text-slate-500">Status</p>
                                                    <p className={`font-medium ${route.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                                        {route.is_active ? 'Active' : 'Inactive'}
                                                    </p>
                                                </div>
                                            </div>
                                            {route.description && (
                                                <div className="flex items-start space-x-3">
                                                    <Eye className="w-4 h-4 text-vismass-blue mt-1" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">Description</p>
                                                        <p className="font-medium text-slate-800">{route.description}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Areas Covered */}
                                {route.areas && route.areas.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <MapPin className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">Service Areas</h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {route.areas.map((area: string, index: number) => (
                                                <div key={index} className="flex items-center space-x-2 bg-blue-50 text-blue-700 border border-blue-100 text-sm px-3 py-2 rounded-lg">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{area}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions Sidebar */}
                            <div className="space-y-6">
                                {/* Status Card */}
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <ToggleRight className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">Status Control</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Current Status</span>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${route.is_active
                                                    ? 'bg-green-100 text-green-800 border-green-200'
                                                    : 'bg-red-100 text-red-800 border-red-200'
                                                }`}>
                                                {route.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <Button
                                            onClick={handleToggleStatus}
                                            className={`w-full inline-flex items-center justify-center space-x-2 ${route.is_active
                                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                                } px-4 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium`}
                                        >
                                            {route.is_active ? (
                                                <>
                                                    <ToggleRight className="w-4 h-4" />
                                                    <span>Deactivate Route</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ToggleLeft className="w-4 h-4" />
                                                    <span>Activate Route</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Actions Card */}
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Actions</h2>
                                    <div className="space-y-3">
                                        <Link
                                            href={`/deliveries/routes/${route.id}/edit`}
                                            className="w-full bg-vismass-blue hover:bg-vismass-blue/90 text-white px-4 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium inline-flex items-center justify-center space-x-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            <span>Edit Route</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-12 text-slate-600">
                            <p className="text-sm">Route details • Part of your delivery network</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
