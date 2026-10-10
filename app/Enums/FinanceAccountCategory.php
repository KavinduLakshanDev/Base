<?php

namespace App\Enums;

enum FinanceAccountCategory: string
{
    case ASSETS = 'assets';
    case LIABILITIES = 'liabilities';
    case EQUITY = 'equity';
    case REVENUE = 'revenue';
    case EXPENSES = 'expenses';
}
