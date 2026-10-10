import { Plus, ArrowLeft } from 'lucide-react';
import { t } from '@/lib/i18n';
import { Link } from '@inertiajs/react';

interface PurchaseHeaderProps {
    breadcrumbs: Array<{ title: string; href: string }>;
}

export default function PurchaseHeader({ breadcrumbs }: PurchaseHeaderProps) {
    return (
        <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow-lg">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-6">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/pos/purchases"
                            className="rounded-xl bg-white/20 p-3 hover:bg-white/30 transition-all duration-200"
                        >
                            <ArrowLeft className="h-5 w-5 text-white" />
                        </Link>
                        <div className="rounded-xl bg-white/20 p-3 shadow-lg">
                            <Plus className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {t('GRN Entry')}
                            </h1>
                            <p className="text-sm text-white/80">
                                {t('Create new Goods Received Note entries')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}