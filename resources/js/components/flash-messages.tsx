import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface PageProps {
    flash?: {
        success?: string;
        error?: string;
        [key: string]: any;
    };
    errors?: Record<string, string>;
    [key: string]: any;
}

export default function FlashMessages() {
    const { flash, errors } = usePage<PageProps>().props;
    const lastFlashRef = useRef<{ success?: string; error?: string }>({});

    useEffect(() => {
        // Only show success message if it's different from the last one shown
        if (flash?.success) {
            if (flash.success !== lastFlashRef.current.success) {
                toast.success(flash.success);
                lastFlashRef.current.success = flash.success;
            }
        } else {
            lastFlashRef.current.success = undefined;
        }

        // Only show error message if it's different from the last one shown
        if (flash?.error) {
            if (flash.error !== lastFlashRef.current.error) {
                toast.error(flash.error);
                lastFlashRef.current.error = flash.error;
            }
        } else {
            lastFlashRef.current.error = undefined;
        }

        // Show validation errors as toasts
        if (errors) {
            Object.values(errors).forEach((error) => {
                toast.error(error);
            });
        }
    }, [flash?.success, flash?.error, errors]);

    return null;
}