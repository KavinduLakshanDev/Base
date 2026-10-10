import { Head, usePage, router } from '@inertiajs/react';
import axios from 'axios';
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { Edit2, Plus, Power, Users, Filter, Building, UserCheck, UserX, ArrowLeft, Link, ScanBarcode, RefreshCw} from 'lucide-react';
import Barcode from 'react-barcode';
import { toast } from 'sonner';

import { t } from '@/lib/i18n';

// Types
interface Role {
    id: number;
    name: string;
    slug: string;
    description: string;
    level: string;
    company_code: string | null;
    created_at: string;
    updated_at: string;
}

interface Section {
    id: number;
    company_code: string;
    section_code: string;
    delivery_section_code?: string | null;
    name: string;
    contact_person_name: string;
    contact_person_number: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    section_type: 'warehouse' | 'store' | 'office' | 'other';
    is_active: boolean;
    created_at: string;
    updated_at: string;
    company?: Company;
}

interface Company {
    id: number;
    company_code: string;
    name: string;
    email: string;
    is_active: boolean;
    current_users_count?: number;
    package_details?: {
        max_users: number;
    };
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    user_type: 'super_admin' | 'company_user';
    company_code: string | null;
    section_code: string | null;
    delivery_section_code: string | null;
    role_id: number;
    admin_barcode: string | null;
    admin_barcode_month: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    company?: Company;
    section?: Section;
    role?: Role;
}

interface UserFormData {
    username: string;
    email: string;
    password: string;
    password_confirmation: string;
    first_name: string;
    last_name: string;
    phone: string;
    section_codes: string[];
    delivery_section_code: string;
    role_id: string;
    is_active: boolean;
    company_code?: string;
}

interface PageProps {
    auth: {
        user: {
            id: number;
            user_type: string;
            company_code: string | null;
            section_code: string | null;
            role_id: number;
            role?: {
                level: string;
                name: string;
            };
            company?: Company;
        };
    };
    [key: string]: any;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'User Management',
        href: '#',
    },
];

const UserManagement: React.FC = () => {
    const { props } = usePage<PageProps>();
    const rawAuthUser = props.auth.user;

    // Normalize authUser to handle both User and Company models
    const authUser = useMemo(() => ({
        ...rawAuthUser,
        role_id: rawAuthUser.role_id || (rawAuthUser.company_code && !rawAuthUser.role_id ? 2 : 0), // Treat Company as Company Admin (role_id 2)
    }), [rawAuthUser]);

    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string>(() => {
        return localStorage.getItem('selectedCompany') || '';
    });
    const [selectedSection, setSelectedSection] = useState<string>(() => {
        return localStorage.getItem('selectedSection') || '';
    });
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [showForm, setShowForm] = useState<boolean>(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showImpersonateModal, setShowImpersonateModal] = useState<boolean>(false);
    const [userToImpersonate, setUserToImpersonate] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        first_name: '',
        last_name: '',
        phone: '',
        section_codes: [],
        delivery_section_code: '',
        role_id: '',
        is_active: true,
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [barcodeHistory, setBarcodeHistory] = useState<any[]>([]);
    const [regeneratingBarcode, setRegeneratingBarcode] = useState<boolean>(false);
    const [showBarcodeHistory, setShowBarcodeHistory] = useState<boolean>(false);
    const [manualBarcode, setManualBarcode] = useState<string>('');
    const [savingBarcode, setSavingBarcode] = useState<boolean>(false);

    // Check if user can create users based on role_id
    const canCreateUsers = (): boolean => {
        if (!authUser) return false;
        
        // Super Admin
        if (authUser.user_type === 'super_admin' || authUser.role_id === 1) return true;
        
        // Company Admin (by type or role level)
        if (authUser.user_type === 'company_admin' || authUser.role?.level === 'company_admin') return true;

        // Other roles with creation permissions (if any specific logic needed)
        const roleLevel = authUser.role?.level;
        if (roleLevel === 'distributor' || roleLevel === 'cashier') return true;

        return false;
    };

    // Get available roles based on user's role_id
    const getAvailableRoles = (): Role[] => {
        if (!authUser) return [];
        
        // Super Admin (role_id = 1) - can assign all roles
        if (authUser.role_id === 1) {
            return roles;
        }

        // Company Level Roles (Company Admin, Distributor, Cashier)
        if (authUser.user_type === 'company_admin' || 
            ['company_admin', 'distributor', 'cashier'].includes(authUser.role?.level || '')) {
            return roles.filter((role) => {
                // Hide Super Admin role
                if (role.slug === 'super_admin' || role.level === 'super_admin') return false;
                
                // Show roles belonging to their company or system-wide non-super-admin roles
                return role.company_code === authUser.company_code || role.company_code === null;
            });
        }

        return roles.filter(role => role.id !== 1); // Fallback: show everything but super admin
    };

    // Get user's allowed role levels for display
    const getAllowedRoleLevels = (): string => {
        const availableRoles = getAvailableRoles();

        if (availableRoles.length === 0) return 'No available roles';

        const roleNames = availableRoles.map((role) => role.name);

        return roleNames.join(', ');
    };

    // Get available sections for the current user
    const getAvailableSections = (): Section[] => {
        if (!authUser) return [];
        // Super Admin (role_id = 1) - can see all sections
        if (authUser.role_id === 1) {
            return sections;
        }

        // Company Level Roles (Admin, Distributor, Cashier)
        if (authUser.user_type === 'company_admin' || 
            ['company_admin', 'distributor', 'cashier'].includes(authUser.role?.level || '')) {
            return sections.filter(
                (section) => section.company_code === authUser.company_code,
            );
        }

        // Section User - can only see their own section
        if (authUser.section_code) {
            return sections.filter(
                (section) => section.section_code === authUser.section_code,
            );
        }

        return [];
    };

    // Get filterable roles for dropdown
    const getFilterableRoles = (): Role[] => {
        if (authUser.role_id === 1) {
            return roles;
        }
        return getAvailableRoles();
    };

    // Get filterable sections for dropdown
    const getFilterableSections = (): Section[] => {
        if (authUser.role_id === 1) {
            if (selectedCompany) {
                return sections.filter(
                    (section) => section.company_code === selectedCompany,
                );
            }
            return []; // Don't show sections until a company is selected for Super Admin
        }

        return getAvailableSections();
    };

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchSections();
        if (authUser.role_id === 1) {
            // Only Super Admin can see companies
            fetchCompanies();
        }
    }, []);

    useEffect(() => {
        let filtered: User[] = [];

        // Super Admin: show users only if any filter is selected
        if (authUser.role_id === 1) {
            if (selectedCompany || selectedSection || selectedRole) {
                filtered = users;
                if (selectedCompany) {
                    filtered = filtered.filter(
                        (user) => user.company_code === selectedCompany,
                    );
                }
                if (selectedSection) {
                    filtered = filtered.filter(
                        (user) => user.section_code === selectedSection,
                    );
                }
                if (selectedRole) {
                    filtered = filtered.filter(
                        (user) => user.role_id?.toString() === selectedRole,
                    );
                }
            }
        }

        // Company Level Roles: show all users in their company
        else if (authUser.user_type === 'company_admin' || 
                 ['company_admin', 'distributor', 'cashier'].includes(authUser.role?.level || '')) {
            filtered = users.filter(
                (user) => user.company_code === authUser.company_code
            );

            // Only filter by section if explicitly selected by user
            if (selectedSection) {
                filtered = filtered.filter(
                    (user) => user.section_code === selectedSection,
                );
            }

            if (selectedRole) {
                filtered = filtered.filter(
                    (user) => user.role_id?.toString() === selectedRole,
                );
            }
        }

        // Section User: can only see their own section users
        else if (authUser.section_code) {
            filtered = users.filter(
                (user) => user.section_code === authUser.section_code,
            );

            if (selectedRole) {
                filtered = filtered.filter(
                    (user) => user.role_id?.toString() === selectedRole,
                );
            }
        }

        setFilteredUsers(filtered);
    }, [
        selectedCompany,
        selectedSection,
        selectedRole,
        users,
        authUser.role_id,
        authUser.company_code,
        authUser.section_code,
    ]);

    // Auto-select based on user role
    useEffect(() => {
        if (authUser.role_id === 2 && authUser.company_code) {
            setSelectedCompany(authUser.company_code);
        }
        // For Distributors and Cashiers, don't auto-select section
        // They should see all users in their company by default
    }, [authUser, selectedCompany, selectedSection]);

    // Save selections to localStorage
    useEffect(() => {
        if (selectedCompany) {
            localStorage.setItem('selectedCompany', selectedCompany);
        } else {
            localStorage.removeItem('selectedCompany');
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedSection) {
            localStorage.setItem('selectedSection', selectedSection);
        } else {
            localStorage.removeItem('selectedSection');
        }
    }, [selectedSection]);

    const fetchUsers = async (): Promise<void> => {
        try {
            const response = await axios.get<User[]>('/api/users');
            setUsers(response.data);
            setFilteredUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
        }
    };

    const fetchCompanies = async (): Promise<void> => {
        try {
            const response = await axios.get<Company[]>('/api/companies');
            setCompanies(response.data);
        } catch (error) {
            toast.error('Failed to fetch companies');
        }
    };

    const fetchRoles = async (): Promise<void> => {
        try {
            const response = await axios.get<Role[]>('/api/user-roles');
            setRoles(response.data);
        } catch (error: any) {
            console.error('Error fetching roles:', error);
            setRoles([]);
        }
    };

    const fetchSections = async (
        companyId?: number | string,
    ): Promise<void> => {
        try {
            const url = '/api/sections'; // Assuming you have an endpoint for sections
            // If you don't have a direct endpoint, you might need to adjust this
            // For now, let's assume /api/sections returns all sections or filtered by user context

            const response = await axios.get(url);
            setSections(response.data);
        } catch (error) {
            console.error('Error fetching sections:', error);
            setSections([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoading(true);

        if (
            !formData.first_name ||
            !formData.last_name ||
            !formData.username ||
            !formData.email ||
            !formData.section_codes.length ||
            !formData.role_id
        ) {
            const missingFields = [];
            if (!formData.first_name) missingFields.push('First Name');
            if (!formData.last_name) missingFields.push('Last Name');
            if (!formData.username) missingFields.push('Username');
            if (!formData.email) missingFields.push('Email');
            if (!formData.section_codes.length)
                missingFields.push(
                    'Section (please select at least one section from dropdown)',
                );
            if (!formData.role_id) missingFields.push('Role');

            toast.error(
                `Please fill all required fields: ${missingFields.join(', ')}`,
            );
            setLoading(false);
            return;
        }

        // Phone number validation: must be exactly 10 digits, only numbers
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            toast.error('Phone number must be exactly 10 digits.');
            setLoading(false);
            return;
        }
        try {
            // Prepare submit data
            const submitData: any = {
                username: formData.username.trim(),
                email: formData.email.trim(),
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                phone: formData.phone ? formData.phone.trim() : '',
                company_code: formData.company_code,
                section_code: formData.section_codes[0] || '',
                delivery_section_code: formData.delivery_section_code || null,
                role_id: parseInt(formData.role_id),
                is_active: formData.is_active,
            };

            // Handle company assignment based on user role
            if (authUser.role_id === 1) {
                // Super Admin
                if (formData.company_code) {
                    submitData.company_code = formData.company_code;
                    submitData.user_type = 'company_user';
                } else {
                    submitData.user_type = 'super_admin';
                    submitData.company_code = null;
                    submitData.section_code = null;
                    submitData.delivery_section_code = null;
                }
            } else {
                // Company Admin
                submitData.user_type = 'company_user';
                submitData.company_code = authUser.company_code;
            }

            let response;
            if (editingUser) {
                response = await axios.put(
                    `/api/users/${editingUser.id}`,
                    submitData,
                );
                toast.success('User updated successfully!');
            } else {
                // New user creation requires password
                if (!formData.password) {
                    toast.error('Password is required for new users');
                    setLoading(false);
                    return;
                }
                if (formData.password !== formData.password_confirmation) {
                    toast.error('Passwords do not match');
                    setLoading(false);
                    return;
                }

                submitData.password = formData.password;
                submitData.password_confirmation =
                    formData.password_confirmation;

                response = await axios.post<User>('/api/users', submitData);
                toast.success('User created successfully!');
                // User section assignment logic completed
            }

            resetForm();
            fetchUsers();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const errorMessages: string[] = [];
                const errors = error.response.data.errors;

                Object.keys(errors).forEach((key) => {
                    if (Array.isArray(errors[key])) {
                        errors[key].forEach((message: string) => {
                            errorMessages.push(`${key}: ${message}`);
                        });
                    } else {
                        errorMessages.push(`${key}: ${errors[key]}`);
                    }
                });

                toast.error(errorMessages.join(', '));
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(`Failed to ${editingUser ? 'update' : 'create'} user.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User): void => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            password_confirmation: '',
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone || '',
            section_codes: user.section_code ? [user.section_code] : [],
            delivery_section_code: user.delivery_section_code || '',
            role_id: user.role_id?.toString() || '',
            is_active: user.is_active,
            company_code: user.company_code || '',
        });
        setShowForm(true);
        setShowBarcodeHistory(false);
        setBarcodeHistory([]);
        setManualBarcode(user.admin_barcode || '');

        if (authUser.role_id === 1 && user.company_code) {
            fetchSections(user.company_code);
        }

        // Fetch barcode history for company admin users
        if (user.admin_barcode) {
            fetchBarcodeHistory(user.id);
        }
    };

    const fetchBarcodeHistory = async (userId: number): Promise<void> => {
        try {
            const response = await axios.get(`/api/users/${userId}/barcode-history`);
            setBarcodeHistory(response.data);
        } catch (error) {
            console.error('Error fetching barcode history:', error);
        }
    };

    const handleRegenerateBarcode = async (): Promise<void> => {
        if (!editingUser) return;

        setRegeneratingBarcode(true);
        try {
            const response = await axios.post(`/api/users/${editingUser.id}/regenerate-barcode`);
            const newBarcode = response.data.admin_barcode;

            // Update editingUser with new barcode
            setEditingUser({
                ...editingUser,
                admin_barcode: newBarcode,
                admin_barcode_month: new Date().toISOString().slice(0, 7),
            });

            setManualBarcode(newBarcode);

            // Refresh barcode history
            fetchBarcodeHistory(editingUser.id);

            toast.success('Barcode regenerated successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to regenerate barcode.');
        } finally {
            setRegeneratingBarcode(false);
        }
    };

    const handleSaveBarcode = async (): Promise<void> => {
        if (!editingUser) return;

        const barcodeValue = manualBarcode.trim();
        if (!barcodeValue) {
            toast.error('Please enter a barcode value.');
            return;
        }

        setSavingBarcode(true);
        try {
            const response = await axios.post(`/api/users/${editingUser.id}/save-barcode`, {
                admin_barcode: barcodeValue,
            });

            const savedBarcode = response.data.admin_barcode;

            // Update editingUser
            setEditingUser({
                ...editingUser,
                admin_barcode: savedBarcode,
                admin_barcode_month: new Date().toISOString().slice(0, 7),
            });

            setManualBarcode(savedBarcode);

            // Refresh barcode history
            fetchBarcodeHistory(editingUser.id);

            // Refresh users list
            fetchUsers();

            toast.success('Barcode saved successfully!');
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to save barcode.';
            toast.error(msg);
        } finally {
            setSavingBarcode(false);
        }
    };

    const handleDeleteClick = (user: User): void => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async (): Promise<void> => {
        if (!userToDelete) return;

        try {
            await axios.delete(`/api/users/${userToDelete.id}`);
            toast.success('User deleted successfully!');
            setShowDeleteModal(false);
            setUserToDelete(null);
            fetchUsers();
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ): void => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({
                ...prev,
                [name]: checked,
            }));
        } else {
            if (name === 'section_codes') {
                const selected = Array.from((e.target as HTMLSelectElement).selectedOptions, option => option.value);
                setFormData((prev) => ({ ...prev, section_codes: selected }));
            } else {
                setFormData((prev) => ({
                    ...prev,
                    [name]: value,
                }));

                if (name === 'company_code' && value) {
                    fetchSections(value);
                    setFormData((prev) => ({ ...prev, section_codes: [], delivery_section_code: '' }));
                }
            }
        }
    };

    const handleCompanyFilterChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ): void => {
        setSelectedCompany(e.target.value);
        setSelectedSection(''); // Reset section filter when company changes
    };

    const handleSectionFilterChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ): void => {
        setSelectedSection(e.target.value);
    };

    const handleRoleFilterChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ): void => {
        setSelectedRole(e.target.value);
    };

    const clearFilters = (): void => {
        setSelectedCompany('');
        setSelectedSection('');
        setSelectedRole('');
    };

    const getRoleBadgeColor = (user: User): string => {
        if (user.user_type === 'super_admin') {
            return 'bg-purple-100 text-purple-800';
        }

        switch (user.role_id) {
            case 1: // Super Admin
                return 'bg-purple-100 text-purple-800';
            case 2: // Company Admin
                return 'bg-slate-100 text-slate-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    const resetForm = (): void => {
        setFormData({
            username: '',
            email: '',
            password: '',
            password_confirmation: '',
            first_name: '',
            last_name: '',
            phone: '',
            section_codes: [],
            delivery_section_code: '',
            role_id: '',
            is_active: true,
            company_code: '',
        });
        setEditingUser(null);
        setShowForm(false);
        if (authUser.role_id === 1) {
            fetchSections();
        }
    };

    const canEditUser = (user: User): boolean => {
        // Cannot edit own account
        // if (user.id === authUser.id) return false;

        // Super Admin can edit all users
        if (authUser.role_id === 1 || authUser.user_type === 'super_admin') return true;

        // Company Level Roles can edit users in their company
        if (authUser.role_id === 2 || authUser.user_type === 'company_admin' || ['company_admin', 'distributor', 'cashier'].includes(authUser.role?.level || '')) {
            return user.company_code === authUser.company_code;
        }

        return false;
    };

    const canDeleteUser = (user: User): boolean => {
        // Cannot delete own account
        if (user.id === authUser.id) return false;
        
        // Super Admin can delete all users
        if (authUser.role_id === 1 || authUser.user_type === 'super_admin') return true;

        // Company Level Roles can delete users in their company
        if (authUser.role_id === 2 || authUser.user_type === 'company_admin' || ['company_admin', 'distributor', 'cashier'].includes(authUser.role?.level || '')) {
            return user.company_code === authUser.company_code;
        }
        
        return false;
    };

    const canImpersonateUser = (user: User): boolean => {
        if (user.id === authUser.id) return false;

        // Super Admin can impersonate any user
        if (authUser.role_id === 1 || authUser.user_type === 'super_admin') {
            return user.user_type !== 'super_admin' && user.role?.level !== 'company_admin';
        }

        // Company Level Roles can impersonate users in their company
        if (authUser.role_id === 2 || authUser.user_type === 'company_admin' || ['company_admin', 'distributor', 'cashier'].includes(authUser.role?.level || '')) {
            if (user.company_code !== authUser.company_code) return false;
            return user.role?.level !== 'company_admin';
        }

        return false;
    };

    const handleImpersonate = (user: User): void => {
        setUserToImpersonate(user);
        setShowImpersonateModal(true);
    };

    const confirmImpersonate = (): void => {
        if (!userToImpersonate) return;
        setShowImpersonateModal(false);
        router.post(`/impersonate/${userToImpersonate.id}`);
    };

    const canViewUsers = (): boolean => {
        if (!authUser) return false;
        
        // Super Admin
        if (authUser.user_type === 'super_admin' || authUser.role_id === 1) return true;
        
        // Company Level Roles
        if (authUser.user_type === 'company_admin') return true;
        
        const roleLevel = authUser.role?.level;
        return (
            roleLevel === 'company_admin' ||
            roleLevel === 'distributor' ||
            roleLevel === 'cashier'
        );
    };

    // Get active/inactive counts
    const activeUsers = users.filter(u => u.is_active).length;
    const inactiveUsers = users.length - activeUsers;

    // Check if barcode is expired (from a previous month)
    const isBarcodeExpired = (barcodeMonth: string | null): boolean => {
        if (!barcodeMonth) return true;
        const currentMonth = new Date().toISOString().slice(0, 7);
        return barcodeMonth !== currentMonth;
    };

    const handleCreateUserClick = () => {
        // Check package limits for Company Admin (role_id = 2)
        if (authUser.role_id === 2) {
            const maxUsers = authUser.company?.package_details?.max_users;
            const currentUsers = authUser.company?.current_users_count ?? 0;

            if (maxUsers && currentUsers >= maxUsers) {
                toast.error(`You have reached the maximum number of users allowed for your package (${maxUsers}). Please upgrade your package to add more users.`);
                return;
            }
        }

        setShowForm(true);
    };

    // If not authenticated, show login message
    if (!authUser) {
        return (
            <AppLayout breadcrumbs={[{ title: 'User Management', href: '/user-management' }]}>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                        <p className="text-gray-600 mb-4">You need to login to access this page.</p>
                        <a href="/company/login" className="bg-vismass-blue text-white px-4 py-2 rounded-lg hover:bg-vismass-blue/90 transition-colors">Login as Company</a>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('User Management')} - POS System`} />

            {/* Radiant Layout Structure with Blue and White Mix */}
            <div className="min-h-screen bg-slate-50">
                {/* Header Section with Vismass Gradient */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title={t('Go Back')}
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('User Management')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage system users and privileges')}
                                    </p>
                                </div>
                            </div>
                            {canCreateUsers() && (
                                <button
                                    onClick={handleCreateUserClick}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Plus className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Create New User')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-3">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Total Users')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-3">
                                        <UserCheck className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Active Users')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-3">
                                        <UserX className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Inactive Users')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{inactiveUsers}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-3">
                                        <Building className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Companies')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Users List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all users')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Show access denied message for regular users */}
                                {!canViewUsers() && (
                                    <div className="mb-6 rounded border border-yellow-400 bg-yellow-100 px-4 py-3 text-yellow-700">
                                        <p>{t('You do not have permission to view users.')}</p>
                                    </div>
                                )}

                                {canViewUsers() && (
                                    <>
                                        {/* Filters Section */}
                                        <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                            <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('Filter Users')}</h4>
                                            <div className="flex flex-wrap items-end gap-3">
                                                {/* Company Filter for Super Admin */}
                                                {authUser.role_id === 1 &&
                                                    companies.length > 0 && (
                                                        <div className="w-48">
                                                            <label
                                                                htmlFor="company_filter"
                                                                className="mb-1 block text-sm font-medium text-gray-700"
                                                            >
                                                                {t('Filter by Company')}:
                                                            </label>
                                                            <select
                                                                id="company_filter"
                                                                value={selectedCompany}
                                                                onChange={
                                                                    handleCompanyFilterChange
                                                                }
                                                                className="w-full rounded-lg border border-slate-200 bg-white py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                                            >
                                                                <option value="">
                                                                    {t('All Companies')}
                                                                </option>
                                                                {companies.map(
                                                                    (company) => (
                                                                        <option
                                                                            key={
                                                                                company.company_code
                                                                            }
                                                                            value={
                                                                                company.company_code
                                                                            }
                                                                        >
                                                                            {company.name}
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </div>
                                                    )}

                                                {/* Section Filter */}
                                                {getFilterableSections().length > 0 && (
                                                    <div className="w-52">
                                                        <label
                                                            htmlFor="section_filter"
                                                            className="mb-1 block text-sm font-medium text-gray-700"
                                                        >
                                                            {t('Filter by Section')}:
                                                        </label>
                                                        <select
                                                            id="section_filter"
                                                            value={selectedSection}
                                                            onChange={
                                                                handleSectionFilterChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                                        >
                                                            <option value="">
                                                                {t('All Sections')}
                                                            </option>
                                                            {getFilterableSections().map(
                                                                (section) => (
                                                                    <option
                                                                        key={
                                                                            section.section_code
                                                                        }
                                                                        value={
                                                                            section.section_code
                                                                        }
                                                                    >
                                                                        {section.name}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Role Filter */}
                                                {getFilterableRoles().length > 0 && (
                                                    <div className="w-78">
                                                        <label
                                                            htmlFor="role_filter"
                                                            className="mb-1 block text-sm font-medium text-gray-700"
                                                        >
                                                            {t('Filter by Role')}:
                                                        </label>
                                                        <select
                                                            id="role_filter"
                                                            value={selectedRole}
                                                            onChange={
                                                                handleRoleFilterChange
                                                            }
                                                            className="w-full rounded-lg border border-slate-200 bg-white py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                                        >
                                                            <option value="">
                                                                {t('All Roles')}
                                                            </option>
                                                            {getFilterableRoles().map(
                                                                (role) => (
                                                                    <option
                                                                        key={role.id}
                                                                        value={role.id}
                                                                    >
                                                                        {role.name}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Clear Filters Button + Count */}
                                                <div className="flex items-end gap-2">
                                                    {(selectedCompany || selectedSection || selectedRole) && (
                                                        <button
                                                            onClick={clearFilters}
                                                            className="inline-flex items-center rounded-xl bg-linear-to-r from-red-500 to-pink-500 px-4 py-3 text-sm font-medium text-white shadow-sm hover:from-red-600 hover:to-pink-600 transition-all duration-200"
                                                        >
                                                            <Filter className="mr-2 h-4 w-4" />
                                                            {t('Clear Filters')}
                                                        </button>
                                                    )}
                                                    <div className="text-sm text-gray-600 bg-white rounded-lg px-3 py-3 border border-slate-200">
                                                        <span className="font-semibold text-vismass-blue">{filteredUsers.length}</span> of{' '}
                                                        <span className="font-semibold text-vismass-blue">{users.length}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Users List */}
                                        <div className="overflow-hidden rounded-lg border border-gray-200">
                                            <div className="max-h-[600px] overflow-y-auto">
                                                {filteredUsers.length === 0 ? (
                                                    <div className="py-12 text-center">
                                                        <div className="text-gray-400">
                                                            <Users className="mx-auto mb-4 h-16 w-16 opacity-30" />
                                                            <p className="text-lg font-semibold text-gray-500 mb-2">
                                                                {t('No users found')}
                                                            </p>
                                                            <p className="text-sm text-gray-400 mb-6">
                                                                {selectedCompany ||
                                                                    selectedSection ||
                                                                    selectedRole
                                                                    ? t('Try adjusting your search terms')
                                                                    : t('Get started by adding your first user')}
                                                            </p>
                                                            {canCreateUsers() && (
                                                                <Dialog.Root open={showForm} onOpenChange={setShowForm}>
                                                                    <Dialog.Trigger asChild>
                                                                        <button className="inline-flex items-center gap-3 rounded-lg bg-vismass-blue px-6 py-3 text-base font-semibold text-white hover:bg-vismass-blue/90 transition-colors">
                                                                            <Plus className="h-5 w-5" />
                                                                            {t('Add Your First User')}
                                                                        </button>
                                                                    </Dialog.Trigger>
                                                                </Dialog.Root>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <ul className="divide-y divide-slate-200">
                                                        {filteredUsers.map((user) => (
                                                            <li
                                                                key={user.id}
                                                                className="group relative transition-colors hover:bg-sky-50/50 rounded-lg mx-2 my-1"
                                                            >
                                                                <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                                                                    <div className="flex min-w-0 flex-1 items-center">
                                                                        <div className="shrink-0">
                                                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vismass-blue">
                                                                                <span className="text-xs font-semibold text-white">
                                                                                    {getInitials(
                                                                                        user.first_name,
                                                                                        user.last_name,
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="ml-3 min-w-0 flex-1">
                                                                            <div className="flex items-center">
                                                                                <p className="truncate text-xs font-medium text-gray-900">
                                                                                    {
                                                                                        user.first_name
                                                                                    }{' '}
                                                                                    {
                                                                                        user.last_name
                                                                                    }
                                                                                </p>
                                                                                <span className="ml-2 text-[10px] text-gray-500">
                                                                                    @
                                                                                    {
                                                                                        user.username
                                                                                    }
                                                                                    {user.section ? ` (${user.section.name})` : ''}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-0.5 flex items-center text-xs text-gray-500">
                                                                                <span className="truncate">
                                                                                    {user.email}
                                                                                </span>
                                                                            </div>
                                                                            <div className="mt-0.5 flex items-center space-x-2">
                                                                                <span
                                                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeColor(user)}`}
                                                                                >
                                                                                    {user.role?.name}
                                                                                </span>
                                                                                {user.section && (
                                                                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-800">
                                                                                        {
                                                                                            user.section.name
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                                {user.company &&
                                                                                    authUser.role_id ===
                                                                                    1 && (
                                                                                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800">
                                                                                            {
                                                                                                user
                                                                                                    .company
                                                                                                    .name
                                                                                            }
                                                                                            {user.section ? ` (${user.section.name})` : ''}
                                                                                        </span>
                                                                                    )}
                                                                                {user.phone && (
                                                                                    <span className="text-[10px] text-gray-500">
                                                                                        {
                                                                                            user.phone
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center space-x-2">
                                                                        <span
                                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${user.is_active
                                                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                                                    : 'bg-red-100 text-red-800 border border-red-200'
                                                                                }`}
                                                                        >
                                                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${user.is_active ? 'bg-green-500' : 'bg-red-500'
                                                                                }`}></div>
                                                                            {user.is_active
                                                                                ? 'Active'
                                                                                : 'Inactive'}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-600 bg-gray-50 rounded-lg px-2 py-1 border">
                                                                            {new Date(
                                                                                user.created_at,
                                                                            ).toLocaleDateString('en-GB')}
                                                                        </span>
                                                                        <div className="flex gap-1.5">
                                                                            {canEditUser(
                                                                                user,
                                                                            ) && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleEdit(
                                                                                                user,
                                                                                            )
                                                                                        }
                                                                                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700 transition-colors flex items-center gap-1.5"
                                                                                        title="Edit User"
                                                                                    >
                                                                                        <Edit2 className="h-3.5 w-3.5" />
                                                                                        <span className="text-xs font-medium">{t('Edit')}</span>
                                                                                    </button>
                                                                                )}
                                                                            {canImpersonateUser(user) && (
                                                                                    <button
                                                                                        onClick={() => handleImpersonate(user)}
                                                                                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                                                                                        title="Impersonate User"
                                                                                    >
                                                                                        <UserCheck className="h-3.5 w-3.5" />
                                                                                        <span className="text-xs font-medium">{t('Impersonate')}</span>
                                                                                    </button>
                                                                                )}
                                                                            {/* {canDeleteUser(
                                                                                user,
                                                                            ) && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleDeleteClick(
                                                                                                user,
                                                                                            )
                                                                                        }
                                                                                        className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5"
                                                                                        title="Delete User"
                                                                                    >
                                                                                        <Power className="h-3.5 w-3.5" />
                                                                                        <span className="text-xs font-medium">{t('Delete')}</span>
                                                                                    </button>
                                                                                )} */}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {/* Table Footer */}
                                            {filteredUsers.length > 0 && (
                                                <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5">
                                                    <div className="flex items-center justify-between text-xs text-gray-600">
                                                        <span>
                                                            {t('Showing')} <span className="font-semibold text-gray-900">{filteredUsers.length}</span> {t('of')} <span className="font-semibold text-gray-900">{users.length}</span> {t('users')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS POS System • {t('User Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Add/Edit User Modal */}
            <Dialog.Root open={showForm} onOpenChange={setShowForm}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-lg bg-vismass-blue p-2">
                                <Plus className="h-5 w-5 text-white" />
                            </div>
                            <Dialog.Title className="text-xl font-bold text-gray-900">
                                {editingUser
                                    ? t('Edit User')
                                    : t('Create New User')}
                            </Dialog.Title>
                        </div>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">
                            {editingUser
                                ? t('Update the user information and settings')
                                : t('Create a new system user with appropriate permissions')}
                        </Dialog.Description>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            {/* Company Selection for Super Admin */}
                            {authUser.role_id === 1 &&
                                companies.length > 0 && (
                                    <div>
                                        <label
                                            htmlFor="company_code"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            {t('Company')}{' '}
                                            {authUser.role_id ===
                                                1 && '*'}
                                        </label>
                                        <select
                                            id="company_code"
                                            name="company_code"
                                            value={
                                                formData.company_code ||
                                                ''
                                            }
                                            onChange={
                                                handleInputChange
                                            }
                                            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                            required={
                                                authUser.role_id ===
                                                1
                                            }
                                        >
                                            <option value="">
                                                {t('Select Company')}
                                            </option>
                                            {companies.map(
                                                (company) => (
                                                    <option
                                                        key={
                                                            company.company_code
                                                        }
                                                        value={
                                                            company.company_code
                                                        }
                                                    >
                                                        {
                                                            company.name
                                                        }{' '}
                                                        (
                                                        {
                                                            company.company_code
                                                        }
                                                        )
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {t('Leave empty to create Super Admin')}
                                        </p>
                                    </div>
                                )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="first_name"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('First Name')} *
                                    </label>
                                    <input
                                        type="text"
                                        id="first_name"
                                        name="first_name"
                                        value={
                                            formData.first_name
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="last_name"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('Last Name')} *
                                    </label>
                                    <input
                                        type="text"
                                        id="last_name"
                                        name="last_name"
                                        value={
                                            formData.last_name
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="username"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('Username')} *
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        name="username"
                                        value={
                                            formData.username
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                        required
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('Email')} *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={
                                            handleInputChange
                                        }
                                        className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('Password')}{' '}
                                        {!editingUser && '*'}
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={
                                            formData.password
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        className={`mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${editingUser ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
                                        placeholder={
                                            editingUser
                                                ? `(${t('Password cannot be changed here')})`
                                                : ''
                                        }
                                        required={!editingUser}
                                        disabled={!!editingUser}
                                        autoComplete="new-password"
                                    />
                                    {editingUser && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            {t('Password cannot be changed when updating user.')}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="password_confirmation"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('Confirm Password')}{' '}
                                        {!editingUser && '*'}
                                    </label>
                                    <input
                                        type="password"
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        value={
                                            formData.password_confirmation
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        className={`mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${editingUser ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
                                        placeholder={
                                            editingUser
                                                ? `(${t('Password cannot be changed here')})`
                                                : ''
                                        }
                                        required={!editingUser}
                                        disabled={!!editingUser}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    {t('Phone')}
                                </label>
                                <input
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                    placeholder={t('07XXXXXXXX')}
                                    maxLength={10}
                                    pattern="\d{10}"
                                    inputMode="numeric"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {t('Enter a 10-digit phone number (numbers only).')}
                                </p>
                            </div>

                            {/* Section Selection */}
                            {getAvailableSections().length >
                                0 && (
                                    <div>
                                        <label
                                            htmlFor="section_codes"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            {t('Section')} * {formData.company_code === 'MAL001' ? '(Multiple selection allowed)' : ''}
                                        </label>
                                        {(() => {
                                            const isMultiple = formData.company_code === 'MAL001';
                                            return (
                                                <select
                                                    id="section_codes"
                                                    name="section_codes"
                                                    value={
                                                        isMultiple ? formData.section_codes : formData.section_codes[0] || ''
                                                    }
                                                    onChange={
                                                        handleInputChange
                                                    }
                                                    multiple={isMultiple}
                                                    className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                                    required
                                                >
                                                    <option value="">
                                                        {t('Select Section(s)')}
                                                    </option>
                                                    {getAvailableSections().map(
                                                        (section) => (
                                                            <option
                                                                key={
                                                                    section.section_code
                                                                }
                                                                value={
                                                                    section.section_code
                                                                }
                                                            >
                                                                {
                                                                    section.name
                                                                }{' '}
                                                                (
                                                                {
                                                                    section.section_code
                                                                }
                                                                )
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            );
                                        })()}
                                    </div>
                                )}

                            {/* Delivery Section Selection */}
                            {getAvailableSections().length > 0 && (
                                <div>
                                    <label
                                        htmlFor="delivery_section_code"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('Delivery Section')} (Optional)
                                    </label>
                                    <select
                                        id="delivery_section_code"
                                        name="delivery_section_code"
                                        value={formData.delivery_section_code || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                    >
                                        <option value="">
                                            {t('Select Delivery Section')}
                                        </option>
                                        {getAvailableSections().map(
                                            (section) => (
                                                <option
                                                    key={section.section_code}
                                                    value={section.section_code}
                                                >
                                                    {section.name} ({section.section_code})
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Role Selection */}
                            {getAvailableRoles().length > 0 && (
                                <div>
                                    <label
                                        htmlFor="role_id"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        {t('Role')} *
                                    </label>
                                    <select
                                        id="role_id"
                                        name="role_id"
                                        value={formData.role_id}
                                        onChange={
                                            handleInputChange
                                        }
                                        className="mt-1 block w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                                        required
                                    >
                                        <option value="">
                                            ({t('Select Role')})
                                        </option>
                                        {getAvailableRoles().map(
                                            (role) => (
                                                <option
                                                    key={
                                                        role.id
                                                    }
                                                    value={
                                                        role.id
                                                    }
                                                >
                                                    {role.name}{' '}
                                                    -{' '}
                                                    {
                                                        role.description
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                    {authUser.role_id !== 1 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            ({t('You can assign')}: {' '}
                                            {getAllowedRoleLevels()}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                    className="h-4 w-4 rounded border-blue-300 text-blue-500 focus:ring-blue-200"
                                />
                                <label htmlFor="is_active" className="text-sm font-semibold text-blue-800">
                                    {t('Active User')}
                                </label>
                            </div>

                            {/* Admin Barcode Section - Only show for editing Company Admin or Accounts Manager users */}
                            {editingUser && (editingUser.role?.level === 'company_admin' || editingUser.role?.slug === 'accounts_manager') && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ScanBarcode className="h-4 w-4 text-vismass-blue" />
                                            <span className="text-sm font-semibold text-gray-900">{t('Admin Barcode')}</span>
                                        </div>
                                        {editingUser.admin_barcode && (
                                            <span className={`text-[10px] rounded-lg px-2 py-1 border ${
                                                isBarcodeExpired(editingUser.admin_barcode_month)
                                                    ? 'text-red-600 bg-red-50 border-red-200'
                                                    : 'text-gray-500 bg-white border-slate-200'
                                            }`}>
                                                {isBarcodeExpired(editingUser.admin_barcode_month)
                                                    ? t('Expired') + ' (' + (editingUser.admin_barcode_month || 'N/A') + ')'
                                                    : t('Month') + ': ' + (editingUser.admin_barcode_month || 'N/A')
                                                }
                                            </span>
                                        )}
                                    </div>

                                    {/* Expired Warning */}
                                    {editingUser.admin_barcode && isBarcodeExpired(editingUser.admin_barcode_month) && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                                            {t('This barcode has expired. Enter a new barcode for the current month and click Save.')}
                                        </div>
                                    )}

                                    {/* Manual Barcode Input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualBarcode}
                                            onChange={(e) => setManualBarcode(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveBarcode()}
                                            placeholder={t('Enter new barcode for this month...')}
                                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSaveBarcode}
                                            disabled={savingBarcode || !manualBarcode.trim()}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-vismass-blue px-3 py-2 text-xs font-medium text-white hover:bg-vismass-blue/90 transition-colors disabled:opacity-50"
                                        >
                                            {savingBarcode ? (
                                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            ) : null}
                                            {savingBarcode ? t('Saving...') : t('Save')}
                                        </button>
                                    </div>

                                    {/* Barcode Display */}
                                    {editingUser.admin_barcode && !isBarcodeExpired(editingUser.admin_barcode_month) && (
                                        <div className="bg-white rounded-lg p-4 border border-slate-200 flex flex-col items-center">
                                            <Barcode
                                                value={editingUser.admin_barcode}
                                                width={1.5}
                                                height={50}
                                                displayValue={true}
                                                fontSize={12}
                                                margin={5}
                                            />
                                            <p className="mt-1 text-[10px] text-gray-500 font-mono">{editingUser.admin_barcode}</p>
                                        </div>
                                    )}

                                    {/* Regenerate Button */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={handleRegenerateBarcode}
                                            disabled={regeneratingBarcode}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${regeneratingBarcode ? 'animate-spin' : ''}`} />
                                            {regeneratingBarcode ? t('Regenerating...') : t('Auto Generate')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowBarcodeHistory(!showBarcodeHistory)}
                                            className="text-xs text-vismass-blue hover:underline"
                                        >
                                            {showBarcodeHistory ? t('Hide History') : t('View History')}
                                        </button>
                                    </div>

                                    {/* Barcode History */}
                                    {showBarcodeHistory && barcodeHistory.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            <p className="text-xs font-medium text-gray-700">{t('Barcode History')}:</p>
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                {barcodeHistory.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={`flex items-center justify-between text-[10px] px-2 py-1 rounded ${
                                                            item.is_revoked
                                                                ? 'bg-red-50 text-red-600'
                                                                : 'bg-green-50 text-green-700'
                                                        }`}
                                                    >
                                                        <span className="font-mono">{item.admin_barcode}</span>
                                                        <span>{item.barcode_month} {item.is_revoked ? `(${t('Revoked')})` : ''}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {showBarcodeHistory && barcodeHistory.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-2">{t('No previous barcodes found.')}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {t('Cancel')}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 rounded-xl border border-transparent bg-linear-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300"
                                >
                                    {loading ? (
                                        <span className="flex items-center">
                                            <svg
                                                className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            {editingUser
                                                ? `(${t('Updating...')}`
                                                : t('Creating...')}
                                        </span>
                                    ) : editingUser ? (
                                        t('Update User')
                                    ) : (
                                        t('Create User')
                                    )}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Confirmation Modal */}
            {/* <AlertDialog.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-6 shadow-2xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`rounded-xl p-2 ${userToDelete?.is_active ? 'bg-red-100' : 'bg-green-100'
                                }`}>
                                <Power className={`h-5 w-5 ${userToDelete?.is_active ? 'text-red-600' : 'text-green-600'
                                    }`} />
                            </div>
                            <AlertDialog.Title className="text-xl font-bold text-gray-900">
                                ({t('Delete User')})
                            </AlertDialog.Title>
                        </div>

                        <AlertDialog.Description className="mb-6 text-sm text-gray-600 bg-blue-50 rounded-xl p-4 border border-blue-200">
                            {t('Are you sure you want to delete the user')} "<span className="font-semibold text-gray-900">{userToDelete?.first_name} {userToDelete?.last_name}</span>"?
                            <br /><br />
                            {t('This action cannot be undone and will permanently remove the user from the system.')}
                        </AlertDialog.Description>

                        <div className="flex gap-3">
                            <AlertDialog.Cancel asChild>
                                <button className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                    {t('Cancel')}
                                </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="flex-1 rounded-xl border border-transparent bg-linear-to-r from-red-500 to-pink-500 px-4 py-3 text-sm font-semibold text-white hover:from-red-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-red-200 hover:shadow-red-300"
                                >
                                    {t('Delete User')}
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root> */}

            {/* Impersonate Confirmation Modal */}
            <AlertDialog.Root open={showImpersonateModal} onOpenChange={setShowImpersonateModal}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-6 shadow-2xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-xl p-2 bg-amber-100">
                                <UserCheck className="h-5 w-5 text-amber-600" />
                            </div>
                            <AlertDialog.Title className="text-xl font-bold text-gray-900">
                                {t('Impersonate User')}
                            </AlertDialog.Title>
                        </div>

                        <AlertDialog.Description className="mb-6 text-sm text-gray-600 bg-blue-50 rounded-xl p-4 border border-blue-200">
                            {t('Are you sure you want to impersonate')}{' '}
                            <span className="font-semibold text-gray-900">
                                {userToImpersonate?.first_name} {userToImpersonate?.last_name}
                            </span>?
                            <br /><br />
                            {t('You will be logged in as this user and see the system from their perspective.')}
                        </AlertDialog.Description>

                        <div className="flex gap-3">
                            <AlertDialog.Cancel asChild>
                                <button className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                    {t('Cancel')}
                                </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button
                                    onClick={confirmImpersonate}
                                    className="flex-1 rounded-xl border border-transparent bg-linear-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-amber-200 hover:shadow-amber-300"
                                >
                                    {t('Confirm Impersonation')}
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </AppLayout>
    );
}

export default UserManagement;
