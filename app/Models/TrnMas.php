<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrnMas extends Model
{
    use HasFactory;

    protected $table = 'trn_mas';
    
    protected $primaryKey = 'TrnKy';

    public $timestamps = false;

    protected $fillable = [
        'company_code',
        'section_code',
        'TrnDt',
        'TrnNo',
        'TrnTypKy',
        'Amt',
        'AdrKy',
        'AccKy',
        'Des',
        'EntUsr',
        'EntDtm',
        'Status',
        'fnAct',
    ];

    protected $casts = [
        'TrnDt' => 'datetime',
        'EntDtm' => 'datetime',
        'fnAct' => 'boolean',
        'Amt' => 'decimal:2',
    ];
}
