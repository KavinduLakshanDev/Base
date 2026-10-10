import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import FlashMessages from '@/components/flash-messages';
import { Toaster } from '@/components/ui/sonner';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ShieldOff } from 'lucide-react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { auth } = usePage().props as any;
    const isImpersonating = auth?.impersonating;
    const impersonator = auth?.impersonator;

    const handleLeaveImpersonation = () => {
        router.post('/impersonate/leave');
    };

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {isImpersonating && impersonator && (
                    <div className="mx-4 mt-2 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <ShieldOff className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">
                                You are impersonating <strong>{impersonator.name}</strong>
                            </span>
                        </div>
                        <button
                            onClick={handleLeaveImpersonation}
                            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
                        >
                            Leave Impersonation
                        </button>
                    </div>
                )}
                <FlashMessages />
                {children}
            </AppContent>
            <Toaster position="top-right" />
        </AppShell>
    );
}