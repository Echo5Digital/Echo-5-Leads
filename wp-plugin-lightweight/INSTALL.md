# Echo5 Leads Connector - Installation Guide

## 📦 Quick Install (For Agencies)

### Step 1: Download Plugin
You should have received `echo5-leads-connector.zip` from Echo5 Digital.

### Step 2: Install in WordPress
1. Login to your WordPress admin panel
2. Go to **Plugins → Add New**
3. Click **Upload Plugin** button (top of page)
4. Click **Choose File** and select `echo5-leads-connector.zip`
5. Click **Install Now**
6. Click **Activate Plugin**

### Step 3: Configure API Settings
1. Go to **Settings → Echo5 Leads** in WordPress admin
2. You'll see a settings page with 3 fields:

   **API Endpoint URL**
   ```
   https://your-backend-url.vercel.app
   ```
   *(Echo5 will provide this URL)*

   **API Key**
   ```
   oa_xxxxxxxxxxxxxxxxxxxxx
   ```
   *(Echo5 will provide your unique key)*

   **Enable Error Logging**
   ☐ Check this for troubleshooting (optional)

3. Click **Save Changes**

### Step 4: Test Connection
1. On the same settings page, scroll down
2. Click **Test Connection** button
3. You should see: ✅ **"Connection successful! Lead sent."**
4. If you see an error, double-check your API URL and Key

---

## ✅ Verification

### 1. Check Plugin is Active
- Go to **Plugins** page
- You should see **Echo5 Leads Connector** with status "Active"

### 2. Test with a Real Form
1. Go to a page with a contact form
2. Fill out the form (use real email/phone)
3. Submit the form
4. Form should submit normally (no errors)
5. Contact Echo5 team to verify lead was received in their system

### 3. Check Debug Log (If Enabled)
If you enabled error logging:
1. Connect to your site via FTP/SFTP
2. Check `/wp-content/debug.log`
3. Look for lines starting with `[Echo5 Leads]`
4. Should see: `[Echo5 Leads] Lead sent successfully`

---

## 🔧 Troubleshooting

### "Settings not saving"
**Cause**: WordPress permissions issue  
**Fix**:
1. Make sure you're logged in as Administrator
2. Try deactivating and reactivating the plugin
3. Check file permissions (should be 644)

### "Invalid API Key" error
**Cause**: API key is incorrect or expired  
**Fix**:
1. Double-check you copied the FULL key (starts with prefix like `oa_`)
2. Make sure no extra spaces before/after
3. Contact Echo5 to verify key is active
4. Try generating a new key from Echo5 dashboard

### "Connection timeout" error
**Cause**: Your server can't reach Echo5 API  
**Fix**:
1. Check your site can make outbound HTTPS requests
2. Ask hosting provider if firewall is blocking requests
3. Try increasing timeout in `wp-config.php`:
   ```php
   define('ECHO5_API_TIMEOUT', 30); // 30 seconds
   ```

### Forms not being captured
**Cause**: Form builder not supported or no email/phone field  
**Fix**:
1. Make sure form has at least email OR phone field
2. Check which form builder you're using (see Supported list below)
3. Enable error logging and check debug.log
4. Contact Echo5 support with form builder name

### Page loading slowly after install
**Cause**: Plugin loaded on all pages (rare)  
**Fix**:
1. Check which pages have forms
2. Add this to `functions.php` to limit loading:
   ```php
   add_filter('echo5_load_scripts', function($load) {
       return is_page('contact'); // Only load on contact page
   });
   ```

---

## 📋 Supported Form Builders

The plugin works with these form builders out of the box:

| Form Builder | Status | Auto-Detect |
|--------------|--------|-------------|
| **Elementor Pro** | ✅ Supported | Yes |
| **Contact Form 7** | ✅ Supported | Yes |
| **WPForms** | ✅ Supported | Yes |
| **Gravity Forms** | ✅ Supported | Yes |
| **Ninja Forms** | ✅ Supported | Yes |
| **Formidable Forms** | ✅ Supported | Yes |
| **Fluent Forms** | ✅ Supported | Yes |
| **MetForms** | ✅ Supported | Yes |
| **Custom HTML Forms** | ✅ Supported | Yes (JavaScript) |

**Don't see your form builder?** Contact Echo5 - we can add support!

---

## 🎯 Form Field Requirements

### Minimum Required
Form must have **at least ONE** of these:
- Email field (any name: `email`, `your-email`, `e-mail`, etc.)
- Phone field (any name: `phone`, `telephone`, `mobile`, etc.)

### Recommended Fields
For best results, include:
- ✅ First Name
- ✅ Last Name
- ✅ Email
- ✅ Phone
- ⭐ City (optional)
- ⭐ Interest (optional, for foster care agencies)

### Field Naming
Plugin automatically detects these variations:

**First Name**: `first_name`, `fname`, `first-name`, `given_name`, `your_first_name`  
**Last Name**: `last_name`, `lname`, `last-name`, `surname`, `your_last_name`  
**Email**: `email`, `e-mail`, `your-email`, `email_address`, `contact_email`  
**Phone**: `phone`, `telephone`, `mobile`, `your-phone`, `contact_number`

**Tip**: Use standard field names when possible for best results!

---

## 📱 UTM Tracking

Plugin automatically captures these marketing parameters:

- `utm_source` (e.g., "facebook", "google")
- `utm_medium` (e.g., "cpc", "social")
- `utm_campaign` (e.g., "spring-2024")
- `utm_term` (e.g., "foster care los angeles")
- `utm_content` (e.g., "blue-button")
- `gclid` (Google Ads click ID)
- `fbclid` (Facebook click ID)
- `referrer` (Where user came from)

**No configuration needed** - works automatically!

---

## 🔐 Security & Privacy

### Data Transmission
- ✅ All data sent via HTTPS (encrypted)
- ✅ API keys never exposed in browser
- ✅ No data stored in WordPress database
- ✅ Compliant with GDPR as data processor

### API Key Security
- ✅ Stored securely in WordPress options table
- ✅ Never visible in page source
- ✅ Can be rotated anytime via Echo5 dashboard
- ✅ Each agency has unique key (not shared)

---

## 💾 Backup & Updates

### Before Updating WordPress
1. Backup your site (always recommended)
2. Plugin should update automatically with WordPress
3. If issues arise, reinstall from ZIP file

### Plugin Updates
Echo5 will notify you when updates are available:
1. Download new ZIP file from Echo5
2. Go to **Plugins → Add New → Upload**
3. Upload new version (will replace old one)
4. Activate if needed

---

## 📞 Support

### Need Help?

**Echo5 Digital Support**  
📧 Email: support@echo5digital.com  
🌐 Website: https://echo5digital.com  
📞 Phone: (Your support number)

**Office Hours**  
Monday-Friday: 9am-5pm PST

### Include This Info When Contacting Support
1. WordPress version (check under **Dashboard → Updates**)
2. PHP version (check under **Tools → Site Health**)
3. Form builder you're using (e.g., "Contact Form 7")
4. Error message (if any) from debug.log
5. Screenshot of settings page

---

## ✨ What Happens Next?

After successful installation:

1. **Forms capture leads** automatically whenever someone submits
2. **Echo5 team receives** all leads in their central dashboard
3. **You can view** leads by logging into Echo5 admin panel (ask for access)
4. **Marketing attribution** is tracked automatically (UTM params)
5. **No maintenance** required - just set and forget!

---

**Need changes or custom features?** Contact Echo5 Digital - we're here to help!

---

**Version**: 2.0.0  
**Last Updated**: November 2024  
**Made by**: Echo5 Digital (https://echo5digital.com)
