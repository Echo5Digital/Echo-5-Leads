# 🚀 Echo5 Leads Platform - Multi-Tenant Scaling Plan

## 📊 Current State Analysis

### What Works ✅
- **Backend**: Multi-tenant ready with proper tenant isolation
- **Data Model**: Clean separation with `tenantId` in all collections
- **API Keys**: Secure authentication with SHA-256 + encryption for viewing
- **Tenant Switcher**: Global context for switching between clients
- **Admin Features**: Clients CRUD, API key management, analytics, SLA monitoring

### What's Broken 🔴
1. **Settings Page** (`/settings`):
   - Uses `GET /api/tenant/config` (single-tenant endpoint)
   - Should use `GET /api/tenants/:id` (multi-tenant endpoint)
   - Currently edits the ADMIN's own tenant instead of selected client
   - No context awareness of which tenant is selected

2. **Navigation Flow**:
   - "Settings" in sidebar goes to global `/settings`
   - Should go to per-client settings: `/clients/:id/settings`
   
3. **Tenant Context Missing**:
   - Settings page doesn't use `TenantContext`
   - No awareness of currently selected tenant from sidebar

---

## 🎯 Recommended Architecture (Multi-Tenant SaaS)

### User Roles & Access Levels

```
┌─────────────────────────────────────────────────┐
│                 ECHO5 ADMIN                     │
│        (You - Platform Owner)                   │
│                                                 │
│  Can:                                          │
│  ✓ View ALL clients                           │
│  ✓ Create/Delete clients                      │
│  ✓ Manage API keys for any client             │
│  ✓ View analytics for any client              │
│  ✓ Edit settings for any client               │
│  ✓ Switch between clients in sidebar          │
│                                                 │
└─────────────────────────────────────────────────┘
                      ↓
        ┌─────────────────────────────┐
        │   CLIENT 1: Open Arms       │
        │   CLIENT 2: Caring Hearts   │
        │   CLIENT 3: Family First    │
        └─────────────────────────────┘
                      ↓
        ┌─────────────────────────────┐
        │   FUTURE: Client Users      │
        │   (Agency Staff Login)      │
        │                             │
        │  Can:                       │
        │  ✓ View ONLY their leads   │
        │  ✓ Edit ONLY their settings│
        │  ✓ Cannot see other clients│
        └─────────────────────────────┘
```

### Navigation Structure (Recommended)

```
Frontend App Structure:
├── / (redirect to /dashboard or /clients)
├── /dashboard (Global overview of ALL clients)
│   └── Shows: Total leads across all clients, overdue by client, etc.
│
├── /clients (List all clients)
│   └── [id]/ (Single client view)
│       ├── /clients/[id] (Client overview - leads summary)
│       ├── /clients/[id]/leads (Filtered leads for this client)
│       ├── /clients/[id]/analytics (Client-specific analytics)
│       ├── /clients/[id]/settings (Client-specific settings) ⭐ NEW
│       └── /clients/[id]/api-keys (API key management)
│
├── /analytics (Global analytics across ALL clients)
├── /settings (Echo5 platform settings - for YOU as admin)
│   └── Your account, platform config, billing, etc.
│
└── /leads (All leads across ALL clients - with tenant filter)
```

---

## 🛠️ Implementation Plan

### Phase 1: Fix Current Settings Page (Immediate)

**Problem**: `/settings` uses wrong API endpoint

**Solution**: Move to per-client settings

1. **Create**: `/frontend/app/clients/[id]/settings/page.js`
   - Uses `GET /api/tenants/:id` to fetch specific tenant
   - Uses `PUT /api/tenants/:id` to update specific tenant
   - Shows: Stages, SLA Hours, Spam Keywords, Manager Email
   - Add: Meta Access Token, Google Ads config

2. **Update**: Sidebar navigation
   - Remove global "Settings" link
   - Settings accessed per-client: `/clients/[id]` → "Settings" tab

3. **Create**: Echo5 Admin Settings (separate page)
   - `/settings` becomes YOUR admin settings
   - Platform-wide config
   - Your account preferences
   - Future: Billing, subscription management

---

### Phase 2: Enhance Tenant Management (Week 1)

**Goal**: Make tenant switcher more powerful

1. **TenantContext Enhancements**:
   ```javascript
   const { 
     selectedTenant,      // Current tenant object
     switchTenant,        // Change tenant
     tenants,            // All tenants
     isLoading,          // Loading state
     refreshTenants      // Re-fetch tenants
   } = useTenant();
   ```

2. **Dashboard Improvements**:
   - Show stats for ALL tenants (global view)
   - Add "Filter by Tenant" dropdown
   - Show per-tenant breakdowns

3. **Leads Page Enhancement**:
   - Add tenant filter dropdown
   - Default: Show selected tenant's leads
   - Option: "View all leads"

---

### Phase 3: Per-Client Features (Week 2)

**Goal**: Each client gets full feature set

1. **Client Dashboard** (`/clients/[id]`):
   - KPIs for THIS client only
   - Recent leads for THIS client
   - Quick actions (add lead, view analytics)

2. **Client Analytics** (`/clients/[id]/analytics`):
   - Conversion rates for THIS client
   - Source attribution for THIS client
   - Lead velocity for THIS client

3. **Client Settings** (`/clients/[id]/settings`):
   - Pipeline stages (drag-to-reorder)
   - SLA hours
   - Spam keywords
   - Manager email for alerts
   - Meta/Google integration tokens

---

### Phase 4: User Management System (Week 3-4)

**Goal**: Allow clients to have their own logins

1. **Create `users` collection**:
   ```javascript
   {
     _id: ObjectId,
     tenantId: "uuid",
     email: "user@agency.com",
     passwordHash: "bcrypt",
     role: "admin" | "manager" | "agent",
     name: "John Doe",
     active: true,
     permissions: {
       viewLeads: true,
       editLeads: true,
       deleteLeads: false,
       manageSettings: false
     }
   }
   ```

2. **Authentication System**:
   - JWT tokens
   - Login page with email/password
   - Role-based access control (RBAC)
   - Session management

3. **Multi-Level Access**:
   - **Echo5 Admin**: See everything
   - **Client Admin**: See only their tenant
   - **Client Manager**: See assigned leads only
   - **Client Agent**: View-only access

---

### Phase 5: Advanced Features (Future)

1. **Webhook Management**:
   - Per-tenant webhook URLs
   - Retry logic
   - Webhook logs and debugging

2. **Billing & Subscriptions**:
   - Stripe integration
   - Per-tenant plans (Basic, Pro, Enterprise)
   - Usage tracking (leads per month)

3. **White-Label Options**:
   - Custom branding per tenant
   - Custom domain per tenant
   - Custom email templates

4. **Integrations Hub**:
   - Per-tenant API tokens for:
     - Twilio (SMS)
     - SendGrid (Email)
     - Zapier (Automation)
     - Slack (Notifications)

---

## 📋 Immediate Action Items (Today)

### 1. Create Per-Client Settings Page ⭐

**File**: `/frontend/app/clients/[id]/settings/page.js`

**Features**:
- Pipeline stages editor (drag-drop reordering)
- SLA hours input
- Spam keywords editor
- Manager email input
- Meta Access Token (secure input)
- Save button → `PUT /api/tenants/:id`

### 2. Update Sidebar Navigation

**Remove**: Global "Settings" link
**Add**: "Settings" tab in client detail pages

### 3. Create Platform Admin Settings

**File**: `/frontend/app/settings/page.js` (replace current)

**Features**:
- Your account info
- Platform-wide defaults
- System logs viewer
- Future: Billing dashboard

---

## 🎯 Long-Term Vision

```
Echo5 Leads Platform
├── Admin Dashboard (YOU)
│   ├── All Clients Overview
│   ├── Global Analytics
│   ├── System Settings
│   └── Billing & Subscriptions
│
├── Client Portal (Each Agency)
│   ├── Their Leads Only
│   ├── Their Analytics
│   ├── Their Settings
│   ├── Their API Keys
│   └── Their Team (future)
│
└── WordPress Plugin (Each Website)
    ├── Lightweight
    ├── Form → API
    └── Unique API Key per client
```

---

## 🚨 Critical Fixes Needed NOW

1. **Settings Page Context**: Currently broken for multi-tenant
2. **Tenant Awareness**: Routes need to know which tenant is active
3. **Global vs Client-Specific**: Separate concerns clearly

---

## 💡 Best Practices Going Forward

### 1. Always Ask: "Is this per-client or platform-wide?"

- **Per-Client**: Use `/clients/:id/feature`
- **Platform**: Use `/feature` (admin only)

### 2. Use TenantContext Everywhere

```javascript
import { useTenant } from '@/lib/TenantContext';

function MyComponent() {
  const { selectedTenant } = useTenant();
  
  if (!selectedTenant) {
    return <div>Please select a client</div>;
  }
  
  // Use selectedTenant._id for API calls
}
```

### 3. API Consistency

- **Single Tenant**: `GET /api/tenant/config` (deprecated)
- **Multi-Tenant**: `GET /api/tenants/:id` ✅

### 4. Clear Navigation Hierarchy

```
Global → Clients → Specific Client → Feature
   ↓        ↓            ↓              ↓
Dashboard → List → Open Arms → Settings
```

---

## 📊 Metrics to Track

Once scaling is complete:
- Number of active tenants
- Leads per tenant per month
- API calls per tenant
- Storage usage per tenant
- Revenue per tenant (future)

---

## 🎉 Summary

**The Issue**: Started single-tenant, now scaling to multi-tenant SaaS
**The Problem**: Settings page still uses single-tenant mindset
**The Solution**: Reorganize around per-client architecture
**The Benefit**: Each agency gets their own isolated environment

**Next Steps**: Should I implement the per-client settings page now?

---

**Created**: November 13, 2025
**Status**: Ready for Implementation
**Priority**: HIGH (Settings page is broken)
