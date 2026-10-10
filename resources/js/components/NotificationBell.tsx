import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, ExternalLink } from 'lucide-react';
import { Link, router } from '@inertiajs/react';

interface NotificationData {
    adjustment_id: number;
    adjustment_number: string;
    batch_no: string;
    target_name: string;
    target_type: string;
    total_amount: number;
    items_count: number;
    recorded_by: string;
    message: string;
}

interface Notification {
    id: string;
    data: NotificationData;
    created_at: string;
}

let cachedNotifications: Notification[] = [];
let cachedUnreadCount = 0;
let lastFetchTime = 0;
let fetchPromise: Promise<void> | null = null;

export function NotificationBell({ light = false }: { light?: boolean }) {
    const [notifications, setNotifications] = useState<Notification[]>(cachedNotifications);
    const [unreadCount, setUnreadCount] = useState(cachedUnreadCount);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async (force = false) => {
        const now = Date.now();
        if (!force && now - lastFetchTime < 30000) {
            setNotifications(cachedNotifications);
            setUnreadCount(cachedUnreadCount);
            return;
        }

        if (!fetchPromise || force) {
            fetchPromise = fetch('/stock-adjustments/notifications')
                .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch'))
                .then(result => {
                    cachedNotifications = result.notifications;
                    cachedUnreadCount = result.unread_count;
                    lastFetchTime = Date.now();
                })
                .catch(error => {
                    console.error('Error fetching notifications:', error);
                })
                .finally(() => {
                    fetchPromise = null;
                });
        }

        await fetchPromise;
        if (document.visibilityState === 'visible') {
             setNotifications(cachedNotifications);
             setUnreadCount(cachedUnreadCount);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => fetchNotifications(), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (notificationId: string) => {
        try {
            await fetch('/stock-adjustments/notifications/read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ notification_id: notificationId }),
            });
            fetchNotifications(true);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 transition-colors rounded-lg ${
                    light
                        ? 'text-white/80 hover:text-white hover:bg-white/10'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[28rem] overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p>No pending approvals</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto max-h-[24rem] divide-y divide-slate-50">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className="p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notification.data.target_type === 'vehicle' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 font-medium leading-snug">
                                                {notification.data.message}
                                            </p>
                                            <div className="mt-1 flex items-center space-x-2 text-xs text-slate-500">
                                                <span>By: {notification.data.recorded_by}</span>
                                                <span>|</span>
                                                <span>{notification.data.items_count} items</span>
                                                <span>|</span>
                                                <span>Rs. {Number(notification.data.total_amount).toFixed(2)}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Target: {notification.data.target_name} ({notification.data.target_type})
                                            </p>
                                            <div className="flex items-center space-x-2 mt-2">
                                                <Link
                                                    href={`/stock-adjustments/${notification.data.adjustment_id}`}
                                                    className="inline-flex items-center text-xs bg-vismass-blue text-white px-3 py-1.5 rounded-lg hover:bg-vismass-blue/90 font-medium transition-colors"
                                                    onClick={() => markAsRead(notification.id)}
                                                >
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                    View & Approve
                                                </Link>
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                                >
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
