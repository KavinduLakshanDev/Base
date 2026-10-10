<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Section;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use App\Models\Sequence;
use Illuminate\Support\Facades\Auth;

class StockTransfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'transfer_number',
        'from_section_code',
        'to_section_code',
        'item_id',
        'item_code',
        'stock_id',
        'quantity',
        'cost_price',
        'transfer_date',
        'notes',
        'company_code',
        'batch_no',
        'serial_number',
        'sent_unit_id',
        'received_unit_id',
        'conversion_factor',
        'received_quantity',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'transfer_date' => 'date',
        'item_code' => 'string',
        'warranty' => 'string',
        'sent_unit_id' => 'integer',
        'received_unit_id' => 'integer',
        'conversion_factor' => 'decimal:4',
        'received_quantity' => 'decimal:4',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($transfer) {
            if (empty($transfer->transfer_number)) {
                $transfer->transfer_number = Sequence::generateNextNumber('stock_transfer');
            }
        });
    }

    // Relationships
    public function fromSection(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'from_section_code', 'section_code');
    }

    public function toSection(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'to_section_code', 'section_code');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_id', 'ItmKy');
    }

    // Method to perform the transfer (update stock_in_hand records)
    public function executeTransfer(): bool
    {
        // Note: This method is called within a transaction from the controller
        // No need for nested transactions or additional stock checks since validation
        // with locking already happened in the controller
        //
        // Unit conversion:
        // - $outQty is always in the SENDER's unit (e.g. 5 bundles) — used for the OUT row.
        // - $inQty  is in the RECEIVER's unit (e.g. 50 sheets)     — used for the IN  row.
        // - When received_quantity IS NULL or equals quantity, no conversion applies.

        $userId = Auth::id() ?? 0;

        // Determine OUT/IN quantities with unit conversion support.
        // $outQty = quantity in the SENDER's unit  (e.g. 5 bundles)
        // $inQty  = quantity in the RECEIVER's unit (e.g. 50 sheets)
        // When received_quantity is null or no conversion defined, both are equal.
        $outQty  = (float) $this->quantity;
        $inQty   = ($this->received_quantity !== null)
            ? (float) $this->received_quantity
            : $outQty;

        // Recalculate cost per receiving-unit so total value is preserved.
        // cost_price is stored per sending-unit (e.g. per bundle).
        // Receiving section should see cost-per-sheet = (cost_per_bundle × outQty) / inQty.
        $inCostPrice = ($inQty > 0 && $inQty !== $outQty)
            ? round(($this->cost_price * $outQty) / $inQty, 4)
            : $this->cost_price;

        // Get the source stock record details
        $sourceStock = DB::table('stock_in_hand')->where('TableKy', $this->stock_id)->first();

        // Get company codes for sections
        $fromSectionCompany = Section::where('section_code', $this->from_section_code)->value('company_code');
        $toSectionCompany = Section::where('section_code', $this->to_section_code)->value('company_code');
        
        // Determine ownership: preserve original owner or use batch owner if available
        $ownerCompany = $sourceStock->owner_company_code ?? $sourceStock->company_code ?? $fromSectionCompany;

        // Create OUT record for source section instead of decrementing
        DB::table('stock_in_hand')->insert([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'RefNo' => 'TRF-OUT-' . $this->id,
            'company_code' => $fromSectionCompany, // Location company
            'owner_company_code' => $ownerCompany, // True owner
            'section_code' => $this->from_section_code,
            'OrdDate' => $this->transfer_date,
            'ItemKy' => $this->item_id,
            'batch_no' => $sourceStock->batch_no,
            'serial_number' => $sourceStock->serial_number,
            'Qty' => -$outQty,
            'FreeQty' => 0,
            'TrnTyp' => 'OUT',
            'OrdKy' => $this->id,
            'StkKy' => null,
            'OrdTypKy' => null,
            'CounterID' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Always create a new batch record in destination section
        DB::table('stock_in_hand')->insert([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'RefNo' => 'TRF-IN-' . $this->id,
            'company_code' => $toSectionCompany, // Location company (changes)
            'owner_company_code' => $ownerCompany, // True owner (preserved)
            'section_code' => $this->to_section_code,
            'OrdDate' => $this->transfer_date,
            'ItemKy' => $this->item_id,
            'batch_no' => $sourceStock->batch_no,
            'serial_number' => $sourceStock->serial_number,
            'Qty' => $inQty,
            'FreeQty' => 0,
            'TrnTyp' => 'IN',
            'OrdKy' => $this->id,
            'StkKy' => null,
            'OrdTypKy' => null,
            'CounterID' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ---------------------------------------------------------------
        // Price conversion: when unit conversion is active on a cross-
        // company transfer, create a per-receiving-unit price record for
        // the destination company so that the POS/sales screens show the
        // correct price (e.g. 580 bundle ÷ 100 = 5.80 per sheet).
        // ---------------------------------------------------------------
        $convFactor = (float) ($this->conversion_factor ?? 1);

        if ($convFactor > 1 && $fromSectionCompany !== $toSectionCompany) {
            // Fetch the latest active price record from the source company
            $sourcePriceRecord = DB::table('item_price_det')
                ->where('ItmKy', $this->item_id)
                ->where('company_code', $fromSectionCompany)
                ->where('fInAct', false)
                ->orderByDesc('ChangedDate')
                ->first();

            if ($sourcePriceRecord) {
                // Only insert if the destination company has no active price yet
                $priceAlreadyExists = DB::table('item_price_det')
                    ->where('ItmKy', $this->item_id)
                    ->where('company_code', $toSectionCompany)
                    ->where('fInAct', false)
                    ->exists();

                if (!$priceAlreadyExists) {
                    // Price fields  → divide by factor  (per-bundle → per-sheet)
                    // Qty tier fields → multiply by factor (5 bundles → 500 sheets)
                    // Discount % fields → unchanged (still a percentage)
                    DB::table('item_price_det')->insert([
                        'ItmKy'           => $this->item_id,
                        'ItemCode'        => $sourcePriceRecord->ItemCode ?? '',
                        'CosPri'          => round(($sourcePriceRecord->CosPri ?? 0) / $convFactor, 4),
                        'NCostPrice'      => round(($sourcePriceRecord->NCostPrice ?? 0) / $convFactor, 4),
                        'SlsPri'          => round(($sourcePriceRecord->SlsPri ?? 0) / $convFactor, 4),
                        'WholePrice'      => round(($sourcePriceRecord->WholePrice ?? 0) / $convFactor, 4),
                        'VehicleSalePrice' => round(($sourcePriceRecord->VehicleSalePrice ?? 0) / $convFactor, 4),
                        'RtQty1'          => round(($sourcePriceRecord->RtQty1 ?? 0) * $convFactor, 4),
                        'RtDis1'          => $sourcePriceRecord->RtDis1 ?? 0,
                        'RtQty2'          => round(($sourcePriceRecord->RtQty2 ?? 0) * $convFactor, 4),
                        'RtDis2'          => $sourcePriceRecord->RtDis2 ?? 0,
                        'company_code'    => $toSectionCompany,
                        'section_code'    => $this->to_section_code,
                        'batch_no'        => $sourceStock->batch_no,
                        'Status'          => 'A',
                        'fInAct'          => false,
                        'ChangedDate'     => now(),
                        'created_at'      => now(),
                        'updated_at'      => now(),
                    ]);
                }
            }
        }

        return true;
    }
}