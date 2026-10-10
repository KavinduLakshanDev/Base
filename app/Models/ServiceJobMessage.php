<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ServiceJobMessage extends Model
{
    use HasFactory;

    protected $fillable = ['service_job_id', 'message', 'sent_by'];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
