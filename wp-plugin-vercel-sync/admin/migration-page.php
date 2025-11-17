<?php
/**
 * Migration Tool: Sync existing WordPress leads to Vercel
 * 
 * Add this to your WordPress plugin admin page or run as a standalone script
 */

// Add this to your admin-pages.php or create a new admin menu item
add_action('admin_menu', 'oal_add_migration_menu');

function oal_add_migration_menu() {
    add_submenu_page(
        'oal-leads',
        'Migrate to Vercel',
        'Migrate to Vercel',
        'manage_options',
        'oal-migrate-vercel',
        'oal_migration_page'
    );
}

function oal_migration_page() {
    global $wpdb;
    $leads_table = $wpdb->prefix . 'openarms_leads';
    
    // Handle migration
    if (isset($_POST['start_migration']) && wp_verify_nonce($_POST['migration_nonce'], 'oal_migrate_vercel')) {
        echo '<div class="wrap">';
        echo '<h1>Migrating Leads to Vercel</h1>';
        echo '<div style="background: white; padding: 20px; border: 1px solid #ccc; border-radius: 4px; margin: 20px 0; font-family: monospace;">';
        
        $options = get_option('oal_settings', []);
        $api_url = $options['vercel_api_url'] ?? '';
        $api_key = $options['vercel_api_key'] ?? '';
        
        if (empty($api_url) || empty($api_key)) {
            echo '<p style="color: red;">❌ Vercel API not configured. Go to Settings first.</p>';
            echo '</div></div>';
            return;
        }
        
        // Get all leads
        $leads = $wpdb->get_results("SELECT * FROM {$leads_table} ORDER BY created_at DESC");
        $total = count($leads);
        
        echo "<p><strong>📊 Found {$total} leads in WordPress database</strong></p>";
        echo "<p>Starting migration...</p><hr>";
        
        $success_count = 0;
        $error_count = 0;
        
        foreach ($leads as $lead) {
            $name = $lead->first_name . ' ' . $lead->last_name;
            $contact = $lead->email ?: $lead->phone_e164;
            
            echo "<p>[" . ($success_count + $error_count + 1) . "/{$total}] Migrating: {$name} ({$contact})...</p>";
            
            // Prepare payload
            $payload = [
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email,
                'phone' => $lead->phone_e164,
                'city' => $lead->city,
                'source' => $lead->source ?: 'wordpress_migration',
                'campaign_name' => $lead->campaign_name,
                'form_id' => 'wordpress_existing_lead',
                'created_at' => $lead->created_at, // ✅ Preserve original timestamp
            ];
            
            // Parse original_payload if exists
            if (!empty($lead->original_payload)) {
                $original = json_decode($lead->original_payload, true);
                if (is_array($original)) {
                    $payload = array_merge($original, $payload);
                }
            }
            
            // Send to Vercel
            $response = wp_remote_post($api_url . '/api/ingest/lead', [
                'timeout' => 10,
                'headers' => [
                    'Content-Type' => 'application/json',
                    'X-Tenant-Key' => $api_key,
                ],
                'body' => wp_json_encode($payload),
            ]);
            
            if (is_wp_error($response)) {
                echo "<p style='color: red; margin-left: 20px;'>❌ Error: " . esc_html($response->get_error_message()) . "</p>";
                $error_count++;
            } else {
                $status = wp_remote_retrieve_response_code($response);
                if ($status >= 200 && $status < 300) {
                    $body = wp_remote_retrieve_body($response);
                    $result = json_decode($body, true);
                    $lead_id = $result['leadId'] ?? 'unknown';
                    echo "<p style='color: green; margin-left: 20px;'>✅ Success - Lead ID: {$lead_id}</p>";
                    $success_count++;
                } else {
                    $body = wp_remote_retrieve_body($response);
                    echo "<p style='color: red; margin-left: 20px;'>❌ Error (HTTP {$status}): " . esc_html($body) . "</p>";
                    $error_count++;
                }
            }
            
            // Flush output to show progress
            if (ob_get_level() > 0) {
                ob_flush();
                flush();
            }
            
            // Small delay
            usleep(100000); // 0.1 second
        }
        
        echo "<hr>";
        echo "<h2>📈 Migration Summary:</h2>";
        echo "<ul>";
        echo "<li><strong>Total leads:</strong> {$total}</li>";
        echo "<li style='color: green;'><strong>✅ Successful:</strong> {$success_count}</li>";
        echo "<li style='color: red;'><strong>❌ Failed:</strong> {$error_count}</li>";
        echo "</ul>";
        
        if ($error_count > 0) {
            echo "<p style='background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;'>⚠️ Some leads failed to migrate. Check the errors above.</p>";
        } else {
            echo "<p style='background: #d4edda; padding: 15px; border-left: 4px solid #28a745;'>🎉 All leads migrated successfully!</p>";
            echo "<p>Check Vercel frontend: <a href='https://echo5-leads-fe.vercel.app/leads' target='_blank'>https://echo5-leads-fe.vercel.app/leads</a></p>";
        }
        
        echo '</div>';
        echo '<p><a href="' . admin_url('admin.php?page=oal-migrate-vercel') . '" class="button">← Back</a></p>';
        echo '</div>';
        return;
    }
    
    // Show migration form
    $leads_count = $wpdb->get_var("SELECT COUNT(*) FROM {$leads_table}");
    $options = get_option('oal_settings', []);
    $api_url = $options['vercel_api_url'] ?? '';
    $api_key = $options['vercel_api_key'] ?? '';
    $configured = !empty($api_url) && !empty($api_key);
    
    ?>
    <div class="wrap">
        <h1>Migrate Existing Leads to Vercel</h1>
        
        <div class="card" style="max-width: 800px;">
            <h2>📊 Migration Status</h2>
            <p><strong>WordPress Database:</strong> <?php echo esc_html($leads_count); ?> leads found</p>
            <p><strong>Vercel API:</strong> 
                <?php if ($configured): ?>
                    <span style="color: green;">✅ Configured</span> - <?php echo esc_html($api_url); ?>
                <?php else: ?>
                    <span style="color: red;">❌ Not configured</span> - <a href="<?php echo admin_url('admin.php?page=oal-settings'); ?>">Configure now</a>
                <?php endif; ?>
            </p>
            
            <hr>
            
            <h2>⚠️ Important Information</h2>
            <ul style="line-height: 1.8;">
                <li>This will send <strong>ALL <?php echo esc_html($leads_count); ?> existing leads</strong> from WordPress to Vercel</li>
                <li>Leads that already exist in Vercel (same email/phone) will be <strong>updated</strong>, not duplicated</li>
                <li>This process may take several minutes depending on the number of leads</li>
                <li><strong>Do not close this page</strong> while migration is running</li>
                <li>After migration, new form submissions will automatically sync to Vercel</li>
            </ul>
            
            <hr>
            
            <?php if ($configured && $leads_count > 0): ?>
                <form method="post" action="" onsubmit="return confirm('Are you sure you want to migrate <?php echo esc_js($leads_count); ?> leads to Vercel? This cannot be undone.');">
                    <?php wp_nonce_field('oal_migrate_vercel', 'migration_nonce'); ?>
                    <p>
                        <button type="submit" name="start_migration" class="button button-primary button-large">
                            🚀 Start Migration (<?php echo esc_html($leads_count); ?> leads)
                        </button>
                    </p>
                </form>
            <?php elseif (!$configured): ?>
                <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
                    ⚠️ Please <a href="<?php echo admin_url('admin.php?page=oal-settings'); ?>">configure Vercel API settings</a> first.
                </p>
            <?php elseif ($leads_count == 0): ?>
                <p style="background: #e7f3ff; padding: 15px; border-left: 4px solid #2196f3;">
                    ℹ️ No leads found in WordPress database. Once you receive form submissions, they will automatically sync to Vercel.
                </p>
            <?php endif; ?>
        </div>
    </div>
    <?php
}
