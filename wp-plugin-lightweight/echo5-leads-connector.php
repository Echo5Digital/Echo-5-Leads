<?php
/**
 * Plugin Name: Echo5 Leads Connector
 * Plugin URI: https://echo5digital.com
 * Description: Lightweight connector that sends Elementor form submissions to Echo5 Leads API. No admin UI - just form capture.
 * Version: 2.0.0
 * Author: Echo5 Digital
 * Author URI: https://echo5digital.com
 * License: GPL v2 or later
 * Text Domain: echo5-leads
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('ECHO5_LEADS_VERSION', '2.0.0');
define('ECHO5_LEADS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ECHO5_LEADS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class Echo5_Leads_Connector {
    
    private static $instance = null;
    
    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Settings page
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        
        // Elementor form hook
        add_action('elementor_pro/forms/new_record', [$this, 'capture_elementor_form'], 10, 2);
        
        // Add settings link on plugins page
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), [$this, 'add_settings_link']);
    }
    
    /**
     * Add settings page to WordPress admin
     */
    public function add_settings_page() {
        add_options_page(
            'Echo5 Leads Settings',
            'Echo5 Leads',
            'manage_options',
            'echo5-leads-settings',
            [$this, 'render_settings_page']
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('echo5_leads_settings', 'echo5_api_url');
        register_setting('echo5_leads_settings', 'echo5_api_key');
        register_setting('echo5_leads_settings', 'echo5_enable_logging');
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>Echo5 Leads Connector Settings</h1>
            <p>Configure your Echo5 Leads API connection. <strong>Lightweight mode</strong> - this plugin only sends form data to the API.</p>
            
            <?php if (isset($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p>Settings saved successfully!</p>
                </div>
            <?php endif; ?>
            
            <form method="post" action="options.php">
                <?php settings_fields('echo5_leads_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="echo5_api_url">API Endpoint URL</label>
                        </th>
                        <td>
                            <input type="url" 
                                   id="echo5_api_url" 
                                   name="echo5_api_url" 
                                   value="<?php echo esc_attr(get_option('echo5_api_url', '')); ?>" 
                                   class="regular-text" 
                                   placeholder="https://your-backend.vercel.app"
                                   required>
                            <p class="description">Your Echo5 backend API URL (without /api/ingest/lead)</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="echo5_api_key">API Key</label>
                        </th>
                        <td>
                            <input type="password" 
                                   id="echo5_api_key" 
                                   name="echo5_api_key" 
                                   value="<?php echo esc_attr(get_option('echo5_api_key', '')); ?>" 
                                   class="regular-text" 
                                   placeholder="oa_xxxxxxxxxxxxx"
                                   required>
                            <p class="description">Your tenant-specific API key provided by Echo5</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="echo5_enable_logging">Enable Error Logging</label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="echo5_enable_logging" 
                                   name="echo5_enable_logging" 
                                   value="1" 
                                   <?php checked(get_option('echo5_enable_logging'), 1); ?>>
                            <p class="description">Log failed API submissions to debug.log</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <hr>
            
            <h2>How It Works</h2>
            <ol>
                <li><strong>Capture:</strong> Hooks into Elementor Pro form submissions automatically</li>
                <li><strong>Send:</strong> Posts form data to Echo5 API endpoint</li>
                <li><strong>Done:</strong> No database, no admin UI - keeps WordPress fast</li>
            </ol>
            
            <p><strong>To view/manage leads:</strong> Use the Echo5 admin dashboard (provided by Echo5 team)</p>
            
            <h3>Supported Form Fields</h3>
            <ul>
                <li><code>first_name</code> - First name</li>
                <li><code>last_name</code> - Last name</li>
                <li><code>email</code> - Email address</li>
                <li><code>phone</code> - Phone number</li>
                <li><code>city</code> - City</li>
                <li><code>interest</code> - Interest type</li>
                <li><code>have_children</code> - Have children (yes/no)</li>
                <li><code>planning_to_foster</code> - Planning to foster (yes/no)</li>
            </ul>
            
            <p class="description">UTM parameters and referrer are captured automatically</p>
        </div>
        <?php
    }
    
    /**
     * Add settings link to plugins page
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="options-general.php?page=echo5-leads-settings">Settings</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
    
    /**
     * Capture Elementor form submission and send to Echo5 API
     */
    public function capture_elementor_form($record, $handler) {
        $api_url = get_option('echo5_api_url');
        $api_key = get_option('echo5_api_key');
        
        // Validate settings
        if (empty($api_url) || empty($api_key)) {
            $this->log_error('Echo5 API URL or API Key not configured');
            return;
        }
        
        // Get form fields
        $raw_fields = $record->get('fields');
        $fields = [];
        
        foreach ($raw_fields as $id => $field) {
            $fields[$id] = $field['value'];
        }
        
        // Build payload
        $payload = [
            'first_name' => $fields['first_name'] ?? $fields['name'] ?? '',
            'last_name' => $fields['last_name'] ?? '',
            'email' => $fields['email'] ?? '',
            'phone' => $fields['phone'] ?? '',
            'city' => $fields['city'] ?? '',
            'interest' => $fields['interest'] ?? '',
            'have_children' => $fields['have_children'] ?? '',
            'planning_to_foster' => $fields['planning_to_foster'] ?? '',
            'source' => 'website',
            'form_id' => $record->get('form_settings')['form_id'] ?? 'unknown',
        ];
        
        // Add UTM parameters from session/cookies if available
        $utm_params = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        foreach ($utm_params as $param) {
            if (isset($_GET[$param])) {
                $payload[$param] = sanitize_text_field($_GET[$param]);
            } elseif (isset($_COOKIE[$param])) {
                $payload[$param] = sanitize_text_field($_COOKIE[$param]);
            }
        }
        
        // Add referrer
        if (!empty($_SERVER['HTTP_REFERER'])) {
            $payload['referrer'] = esc_url_raw($_SERVER['HTTP_REFERER']);
        }
        
        // Add gclid/fbclid if present
        if (isset($_GET['gclid'])) {
            $payload['gclid'] = sanitize_text_field($_GET['gclid']);
        }
        if (isset($_GET['fbclid'])) {
            $payload['fbclid'] = sanitize_text_field($_GET['fbclid']);
        }
        
        // Send to Echo5 API
        $response = wp_remote_post($api_url . '/api/ingest/lead', [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Tenant-Key' => $api_key,
            ],
            'body' => json_encode($payload),
            'timeout' => 15,
        ]);
        
        // Handle response
        if (is_wp_error($response)) {
            $this->log_error('API request failed: ' . $response->get_error_message());
        } else {
            $status_code = wp_remote_retrieve_response_code($response);
            if ($status_code !== 200 && $status_code !== 201) {
                $body = wp_remote_retrieve_body($response);
                $this->log_error('API returned error ' . $status_code . ': ' . $body);
            }
        }
    }
    
    /**
     * Log error to WordPress debug log
     */
    private function log_error($message) {
        if (get_option('echo5_enable_logging')) {
            error_log('[Echo5 Leads] ' . $message);
        }
    }
}

// Initialize plugin
add_action('plugins_loaded', function() {
    Echo5_Leads_Connector::instance();
});
