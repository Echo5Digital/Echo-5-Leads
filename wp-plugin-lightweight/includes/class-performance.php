<?php
/**
 * Performance Optimization: Conditional Script Loading
 * Only load JavaScript on pages that actually have forms
 */

class Echo5_Performance_Manager {
    
    private static $has_forms_on_page = false;
    
    /**
     * Check if current page has forms
     * PERFORMANCE: Checks during page render, caches result
     */
    public static function detect_forms_on_page() {
        // Check common form builder shortcodes
        global $post;
        
        if (!$post) {
            return false;
        }
        
        $content = $post->post_content;
        
        // Quick check: Look for form indicators
        $form_indicators = [
            '<form',                           // HTML form
            '[contact-form-7',                 // CF7
            '[wpforms',                        // WPForms
            '[gravityform',                    // Gravity Forms
            '[ninja_form',                     // Ninja Forms
            'elementor-form',                  // Elementor
            '[formidable',                     // Formidable
            '[fluentform',                     // Fluent Forms
        ];
        
        foreach ($form_indicators as $indicator) {
            if (stripos($content, $indicator) !== false) {
                self::$has_forms_on_page = true;
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Conditionally enqueue scripts
     * PERFORMANCE: Only loads on pages with forms
     */
    public static function enqueue_scripts() {
        // OPTIMIZATION 1: Only load on frontend
        if (is_admin()) {
            return;
        }
        
        // OPTIMIZATION 2: Only load on pages with forms
        if (!self::detect_forms_on_page()) {
            // No forms detected, skip loading
            return;
        }
        
        // OPTIMIZATION 3: Load in footer (non-blocking)
        wp_enqueue_script(
            'echo5-universal-capture',
            ECHO5_LEADS_PLUGIN_URL . 'assets/js/universal-capture-optimized.js',
            [], // No dependencies
            ECHO5_LEADS_VERSION,
            true  // Load in footer
        );
        
        // OPTIMIZATION 4: Inline config (avoid extra HTTP request)
        $config = [
            'apiEndpoint' => get_option('echo5_api_url'),
            'apiKey' => get_option('echo5_api_key'),
            'debug' => defined('WP_DEBUG') && WP_DEBUG,
        ];
        
        wp_add_inline_script(
            'echo5-universal-capture',
            'window.echo5Config = ' . wp_json_encode($config) . ';',
            'before'
        );
    }
    
    /**
     * OPTIMIZATION 5: Defer script loading
     * Add defer attribute to script tag
     */
    public static function add_defer_attribute($tag, $handle) {
        if ('echo5-universal-capture' !== $handle) {
            return $tag;
        }
        return str_replace(' src', ' defer src', $tag);
    }
    
    /**
     * OPTIMIZATION 6: Cache UTM params on page load
     * Store in cookies immediately (fast JavaScript)
     */
    public static function utm_tracker_inline() {
        if (is_admin() || !self::$has_forms_on_page) {
            return;
        }
        
        // Inline script (tiny, runs once)
        ?>
        <script>
        (function(){
            if (!window.location.search) return;
            var p = new URLSearchParams(window.location.search);
            ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(function(k){
                var v = p.get(k);
                if (v) document.cookie = k + '=' + v + '; max-age=2592000; path=/';
            });
        })();
        </script>
        <?php
    }
}

// ==========================================
// PERFORMANCE BENCHMARKS
// ==========================================

/**
 * Measure plugin performance impact
 * For debugging and optimization
 */
class Echo5_Performance_Monitor {
    
    private static $start_time = 0;
    
    public static function start() {
        self::$start_time = microtime(true);
    }
    
    public static function end($label = 'Echo5') {
        $duration = (microtime(true) - self::$start_time) * 1000; // Convert to ms
        
        if (defined('WP_DEBUG') && WP_DEBUG && $duration > 50) {
            error_log(sprintf('[%s Performance] %.2fms (WARNING: > 50ms)', $label, $duration));
        }
        
        return $duration;
    }
}

// ==========================================
// DATABASE QUERY OPTIMIZATION
// ==========================================

/**
 * Cache API settings in transient
 * PERFORMANCE: Avoid querying wp_options on every page load
 */
class Echo5_Settings_Cache {
    
    private static $cache_key = 'echo5_settings_cache';
    private static $cache_duration = 3600; // 1 hour
    
    public static function get_settings() {
        // Try cache first
        $cached = get_transient(self::$cache_key);
        if ($cached !== false) {
            return $cached;
        }
        
        // Cache miss, query database
        $settings = [
            'api_url' => get_option('echo5_api_url'),
            'api_key' => get_option('echo5_api_key'),
            'enable_logging' => get_option('echo5_enable_logging'),
        ];
        
        // Store in cache
        set_transient(self::$cache_key, $settings, self::$cache_duration);
        
        return $settings;
    }
    
    public static function clear_cache() {
        delete_transient(self::$cache_key);
    }
}

// ==========================================
// ASYNC API CALLS (DOESN'T BLOCK PAGE LOAD)
// ==========================================

/**
 * Queue failed submissions for retry
 * PERFORMANCE: If API is slow/down, don't block page
 */
class Echo5_Submission_Queue {
    
    /**
     * Add submission to queue (WordPress cron)
     * PERFORMANCE: Processes in background
     */
    public static function queue_submission($payload) {
        // Store in wp_options temporarily
        $queue = get_option('echo5_submission_queue', []);
        
        $queue[] = [
            'payload' => $payload,
            'timestamp' => time(),
            'attempts' => 0,
        ];
        
        // Keep only last 100 items (prevent DB bloat)
        if (count($queue) > 100) {
            $queue = array_slice($queue, -100);
        }
        
        update_option('echo5_submission_queue', $queue, false); // Don't autoload
        
        // Schedule background processing
        if (!wp_next_scheduled('echo5_process_queue')) {
            wp_schedule_single_event(time() + 60, 'echo5_process_queue');
        }
    }
    
    /**
     * Process queue in background (cron)
     * PERFORMANCE: Runs separately, doesn't affect page load
     */
    public static function process_queue() {
        $queue = get_option('echo5_submission_queue', []);
        
        if (empty($queue)) {
            return;
        }
        
        $processed = [];
        
        foreach ($queue as $index => $item) {
            // Try to send
            $success = self::send_to_api($item['payload']);
            
            if ($success) {
                // Remove from queue
                continue;
            } else {
                // Retry later (max 3 attempts)
                $item['attempts']++;
                if ($item['attempts'] < 3) {
                    $processed[] = $item;
                }
            }
        }
        
        update_option('echo5_submission_queue', $processed, false);
    }
    
    private static function send_to_api($payload) {
        $settings = Echo5_Settings_Cache::get_settings();
        
        $response = wp_remote_post($settings['api_url'] . '/api/ingest/lead', [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Tenant-Key' => $settings['api_key'],
            ],
            'body' => json_encode($payload),
            'timeout' => 10,
            'blocking' => true,
        ]);
        
        return !is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200;
    }
}

// Hook into WordPress cron
add_action('echo5_process_queue', ['Echo5_Submission_Queue', 'process_queue']);
