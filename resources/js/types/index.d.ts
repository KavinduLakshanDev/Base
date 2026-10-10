import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    company_code?: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Address {
    id: number;
    AdrKy: number;
    AdrCd: string;
    FstNm: string;
    Email?: string;
    TP1?: string;
    TP2?: string;
    TP3?: string;
    Address?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: any;
}

export interface Company {
    id: number;
    company_code: string;
    name: string;
    contact_person_name?: string;
    contact_person_number?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    logo?: string;
    primary_color?: string;
    secondary_color?: string;
    [key: string]: any;
}
