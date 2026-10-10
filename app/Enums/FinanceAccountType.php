<?php

namespace App\Enums;

enum FinanceAccountType: string
{
    case CASH = 'cash';
    case CHEQUE = 'cheque';
    case ONLINE = 'online';
    case QR_PAYMENT = 'qr_payment';
    // case PETTY_CASH = 'petty_cash';
    // case DELIVERY_PETTY_CASH = 'delivery_petty_cash';
}
