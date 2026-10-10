import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-sky-900 via-blue-900 to-indigo-900 text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                {/* Navigation */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-14">
                            {/* <div className="flex items-center gap-3">
                                <svg className="h-8 w-auto text-white" viewBox="0 0 180 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                    <ellipse cx="20" cy="20" rx="28" ry="8" fill="#FFFFFF" transform="rotate(-12 20 20)" />
                                    <text x="50" y="28" fontFamily="Arial, Helvetica, sans-serif" fontSize="22" fill="#FFFFFF" fontWeight="300" letterSpacing="1.5">unitec</text>
                                </svg>
                                <span className="text-xs text-white/80 hidden md:inline">Software Solutions</span>
                            </div> */}

                            <div className="flex items-center gap-3">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-indigo-900/30"
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>

                                        {/* <Link
                                            href={login()}
                                            className="text-sm font-medium text-white/90 hover:text-white/100 px-3 py-2 rounded-md transition-colors"
                                        >
                                            Sign in
                                        </Link> */}
                                        {/* {canRegister && (
                                            <Link
                                                href={register()}
                                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-white rounded-md hover:bg-gray-100 transition-all duration-150 shadow-sm"
                                            >
                                                Get started
                                            </Link>
                                        )} */}




                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-10">
                            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                                Modern distribution software
                                <br />
                                <span className="text-white/95">built for reliability and scale</span>
                            </h1>
                            <p className="text-lg text-white/80 mx-auto max-w-2xl leading-relaxed mb-6">
                                Streamline inventory, orders and reporting with a secure, enterprise-grade platform — designed and developed by Unitec for Vismass.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                {!auth.user && (
                                    <>

                                        {/* {canRegister ? (
                                            <Link
                                                href={register()}
                                                className="inline-flex items-center px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
                                            >
                                                Get started
                                            </Link> */}
                                        {/* ) : ( */}
                                            <Link
                                                href={login()}
                                                className="inline-flex items-center px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
                                            >
                                                Sign in
                                            </Link>
                                        {/* )} */}

                                        {/* <Link
                                            href={login()}
                                            className="mt-2 sm:mt-0 sm:ml-3 inline-flex items-center px-5 py-3 text-sm font-medium bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/12 transition-all"
                                        >
                                            Learn more
                                        </Link> */}
                                    </>
                                )}

                                {auth.user && (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex items-center px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
                                    >
                                        Go to Dashboard
                                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </Link>
                                )}
                            </div>

                            <div className="mt-6 text-sm text-white/70">
                                <span>Developed by </span>
                                <a href="https://www.unitecsoftware.lk" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Unitec Software Solutions</a>
                                <span className="mx-2">•</span>
                                <span>Delivered to </span>
                                <a href="https://www.vismass.lk" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Vismass</a>
                            </div>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                            {/* Feature 1 */}
                            <div className="bg-white text-slate-900 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-300 border border-white/10">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mb-4 shadow-md shadow-indigo-900/30">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold mb-2">Inventory Management</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Track stock levels, manage products, and automate reordering with real-time inventory insights.</p>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-white text-slate-900 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-300 border border-white/10">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mb-4 shadow-md shadow-emerald-900/20">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold mb-2">Sales & Invoicing</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Generate professional invoices, track sales, and manage customer payments effortlessly.</p>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-white text-slate-900 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-300 border border-white/10">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4 shadow-md shadow-purple-900/20">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold mb-2">Purchase Orders</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Manage supplier orders, track deliveries, and maintain optimal stock levels automatically.</p>
                            </div>

                            {/* Feature 4 */}
                            <div className="bg-white text-slate-900 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-300 border border-white/10">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center mb-4 shadow-md shadow-orange-900/20">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold mb-2">Analytics & Reports</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Gain insights with comprehensive reports, sales analytics, and profit tracking.</p>
                            </div>

                            {/* Feature 5 */}
                            <div className="bg-white text-slate-900 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-300 border border-white/10">
                                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center mb-4 shadow-md shadow-teal-900/20">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold mb-2">Customer Management</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Build relationships with detailed customer profiles, order history, and communication tools.</p>
                            </div>

                            {/* Feature 6 */}
                            <div className="bg-white text-slate-900 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-300 border border-white/10">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center mb-4 shadow-md shadow-yellow-900/20">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold mb-2">Secure & Reliable</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Enterprise-grade security with role-based access control and data encryption.</p>
                            </div>
                        </div>

                        {/* About / Credits */}
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                <h4 className="text-white font-semibold mb-2">Developed by Unitec</h4>
                                <p className="text-sm text-white/70 mb-3">Unitec Software Solutions designed and built this system. Learn more and view their services.</p>
                                <a href="https://www.unitecsoftware.lk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-semibold text-white/90 hover:text-white underline">www.unitecsoftware.lk</a>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                                <h4 className="text-white font-semibold mb-2">Delivered to Vismass</h4>
                                <p className="text-sm text-white/70 mb-3">This distribution system is provided to Vismass for their business operations.</p>
                                <a href="https://www.vismass.lk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-semibold text-white/90 hover:text-white underline">www.vismass.lk</a>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 shadow-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-white">
                                <div>
                                    <div className="text-3xl font-bold mb-1">99.9%</div>
                                    <div className="text-blue-100 text-sm">Uptime Guarantee</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold mb-1">24/7</div>
                                    <div className="text-blue-100 text-sm">Customer Support</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold mb-1">500+</div>
                                    <div className="text-blue-100 text-sm">Happy Businesses</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="bg-transparent border-t border-white/10 mt-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-white/80">
                            <div className="text-center md:text-left">
                                <p className="text-sm font-semibold text-white">Unitec Software Solutions</p>
                                <p className="text-xs mt-1">&copy; {new Date().getFullYear()} All rights reserved.</p>
                            </div>

                            <div className="text-center md:text-right text-sm">
                                <div className="mb-1">Built by <a href="https://www.unitecsoftware.lk" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Unitec</a></div>
                                <div>Delivered to <a href="https://www.vismass.lk" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Vismass</a></div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}