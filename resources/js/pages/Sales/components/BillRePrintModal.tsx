import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Printer } from 'lucide-react';
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import axios from 'axios';

interface Transaction {
    id: number;
    invoice_no: string;
    transaction_date: string;
    customer_code: string;
    customer_name: string;
    total_amount: number;
    status: string;
}

interface BillRePrintModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function formatISODate(date: Date | undefined) {
  if (!date) return ""
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date | undefined) {
  if (!date) return ""
  return date.toLocaleDateString('en-GB')
}

function isValidDate(date: Date | undefined) {
  if (!date) return false
  return !isNaN(date.getTime())
}

function DatePickerInput({ value, onChange }: { value: string, onChange: (value: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )
  const [month, setMonth] = React.useState<Date | undefined>(date)

  React.useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (isValidDate(d)) {
        setDate(d)
        setMonth(d)
      }
    } else {
      setDate(undefined)
      setMonth(undefined)
    }
  }, [value])

  const displayValue = date ? formatDisplayDate(date) : ""

  return (
    <div className="relative">
      <div className="flex">
        <Input
          value={displayValue}
          placeholder="DD/MM/YYYY"
          readOnly
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
            }
          }}
          className="flex-1 cursor-pointer"
          onClick={() => setOpen(true)}
        />
        <div className="flex items-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Select date"
              >
                <CalendarIcon />
                <span className="sr-only">Select date</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="end"
              alignOffset={-8}
              sideOffset={10}
            >
              <CalendarComponent
                mode="single"
                selected={date}
                month={month}
                onMonthChange={setMonth}
                onSelect={(selectedDate) => {
                  setDate(selectedDate)
                  setMonth(selectedDate)
                  onChange(formatISODate(selectedDate))
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

const BillRePrintModal: React.FC<BillRePrintModalProps> = ({ isOpen, onClose }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchTransactions();
        }
    }, [isOpen, searchQuery, statusFilter, dateFrom, dateTo]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const response = await axios.get(`/vismass/sales/api/transactions?${params.toString()}`);
            const data = response.data.data || response.data;
            // Ensure data is always an array
            setTransactions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (transaction: Transaction) => {
        // Same approach as Show.tsx "Print Invoice" — open the invoice page in a new tab
        window.open(`/sales/${transaction.id}/invoice`, '_blank', 'noopener,noreferrer');
    };

    const handleView = (transaction: Transaction) => {
        window.open(`/vismass/sales/${transaction.id}`, '_blank');
    };

    // const handleEdit = (transaction: Transaction) => {
    //     window.location.href = `/vismass/sales/${transaction.id}/edit`;
    // };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-none max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center space-x-2">
                        <Printer className="w-5 h-5 text-blue-600" />
                        <DialogTitle className="text-xl font-bold">Bill Re Print</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-gray-500 mt-1">
                        Select a transaction to reprint its bill
                    </DialogDescription>
                </DialogHeader>

                {/* Filters Section */}
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by Invoice No..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <DatePickerInput value={dateFrom} onChange={setDateFrom} />

                        <DatePickerInput value={dateTo} onChange={setDateTo} />
                    </div>
                </div>

                {/* Table Section */}
                <div className="flex-1 overflow-auto mt-4 border rounded-lg">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="border-b">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invoice No</th>
                                {/* <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th> */}
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount (Rs)</th>
                                {/* <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th> */}
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Loading transactions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {transaction.invoice_no}
                                        </td>
                                        {/* <td className="px-4 py-3 text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{formatDate(transaction.transaction_date)}</span>
                                            </div>
                                        </td> */}
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium text-gray-900">{transaction.customer_name}</div>
                                            <div className="text-xs text-gray-500">{transaction.customer_code}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            {Number(transaction.total_amount).toFixed(2)}
                                        </td>
                                        {/* <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td> */}
                                        <td className="px-4 py-2">
                                            <div className="flex items-center justify-center space-x-2">
                                                {/* <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => handleView(transaction)}
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4 text-blue-600" />
                                                    <span className="ml-1 text-xs">View</span>
                                                </Button> */}
                                                {/* <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => handleEdit(transaction)}
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4 text-orange-600" />
                                                </Button> */}
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-8 px-3 bg-gray-900 hover:bg-gray-800 text-white"
                                                    onClick={() => handlePrint(transaction)}
                                                    title="Print"
                                                >
                                                    <Printer className="w-4 h-4 mr-1" />                                   
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="border-t pt-4 flex justify-end">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BillRePrintModal;
