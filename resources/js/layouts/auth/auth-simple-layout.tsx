import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren, useEffect, useState } from 'react';
import AppLogo from '@/components/app-logo';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

// Product showcase images
const productImages = [
    {
        url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&q=80',
        title: 'Professional Printing Solutions',
        description: 'High-quality printers and accessories for your business'
    },
    {
        url: 'https://images.unsplash.com/photo-1586864387634-f4d82e4fb2d0?w=800&q=80',
        title: 'Premium Ink & Toners',
        description: 'Original and compatible cartridges for all major brands'
    },
    {
        url: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&q=80',
        title: 'Complete Office Solutions',
        description: 'Everything you need for your printing infrastructure'
    },
    {
        url: 'https://images.unsplash.com/photo-1533321942807-22e4ea1af2b8?w=800&q=80',
        title: 'Technical Support & Parts',
        description: 'Encoder strips, maintenance kits, and expert support'
    }
];

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Auto-rotate images every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex min-h-screen">
            {/* Left side - Product showcase with image carousel */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 20px 20px, white 2px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Product image carousel */}
                <div className="absolute inset-0">
                    {productImages.map((image, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 transition-opacity duration-1000 ${
                                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                            }`}
                        >
                            <div 
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${image.url})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-950/85 to-indigo-950/90" />
                        </div>
                    ))}
                </div>
                
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
                    {/* Logo and brand */}
                    <div>
                        <Link href={home()} className="inline-flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity">
                            <div className="bg-white px-6 py-3 rounded-lg shadow-xl">
                                <AppLogo />
                            </div>
                        </Link>
                        
                        {/* Product showcase info */}
                        <div className="mt-16 max-w-lg">
                            <div className="inline-block px-4 py-1.5 bg-blue-500/20 backdrop-blur-sm rounded-full mb-6">
                                <span className="text-sm font-semibold text-blue-200">
                                    Trusted by 500+ Businesses
                                </span>
                            </div>
                            <h2 className="text-5xl font-bold mb-6 leading-tight">
                                {productImages[currentImageIndex].title}
                            </h2>
                            <p className="text-xl text-blue-50 leading-relaxed">
                                {productImages[currentImageIndex].description}
                            </p>
                        </div>
                    </div>
                    
                    {/* Product categories showcase */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-white">Printers</h3>
                                </div>
                                <p className="text-sm text-blue-100/80">Canon, Epson & More</p>
                            </div>
                            
                            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-white">Ink & Toners</h3>
                                </div>
                                <p className="text-sm text-blue-100/80">All Brands Available</p>
                            </div>
                            
                            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-white">Spare Parts</h3>
                                </div>
                                <p className="text-sm text-blue-100/80">Encoder Strips & More</p>
                            </div>
                            
                            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-white">Support</h3>
                                </div>
                                <p className="text-sm text-blue-100/80">Expert Assistance</p>
                            </div>
                        </div>
                        
                        {/* Carousel indicators */}
                        <div className="flex gap-2 justify-center pt-4">
                            {productImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`h-2 rounded-full transition-all ${
                                        index === currentImageIndex 
                                            ? 'w-8 bg-white' 
                                            : 'w-2 bg-white/30 hover:bg-white/50'
                                    }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="text-sm text-blue-200/60 text-center pt-8 border-t border-white/10">
                        © {new Date().getFullYear()} VISMASS. All rights reserved. | Colombo, Sri Lanka
                    </div>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-gradient-to-br from-gray-50 to-blue-50/30">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden mb-10 text-center">
                        <Link href={home()} className="inline-flex items-center gap-3 mb-8 hover:opacity-90 transition-opacity">
                            <div className="bg-white px-6 py-3 rounded-lg shadow-xl">
                                <AppLogo />
                            </div>
                        </Link>
                        <p className="text-sm text-gray-600 mt-4">
                            Your trusted partner for printing solutions
                        </p>
                    </div>

                    {/* Login card with modern styling */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
                        <div className="flex flex-col gap-6">
                            <div className="space-y-3 text-center lg:text-left">
                                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    {title}
                                </h1>
                                <p className="text-base text-gray-600">
                                    {description}
                                </p>
                            </div>
                            {children}
                        </div>
                    </div>
                    
                    {/* Trust badges */}
                    <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Secure Login</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>24/7 Support</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
