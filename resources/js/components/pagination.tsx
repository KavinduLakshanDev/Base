import { router } from '@inertiajs/react';
import { t } from '@/lib/i18n';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    to: number;
    total: number;
    per_page?: number;
}

interface PaginationProps {
    links: PaginationLink[];
    meta?: PaginationMeta;
    preserveScroll?: boolean;
    preserveState?: boolean;
}

export default function Pagination({
    links,
    meta,
    preserveScroll = true,
    preserveState = true
}: PaginationProps) {
    // If no links (e.g. only 1 page and Laravel doesn't return links, or empty data), generally we don't render.
    // But Laravel usually returns links even for single page if using distinct paginator, or at least the array.
    if (!links || links.length === 0) return null;

    // Optional: Hide if only 1 page ? Laravel's `links` usually includes Previous/Next even if disabled.
    // If there is only 1 page, typically we might want to hide it, but sometimes showing "Showing 1 to X of X" is useful.
    // The previous implementation showed it if `links.length > 0`.

    return (
        // pagination should not appear on printed reports
        <div className="no-print border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {meta && (
                    <div className="text-sm text-gray-500">
                        {t('Showing')}{' '}
                        <span className="font-medium">{meta.from || 0}</span>{' '}
                        {t('to')}{' '}
                        <span className="font-medium">{meta.to || 0}</span>{' '}
                        {t('of')}{' '}
                        <span className="font-medium">{meta.total || 0}</span>{' '}
                        {t('results')}
                    </div>
                )}

                <div className="flex flex-wrap gap-1 justify-center">
                    {links.map((link, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (link.url) {
                                    router.visit(link.url, {
                                        preserveScroll,
                                        preserveState,
                                    });
                                }
                            }}
                            disabled={!link.url || link.active}
                            className={`relative inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${link.active
                                    ? 'z-10 bg-vismass-blue text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vismass-blue'
                                    : !link.url
                                        ? 'text-gray-300 cursor-not-allowed bg-white border border-gray-200'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                }`}
                            dangerouslySetInnerHTML={{
                                __html: link.label,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
