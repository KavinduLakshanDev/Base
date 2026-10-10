// resources/js/types/index.ts
import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User & ExtendedUser;
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
    [key: string]: unknown;
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
    section_code?: string;
    AdrTypKy?: number;
    customer_type?: string;
    section?: {
        name: string;
        section_code: string;
    };
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
// Additional user properties from your existing code
export interface ExtendedUser extends User {
    first_name: string;
    last_name: string;
    phone: string;
    user_type: string;
    section_code: string;
    role_id: number;
    is_active: boolean;
    is_verified: boolean;
    role?: {
        id: number;
        slug: string;
        name: string;
        permissions?: Array<{ id: number; slug: string; name: string }>;
    };
}

export interface Customer {
    AccKy: number;
    AccCd: string;
    AccNm: string;
    CurBal: number;
    CrLmt: number;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
}

export interface Technician {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
}

export interface ServiceCharge {
    id: number;
    charge_code: string;
    charge_name: string;
    description: string | null;
    amount: number | string;
    charge_type: string;
    is_active: boolean;
}

export interface ServiceJob {
    id: number;
    uuid: string;
    job_number: string;
    invoice_number: string | null;
    invoice_date: string | null;
    AccKy: number | null;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    customer_address: string | null;
    device_name: string;
    device_model: string | null;
    device_brand: string | null;
    device_serial: string | null;
    device_barcode: string | null;
    device_warranty: string | null;
    problem_description: string;
    condition_received: string | null;
    received_date: string;
    estimated_completion_date: string | null;
    actual_completion_date: string | null;
    delivered_date: string | null;
    assigned_technician_id: number | null;
    technician_name: string | null;
    status: string;
    total_service_charge: number | string;
    total_parts_cost: number | string;
    total_amount: number | string;
    paid_amount: number | string;
    balance_amount: number | string;
    advanced_payment: number | string;
    technician_notes: string | null;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    technician?: Technician;
    items?: ServiceJobItem[];
    statusHistory?: (ServiceJobStatus & { changedBy?: { first_name: string; last_name: string } })[];
    payments?: CustomerPayment[];
}

export interface ServiceJobItem {
    id: number;
    service_job_id: number;
    item_type: string;
    ItmKy: string | null;
    item_code: string | null;
    item_name: string;
    batch_no?: string | null;
    barcode: string | null;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    total_price: number;
    description: string | null;
}

export interface ServiceJobStatus {
    id: number;
    service_job_id: number;
    status: string;
    notes: string | null;
    changed_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface PageProps {
    auth: {
        user: User & ExtendedUser;
    };
    [key: string]: unknown;
}

// Additional interfaces for POS system
export interface Product {
    ItmKy: number;
    ItemCode: string;
    BarCode?: string;
    ItmNm: string;
    EnglishName?: string;
    CosPri?: number;
    SlsPri?: number;
    ReOrdlLvl?: number;
    Status?: string;
    VATItem?: boolean;
    fInAct?: boolean;
    catkey?: string;
    SupKey?: number;
    UnitKy?: number;
    NCostPrice?: number;
    ExtraPrice?: number;
    WholePrice?: number;
    ScallItem?: boolean;
}

export interface SupplierOption {
    AdrKy: number;
    AccKy: any;
    full_name: any;
    FstNm: any;
    id: number;
    name: string;
}

export interface ItemMaster {
    ItmKy: string;
    ItemCode: string;
    ItmNm: string;
    BarCode: string;
    EnglishName: string;
    SlsPri: string | number;
    Unit: string;
}

// For service job forms
export interface ServiceJobFormItem {
    item_type: 'part' | 'service_charge' | 'other';
    ItmKy?: string;
    item_code?: string;
    item_name: string;
    barcode?: string;
    quantity: number;
    unit_price: number;
    description?: string | null;
}

// Status type for type safety
export type ServiceJobStatusType = 
    | 'pending'
    | 'assigned'
    | 'in_progress'
    | 'waiting_for_parts'
    | 'completed'
    | 'delivered'
    | 'cancelled';

// For status filter
export interface ServiceJobFilters {
    search?: string;
    status?: string;
    technician_id?: number;
    start_date?: string;
    end_date?: string;
}

// Pagination response
export interface PaginatedResponse<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
    };
}

// For API responses
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

// For reorder levels
export interface ReorderLevel {
    id: number;
    item_code: string;
    branch_code: string;
    reorder_level: number;
    created_at: string;
    updated_at: string;
}

// Log entries recording changes to a branch-specific reorder level
export interface ReorderLevelLog {
    id: number;
    reorder_level_id?: number;
    company_code: string;
    section_code: string;
    item_code: string;
    old_level?: number;
    new_level?: number;
    action: 'created' | 'updated' | 'deleted';
    changed_by?: number;
    created_at: string;
    user?: { id: number; name: string };
}

export interface CustomerPayment {
    id: number;
    customer_id: number;
    customer_code?: string;
    service_job_id?: number;
    amount: number;
    date: string;
    method: string;
    cheque_no?: string;
    bank_name?: string;
    card_last_4?: string;
    card_auth_code?: string;
    reference?: string;
    notes?: string;
    status: string;
    created_at: string;
    updated_at: string;
}

// For barcode generation
export interface BarcodeData {
    item_code: string;
    item_name: string;
    barcode: string;
    price?: number;
}

// For dashboard stats
export interface DashboardStats {
    total_jobs: number;
    pending_jobs: number;
    completed_jobs: number;
    revenue_today: number;
    revenue_this_month: number;
    top_technicians: Array<{
        id: number;
        name: string;
        completed_jobs: number;
        avg_completion_time: number;
    }>;
    recent_jobs: ServiceJob[];
}