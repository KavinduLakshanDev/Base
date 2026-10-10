<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;

class Company extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'company_code',
        'name',
        'contact_person_name',
        'contact_person_number',
        'email',
        'password',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'tax_id',
        'privilege_users_discount',
        'privilege_card_discount',
        'vat_rate',
        'vat_no',
        'vat_effective_date',
        'parent_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'vat_effective_date' => 'date',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class, 'company_code', 'company_code');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Company::class, 'parent_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'parent_id');
    }

    /**
     * Get all accessible sections.
     * If this company has children, include their sections.
     */
    public function getAccessibleSectionsAttribute()
    {
        // Load sections if not already loaded
        if (!$this->relationLoaded('sections')) {
            $this->load('sections');
        }

        // Load children if not already loaded
        if (!$this->relationLoaded('children')) {
            $this->load('children.sections');
        }

        $sections = $this->sections ?? collect();

        foreach ($this->children ?? collect() as $child) {
            $sections = $sections->merge($child->sections ?? collect());
        }

        return $sections;
    }

    /**
     * Get the package details for the company (if exists).
     * This is a placeholder - implement when package system is ready.
     */
    public function packageDetails()
    {
        // TODO: Implement package details relationship when package table is created
        // return $this->hasOne(PackageDetail::class, 'company_code', 'company_code');
        return null;
    }

    public function vatRates(): HasMany
    {
        return $this->hasMany(VatRate::class, 'company_id', 'id');
    }

    /**
     * Check if the company has a specific permission.
     * Company accounts have all permissions by default.
     */
    public function hasPermission($permissionSlug)
    {
        return true;
    }

    /**
     * Check if the company has any of the given permissions.
     */
    public function hasAnyPermission(array $permissions)
    {
        return true;
    }

    /**
     * Dummy role relationship for compatibility.
     */
    public function role()
    {
        return $this->belongsTo(Role::class, 'id', 'id')->whereRaw('1 = 0');
    }

    /**
     * Virtual user_type attribute for frontend compatibility.
     */
    public function getUserTypeAttribute()
    {
        return 'company_admin';
    }

    /**
     * Boot the model.
     */
    protected static function booted(): void
    {
        // When a company's password is updated, sync it with any user sharing the same email
        static::updated(function ($company) {
            if ($company->isDirty('password')) {
                \Illuminate\Support\Facades\DB::table('users')
                    ->where('email', $company->email)
                    ->update(['password' => $company->password]);
            }
        });
    }
}
