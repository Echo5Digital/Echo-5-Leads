# 🔌 WordPress Plugin - Comprehensive Scaling & Auto-Capture Plan

## 📋 Current State Analysis

### ✅ What Works
- Settings page with API URL + API Key configuration
- Hooks for 4 major form plugins:
  - Elementor Pro (`elementor_pro/forms/new_record`)
  - Contact Form 7 (`wpcf7_before_send_mail`)
  - WPForms (`wpforms_process_complete`)
  - MetForms (`metform_before_store_form_data`)
- UTM parameter capture from GET/cookies
- Referrer tracking (gclid, fbclid)
- Basic field mapping for common fields

### 🔴 Current Problems

1. **NOT Multi-Tenant Ready**
   - Plugin hardcoded for single API key
   - Cannot serve multiple agencies on same WordPress install
   - Not resellable in current form

2. **Manual Field Mapping**
   - Hardcoded field names (`first_name`, `email`, etc.)
   - Breaks if client uses different field labels
   - Example: "Full Name" vs "Your Name" vs "Name"

3. **Limited Form Support**
   - Only 4 form builders supported
   - Doesn't capture: Gravity Forms, Ninja Forms, Formidable, Fluent Forms, custom forms

4. **No Debugging Tools**
   - Can't see what data was captured
   - Can't test without submitting real forms
   - No form mapping preview

5. **No Field Discovery**
   - Plugin doesn't know what fields exist in forms
   - No automatic detection of new fields
   - Admin must manually match field names

---

## 🎯 Recommended Solution: Universal Form Capture + Auto-Mapping

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    WORDPRESS SITE                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Universal Form Listener                            │  │
│  │  (Captures ALL form submissions via JavaScript)    │  │
│  └─────────────────────────────────────────────────────┘  │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Smart Field Mapper                                 │  │
│  │  - Auto-detects: name, email, phone fields          │  │
│  │  - Pattern matching: "First Name" → first_name      │  │
│  │  - Learning: remembers mappings per form            │  │
│  └─────────────────────────────────────────────────────┘  │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Echo5 API Client                                   │  │
│  │  - Sends to POST /api/ingest/lead                   │  │
│  │  - Includes: UTM, referrer, form_id                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                         ↓                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
          ┌───────────────────────────────┐
          │   Echo5 Backend API           │
          │   (Multi-Tenant)              │
          └───────────────────────────────┘
```

---

## 🚀 Implementation Plan

### **Phase 1: Universal Form Capture (Highest Priority)**

#### Goal: Capture ANY WordPress form submission without hardcoding

#### Approach: JavaScript Listener + PHP Fallback

**JavaScript Approach (Primary)**
```javascript
// Inject on all pages
document.addEventListener('submit', function(e) {
    const form = e.target;
    
    // Detect if it's a lead form (has email or phone)
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Auto-detect email/phone to identify lead forms
    const hasEmail = Object.values(data).some(v => /\S+@\S+\.\S+/.test(v));
    const hasPhone = Object.values(data).some(v => /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(v));
    
    if (hasEmail || hasPhone) {
        // Send to our AJAX endpoint
        sendToEcho5(data, form);
    }
});
```

**PHP Backup Hooks** (for forms that submit via AJAX or prevent default)
- Keep existing hooks for known form builders
- Add generic `wp_insert_post` hook for custom forms
- Add REST API route: `/wp-json/echo5/v1/capture-form`

#### Files to Create:
1. **`assets/js/universal-capture.js`** - JavaScript form listener
2. **`includes/class-form-detector.php`** - Auto-detect form types
3. **`includes/class-ajax-handler.php`** - Handle AJAX submissions

---

### **Phase 2: Smart Field Mapping (Auto-Detection)**

#### Goal: Automatically map ANY field name to Echo5 schema

#### Pattern Matching Rules:

```php
// Field detection patterns
$patterns = [
    'first_name' => [
        '/^first[_-]?name$/i',
        '/^fname$/i',
        '/^given[_-]?name$/i',
        '/^forename$/i',
    ],
    'last_name' => [
        '/^last[_-]?name$/i',
        '/^lname$/i',
        '/^surname$/i',
        '/^family[_-]?name$/i',
    ],
    'email' => [
        '/^e?mail$/i',
        '/^email[_-]?address$/i',
        '/^your[_-]?email$/i',
    ],
    'phone' => [
        '/^phone$/i',
        '/^telephone$/i',
        '/^mobile$/i',
        '/^contact[_-]?number$/i',
        '/^your[_-]?phone$/i',
    ],
    'city' => [
        '/^city$/i',
        '/^location$/i',
        '/^town$/i',
    ],
];
```

#### Value-Based Detection (Fallback):
```php
// If field name unclear, detect by value pattern
if (preg_match('/\S+@\S+\.\S+/', $value)) {
    $field_type = 'email';
} elseif (preg_match('/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/', $value)) {
    $field_type = 'phone';
}
```

#### Learning System:
```php
// Store mappings per form in wp_options
$mappings = [
    'form_123' => [
        'input_1' => 'first_name',
        'input_2' => 'last_name',
        'input_3' => 'email',
        'input_4' => 'phone',
    ],
];
```

#### Files to Create:
1. **`includes/class-field-mapper.php`** - Smart mapping engine
2. **`includes/class-mapping-storage.php`** - Save/load mappings
3. **`admin/form-mapping-ui.php`** - UI to review/edit mappings

---

### **Phase 3: Multi-Tenant Support**

#### Goal: Allow multiple agencies to use same plugin instance

#### Settings Schema Change:

**Current (Single-Tenant):**
```php
get_option('echo5_api_url');    // One URL
get_option('echo5_api_key');    // One key
```

**New (Multi-Tenant):**
```php
// Store as array
$tenants = get_option('echo5_tenants', []);
/*
[
    [
        'id' => 'tenant_1',
        'name' => 'Open Arms Foster Care',
        'api_url' => 'https://backend.vercel.app',
        'api_key' => 'open_523e0520...',
        'forms' => ['form_123', 'form_456'],  // Which forms send to this tenant
        'active' => true,
    ],
    [
        'id' => 'tenant_2',
        'name' => 'Caring Hearts Agency',
        'api_url' => 'https://backend.vercel.app',
        'api_key' => 'caring_f8b1676f...',
        'forms' => ['form_789'],
        'active' => true,
    ],
]
*/
```

#### Form → Tenant Routing:

**Option A: Per-Form Assignment**
- Admin UI: "Form 123 → Send to Open Arms"
- Best for: Multi-agency websites (consultants managing multiple clients)

**Option B: Site-Wide Single Tenant (Default)**
- One API key for entire site
- Best for: Individual agencies using their own site

**Option C: Field-Based Routing**
- Form has hidden field: `<input type="hidden" name="tenant_id" value="open_arms">`
- Best for: Complex multi-brand sites

#### Files to Create:
1. **`includes/class-tenant-manager.php`** - Manage multiple tenants
2. **`admin/tenant-settings-ui.php`** - Add/edit tenants
3. **`includes/class-form-router.php`** - Route forms to correct tenant

---

### **Phase 4: Expanded Form Builder Support**

#### Additional Form Plugins to Support:

1. **Gravity Forms** (23% market share)
   ```php
   add_action('gform_after_submission', [$this, 'capture_gravity_form'], 10, 2);
   ```

2. **Ninja Forms** (8% market share)
   ```php
   add_action('ninja_forms_after_submission', [$this, 'capture_ninja_form'], 10, 1);
   ```

3. **Formidable Forms** (6% market share)
   ```php
   add_action('frm_after_create_entry', [$this, 'capture_formidable_form'], 30, 2);
   ```

4. **Fluent Forms** (Growing popularity)
   ```php
   add_action('fluentform_submission_inserted', [$this, 'capture_fluent_form'], 10, 3);
   ```

5. **Custom HTML Forms** (Via JavaScript capture)
   - Any `<form>` element submission
   - Detected by universal listener

#### Files to Create:
1. **`includes/integrations/gravity-forms.php`**
2. **`includes/integrations/ninja-forms.php`**
3. **`includes/integrations/formidable-forms.php`**
4. **`includes/integrations/fluent-forms.php`**

---

### **Phase 5: Admin UI Enhancements**

#### New Admin Pages:

**1. Form Discovery Dashboard**
```
┌─────────────────────────────────────────────────────────────┐
│ Forms Detected on Your Site                                 │
├─────────────────────────────────────────────────────────────┤
│ Form ID  │ Form Name         │ Plugin      │ Status         │
├──────────┼───────────────────┼─────────────┼────────────────┤
│ form_123 │ Contact Form      │ Elementor   │ ✅ Capturing   │
│ form_456 │ Foster Inquiry    │ WPForms     │ ✅ Capturing   │
│ form_789 │ Newsletter Signup │ CF7         │ ⚠️ No Email    │
└─────────────────────────────────────────────────────────────┘
```

**2. Field Mapping Manager**
```
┌─────────────────────────────────────────────────────────────┐
│ Form: Contact Form (form_123)                               │
├─────────────────────────────────────────────────────────────┤
│ Form Field Name     │ Detected As     │ Maps To            │
├─────────────────────┼─────────────────┼────────────────────┤
│ input_1             │ "Your Name"     │ → first_name       │
│ input_2             │ "Email Address" │ → email            │
│ input_3             │ "Phone Number"  │ → phone            │
│ input_4             │ "City"          │ → city             │
├─────────────────────┴─────────────────┴────────────────────┤
│ [Preview Mapping] [Save Changes] [Test Submission]         │
└─────────────────────────────────────────────────────────────┘
```

**3. Test Submission Tool**
```
┌─────────────────────────────────────────────────────────────┐
│ Test API Connection                                         │
├─────────────────────────────────────────────────────────────┤
│ API URL: https://backend.vercel.app ✅ Connected            │
│ API Key: open_523e05... ✅ Valid                            │
│                                                             │
│ Test Form Data:                                             │
│ First Name: [John            ]                             │
│ Last Name:  [Doe             ]                             │
│ Email:      [john@test.com   ]                             │
│ Phone:      [555-1234        ]                             │
│                                                             │
│ [Send Test Lead] ← Click to test                           │
│                                                             │
│ Result: ✅ Lead created successfully! Lead ID: 6736...     │
└─────────────────────────────────────────────────────────────┘
```

**4. Activity Log**
```
┌─────────────────────────────────────────────────────────────┐
│ Recent Form Submissions                                     │
├─────────────────────────────────────────────────────────────┤
│ Time       │ Form      │ Email            │ Status          │
├────────────┼───────────┼──────────────────┼─────────────────┤
│ 2m ago     │ form_123  │ john@test.com    │ ✅ Sent         │
│ 15m ago    │ form_456  │ jane@test.com    │ ✅ Sent         │
│ 1h ago     │ form_123  │ bob@test.com     │ ❌ API Error    │
└─────────────────────────────────────────────────────────────┘
[View Details] [Export Log]
```

#### Files to Create:
1. **`admin/forms-dashboard.php`** - Overview of all forms
2. **`admin/field-mapper-ui.php`** - Visual field mapping
3. **`admin/test-connection.php`** - API testing tool
4. **`admin/activity-log.php`** - Submission history

---

### **Phase 6: Advanced Features**

#### 1. **Conditional Field Mapping**
```php
// Example: Different mappings based on form type
if ($form_name === 'Quick Contact') {
    // Simple mapping
    $mapping = ['name' => 'first_name', 'email' => 'email'];
} elseif ($form_name === 'Foster Application') {
    // Detailed mapping
    $mapping = [
        'applicant_first' => 'first_name',
        'applicant_last' => 'last_name',
        'have_kids' => 'have_children',
        'plan_to_foster' => 'planning_to_foster',
    ];
}
```

#### 2. **Custom Field Support**
```php
// Allow sending custom fields to originalPayload
$payload = [
    'first_name' => '...',
    'email' => '...',
    // Custom fields go into custom_fields object
    'custom_fields' => [
        'preferred_contact_time' => 'evening',
        'number_of_bedrooms' => '3',
        'pet_friendly' => 'yes',
    ],
];
```

#### 3. **Form Submission Tracking**
```php
// Store in wp_options for last 100 submissions
$submissions = [
    [
        'timestamp' => '2024-11-13 10:30:00',
        'form_id' => 'form_123',
        'email' => 'john@test.com',
        'status' => 'success',
        'response' => ['lead_id' => '6736...'],
    ],
];
```

#### 4. **Spam Detection Integration**
```php
// Check against tenant's spam keywords before sending
$spam_keywords = ['viagra', 'loan', 'casino'];
$is_spam = false;

foreach ($payload as $value) {
    foreach ($spam_keywords as $keyword) {
        if (stripos($value, $keyword) !== false) {
            $is_spam = true;
            break 2;
        }
    }
}

if ($is_spam) {
    $payload['spam_flag'] = true;
}
```

#### 5. **UTM Cookie Persistence**
```javascript
// Store UTM params in cookies for 30 days
if (window.location.search) {
    const params = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
        if (params.has(param)) {
            document.cookie = `${param}=${params.get(param)}; max-age=2592000; path=/`;
        }
    });
}
```

---

## 📦 New Plugin Structure

```
echo5-leads-connector/
├── echo5-leads-connector.php          (Main plugin file)
├── README.md
├── assets/
│   ├── js/
│   │   ├── universal-capture.js       ⭐ NEW: JavaScript form listener
│   │   ├── field-mapper-ui.js         ⭐ NEW: Drag-drop field mapping
│   │   └── utm-tracker.js             ⭐ NEW: UTM cookie persistence
│   └── css/
│       └── admin-styles.css           ⭐ NEW: Admin UI styling
├── includes/
│   ├── class-plugin-core.php          (Main plugin class)
│   ├── class-form-detector.php        ⭐ NEW: Auto-detect forms
│   ├── class-field-mapper.php         ⭐ NEW: Smart field mapping
│   ├── class-mapping-storage.php      ⭐ NEW: Save/load mappings
│   ├── class-tenant-manager.php       ⭐ NEW: Multi-tenant support
│   ├── class-form-router.php          ⭐ NEW: Route forms to tenants
│   ├── class-ajax-handler.php         ⭐ NEW: Handle AJAX requests
│   ├── class-api-client.php           (Send to Echo5 API)
│   ├── class-submission-logger.php    ⭐ NEW: Log submissions
│   └── integrations/
│       ├── elementor.php              (Existing)
│       ├── contact-form-7.php         (Existing)
│       ├── wpforms.php                (Existing)
│       ├── metforms.php               (Existing)
│       ├── gravity-forms.php          ⭐ NEW
│       ├── ninja-forms.php            ⭐ NEW
│       ├── formidable-forms.php       ⭐ NEW
│       └── fluent-forms.php           ⭐ NEW
└── admin/
    ├── settings-page.php              (Existing - Basic settings)
    ├── forms-dashboard.php            ⭐ NEW: Forms overview
    ├── field-mapper-ui.php            ⭐ NEW: Visual mapping
    ├── tenant-settings-ui.php         ⭐ NEW: Multi-tenant config
    ├── test-connection.php            ⭐ NEW: API testing
    └── activity-log.php               ⭐ NEW: Submission history
```

---

## 🎯 Implementation Priority

### **IMMEDIATE (Week 1-2)**
1. ✅ Universal JavaScript form capture
2. ✅ Smart field mapping with pattern matching
3. ✅ Form discovery dashboard
4. ✅ Test connection tool

### **HIGH PRIORITY (Week 3-4)**
5. ✅ Multi-tenant support (multiple API keys)
6. ✅ Field mapping UI (visual mapper)
7. ✅ Additional form builder hooks (Gravity, Ninja, Formidable, Fluent)
8. ✅ Submission activity log

### **MEDIUM PRIORITY (Week 5-6)**
9. ⏳ Custom field support
10. ⏳ Conditional field mapping
11. ⏳ Enhanced UTM tracking with cookie persistence
12. ⏳ Spam detection integration

### **FUTURE ENHANCEMENTS**
13. 🔮 Webhook support (send to other services)
14. 🔮 Form analytics (conversion tracking)
15. 🔮 A/B testing integration
16. 🔮 GDPR compliance tools (consent management)

---

## 🧪 Testing Strategy

### **Unit Tests**
```php
class Test_Field_Mapper extends WP_UnitTestCase {
    public function test_detect_email_field() {
        $mapper = new Echo5_Field_Mapper();
        $field_name = 'your-email';
        $detected = $mapper->detect_field_type($field_name);
        $this->assertEquals('email', $detected);
    }
}
```

### **Integration Tests**
1. Test each form builder:
   - Create test form
   - Submit with known data
   - Verify API receives correct payload

2. Test field mapping:
   - Forms with standard names (first_name, email)
   - Forms with custom names (applicant_name, contact_email)
   - Forms with value-based detection (no clear field names)

3. Test multi-tenant:
   - Multiple API keys configured
   - Different forms route to different tenants
   - API key validation

### **User Acceptance Testing**
1. Install on Open Arms site (production tenant)
2. Test all existing forms still work
3. Verify leads appear in Echo5 admin dashboard
4. Test new admin UI features
5. Measure performance impact (should be < 50ms overhead)

---

## 🚨 Critical Considerations

### **Performance**
- JavaScript listener should be lightweight (< 5KB)
- Only activate on pages with forms (conditional loading)
- Cache field mappings (don't re-detect on every submission)
- Async API calls (don't block form submission)

### **Security**
- Validate all API keys before sending
- Sanitize all form data
- Escape output in admin UI
- Use WordPress nonces for admin actions
- Never expose API keys in JavaScript

### **Backwards Compatibility**
- Existing single-tenant setup must continue working
- Migration script for old settings → new format
- Graceful degradation if API unreachable

### **Error Handling**
- Log errors to WordPress debug.log
- Fallback: Store failed submissions locally
- Retry mechanism for API failures
- Admin notifications for repeated failures

---

## 📊 Success Metrics

### **Technical Metrics**
- ✅ Capture 100% of form submissions (no missed leads)
- ✅ < 100ms overhead per form submission
- ✅ 99.9% API success rate
- ✅ Support 8+ form builders out of the box

### **Business Metrics**
- ✅ Plugin works for Open Arms without any issues
- ✅ Plugin is resellable (multi-tenant ready)
- ✅ < 5 minutes setup time for new agency
- ✅ No WordPress expertise needed (simple config)

### **User Experience Metrics**
- ✅ Admin can see what forms exist on site
- ✅ Admin can test API connection without real submissions
- ✅ Admin can review recent submissions
- ✅ Clear error messages when things fail

---

## 🔄 Migration Path (For Open Arms)

### **Step 1: Backup**
```bash
# Backup current plugin
wp plugin list
wp db export backup.sql
```

### **Step 2: Install New Version**
```bash
# Deactivate old plugin
wp plugin deactivate echo5-leads-connector

# Install new version
wp plugin install echo5-leads-connector-v2.zip
wp plugin activate echo5-leads-connector
```

### **Step 3: Migrate Settings**
```php
// Auto-migration script
$old_api_url = get_option('echo5_api_url');
$old_api_key = get_option('echo5_api_key');

// Convert to new multi-tenant format
$tenants = [
    [
        'id' => 'default',
        'name' => 'Default Tenant',
        'api_url' => $old_api_url,
        'api_key' => $old_api_key,
        'forms' => [], // Empty = all forms
        'active' => true,
    ],
];
update_option('echo5_tenants', $tenants);
```

### **Step 4: Test**
1. Submit test form
2. Check Echo5 dashboard for lead
3. Review activity log in WordPress admin
4. Verify no errors in debug.log

### **Step 5: Monitor**
- Watch for 24-48 hours
- Check lead counts match form submissions
- Review any errors in activity log

---

## 💡 Key Innovation: Zero-Config Auto-Capture

The biggest improvement is **automatic form detection + field mapping**:

### **Before (Current)**
```
1. Agency installs plugin
2. Agency enters API URL + key
3. Agency creates form with EXACT field names:
   - first_name ✅
   - last_name ✅
   - email ✅
4. Form works
```
❌ **Problem**: If they use "Your Name" instead of "first_name", it breaks

### **After (New)**
```
1. Agency installs plugin
2. Agency enters API URL + key
3. Agency creates form with ANY field names:
   - "Your Full Name" ✅ → Auto-detected as first_name
   - "Email Address" ✅ → Auto-detected as email
   - "Phone" ✅ → Auto-detected as phone
4. Plugin auto-maps fields
5. Form works automatically
```
✅ **Benefit**: Works with ANY form, ANY field names, NO configuration

---

## 📝 Next Steps

### **Immediate Action Items**
1. ✅ Review this plan with team
2. ✅ Get approval for Phase 1-2 (universal capture + smart mapping)
3. ✅ Estimate development time (suggest 2-3 weeks)
4. ✅ Create development branch: `feature/universal-form-capture`
5. ✅ Start with JavaScript listener (biggest impact)

### **Questions to Answer**
- Should we support multi-tenant NOW or defer to Phase 3?
- Do we need backwards compatibility with old plugin or fresh start?
- What's the priority: Open Arms stability or new features?
- Should we white-label the plugin for resale?

---

**Author**: Echo5 Digital Development Team  
**Date**: November 13, 2024  
**Status**: Planning Phase - Awaiting Approval
