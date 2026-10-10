<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Log;
use App\Models\Role;

class Permission extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'company_code',
        'section_code',
        'description',
        'uuid',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // After creating a permission, ensure it's assigned to the super_admin role
        static::created(function ($permission) {
            try {
                $role = Role::where('slug', 'super_admin')->first();
                if ($role) {
                    // Attach the permission while keeping existing permissions intact
                    $role->permissions()->syncWithoutDetaching([$permission->id]);
                }
            } catch (\Throwable $e) {
                // Log the issue but don't break permission creation
                Log::error("Failed to auto-assign permission ({$permission->id}) to super_admin: " . $e->getMessage());
            }
        });
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions')
                    ->withTimestamps();
    }
}