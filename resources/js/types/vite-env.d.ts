/// <reference types="vite/client" />

declare global {
    function route(name: string, parameters?: any, absolute?: boolean): string;
}
