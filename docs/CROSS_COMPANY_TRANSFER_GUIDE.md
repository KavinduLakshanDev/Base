# Cross-Company Stock Transfer System - Implementation Guide

## Overview
This document describes the enhanced cross-company stock transfer system implemented to handle stock movements between sections belonging to different companies (e.g., VISMASS and MALIBO).

## Key Features

### 1. **Ownership Tracking**
- **`company_code`**: Represents the physical location/section company where stock currently resides
- **`owner_company_code`**: Tracks the true ownership of the stock (preserved during transfers)

This separation ensures:
- Accurate inventory reporting per company
- Clear audit trails for cross-company movements
- Proper ownership attribution for accounting purposes

### 2. **Permission System**
Two levels of permissions:
- **`stock.transfer`**: Basic permission for same-company transfers
- **`stock.cross_company_transfer`**: Special permission required for cross-company transfers

### 3. **Audit Trail**
All cross-company transfers are logged with:
- User who initiated the transfer
- Source and destination companies
- Timestamp and transfer details
- Number of items transferred

## Database Schema Changes

### Migration: `2026_02_17_100000_add_owner_company_to_stock_in_hand.php`
```sql
ALTER TABLE stock_in_hand ADD COLUMN owner_company_code VARCHAR(10) NOT NULL;
ALTER TABLE stock_in_hand ADD INDEX idx_owner_company (owner_company_code);
```

### Migration: `2026_02_17_100001_add_cross_company_transfer_permission.php`
```sql
INSERT INTO permissions (name, slug, description) VALUES 
('Cross-Company Stock Transfer', 'stock.cross_company_transfer', 
 'Allows transferring stock between sections belonging to different companies');
```

## How It Works

### Stock Transfer Flow

1. **Validation Phase**
   - Check if transfer is cross-company
   - Verify user has appropriate permissions
   - Validate stock availability in source section
   - Use batch's `company_code` for accurate stock queries

2. **Transfer Execution**
   - Create OUT entry in source section with:
     - `company_code` = source section's company (location)
     - `owner_company_code` = original owner (preserved)
   - Create IN entry in destination section with:
     - `company_code` = destination section's company (new location)
     - `owner_company_code` = original owner (preserved)

3. **Audit Logging**
   - Log all cross-company transfers
   - Track user, timestamp, companies involved
   - Store product details for historical reference

### Example Scenario

**Transfer from VISMASS Main Stock to MALIBO Service**

1. Initial stock in VISMASS Main Stock:
   ```
   company_code: VISMASS
   owner_company_code: VISMASS
   section_code: MS001
   Qty: 100
   ```

2. After transfer to MALIBO Service:
   
   **OUT Entry (VISMASS)**:
   ```
   company_code: VISMASS (location)
   owner_company_code: VISMASS (owner)
   section_code: MS001
   Qty: -50
   TrnTyp: OUT
   ```

   **IN Entry (MALIBO)**:
   ```
   company_code: MALIBO (new location)
   owner_company_code: VISMASS (original owner preserved)
   section_code: SV001
   Qty: 50
   TrnTyp: IN
   ```

## Benefits

### 1. **Data Integrity**
- No duplicate inventory counting
- Clear ownership attribution
- Accurate cross-company reporting

### 2. **Audit Compliance**
- Complete transfer history
- User accountability
- Inter-company transaction tracking

### 3. **Business Flexibility**
- Support for multi-company operations
- Flexible stock sharing between entities
- Centralized inventory management

### 4. **Security**
- Permission-based access control
- Audit logging for sensitive operations
- Prevention of unauthorized transfers

## Potential Issues & Mitigations

### Issue 1: Complex Reporting
**Problem**: Stock reports need to distinguish between location and ownership

**Mitigation**:
- Use `company_code` for location-based reports (what's physically in your warehouse)
- Use `owner_company_code` for ownership reports (what you own)
- Provide both views in inventory dashboards

### Issue 2: Stock Validation Complexity
**Problem**: Need to check stock in correct company context

**Mitigation**:
- Always use batch's `company_code` for validation queries
- Add section validation to ensure batch is in source section
- Lock records during validation to prevent race conditions

### Issue 3: User Confusion
**Problem**: Users may not understand ownership vs. location

**Mitigation**:
- Clear UI indicators for cross-company transfers (badges, warnings)
- Training documentation for users
- Warning messages during cross-company transfer attempts

## Best Practices

### For Developers
1. **Always check both company_code and owner_company_code** when querying stock
2. **Log all cross-company operations** for audit purposes
3. **Use transactions** for all transfer operations
4. **Validate permissions** before allowing cross-company transfers

### For Administrators
1. **Grant cross-company permissions carefully** - only to trusted users
2. **Review transfer logs regularly** for unusual patterns
3. **Set up alerts** for high-value cross-company transfers
4. **Periodic reconciliation** between company records

### For Users
1. **Verify destination section** before confirming transfers
2. **Add detailed notes** for cross-company transfers
3. **Double-check quantities** - cross-company errors are harder to reverse
4. **Contact administrator** if cross-company permission is denied

## Reporting Queries

### Check Owned Stock (by ownership)
```sql
SELECT SUM(Qty) as owned_qty
FROM stock_in_hand
WHERE owner_company_code = 'VISMASS'
  AND ItemKy = ?
GROUP BY ItemKy;
```

### Check Physical Stock (by location)
```sql
SELECT SUM(Qty) as physical_qty
FROM stock_in_hand
WHERE company_code = 'VISMASS'
  AND section_code = 'MS001'
  AND ItemKy = ?
GROUP BY ItemKy;
```

### Find Cross-Company Stock
```sql
SELECT *
FROM stock_in_hand
WHERE company_code != owner_company_code
  AND Qty > 0;
```

## Migration Guide

### Before Running Migrations
1. **Backup your database**
2. **Check disk space** - backfill can be space-intensive
3. **Schedule during low-traffic period**

### After Running Migrations
1. **Verify data integrity**:
   ```sql
   SELECT COUNT(*) FROM stock_in_hand WHERE owner_company_code IS NULL;
   -- Should return 0
   ```

2. **Test cross-company transfers** in staging environment

3. **Grant permissions** to appropriate users

4. **Monitor logs** for the first few days

## Troubleshooting

### Transfer Fails with "Insufficient stock"
- Check that stock exists in the batch's `company_code`, not just section's company
- Verify batch is actually in the source section
- Check for concurrent transfers (race conditions)

### Permission Denied for Cross-Company Transfer
- Verify user has `stock.cross_company_transfer` permission
- Check if role has the permission assigned
- Review audit logs for denied attempts

### Missing Product Details
- Ensure migration has populated `item_code` and `item_name`
- Check that product exists in source company
- Verify fallback logic is working in frontend

## Future Enhancements

1. **Transfer Approval Workflow**
   - Require manager approval for high-value cross-company transfers
   - Email notifications for pending approvals

2. **Advanced Reporting**
   - Dashboard showing stock owned vs. stock held
   - Cross-company transfer analytics
   - Cost allocation for inter-company charges

3. **Automated Reconciliation**
   - Daily reports of cross-company stock positions
   - Alerts for discrepancies
   - Automatic inter-company invoicing

4. **Transfer Limits**
   - Set maximum transfer amounts per user/role
   - Daily/monthly transfer quotas
   - Automatic escalation for large transfers

## Support

For issues or questions regarding cross-company transfers:
1. Check this documentation first
2. Review audit logs for error details
3. Contact system administrator
4. Escalate to development team if needed

## Version History

- **v1.0.0** (2026-02-17): Initial implementation
  - Added ownership tracking
  - Implemented permission system
  - Enhanced audit logging
  - Updated UI for cross-company visibility
