import { useForm } from '@inertiajs/react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { Edit2, Plus, Search, Trash2, Power } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

interface MasterDataItem {
    id: number;
    concode: string;
    catkey: string;
    cname: string;
    description?: string;
    is_active: boolean;
    company_code?: string;
    branch_code?: string;
    created_at: string;
}

interface Props {
    items: MasterDataItem[];
    title: string;
    icon?: React.ReactNode;
    apiEndpoint: string;
    description?: string;
    enableToggle?: boolean;
    showAddButton?: boolean;
}

export default function MasterDataManager({
    items,
    title,
    icon,
    apiEndpoint,
    description,
    enableToggle = false,
    showAddButton = true,
}: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MasterDataItem | null>(
        null,
    );

    const {
        data: addData,
        setData: setAddData,
        post: postAdd,
        processing: addProcessing,
        errors: addErrors,
        reset: resetAdd,
    } = useForm({
        cname: '',
        description: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        cname: '',
        description: '',
        is_active: true,
    });

    const { delete: deleteItem, processing: deleteProcessing } = useForm({});

    const { post: toggleItem, processing: toggleProcessing } = useForm({});

    const filteredItems = items.filter(
        (item) =>
            item.cname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.concode.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check for duplicate names (case-insensitive)
        const existingItem = items.find(
            item => item.cname.toLowerCase().trim() === addData.cname.toLowerCase().trim()
        );
        
        if (existingItem) {
            toast.error(t('A unit with this name already exists. Please choose a different name.'));
            return;
        }
        
        postAdd(apiEndpoint, {
            onSuccess: () => {
                setIsAddModalOpen(false);
                resetAdd();
            },
        });
    };

    const handleEdit = (item: MasterDataItem) => {
        setSelectedItem(item);
        setEditData({
            cname: item.cname,
            description: item.description || '',
            is_active: item.is_active,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedItem) {
            // Check for duplicate names (case-insensitive), excluding the current item
            const existingItem = items.find(
                item => item.id !== selectedItem.id && 
                        item.cname.toLowerCase().trim() === editData.cname.toLowerCase().trim()
            );
            
            if (existingItem) {
                toast.error(t('A unit with this name already exists. Please choose a different name.'));
                return;
            }
            
            putEdit(`${apiEndpoint}/${selectedItem.id}`, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedItem(null);
                    resetEdit();
                },
            });
        }
    };

    const handleDelete = (item: MasterDataItem) => {
        setSelectedItem(item);
        setIsDeleteModalOpen(true);
    };

    const handleToggle = (item: MasterDataItem) => {
        toggleItem(`${apiEndpoint}/${item.id}/toggle`, {
            onSuccess: () => {
                // Refresh or update state
            },
        });
    };

    const confirmDelete = () => {
        if (selectedItem) {
            deleteItem(`${apiEndpoint}/${selectedItem.id}`, {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setSelectedItem(null);
                },
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                        {icon && (
                            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                                {icon}
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {title}
                            </h2>
                            {description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {showAddButton && (
                    <Dialog.Root
                        open={isAddModalOpen}
                        onOpenChange={setIsAddModalOpen}
                    >
                        <Dialog.Trigger asChild>
                            <button className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add')} {title.slice(0, -1)}{' '}
                                {/* Remove 's' from plural */}
                            </button>
                        </Dialog.Trigger>
                    </Dialog.Root>
                )}
            </div>

            {/* Search Bar */}
            <div className="mb-4 flex items-center space-x-4">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    <input
                        type="text"
                        placeholder={`${t('Search')} ${title.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredItems.length} {t('of').toLowerCase()} {items.length}{' '}
                    {title.toLowerCase()}
                </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white dark:bg-gray-800">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                    {t('Code')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                    {t('Name')}
                                </th>
                                {/* <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                    Description
                                </th> */}
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                    {t('Company')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                    {t('Branch')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                    {t('Status')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                    {t('Actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-900 dark:bg-gray-700 dark:text-white">
                                                {item.concode}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {item.cname}
                                            </div>
                                        </td>
                                        {/* <td className="px-6 py-4">
                                            <div className="max-w-xs truncate text-sm text-gray-500 dark:text-gray-400">
                                                {item.description || '-'}
                                            </div>
                                        </td> */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {item.company_code || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {item.branch_code || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    item.is_active
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}
                                            >
                                                {item.is_active
                                                    ? t('Active')
                                                    : t('Inactive')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() =>
                                                        handleEdit(item)
                                                    }
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {enableToggle ? (
                                                    <button
                                                        onClick={() =>
                                                            handleToggle(item)
                                                        }
                                                        className={`${
                                                            item.is_active
                                                                ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                                                                : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                        }`}
                                                        disabled={toggleProcessing}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(item)
                                                        }
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-12 text-center"
                                    >
                                        <div className="text-gray-500 dark:text-gray-400">
                                            <div className="mx-auto mb-4 h-12 w-12 opacity-50">
                                                {icon}
                                            </div>
                                            <p className="text-sm">
                                                {t('No items found').replace('items', title.toLowerCase())}
                                            </p>
                                            <p className="mt-1 text-xs">
                                                {t('Add your first item to get started').replace('item', title.slice(0, -1).toLowerCase())}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <Dialog.Title className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            {t('Add New')} {title.slice(0, -1)}
                        </Dialog.Title>
                        <Dialog.Description className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            {t('Create a new item for your POS system.').replace('item', title.slice(0, -1).toLowerCase())}
                        </Dialog.Description>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={addData.cname}
                                    onChange={(e) =>
                                        setAddData('cname', e.target.value)
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                                {addErrors.cname && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {addErrors.cname}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Description')}
                                </label>
                                <textarea
                                    rows={3}
                                    value={addData.description}
                                    onChange={(e) =>
                                        setAddData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                {addErrors.description && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {addErrors.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                    >
                                        {t('Cancel')}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={addProcessing}
                                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {addProcessing ? t('Creating...') : t('Create')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Edit Modal */}
            <Dialog.Root
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <Dialog.Title className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            {t('Edit')} {title.slice(0, -1)}
                        </Dialog.Title>
                        <Dialog.Description className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            {t('Update the details of this item.').replace('item', title.slice(0, -1).toLowerCase())}
                        </Dialog.Description>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editData.cname}
                                    onChange={(e) =>
                                        setEditData('cname', e.target.value)
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                                {editErrors.cname && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {editErrors.cname}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Description')}
                                </label>
                                <textarea
                                    rows={3}
                                    value={editData.description}
                                    onChange={(e) =>
                                        setEditData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                                {editErrors.description && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {editErrors.description}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={editData.is_active}
                                        onChange={(e) =>
                                            setEditData(
                                                'is_active',
                                                e.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        {t('Active')}
                                    </span>
                                </label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                    >
                                        {t('Cancel')}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={editProcessing}
                                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {editProcessing ? t('Updating...') : t('Update')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Confirmation Modal */}
            <AlertDialog.Root
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
            >
                <AlertDialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <AlertDialog.Title className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                            {t('Deactivate')} {title.slice(0, -1)}
                        </AlertDialog.Title>
                        <AlertDialog.Description className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            {t('Are you sure you want to deactivate this item?').replace('item', `"${selectedItem?.cname}"`)}
                        </AlertDialog.Description>

                        <div className="flex justify-end space-x-3">
                            <AlertDialog.Cancel asChild>
                                <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {t('Cancel')}
                                </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleteProcessing}
                                    className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    {deleteProcessing
                                        ? t('Deactivating...')
                                        : t('Deactivate')}
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </div>
    );
}