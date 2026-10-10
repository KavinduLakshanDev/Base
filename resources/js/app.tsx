import './bootstrap';
import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

// Import all route definitions via manual aggregator to ensure all modules are included
import routes from './manual-routes';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Set up global route function for Wayfinder compatibility
declare global {
    function route(name: string, params?: any, absolute?: boolean): string;
}

globalThis.route = (name: string, params?: any, absolute?: boolean): string => {
    // Basic validation to prevent crashing on undefined/null name
    if (!name || typeof name !== 'string') {
        console.error('Route function called with invalid name:', name);
        return '#';
    }

    // Handle known routes directly
    if (name === 'stock-transfers.index') {
        const baseUrl = '/stock-transfers';
        const queryString = params ? new URLSearchParams(params).toString() : '';
        const url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
        return absolute ? window.location.origin + url : url;
    }

    // Traverse the routes object
    const parts = name.split('.');
    let current: any = routes;

    for (const part of parts) {
        if (current && (typeof current === 'object' || typeof current === 'function') && part in current) {
            current = current[part];
        } else {
            // Try converting kebab-case to camelCase
            const camelPart = part.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            if (current && (typeof current === 'object' || typeof current === 'function') && camelPart in current) {
                current = current[camelPart];
            } else {
                throw new Error(`Route '${name}' not found. Part '${part}' is missing from the route definition.`);
            }
        }
    }

    if (current && typeof current.url === 'function') {
        const definition = current.definition;
        const hasParams = definition && definition.url && definition.url.includes('{');

        let result;
        if (hasParams) {
            result = current.url(params);
        } else {
            result = current.url(params ? { query: params } : undefined);
        }
        return absolute ? window.location.origin + result : result;
    }

    throw new Error(`Route '${name}' resolved but does not have a url method.`);
};

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
