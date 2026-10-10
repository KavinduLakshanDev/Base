import { usePage } from '@inertiajs/react';

export function usePermission() {
    const { props } = usePage<any>();
    const user = props.auth?.user;

    const hasPermission = (permissionSlug: string): boolean => {
        if (!user) return false;

        // Super Admin users bypass all checks
        if (user.user_type === 'super_admin') return true;

        // Company Admin users bypass all checks
        if (user.user_type === 'company_admin') return true;

        if (!user.role) return false;

        // Super Admin and Company Admin roles bypass checks
        if (user.role.level === 'super_admin' || user.role.level === 'company_admin') return true;

        // Check if role has the specific permission
        return user.role.permissions?.some((p: any) => p.slug === permissionSlug) || false;
    };

    return { hasPermission };
}
