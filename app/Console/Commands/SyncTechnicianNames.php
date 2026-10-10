<?php

namespace App\Console\Commands;

use App\Models\ServiceJob;
use Illuminate\Console\Command;

class SyncTechnicianNames extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:technician-names {--dry-run : Show what would be updated without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync technician names in service jobs table with current technician data';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        if ($dryRun) {
            $this->info('DRY RUN MODE - No changes will be made');
        }
        
        $this->info('Starting technician name synchronization...');
        
        // Get all service jobs with assigned technicians
        $jobs = ServiceJob::with('technician')
            ->whereNotNull('assigned_technician_id')
            ->get();
        
        $this->info("Found {$jobs->count()} service jobs with assigned technicians");
        
        $updated = 0;
        $errors = 0;
        
        $progressBar = $this->output->createProgressBar($jobs->count());
        $progressBar->start();
        
        foreach ($jobs as $job) {
            try {
                $currentName = $job->getOriginal('technician_name'); // Get from database
                
                // Get the correct technician name
                $correctName = null;
                if ($job->technician) {
                    $correctName = trim($job->technician->first_name . ' ' . $job->technician->last_name);
                }
                
                // Check if update is needed
                if ($currentName !== $correctName) {
                    if (!$dryRun) {
                        $job->technician_name = $correctName;
                        $job->save();
                    }
                    
                    $updated++;
                    
                    if ($dryRun) {
                        $this->line("Would update Job {$job->job_number}: '{$currentName}' -> '{$correctName}'");
                    }
                }
                
            } catch (\Exception $e) {
                $errors++;
                $this->error("Error updating job {$job->job_number}: " . $e->getMessage());
            }
            
            $progressBar->advance();
        }
        
        $progressBar->finish();
        $this->newLine(2);
        
        if ($dryRun) {
            $this->info("DRY RUN COMPLETE: {$updated} jobs would be updated, {$errors} errors");
        } else {
            $this->info("SYNC COMPLETE: {$updated} jobs updated, {$errors} errors");
            
            // Also update the accessor to ensure future queries return correct names
            $this->info("Note: Technician names will now be dynamically fetched from the users table for accuracy.");
        }
        
        if ($errors > 0) {
            $this->warn("Some jobs could not be updated. Check the error messages above.");
        }
        
        return $errors > 0 ? 1 : 0; // Command complete
    }
}
