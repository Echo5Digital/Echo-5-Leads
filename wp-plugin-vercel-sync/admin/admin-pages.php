<?php
/**
 * Admin pages for Echo5 Leads Manager
 * Includes Vercel API sync settings
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Add admin menu
add_action( 'admin_menu', 'oal_add_admin_menu' );

function oal_add_admin_menu() {
    add_menu_page(
        'Echo5 Leads Manager',
        'Echo5 Leads',
        'manage_options',
        'oal-leads',
        'oal_leads_page',
        'dashicons-groups',
        30
    );
    
    add_submenu_page(
        'oal-leads',
        'Settings',
        'Settings',
        'manage_options',
        'oal-settings',
        'oal_settings_page'
    );
}

// Settings page
function oal_settings_page() {
    // Save settings
    if ( isset( $_POST['oal_settings_nonce'] ) && wp_verify_nonce( $_POST['oal_settings_nonce'], 'oal_save_settings' ) ) {
        $settings = [];
        
        // Vercel API settings
        $settings['vercel_api_url'] = isset( $_POST['vercel_api_url'] ) ? esc_url_raw( $_POST['vercel_api_url'] ) : '';
        $settings['vercel_api_key'] = isset( $_POST['vercel_api_key'] ) ? sanitize_text_field( $_POST['vercel_api_key'] ) : '';
        
        // Original settings
        $settings['webhook_secret'] = isset( $_POST['webhook_secret'] ) ? sanitize_text_field( $_POST['webhook_secret'] ) : '';
        $settings['spam_keywords'] = isset( $_POST['spam_keywords'] ) ? sanitize_textarea_field( $_POST['spam_keywords'] ) : '';
        $settings['sla_hours'] = isset( $_POST['sla_hours'] ) ? absint( $_POST['sla_hours'] ) : 4;
        $settings['manager_emails'] = isset( $_POST['manager_emails'] ) ? sanitize_text_field( $_POST['manager_emails'] ) : '';
        
        // Facebook settings
        $settings['fb_verify_token'] = isset( $_POST['fb_verify_token'] ) ? sanitize_text_field( $_POST['fb_verify_token'] ) : '';
        $settings['fb_app_secret'] = isset( $_POST['fb_app_secret'] ) ? sanitize_text_field( $_POST['fb_app_secret'] ) : '';
        $settings['fb_page_access_token'] = isset( $_POST['fb_page_access_token'] ) ? sanitize_text_field( $_POST['fb_page_access_token'] ) : '';
        
        update_option( 'oal_settings', $settings );
        
        echo '<div class="notice notice-success"><p>Settings saved successfully!</p></div>';
    }
    
    $settings = get_option( 'oal_settings', [] );
    ?>
    <div class="wrap">
        <h1>Echo5 Leads Manager - Settings</h1>
        
        <form method="post" action="">
            <?php wp_nonce_field( 'oal_save_settings', 'oal_settings_nonce' ); ?>
            
            <h2>Vercel API Sync (NEW)</h2>
            <p>Configure your Vercel backend API to automatically sync leads captured by this plugin.</p>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="vercel_api_url">Vercel API URL</label>
                    </th>
                    <td>
                        <input type="url" id="vercel_api_url" name="vercel_api_url" 
                               value="<?php echo esc_attr( $settings['vercel_api_url'] ?? '' ); ?>" 
                               class="regular-text" placeholder="https://echo5-digital-leads.vercel.app">
                        <p class="description">Your Vercel backend API URL (e.g., https://echo5-digital-leads.vercel.app)</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="vercel_api_key">Vercel API Key</label>
                    </th>
                    <td>
                        <input type="text" id="vercel_api_key" name="vercel_api_key" 
                               value="<?php echo esc_attr( $settings['vercel_api_key'] ?? '' ); ?>" 
                               class="regular-text" placeholder="open_523e0520...">
                        <p class="description">Your X-Tenant-Key for authentication (starts with 'open_' or 'oa_')</p>
                    </td>
                </tr>
            </table>
            
            <?php if ( ! empty( $settings['vercel_api_url'] ) && ! empty( $settings['vercel_api_key'] ) ): ?>
                <p style="padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
                    ✅ <strong>Vercel sync is enabled.</strong> All captured leads will be sent to: 
                    <code><?php echo esc_html( $settings['vercel_api_url'] ); ?></code>
                </p>
            <?php else: ?>
                <p style="padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                    ⚠️ <strong>Vercel sync is disabled.</strong> Leads will only be saved to WordPress database. 
                    Configure both fields above to enable Vercel sync.
                </p>
            <?php endif; ?>
            
            <hr style="margin: 30px 0;">
            
            <h2>General Settings</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="webhook_secret">Webhook Secret</label>
                    </th>
                    <td>
                        <input type="text" id="webhook_secret" name="webhook_secret" 
                               value="<?php echo esc_attr( $settings['webhook_secret'] ?? '' ); ?>" 
                               class="regular-text">
                        <p class="description">Optional secret for REST API endpoint security</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="spam_keywords">Spam Keywords</label>
                    </th>
                    <td>
                        <textarea id="spam_keywords" name="spam_keywords" rows="3" class="large-text"><?php 
                            echo esc_textarea( $settings['spam_keywords'] ?? '' ); 
                        ?></textarea>
                        <p class="description">Comma-separated keywords to flag as spam (e.g., viagra, casino)</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="sla_hours">SLA Hours</label>
                    </th>
                    <td>
                        <input type="number" id="sla_hours" name="sla_hours" 
                               value="<?php echo esc_attr( $settings['sla_hours'] ?? 4 ); ?>" 
                               class="small-text" min="1">
                        <p class="description">Hours before new lead breaches SLA</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="manager_emails">Manager Email(s)</label>
                    </th>
                    <td>
                        <input type="text" id="manager_emails" name="manager_emails" 
                               value="<?php echo esc_attr( $settings['manager_emails'] ?? '' ); ?>" 
                               class="regular-text">
                        <p class="description">Email addresses for SLA breach notifications (comma-separated)</p>
                    </td>
                </tr>
            </table>
            
            <hr style="margin: 30px 0;">
            
            <h2>Facebook Lead Ads</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="fb_verify_token">Verify Token</label>
                    </th>
                    <td>
                        <input type="text" id="fb_verify_token" name="fb_verify_token" 
                               value="<?php echo esc_attr( $settings['fb_verify_token'] ?? '' ); ?>" 
                               class="regular-text">
                        <p class="description">Facebook webhook verify token</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="fb_app_secret">App Secret</label>
                    </th>
                    <td>
                        <input type="text" id="fb_app_secret" name="fb_app_secret" 
                               value="<?php echo esc_attr( $settings['fb_app_secret'] ?? '' ); ?>" 
                               class="regular-text">
                        <p class="description">Facebook App Secret for signature verification</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="fb_page_access_token">Page Access Token</label>
                    </th>
                    <td>
                        <input type="text" id="fb_page_access_token" name="fb_page_access_token" 
                               value="<?php echo esc_attr( $settings['fb_page_access_token'] ?? '' ); ?>" 
                               class="regular-text">
                        <p class="description">Facebook Page Access Token to fetch lead data</p>
                    </td>
                </tr>
            </table>
            
            <?php submit_button( 'Save Settings' ); ?>
        </form>
        
        <hr style="margin: 30px 0;">
        
        <h2>Integration Info</h2>
        <p><strong>REST API Endpoint:</strong> <code><?php echo rest_url( 'echo5-leads/v1/lead' ); ?></code></p>
        <p><strong>Facebook Webhook URL:</strong> <code><?php echo rest_url( 'oal/v1/fb-webhook' ); ?></code></p>
    </div>
    <?php
}

// Leads page (simple list)
function oal_leads_page() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'openarms_leads';
    
    // Get search query
    $search = isset( $_GET['s'] ) ? sanitize_text_field( $_GET['s'] ) : '';
    
    // Build query
    $query = "SELECT * FROM $table_name";
    if ( $search ) {
        $query .= $wpdb->prepare( " WHERE first_name LIKE %s OR last_name LIKE %s OR email LIKE %s", 
            '%' . $wpdb->esc_like( $search ) . '%',
            '%' . $wpdb->esc_like( $search ) . '%',
            '%' . $wpdb->esc_like( $search ) . '%'
        );
    }
    $query .= " ORDER BY created_at DESC LIMIT 50";
    
    $leads = $wpdb->get_results( $query );
    ?>
    <div class="wrap">
        <h1>Leads</h1>
        
        <form method="get" action="">
            <input type="hidden" name="page" value="oal-leads">
            <p class="search-box">
                <input type="search" name="s" value="<?php echo esc_attr( $search ); ?>" placeholder="Search leads...">
                <button type="submit" class="button">Search</button>
            </p>
        </form>
        
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Source</th>
                    <th>Stage</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                <?php if ( empty( $leads ) ): ?>
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 20px;">
                            No leads found. <?php if ( $search ): ?>
                                <a href="?page=oal-leads">Clear search</a>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php else: ?>
                    <?php foreach ( $leads as $lead ): ?>
                        <tr>
                            <td><?php echo esc_html( $lead->id ); ?></td>
                            <td><?php echo esc_html( $lead->first_name . ' ' . $lead->last_name ); ?></td>
                            <td><?php echo esc_html( $lead->email ); ?></td>
                            <td><?php echo esc_html( $lead->phone_e164 ); ?></td>
                            <td><?php echo esc_html( $lead->city ); ?></td>
                            <td><?php echo esc_html( $lead->source ); ?></td>
                            <td><?php echo esc_html( $lead->stage ); ?></td>
                            <td><?php echo esc_html( $lead->created_at ); ?></td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
        
        <?php if ( count( $leads ) >= 50 ): ?>
            <p style="margin-top: 20px; padding: 10px; background: #f0f0f0; border-left: 4px solid #0073aa;">
                <strong>Note:</strong> Showing first 50 results. Use search to find specific leads.
            </p>
        <?php endif; ?>
    </div>
    <?php
}
