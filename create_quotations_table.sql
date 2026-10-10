-- Create quotations table
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_job_id` bigint(20) UNSIGNED NOT NULL,
  `items` json NOT NULL,
  `notes` text DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quotations_service_job_id_foreign` (`service_job_id`),
  KEY `quotations_created_by_foreign` (`created_by`),
  CONSTRAINT `quotations_service_job_id_foreign` FOREIGN KEY (`service_job_id`) REFERENCES `service_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `quotations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert migration record
INSERT INTO `migrations` (`migration`, `batch`) 
VALUES ('2026_01_30_120500_create_quotations_table', (SELECT IFNULL(MAX(batch), 0) + 1 FROM (SELECT * FROM migrations) as m));
