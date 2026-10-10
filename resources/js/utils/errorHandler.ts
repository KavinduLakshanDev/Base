import { toast } from 'sonner';

export interface ApiError {
    response?: {
        data?: {
            message?: string;
            errors?: Record<string, string[]>;
        };
        status?: number;
    };
    message?: string;
}

export const handleApiError = (error: ApiError, defaultMessage: string = 'An error occurred') => {
    if (error.response?.data?.message) {
        toast.error(error.response.data.message);
        return error.response.data.message;
    }
    
    if (error.response?.data?.errors) {
        const errorMessages: string[] = [];
        const errors = error.response.data.errors;
        
        Object.keys(errors).forEach((key) => {
            if (Array.isArray(errors[key])) {
                errorMessages.push(...errors[key]);
            } else {
                errorMessages.push(errors[key]);
            }
        });
        
        if (errorMessages.length > 0) {
            errorMessages.forEach(msg => toast.error(msg));
            return errorMessages.join(', ');
        }
    }
    
    if (error.message) {
        toast.error(error.message);
        return error.message;
    }
    
    toast.error(defaultMessage);
    return defaultMessage;
};

export const handleSuccess = (message: string) => {
    toast.success(message);
};

export const handleInfo = (message: string) => {
    toast.info(message);
};

export const handleWarning = (message: string) => {
    toast.warning(message);
};