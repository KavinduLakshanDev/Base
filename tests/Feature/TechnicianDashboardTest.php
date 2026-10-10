<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\ServiceJob;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use Inertia\Testing\AssertableInertia as Assert;

class TechnicianDashboardTest extends TestCase
{
    use DatabaseTransactions;

    public function test_technician_can_view_dashboard_with_correct_stats()
    {
        // Create Technician Role and User
        $technicianRole = Role::factory()->create(['slug' => 'technician', 'name' => 'Technician']);
        $technician = User::factory()->create([
            'role_id' => $technicianRole->id,
            'user_type' => 'company_user' 
        ]);

        // Create some jobs
        // 1. Job assigned to this technician (Active)
        ServiceJob::factory()->create([
            'assigned_technician_id' => $technician->id,
            'status' => 'assigned',
        ]);

        // 2. Job pending (Unassigned)
        ServiceJob::factory()->create([
            'assigned_technician_id' => null,
            'status' => 'pending',
        ]);

        // 3. Job completed by this technician today
        ServiceJob::factory()->create([
            'assigned_technician_id' => $technician->id,
            'status' => 'completed',
            'updated_at' => now(),
        ]);

        // 4. Job assigned to ANOTHER technician (Should not be counted in "My Active")
        $otherTechnician = User::factory()->create();
        ServiceJob::factory()->create([
            'assigned_technician_id' => $otherTechnician->id,
            'status' => 'assigned',
        ]);

        $response = $this->actingAs($technician)->get(route('dashboard'));

        $response->assertStatus(200);
        
        $response->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('role', 'technician')
            ->has('stats', fn (Assert $json) => $json
                ->where('active_jobs_count', 1) // Only the one assigned to me
                ->where('pending_jobs_count', 1) // Only the unassigned pending one
                ->where('completed_today_count', 1) // Only the one completed today
                ->has('my_active_jobs', 1)
                ->has('available_jobs', 1)
                ->etc()
            )
        );
    }

    public function test_non_technician_cannot_see_technician_stats()
    {
        $user = User::factory()->create(['user_type' => 'company_user']); // Default user, no role or different role
        
        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->missing('role') // Should not have 'role' => 'technician' if not technician or cashier permission
             // Note: If they have sales.view they see cashier dashboard, otherwise generic dashboard
        );
    }
}
