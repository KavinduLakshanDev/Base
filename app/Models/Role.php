<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'level',
        'company_code',
        'section_code',
        'is_system_role',
        'uuid',
    ];

    protected $casts = [
        'is_system_role' => 'boolean',
    ];

    protected $with = ['permissions'];

    // automatically append computed attributes when model is cast to array/json
    protected $appends = ['level_label'];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    public function users(): HasMany
    {
        // Users have a role_id column on users table, not a role_user pivot table
        return $this->hasMany(User::class, 'role_id', 'id');
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions', 'role_id', 'permission_id')
                    ->withTimestamps();
    }

    /**
     * Mapping of valid access levels to their human readable labels.
     */
    public static function accessLevels(): array
    {
        return [
            'super_admin'   => 'Super Admin',
            'company_admin' => 'Company Admin',
            'branch_admin'  => 'Branch Admin',
            'technician'    => 'Technician',
            'sales_rep'     => 'Sales Rep',
            'cashier'       => 'Cashier',
            'user'          => 'User',
            'section_user'  => 'Section User', // legacy / generic
        ];
    }

    /**
     * Accessor for level_label attribute used by Inertia/JSON.
     */
    public function getLevelLabelAttribute(): string
    {
        return static::accessLevels()[$this->level] ?? $this->level;
    }

    /**
     * Return a CSS colour (or other identifier) appropriate for the level.  This
     * is just an example of using `match`; call it wherever you need a badge
     * colour or icon name.
     */
    public function levelColor(): string
    {
        return match ($this->level) {
            'super_admin' => 'red',
            'company_admin' => 'blue',
            'branch_admin' => 'indigo',
            default => 'gray',
        };
    }
}
