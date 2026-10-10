import axios from 'axios';

declare global {
    interface Window {
        axios: typeof axios;
    }
}

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;
window.axios.defaults.withXSRFToken = true;

// Axios will automatically read the XSRF-TOKEN cookie provided by Laravel on every request
// We don't need to hardcode the X-CSRF-TOKEN header from the meta tag, as it becomes stale after an SPA login.
import { toast } from 'sonner';

let isRetrying = false;
let requestsQueue: any[] = [];

window.axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 419 && !originalRequest._retry) {
            
            if (isRetrying) {
                return new Promise((resolve, reject) => {
                    requestsQueue.push({ resolve, reject });
                }).then(() => {
                    // Remove old token so Axios reads the new one from the cookie
                    delete originalRequest.headers['X-XSRF-TOKEN'];
                    return window.axios(originalRequest);
                }).catch((err) => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRetrying = true;
            
            try {
                // Fetch a fresh CSRF cookie by pinging the current page.
                // We use a HEAD request to minimize payload while still hitting the web middleware.
                await axios.head(window.location.href);
                
                isRetrying = false;
                requestsQueue.forEach(req => req.resolve());
                requestsQueue = [];
                
                // Remove old token so Axios reads the new one from the cookie
                delete originalRequest.headers['X-XSRF-TOKEN'];
                return window.axios(originalRequest);
            } catch (retryError) {
                isRetrying = false;
                requestsQueue.forEach(req => req.reject(retryError));
                requestsQueue = [];
                
                // Fallback to the original toast if the retry also fails
                toast.error('Session Expired', {
                    description: 'Please open a new tab, log in again, and then retry your action here to avoid losing your work.',
                    duration: 10000,
                });
                return Promise.reject(retryError);
            }
        }
        
        return Promise.reject(error);
    }
);
