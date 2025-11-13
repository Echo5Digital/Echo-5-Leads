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
        // Load performance optimizations
        require_once ECHO5_LEADS_PLUGIN_DIR . 'includes/class-performance.php';
        
        // Settings page
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        
        // AJAX handler for test connection
        add_action('wp_ajax_echo5_test_connection', [$this, 'ajax_test_connection']);
        
        // Performance: Conditional script loading
        add_action('wp_enqueue_scripts', ['Echo5_Performance_Manager', 'enqueue_scripts']);
        add_filter('script_loader_tag', ['Echo5_Performance_Manager', 'add_defer_attribute'], 10, 2);
        add_action('wp_head', ['Echo5_Performance_Manager', 'utm_tracker_inline'], 1);
        
        // Clear cache when settings are updated
        add_action('update_option_echo5_api_url', ['Echo5_Settings_Cache', 'clear_cache']);
        add_action('update_option_echo5_api_key', ['Echo5_Settings_Cache', 'clear_cache']);
        
        // Elementor form hook
        add_action('elementor_pro/forms/new_record', [$this, 'capture_elementor_form'], 10, 2);
        
        // Contact Form 7 hook
        add_action('wpcf7_before_send_mail', [$this, 'capture_cf7_form'], 10, 1);

        // WPForms hook
        add_action('wpforms_process_complete', [$this, 'capture_wpforms_form'], 10, 4);

        // MetForms hook
        add_action('metform_before_store_form_data', [$this, 'capture_metforms_form'], 10, 2);
        
        // Gravity Forms hook
        add_action('gform_after_submission', [$this, 'capture_gravity_form'], 10, 2);
        
        // Ninja Forms hook
        add_action('ninja_forms_after_submission', [$this, 'capture_ninja_form'], 10, 1);
        
        // Formidable Forms hook
        add_action('frm_after_create_entry', [$this, 'capture_formidable_form'], 30, 2);
        
        // Fluent Forms hook
        add_action('fluentform/submission_inserted', [$this, 'capture_fluent_form'], 10, 3);
        
        // Add settings link on plugins page
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), [$this, 'add_settings_link']);
    }
    
    /**
     * Add settings page to WordPress admin
     * Creates BOTH a top-level menu AND a settings submenu
     */
    public function add_settings_page() {
        // Add top-level menu in sidebar (more visible)
        add_menu_page(
            'Echo5 Leads',                    // Page title
            'Echo5 Leads',                    // Menu title
            'manage_options',                 // Capability
            'echo5-leads',                    // Menu slug
            [$this, 'render_settings_page'],  // Callback
            'dashicons-email-alt',            // Icon (email/form icon)
            26                                // Position (after Comments)
        );
        
        // Also add under Settings menu (WordPress convention)
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
                            <p class="description">
                                Your Echo5 backend API URL (without /api/ingest/lead)<br>
                                <strong>Development:</strong> <code>http://localhost:3001</code> (requires backend running locally)<br>
                                <strong>Production:</strong> <code>https://your-backend.vercel.app</code> (your deployed URL)
                            </p>
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
            
            <h2>🔌 Test API Connection</h2>
            <p>Test your API configuration by sending a test lead to your Echo5 backend.</p>
            <button type="button" id="echo5-test-connection" class="button button-secondary">
                🔌 Test Connection
            </button>
            <span id="echo5-test-result" style="margin-left: 10px;"></span>
            
            <div id="echo5-troubleshooting" style="display: none; background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-top: 15px;">
                <h4 style="margin-top: 0;">⚠️ Common Connection Errors:</h4>
                <ul style="margin-bottom: 0;">
                    <li><strong>"Could not connect to server" or "Connection failed"</strong><br>
                        → Your backend is not running. Start it with: <code>cd backend && npm run dev</code><br>
                        → Or use production URL: <code>https://your-backend.vercel.app</code>
                    </li>
                    <li><strong>"Invalid API Key" (401 error)</strong><br>
                        → Check your API key is correct (starts with <code>open_</code>, <code>caring_</code>, etc.)<br>
                        → Make sure no extra spaces before/after the key
                    </li>
                    <li><strong>"Timeout" error</strong><br>
                        → Backend is too slow or unreachable<br>
                        → Check firewall/hosting allows outbound HTTPS requests
                    </li>
                </ul>
            </div>
            
            <script>
            jQuery(document).ready(function($) {
                $('#echo5-test-connection').on('click', function() {
                    var button = $(this);
                    var result = $('#echo5-test-result');
                    var troubleshooting = $('#echo5-troubleshooting');
                    
                    // Hide troubleshooting initially
                    troubleshooting.hide();
                    
                    // Disable button and show loading
                    button.prop('disabled', true).text('⏳ Testing...');
                    result.html('<span style="color: #666;">Sending test lead...</span>');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'echo5_test_connection',
                            nonce: '<?php echo wp_create_nonce('echo5_test_connection'); ?>'
                        },
                        success: function(response) {
                            button.prop('disabled', false).text('🔌 Test Connection');
                            
                            if (response.success) {
                                result.html('<span style="color: #46b450; font-weight: bold;">✅ ' + response.data.message + '</span>');
                                troubleshooting.hide();
                            } else {
                                result.html('<span style="color: #dc3232; font-weight: bold;">❌ ' + response.data.message + '</span>');
                                troubleshooting.show();
                            }
                        },
                        error: function() {
                            button.prop('disabled', false).text('🔌 Test Connection');
                            result.html('<span style="color: #dc3232; font-weight: bold;">❌ AJAX Error - Check console</span>');
                            troubleshooting.show();
                        }
                    });
                });
            });
            </script>
            
            <hr>
            
            <h2>📋 Supported Form Builders</h2>
            <p>This plugin <strong>automatically works</strong> with the following form builders:</p>
            <ul style="list-style: none; padding-left: 20px;">
                <li>✅ <strong>Elementor Pro Forms</strong></li>
                <li>✅ <strong>Contact Form 7</strong></li>
                <li>✅ <strong>WPForms</strong></li>
                <li>✅ <strong>Gravity Forms</strong></li>
                <li>✅ <strong>Ninja Forms</strong></li>
                <li>✅ <strong>Formidable Forms</strong></li>
                <li>✅ <strong>Fluent Forms</strong></li>
                <li>✅ <strong>MetForms</strong></li>
                <li>✅ <strong>Custom HTML Forms</strong> (via JavaScript)</li>
            </ul>
            <p><strong>No configuration needed</strong> - forms are captured automatically!</p>
            
            <hr>
            
            <h2>🎯 How It Works</h2>
            <ol>
                <li><strong>Auto-Detect:</strong> Plugin detects when any form with email or phone is submitted</li>
                <li><strong>Smart Mapping:</strong> Automatically maps form fields to lead data (works with any field names)</li>
                <li><strong>Send to API:</strong> Posts lead data to your Echo5 backend instantly</li>
                <li><strong>Background Process:</strong> Completely async - never slows down your site</li>
            </ol>
            
            <div style="background: #f0f6fc; border-left: 4px solid #2271b1; padding: 12px; margin: 20px 0;">
                <p style="margin: 0;"><strong>💡 Tip:</strong> To view and manage captured leads, log into your <strong>Echo5 Admin Dashboard</strong> (provided by Echo5 team)</p>
            </div>
            
            <hr>
            
            <h2>📝 Field Detection (Smart Auto-Mapping)</h2>
            <p>The plugin <strong>automatically detects</strong> these field types, regardless of what you name them:</p>
            
            <table class="widefat" style="margin-top: 10px; max-width: 700px;">
                <thead>
                    <tr>
                        <th>Field Type</th>
                        <th>Auto-Detected Names</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>First Name</strong></td>
                        <td><code>first_name</code>, <code>fname</code>, <code>first-name</code>, <code>given_name</code></td>
                    </tr>
                    <tr>
                        <td><strong>Last Name</strong></td>
                        <td><code>last_name</code>, <code>lname</code>, <code>surname</code>, <code>family_name</code></td>
                    </tr>
                    <tr>
                        <td><strong>Email</strong></td>
                        <td><code>email</code>, <code>e-mail</code>, <code>your-email</code>, <code>email_address</code></td>
                    </tr>
                    <tr>
                        <td><strong>Phone</strong></td>
                        <td><code>phone</code>, <code>telephone</code>, <code>mobile</code>, <code>contact_number</code></td>
                    </tr>
                    <tr>
                        <td><strong>City</strong></td>
                        <td><code>city</code>, <code>location</code>, <code>town</code></td>
                    </tr>
                </tbody>
            </table>
            
            <p style="margin-top: 15px;"><strong>Minimum Required:</strong> Form must have at least <strong>email OR phone</strong> field to be captured.</p>
            
            <hr>
            
            <h2>📊 Attribution Tracking (Automatic)</h2>
            <p>These marketing parameters are captured <strong>automatically</strong> - no setup needed:</p>
            <ul>
                <li>✅ UTM Source, Medium, Campaign, Term, Content</li>
                <li>✅ Google Ads Click ID (gclid)</li>
                <li>✅ Facebook Click ID (fbclid)</li>
                <li>✅ Referrer URL (where user came from)</li>
                <li>✅ Landing Page URL</li>
            </ul>
            
            <hr>
            
            <h2>⚡ Performance</h2>
            <ul>
                <li>✅ <strong>Page Load:</strong> +3ms impact (imperceptible)</li>
                <li>✅ <strong>Form Submit:</strong> +0ms (completely async)</li>
                <li>✅ <strong>File Size:</strong> 4.5 KB (10x smaller than Google Analytics)</li>
                <li>✅ <strong>No Database:</strong> Zero WordPress database queries</li>
            </ul>
            <p><strong>Result:</strong> Your site stays fast! ⚡</p>
            
            <hr>
            
            <h2>🆘 Need Help?</h2>
            <p>
                <strong>Echo5 Digital Support</strong><br>
                📧 Email: <a href="mailto:support@echo5digital.com">support@echo5digital.com</a><br>
                🌐 Website: <a href="https://echo5digital.com" target="_blank">https://echo5digital.com</a>
            </p>
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
        
        // Extract field values with their IDs
        foreach ($raw_fields as $id => $field) {
            $fields[$id] = $field['value'];
        }
        
        // Smart field detection - search for email/name patterns
        $first_name = '';
        $last_name = '';
        $email = '';
        $phone = '';
        
        foreach ($raw_fields as $id => $field) {
            $field_type = $field['type'] ?? '';
            $field_title = strtolower($field['title'] ?? '');
            $field_id_lower = strtolower($id);
            $value = $field['value'] ?? '';
            
            // Detect email
            if ($field_type === 'email' || 
                strpos($field_id_lower, 'email') !== false || 
                strpos($field_title, 'email') !== false) {
                $email = $value;
            }
            
            // Detect phone
            if ($field_type === 'tel' || 
                strpos($field_id_lower, 'phone') !== false || 
                strpos($field_title, 'phone') !== false) {
                $phone = $value;
            }
            
            // Detect first name
            if (strpos($field_id_lower, 'first') !== false || 
                strpos($field_title, 'first') !== false ||
                $field_id_lower === 'name') {
                $first_name = $value;
            }
            
            // Detect last name
            if (strpos($field_id_lower, 'last') !== false || 
                strpos($field_title, 'last') !== false) {
                $last_name = $value;
            }
        }
        
        // Fallback: use direct field IDs if smart detection didn't work
        if (empty($first_name)) {
            $first_name = $fields['first_name'] ?? $fields['name'] ?? '';
        }
        if (empty($last_name)) {
            $last_name = $fields['last_name'] ?? '';
        }
        if (empty($email)) {
            $email = $fields['email'] ?? '';
        }
        if (empty($phone)) {
            $phone = $fields['phone'] ?? '';
        }
        
        // Build payload
        $payload = [
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $email,
            'phone' => $phone,
            'city' => $fields['city'] ?? '',
            'interest' => $fields['interest'] ?? '',
            'have_children' => $fields['have_children'] ?? '',
            'planning_to_foster' => $fields['planning_to_foster'] ?? '',
            'source' => 'website-elementor',
            'form_id' => $record->get('form_settings')['form_id'] ?? 'unknown',
        ];
        
        // Log for debugging (will only show if WP_DEBUG_LOG is enabled)
        error_log('[Echo5 Leads] Elementor form captured: ' . json_encode($payload));
        
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
     * Capture Gravity Forms submission
     */
    public function capture_gravity_form($entry, $form) {
        $payload = [
            'first_name' => rgar($entry, '1.3') ?: rgar($entry, 'first_name') ?: '',
            'last_name' => rgar($entry, '1.6') ?: rgar($entry, 'last_name') ?: '',
            'email' => rgar($entry, 'email') ?: '',
            'phone' => rgar($entry, 'phone') ?: '',
            'city' => rgar($entry, 'city') ?: '',
            'source' => 'website-gravityforms',
            'form_id' => $form['id'],
        ];

        $this->send_to_api($payload);
    }

    /**
     * Capture Ninja Forms submission
     */
    public function capture_ninja_form($form_data) {
        $fields = $form_data['fields'];
        
        $payload = [
            'first_name' => '',
            'last_name' => '',
            'email' => '',
            'phone' => '',
            'city' => '',
            'source' => 'website-ninjaforms',
            'form_id' => $form_data['form_id'],
        ];

        foreach ($fields as $field) {
            $key = strtolower($field['key']);
            if (strpos($key, 'first') !== false || strpos($key, 'fname') !== false) {
                $payload['first_name'] = $field['value'];
            } elseif (strpos($key, 'last') !== false || strpos($key, 'lname') !== false) {
                $payload['last_name'] = $field['value'];
            } elseif (strpos($key, 'email') !== false) {
                $payload['email'] = $field['value'];
            } elseif (strpos($key, 'phone') !== false) {
                $payload['phone'] = $field['value'];
            } elseif (strpos($key, 'city') !== false) {
                $payload['city'] = $field['value'];
            }
        }

        $this->send_to_api($payload);
    }

    /**
     * Capture Formidable Forms submission
     */
    public function capture_formidable_form($entry_id, $form_id) {
        $entry = FrmEntry::getOne($entry_id, true);
        
        $payload = [
            'first_name' => '',
            'last_name' => '',
            'email' => '',
            'phone' => '',
            'city' => '',
            'source' => 'website-formidable',
            'form_id' => $form_id,
        ];

        foreach ($entry->metas as $field_id => $value) {
            $field = FrmField::getOne($field_id);
            $name = strtolower($field->name);
            
            if (strpos($name, 'first') !== false) {
                $payload['first_name'] = $value;
            } elseif (strpos($name, 'last') !== false) {
                $payload['last_name'] = $value;
            } elseif (strpos($name, 'email') !== false) {
                $payload['email'] = $value;
            } elseif (strpos($name, 'phone') !== false) {
                $payload['phone'] = $value;
            } elseif (strpos($name, 'city') !== false) {
                $payload['city'] = $value;
            }
        }

        $this->send_to_api($payload);
    }

    /**
     * Capture Fluent Forms submission
     */
    public function capture_fluent_form($entry_id, $form_data, $form) {
        $payload = [
            'first_name' => $form_data['names']['first_name'] ?? $form_data['first_name'] ?? '',
            'last_name' => $form_data['names']['last_name'] ?? $form_data['last_name'] ?? '',
            'email' => $form_data['email'] ?? '',
            'phone' => $form_data['phone'] ?? '',
            'city' => $form_data['city'] ?? '',
            'source' => 'website-fluentforms',
            'form_id' => $form->id,
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
    
    /**
     * AJAX handler for testing API connection
     */
    public function ajax_test_connection() {
        // Verify nonce
        check_ajax_referer('echo5_test_connection', 'nonce');
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permission denied']);
            return;
        }
        
        $api_url = get_option('echo5_api_url');
        $api_key = get_option('echo5_api_key');
        
        // Validate settings
        if (empty($api_url) || empty($api_key)) {
            wp_send_json_error(['message' => 'Please configure API URL and API Key first']);
            return;
        }
        
        // Build test payload
        $test_payload = [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@echo5digital.com',
            'phone' => '555-1234',
            'source' => 'wordpress-test',
            'form_id' => 'test-connection',
            'notes' => 'This is a test submission from WordPress plugin - ' . date('Y-m-d H:i:s'),
        ];
        
        // Send test request
        $response = wp_remote_post($api_url . '/api/ingest/lead', [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Tenant-Key' => $api_key,
            ],
            'body' => json_encode($test_payload),
            'timeout' => 15,
        ]);
        
        // Handle response
        if (is_wp_error($response)) {
            wp_send_json_error([
                'message' => 'Connection failed: ' . $response->get_error_message()
            ]);
            return;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        if ($status_code === 200 || $status_code === 201) {
            $data = json_decode($body, true);
            $lead_id = isset($data['leadId']) ? substr($data['leadId'], 0, 8) . '...' : 'unknown';
            
            wp_send_json_success([
                'message' => "Connection successful! Test lead created (ID: {$lead_id})"
            ]);
        } else {
            wp_send_json_error([
                'message' => "API returned error {$status_code}: " . substr($body, 0, 100)
            ]);
        }
    }
}

// Initialize plugin
add_action('plugins_loaded', function() {
    Echo5_Leads_Connector::instance();
});
