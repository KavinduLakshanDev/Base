<?php

use App\Models\Company;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;


it('create stock transfer page returns items with barcode field', function () {
    $user = User::factory()->create(['user_type' => 'super_admin']);
    $company = Company::factory()->create();
    $section = Section::factory()->create(['company_code' => $company->company_code]);
    $user->update(['company_code' => $company->company_code]);

    $this->actingAs($user);

    // create an item with barcode so the controller returns at least one record
    $item = \App\Models\ItemMaster::create([
        'company_code' => $company->company_code,
        'section_code' => $section->section_code,
        'ItemCode' => 'ITM1',
        'ItmNm' => 'Test Item',
        'ItmKy' => 1234, // arbitrary key for uniqueness
        'Status' => 'A',
        'BarCode' => 'BC12345',
    ]);

    $response = $this->get(route('stock-transfers.create'));

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) =>
        $page->component('StockTransfer/Create')
             ->has('sections')
             ->has('items') // ensure items is present
    );

    // inspect props to ensure the items include barcode key and value
    $props = $response->getOriginalContent()->getData()['page']['props'];
    expect($props['items'])->not->toBeEmpty();
    $first = $props['items'][0];
    expect($first)->toHaveKey('barcode');
    expect($first['barcode'])->toEqual('BC12345');
});
