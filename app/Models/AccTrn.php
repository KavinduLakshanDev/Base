<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccTrn extends Model
{
    use HasFactory;

    protected $table = 'acc_trn';

    protected $primaryKey = 'AccTrnKy';

    public $incrementing = true;

    protected $keyType = 'int';

    protected $fillable = [
        'FInAct',
        'Status',
        'TrnKy',
        'AccKy',
        'TrnDt',
        'TrnNo',
        'Amt',
        'VaucherNo',
        'PayTrmKy',
        'ChqueNo',
        'ReferenceNo',
        'BankNm',
        'BranchNm',
        'RBDT',
        'FChqDet',
        'FReturn',
        'RtnDt',
        'Reason',
        'Dec',
        'AccTrnTyp1Ky',
        'AccTrnTyp2Ky',
        'AccTrnTyp3Ky',
        'company_code',
        'section_code',
        'PurKy',
        'uuid',
        'customer_code',
        'customer_name',
        'original_payment_id',
    ];

    protected $casts = [
        'FInAct' => 'boolean',
        'Amt' => 'decimal:2',
        'FChqDet' => 'boolean',
        'FReturn' => 'boolean',
        'TrnDt' => 'datetime',
        'RBDT' => 'datetime',
        'RtnDt' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    /**
     * Get the account master record associated with this transaction.
     */
    public function accMas(): BelongsTo
    {
        return $this->belongsTo(AccMas::class, 'AccKy', 'AccKy');
    }

    /**
     * Get the parent payment transaction if this is a child transaction.
     */
    public function parentPaymentTransaction(): BelongsTo
    {
        return $this->belongsTo(self::class, 'PayTrmKy', 'AccTrnKy');
    }

    /**
     * Get child payment transactions.
     */
    public function childPaymentTransactions()
    {
        return $this->hasMany(self::class, 'PayTrmKy', 'AccTrnKy');
    }
}