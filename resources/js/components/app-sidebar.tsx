import { useEffect, useRef } from 'react';
import { NavFooter } from '@/components/nav-footer';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { BookOpen, FileText, Layers, Users, Package, Ruler, Truck, Route, User, Box, Shield, Key, ShoppingCart, Receipt, ArrowRightLeft, Wrench, Printer as PrinterIcon, Plus, History, DollarSign, UserCheck, Gift, ScrollText, Tag, AlertTriangle, Trash2, RefreshCw, Building2, TrendingUp, BarChart3, Car, Store, Undo2, Calculator, ArrowLeftRight, Wallet, ChevronRight, LayoutGrid, ClipboardList } from 'lucide-react';
import { type SharedData } from '@/types';
import { resolveUrl } from '@/lib/utils';
import AppLogo from './app-logo';

// Helper to check roles/permissions for items
interface RoleNavItem extends NavItem {
    roles?: string[];         // role-slug fallback for structural items
    permission?: string;      // permission slug (primary gate — checked first)
}

// Section 1: Company & Users
const companyNavItems: RoleNavItem[] = [
    {
        title: 'Dashboard',
        href: '/company/dashboard',
        icon: LayoutGrid,
        permission: 'dashboard.view',
    },
    {
        title: 'Company Profile',
        href: '/company/profile',
        icon: BookOpen,
        roles: ['company_admin'],
    },
     {
        title: 'User Management',
        href: '/user-management',
        icon: Users,
        roles: ['company_admin'],
    },
    {
        title: 'User Roles',
        href: '/roles',
        icon: Shield,
        permission: 'permissions.view',
    },
    {
        title: 'User Permissions',
        href: '/permissions',
        icon: Key,
        permission: 'permissions.view',
    },
    // {
    //     title: 'Sales Rep Dashboard',
    //     href: '/dashboard/sales-rep',
    //     icon: LayoutGrid,
    //     roles: ['sales_rep'],
    // },

];

// Section 2: Customer Management
const customerManagementNavItems: RoleNavItem[] = [
    {
        title: 'Customers',
        href: '/admin/customers',
        icon: User,
        permission: 'customers.view',
    },
    {
        title: 'Privilege Users',
        href: '/admin/privilege-users',
        icon: UserCheck,
        permission: 'privilege_users.view',
    },
    {
        title: 'Customer Payments',
        href: '/admin/customer-payments',
        icon: DollarSign,
        permission: 'customer_payments.view',
    }
];

// Section 3: Supplier Management
const supplierManagementNavItems: RoleNavItem[] = [
    {
        title: 'Suppliers',
        href: '/suppliers',
        icon: Truck,
        permission: 'suppliers.view',
    },
    {
        title: 'Purchase Orders',
        href: '/pos/purchase-orders',
        icon: ShoppingCart,
        permission: 'purchases.view',
    },
    {
        title: 'Purchases',
        href: '/pos/purchases',
        icon: ShoppingCart,
        permission: 'purchases.view',
    },
    {
        title: 'Purchase Returns',
        href: '/supplier-returns',
        icon: AlertTriangle,
        permission: 'supplier_returns.create',
    },
    {
        title: 'Supplier Payments',
        href: '/admin/supplier-payments',
        icon: DollarSign,
        permission: 'supplier_payments.view',
    },
];

// Section 4: Products & Sales
const productsNavItems: RoleNavItem[] = [
    {
        title: 'Categories',
        href: '/pos/categories',
        icon: Package,
        permission: 'categories.view',
    },
    {
        title: 'Brands',
        href: '/pos/brands',
        icon: Tag,
        permission: 'brands.view',
    },
    {
        title: 'Units',
        href: '/pos/units',
        icon: Ruler,
        permission: 'units.view',
    },
    {
        title: 'Products - Others',
        href: '/pos/products',
        icon: Box,
        permission: 'products.view',
    },
    {
        title: 'Products - Printers',
        href: '/pos/printers',
        icon: PrinterIcon,
        permission: 'printers.view',
    },
    {
        title: 'Printer Models',
        href: '/pos/models',
        icon: Tag,
        permission: 'models.view',
    },
    {
        title: 'Product Reorder Levels',
        href: '/pos/reorder-levels',
        icon: TrendingUp,
        permission: 'reorder_levels.view',
    }
];

// Section 5: Invoicing & Sales
const invoicingSalesNavItems: RoleNavItem[] = [
   {
        title: 'Sales - Invoicing',
        href: '/sales',
        icon: Receipt,
        permission: 'sale.access',
    },
    {
        title: 'Sales - Returns',
        href: '/customer-returns',
        icon: Undo2,
        permission: 'customer_returns.view',
    },

];

// Section 6: Sales Report
const salesReportsNavItems: RoleNavItem[] = [
    {
        title: 'Sales Report',
        href: '/reports/sales',
        icon: FileText,
        permission: 'reports.sales',
    },
    {
        title: 'Sale Items Report',
        href: '/reports/sale-items',
        icon: FileText,
        permission: 'reports.sales',
    },
    {
        title: 'Item-Wise Sales Report',
        href: '/reports/item-wise-sales',
        icon: FileText,
        permission: 'reports.sales',
    },
];

// Section 7: Printer & Stock Transfer
const printerStockNavItems: RoleNavItem[] = [
    {
        title: 'Stock Sections',
        href: '/sections',
        icon: Layers,
        roles: ['company_admin'],
    },
    {
        title: 'Stock Transfer - Products',
        href: '/stock-transfers',
        icon: ArrowRightLeft,
        permission: 'stock.transfers.view',
    },
    {
        title: 'Stock Transfer - Printers',
        href: '/printer-transfers',
        icon: PrinterIcon,
        permission: 'printing.transfers.view',
    },
    {
        title: 'Stock Conversion',
        href: '/stock-conversions',
        icon: RefreshCw,
        permission: 'stock.conversions.view',
    },
    {
        title: 'Wastage - Products',
        href: '/wastages',
        icon: AlertTriangle,
        permission: 'wastages.view',
    },
    {
        title: 'Wastage - Printers',
        href: '/printer-wastages',
        icon: AlertTriangle,
        permission: 'wastages.view',
    },
    {
        title: 'Printer Stock Details',
        href: '/pos/printing-section-products',
        icon: PrinterIcon,
        permission: 'printing.stock.view',
    },
    {
        title: 'Stock Adjustment',
        href: '/stock-adjustments',
        icon: ArrowLeftRight,
        permission: 'stock_adjustments.view',
    },
   
];
const stockReportsNavItems: RoleNavItem[] = [
    {
        title: 'Stock In Hand Report',
        href: '/reports/stock-in-hand',
        icon: FileText,
        permission: 'reports.stock_in_hand',
    },
    {
        title: 'Stock Taking',
        href: '/stock-takings',
        icon: ClipboardList,
        permission: 'stock_adjustments.view',
    },
    // {
    //     title: 'Printer Stock In Hand',
    //     href: '/reports/printer-stock',
    //     icon: FileText,
    //     permission: 'reports.printing.stock',
    // },
    {
        title: 'Stock Bin Card',
        href: '/reports/stock-bin-card',
        icon: FileText,
        permission: 'reports.stock_movement',
    },
    // {
    //     title: ' Printers Stock Bin Card',
    //     href: '/reports/printer-stock-bin-card',
    //     icon: FileText,
    //     permission: 'reports.printing.stock.bin.view',
    // },
    {
        title: 'Item List Report',
        href: '/reports/item-list',
        icon: FileText,
        permission: 'reports.item_list',
    },
];

// Section 4: Payments
const paymentsNavItems: RoleNavItem[] = [
   
];

// Section 5: Finance
const financeNavItems: RoleNavItem[] = [
    {
        title: 'Finance Accounts',
        href: '/admin/finance-accounts',
        icon: Building2,
        permission: 'bank_accounts.view',
    },
    // {
    //     title: 'Expense Accounts',
    //     href: '/admin/expense-accounts',
    //     icon: Receipt,
    //     permission: 'expense_accounts.view',
    // },
    {
        title: 'Finance Voucher',
        href: '/admin/finance-transfers',
        icon: Receipt,
        permission: 'finance_transfers.view',
    },
    {
        title: 'Day Opening Balances',
        href: '/admin/day-opening-balances',
        icon: DollarSign,
        permission: 'day_opening_balances.view',
    },
     {
        title: 'Cheque Return',
        href: '/pos/cheque-return',
        icon: RefreshCw,
        permission: 'cheque_returns.view',
    },
    {
        title: 'Cheque Deposit',
        href: '/pos/cheque-deposit',
        icon: Plus,
        permission: 'cheque_deposits.view',
    },
    {
        title: 'Cheque Ledger',
        href: '/pos/cheque-ledger',
        icon: ScrollText,
        permission: 'cheque_deposits.view',
    },
    // {
    //     title: 'Petty Cash Categories',
    //     href: '/admin/petty-cash-categories',
    //     icon: Receipt,
    //     permission: 'petty_cash.view',
    // },
    // {
    //     title: 'Petty Cash Transactions',
    //     href: '/admin/petty-cash-transactions',
    //     icon: DollarSign,
    //     permission: 'petty_cash.view',
    // },
    // {
    //     title: 'Delivery Petty Cash Categories',
    //     href: '/admin/delivery-petty-cash-categories',
    //     icon: Receipt,
    //     permission: 'delivery_petty_cash.view',
    // },
    // {
    //     title: 'Delivery Petty Cash Transactions',
    //     href: '/admin/delivery-petty-cash-transactions',
    //     icon: Truck,
    //     permission: 'delivery_petty_cash.view',
    // },
];

// Section 5: Service Jobs
const servicesNavItems: RoleNavItem[] = [
     {
        title: 'Create Service Job',
        href: '/service-jobs/create',
        icon: Plus,
        permission: 'service_jobs.create',
    },
     {
        title: 'Create Quotations',
        href: '/quotations',
        icon: ScrollText,
        permission: 'quotations.view',
    },
    {
        title: 'All Service Job List',
        href: '/service-jobs',
        icon: Wrench,
        permission: 'service_jobs.view',
    },
    {
        title: 'My Service Job List',
        href: '/service-jobs?filter=my_jobs',
        icon: User,
        permission: 'service_jobs.view',
    },
    {
        title: 'Job History',
        href: '/service-jobs/history',
        icon: History,
        permission: 'service_jobs.view',
    },
];

// Section 6: Deliveries
const deliveriesNavItems: RoleNavItem[] = [
    {
        title: 'Delivery Routes',
        href: '/deliveries/routes',
        icon: Route,
        permission: 'delivery_routes.view',
    },
    {
        title: 'Shops Registry',
        href: '/deliveries/shops',
        icon: Store,
        // roles: ['company_admin', 'sales_rep'],
        permission: 'shops.view',
    },
    // {
    //     title: 'Vehicles',
    //     href: '/deliveries/vehicles',
    //     icon: Car,
    //     permission: 'vehicles.view',
    // }
];

const deliveryInvoicingNavItems: RoleNavItem[] = [
    {
        title: 'Delivery - Sales Invocing',
        href: '/deliveries/delivery-sales/create',
        icon: ShoppingCart,
        permission: 'deliveries.view',
    },
    {
        title: 'Delivery - Sales Return',
        href: '/deliveries/returns',
        icon: Undo2,
        permission: 'deliveries.view',
    },
    {
        title: 'Delivery Invoice Manage',
        href: '/deliveries',
        icon: Truck,
        permission: 'deliveries.view',
    },
    {
        title: 'Delivery Sales history',
        href: '/deliveries/delivery-sales',
        icon: FileText,
        permission: 'deliveries.view',
    },
    {
        title: 'Delivery Payments',
        href: '/delivery-payments',
        icon: DollarSign,
        permission: 'deliveries.view',
    },
];
// Section 7: Reports – reorganised by domain (financial, delivery, stock, service, other)
const financialReportsNavItems: RoleNavItem[] = [
    {
        title: 'Customer Ledger Card',
        href: '/reports/customer-ledger',
        icon: FileText,
        permission: 'reports.customer_history',
    },
    {
        title: 'Customer Outstandings',
        href: '/reports/customer-outstandings',
        icon: FileText,
        permission: 'reports.customer_outstandings',
    },
    {
        title: 'Supplier Ledger Card',
        href: '/reports/supplier-ledger',
        icon: FileText,
        permission: 'reports.supplier_history',
    },
    {
        title: 'Purchase Orders',
        href: '/reports/purchase-orders',
        icon: FileText,
        permission: 'reports.purchase_orders',
    },
    {
        title: 'Collection Report',
        href: '/reports/collection-report',
        icon: DollarSign,
        permission: 'reports.collection',
    },
    {
        title: 'Cash Collection Report',
        href: '/reports/cash-collection-report',
        icon: DollarSign,
        permission: 'reports.cash_collection',
    },
    {
        title: 'Cash Reconciliation',
        href: '/reports/cash-reconciliation',
        icon: Calculator,
        permission: 'reports.cash_reconciliation',
    },
    {
        title: 'Petty Cash Analysis',
        href: '/reports/petty-cash-analysis',
        icon: Wallet,
        permission: 'reports.petty_cash_analysis',
    },
    {
        title: 'Profit Report',
        href: '/reports/profit-report',
        icon: TrendingUp,
        permission: 'reports.profit',
    },
    {
        title: 'Customer Details Report',
        href: '/reports/customer-details',
        icon: FileText,
        permission: 'reports.customer_history',
    },
    {
        title: 'Supplier Details Report',
        href: '/reports/supplier-details',
        icon: FileText,
        permission: 'reports.supplier_history',
    },
];

const deliveryReportsNavItems: RoleNavItem[] = [
    {
        title: 'Fast / Slow Items',
        href: '/reports/delivery-item-movement',
        icon: BarChart3,
        permission: 'reports.delivery_item_movement',
    },
    {
        title: 'Delivery Sales',
        href: '/reports/delivery-sales',
        icon: FileText,
        permission: 'reports.delivery_sales',
    },
    {
        title: 'Delivery Sale Items',
        href: '/reports/delivery-sale-items',
        icon: FileText,
        permission: 'reports.delivery_sales',
    },
    {
        title: 'Delivery Sale Invoices',
        href: '/reports/delivery-sale-invoices',
        icon: FileText,
        permission: 'reports.delivery_sales',
    },
    {
        title: 'Delivery Collections',
        href: '/reports/delivery-collections',
        icon: FileText,
        permission: 'reports.delivery_collection',
    },
    {
        title: 'Delivery Graph Analysis',
        href: '/reports/delivery-graph-analysis',
        icon: FileText,
        permission: 'reports.delivery_graph_analysis',
    },
    {
        title: 'Delivery Profit',
        href: '/reports/delivery-profit',
        icon: TrendingUp,
        permission: 'reports.delivery_profit',
    },
    {
        title: 'Delivery Outstanding (Aging)',
        href: '/reports/delivery-outstanding',
        icon: AlertTriangle,
        permission: 'reports.delivery_outstanding_aging',
    },
    // {
    //     title: 'Vehicle Stock Report',
    //     href: '/reports/vehicle-stock',
    //     icon: Car,
    //     permission: 'reports.vehicle_stock',
    // },
    {
        title: 'Shop Ledger Card',
        href: '/reports/shop-ledger',
        icon: FileText,
        permission: 'shops.view',
    },
];

const serviceReportsNavItems: RoleNavItem[] = [
    {
        title: 'Service Revenue Report',
        href: '/reports/service-revenue',
        icon: Wrench,
        permission: 'reports.service_revenue',
    },
    {
        title: 'Service Charges Report',
        href: '/reports/service-charges',
        icon: Wrench,
        permission: 'reports.service_charges',
    },
    {
        title: 'Service Jobs Report',
        href: '/reports/service-jobs-report',
        icon: Wrench,
        permission: 'reports.service_jobs',
    },
    {
        title: 'Service Jobs Reserved Items',
        href: '/reports/service-job-item-usage',
        icon: Wrench,
        permission: 'reports.service_jobs', // Assuming it shares the same permission or create a new one. For now, use reports.service_jobs
    },
    {
        title: 'Printer Service History',
        href: '/reports/device-service-history',
        icon: History,
        permission: 'reports.service_jobs',
    },
];



// Admin items (for super admin only)
const adminNavItems: RoleNavItem[] = [
    {
        title: 'Privilege Customer',
        href: '/admin/privilege-users',
        icon: UserCheck,
        permission: 'privilege_users.view',
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const page = usePage();
    const user = auth.user;

    const scrollStorageKey = 'app-sidebar-scroll';

    // keep sidebar scroll position when Inertia renders cause remount
    const contentRef = useRef<HTMLDivElement | null>(null);
    const scrollPos = useRef<number>(0);

    // restore after every navigation (url change)
    useEffect(() => {
        const el = contentRef.current;
        if (el) {
            el.scrollTop = scrollPos.current;
        }
    }, [page.url]);

    // restore on mount in case the sidebar remounts
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const saved = sessionStorage.getItem(scrollStorageKey);
        const savedPos = saved ? Number(saved) : 0;
        if (!Number.isNaN(savedPos) && savedPos > 0) {
            el.scrollTop = savedPos;
            scrollPos.current = savedPos;
        }
    }, []);

    // attach handler once
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const onScroll = () => {
            const pos = el.scrollTop;
            scrollPos.current = pos;
            sessionStorage.setItem(scrollStorageKey, String(pos));
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    // Determine user role and type
    const userType = user?.user_type as string | undefined;
    // role is eager-loaded with permissions by HandleInertiaRequests.
    // The ExtendedUser type already declares role.permissions after the recent update.
    const role = user?.role;
    const roleSlug = role?.slug as string | undefined;

    // Build a Set of permission slugs assigned to this user's role for O(1) lookups.
    // user.role.permissions is eager-loaded by HandleInertiaRequests.
    const userPermissions = new Set<string>(
        (role?.permissions ?? []).map((p) => p.slug)
    );

    /**
     * Determines whether a nav item should be visible.
     *
     * Priority:
     *  1. super_admin always sees everything.
     *  2. If the item declares a `permission` slug, visibility is driven solely
     *     by whether the logged-in user's role carries that permission.
     *     This means: assign the permission to a role → the nav item appears;
     *     remove it → the item disappears. Works per-company because each
     *     company's roles are separate records with their own permission sets.
     *  3. Items with no `permission` fall back to the `roles` array (structural
     *     admin items like Sections / User Management that don't need granular
     *     permission control).
     */
    const shouldShow = (item: RoleNavItem): boolean => {
        // Super admin and company admin always see everything
        if (userType === 'super_admin') return true;
        if (userType === 'company_admin') return true;
        if (roleSlug === 'company_admin' || roleSlug?.endsWith('_company_admin')) return true;

        // Permission-based gate (primary mechanism)
        if (item.permission) {
            return userPermissions.has(item.permission);
        }

        // Role-based fallback for structural items with no permission requirement
        if (!item.roles || item.roles.length === 0) return true;
        if (!roleSlug && !userType) return false;

        // Match both exact slug ('cashier') and company-prefixed slugs ('vis001_cashier')
        const roleMatches = item.roles.some(
            (r) => roleSlug === r || roleSlug?.endsWith('_' + r)
        );
        const typeMatches = !!(userType && item.roles.includes(userType));
        return roleMatches || typeMatches;
    };

    // Filter groups
    const filteredCompanyItems = companyNavItems.filter(shouldShow);
    const filteredcustomerManagementItems = customerManagementNavItems.filter(shouldShow);
    const filteredsupplierManagementItems = supplierManagementNavItems.filter(shouldShow);
    const filteredProductsItems = productsNavItems.filter(shouldShow);
    const filteredInvoicingSalesItems = invoicingSalesNavItems.filter(shouldShow);
    const filteredSalesReportsItems = salesReportsNavItems.filter(shouldShow);
    const filteredPrinterStockItems = printerStockNavItems.filter(shouldShow);
    const filteredStockReports = stockReportsNavItems.filter(shouldShow);
    const filteredPaymentsItems = paymentsNavItems.filter(shouldShow);
    const filteredFinanceItems = financeNavItems.filter(shouldShow);
    const filteredServicesItems = servicesNavItems.filter(shouldShow);
    const filteredDeliveriesItems = deliveriesNavItems.filter(shouldShow);
    const filteredDeliveryInvoicingItems = deliveryInvoicingNavItems.filter(shouldShow);
    const filteredFinancialReports = financialReportsNavItems.filter(shouldShow);
    const filteredDeliveryReports = deliveryReportsNavItems.filter(shouldShow);
    const filteredServiceReports = serviceReportsNavItems.filter(shouldShow);
    // const filteredAdminItems = adminNavItems.filter(shouldShow);

    return (
        <Sidebar className="no-print" collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard().url} prefetch>
                                <AppLogo companyCode={user?.company_code} />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent ref={contentRef}>
                {/* Section 1: Company & Users */}
                {filteredCompanyItems.length > 0 && (
                    <Collapsible defaultOpen={filteredCompanyItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Company & Users
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredCompanyItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}
                {/* Section 2: Customer Management */}
                {filteredcustomerManagementItems.length > 0 && (
                    <Collapsible defaultOpen={filteredcustomerManagementItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Customer Management
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredcustomerManagementItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}
                {/* Section 3: Supplier Management */}
                {filteredsupplierManagementItems.length > 0 && (
                    <Collapsible defaultOpen={filteredsupplierManagementItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Supplier Management
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredsupplierManagementItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}


                {/* Section 4: Products & Sales */}
                {filteredProductsItems.length > 0 && (
                    <Collapsible defaultOpen={filteredProductsItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Products & Sales
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredProductsItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 5: Invoicing & Sales */}
                {filteredInvoicingSalesItems.length > 0 && (
                    <Collapsible defaultOpen={filteredInvoicingSalesItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Invoicing & Sales
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredInvoicingSalesItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section : Sales Report */}
                {filteredSalesReportsItems.length > 0 && (
                    <Collapsible defaultOpen={filteredSalesReportsItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Sales Report
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredSalesReportsItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 3: Printer & Stock Transfer */}
                {filteredPrinterStockItems.length > 0 && (
                    <Collapsible defaultOpen={filteredPrinterStockItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Stock & Wastage
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredPrinterStockItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 8c: Stock Reports */}
                {filteredStockReports.length > 0 && (
                    <Collapsible defaultOpen={filteredStockReports.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Stock Reports
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredStockReports.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 6: Service Jobs */}
                {filteredServicesItems.length > 0 && (
                    <Collapsible defaultOpen={filteredServicesItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Service Jobs
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredServicesItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 8d: Service Reports */}
                {filteredServiceReports.length > 0 && (
                    <Collapsible defaultOpen={filteredServiceReports.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Service Reports
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredServiceReports.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 7: Deliveries */}
                {filteredDeliveriesItems.length > 0 && (
                    <Collapsible defaultOpen={filteredDeliveriesItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Delivery Setup
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredDeliveriesItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                 {/* Section 7: Deliveries */}
                {filteredDeliveryInvoicingItems.length > 0 && (
                    <Collapsible defaultOpen={filteredDeliveryInvoicingItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Delivery Invoicing
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredDeliveryInvoicingItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 8b: Delivery Reports */}
                {filteredDeliveryReports.length > 0 && (
                    <Collapsible defaultOpen={filteredDeliveryReports.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Delivery Reports
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredDeliveryReports.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                 {/* Section 5: Finance */}
                {filteredFinanceItems.length > 0 && (
                    <Collapsible defaultOpen={filteredFinanceItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Finance
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredFinanceItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 4: Payments */}
                {filteredPaymentsItems.length > 0 && (
                    <Collapsible defaultOpen={filteredPaymentsItems.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <CollapsibleTrigger className="flex w-full items-center">
                                    Payments
                                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarMenu>
                                    {filteredPaymentsItems.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={page.url.startsWith(resolveUrl(item.href))}
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href} prefetch>
                                                    {item.icon && <item.icon />}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                )}

                {/* Section 8a: Financial Reports */}
                {filteredFinancialReports.length > 0 && (
                    <Collapsible defaultOpen={filteredFinancialReports.some((item) => page.url.startsWith(resolveUrl(item.href)))} className="group/collapsible">
                    <SidebarGroup className="px-2 py-0">
                        <SidebarGroupLabel asChild className="text-black font-bold text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                            <CollapsibleTrigger className="flex w-full items-center">
                                Financial Reports
                                <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                            </CollapsibleTrigger>
                        </SidebarGroupLabel>
                        <CollapsibleContent>
                            <SidebarMenu>
                                {filteredFinancialReports.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={page.url.startsWith(resolveUrl(item.href))}
                                            tooltip={{ children: item.title }}
                                        >
                                            <Link href={item.href} prefetch>
                                                {item.icon && <item.icon />}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </CollapsibleContent>
                    </SidebarGroup>
                </Collapsible>
                )}
            </SidebarContent>

            <SidebarFooter>
                {userType === 'super_admin' && (
                    <div className="px-3 pb-1">
                        <button
                            onClick={() => router.post('/superadmin/clear-company')}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
                        >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            Switch Company
                            {(usePage<any>().props.selected_company) && (
                                <span className="ml-auto bg-white/20 rounded px-1.5 py-0.5 text-[10px]">
                                    {usePage<any>().props.selected_company}
                                </span>
                            )}
                        </button>
                    </div>
                )}
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
