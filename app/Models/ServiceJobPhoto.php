<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ServiceJobPhoto extends Model
{
    use HasFactory;

    protected $fillable = ['service_job_id', 'photo_path', 'original_name'];
    protected $appends = ['url'];

    public function getUrlAttribute()
    {
        return asset('storage/' . $this->photo_path);
    }
}
