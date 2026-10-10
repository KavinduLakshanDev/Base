import { Head, router } from '@inertiajs/react';
import { Building2, LogIn, Power, PowerOff } from 'lucide-react';
import { useState } from 'react';

interface Company {
    company_code: string;
    name: string;
    is_active: boolean;
}

interface Props {
    companies: Company[];
    selected?: string | null;
}

export default function ChooseCompany({ companies, selected }: Props) {
    const [choosing, setChoosing] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    const handleSelect = (code: string) => {
        setChoosing(code);
        router.post('/superadmin/choose-company', { company_code: code });
    };

    const handleToggleStatus = (e: React.MouseEvent, code: string) => {
        e.stopPropagation();
        setToggling(code);
        router.post('/superadmin/toggle-company', { company_code: code }, {
            preserveScroll: true,
            onFinish: () => setToggling(null),
        });
    };

    return (
        <>
            <Head title="Select Company" />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Select Company</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            You are logged in as <strong>Super Admin</strong>.
                            <br />Choose which company to manage.
                        </p>
                    </div>

                    {/* Company cards */}
                    <div className="space-y-3">
                        {companies.map((company) => (
                            <div key={company.company_code} className="relative group">
                                <button
                                    onClick={() => handleSelect(company.company_code)}
                                    disabled={choosing !== null}
                                    className={`w-full flex items-center justify-between pl-5 pr-12 py-4 rounded-xl border-2 transition-all duration-200 text-left
                                        ${selected === company.company_code
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'}
                                        ${choosing === company.company_code ? 'opacity-70' : ''}
                                        ${!company.is_active ? 'opacity-50 grayscale' : ''}
                                        disabled:cursor-not-allowed`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${company.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {company.company_code.slice(0, 3)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                                                {company.name}
                                                {!company.is_active && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded uppercase tracking-wider">
                                                        Disabled
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-400">{company.company_code}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm font-medium ${company.is_active ? 'text-blue-600' : 'text-gray-500'}`}>
                                        {choosing === company.company_code ? (
                                            <span className="animate-pulse">Loading…</span>
                                        ) : (
                                            <>
                                                <LogIn className="w-4 h-4" />
                                                <span>Enter</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                                
                                {/* Quick action to toggle status */}
                                <button
                                    onClick={(e) => handleToggleStatus(e, company.company_code)}
                                    disabled={toggling === company.company_code}
                                    title={company.is_active ? "Disable Company" : "Enable Company"}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors
                                        ${company.is_active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-red-500 hover:text-green-600 hover:bg-green-50'}
                                        ${toggling === company.company_code ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}
                                    `}
                                >
                                    {company.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                </button>
                            </div>
                        ))}
                    </div>

                    {companies.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            No companies found.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
