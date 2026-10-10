import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t } from '@/lib/i18n';

interface Company {
    id: number;
    company_code: string;
    name: string;
}

interface Branch {
    id: number;
    company_code: string;
    section_code: string;
    name: string;
    is_main_stock: boolean;
}

interface UserContext {
    company_id: number | null;
    branch_id: number | null;
    is_super_admin: boolean;
    is_company_admin: boolean;
    is_branch_admin: boolean;
    is_staff_user: boolean;
}

interface CompanyBranchSelectorProps {
    companies: Company[];
    branches: Branch[];
    selectedCompany: number | null;
    selectedBranch: number | null;
    userContext: UserContext;
    onCompanyChange: (companyId: number) => void;
    onBranchChange: (branchId: number) => void;
}

export default function CompanyBranchSelector({
    companies,
    branches,
    selectedCompany,
    selectedBranch,
    userContext,
    onCompanyChange,
    onBranchChange,
}: CompanyBranchSelectorProps) {
    // Get available branches for selected company
    const availableBranches = selectedCompany
        ? branches.filter(branch => {
            const companyData = companies.find(c => c.id === selectedCompany);
            
            // Filter branches by company
            if (!companyData || branch.company_code !== companyData.company_code) {
                return false;
            }

            // For Malibu (MAL001), only show Main Delivery Stock (MAL-SEC-001) and Malibo Shop Stock (MAL-SEC-002)
            // if (companyData.company_code === 'MAL001') {
            //     return branch.section_code === 'MAL-SEC-001' || branch.section_code === 'MAL-SEC-002' || branch.section_code === 'MAL-SEC-003';
            // }

            // For other companies, show all branches
            return true;
        })
        : [];

    return (
        <>
            {/* Company Selector/Display */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 font-medium">
                    {t('Company')}
                </Label>
                {userContext?.is_super_admin ? (
                    <Select
                        value={selectedCompany?.toString()}
                        onValueChange={(val) => {
                            const id = parseInt(val);
                            onCompanyChange(id);
                        }}
                    >
                        <SelectTrigger className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
                            <SelectValue placeholder={t('Select Company')} />
                        </SelectTrigger>
                        <SelectContent>
                            {companies.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input
                        value={companies.find(c => c.id === selectedCompany)?.name || ''}
                        disabled
                        className="w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm font-medium"
                    />
                )}
            </div>

            {/* Branch Selector - Only show if branches are available */}
            {availableBranches.length > 0 && (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-700 font-medium">
                        {t('Branch')}
                    </Label>
                    <Select
                        value={selectedBranch?.toString()}
                        onValueChange={(val) => {
                            const id = parseInt(val);
                            onBranchChange(id);
                        }}
                    >
                        <SelectTrigger className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
                            <SelectValue placeholder={t('Select Branch')} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableBranches.map(branch => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                    {branch.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </>
    );
}