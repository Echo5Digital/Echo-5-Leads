<?php
/**
 * Plugin Name: Echo5 Leads Connector
 * Plugin URI: https://www.echo5digital.com
 * Description: Fire-and-forget forwarding of form submissions to Echo5 Vercel Leads API.
 * Version: 0.1.0
 * Author: Echo5 Digital
 * Author URI: https://www.echo5digital.com
 * License: GPL2
 */

if (!defined('ABSPATH')) exit;

// --- Lint environment stubs (ignored by WordPress core) ---
// These no-op stubs prevent static analysis errors when loaded outside WP.
if (!function_exists('add_action')) { function add_action(...$args) {} }
if (!function_exists('add_options_page')) { function add_options_page(...$args) {} }
if (!function_exists('register_setting')) { function register_setting(...$args) {} }
if (!function_exists('add_settings_section')) { function add_settings_section(...$args) {} }
if (!function_exists('add_settings_field')) { function add_settings_field(...$args) {} }
if (!function_exists('settings_fields')) { function settings_fields(...$args) {} }
if (!function_exists('do_settings_sections')) { function do_settings_sections(...$args) {} }
if (!function_exists('submit_button')) { function submit_button(...$args) {} }
if (!function_exists('esc_url_raw')) { function esc_url_raw($v){return $v;} }
if (!function_exists('sanitize_text_field')) { function sanitize_text_field($v){return $v;} }
if (!function_exists('wp_parse_args')) { function wp_parse_args($a,$b){return array_merge($b,$a);} }
if (!function_exists('get_option')) { function get_option(...$args){return []; } }
if (!function_exists('esc_attr')) { function esc_attr($v){return $v;} }
if (!function_exists('wp_json_encode')) { function wp_json_encode($v){return json_encode($v);} }
if (!function_exists('wp_remote_post')) { function wp_remote_post(...$args) {} }
if (!function_exists('wp_unslash')) { function wp_unslash($v){return $v;} }

if (!class_exists('WPCF7_Submission')) { class WPCF7_Submission { public static function get_instance(){ return null; } public function get_posted_data(){ return []; } } }

class Echo5_Leads_Connector {
    private $option_key = 'e5d_leads_settings';

    public function __construct() {
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_menu', [$this, 'add_settings_page']);
        // Hooks for supported form plugins
        add_action('elementor_pro/forms/new_record', [$this, 'on_elementor_submit'], 10, 2);
        add_action('wpcf7_mail_sent', [$this, 'on_cf7_submit'], 10, 1);
        add_action('metform_after_form_submit', [$this, 'on_metform_submit'], 10, 4);
    }

    public function get_settings() {
        $defaults = [
            'api_base' => '',
            'api_key'  => '',
        ];
        return wp_parse_args(get_option($this->option_key, []), $defaults);
    }

    public function register_settings() {
        register_setting('e5d_leads_group', $this->option_key, [
            'type' => 'array',
            'sanitize_callback' => function($opts) {
                $opts['api_base'] = esc_url_raw($opts['api_base']);
                $opts['api_key']  = sanitize_text_field($opts['api_key']);
                return $opts;
            }
        ]);
        add_settings_section('e5d_main', 'Echo5 Leads Connector', '__return_false', 'e5d_leads');
        add_settings_field('api_base', 'API Base URL', function() {
            $v = esc_attr($this->get_settings()['api_base']);
            echo "<input type='url' name='{$this->option_key}[api_base]' value='{$v}' class='regular-text' placeholder='https://leads.echo5digital.com'>";
        }, 'e5d_leads', 'e5d_main');
        add_settings_field('api_key', 'Tenant API Key', function() {
            $v = esc_attr($this->get_settings()['api_key']);
            echo "<input type='text' name='{$this->option_key}[api_key]' value='{$v}' class='regular-text' autocomplete='off'>";
        }, 'e5d_leads', 'e5d_main');
    }

    public function add_settings_page() {
        add_options_page('Echo5 Leads', 'Echo5 Leads', 'manage_options', 'e5d-leads', function() {
            echo '<div class="wrap"><h1>Echo5 Leads</h1><form method="post" action="options.php">';
            settings_fields('e5d_leads_group');
            do_settings_sections('e5d_leads');
            submit_button();
            echo '</form></div>';
        });
    }

    private function fire_and_forget($payload) {
        $s = $this->get_settings();
        if (empty($s['api_base']) || empty($s['api_key'])) return; // Not configured
        $url = rtrim($s['api_base'], '/') . '/api/ingest/lead';
        $args = [
            'method'   => 'POST',
            'timeout'  => 0.01,
            'blocking' => false,
            'headers'  => [
                'Content-Type' => 'application/json',
                'X-Tenant-Key' => $s['api_key'],
            ],
            'body'     => wp_json_encode($payload),
        ];
        wp_remote_post($url, $args); // fire-and-forget
    }

    private function base_payload($extra = []) {
        $utm = [];
        foreach (['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','referrer','source','campaign_name','form_id'] as $k) {
            if (isset($_POST[$k])) $utm[$k] = sanitize_text_field(wp_unslash($_POST[$k]));
        }
        return array_merge($utm, $extra);
    }

    public function on_elementor_submit($record, $handler) {
        $data = $record->get_form_record();
        $fields = [];
        foreach ($data['fields'] as $id => $field) {
            $fields[$field['id']] = $field['value'];
            $fields[$field['title']] = $field['value'];
        }
        $payload = $this->base_payload([
            'first_name' => $fields['first_name'] ?? ($fields['First Name'] ?? ''),
            'last_name'  => $fields['last_name'] ?? ($fields['Last Name'] ?? ''),
            'email'      => $fields['email'] ?? ($fields['Email'] ?? ''),
            'phone'      => $fields['phone'] ?? ($fields['Phone'] ?? ''),
            'city'       => $fields['city'] ?? ($fields['City'] ?? ''),
            'notes'      => $fields['notes'] ?? ($fields['Notes'] ?? ''),
            'original_payload' => $fields,
        ]);
        $this->fire_and_forget($payload);
    }

    public function on_cf7_submit($contact_form) {
        $submission = WPCF7_Submission::get_instance();
        if (!$submission) return;
        $data = $submission->get_posted_data();
        $payload = $this->base_payload([
            'first_name' => $data['first_name'] ?? '',
            'last_name'  => $data['last_name'] ?? '',
            'email'      => $data['your-email'] ?? ($data['email'] ?? ''),
            'phone'      => $data['tel'] ?? ($data['phone'] ?? ''),
            'city'       => $data['city'] ?? '',
            'notes'      => $data['your-message'] ?? ($data['notes'] ?? ''),
            'original_payload' => $data,
        ]);
        $this->fire_and_forget($payload);
    }

    public function on_metform_submit($entry, $form_id, $data, $extras) {
        $payload = $this->base_payload([
            'first_name' => $data['first_name'] ?? '',
            'last_name'  => $data['last_name'] ?? '',
            'email'      => $data['email'] ?? '',
            'phone'      => $data['phone'] ?? '',
            'city'       => $data['city'] ?? '',
            'notes'      => $data['message'] ?? ($data['notes'] ?? ''),
            'form_id'    => (string)$form_id,
            'original_payload' => $data,
        ]);
        $this->fire_and_forget($payload);
    }
}

new Echo5_Leads_Connector();
