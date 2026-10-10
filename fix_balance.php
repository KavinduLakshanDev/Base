<?php
use App\Models\ServiceJob;

// 1. Revert incorrect allocations
ServiceJob::whereIn('job_number', ['SJ000213', 'SJ000214', 'SJ000215', 'SJ000443'])
    ->update(['balance_amount' => 0.00]);

// 2. Apply correct allocations
ServiceJob::where('job_number', 'SJ001571')->update(['balance_amount' => 17000.00]);
ServiceJob::where('job_number', 'SJ001572')->update(['balance_amount' => 2800.00]);
ServiceJob::where('job_number', 'SJ001573')->update(['balance_amount' => 2000.00]);

echo "Fixed balances successfully!\n";

