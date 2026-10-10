<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Sequence extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'value',
        'prefix',
    ];

    /**
     * Generate the next number for a given sequence name.
     * This method is thread-safe using database locking.
     *
     * @param string $name
     * @return string
     */
    public static function generateNextNumber($name)
    {
        return DB::transaction(function () use ($name) {
            $sequence = static::where('name', $name)->lockForUpdate()->first();

            if (!$sequence) {
                // If sequence doesn't exist, create it on the fly (fallback)
                $sequence = static::create([
                    'name' => $name,
                    'value' => 0,
                    'prefix' => strtoupper(substr($name, 0, 3)),
                ]);
            }

            $sequence->value++;
            $sequence->save();

            $paddedValue = str_pad($sequence->value, 5, '0', STR_PAD_LEFT);
            
            if ($sequence->prefix) {
                return "{$sequence->prefix}-{$paddedValue}";
            }

            $year = date('Y');
            return "{$year}-{$paddedValue}";
        });
    }

    /**
     * Increment the sequence and return the new integer value.
     * This is useful when custom formatting is required.
     *
     * @param string $name
     * @param callable|null $initializer Optional callback to determine initial value if sequence doesn't exist
     * @return int
     */
    public static function incrementSequence($name, callable $initializer = null)
    {
        // If we are already in a transaction, this lock will hold until the outer transaction commits.
        // If not, we start a new transaction to ensure atomicity of the increment itself.
        return DB::transaction(function () use ($name, $initializer) {
            $sequence = static::where('name', $name)->lockForUpdate()->first();

            if (!$sequence) {
                $initialValue = 0;
                if ($initializer) {
                    $initialValue = $initializer();
                }

                $sequence = static::create([
                    'name' => $name,
                    'value' => $initialValue,
                    'prefix' => strtoupper(substr($name, 0, 3)),
                ]);
            }

            $sequence->value++;
            $sequence->save();

            return $sequence->value;
        });
    }
    /**
     * Get the next sequence value without incrementing.
     * Useful for displaying the "next" number in UIs.
     *
     * @param string $name
     * @return int
     */
    public static function peekNextValue($name)
    {
        $sequence = static::where('name', $name)->first();
        return $sequence ? ($sequence->value + 1) : 1;
    }
}
