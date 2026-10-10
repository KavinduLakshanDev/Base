<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class StockConversion extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversion_number',
        'company_code',
        'section_code',
        'item_id',
        'item_code',
        'item_name',
        'stock_id',
        'batch_no',
        'input_quantity',
        'output_quantity',
        'to_batch_no',
        'conversion_factor',
        'reverse',
        'from_unit_id',
        'to_unit_id',
        'from_unit_name',
        'to_unit_name',
        'to_item_id',
        'to_item_code',
        'to_item_name',
        'conversion_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'input_quantity'    => 'decimal:4',
        'output_quantity'   => 'decimal:4',
        'conversion_factor' => 'decimal:4',
        'reverse'           => 'boolean',
        'conversion_date'   => 'date',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->conversion_number)) {
                $seq = Sequence::incrementSequence('STOCK_CONVERSION');
                $model->conversion_number = 'CNV-' . date('Ymd') . '-' . str_pad($seq, 5, '0', STR_PAD_LEFT);
            }
        });
    }

    // ---------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_id', 'ItmKy');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ---------------------------------------------------------------
    // Core conversion logic
    // ---------------------------------------------------------------

    /**
     * Deduct the input quantity from stock and credit the converted output
     * quantity back into the same section.
     *
     * Call this inside a DB::transaction() from the controller.
     */
    public function executeConversion(?string $toBatchNo = null): bool
    {
        $userId = Auth::id() ?? 0;

        // Resolve the source stock_in_hand record
        $sourceStock = $this->stock_id
            ? DB::table('stock_in_hand')->where('TableKy', $this->stock_id)->first()
            : null;

        if (! $sourceStock) {
            // Fallback: pick the earliest positive-qty record for this item/section
            $sourceStock = DB::table('stock_in_hand')
                ->where('section_code', $this->section_code)
                ->where('ItemKy', $this->item_id)
                ->whereRaw('(Qty + COALESCE(FreeQty,0)) > 0')
                ->orderBy('OrdDate', 'asc')
                ->first();
        }

        if (! $sourceStock) {
            throw new \RuntimeException("No stock found for item {$this->item_id} in section {$this->section_code}.");
        }

        $inQty    = (float) $this->input_quantity;
        $outQty   = (float) $this->output_quantity;
        $isReverse = ! empty($this->reverse);

        // For reverse conversions use the RCNV- prefix so the SalesController
        // split-stock logic can distinguish which side is bundles and which is NOS:
        //   RCNV-OUT-{id} = NOS debit (reverse OUT removes NOS units)
        //   RCNV-IN-{id}  = Bundle credit (reverse IN adds bundle units)
        // For normal forward conversions the original CNV- prefix is kept:
        //   CNV-OUT-{id}  = Bundle debit
        //   CNV-IN-{id}   = NOS credit
        $outRefNo = $isReverse ? 'RCNV-OUT-' . $this->id : 'CNV-OUT-' . $this->id;
        $inRefNo  = $isReverse ? 'RCNV-IN-'  . $this->id : 'CNV-IN-'  . $this->id;

        // OUT row — deduct input units
        DB::table('stock_in_hand')->insert([
            'uuid'              => (string) \Illuminate\Support\Str::uuid(),
            'RefNo'             => $outRefNo,
            'company_code'      => $this->company_code,
            'owner_company_code'=> $sourceStock->owner_company_code ?? $this->company_code,
            'section_code'      => $this->section_code,
            'OrdDate'           => $this->conversion_date,
            'ItemKy'            => $this->item_id,
            'batch_no'          => $sourceStock->batch_no,
            'serial_number'     => $sourceStock->serial_number,
            'Qty'               => -$inQty,
            'FreeQty'           => 0,
            'TrnTyp'            => 'OUT',
            'OrdKy'             => $this->id,
            'StkKy'             => null,
            'OrdTypKy'          => null,
            'CounterID'         => $userId,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        // IN row — credit output units
        DB::table('stock_in_hand')->insert([
            'uuid'              => (string) \Illuminate\Support\Str::uuid(),
            'RefNo'             => $inRefNo,
            'company_code'      => $this->company_code,
            'owner_company_code'=> $sourceStock->owner_company_code ?? $this->company_code,
            'section_code'      => $this->section_code,
            'OrdDate'           => $this->conversion_date,
            'ItemKy'            => $this->to_item_id ?: $this->item_id,
            'batch_no'          => $toBatchNo ?: $sourceStock->batch_no,
            'serial_number'     => $sourceStock->serial_number,
            'Qty'               => $outQty,
            'FreeQty'           => 0,
            'TrnTyp'            => 'IN',
            'OrdKy'             => $this->id,
            'StkKy'             => null,
            'OrdTypKy'          => null,
            'CounterID'         => $userId,
            'created_at'        => now(),
            'updated_at'        => now(),
        ]);

        $this->update([
            'batch_no' => $sourceStock->batch_no,
            'to_batch_no' => $toBatchNo ?: $sourceStock->batch_no,
        ]);

        return true;
    }
}
