<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Support\Str;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Bank account management permission
            ['name' => 'View Bank Accounts', 'slug' => 'bank_accounts.view', 'description' => 'Can view bank accounts'],
            ['name' => 'Create Bank Accounts', 'slug' => 'bank_accounts.create', 'description' => 'Can create new bank accounts'],
            ['name' => 'Edit Bank Accounts', 'slug' => 'bank_accounts.edit', 'description' => 'Can edit existing bank accounts'],
            ['name' => 'Delete Bank Accounts', 'slug' => 'bank_accounts.delete', 'description' => 'Can delete bank accounts'],

            // Account Management 
            ['name' => 'View Finance Accounts', 'slug' => 'finance_accounts.view', 'description' => 'Can view finance accounts'],
            ['name' => 'Create Finance Accounts', 'slug' => 'finance_accounts.create', 'description' => 'Can create new finance accounts'],
            ['name' => 'Edit Finance Accounts', 'slug' => 'finance_accounts.edit', 'description' => 'Can edit existing finance accounts'],
            ['name' => 'Delete Finance Accounts', 'slug' => 'finance_accounts.delete', 'description' => 'Can delete finance accounts'],

            //Expences
            // ['name' => 'View Expense Accounts', 'slug' => 'expense_accounts.view', 'description' => 'Can view expense accounts'],
            // ['name' => 'Create Expense Accounts', 'slug' => 'expense_accounts.create', 'description' => 'Can create new expense accounts'],
            // ['name' => 'Edit Expense Accounts', 'slug' => 'expense_accounts.edit', 'description' => 'Can edit existing expense accounts'],
            // ['name' => 'Delete Expense Accounts', 'slug' => 'expense_accounts.delete', 'description' => 'Can delete expense accounts'],

            // Finance Voucher 
            ['name' => 'View Finance Vouchers', 'slug' => 'finance_vouchers.view', 'description' => 'Can view finance vouchers'],
            ['name' => 'Create Finance Vouchers', 'slug' => 'finance_vouchers.create', 'description' => 'Can create new finance vouchers'],
            // ['name' => 'Edit Finance Vouchers', 'slug' => 'finance_vouchers.edit', 'description' => 'Can edit existing finance vouchers'],
            // ['name' => 'Delete Finance Vouchers', 'slug' => 'finance_vouchers.delete', 'description' => 'Can delete finance vouchers'],

            // Finance Withdrawal
            ['name' => 'View Finance Withdrawals', 'slug' => 'finance_withdrawals.view', 'description' => 'Can view finance withdrawals'],
            ['name' => 'Create Finance Withdrawals', 'slug' => 'finance_withdrawals.create', 'description' => 'Can create new finance withdrawals'],
            // ['name' => 'Edit Finance Withdrawals', 'slug' => 'finance_withdrawals.edit', 'description' => 'Can edit existing finance withdrawals'],
            // ['name' => 'Delete Finance Withdrawals', 'slug' => 'finance_withdrawals.delete', 'description' => 'Can delete finance withdrawals'],

            // Finance Deposit
            ['name' => 'View Finance Deposits', 'slug' => 'finance_deposits.view', 'description' => 'Can view finance deposits'],
            ['name' => 'Create Finance Deposits', 'slug' => 'finance_deposits.create', 'description' => 'Can create new finance deposits'],
            // ['name' => 'Edit Finance Deposits', 'slug' => 'finance_deposits.edit', 'description' => 'Can edit existing finance deposits'],
            // ['name' => 'Delete Finance Deposits', 'slug' => 'finance_deposits.delete', 'description' => 'Can delete finance deposits'],

            // Finance Transfer
            ['name' => 'View Finance Transfers', 'slug' => 'finance_transfers.view', 'description' => 'Can view finance transfers'],
            ['name' => 'Create Finance Transfers', 'slug' => 'finance_transfers.create', 'description' => 'Can create new finance transfers'],
            // ['name' => 'Edit Finance Transfers', 'slug' => 'finance_transfers.edit', 'description' => 'Can edit existing finance transfers'],
            // ['name' => 'Delete Finance Transfers', 'slug' => 'finance_transfers.delete', 'description' => 'Can delete finance transfers'],

            // Customers management
            ['name' => 'View Customers', 'slug' => 'customers.view', 'description' => 'Can view customers'],
            ['name' => 'Create Customers', 'slug' => 'customers.create', 'description' => 'Can create new customers'],
            ['name' => 'Edit Customers', 'slug' => 'customers.edit', 'description' => 'Can edit existing customers'],
            ['name' => 'Delete Customers', 'slug' => 'customers.delete', 'description' => 'Can delete customers'],

            // Customer Payments
            ['name' => 'Create Customer Payments', 'slug' => 'customer_payments.create', 'description' => 'Can record customer payments'],
            ['name' => 'View Customer Payments', 'slug' => 'customer_payments.view', 'description' => 'Can view customer payment history'],

            // Day opening balances (cashier/shift start data)
            // ['name' => 'Manage Day Opening Balances', 'slug' => 'day_opening_balances.manage', 'description' => 'Manage day opening balances'],
            ['name' => 'View Day Opening Balances', 'slug' => 'day_opening_balances.view', 'description' => 'Can view day opening balances'],
            ['name' => 'Create Day Opening Balances', 'slug' => 'day_opening_balances.create', 'description' => 'Can create day opening balances'],
            ['name' => 'Edit Day Opening Balances', 'slug' => 'day_opening_balances.edit', 'description' => 'Can edit day opening balances'],
            ['name' => 'Delete Day Opening Balances', 'slug' => 'day_opening_balances.delete', 'description' => 'Can delete day opening balances'],

            // Petty cash management
            ['name' => 'View Petty Cash', 'slug' => 'petty_cash.view', 'description' => 'Can view petty cash categories and transactions'],
            ['name' => 'Create Petty Cash', 'slug' => 'petty_cash.create', 'description' => 'Can create new petty cash categories and transactions'],
            ['name' => 'Edit Petty Cash', 'slug' => 'petty_cash.edit', 'description' => 'Can edit existing petty cash categories'],
            ['name' => 'Delete Petty Cash', 'slug' => 'petty_cash.delete', 'description' => 'Can delete petty cash categories and transactions'],

            // Delivery Petty cash management
            ['name' => 'View Delivery Petty Cash', 'slug' => 'delivery_petty_cash.view', 'description' => 'Can view delivery petty cash categories and transactions'],
            ['name' => 'Create Delivery Petty Cash', 'slug' => 'delivery_petty_cash.create', 'description' => 'Can create new delivery petty cash categories and transactions'],
            ['name' => 'Edit Delivery Petty Cash', 'slug' => 'delivery_petty_cash.edit', 'description' => 'Can edit existing delivery petty cash categories'],
            ['name' => 'Delete Delivery Petty Cash', 'slug' => 'delivery_petty_cash.delete', 'description' => 'Can delete delivery petty cash categories and transactions'],

            //Privilage user management
            ['name' => 'Manage Privilege Users', 'slug' => 'privilege_users.view', 'description' => 'Can view privilege users and cards'],
            ['name' => 'Create Privilege Users', 'slug' => 'privilege_users.create', 'description' => 'Can create privilege users and cards'],
            ['name' => 'Edit Privilege Users', 'slug' => 'privilege_users.edit', 'description' => 'Can edit privilege users and cards'],
            ['name' => 'Manage Privilege User', 'slug' => 'privilege_users.manage', 'description' => 'Can manage privilege users generation and redemption'],
            ['name' => 'Access Sale System', 'slug' => 'sale.access', 'description' => 'Can access the Sale system'],

            //Supplier Payment Management
            ['name' => 'Create Supplier Payments', 'slug' => 'supplier_payments.create', 'description' => 'Can record supplier payments'],
            ['name' => 'View Supplier Payments', 'slug' => 'supplier_payments.view', 'description' => 'Can view supplier payment history'],
            ['name' => 'Edit Supplier Payments', 'slug' => 'supplier_payments.edit', 'description' => 'Can edit supplier payments'],
            ['name' => 'Delete Supplier Payments', 'slug' => 'supplier_payments.delete', 'description' => 'Can delete supplier payments'],
            ['name' => 'Deduct Bank Balance', 'slug' => 'supplier_payments.deduct_bank_balance', 'description' => 'Can deduct amounts from bank accounts during supplier payments'],
            ['name' => 'Create Supplier Returns', 'slug' => 'supplier_returns.create', 'description' => 'Can create supplier returns'],

            //Brand Management
            ['name' => 'View Brands', 'slug' => 'brands.view', 'description' => 'Can view product brands'],
            ['name' => 'Manage Brands', 'slug' => 'brands.manage', 'description' => 'Can manage product brands'],

            // Category Management
            ['name' => 'View Categories', 'slug' => 'categories.view', 'description' => 'Can view product categories'],
            ['name' => 'Manage Categories', 'slug' => 'categories.manage', 'description' => 'Can manage product categories'],

            //Cheque Return Management
            ['name' => 'View Cheque Returns', 'slug' => 'cheque_returns.view', 'description' => 'Can view cheque returns'],
            ['name' => 'Create Cheque Returns', 'slug' => 'cheque_returns.create', 'description' => 'Can create cheque return records'],

            // Cheque Deposit Management
            ['name' => 'View Cheque Deposits', 'slug' => 'cheque_deposits.view', 'description' => 'Can view cheque deposits'],
            ['name' => 'Create Cheque Deposits', 'slug' => 'cheque_deposits.create', 'description' => 'Can create cheque deposit records'],

            // Model Management
            ['name' => 'View Models', 'slug' => 'models.view', 'description' => 'Can view product models'],
            ['name' => 'Manage Models', 'slug' => 'models.manage', 'description' => 'Can manage product models'],

            //Product Management
            ['name' => 'View Products', 'slug' => 'products.view', 'description' => 'Can view products'],
            ['name' => 'Create Products', 'slug' => 'products.create', 'description' => 'Can create new products'],
            ['name' => 'Edit Products', 'slug' => 'products.edit', 'description' => 'Can edit existing products'],
            ['name' => 'Delete Products', 'slug' => 'products.delete', 'description' => 'Can delete products'],

            //Purchasing Management
            ['name' => 'View Purchases', 'slug' => 'purchases.view', 'description' => 'Can view purchase history'],
            ['name' => 'Create Purchases', 'slug' => 'purchases.create', 'description' => 'Can create new purchases'],

            // Unit Management
            ['name' => 'View Units', 'slug' => 'units.view', 'description' => 'Can view product units'],
            ['name' => 'Manage Units', 'slug' => 'units.manage', 'description' => 'Can manage product units'],

             
            // Reports
            ['name' => 'View Cash Collection Report', 'slug' => 'reports.cash_collection', 'description' => 'Can view cash collection reports'],
            ['name' => 'View Cash Reconciliation Reports', 'slug' => 'reports.cash_reconciliation', 'description' => 'Can view cash reconciliation reports'],
            ['name' => 'View Petty Cash Analysis Report', 'slug' => 'reports.petty_cash_analysis', 'description' => 'Can view petty cash analysis reports'],
            ['name' => 'View Collection Report', 'slug' => 'reports.collection', 'description' => 'Can view collection reports'],
            ['name' => 'View Delivery Collection Report', 'slug' => 'reports.delivery_collection', 'description' => 'Can view delivery collection reports'],
            ['name' => 'View Delivery Graph Analysis Report', 'slug' => 'reports.delivery_graph_analysis', 'description' => 'Can view delivery graph analysis reports'],
            ['name' => 'View Delivery Item Movement Report', 'slug' => 'reports.delivery_item_movement', 'description' => 'Can view delivery item movement reports'],
            ['name' => 'View Delivery Outstanding Aging Report', 'slug' => 'reports.delivery_outstanding_aging', 'description' => 'Can view delivery outstanding aging reports'],
            ['name' => 'View Delivery Profit Report', 'slug' => 'reports.delivery_profit', 'description' => 'Can view delivery profit reports'],
            ['name' => 'View Profit Report', 'slug' => 'reports.profit', 'description' => 'Can view general profit report'],
            ['name' => 'View Purchase Order Report', 'slug' => 'reports.purchase_orders', 'description' => 'Can view purchase order reports'],
            ['name' => 'View Delivery Sales Report', 'slug' => 'reports.delivery_sales', 'description' => 'Can view delivery sales reports'],
            ['name' => 'View Delivery Summary Report', 'slug' => 'reports.delivery_summary', 'description' => 'Can view delivery summary reports'],
            ['name' => 'View Item List Report', 'slug' => 'reports.item_list', 'description' => 'Can view item list report'],
            ['name' => 'View Printer Stock Bin Card', 'slug' => 'reports.printing.stock.bin.view', 'description' => 'Can view printer stock bin card'],
            ['name' => 'View Printer Stock Report', 'slug' => 'reports.printing.stock', 'description' => 'Can view printer stock report'],
            ['name' => 'View Sales Reports', 'slug' => 'reports.sales', 'description' => 'Can view sales reports'],
            ['name' => 'View Service Revenue Report', 'slug' => 'reports.service_revenue', 'description' => 'Can view service revenue reports'],
            ['name' => 'View Service Jobs Report', 'slug' => 'reports.service_jobs', 'description' => 'Can view service jobs reports'],
            ['name' => 'View Service Charges Report', 'slug' => 'reports.service_charges', 'description' => 'Can view service charges reports'],
            ['name' => 'View Stock In Hand', 'slug' => 'reports.stock_in_hand', 'description' => 'Can view stock in hand report'],
            ['name' => 'View Stock Movement Report', 'slug' => 'reports.stock_movement', 'description' => 'Can view stock movement reports'],
            ['name' => 'View Vehicle Stock Report', 'slug' => 'reports.vehicle_stock', 'description' => 'Can view vehicle stock report'],
            ['name' => 'View Wastage Report', 'slug' => 'reports.wastage', 'description' => 'Can view wastage reports'],

            // Item wastage management
            ['name' => 'View Wastage Records', 'slug' => 'wastages.view', 'description' => 'Can view wastage records'],
            ['name' => 'Create Wastage Records', 'slug' => 'wastages.create', 'description' => 'Can create wastage records'],
            ['name' => 'Edit Wastage Records', 'slug' => 'wastages.edit', 'description' => 'Can edit wastage records'],
            ['name' => 'Delete Wastage Records', 'slug' => 'wastages.delete', 'description' => 'Can delete wastage records'],
            ['name' => 'Search Wastage Products', 'slug' => 'wastages.search', 'description' => 'Can search products when recording wastage'],

            // Stock Adjustment Management
            ['name' => 'View Stock Adjustments', 'slug' => 'stock_adjustments.view', 'description' => 'Can view stock adjustment records'],
            ['name' => 'Create Stock Adjustments', 'slug' => 'stock_adjustments.create', 'description' => 'Can create new stock adjustments'],
            ['name' => 'Approve Stock Adjustments', 'slug' => 'stock_adjustments.approve', 'description' => 'Can approve or reject pending stock adjustments'],

            ['name' => 'View Delivery Report', 'slug' => 'reports.deliveries', 'description' => 'Can view delivery reports'],
            ['name' => 'View Customer History', 'slug' => 'reports.customer_history', 'description' => 'Can view customer ledgers and details'],
            ['name' => 'View Customer Outstandings Report', 'slug' => 'reports.customer_outstandings', 'description' => 'Can view customer outstandings reports'],
            ['name' => 'View Supplier History', 'slug' => 'reports.supplier_history', 'description' => 'Can view supplier ledgers and details'],

            //customer return management
            ['name' => 'View Customer Returns', 'slug' => 'customer_returns.view', 'description' => 'Can view customer returns'],
            ['name' => 'Create Customer Returns', 'slug' => 'customer_returns.create', 'description' => 'Can create customer returns'],


            //Dashboard
            ['name' => 'View Dashboard', 'slug' => 'dashboard.view', 'description' => 'Can view dashboard and stats'],


             // Deliveries (Malibo)
            ['name' => 'View Deliveries', 'slug' => 'deliveries.view', 'description' => 'Can view deliveries'],
            ['name' => 'Create Deliveries', 'slug' => 'deliveries.create', 'description' => 'Can create new deliveries'],
            ['name' => 'Edit Deliveries', 'slug' => 'deliveries.edit', 'description' => 'Can edit existing deliveries'],
            ['name' => 'Delete Deliveries', 'slug' => 'deliveries.delete', 'description' => 'Can delete deliveries'],
            ['name' => 'Update Delivery Status', 'slug' => 'deliveries.update_status', 'description' => 'Can update delivery status'],

             
            //Delivery Payment
            ['name' => 'Record Delivery Payments', 'slug' => 'deliveries.payments.create', 'description' => 'Can record payments against deliveries'],
            ['name' => 'Delete Delivery Payments', 'slug' => 'deliveries.payments.delete', 'description' => 'Can delete delivery payment records'],

            // Delivery Routes (Specific)
            ['name' => 'View Delivery Routes', 'slug' => 'delivery_routes.view', 'description' => 'Can view delivery routes'],
            ['name' => 'Create Delivery Routes', 'slug' => 'delivery_routes.create', 'description' => 'Can create new delivery routes'],
            ['name' => 'Edit Delivery Routes', 'slug' => 'delivery_routes.edit', 'description' => 'Can edit delivery routes'],
            ['name' => 'Delete Delivery Routes', 'slug' => 'delivery_routes.delete', 'description' => 'Can delete delivery routes'],

             // Permissions Management
            ['name' => 'View Permissions', 'slug' => 'permissions.view', 'description' => 'Can view permissions'],
            ['name' => 'Create Permissions', 'slug' => 'permissions.create', 'description' => 'Can create new permissions'],
            ['name' => 'Edit Permissions', 'slug' => 'permissions.edit', 'description' => 'Can edit existing permissions'],
            ['name' => 'Delete Permissions', 'slug' => 'permissions.delete', 'description' => 'Can delete permissions'],

            //Printer Transfer
            ['name' => 'View Printer Transfers', 'slug' => 'printing.transfers.view', 'description' => 'Can view printer transfers'],
            ['name' => 'Create Printer Transfers', 'slug' => 'printing.transfers.create', 'description' => 'Can create printer transfers'],

            // Printing Operations
            ['name' => 'View Printer Stock', 'slug' => 'printing.stock.view', 'description' => 'Can view printer stock'],

            // Printer wastage management
            ['name' => 'View Printer Wastage', 'slug' => 'printing.wastage.view', 'description' => 'Can view printer wastage records'],
            ['name' => 'Create Printer Wastage', 'slug' => 'printing.wastage.create', 'description' => 'Can create or delete printer wastage records'],
            ['name' => 'Delete Printer Wastage', 'slug' => 'printing.wastage.delete', 'description' => 'Can delete printer wastage records'],
            ['name' => 'Search Printers for Wastage', 'slug' => 'printing.wastage.search', 'description' => 'Can search printers when creating wastage records'], 

            // Reorder levels management
            ['name' => 'Manage Reorder Levels', 'slug' => 'reorder_levels.manage', 'description' => 'Can view/create/edit/delete reorder levels'],
            ['name' => 'View Reorder Levels', 'slug' => 'reorder_levels.view', 'description' => 'Can view reorder levels'],
            ['name' => 'Create Reorder Levels', 'slug' => 'reorder_levels.create', 'description' => 'Can create reorder levels'],
            ['name' => 'Edit Reorder Levels', 'slug' => 'reorder_levels.edit', 'description' => 'Can edit reorder levels'],
            ['name' => 'Delete Reorder Levels', 'slug' => 'reorder_levels.delete', 'description' => 'Can delete reorder levels'],

            // Roles & Permissions
            ['name' => 'View Roles', 'slug' => 'roles.view', 'description' => 'Can view roles'],
            ['name' => 'Create Roles', 'slug' => 'roles.create', 'description' => 'Can create new roles'],
            ['name' => 'Edit Roles', 'slug' => 'roles.edit', 'description' => 'Can edit existing roles'],
            ['name' => 'Delete Roles', 'slug' => 'roles.delete', 'description' => 'Can delete roles'],

            //Route Shop Assign
            ['name' => 'Assign Shops to Routes', 'slug' => 'routes.assign_shops', 'description' => 'Can attach/detach shops to routes'],

            // Sales
            ['name' => 'View Sales', 'slug' => 'sales.view', 'description' => 'Can view sales history'],
            ['name' => 'Create Sales', 'slug' => 'sales.create', 'description' => 'Can create new sales'],
            ['name' => 'Edit Sales', 'slug' => 'sales.edit', 'description' => 'Can edit existing sales'],
           
            //Sections
            ['name' => 'View Sections', 'slug' => 'sections.view', 'description' => 'Can view sections'],
            ['name' => 'Create Sections', 'slug' => 'sections.create', 'description' => 'Can create sections'],
            ['name' => 'Edit Sections', 'slug' => 'sections.edit', 'description' => 'Can edit sections'],
           
            // Service Jobs
            ['name' => 'View Service Jobs', 'slug' => 'service_jobs.view', 'description' => 'Can view service jobs'],
            ['name' => 'Create Service Jobs', 'slug' => 'service_jobs.create', 'description' => 'Can create new service jobs'],
            ['name' => 'Edit Service Jobs', 'slug' => 'service_jobs.edit', 'description' => 'Can edit/update service jobs'],
            ['name' => 'Delete Service Jobs', 'slug' => 'service_jobs.delete', 'description' => 'Can delete service jobs'],

            //Quotations
            ['name' => 'View Quotations', 'slug' => 'quotations.view', 'description' => 'Can view quotations'],
            ['name' => 'Create Quotations', 'slug' => 'quotations.create', 'description' => 'Can create new quotations'],
            ['name' => 'Edit Quotations', 'slug' => 'quotations.edit', 'description' => 'Can edit existing quotations'],
           
            //Shops
            ['name' => 'View Shops', 'slug' => 'shops.view', 'description' => 'Can view shops'],
            ['name' => 'Create Shops', 'slug' => 'shops.create', 'description' => 'Can create shops'],
            ['name' => 'Manage Shops', 'slug' => 'shops.edit', 'description' => 'Can create/update/delete shops'],

            //Shop Returns
            ['name' => 'Manage Shop Returns', 'slug' => 'shop_returns.create', 'description' => 'Can record and manage shop returns'],
            ['name' => 'Process Sales Returns', 'slug' => 'sales.returns', 'description' => 'Can process sales returns'],

            //Stock Conversion
            ['name' => 'View Stock Conversions', 'slug' => 'stock.conversions.view', 'description' => 'Can view stock conversions'],
            ['name' => 'Create Stock Conversions', 'slug' => 'stock.conversions.create', 'description' => 'Can create stock conversions'],

            //Stock Transfer
            ['name' => 'View Stock Transfers', 'slug' => 'stock.transfers.view', 'description' => 'Can view stock transfers'],
            ['name' => 'Create Stock Transfers', 'slug' => 'stock.transfers.create', 'description' => 'Can create stock transfers'],
            ['name' => 'Cross-Company Stock Transfer', 'slug' => 'stock.cross_company_transfer', 'description' => 'Can transfer stock between sections belonging to different companies'],

            // Suppliers
            ['name' => 'View Suppliers', 'slug' => 'suppliers.view', 'description' => 'Can view suppliers'],
            ['name' => 'Create Suppliers', 'slug' => 'suppliers.create', 'description' => 'Can create new suppliers'],
            ['name' => 'Edit Suppliers', 'slug' => 'suppliers.edit', 'description' => 'Can edit existing suppliers'],
            ['name' => 'Toggle Supplier Status', 'slug' => 'suppliers.toggle_status', 'description' => 'Can toggle supplier status'],

            // Vat Rate
            ['name' => 'Manage VAT Rates', 'slug' => 'vat_rates.manage', 'description' => 'Can manage VAT rates'],

            // Vehicles 
            ['name' => 'View Vehicles', 'slug' => 'vehicles.view', 'description' => 'Can view delivery vehicles'],
            ['name' => 'Create Vehicles', 'slug' => 'vehicles.create', 'description' => 'Can create delivery vehicles'],
            ['name' => 'Edit Vehicles', 'slug' => 'vehicles.edit', 'description' => 'Can edit delivery vehicles'],
            ['name' => 'Delete Vehicles', 'slug' => 'vehicles.delete', 'description' => 'Can delete delivery vehicles'],

            // Vehicle Stock
            ['name' => 'View Vehicle Stock', 'slug' => 'vehicle_stock.view', 'description' => 'Can view vehicle stock levels'],
            ['name' => 'Manage Vehicle Stock', 'slug' => 'vehicle_stock.manage', 'description' => 'Can load/unload vehicle stock'],

            // General Stock Permissions (used by multiple modules)
            ['name' => 'View Stock', 'slug' => 'stock.view', 'description' => 'Can view stock in hand across sections'],
            ['name' => 'Transfer Stock to Vehicles', 'slug' => 'stock.transfer', 'description' => 'Can load/unload stock to/from vehicles'],
             

        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['slug' => $permission['slug']],
                [
                    'name' => $permission['name'],
                    'description' => $permission['description'],
                    'uuid' => (string) Str::uuid(),
                ]
            );
        }

        // Assign Permissions to Roles
        // $this->assignCashierPermissions();
        // $this->assignTechnicianPermissions();
        // $this->assignSalesRepPermissions();
        // $this->assignCompanyAdminPermissions();
        // $this->assignStockManagerPermissions();
        // $this->assignServiceManagerPermissions();

        // Assign the same sets to the company-specific role instances so that
        // Vismass and Malibo start with sensible defaults.  Admins can then
        // customise each company's role independently via the Edit Role UI.
        // $this->assignCompanySpecificPermissions();
    }

    private function assignCashierPermissions()
    {
        $role = Role::where('slug', 'cashier')->first();
        if ($role) {
            $permissions = Permission::whereIn('slug', $this->getCashierPermissionSlugs())->get();
            $role->permissions()->sync($permissions->pluck('id'));
        }
    }

    private function assignTechnicianPermissions()
    {
        $role = Role::where('slug', 'technician')->first();
        if ($role) {
            $permissions = Permission::whereIn('slug', $this->getTechnicianPermissionSlugs())->get();
            $role->permissions()->syncWithoutDetaching($permissions->pluck('id'));
        }
    }

    private function assignSalesRepPermissions()
    {
        $role = Role::where('slug', 'sales_rep')->first();
        if ($role) {
            $permissions = Permission::whereIn('slug', $this->getSalesRepPermissionSlugs())->get();
            $role->permissions()->sync($permissions->pluck('id'));
        }
    }

    private function assignCompanyAdminPermissions()
    {
        $role = Role::where('slug', 'company_admin')->first();
        if ($role) {
            // company admins get every permission; application logic will
            // enforce company scoping where appropriate
            $permissions = Permission::all()->pluck('id');
            $role->permissions()->sync($permissions);
        }
    }

    private function assignStockManagerPermissions()
    {
        $role = Role::where('slug', 'stock_manager')->first();
        if ($role) {
            $permissions = Permission::whereIn('slug', $this->getStockManagerPermissionSlugs())->get();
            $role->permissions()->sync($permissions->pluck('id'));
        }
    }

    private function assignServiceManagerPermissions()
    {
        $role = Role::where('slug', 'service_manager')->first();
        if ($role) {
            $permissions = Permission::whereIn('slug', $this->getServiceManagerPermissionSlugs())->get();
            $role->permissions()->sync($permissions->pluck('id'));
        }
    }

    /**
     * Mirror permissions to the company-specific role instances created by
     * RoleSeeder.  Each company's role starts with the same permissions as its
     * global counterpart but can be customised independently afterwards.
     */
    private function assignCompanySpecificPermissions(): void
    {
        $allPermissions = Permission::all()->pluck('id');

        // Company admins (get all permissions, scoped to their company at runtime)
        foreach (['vis001_company_admin', 'mal001_company_admin'] as $slug) {
            $role = Role::where('slug', $slug)->first();
            if ($role) {
                $role->permissions()->sync($allPermissions);
            }
        }

        // Vismass Cashier – same starting permissions as the global 'cashier'
        $globalCashierPermissions = $this->getCashierPermissionSlugs();
        $visCashier = Role::where('slug', 'vis001_cashier')->first();
        if ($visCashier) {
            $ids = Permission::whereIn('slug', $globalCashierPermissions)->get()->pluck('id');
            $visCashier->permissions()->sync($ids);
        }

        // Malibo Cashier – starts the same; admin can later customise
        $malCashier = Role::where('slug', 'mal001_cashier')->first();
        if ($malCashier) {
            $ids = Permission::whereIn('slug', $globalCashierPermissions)->get()->pluck('id');
            $malCashier->permissions()->sync($ids);
        }

        // Vismass Technician
        $globalTechPermissions = $this->getTechnicianPermissionSlugs();
        $visTech = Role::where('slug', 'vis001_technician')->first();
        if ($visTech) {
            $ids = Permission::whereIn('slug', $globalTechPermissions)->get()->pluck('id');
            $visTech->permissions()->sync($ids);
        }

        // Malibo Sales Rep
        $globalSalesRepPermissions = $this->getSalesRepPermissionSlugs();
        $malSalesRep = Role::where('slug', 'mal001_sales_rep')->first();
        if ($malSalesRep) {
            $ids = Permission::whereIn('slug', $globalSalesRepPermissions)->get()->pluck('id');
            $malSalesRep->permissions()->sync($ids);
        }

        // Vismass Stock Manager
        $globalStockManagerPermissions = $this->getStockManagerPermissionSlugs();
        $visStockManager = Role::where('slug', 'vis001_stock_manager')->first();
        if ($visStockManager) {
            $ids = Permission::whereIn('slug', $globalStockManagerPermissions)->get()->pluck('id');
            $visStockManager->permissions()->sync($ids);
        }

        // Malibo Stock Manager
        $malStockManager = Role::where('slug', 'mal001_stock_manager')->first();
        if ($malStockManager) {
            $ids = Permission::whereIn('slug', $globalStockManagerPermissions)->get()->pluck('id');
            $malStockManager->permissions()->sync($ids);
        }

        // Vismass Service Manager
        $globalServiceManagerPermissions = $this->getServiceManagerPermissionSlugs();
        $visServiceManager = Role::where('slug', 'vis001_service_manager')->first();
        if ($visServiceManager) {
            $ids = Permission::whereIn('slug', $globalServiceManagerPermissions)->get()->pluck('id');
            $visServiceManager->permissions()->sync($ids);
        }

        // Malibo Service Manager
        $malServiceManager = Role::where('slug', 'mal001_service_manager')->first();
        if ($malServiceManager) {
            $ids = Permission::whereIn('slug', $globalServiceManagerPermissions)->get()->pluck('id');
            $malServiceManager->permissions()->sync($ids);
        }
    }

    // ─── Extracted slug lists so they can be reused without duplication ──────

    private function getCashierPermissionSlugs(): array
    {
        return [
            'sale.access', 'sales.create', 'sales.view', 'sales.returns',
            'customers.create', 'customers.view', 'stock.view',
            'stock.transfers.view', 'stock.transfers.create',
            'stock_adjustments.view', 'stock_adjustments.create',
            'customer_payments.create', 'customer_payments.view',
            'cheque_returns.create', 'cheque_returns.view',
            'cheque_deposits.create', 'cheque_deposits.view',
            'quotations.view', 'service_jobs.create', 'service_jobs.view',
            'service_jobs.edit', 'day_opening_balances.manage',
            'reports.cash_reconciliation',
            'petty_cash.view', 'petty_cash.create',
            'reports.petty_cash_analysis',
            'day_opening_balances.view', 'day_opening_balances.create',
            'day_opening_balances.edit', 'day_opening_balances.delete',
            'deliveries.view', 'deliveries.create', 'deliveries.edit',
            'deliveries.delete', 'deliveries.update_status',
            'deliveries.payments.create', 'deliveries.payments.delete',
            'dashboard.view',
        ];
    }

    private function getTechnicianPermissionSlugs(): array
    {
        return [
            'service_jobs.view', 'service_jobs.edit', 'service_jobs.assign',
            'quotations.view', 'quotations.create', 'quotations.edit',
            'products.view', 'stock.view',
            'printing.stock.view', 'printing.transfers.view',
            'dashboard.view',
        ];
    }

    private function getSalesRepPermissionSlugs(): array
    {
        return [
            'sales.view', 'sales.create', 'quotations.view', 'quotations.create',
            'quotations.edit', 'sale.access', 'customers.view', 'customers.create',
            'customers.edit', 'products.view', 'stock.view', 'stock.transfer',
            'stock.transfers.view', 'stock.transfers.create',
            'stock.cross_company_transfer', 'vehicle_stock.view', 'vehicle_stock.manage',
            'customer_payments.create', 'customer_payments.view', 'sales.returns',
            'supplier_payments.create', 'supplier_payments.view', 'supplier_payments.deduct_bank_balance',
            'reports.sales', 'reports.stock', 'reports.stock_in_hand',
            'reports.bin_card', 'reports.customer_history',
            'categories.view', 'brands.view', 'models.view', 'units.view',
            'shops.view', 'shops.manage', 'shops.create',
            'vehicles.view', 'vehicles.create', 'vehicles.edit',
            'vehicle_stock.create', 'vehicle_stock.edit',
            'deliveries.view', 'deliveries.create', 'deliveries.edit',
            'deliveries.update_status', 'deliveries.payments.create',
            'deliveries.payments.delete', 'delivery_routes.view',
            'dashboard.view',
        ];
    }

    private function getStockManagerPermissionSlugs(): array
    {
        return [
            'stock.view',
            'stock.transfers.view', 'stock.transfers.create',
            'stock_adjustments.view', 'stock_adjustments.create', 'stock_adjustments.approve',
            'stock.conversions.view', 'stock.conversions.create',
            'reorder_levels.view', 'reorder_levels.create', 'reorder_levels.manage',
            'wastages.view', 'wastages.create', 'wastages.edit', 'wastages.delete',
            'reports.stock_in_hand', 'reports.stock_movement', 'reports.item_list',
            'dashboard.view',
        ];
    }

    private function getServiceManagerPermissionSlugs(): array
    {
        return [
            'service_jobs.view', 'service_jobs.create', 'service_jobs.edit', 'service_jobs.delete', 'service_jobs.assign',
            'quotations.view', 'quotations.create', 'quotations.edit',
            'reports.service_revenue', 'reports.service_jobs', 'reports.service_charges',
            'customers.view', 'customers.create', 'customers.edit',
            'products.view', 'stock.view',
            'dashboard.view',
        ];
    }
}
