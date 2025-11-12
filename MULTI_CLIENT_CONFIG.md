# Multi-Client Configuration System

## Overview

The Echo5 Leads platform now supports **client-specific configurations** for stages, users, and other settings. Each tenant (client) can have their own custom pipeline stages and team members.

## Key Features

### 1. **Custom Lead Stages**
- Each client can define their own lead pipeline stages
- Stages are displayed throughout the app (dropdowns, dashboards, reports)
- Stages can be added, removed, and reordered via the Settings page
- **Historical data preserved**: Existing leads keep their current stage values

### 2. **Team Member Management**
- Add/remove team members who can be assigned to leads
- Toggle users active/inactive (inactive users hidden from dropdowns but preserved in data)
- Full names supported (e.g., "Stephanie C.", "Haddie J.")

### 3. **Dynamic Configuration**
- Settings loaded from MongoDB `tenants` collection
- Changes apply immediately across all pages
- No code changes needed when client requirements change

## Open Arms Foster Care Configuration

### Current Stages (as of Amber's feedback):
1. **New** - Initial lead
2. **Contacted** - First contact made
3. **Application Sent** - Application sent to prospect
4. **Application Completed** - Application returned/completed
5. **INTP Approved** - Interstate compact approved
6. **INTP Denied** - Interstate compact denied
7. **Training/Orientation** - In training phase
8. **Home Study** - Home study in progress
9. **Approved** - Approved as foster parent
10. **Denied** - Application denied

### Team Members:
- Baylee
- Destinee
- Stephanie C.
- Haddie J.

## Backend Implementation

### Database Structure

**Tenants Collection:**
```javascript
{
  _id: "uuid",
  name: "Open Arms Foster Care",
  slug: "open-arms",
  config: {
    stages: [
      "new",
      "contacted",
      "application_sent",
      "application_completed",
      // ... etc
    ],
    users: [
      { name: "Baylee", email: "", active: true },
      { name: "Destinee", email: "", active: true },
      // ... etc
    ],
    spamKeywords: ["viagra", "loan", "casino"],
    slaHours: 24
  },
  createdAt: ISODate(...)
}
```

### API Endpoints

**GET /api/tenant/config**
- Returns full tenant configuration (stages, users, settings)
- Authenticated with `X-Tenant-Key` header
- Used by frontend to populate dropdowns and UI

**PUT /api/tenant/config**
- Updates tenant configuration
- Accepts: `stages`, `users`, `spamKeywords`, `slaHours`
- Validates input before saving

## Frontend Implementation

### Settings Page (`/settings`)
- **Lead Stages Section**: Add/remove/reorder stages
- **Team Members Section**: Add/remove users, toggle active/inactive
- **General Settings**: SLA hours, spam keywords
- Real-time save with success/error feedback

### Dynamic Stage/User Loading
All pages that reference stages or users now:
1. Fetch tenant config on mount via `leadsApi.getTenantConfig()`
2. Use dynamic values instead of hardcoded constants
3. Fallback to default stages if config not loaded

**Example Usage:**
```javascript
const [tenantConfig, setTenantConfig] = useState(null);

useEffect(() => {
  async function load() {
    const config = await leadsApi.getTenantConfig();
    setTenantConfig(config);
  }
  load();
}, []);

// Use config.stages in dropdown
{tenantConfig?.stages.map(stage => ...)}
```

## Migration Guide

### For New Clients
1. Run `npm run seed` in backend to create tenant
2. Use Settings page to configure stages and users
3. Or run custom script like `update-openarms-config.js`

### For Existing Clients (Open Arms)
✅ Already configured with Amber's requirements
- Script run: `backend/scripts/update-openarms-config.js`
- **All historical leads preserved** with existing stage values
- New stages available immediately in all dropdowns

## Scripts

### `backend/scripts/update-openarms-config.js`
- Updates Open Arms tenant with specific stages and users
- Run manually: `node scripts/update-openarms-config.js`
- Safe to run multiple times (upsert operation)

### `backend/scripts/seed-tenant.js`
- Creates new tenant with default configuration
- Generates API key (shown once)
- Use for onboarding new clients

## Important Notes

### Historical Data
- ✅ **All existing leads are preserved**
- Leads keep their current `stage` values even if stage name changes
- Frontend displays stage as-is from database
- No data loss when modifying stage list

### Stage Value Format
- Stored in database as lowercase with underscores: `application_sent`
- Displayed in UI as human-readable: "Application Sent"
- Conversion: `.replace(/_/g, ' ')` and capitalize

### User Assignment
- `lead.assignedUserId` currently stores user name as string
- Future enhancement: Use unique user IDs
- Inactive users still visible on leads they're assigned to

## Testing

### Test Stage Configuration
1. Go to `/settings` page
2. Add a new stage (e.g., "Testing Phase")
3. Save settings
4. Verify new stage appears in:
   - Dashboard funnel chart
   - Leads list stage dropdown
   - Lead detail page stage selector
   - Add New Lead form

### Test User Assignment
1. Add a user in Settings (e.g., "Test User")
2. Go to Leads list or Lead detail page
3. Verify user appears in "Assigned To" dropdown
4. Toggle user inactive in Settings
5. Verify user no longer appears in dropdown (but still shows on existing leads)

## Future Enhancements

1. **Custom Fields**: Allow clients to add custom lead fields
2. **Email Integration**: Configure SMTP per tenant
3. **Branding**: Custom logo, colors per tenant
4. **Permissions**: Role-based access control per user
5. **Activity Types**: Custom activity types per tenant
6. **Automation**: Stage-based workflows and notifications

## Support

For questions or issues:
- Check MongoDB `tenants` collection for current config
- Review backend logs for API errors
- Contact development team for script assistance
