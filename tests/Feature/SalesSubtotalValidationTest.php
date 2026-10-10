<?php

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('it throws validation error when submitted subtotal does not match calculated items subtotal', function () {
    \Illuminate\Support\Facades\Gate::before(function () {
        return true;
    });
    $role = Role::where('slug', 'cashier')->first() ?? Role::create(['name' => 'Cashier', 'slug' => 'cashier', 'level' => 'section_user', 'guard_name' => 'web']);
    $perm = Permission::where('slug', 'sales.create')->first() ?? Permission::create(['name' => 'sales.create', 'slug' => 'sales.create', 'uuid' => (string) \Illuminate\Support\Str::uuid(), 'guard_name' => 'web']);
    $role->permissions()->attach($perm->id);

    $user = User::factory()->create();
    $user->role_id = $role->id;
    $user->company_code = 'TESTCO';
    $user->section_code = 'SEC1';
    $user->save();
    
    \App\Models\Company::factory()->create(['company_code' => 'TESTCO']);
    \App\Models\Section::factory()->create([
        'company_code' => 'TESTCO',
        'section_code' => 'SEC1',
    ]);
    
    $this->withoutMiddleware([\App\Http\Middleware\CheckDayOpeningBalance::class]);

    $payload = [
        'transaction_date' => now()->format('Y-m-d'),
        'customer_code' => '0001',
        'customer_name' => 'cash',
        'price_type' => 'retail',
        'payment_mode' => 'cash',
        'subtotal' => 500, // Invalid subtotal (does not match 1 * 180)
        'total_amount' => 500,
        'discount_amount' => 0,
        'discount_percentage' => 0,
        'tax_amount' => 0,
        'cash_payment' => 500,
        'items' => [
            [
                'item_code' => 'TEST-001',
                'quantity' => 1,
                'unit_price' => 180, // Subtotal should be 180
                'total' => 180,
                'discount_amount' => 0,
                'vat_inclusive' => false,
            ]
        ]
    ];

    $response = $this->actingAs($user)->postJson('/sales', $payload);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('subtotal');
    
    // Test that it passes when subtotal matches
    $payload['subtotal'] = 180;
    $payload['total_amount'] = 180;
    $payload['cash_payment'] = 180;
    
    // We expect it might fail on something else (like item not existing), but it shouldn't fail on subtotal validation
    $response2 = $this->actingAs($user)->postJson('/sales', $payload);
    
    $response2->assertJsonMissingValidationErrors('subtotal');
});
