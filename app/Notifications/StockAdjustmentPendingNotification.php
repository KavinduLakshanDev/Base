<?php

namespace App\Notifications;

use App\Models\StockAdjustment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class StockAdjustmentPendingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public StockAdjustment $adjustment
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $target = $this->adjustment->section
            ? $this->adjustment->section->name
            : ($this->adjustment->vehicle->name ?? 'Unknown');

        return [
            'adjustment_id' => $this->adjustment->id,
            'adjustment_number' => $this->adjustment->adjustment_number,
            'batch_no' => $this->adjustment->batch_no,
            'target_name' => $target,
            'target_type' => $this->adjustment->vehicle_id ? 'vehicle' : 'warehouse',
            'total_amount' => $this->adjustment->total_amount,
            'items_count' => $this->adjustment->items->count(),
            'recorded_by' => $this->adjustment->recorder->name ?? 'Unknown',
            'message' => "Stock adjustment {$this->adjustment->adjustment_number} is pending your approval",
        ];
    }
}
