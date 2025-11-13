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
        
        // Contact Form 7 hook
        add_action('wpcf7_before_send_mail', [$this, 'capture_cf7_form'], 10, 1);

        // WPForms hook
        add_action('wpforms_process_complete', [$this, 'capture_wpforms_form'], 10, 4);

        // MetForms hook
        add_action('metform_before_store_form_data', [$this, 'capture_metforms_form'], 10, 2);
        
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
                <li><strong>Capture:</strong> Hooks into Elementor Pro, Contact Form 7, WPForms, and MetForms submissions automatically.</li>
                <li><strong>Send:</strong> Posts form data to Echo5 API endpoint.</li>
                <li><strong>Done:</strong> No database, no admin UI - keeps WordPress fast.</li>
            </ol>
            
            <p><strong>To view/manage leads:</strong> Use the Echo5 admin dashboard (provided by Echo5 team)</p>
            
            <h3>Supported Form Fields</h3>
            <p>Use these field names in your forms for automatic mapping.</p>
            <ul>
                <li><code>first_name</code>, <code>last_name</code> (or a single <code>name</code> field)</li>
                <li><code>email</code></li>
                <li><code>phone</code></li>
                <li><code>city</code></li>
                <li><code>interest</code></li>
                <li><code>have_children</code></li>
                <li><code>planning_to_foster</code></li>
            </ul>
            
            <p class="description">UTM parameters and referrer are captured automatically.</p>
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
            'source' => 'website-elementor',
            'form_id' => $record->get('form_settings')['form_id'] ?? 'unknown',
        ];
        
        $this->send_to_api($payload);
    }

    /**
     * Capture Contact Form 7 submission and send to Echo5 API
     */
    public function capture_cf7_form($contact_form) {
        $submission = WPCF7_Submission::get_instance();
        if (!$submission) {
            return;
        }
        
        $fields = $submission->get_posted_data();
        
        // Handle name variations
        $first_name = $fields['first_name'] ?? $fields['first-name'] ?? '';
        $last_name = $fields['last_name'] ?? $fields['last-name'] ?? '';

        if (empty($first_name) && isset($fields['your-name'])) {
            $parts = explode(' ', $fields['your-name'], 2);
            $first_name = $parts[0];
            $last_name = $parts[1] ?? '';
        } elseif (empty($first_name) && isset($fields['name'])) {
            $parts = explode(' ', $fields['name'], 2);
            $first_name = $parts[0];
            $last_name = $parts[1] ?? '';
        }

        // Build payload
        $payload = [
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $fields['your-email'] ?? $fields['email'] ?? '',
            'phone' => $fields['your-phone'] ?? $fields['phone'] ?? '',
            'city' => $fields['city'] ?? '',
            'interest' => $fields['interest'] ?? '',
            'have_children' => $fields['have_children'] ?? '',
            'planning_to_foster' => $fields['planning_to_foster'] ?? '',
            'source' => 'website-cf7',
            'form_id' => $contact_form->id(),
        ];

        $this->send_to_api($payload);
    }

    /**
     * Capture WPForms submission and send to Echo5 API
     */
    public function capture_wpforms_form($fields, $entry, $form_data, $entry_id) {
        $mapped_fields = [];
        foreach ($fields as $field) {
            $name = strtolower($field['name']);
            // Simple fields
            if ($field['type'] === 'email') $mapped_fields['email'] = $field['value'];
            if ($field['type'] === 'phone') $mapped_fields['phone'] = $field['value'];
            if (strpos($name, 'city') !== false) $mapped_fields['city'] = $field['value'];
            if (strpos($name, 'interest') !== false) $mapped_fields['interest'] = $field['value'];
            if (strpos($name, 'children') !== false) $mapped_fields['have_children'] = $field['value'];
            if (strpos($name, 'foster') !== false) $mapped_fields['planning_to_foster'] = $field['value'];

            // Name field
            if ($field['type'] === 'name') {
                $mapped_fields['first_name'] = $field['first'] ?? '';
                $mapped_fields['last_name'] = $field['last'] ?? '';
            } elseif (strpos($name, 'first name') !== false) {
                $mapped_fields['first_name'] = $field['value'];
            } elseif (strpos($name, 'last name') !== false) {
                $mapped_fields['last_name'] = $field['value'];
            } elseif (strpos($name, 'name') !== false) {
                $parts = explode(' ', $field['value'], 2);
                $mapped_fields['first_name'] = $parts[0];
                $mapped_fields['last_name'] = $parts[1] ?? '';
            }
        }

        // Build payload
        $payload = [
            'first_name' => $mapped_fields['first_name'] ?? '',
            'last_name' => $mapped_fields['last_name'] ?? '',
            'email' => $mapped_fields['email'] ?? '',
            'phone' => $mapped_fields['phone'] ?? '',
            'city' => $mapped_fields['city'] ?? '',
            'interest' => $mapped_fields['interest'] ?? '',
            'have_children' => $mapped_fields['have_children'] ?? '',
            'planning_to_foster' => $mapped_fields['planning_to_foster'] ?? '',
            'source' => 'website-wpforms',
            'form_id' => $form_data['id'],
        ];

        $this->send_to_api($payload);
    }

    /**
     * Capture MetForms submission and send to Echo5 API
     */
    public function capture_metforms_form($data, $form_id) {
        // Build payload
        $payload = [
            'first_name' => $data['first_name'] ?? $data['name'] ?? '',
            'last_name' => $data['last_name'] ?? '',
            'email' => $data['email'] ?? '',
            'phone' => $data['phone'] ?? '',
            'city' => $data['city'] ?? '',
            'interest' => $data['interest'] ?? '',
            'have_children' => $data['have_children'] ?? '',
            'planning_to_foster' => $data['planning_to_foster'] ?? '',
            'source' => 'website-metforms',
            'form_id' => $form_id,
        ];

        $this->send_to_api($payload);
    }

    /**
     * Send payload to the Echo5 API
     */
    private function send_to_api($payload) {
        $api_url = get_option('echo5_api_url');
        $api_key = get_option('echo5_api_key');
        
        // Validate settings
        if (empty($api_url) || empty($api_key)) {
            $this->log_error('Echo5 API URL or API Key not configured');
            return;
        }

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
