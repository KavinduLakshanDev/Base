import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { ArrowLeft, Printer, CreditCard, Banknote, Gift, User, Phone, MapPin, Calendar, Hash, Edit as EditIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SaleItem {
    id: number;
    item_code: string;
    item_name: string;
    unit_price: string | number;
    our_price: string | number;
    quantity: string | number;
    line_total: string | number;
    discount_amount?: string | number;
    tax_amount?: string | number;
    serial_number?: string;
    brand?: string;
    model?: string;
    warranty?: string;
    barcode?: string;
    cus_discount_rate?: number;
    free_quantity?: string | number;
}

interface Payment {
    id: number;
    payment_mode: string;
    method?: string;
    amount: string | number;
    payment_date: string;
}

interface Customer {
    AdrCd: string;
    CusNm?: string;
    Addr1?: string;
    Addr2?: string;
    PhonNo?: string;
    vat_no?: string;
}

interface Cashier {
    id: number;
    name: string;
    email: string;
}

interface Company {
    company_name: string;
    address: string;
    phone: string;
    email: string;
    vat_no: string;
}

interface Sale {
    id: number;
    invoice_no: string;
    transaction_date: string;
    customer_name: string;
    customer_code: string;
    total_amount: string | number;
    subtotal: string | number;
    discount_amount: string | number;
    discount_percentage: string | number;
    manual_discount_fixed: string | number;
    tax_amount: string | number;
    balance_amount: string | number;
    vat_rate: string | number;
    is_vat_invoice: boolean;
    payment_details: any;
    status: string;
    price_type: string;
    notes?: string;
    items: SaleItem[];
    payments?: Payment[];
    customer?: Customer;
    cashier?: Cashier;
    total_discount?: string | number;
}

const Show: React.FC<{ sale: Sale; company?: Company }> = ({ sale, company }) => {
    const breadcrumbs = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Sales'), href: '/sales' },
        { title: sale.invoice_no, href: '#' },
    ];

    // Total discount includes both:
    // 1) per-item discounts (shown beside each line)
    // 2) invoice-level discount (stored in sale.discount_amount)
    const itemDiscountTotal = sale.items.reduce((sum, item) => {
        const discount = Number(item.discount_amount || 0);
        const cusDiscount = Number(item.cus_discount_rate || 0);
        // Use discount_amount if present, otherwise check if cus_discount_rate was used
        // However, in our system, discount_amount usually already includes cus_discount_rate
        return sum + (Number.isFinite(discount) ? discount : 0);
    }, 0);

    const invoiceDiscount = Number(sale.discount_amount || 0);
    const fixedDiscount = Number(sale.manual_discount_fixed || 0);
    const percentageDiscountAmount = invoiceDiscount - fixedDiscount;
    
    // Priority: 1. Use stored total_discount, 2. Sum of components, 3. Mathematical difference
    const storedTotalDiscount = Number(sale.total_discount || 0);
    const calculatedTotalDiscount = itemDiscountTotal + invoiceDiscount;
    const diffTotalDiscount = Number(sale.subtotal) - Number(sale.total_amount) + Number(sale.tax_amount);
    
    const totalDiscount = storedTotalDiscount > 0 ? storedTotalDiscount : 
                         (calculatedTotalDiscount > 0 ? calculatedTotalDiscount : Math.max(0, diffTotalDiscount));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Invoice')} ${sale.invoice_no}`} />
            <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/sales">
                        <Button variant="outline" className="w-full sm:w-auto">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            {t('Back to List')}
                        </Button>
                    </Link>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:space-x-2 sm:gap-0">
                        <Button onClick={() => {
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = `/sales/${sale.id}/invoice`;
                            document.body.appendChild(iframe);
                            iframe.onload = () => {
                                setTimeout(() => {
                                    if (document.body.contains(iframe)) {
                                        document.body.removeChild(iframe);
                                    }
                                }, 10000);
                            };
                        }} className="w-full sm:w-auto">
                            <Printer className="w-4 h-4 mr-2" />
                            {t('Print Invoice')}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 rounded-lg border bg-card p-3 sm:space-y-6 sm:p-8 print:border-0 print:p-0">
                    {/* Company Header */}
                    {company && (
                        <div className="border-b pb-4">
                            <h1 className="text-xl font-bold text-vismass-blue sm:text-2xl">{company.company_name}</h1>
                            <p className="text-sm text-muted-foreground">{company.address}</p>
                            <p className="text-sm text-muted-foreground break-all">Tel: {company.phone} | Email: {company.email}</p>
                            {company.vat_no && <p className="text-sm font-medium">VAT No: {company.vat_no}</p>}
                        </div>
                    )}

                    {/* Invoice Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-2xl font-bold uppercase text-vismass-blue sm:text-3xl">{t('Sales Invoice')}</h2>
                            <p className="text-lg font-semibold mt-1">{sale.invoice_no}</p>
                            <div className="mt-2 space-y-1 text-sm">
                                <p className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-medium">{t('Date')}:</span> {new Date(sale.transaction_date).toLocaleDateString('en-GB')}
                                </p>
                                <p className="flex items-center gap-2">
                                    <Hash className="w-4 h-4" />
                                    <span className="font-medium">{t('Price Type')}:</span> {sale.price_type?.toUpperCase()}
                                </p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className={`inline-block px-4 py-2 rounded-lg font-bold text-sm ${sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {sale.status.toUpperCase()}
                            </div>
                            {sale.is_vat_invoice && (
                                <div className="mt-2 bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs font-semibold">
                                    VAT INVOICE ({sale.vat_rate}%)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer & Cashier Info */}
                    <div className="grid grid-cols-1 gap-4 border-y py-4 sm:gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
                                <User className="w-4 h-4" /> {t('Bill To')}
                            </h3>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-base font-bold sm:text-lg">{sale.customer_name}</p>
                                <p className="text-sm text-muted-foreground">{t('Code')}: {sale.customer_code}</p>
                                {sale.customer && (
                                    <>
                                        {sale.customer.Addr1 && (
                                            <p className="text-sm flex items-start gap-1 mt-2">
                                                <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                                                <span>{sale.customer.Addr1}{sale.customer.Addr2 ? ', ' + sale.customer.Addr2 : ''}</span>
                                            </p>
                                        )}
                                        {sale.customer.PhonNo && (
                                            <p className="text-sm flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {sale.customer.PhonNo}
                                            </p>
                                        )}
                                        {sale.customer.vat_no && (
                                            <p className="text-sm font-medium mt-1">VAT No: {sale.customer.vat_no}</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        {sale.cashier && (
                            <div className="space-y-2">
                                <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
                                    <User className="w-4 h-4" /> {t('Cashier')}
                                </h3>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <p className="font-bold">{sale.cashier.name}</p>
                                    <p className="text-sm text-muted-foreground">{sale.cashier.email}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] border-collapse text-left">
                            <thead>
                                <tr className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white">
                                    <th className="py-3 px-4">{t('Item Details')}</th>
                                    <th className="py-3 px-4 text-right">{t('Unit Price')}</th>
                                    <th className="py-3 px-4 text-center">{t('Qty')}</th>
                                    <th className="py-3 px-4 text-center">{t('Free')}</th>
                                    <th className="py-3 px-4 text-right">{t('Discount')}</th>
                                    <th className="py-3 px-4 text-right">{t('Line Total')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sale.items.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div className="font-medium break-words">{item.item_name}</div>
                                            <div className="text-xs text-muted-foreground space-y-0.5">
                                                <div>{t('Code')}: {item.item_code}</div>
                                                {item.barcode && <div>{t('Barcode')}: {item.barcode}</div>}
                                                {item.serial_number && (
                                                    <div className="mt-1 space-y-0.5">
                                                        <div className="font-medium text-blue-600">{t('S/N')}: {item.serial_number}</div>
                                                        {item.brand && <div>{t('Brand')}: {item.brand}</div>}
                                                        {item.model && <div>{t('Model')}: {item.model}</div>}
                                                        {item.warranty && <div className="text-green-600">{t('Warranty')}: {item.warranty}</div>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono">Rs. {Number(item.unit_price).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-center font-semibold">{Number(item.quantity).toFixed(2)}</td>
                                        <td className="py-3 px-4 text-center font-semibold">{Number(item.free_quantity || 0).toFixed(0)}</td>
                                        <td className="py-3 px-4 text-right font-mono text-red-600">
                                            {(() => {
                                                const discountAmount = Number(item.discount_amount || 0);
                                                if (discountAmount > 0) {
                                                    return `- Rs. ${discountAmount.toFixed(2)}`;
                                                } else if (item.cus_discount_rate && Number(item.cus_discount_rate) > 0) {
                                                    return `- Rs. ${Number(item.cus_discount_rate).toFixed(2)}`;
                                                }
                                                return '-';
                                            })()}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-semibold">Rs. {Number(item.line_total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50">
                                
                                <tr className="border-t">
                                    <td colSpan={5} className="py-2 px-4 text-right font-semibold">{t('Subtotal')}</td>
                                    <td className="py-2 px-4 text-right font-mono font-semibold">Rs. {Number(sale.subtotal).toFixed(2)}</td>
                                </tr>
                                {/* {itemDiscountTotal > 0 && (
                                    <tr className="text-red-600">
                                        <td colSpan={4} className="py-2 px-4 text-right font-semibold">{t('Line Item Discounts')}</td>
                                        <td className="py-2 px-4 text-right font-mono font-semibold">- Rs. {itemDiscountTotal.toFixed(2)}</td>
                                    </tr>
                                )} */}
                                {percentageDiscountAmount > 0 && (
                                    <tr className="text-red-600">
                                        <td colSpan={5} className="py-2 px-4 text-right font-semibold">
                                            {t('Discount')} {sale.discount_percentage && Number(sale.discount_percentage) > 0 ? `(${Number(sale.discount_percentage).toFixed(0)}%)` : ''}
                                        </td>
                                        <td className="py-2 px-4 text-right font-mono font-semibold">- Rs. {percentageDiscountAmount.toFixed(2)}</td>
                                    </tr>
                                )}
                                {fixedDiscount > 0 && (
                                    <tr className="text-red-600">
                                        <td colSpan={5} className="py-2 px-4 text-right font-semibold">
                                            {t('Fixed Discount')}
                                        </td>
                                        <td className="py-2 px-4 text-right font-mono font-semibold">- Rs. {fixedDiscount.toFixed(2)}</td>
                                    </tr>
                                )}
                                <tr className={totalDiscount > 0 ? "text-red-600" : "text-gray-400"}>
                                    <td colSpan={5} className="py-2 px-4 text-right font-semibold">{t('Total Discount')}</td>
                                    <td className="py-2 px-4 text-right font-mono font-semibold">- Rs. {totalDiscount.toFixed(2)}</td>
                                </tr>
                                {Number(sale.tax_amount || 0) > 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-2 px-4 text-right font-semibold">{t('Tax/VAT')} ({sale.vat_rate}%)</td>
                                        <td className="py-2 px-4 text-right font-mono font-semibold">Rs. {Number(sale.tax_amount).toFixed(2)}</td>
                                    </tr>
                                )}
                                <tr className="border-t-2 border-vismass-blue">
                                    <td colSpan={5} className="py-3 px-4 text-right text-lg font-bold uppercase">{t('Grand Total')}</td>
                                    <td className="py-3 px-4 text-right text-xl font-black font-mono text-vismass-blue">Rs. {Number(sale.total_amount).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Payment Details */}
                    {(() => {
                        const paymentDetails = typeof sale.payment_details === 'string' 
                            ? JSON.parse(sale.payment_details) 
                            : (sale.payment_details || {});
                            
                        const hasPayments = sale.payments && sale.payments.length > 0;
                        const hasAppliedCredit = Number(paymentDetails.applied_credit || 0) > 0;

                        if (!hasPayments && !hasAppliedCredit) return null;

                        return (
                            <div className="border-t pt-4">
                                <h3 className="font-bold text-sm uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> {t('Payment Details')}
                                </h3>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    {sale.payments?.map((payment, index) => {
                                        const method = payment.method || (payment as any).payment_mode;
                                        return (
                                            <div key={payment.id || index} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-2">
                                                    {method === 'cash' && <Banknote className="w-5 h-5 text-green-600" />}
                                                    {method === 'card' && <CreditCard className="w-5 h-5 text-blue-600" />}
                                                    {method === 'points' && <Gift className="w-5 h-5 text-purple-600" />}
                                                    {method === 'applied_credit' && <CreditCard className="w-5 h-5 text-indigo-600" />}
                                                    {['bank', 'cheque'].includes(method) && <CreditCard className="w-5 h-5 text-slate-600" />}
                                                    <span className="text-sm font-medium capitalize">
                                                        {method === 'applied_credit' ? t('Applied Credit') : method}
                                                    </span>
                                                </div>
                                                <span className={`font-mono font-bold ${method === 'applied_credit' ? 'text-indigo-700' : ''}`}>
                                                    Rs. {Number(payment.amount).toFixed(2)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    
                                    {hasAppliedCredit && (
                                        <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-5 h-5 text-indigo-600" />
                                                <span className="text-sm font-medium capitalize">{t('Applied Credit (POS)')}</span>
                                            </div>
                                            <span className="font-mono font-bold text-indigo-700">Rs. {Number(paymentDetails.applied_credit).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Balance Information */}
                    {Number(sale.balance_amount || 0) > 0 && (
                        <div className={`${sale.status === 'partially_paid' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <span className={`font-semibold ${sale.status === 'partially_paid' ? 'text-yellow-800' : 'text-green-800'}`}>
                                    {sale.status === 'partially_paid' ? t('Outstanding Balance') : t('Change Given')}:
                                </span>
                                <span className={`text-xl font-black font-mono ${sale.status === 'partially_paid' ? 'text-yellow-900' : 'text-green-900'}`}>
                                    Rs. {Number(sale.balance_amount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {sale.notes && (
                        <div className="border-t pt-4">
                            <h3 className="font-bold text-sm uppercase text-muted-foreground mb-2">{t('Notes')}</h3>
                            <p className="text-sm bg-slate-50 p-3 rounded-lg">{sale.notes}</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t pt-4 text-center text-sm text-muted-foreground">
                        <p className="text-xs">
                            {t('Note')}: {t('Line item discounts and invoice discounts are shown separately above.')}
                        </p>
                        <p className="mt-2">{t('Thank you for your business!')}</p>
                        <p className="text-xs mt-1">{t('This is a computer-generated invoice.')}</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Show;
