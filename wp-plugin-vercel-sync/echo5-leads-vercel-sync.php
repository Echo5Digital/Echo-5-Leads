<?php
/**
 * Plugin Name:       Echo5 Leads Manager with Vercel Sync
 * Plugin URI:        https://echo5digital.com/
 * Description:       Lead management system that syncs to Vercel backend API
 * Version:           1.1.0
 * Author:            Echo5
 * Author URI:        https://echo5digital.com/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       echo5-leads
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'OAL_PLUGIN_FILE', __FILE__ );

// --- Activation / Deactivation Hooks ---
register_activation_hook( __FILE__, 'oal_activate_plugin' );
register_deactivation_hook( __FILE__, 'oal_deactivate_plugin' );

// Ensure meta table exists if plugin was active before this change
add_action( 'init', 'oal_ensure_meta_table_exists' );

function oal_ensure_meta_table_exists() {
    global $wpdb;
    $meta_table_name = $wpdb->prefix . 'openarms_lead_meta';
    $table_exists = $wpdb->get_var( $wpdb->prepare( "SHOW TABLES LIKE %s", $meta_table_name ) );
    if ( $table_exists ) return; // already present

    // Create table if missing
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset_collate = $wpdb->get_charset_collate();
    $meta_sql = "CREATE TABLE $meta_table_name ( id BIGINT NOT NULL AUTO_INCREMENT, lead_id BIGINT NOT NULL, meta_key VARCHAR(191) NOT NULL, meta_value LONGTEXT NULL, PRIMARY KEY (id), UNIQUE KEY lead_meta_key (lead_id, meta_key), KEY lead_id (lead_id) ) $charset_collate;";
    dbDelta( $meta_sql );
}

function oal_activate_plugin() {
    if ( ! wp_next_scheduled( 'oal_check_sla_breaches_hook' ) ) {
        wp_schedule_event( time(), 'every_15_minutes', 'oal_check_sla_breaches_hook' );
    }
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();
    $leads_table_name = $wpdb->prefix . 'openarms_leads';
    $leads_sql = "CREATE TABLE $leads_table_name ( id BIGINT NOT NULL AUTO_INCREMENT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, first_name VARCHAR(100) NULL, last_name VARCHAR(100) NULL, email VARCHAR(255) NULL, phone_e164 VARCHAR(20) NULL, city VARCHAR(120) NULL, interest VARCHAR(120) NULL, have_children TINYINT(1) NULL, planning_to_foster TINYINT(1) NULL, notes TEXT NULL, source VARCHAR(50) NULL, campaign_name VARCHAR(255) NULL, stage ENUM('new','contacted','qualified','orientation','application','home_study','licensed','placement','not_fit') DEFAULT 'new' NOT NULL, assigned_to BIGINT NULL, office VARCHAR(50) NULL, latest_activity_at DATETIME NULL, sla_notification_sent_at DATETIME NULL DEFAULT NULL, spam_flag TINYINT(1) DEFAULT 0 NOT NULL, consent TINYINT(1) DEFAULT 1 NOT NULL, original_payload LONGTEXT NULL, PRIMARY KEY (id) ) $charset_collate;";
    dbDelta( $leads_sql );
    $activities_table_name = $wpdb->prefix . 'openarms_activities';
    $activities_sql = "CREATE TABLE $activities_table_name ( id BIGINT NOT NULL AUTO_INCREMENT, lead_id BIGINT NOT NULL, user_id BIGINT NULL, type ENUM('call','sms','email','note','status_change') NOT NULL, content TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, PRIMARY KEY (id), KEY lead_id (lead_id) ) $charset_collate;";
    dbDelta( $activities_sql );
    $meta_table_name = $wpdb->prefix . 'openarms_lead_meta';
    $meta_sql = "CREATE TABLE $meta_table_name ( id BIGINT NOT NULL AUTO_INCREMENT, lead_id BIGINT NOT NULL, meta_key VARCHAR(191) NOT NULL, meta_value LONGTEXT NULL, PRIMARY KEY (id), UNIQUE KEY lead_meta_key (lead_id, meta_key), KEY lead_id (lead_id) ) $charset_collate;";
    dbDelta( $meta_sql );
}

/**
 * Save dynamic form fields (key => value) for a lead into the meta table.
 * Skips core lead columns to avoid duplication.
 * Stores arrays/objects as JSON.
 */
function oal_save_lead_meta( $lead_id, array $payload ) {
    global $wpdb;
    $meta_table = $wpdb->prefix . 'openarms_lead_meta';

    // Core lead columns (do not store as meta)
    $core_cols = [ 'id','created_at','first_name','last_name','email','phone','phone_e164','phone_number','city','interest','have_children','planning_to_foster','notes','source','campaign_name','stage','assigned_to','office','latest_activity_at','sla_notification_sent_at','spam_flag','consent','original_payload','form_id','referrer' ];

    foreach ( $payload as $key => $value ) {
        // normalize key
        $k = $key;
        if ( in_array( $k, $core_cols, true ) ) continue;

        // prepare value
        if ( is_array( $value ) || is_object( $value ) ) {
            $v = wp_json_encode( $value );
        } else {
            $v = (string) $value;
        }

        // insert or replace
        $existing = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$meta_table} WHERE lead_id = %d AND meta_key = %s", $lead_id, $k ) );
        if ( $existing ) {
            $wpdb->update( $meta_table, [ 'meta_value' => $v ], [ 'id' => $existing ], [ '%s' ], [ '%d' ] );
        } else {
            $wpdb->insert( $meta_table, [ 'lead_id' => $lead_id, 'meta_key' => $k, 'meta_value' => $v ], [ '%d', '%s', '%s' ] );
        }
    }
}

function oal_deactivate_plugin() {
    wp_clear_scheduled_hook( 'oal_check_sla_breaches_hook' );
}

// --- Includes ---
if ( is_admin() ) {
    require_once plugin_dir_path( __FILE__ ) . 'admin/admin-pages.php';
    require_once plugin_dir_path( __FILE__ ) . 'admin/migration-page.php';
}

// ========================================
// VERCEL API SYNC FUNCTION (NEW)
// ========================================

/**
 * Send lead data to Vercel backend API
 * 
 * @param array $params Lead parameters
 * @return array Result with success status
 */
function oal_send_to_vercel_api( array $params ) {
    // Get Vercel API settings from WordPress options
    $options = get_option( 'oal_settings', [] );
    $api_url = ! empty( $options['vercel_api_url'] ) ? $options['vercel_api_url'] : '';
    $api_key = ! empty( $options['vercel_api_key'] ) ? $options['vercel_api_key'] : '';
    
    // Skip if not configured
    if ( empty( $api_url ) || empty( $api_key ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'Vercel API: Not configured. Set API URL and API Key in settings.' );
        }
        return [ 'ok' => false, 'error' => 'Vercel API not configured' ];
    }
    
    // Build payload - normalize field names from snake_case to match API expectations
    $payload = [];
    foreach ( $params as $key => $value ) {
        if ( ! empty( $value ) || $value === 0 || $value === false ) {
            $payload[ $key ] = $value;
        }
    }
    
    // Ensure we have at least some data
    if ( empty( $payload ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'Vercel API: No data to send' );
        }
        return [ 'ok' => false, 'error' => 'No data to send' ];
    }
    
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'Vercel API: Sending ' . count( $payload ) . ' fields to ' . $api_url );
    }
    
    // Send to Vercel API (fire-and-forget with short timeout)
    $response = wp_remote_post( $api_url . '/api/ingest/lead', [
        'timeout' => 5,
        'blocking' => true, // Set to true to get response for debugging
        'headers' => [
            'Content-Type' => 'application/json',
            'X-Tenant-Key' => $api_key,
        ],
        'body' => wp_json_encode( $payload ),
    ] );
    
    // Log response for debugging
    if ( is_wp_error( $response ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'Vercel API Error: ' . $response->get_error_message() );
        }
        return [ 'ok' => false, 'error' => $response->get_error_message() ];
    } else {
        $status_code = wp_remote_retrieve_response_code( $response );
        if ( $status_code >= 200 && $status_code < 300 ) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                $body = wp_remote_retrieve_body( $response );
                error_log( 'Vercel API Success: ' . $body );
            }
            return [ 'ok' => true, 'status' => $status_code ];
        } else {
            $body = wp_remote_retrieve_body( $response );
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( 'Vercel API Error: HTTP ' . $status_code . ' - ' . $body );
            }
            return [ 'ok' => false, 'error' => 'HTTP ' . $status_code, 'body' => $body ];
        }
    }
}

// --- Pro Elements Form Integration ---
add_action('elementor_pro/forms/new_record', 'oal_handle_pro_elements_submission', 10, 2);

function oal_handle_pro_elements_submission($record, $handler) {
    $form_data = [];
    $raw_fields = $record->get('fields');
    
    // Map Pro Elements form fields to our lead fields
    foreach ($raw_fields as $id => $field) {
        $field_name = $field['id'];
        $field_label = $field['title'] ?? $field_name; // Get the field label if available
        
        // First try matching by field label
        $matched = true;
        switch(strtolower($field_label)) {
            case 'first name':
                $form_data['first_name'] = $field['value'];
                break;
            case 'last name':
                $form_data['last_name'] = $field['value'];
                break;
            case 'your email':
            case 'email':
                $form_data['email'] = $field['value'];
                break;
            case 'your phone number':
            case 'phone':
            case 'phone number':
                $form_data['phone'] = $field['value'];
                break;
            case 'how can we help you?':
            case 'message':
            case 'notes':
                $form_data['notes'] = $field['value'];
                break;
            default:
                $matched = false;
        }
        
        // If no match by label, try matching by field ID pattern
        if (!$matched) {
            if (strpos($field_name, 'first') !== false || strpos($field_name, 'fname') !== false) {
                $form_data['first_name'] = $field['value'];
            } elseif (strpos($field_name, 'last') !== false || strpos($field_name, 'lname') !== false) {
                $form_data['last_name'] = $field['value'];
            } elseif (strpos($field_name, 'email') !== false) {
                $form_data['email'] = $field['value'];
            } elseif (strpos($field_name, 'phone') !== false) {
                $form_data['phone'] = $field['value'];
            } elseif (strpos($field_name, 'help') !== false || strpos($field_name, 'message') !== false) {
                $form_data['notes'] = $field['value'];
            } else {
                // Store any unmatched fields in notes
                if (!isset($form_data['notes'])) {
                    $form_data['notes'] = '';
                }
                $form_data['notes'] .= $field_label . ': ' . $field['value'] . "\n";
            }
        }
    }
    
    // Also include raw field id => value pairs so dynamic fields are preserved
    foreach ( $raw_fields as $fid => $f ) {
        $fname = is_string( $fid ) ? $fid : ( isset( $f['id'] ) ? $f['id'] : null );
        if ( $fname ) {
            // store the raw field value under a stable key
            $field_key = 'pro_field_' . sanitize_key( $fname );
            $form_data[ $field_key ] = $f['value'] ?? '';

            // store the human label for this field (not the value) so we can show a friendly name
            if ( ! empty( $f['title'] ) ) {
                $label_key = 'pro_field_label_' . sanitize_key( $fname );
                $form_data[ $label_key ] = $f['title'];
            }
        }
    }
    
    // Set the source
    $form_data['source'] = 'pro_elements_form';
    
    // Process the lead (saves to local WordPress database)
    $result = oal_ingest_lead_array($form_data);
    
    // Send to Vercel API (NEW)
    oal_send_to_vercel_api($form_data);
    
    // Log any errors
    if (empty($result['ok']) && defined('WP_DEBUG') && WP_DEBUG) {
        error_log('Pro Elements Lead Processing Error: ' . ($result['error'] ?? 'Unknown error'));
    }
}

// --- REST API Endpoint ---
add_action( 'rest_api_init', 'oal_register_lead_endpoint' );
function oal_register_lead_endpoint() { register_rest_route( 'echo5-leads/v1', '/lead', [ 'methods' => 'POST', 'callback' => 'oal_handle_lead_submission', 'permission_callback' => 'oal_lead_submission_permission_check' ] ); }
function oal_lead_submission_permission_check( WP_REST_Request $request ) { 
    $options = get_option( 'oal_settings', [] ); 
    $secret = ! empty( $options['webhook_secret'] ) ? $options['webhook_secret'] : ''; 
    if ( empty( $secret ) ) return true; 
    $header_secret = $request->get_header( 'x-hook-secret' ); 
    if ( empty( $header_secret ) ) return new WP_Error( 'rest_forbidden', 'Missing X-Hook-Secret header.', [ 'status' => 401 ] ); 
    if ( ! hash_equals( $secret, $header_secret ) ) return new WP_Error( 'rest_forbidden', 'Invalid webhook secret.', [ 'status' => 403 ] ); 
    return true; 
}
function oal_is_lead_spam( $lead_payload ) { $options = get_option( 'oal_settings', [] ); $keywords_string = ! empty( $options['spam_keywords'] ) ? $options['spam_keywords'] : ''; if ( empty( $keywords_string ) ) return false; $keywords = array_filter( array_map( 'trim', explode( ',', $keywords_string ) ) ); if ( empty( $keywords ) ) return false; $content_to_check = strtolower( ( $lead_payload['first_name'] ?? '' ) . ' ' . ( $lead_payload['last_name'] ?? '' ) . ' ' . ( $lead_payload['email'] ?? '' ) . ' ' . ( $lead_payload['notes'] ?? '' ) ); foreach ( $keywords as $keyword ) { if ( strpos( $content_to_check, strtolower( $keyword ) ) !== false ) return true; } return false; }
function oal_handle_lead_submission( WP_REST_Request $request ) {
    // Accept JSON or form-encoded bodies. Many external form builders POST as
    // application/x-www-form-urlencoded, so try multiple sources.
    $params = $request->get_json_params();
    if ( empty( $params ) || ! is_array( $params ) ) {
        $params = $request->get_body_params();
    }
    if ( ! is_array( $params ) ) {
        $params = $request->get_params();
    }

    // Normalize common field names so external forms with different naming
    // conventions will still be captured.
    $normalized = [];

    // Email
    if ( ! empty( $params['email'] ) ) {
        $normalized['email'] = $params['email'];
    } elseif ( ! empty( $params['email_address'] ) ) {
        $normalized['email'] = $params['email_address'];
    } elseif ( ! empty( $params['your-email'] ) ) {
        $normalized['email'] = $params['your-email'];
    }

    // Phone (map common keys to 'phone' so ingest normalizer runs)
    if ( ! empty( $params['phone'] ) ) {
        $normalized['phone'] = $params['phone'];
    } elseif ( ! empty( $params['phone_e164'] ) ) {
        $normalized['phone'] = $params['phone_e164'];
    } elseif ( ! empty( $params['phone_number'] ) ) {
        $normalized['phone'] = $params['phone_number'];
    } elseif ( ! empty( $params['telephone'] ) ) {
        $normalized['phone'] = $params['telephone'];
    } elseif ( ! empty( $params['mobile'] ) ) {
        $normalized['phone'] = $params['mobile'];
    }

    // Names
    if ( ! empty( $params['first_name'] ) ) {
        $normalized['first_name'] = $params['first_name'];
    } elseif ( ! empty( $params['fname'] ) ) {
        $normalized['first_name'] = $params['fname'];
    }
    if ( ! empty( $params['last_name'] ) ) {
        $normalized['last_name'] = $params['last_name'];
    } elseif ( ! empty( $params['lname'] ) ) {
        $normalized['last_name'] = $params['lname'];
    }

    // Full name fallback
    if ( empty( $normalized['first_name'] ) && empty( $normalized['last_name'] ) && ! empty( $params['name'] ) ) {
        $parts = preg_split( '/\s+/', trim( $params['name'] ), 2 );
        $normalized['first_name'] = $parts[0] ?? '';
        $normalized['last_name'] = $parts[1] ?? '';
    }

    // Copy common optional fields
    $copy_keys = [ 'city', 'interest', 'notes', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'source', 'campaign_name', 'have_children', 'planning_to_foster', 'form_id' ];
    foreach ( $copy_keys as $k ) {
        if ( isset( $params[ $k ] ) && ! isset( $normalized[ $k ] ) ) {
            $normalized[ $k ] = $params[ $k ];
        }
    }

    // Keep original payload for debug/traceability
    if ( ! isset( $normalized['original_payload'] ) ) {
        $normalized['original_payload'] = $params;
    }

    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'REST Lead Submission (normalized): ' . print_r( $normalized, true ) );
    }

    $result = oal_ingest_lead_array( is_array( $normalized ) ? $normalized : [] );
    
    // Send to Vercel API (NEW)
    oal_send_to_vercel_api( $normalized );

    if ( empty( $result['ok'] ) ) {
        $status = isset( $result['status'] ) ? (int) $result['status'] : 400;
        return new WP_Error( 'bad_request', $result['error'] ?? 'Bad request', [ 'status' => $status ] );
    }

    return new WP_REST_Response( $result, 200 );
}
// --- Phone Normalizer ---
function oal_normalize_phone($phone){
    if (empty($phone)) return null;
    $digits = preg_replace('/\D+/', '', $phone);
    if (strlen($digits) === 10) return '+1'.$digits;
    if (strlen($digits) === 11 && substr($digits, 0, 1) === '1') return '+'.$digits;
    return null;
}

// Legacy function for backward compatibility
function oal_normalize_phone_to_e164( $phone ) { 
    return oal_normalize_phone($phone);
}

// --- Core Ingest Helper ---
function oal_ingest_lead_array(array $params){
    global $wpdb;
    $leads_table = $wpdb->prefix.'openarms_leads';
    $acts_table  = $wpdb->prefix.'openarms_activities';

    // Require phone OR email
    $email = !empty($params['email']) ? sanitize_email(trim($params['email'])) : null;
    $phone = !empty($params['phone']) ? oal_normalize_phone($params['phone']) : null;
    if (!$email && !$phone){
        return ['ok'=>false,'error'=>'Either email or a valid phone number is required.','status'=>400];
    }

    // Debug logging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'INGEST: Processing email=' . ($email ?: 'none') . ', phone=' . ($phone ?: 'none') );
    }

    // Look up existing by email or phone
    $lead = null;
    if ($email){
        $lead = $wpdb->get_row($wpdb->prepare("SELECT id,source FROM $leads_table WHERE email=%s",$email));
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'INGEST: Email lookup result: ' . ($lead ? 'found lead ID ' . $lead->id : 'no existing lead') );
        }
    }
    if (!$lead && $phone){
        $lead = $wpdb->get_row($wpdb->prepare("SELECT id,source FROM $leads_table WHERE phone_e164=%s",$phone));
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'INGEST: Phone lookup result: ' . ($lead ? 'found lead ID ' . $lead->id : 'no existing lead') );
        }
    }

    if ($lead){
        // UPDATE — preserve first-touch source
        $action = 'updated';
        $lead_id = (int)$lead->id;
        $final_source = $lead->source;

        $update = [];
        if (isset($params['first_name'])) $update['first_name'] = sanitize_text_field($params['first_name']);
        if (isset($params['last_name']))  $update['last_name']  = sanitize_text_field($params['last_name']);
        if (isset($params['city']))       $update['city']       = sanitize_text_field($params['city']);
        if (isset($params['interest']))   $update['interest']   = sanitize_text_field($params['interest']);
        if (isset($params['notes']))      $update['notes']      = sanitize_textarea_field($params['notes']);
        if (isset($params['have_children'])) $update['have_children'] = rest_sanitize_boolean($params['have_children']);
        if (isset($params['planning_to_foster'])) $update['planning_to_foster'] = rest_sanitize_boolean($params['planning_to_foster']);
        if ($email)                        $update['email']      = $email;
        if ($phone)                        $update['phone_e164'] = $phone;
        
        // Store original payload
        $update['original_payload'] = wp_json_encode($params);
        
        // Check spam
        if (oal_is_lead_spam($params)) {
            $update['spam_flag'] = 1;
        }

        if ($update){
            $wpdb->update($leads_table, $update, ['id'=>$lead_id]);
        }
    } else {
        // INSERT — first-touch mapping: source > utm_source > "website"
        $action = 'created';
        $src = !empty($params['source']) ? strtolower(trim($params['source'])) : '';
        $utm = !empty($params['utm_source']) ? strtolower(trim($params['utm_source'])) : '';
        $final_source = $src !== '' ? $src : ($utm !== '' ? $utm : 'website');

        // Prepare lead data
        $lead_data = [
            'first_name' => !empty($params['first_name']) ? sanitize_text_field($params['first_name']) : null,
            'last_name'  => !empty($params['last_name'])  ? sanitize_text_field($params['last_name'])  : null,
            'email'      => $email,
            'phone_e164' => $phone,
            'source'     => $final_source,
            'stage'      => 'new',
            'created_at' => current_time('mysql', true),
            'original_payload' => wp_json_encode($params),
        ];
        
        // Add optional fields
        if (isset($params['city'])) $lead_data['city'] = sanitize_text_field($params['city']);
        if (isset($params['interest'])) $lead_data['interest'] = sanitize_text_field($params['interest']);
        if (isset($params['notes'])) $lead_data['notes'] = sanitize_textarea_field($params['notes']);
        if (isset($params['have_children'])) $lead_data['have_children'] = rest_sanitize_boolean($params['have_children']);
        if (isset($params['planning_to_foster'])) $lead_data['planning_to_foster'] = rest_sanitize_boolean($params['planning_to_foster']);
        if (isset($params['campaign_name']) || isset($params['utm_campaign'])) {
            $campaign = $params['campaign_name'] ?? $params['utm_campaign'];
            $lead_data['campaign_name'] = sanitize_text_field($campaign);
        }
        
        // Check spam
        if (oal_is_lead_spam($params)) {
            $lead_data['spam_flag'] = 1;
        }

        $wpdb->insert($leads_table, $lead_data);
        $lead_id = (int)$wpdb->insert_id;

        // Attribution v1 note (on insert only)
        $wpdb->insert($acts_table, [
            'lead_id'    => $lead_id,
            'user_id'    => null,
            'type'       => 'note',
            'content'    => wp_json_encode(['title'=>'Attribution v1','note'=>'source set to: '.$final_source]),
            'created_at' => current_time('mysql', true),
        ]);
    }

    // UTM snapshot (create OR update)
    $utm_keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid','referrer'];
    $utm = [];
    foreach($utm_keys as $k){
        if (!empty($params[$k])) $utm[$k] = sanitize_text_field(trim($params[$k]));
    }
    if ($utm){
        $wpdb->insert($acts_table, [
            'lead_id'    => $lead_id,
            'user_id'    => null,
            'type'       => 'note',
            'content'    => wp_json_encode(['title'=>'UTM snapshot','note'=>wp_json_encode($utm)]),
            'created_at' => current_time('mysql', true),
        ]);
    }

    // Save dynamic form fields to lead meta table (non-core fields)
    if ( isset( $lead_id ) && $lead_id ) {
        oal_save_lead_meta( $lead_id, $params );
    }

    return ['ok'=>true,'action'=>$action,'lead_id'=>$lead_id,'source'=>$final_source];
}

// --- Facebook Webhook Integration ---
add_action('rest_api_init', 'oal_register_fb_webhook');

function oal_register_fb_webhook() {
    register_rest_route('oal/v1', '/fb-webhook', [
        [
            'methods'  => 'GET',
            'callback' => 'oal_fb_webhook_verify',
            'permission_callback' => '__return_true'
        ],
        [
            'methods'  => 'POST',
            'callback' => 'oal_fb_webhook_receive',
            'permission_callback' => '__return_true'
        ]
    ]);
}

/** GET: Facebook verification */
function oal_fb_webhook_verify(WP_REST_Request $req){
    $mode      = $req->get_param('hub_mode') ?: $req->get_param('hub.mode');
    $token     = $req->get_param('hub_verify_token') ?: $req->get_param('hub.verify_token');
    $challenge = $req->get_param('hub_challenge') ?: $req->get_param('hub.challenge');

    $options = get_option('oal_settings', []);
    $verify = $options['fb_verify_token'] ?? '';
    
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'FB Verify: mode=' . $mode . ', token=' . $token . ', challenge=' . $challenge );
    }
    
    if ($mode === 'subscribe' && $token && !empty($verify) && hash_equals($verify, $token)) {
        return new WP_REST_Response($challenge, 200);
    }
    return new WP_Error('forbidden', 'Verification failed', ['status'=>403]);
}

/** POST: Facebook leadgen events */
function oal_fb_webhook_receive(WP_REST_Request $req){
    $options = get_option('oal_settings', []);
    $app_secret = $options['fb_app_secret'] ?? '';
    
    $sig = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
    $raw = $req->get_body();

    // Debug logging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'FB Webhook: Received ' . strlen($raw) . ' bytes' );
    }

    // Verify HMAC SHA256 signature if app_secret set
    if (!empty($app_secret) && $sig) {
        if (strpos($sig, 'sha256=') === 0) {
            $sig = substr($sig, 7);
        }
        $calc = hash_hmac('sha256', $raw, $app_secret);
        if (!hash_equals($calc, $sig)) {
            if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                error_log( 'FB Webhook: Signature verification failed' );
            }
            return new WP_Error('forbidden', 'Bad signature', ['status'=>403]);
        }
    }

    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        return new WP_Error('bad_request', 'Invalid JSON', ['status'=>400]);
    }

    // Process Facebook lead webhooks
    if (!empty($payload['entry'])) {
        foreach ($payload['entry'] as $entry) {
            if (empty($entry['changes'])) continue;

            foreach ($entry['changes'] as $change) {
                if (($change['field'] ?? '') !== 'leadgen') continue;
                $val = $change['value'] ?? [];
                $lead_id = $val['leadgen_id'] ?? null;
                $form_id = $val['form_id'] ?? null;
                $page_id = $val['page_id'] ?? null;
                $ad_id = $val['ad_id'] ?? null;
                $adset_id = $val['adgroup_id'] ?? null;
                $campaign_id = $val['campaign_id'] ?? null;

                if ($lead_id) {
                    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                        error_log( 'FB Webhook: Processing lead ' . $lead_id );
                    }
                    oal_fb_fetch_and_ingest_lead($lead_id, [
                        'form_id' => $form_id,
                        'page_id' => $page_id,
                        'ad_id' => $ad_id,
                        'adset_id' => $adset_id,
                        'campaign_id' => $campaign_id,
                    ]);
                }
            }
        }
    }

    return new WP_REST_Response(['ok'=>true], 200);
}

/** Fetch lead from Facebook and add to our system */
function oal_fb_fetch_and_ingest_lead($lead_id, array $meta = []){
    $options = get_option('oal_settings', []);
    $page_token = $options['fb_page_access_token'] ?? '';
    
    if (empty($page_token)) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('FB: No page access token configured');
        }
        return;
    }

    $url = "https://graph.facebook.com/v19.0/{$lead_id}?access_token=" . rawurlencode($page_token);
    $resp = wp_remote_get($url, ['timeout'=>10]);
    
    if (is_wp_error($resp)) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('FB: Error fetching lead: ' . $resp->get_error_message());
        }
        return;
    }

    $body = wp_remote_retrieve_body($resp);
    $data = json_decode($body, true);
    
    if (!is_array($data)) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('FB: Invalid response: ' . $body);
        }
        return;
    }

    // Parse Facebook form fields
    $field_map = [];
    if (!empty($data['field_data'])) {
        foreach ($data['field_data'] as $fd) {
            $name = isset($fd['name']) ? strtolower(trim($fd['name'])) : '';
            $value = is_array($fd['values'] ?? null) ? reset($fd['values']) : ($fd['values'] ?? '');
            if ($name) $field_map[$name] = is_string($value) ? trim($value) : $value;
        }
    }

    // Map Facebook fields to our system
    $first = $field_map['first_name'] ?? null;
    $last = $field_map['last_name'] ?? null;
    
    // Handle full name if first/last not separate
    if (!$first && !$last && !empty($field_map['full_name'])) {
        $parts = preg_split('/\s+/', $field_map['full_name'], 2);
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';
    }

    $payload = [
        'source' => 'facebook',
        'form_id' => $meta['form_id'] ?? ($data['form_id'] ?? 'fb_form'),
        'first_name' => $first,
        'last_name' => $last,
        'email' => $field_map['email'] ?? null,
        'phone' => $field_map['phone_number'] ?? null,
        'city' => $field_map['city'] ?? null,
        'notes' => 'Lead from Facebook',
        
        // Attribution for tracking
        'utm_source' => 'facebook',
        'utm_medium' => 'paid_social',
        'utm_campaign' => $meta['campaign_id'] ?? null,
        'utm_term' => $meta['adset_id'] ?? null,
        'utm_content' => $meta['ad_id'] ?? null,
        'referrer' => 'meta_webhook',
    ];

    // Add to our lead system
    if (function_exists('oal_ingest_lead_array')) {
        $result = oal_ingest_lead_array($payload);
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('FB: Lead ingested - ' . print_r($result, true));
        }
        
        // Send to Vercel API (NEW)
        oal_send_to_vercel_api($payload);
    }
}

// --- Contact Form 7 Integration ---
add_action( 'wpcf7_before_send_mail', 'oal_handle_cf7_submission', 10, 1 );

// Global variable to prevent duplicate processing
global $oal_cf7_processed_submissions;
if (!isset($oal_cf7_processed_submissions)) {
    $oal_cf7_processed_submissions = [];
}

function oal_handle_cf7_submission( $contact_form ) {
    global $oal_cf7_processed_submissions;
    
    $submission = WPCF7_Submission::get_instance();
    if ( ! $submission ) return;
    
    $posted_data = $submission->get_posted_data();
    
    // Create a unique hash for this submission to prevent duplicate processing
    $submission_hash = md5(serialize($posted_data) . $contact_form->id());
    
    // Check if we've already processed this exact submission
    if (in_array($submission_hash, $oal_cf7_processed_submissions)) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'CF7: Skipping duplicate submission processing' );
        }
        return;
    }
    
    // Mark this submission as processed
    $oal_cf7_processed_submissions[] = $submission_hash;
    
    // Clean up old hashes (keep only last 10 to prevent memory issues)
    if (count($oal_cf7_processed_submissions) > 10) {
        $oal_cf7_processed_submissions = array_slice($oal_cf7_processed_submissions, -10);
    }
    
    // Debug logging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'CF7 Submission Data: ' . print_r( $posted_data, true ) );
    }
    
    // Map CF7 fields to our lead fields
    $params = [];
    
    // Required fields - try common CF7 field names
    if ( isset( $posted_data['your-name'] ) ) {
        $name_parts = explode( ' ', trim( $posted_data['your-name'] ), 2 );
        $params['first_name'] = $name_parts[0] ?? '';
        $params['last_name'] = $name_parts[1] ?? '';
    }
    if ( isset( $posted_data['first-name'] ) ) $params['first_name'] = $posted_data['first-name'];
    if ( isset( $posted_data['last-name'] ) ) $params['last_name'] = $posted_data['last-name'];
    if ( isset( $posted_data['your-email'] ) ) $params['email'] = $posted_data['your-email'];
    if ( isset( $posted_data['email'] ) ) $params['email'] = $posted_data['email'];
    if ( isset( $posted_data['your-phone'] ) ) $params['phone'] = $posted_data['your-phone'];
    if ( isset( $posted_data['phone'] ) ) $params['phone'] = $posted_data['phone'];
    
    // Optional fields
    if ( isset( $posted_data['your-city'] ) ) $params['city'] = $posted_data['your-city'];
    if ( isset( $posted_data['city'] ) ) $params['city'] = $posted_data['city'];
    if ( isset( $posted_data['your-message'] ) ) $params['notes'] = $posted_data['your-message'];
    if ( isset( $posted_data['message'] ) ) $params['notes'] = $posted_data['message'];
    if ( isset( $posted_data['your-subject'] ) ) $params['interest'] = $posted_data['your-subject'];
    if ( isset( $posted_data['interest'] ) ) $params['interest'] = $posted_data['interest'];
    
    // Checkboxes
    if ( isset( $posted_data['have-children'] ) ) $params['have_children'] = !empty( $posted_data['have-children'] );
    if ( isset( $posted_data['planning-to-foster'] ) ) $params['planning_to_foster'] = !empty( $posted_data['planning-to-foster'] );
    
    // UTM parameters from URL or hidden fields
    if ( isset( $_GET['utm_source'] ) ) $params['utm_source'] = $_GET['utm_source'];
    if ( isset( $_GET['utm_medium'] ) ) $params['utm_medium'] = $_GET['utm_medium'];
    if ( isset( $_GET['utm_campaign'] ) ) $params['utm_campaign'] = $_GET['utm_campaign'];
    if ( isset( $_GET['utm_term'] ) ) $params['utm_term'] = $_GET['utm_term'];
    if ( isset( $_GET['utm_content'] ) ) $params['utm_content'] = $_GET['utm_content'];
    if ( isset( $_GET['gclid'] ) ) $params['gclid'] = $_GET['gclid'];
    if ( isset( $_GET['fbclid'] ) ) $params['fbclid'] = $_GET['fbclid'];
    
    // Hidden fields from form
    if ( isset( $posted_data['utm_source'] ) ) $params['utm_source'] = $posted_data['utm_source'];
    if ( isset( $posted_data['utm_medium'] ) ) $params['utm_medium'] = $posted_data['utm_medium'];
    if ( isset( $posted_data['utm_campaign'] ) ) $params['utm_campaign'] = $posted_data['utm_campaign'];
    if ( isset( $posted_data['utm_term'] ) ) $params['utm_term'] = $posted_data['utm_term'];
    if ( isset( $posted_data['utm_content'] ) ) $params['utm_content'] = $posted_data['utm_content'];
    if ( isset( $posted_data['gclid'] ) ) $params['gclid'] = $posted_data['gclid'];
    if ( isset( $posted_data['fbclid'] ) ) $params['fbclid'] = $posted_data['fbclid'];
    if ( isset( $posted_data['source'] ) ) $params['source'] = $posted_data['source'];
    
    // Set default source if none provided
    if ( empty( $params['source'] ) && empty( $params['utm_source'] ) ) {
        $params['source'] = 'website';
    }
    
    // Add form reference
    $params['form_id'] = 'cf7_' . $contact_form->id();
    $params['referrer'] = wp_get_referer();

    // Preserve all raw CF7 posted fields (prefix keys to avoid collisions)
    foreach ( $posted_data as $k => $v ) {
        $safe_k = 'cf7_' . sanitize_key( (string) $k );
        if ( ! isset( $params[ $safe_k ] ) ) {
            $params[ $safe_k ] = is_array( $v ) ? wp_json_encode( $v ) : $v;
        }
    }
    
    // Only proceed if we have minimum required data
    if ( empty( $params['first_name'] ) && empty( $params['last_name'] ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'CF7: No name found in submission' );
        }
        return;
    }
    if ( empty( $params['email'] ) && empty( $params['phone'] ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'CF7: No email or phone found in submission' );
        }
        return;
    }
    
    // Debug logging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'CF7 Mapped Params: ' . print_r( $params, true ) );
    }
    
    // Submit to our ingest function (saves to local WordPress database)
    $result = oal_ingest_lead_array( $params );
    
    // Send to Vercel API (NEW)
    oal_send_to_vercel_api( $params );
    
    // Log result for debugging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'CF7 Lead Submission Result: ' . print_r( $result, true ) );
        error_log( 'CF7 Final mapped params: ' . print_r( $params, true ) );
    }
}

// --- Elementor Pro Forms Integration ---
add_action( 'elementor_pro/forms/new_record', 'oal_handle_elementor_submission', 10, 2 );

function oal_handle_elementor_submission( $record, $handler ) {
    // Check if Elementor Pro is active
    if ( ! class_exists( '\ElementorPro\Plugin' ) ) {
        return;
    }
    
    // Get form fields
    $form_fields = $record->get( 'fields' );
    if ( empty( $form_fields ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'Elementor: No form fields found' );
        }
        return;
    }
    
    // Debug logging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'Elementor Form Submission Data: ' . print_r( $form_fields, true ) );
    }
    
    // Map Elementor fields to our lead fields
    $params = [];
    
    // Required fields - try common Elementor field names and IDs
    $params['first_name'] = oal_get_elementor_field_value( $form_fields, ['first_name', 'firstname', 'fname', 'name'] );
    $params['last_name'] = oal_get_elementor_field_value( $form_fields, ['last_name', 'lastname', 'lname', 'surname'] );
    $params['email'] = oal_get_elementor_field_value( $form_fields, ['email', 'email_address', 'mail'] );
    $params['phone'] = oal_get_elementor_field_value( $form_fields, ['phone', 'telephone', 'phone_number', 'mobile'] );
    
    // Optional fields
    $params['city'] = oal_get_elementor_field_value( $form_fields, ['city', 'location', 'town'] );
    $params['interest'] = oal_get_elementor_field_value( $form_fields, ['interest', 'interests', 'service', 'program'] );
    $params['notes'] = oal_get_elementor_field_value( $form_fields, ['message', 'notes', 'comments', 'additional_info'] );
    
    // Boolean fields
    $have_children = oal_get_elementor_field_value( $form_fields, ['have_children', 'children', 'has_children'] );
    if ( $have_children ) {
        $params['have_children'] = in_array( strtolower( $have_children ), ['yes', '1', 'true', 'on'] ) ? 1 : 0;
    }
    
    $planning_to_foster = oal_get_elementor_field_value( $form_fields, ['planning_to_foster', 'foster', 'fostering'] );
    if ( $planning_to_foster ) {
        $params['planning_to_foster'] = in_array( strtolower( $planning_to_foster ), ['yes', '1', 'true', 'on'] ) ? 1 : 0;
    }
    
    // UTM and tracking parameters
    $params['utm_source'] = oal_get_elementor_field_value( $form_fields, ['utm_source'] );
    $params['utm_medium'] = oal_get_elementor_field_value( $form_fields, ['utm_medium'] );
    $params['utm_campaign'] = oal_get_elementor_field_value( $form_fields, ['utm_campaign'] );
    $params['utm_term'] = oal_get_elementor_field_value( $form_fields, ['utm_term'] );
    $params['utm_content'] = oal_get_elementor_field_value( $form_fields, ['utm_content'] );
    $params['gclid'] = oal_get_elementor_field_value( $form_fields, ['gclid'] );
    $params['fbclid'] = oal_get_elementor_field_value( $form_fields, ['fbclid'] );
    $params['source'] = oal_get_elementor_field_value( $form_fields, ['source'] );
    
    // Set default source if none provided
    if ( empty( $params['source'] ) && empty( $params['utm_source'] ) ) {
        $params['source'] = 'website';
    }
    
    // Add form reference
    $form_name = $record->get_form_settings( 'form_name' );
    $params['form_id'] = 'elementor_' . ( $form_name ? sanitize_title( $form_name ) : 'form' );
    $params['referrer'] = wp_get_referer();

    // Preserve all raw Elementor field id => value and label => value pairs for dynamic storage
    $raw_fields = $record->get( 'fields' );
    if ( ! empty( $raw_fields ) && is_array( $raw_fields ) ) {
        foreach ( $raw_fields as $fid => $fdata ) {
            $field_id_key = 'elementor_field_' . sanitize_key( (string) $fid );
            $params[ $field_id_key ] = isset( $fdata['value'] ) ? $fdata['value'] : '';

            // store label for this field (linked to field id) instead of duplicating the value
            if ( isset( $fdata['title'] ) && $fdata['title'] ) {
                $label_key = 'elementor_field_label_' . sanitize_key( (string) $fid );
                $params[ $label_key ] = $fdata['title'];
            }
        }
    }
    
    // Only proceed if we have minimum required data
    if ( empty( $params['first_name'] ) && empty( $params['last_name'] ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'Elementor: No name found in submission' );
        }
        return;
    }
    if ( empty( $params['email'] ) && empty( $params['phone'] ) ) {
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( 'Elementor: No email or phone found in submission' );
        }
        return;
    }
    
    // Debug logging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'Elementor Mapped Params: ' . print_r( $params, true ) );
    }
    
    // Submit to our ingest function (saves to local WordPress database)
    $result = oal_ingest_lead_array( $params );
    
    // Send to Vercel API (NEW)
    oal_send_to_vercel_api( $params );
    
    // Log result for debugging
    if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
        error_log( 'Elementor Lead Submission Result: ' . print_r( $result, true ) );
    }
}

/**
 * Helper function to get field value from Elementor form fields
 * 
 * @param array $form_fields The form fields array from Elementor
 * @param array $field_names Array of possible field names to check
 * @return string|null The field value or null if not found
 */
function oal_get_elementor_field_value( $form_fields, $field_names ) {
    foreach ( $field_names as $field_name ) {
        // Check by field ID
        if ( isset( $form_fields[ $field_name ] ) && ! empty( $form_fields[ $field_name ]['value'] ) ) {
            return sanitize_text_field( $form_fields[ $field_name ]['value'] );
        }
        
        // Check by field title/label (case insensitive)
        foreach ( $form_fields as $field_id => $field_data ) {
            if ( isset( $field_data['title'] ) && 
                 strcasecmp( $field_data['title'], $field_name ) === 0 && 
                 ! empty( $field_data['value'] ) ) {
                return sanitize_text_field( $field_data['value'] );
            }
        }
    }
    
    return null;
}

// --- WP Cron Setup ---
add_filter( 'cron_schedules', 'oal_add_cron_schedules' );
add_action( 'oal_check_sla_breaches_hook', 'oal_check_sla_breaches' );
function oal_add_cron_schedules( $schedules ) { $schedules['every_15_minutes'] = [ 'interval' => 900, 'display'  => 'Every 15 Minutes' ]; return $schedules; }
function oal_check_sla_breaches() { $options = get_option( 'oal_settings', [] ); $sla_hours = ! empty( $options['sla_hours'] ) ? absint( $options['sla_hours'] ) : 4; $manager_emails = ! empty( $options['manager_emails'] ) ? sanitize_text_field( $options['manager_emails'] ) : ''; if ( empty( $manager_emails ) ) return; global $wpdb; $table_name = $wpdb->prefix . 'openarms_leads'; $leads = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table_name} WHERE stage = 'new' AND spam_flag = 0 AND latest_activity_at IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL %d HOUR) AND (sla_notification_sent_at IS NULL OR sla_notification_sent_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))", $sla_hours ) ); if ( empty( $leads ) ) return; $subject = sprintf( '[%s] %d Leads Have Breached the SLA', get_bloginfo( 'name' ), count( $leads ) ); $message = '<p>The following leads have been in the "New" stage for more than ' . esc_html( $sla_hours ) . ' hours with no activity:</p>'; $message .= '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="text-align: left; border-bottom: 1px solid #ddd; padding: 8px;">Name</th><th style="text-align: left; border-bottom: 1px solid #ddd; padding: 8px;">City</th><th style="text-align: left; border-bottom: 1px solid #ddd; padding: 8px;">Created At (UTC)</th><th style="text-align: left; border-bottom: 1px solid #ddd; padding: 8px;">Link</th></tr></thead><tbody>'; $notified_lead_ids = []; foreach ( $leads as $lead ) { $notified_lead_ids[] = $lead->id; $leads_page_url = admin_url( 'admin.php?page=oal-leads' ); $filtered_url = add_query_arg( 's', $lead->email, $leads_page_url ); $message .= '<tr><td style="border-bottom: 1px solid #ddd; padding: 8px;">' . esc_html( $lead->first_name . ' ' . $lead->last_name ) . '</td><td style="border-bottom: 1px solid #ddd; padding: 8px;">' . esc_html( $lead->city ) . '</td><td style="border-bottom: 1px solid #ddd; padding: 8px;">' . esc_html( $lead->created_at ) . '</td><td style="border-bottom: 1px solid #ddd; padding: 8px;"><a href="' . esc_url( $filtered_url ) . '">View Lead</a></td></tr>'; } $message .= '</tbody></table>'; $headers = [ 'Content-Type: text/html; charset=UTF-8' ]; if ( wp_mail( $manager_emails, $subject, $message, $headers ) && ! empty( $notified_lead_ids ) ) { $ids_placeholder = implode( ', ', array_fill( 0, count( $notified_lead_ids ), '%d' ) ); $wpdb->query( $wpdb->prepare( "UPDATE {$table_name} SET sla_notification_sent_at = NOW() WHERE id IN ($ids_placeholder)", $notified_lead_ids ) ); } }
