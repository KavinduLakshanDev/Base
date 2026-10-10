// resources/js/layouts/AuthenticatedLayout.tsx
import React, { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { User } from '@/types';

export interface AuthenticatedLayoutProps {
    children: ReactNode;
    user: User;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ children, user }) => {
    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link href="/dashboard" className="text-xl font-bold text-gray-800">
                                    Service Management
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="ml-3 relative">
                                <div className="flex items-center space-x-4">
                                    <span className="text-gray-700">{user?.name || `${user.first_name} ${user.last_name}`}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main>{children}</main>
        </div>
    );
};

export default AuthenticatedLayout;