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
        'oal-settings',
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
    $elementor_table = $wpdb->prefix . 'e_submissions';
    $elementor_values_table = $wpdb->prefix . 'e_submissions_values';

    // Legacy synchronous migration (kept for fallback)
    if (isset($_POST['start_migration']) && wp_verify_nonce($_POST['migration_nonce'], 'oal_migrate_vercel')) {
        echo '<div class="wrap">';
        echo '<h1>Migrating Leads to Vercel</h1>';
        echo '<div style="background:#fff; padding:20px; border:1px solid #ccc; border-radius:4px; margin:20px 0; font-family:monospace;">';
        $options = get_option('oal_settings', []);
        $api_url = $options['vercel_api_url'] ?? '';
        $api_key = $options['vercel_api_key'] ?? '';
        if (empty($api_url) || empty($api_key)) {
            echo '<p style="color:red;">❌ Vercel API not configured. Go to Settings first.</p>';
            echo '</div></div>';
            return;
        }
        $leads = $wpdb->get_results("SELECT * FROM {$leads_table} ORDER BY created_at DESC");
        $total = count($leads);
        echo "<p><strong>📊 Found {$total} leads in WordPress database</strong></p>";
        echo "<p>Starting migration...</p><hr>";
        $success_count = 0; $error_count = 0;
        foreach ($leads as $lead) {
            $name = trim(($lead->first_name ?: '') . ' ' . ($lead->last_name ?: ''));
            $contact = $lead->email ?: $lead->phone_e164;
            echo "<p>[" . ($success_count + $error_count + 1) . "/{$total}] Migrating: {$name} ({$contact})...</p>";
            $payload = oal_build_migration_payload_row($lead);
            $response = wp_remote_post($api_url . '/api/ingest/lead', [
                'timeout' => 10,
                'headers' => [ 'Content-Type' => 'application/json', 'X-Tenant-Key' => $api_key ],
                'body' => wp_json_encode($payload),
            ]);
            if (is_wp_error($response)) { echo "<p style='color:red; margin-left:20px;'>❌ " . esc_html($response->get_error_message()) . "</p>"; $error_count++; }
            else {
                $status = wp_remote_retrieve_response_code($response);
                if ($status >= 200 && $status < 300) { $success_count++; echo "<p style='color:green; margin-left:20px;'>✅ Success</p>"; }
                else { $error_count++; echo "<p style='color:red; margin-left:20px;'>❌ HTTP {$status}</p>"; }
            }
            if (ob_get_level() > 0) { ob_flush(); flush(); }
            usleep(100000);
        }
        echo "<hr><h2>📈 Migration Summary:</h2><ul>";
        echo "<li><strong>Total leads:</strong> {$total}</li>";
        echo "<li style='color:green;'><strong>✅ Successful:</strong> {$success_count}</li>";
        echo "<li style='color:red;'><strong>❌ Failed:</strong> {$error_count}</li>";
        echo "</ul>";
        echo '</div>'; echo '<p><a href="' . admin_url('admin.php?page=oal-migrate-vercel') . '" class="button">← Back</a></p>'; echo '</div>'; return;
    }

    // Async UI
    $leads_count = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$leads_table}");
    
    // Check if Elementor submissions table exists
    $elementor_exists = $wpdb->get_var("SHOW TABLES LIKE '{$elementor_table}'") === $elementor_table;
    $elementor_count = $elementor_exists ? (int) $wpdb->get_var("SELECT COUNT(*) FROM {$elementor_table}") : 0;
    
    $options = get_option('oal_settings', []);
    $api_url = $options['vercel_api_url'] ?? '';
    $api_key = $options['vercel_api_key'] ?? '';
    $configured = !empty($api_url) && !empty($api_key);
    ?>
    <div class="wrap">
        <h1>Migrate Existing Leads to Vercel</h1>
        <div class="card" style="max-width:800px;">
            <h2>📊 Migration Status</h2>
            <p><strong>WordPress Leads Table:</strong> <?php echo esc_html($leads_count); ?> leads found</p>
            <p><strong>Elementor Submissions:</strong> <?php echo esc_html($elementor_count); ?> submissions found<?php if (!$elementor_exists): ?> <em>(Elementor Pro not installed or no submissions table)</em><?php endif; ?></p>
            <p><strong>Vercel API:</strong>
                <?php if ($configured): ?>
                    <span style="color:green;">✅ Configured</span> - <?php echo esc_html($api_url); ?>
                <?php else: ?>
                    <span style="color:red;">❌ Not configured</span> - <a href="<?php echo admin_url('admin.php?page=oal-settings'); ?>">Configure now</a>
                <?php endif; ?>
            </p>
            <hr>
            <h2>⚠️ Important Information</h2>
            <ul style="line-height:1.8;">
                <li>Choose between migrating from <strong>WordPress Leads table</strong> or <strong>Elementor Submissions table</strong></li>
                <li>WordPress Leads: <?php echo esc_html($leads_count); ?> records found</li>
                <li>Elementor Submissions: <?php echo esc_html($elementor_count); ?> records found</li>
                <li>Duplicates are avoided in Vercel by email/phone per-tenant.</li>
                <li><strong>Recommended:</strong> Use the async migration to avoid timeouts.</li>
                <li>You can keep this tab open; leaving will stop the UI but you can restart and it will continue.</li>
            </ul>

            <?php if ($configured && $leads_count > 0): ?>
                <hr>
                <h2>🚀 WordPress Leads Migration</h2>
                <p class="description">Migrate data from the WordPress leads table (<?php echo esc_html($leads_count); ?> records)</p>
                <div id="oal-migrate-controls" style="margin-bottom:12px;">
                    <button id="oal-start-migration" class="button button-primary button-large">Start WordPress Migration</button>
                    <button id="oal-cancel-migration" class="button" disabled>Cancel</button>
                </div>
                <div id="oal-progress" style="display:none;">
                    <div style="background:#f1f1f1; border:1px solid #ccc; height:24px; border-radius:4px; overflow:hidden;">
                        <div id="oal-progress-bar" style="height:100%; width:0%; background:#2271b1; color:#fff; text-align:center; font-weight:600; line-height:24px; transition: width .2s;"></div>
                    </div>
                    <p style="margin-top:8px;" id="oal-progress-text">Queued…</p>
                    <div style="margin-top:8px; font-size:12px; color:#555;">Batch size: <span id="oal-batch-size">—</span></div>
                    <div style="margin-top:12px; max-height:160px; overflow:auto; border:1px solid #eee; padding:8px; background:#fff;" id="oal-log"></div>
                </div>
            <?php endif; ?>

            <?php if ($configured && $elementor_count > 0): ?>
                <hr>
                <h2>🎨 Elementor Submissions Migration</h2>
                <p class="description">Migrate data from Elementor Pro submissions table (<?php echo esc_html($elementor_count); ?> records)</p>
                
                <?php
                // Show sample of available fields from first submission with VALUES
                $sample_submission = $wpdb->get_row("SELECT id FROM {$elementor_table} LIMIT 1");
                if ($sample_submission) {
                    $sample_fields = $wpdb->get_results($wpdb->prepare(
                        "SELECT `key`, `value` FROM {$elementor_values_table} WHERE submission_id = %d LIMIT 15",
                        $sample_submission->id
                    ));
                    if (!empty($sample_fields)) {
                        echo '<div style="background:#f0f0f1; padding:10px; margin-bottom:15px; border-left:3px solid #2271b1;">';
                        echo '<strong>📋 Sample submission #' . $sample_submission->id . ' - Field Mapping:</strong><br>';
                        echo '<table style="margin-top:8px; font-size:12px; width:100%;">';
                        echo '<tr><th style="text-align:left; padding:4px; background:#fff;">Field ID</th><th style="text-align:left; padding:4px; background:#fff;">Value (first 50 chars)</th></tr>';
                        foreach (array_slice($sample_fields, 0, 10) as $field) {
                            $value_preview = esc_html(mb_substr($field->value, 0, 50));
                            if (strlen($field->value) > 50) $value_preview .= '...';
                            echo '<tr><td style="padding:4px;"><code>' . esc_html($field->key) . '</code></td>';
                            echo '<td style="padding:4px;">' . $value_preview . '</td></tr>';
                        }
                        echo '</table>';
                        if (count($sample_fields) > 10) echo '<em style="font-size:11px;">(' . (count($sample_fields) - 10) . ' more fields not shown)</em>';
                        echo '</div>';
                    }
                }
                ?>
                
                <div id="oal-elementor-migrate-controls" style="margin-bottom:12px;">
                    <button id="oal-start-elementor-migration" class="button button-primary button-large">Start Elementor Migration</button>
                    <button id="oal-cancel-elementor-migration" class="button" disabled>Cancel</button>
                </div>
                <div id="oal-elementor-progress" style="display:none;">
                    <div style="background:#f1f1f1; border:1px solid #ccc; height:24px; border-radius:4px; overflow:hidden;">
                        <div id="oal-elementor-progress-bar" style="height:100%; width:0%; background:#9b51e0; color:#fff; text-align:center; font-weight:600; line-height:24px; transition: width .2s;"></div>
                    </div>
                    <p style="margin-top:8px;" id="oal-elementor-progress-text">Queued…</p>
                    <div style="margin-top:8px; font-size:12px; color:#555;">Batch size: <span id="oal-elementor-batch-size">—</span></div>
                    <div style="margin-top:12px; max-height:160px; overflow:auto; border:1px solid #eee; padding:8px; background:#fff;" id="oal-elementor-log"></div>
                </div>
            <?php endif; ?>

            <hr>
            <?php if (!$configured): ?>
                <p style="background:#fff3cd; padding:15px; border-left:4px solid #ffc107;">⚠️ Please <a href="<?php echo admin_url('admin.php?page=oal-settings'); ?>">configure Vercel API settings</a> first.</p>
            <?php elseif ($leads_count === 0): ?>
                <p style="background:#e7f3ff; padding:15px; border-left:4px solid #2196f3;">ℹ️ No leads found in WordPress database.</p>
            <?php else: ?>
                <details style="margin-top:10px;">
                    <summary>Legacy synchronous migration (not recommended)</summary>
                    <p class="description">Runs in a single request and prints a long log.</p>
                    <form method="post" action="" onsubmit="return confirm('Are you sure you want to migrate <?php echo esc_js($leads_count); ?> leads to Vercel? This cannot be undone.');">
                        <?php wp_nonce_field('oal_migrate_vercel', 'migration_nonce'); ?>
                        <p><button type="submit" name="start_migration" class="button">Run Legacy Migration</button></p>
                    </form>
                </details>
            <?php endif; ?>
        </div>
    </div>

    <?php if ($configured && $leads_count > 0): ?>
    <script>
    (function(){
        const ajaxUrl = <?php echo wp_json_encode( admin_url('admin-ajax.php') ); ?>;
        const nonce = <?php echo wp_json_encode( wp_create_nonce('oal_migrate_nonce') ); ?>;
        const startBtn = document.getElementById('oal-start-migration');
        const cancelBtn = document.getElementById('oal-cancel-migration');
        const progressWrap = document.getElementById('oal-progress');
        const bar = document.getElementById('oal-progress-bar');
        const text = document.getElementById('oal-progress-text');
        const batchSizeEl = document.getElementById('oal-batch-size');
        const logEl = document.getElementById('oal-log');
        let jobId = null; let cancelled = false;
        function log(msg){ const line = document.createElement('div'); const ts = new Date().toLocaleTimeString(); line.textContent = '['+ts+'] '+msg; logEl.appendChild(line); while (logEl.children.length > 200) logEl.removeChild(logEl.firstChild); logEl.scrollTop = logEl.scrollHeight; }
        async function post(data){ const body = new URLSearchParams({ ...data, nonce }); const res = await fetch(ajaxUrl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }); if (!res.ok) throw new Error('Request failed: '+res.status); return res.json(); }
        async function runLoop(){ cancelled = false; cancelBtn.disabled = false; startBtn.disabled = true; progressWrap.style.display=''; logEl.innerHTML='';
            try { const start = await post({ action: 'oal_start_migration' }); if (!start || !start.ok) throw new Error(start && start.error ? start.error : 'Unable to start migration'); jobId = start.jobId; batchSizeEl.textContent = String(start.batchSize); log('Started job '+jobId+' with '+start.total+' leads');
                while (!cancelled){ const res = await post({ action: 'oal_run_migration_batch', job_id: jobId }); if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Batch failed'); const pct = Math.floor((res.processed / res.total) * 100); bar.style.width = pct+'%'; bar.textContent = pct+'%'; text.textContent = `Processed ${res.processed} / ${res.total} | ✅ ${res.success} ❌ ${res.errors}`; if (res.messages && res.messages.length){ res.messages.forEach(m => log(m)); } if (res.done) { log('Done. Processed '+res.processed+' of '+res.total); startBtn.disabled=false; cancelBtn.disabled=true; break; } await new Promise(r => setTimeout(r, 250)); }
            } catch (e){ log('Error: '+e.message); startBtn.disabled=false; cancelBtn.disabled=true; }
        }
        startBtn && startBtn.addEventListener('click', function(){ runLoop(); });
        cancelBtn && cancelBtn.addEventListener('click', function(){ cancelled = true; cancelBtn.disabled = true; startBtn.disabled = false; log('Cancelled by user'); });
    })();
    </script>
    <?php endif; ?>

    <?php if ($configured && $elementor_count > 0): ?>
    <script>
    (function(){
        const ajaxUrl = <?php echo wp_json_encode( admin_url('admin-ajax.php') ); ?>;
        const nonce = <?php echo wp_json_encode( wp_create_nonce('oal_migrate_nonce') ); ?>;
        const startBtn = document.getElementById('oal-start-elementor-migration');
        const cancelBtn = document.getElementById('oal-cancel-elementor-migration');
        const progressWrap = document.getElementById('oal-elementor-progress');
        const bar = document.getElementById('oal-elementor-progress-bar');
        const text = document.getElementById('oal-elementor-progress-text');
        const batchSizeEl = document.getElementById('oal-elementor-batch-size');
        const logEl = document.getElementById('oal-elementor-log');
        let jobId = null; let cancelled = false;
        function log(msg){ const line = document.createElement('div'); const ts = new Date().toLocaleTimeString(); line.textContent = '['+ts+'] '+msg; logEl.appendChild(line); while (logEl.children.length > 200) logEl.removeChild(logEl.firstChild); logEl.scrollTop = logEl.scrollHeight; }
        async function post(data){ const body = new URLSearchParams({ ...data, nonce }); const res = await fetch(ajaxUrl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }); if (!res.ok) throw new Error('Request failed: '+res.status); return res.json(); }
        async function runLoop(){ cancelled = false; cancelBtn.disabled = false; startBtn.disabled = true; progressWrap.style.display='';
            try { const start = await post({ action: 'oal_start_elementor_migration' }); if (!start || !start.ok) throw new Error(start && start.error ? start.error : 'Unable to start migration'); jobId = start.jobId; batchSizeEl.textContent = String(start.batchSize); log('Started Elementor job '+jobId+' with '+start.total+' submissions');
                while (!cancelled){ const res = await post({ action: 'oal_run_elementor_migration_batch', job_id: jobId }); if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Batch failed'); const pct = Math.floor((res.processed / res.total) * 100); bar.style.width = pct+'%'; bar.textContent = pct+'%'; text.textContent = `Processed ${res.processed} / ${res.total} | ✅ ${res.success} ❌ ${res.errors}`; if (res.messages && res.messages.length){ res.messages.forEach(m => log(m)); } if (res.done) { log('Done. Processed '+res.processed+' of '+res.total); startBtn.disabled=false; cancelBtn.disabled=true; break; } await new Promise(r => setTimeout(r, 250)); }
            } catch (e){ log('Error: '+e.message); startBtn.disabled=false; cancelBtn.disabled=true; }
        }
        startBtn && startBtn.addEventListener('click', function(){ runLoop(); });
        cancelBtn && cancelBtn.addEventListener('click', function(){ cancelled = true; cancelBtn.disabled = true; startBtn.disabled = false; log('Cancelled by user'); });
    })();
    </script>
    <?php endif; ?>
    <?php
}

// Helper to build payload from a wpdb row
function oal_build_migration_payload_row( $lead ) {
    $payload = [
        'first_name' => $lead->first_name,
        'last_name'  => $lead->last_name,
        'email'      => $lead->email,
        'phone'      => $lead->phone_e164,
        'city'       => $lead->city,
        'source'     => $lead->source ?: 'wordpress_migration',
        'campaign_name' => $lead->campaign_name,
        'form_id'    => 'wordpress_existing_lead',
        'created_at' => $lead->created_at,
    ];
    if ( ! empty( $lead->original_payload ) ) {
        $original = json_decode( $lead->original_payload, true );
        if ( is_array( $original ) ) $payload = array_merge( $original, $payload );
    }
    return $payload;
}

// ==============================
// Async migration AJAX handlers
// ==============================
add_action('wp_ajax_oal_start_migration', 'oal_ajax_start_migration');
add_action('wp_ajax_oal_run_migration_batch', 'oal_ajax_run_migration_batch');
add_action('wp_ajax_oal_get_migration_status', 'oal_ajax_get_migration_status');

// Elementor migration handlers
add_action('wp_ajax_oal_start_elementor_migration', 'oal_ajax_start_elementor_migration');
add_action('wp_ajax_oal_run_elementor_migration_batch', 'oal_ajax_run_elementor_migration_batch');

function oal_ajax_check_perms() { if ( ! current_user_can('manage_options') ) { wp_send_json( [ 'ok' => false, 'error' => 'forbidden' ], 403 ); } check_ajax_referer('oal_migrate_nonce', 'nonce'); }
function oal_migration_option_key( $job_id ){ return 'oal_migrate_job_' . sanitize_key( $job_id ); }

function oal_ajax_start_migration() {
    oal_ajax_check_perms();
    global $wpdb; $leads_table = $wpdb->prefix . 'openarms_leads';
    $total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$leads_table}" );
    if ( $total <= 0 ) { wp_send_json( [ 'ok' => false, 'error' => 'no_leads' ], 400 ); }
    $job_id = wp_generate_uuid4();
    $state = [ 'id' => $job_id, 'total' => $total, 'offset' => 0, 'success' => 0, 'errors' => 0, 'processed' => 0, 'batchSize' => 20, 'startedAt' => time(), 'done' => false, 'messages' => [] ];
    update_option( oal_migration_option_key( $job_id ), $state, false );
    wp_send_json( [ 'ok' => true, 'jobId' => $job_id, 'total' => $total, 'batchSize' => $state['batchSize'] ] );
}

function oal_ajax_run_migration_batch(){
    oal_ajax_check_perms();
    $job_id = isset($_POST['job_id']) ? sanitize_text_field($_POST['job_id']) : '';
    if (!$job_id) wp_send_json( [ 'ok' => false, 'error' => 'missing_job' ], 400 );
    $key = oal_migration_option_key( $job_id ); $state = get_option( $key );
    if ( ! is_array( $state ) ) wp_send_json( [ 'ok' => false, 'error' => 'job_not_found' ], 404 );
    if ( ! empty( $state['done'] ) ) { wp_send_json( [ 'ok' => true, 'done' => true, 'processed' => $state['processed'], 'success' => $state['success'], 'errors' => $state['errors'], 'total' => $state['total'], 'messages' => [] ] ); }
    global $wpdb; $leads_table = $wpdb->prefix . 'openarms_leads';
    $batch = (int) $state['batchSize']; $offset = (int) $state['offset'];
    $options = get_option('oal_settings', []); $api_url = $options['vercel_api_url'] ?? ''; $api_key = $options['vercel_api_key'] ?? '';
    if ( empty($api_url) || empty($api_key) ) { wp_send_json( [ 'ok' => false, 'error' => 'api_not_configured' ], 400 ); }
    $rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$leads_table} ORDER BY created_at DESC LIMIT %d OFFSET %d", $batch, $offset ) );
    $messages = [];
    foreach ( $rows as $lead ) {
        $payload = oal_build_migration_payload_row( $lead );
        $name = trim( ($lead->first_name ?: '') . ' ' . ($lead->last_name ?: '') );
        $contact = $lead->email ?: $lead->phone_e164; $messages[] = sprintf('Migrating: %s (%s)', $name ?: '(no name)', $contact ?: 'no-contact');
        $response = wp_remote_post( $api_url . '/api/ingest/lead', [ 'timeout' => 10, 'headers' => [ 'Content-Type' => 'application/json', 'X-Tenant-Key' => $api_key ], 'body' => wp_json_encode( $payload ), ] );
        if ( is_wp_error( $response ) ) { $state['errors']++; $messages[] = '  ❌ ' . $response->get_error_message(); }
        else { $status = wp_remote_retrieve_response_code( $response ); if ( $status >= 200 && $status < 300 ) { $state['success']++; } else { $state['errors']++; $messages[] = '  ❌ HTTP ' . $status; } }
        $state['processed']++;
    }
    $state['offset'] += count( $rows ); if ( $state['offset'] >= $state['total'] || count($rows) === 0 ) { $state['done'] = true; }
    $state['messages'] = $messages; update_option( $key, $state, false );
    wp_send_json( [ 'ok' => true, 'done' => !empty($state['done']), 'processed' => (int) $state['processed'], 'success' => (int) $state['success'], 'errors' => (int) $state['errors'], 'total' => (int) $state['total'], 'messages' => $messages ] );
}

function oal_ajax_get_migration_status(){ oal_ajax_check_perms(); $job_id = isset($_POST['job_id']) ? sanitize_text_field($_POST['job_id']) : ''; if (!$job_id) wp_send_json( [ 'ok' => false, 'error' => 'missing_job' ], 400 ); $state = get_option( oal_migration_option_key( $job_id ) ); if ( ! is_array( $state ) ) wp_send_json( [ 'ok' => false, 'error' => 'job_not_found' ], 404 ); wp_send_json( [ 'ok' => true ] + $state ); }

// ==============================
// Elementor Migration Handlers
// ==============================

function oal_ajax_start_elementor_migration() {
    oal_ajax_check_perms();
    global $wpdb;
    $elementor_table = $wpdb->prefix . 'e_submissions';
    
    // Check if table exists
    if ($wpdb->get_var("SHOW TABLES LIKE '{$elementor_table}'") !== $elementor_table) {
        wp_send_json( [ 'ok' => false, 'error' => 'Elementor submissions table not found' ], 400 );
    }
    
    $total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$elementor_table}" );
    if ( $total <= 0 ) { wp_send_json( [ 'ok' => false, 'error' => 'no_submissions' ], 400 ); }
    
    $job_id = wp_generate_uuid4();
    $state = [ 'id' => $job_id, 'total' => $total, 'offset' => 0, 'success' => 0, 'errors' => 0, 'processed' => 0, 'batchSize' => 20, 'startedAt' => time(), 'done' => false, 'messages' => [] ];
    update_option( 'oal_elementor_migrate_job_' . sanitize_key( $job_id ), $state, false );
    wp_send_json( [ 'ok' => true, 'jobId' => $job_id, 'total' => $total, 'batchSize' => $state['batchSize'] ] );
}

function oal_ajax_run_elementor_migration_batch(){
    oal_ajax_check_perms();
    $job_id = isset($_POST['job_id']) ? sanitize_text_field($_POST['job_id']) : '';
    if (!$job_id) wp_send_json( [ 'ok' => false, 'error' => 'missing_job' ], 400 );
    
    $key = 'oal_elementor_migrate_job_' . sanitize_key( $job_id );
    $state = get_option( $key );
    if ( ! is_array( $state ) ) wp_send_json( [ 'ok' => false, 'error' => 'job_not_found' ], 404 );
    if ( ! empty( $state['done'] ) ) { wp_send_json( [ 'ok' => true, 'done' => true, 'processed' => $state['processed'], 'success' => $state['success'], 'errors' => $state['errors'], 'total' => $state['total'], 'messages' => [] ] ); }
    
    global $wpdb;
    $elementor_table = $wpdb->prefix . 'e_submissions';
    $elementor_values_table = $wpdb->prefix . 'e_submissions_values';
    
    $batch = (int) $state['batchSize'];
    $offset = (int) $state['offset'];
    $options = get_option('oal_settings', []);
    $api_url = $options['vercel_api_url'] ?? '';
    $api_key = $options['vercel_api_key'] ?? '';
    
    if ( empty($api_url) || empty($api_key) ) { wp_send_json( [ 'ok' => false, 'error' => 'api_not_configured' ], 400 ); }
    
    // Fetch submissions with their values
    $submissions = $wpdb->get_results( $wpdb->prepare( 
        "SELECT * FROM {$elementor_table} ORDER BY created_at DESC LIMIT %d OFFSET %d", 
        $batch, $offset 
    ) );
    
    $messages = [];
    
    foreach ( $submissions as $submission ) {
        // Get all field values for this submission
        $values = $wpdb->get_results( $wpdb->prepare(
            "SELECT `key`, `value` FROM {$elementor_values_table} WHERE submission_id = %d",
            $submission->id
        ), OBJECT_K );
        
        // Build payload from Elementor submission
        $payload = oal_build_elementor_payload( $submission, $values );
        
        // Add detailed debug info for first submission in batch
        $debug_info = '';
        if ($state['processed'] === 0) {
            $raw_fields = [];
            foreach ($values as $k => $v) {
                $raw_fields[] = $k . '=' . substr($v->value, 0, 30);
            }
            $debug_info = ' [Raw: ' . implode(', ', array_slice($raw_fields, 0, 3)) . '...]';
            
            $extracted_info = [];
            if (isset($payload['first_name'])) $extracted_info[] = 'fn=' . $payload['first_name'];
            if (isset($payload['last_name'])) $extracted_info[] = 'ln=' . $payload['last_name'];
            if (isset($payload['email'])) $extracted_info[] = 'em=' . $payload['email'];
            if (isset($payload['phone'])) $extracted_info[] = 'ph=' . $payload['phone'];
            
            if (!empty($extracted_info)) {
                $debug_info .= ' [Extracted: ' . implode(', ', $extracted_info) . ']';
            }
        }
        
        $contact = $payload['email'] ?? $payload['phone'] ?? 'no-contact';
        $name = trim( ($payload['first_name'] ?? '') . ' ' . ($payload['last_name'] ?? '') );
        $messages[] = sprintf('Migrating: %s (%s) - Fields: %d%s', 
            $name ?: '(no name)', 
            $contact,
            count((array)$values),
            $debug_info
        );
        
        $response = wp_remote_post( $api_url . '/api/ingest/lead', [
            'timeout' => 10,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Tenant-Key' => $api_key
            ],
            'body' => wp_json_encode( $payload ),
        ] );
        
        if ( is_wp_error( $response ) ) {
            $state['errors']++;
            $messages[] = '  ❌ ' . $response->get_error_message();
        } else {
            $status = wp_remote_retrieve_response_code( $response );
            if ( $status >= 200 && $status < 300 ) {
                $state['success']++;
            } else {
                $state['errors']++;
                $body = wp_remote_retrieve_body( $response );
                $error_detail = '';
                if ( $body ) {
                    $decoded = json_decode( $body, true );
                    $error_detail = isset($decoded['error']) ? $decoded['error'] : substr($body, 0, 50);
                }
                $messages[] = '  ❌ HTTP ' . $status . ($error_detail ? ': ' . $error_detail : '');
            }
        }
        $state['processed']++;
    }
    
    $state['offset'] += count( $submissions );
    if ( $state['offset'] >= $state['total'] || count($submissions) === 0 ) {
        $state['done'] = true;
    }
    
    $state['messages'] = $messages;
    update_option( $key, $state, false );
    
    wp_send_json( [
        'ok' => true,
        'done' => !empty($state['done']),
        'processed' => (int) $state['processed'],
        'success' => (int) $state['success'],
        'errors' => (int) $state['errors'],
        'total' => (int) $state['total'],
        'messages' => $messages
    ] );
}

/**
 * Build payload from Elementor submission data
 * Uses multiple strategies to extract field data robustly
 * 
 * @param object $submission The submission row from e_submissions table
 * @param array $values Array of field key => value pairs from e_submissions_values table (OBJECT_K format)
 * @return array Formatted payload for Vercel API
 */
function oal_build_elementor_payload( $submission, $values ) {
    global $wpdb;
    $payload = [];
    
    // Convert values to simple array for easier processing
    $raw_values = [];
    foreach ($values as $field_id => $value_obj) {
        if (!empty($value_obj->value)) {
            $raw_values[$field_id] = trim($value_obj->value);
        }
    }
    
    // Strategy 1: Try to get field labels from e_submissions_actions table
    $field_labels = [];
    $elementor_actions_table = $wpdb->prefix . 'e_submissions_actions';
    
    if ($wpdb->get_var("SHOW TABLES LIKE '{$elementor_actions_table}'") === $elementor_actions_table) {
        $actions = $wpdb->get_results( $wpdb->prepare(
            "SELECT `fields` FROM {$elementor_actions_table} WHERE submission_id = %d",
            $submission->id
        ));
        
        foreach ($actions as $action) {
            if (!empty($action->fields)) {
                $fields_data = json_decode($action->fields, true);
                if (is_array($fields_data)) {
                    foreach ($fields_data as $field_id => $field_info) {
                        // Try multiple possible label keys
                        if (isset($field_info['title'])) {
                            $field_labels[$field_id] = $field_info['title'];
                        } elseif (isset($field_info['label'])) {
                            $field_labels[$field_id] = $field_info['label'];
                        } elseif (isset($field_info['name'])) {
                            $field_labels[$field_id] = $field_info['name'];
                        } elseif (is_string($field_info)) {
                            // Sometimes the value itself is the label
                            $field_labels[$field_id] = $field_info;
                        }
                    }
                }
            }
        }
    }
    
    // Strategy 2: Try to extract field definitions from the form's post meta
    if (empty($field_labels) && !empty($submission->post_id)) {
        $form_fields = oal_get_elementor_form_fields($submission->post_id);
        if (!empty($form_fields)) {
            foreach ($form_fields as $field_def) {
                // Try multiple field ID keys
                $field_id = $field_def['custom_id'] ?? $field_def['_id'] ?? $field_def['id'] ?? null;
                $field_label = $field_def['field_label'] ?? $field_def['label'] ?? $field_def['placeholder'] ?? null;
                
                if ($field_id && $field_label) {
                    $field_labels[$field_id] = $field_label;
                }
            }
        }
    }
    
    // Strategy 3: If still no labels, try to get from main_meta column if it exists
    if (empty($field_labels)) {
        $check_col = $wpdb->get_results("SHOW COLUMNS FROM {$elementor_actions_table} LIKE 'main_meta'");
        if (!empty($check_col)) {
            $meta_data = $wpdb->get_row( $wpdb->prepare(
                "SELECT `main_meta` FROM {$elementor_actions_table} WHERE submission_id = %d LIMIT 1",
                $submission->id
            ));
            
            if ($meta_data && !empty($meta_data->main_meta)) {
                $main_meta = json_decode($meta_data->main_meta, true);
                if (is_array($main_meta) && isset($main_meta['fields'])) {
                    foreach ($main_meta['fields'] as $field) {
                        $fid = $field['id'] ?? $field['_id'] ?? null;
                        $flabel = $field['label'] ?? $field['title'] ?? null;
                        if ($fid && $flabel) {
                            $field_labels[$fid] = $flabel;
                        }
                    }
                }
            }
        }
    }
    
    // Build searchable field data array
    $field_data = [];
    $already_used = []; // Track which values we've already assigned
    
    foreach ($raw_values as $field_id => $value) {
        $label = isset($field_labels[$field_id]) ? trim($field_labels[$field_id]) : '';
        $field_data[] = [
            'id' => $field_id,
            'label' => $label,
            'label_lower' => strtolower($label),
            'value' => $value,
            'used' => false
        ];
    }
    
    // Helper function to find and mark field as used
    $find_and_mark_field = function($patterns, $type_check = null) use (&$field_data, &$already_used) {
        foreach ($field_data as &$field) {
            if ($field['used'] || empty($field['value'])) continue;
            
            // Type-specific validation
            if ($type_check === 'email' && !filter_var($field['value'], FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            if ($type_check === 'phone' && !preg_match('/^\+?[\d\s\-\(\)\.]{7,}$/', $field['value'])) {
                continue;
            }
            if ($type_check === 'not_email' && filter_var($field['value'], FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            if ($type_check === 'not_phone' && preg_match('/^\+?[\d\s\-\(\)\.]{10,}$/', $field['value'])) {
                continue;
            }
            
            // Check label match
            if (!empty($field['label_lower'])) {
                foreach ($patterns as $pattern) {
                    if (stripos($field['label_lower'], $pattern) !== false) {
                        $field['used'] = true;
                        return $field['value'];
                    }
                }
            }
            
            // Check field ID match
            $field_id_lower = strtolower($field['id']);
            foreach ($patterns as $pattern) {
                if (stripos($field_id_lower, str_replace(' ', '', $pattern)) !== false) {
                    $field['used'] = true;
                    return $field['value'];
                }
            }
        }
        return null;
    };
    
    // Extract fields in priority order with validation
    $email = $find_and_mark_field(['email', 'e-mail', 'mail', 'your email', 'email address'], 'email');
    $phone = $find_and_mark_field(['phone', 'telephone', 'mobile', 'cell', 'your phone', 'phone number', 'contact'], 'phone');
    $first_name = $find_and_mark_field(['first name', 'firstname', 'first', 'fname'], 'not_email');
    $last_name = $find_and_mark_field(['last name', 'lastname', 'last', 'lname', 'surname'], 'not_email');
    $city = $find_and_mark_field(['city', 'town', 'location'], 'not_email');
    
    // Fallback: Use positional logic for remaining unlabeled fields
    if (!$first_name || !$last_name || !$email || !$phone) {
        $unused_fields = array_filter($field_data, function($f) { return !$f['used'] && !empty($f['value']); });
        $unused_fields = array_values($unused_fields); // Re-index
        
        foreach ($unused_fields as $idx => &$field) {
            $value = $field['value'];
            
            // Try to identify by content
            if (!$email && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $email = $value;
                $field['used'] = true;
            } elseif (!$phone && preg_match('/^\+?[\d\s\-\(\)\.]{7,}$/', $value) && strlen(preg_replace('/[^\d]/', '', $value)) >= 7) {
                $phone = $value;
                $field['used'] = true;
            } elseif (!$first_name && $idx === 0 && !filter_var($value, FILTER_VALIDATE_EMAIL) && strlen($value) < 50) {
                $first_name = $value;
                $field['used'] = true;
            } elseif (!$last_name && $idx === 1 && !filter_var($value, FILTER_VALIDATE_EMAIL) && strlen($value) < 50) {
                $last_name = $value;
                $field['used'] = true;
            }
        }
    }
    
    // Set core fields
    if ($first_name) $payload['first_name'] = $first_name;
    if ($last_name) $payload['last_name'] = $last_name;
    if ($email) $payload['email'] = $email;
    if ($phone) $payload['phone'] = $phone;
    if ($city) $payload['city'] = $city;
    
    // Collect notes from message fields and remaining unused fields
    $notes_parts = [];
    foreach ($field_data as $field) {
        if ($field['used'] || empty($field['value'])) continue;
        
        $is_message_field = false;
        $message_patterns = ['message', 'comment', 'note', 'additional', 'anything else', 'how can we help', 'how did you hear', 'hear about', 'help you'];
        
        foreach ($message_patterns as $pattern) {
            if (stripos($field['label_lower'], $pattern) !== false) {
                $is_message_field = true;
                break;
            }
        }
        
        if ($is_message_field || strlen($field['value']) > 50) {
            $label_display = !empty($field['label']) ? $field['label'] : ucfirst(str_replace('_', ' ', $field['id']));
            $notes_parts[] = $label_display . ': ' . $field['value'];
        }
    }
    
    if (!empty($notes_parts)) {
        $payload['notes'] = implode(' | ', $notes_parts);
    }
    
    // Set metadata
    $payload['source'] = 'elementor_migration';
    $payload['form_id'] = 'elementor_' . ($submission->post_id ?? 'unknown');
    $payload['created_at'] = $submission->created_at;
    
    if (!empty($submission->referer)) $payload['referrer'] = $submission->referer;
    if (!empty($submission->user_agent)) $payload['user_agent'] = $submission->user_agent;
    if (!empty($submission->user_ip)) $payload['user_ip'] = $submission->user_ip;
    
    // Store ALL raw fields with proper labeling - using same pattern as WordPress Pro Forms
    // BUT skip fields that were already extracted to core fields to avoid duplicates
    
    // Build a list of values already used in core fields
    $used_values = array_filter([
        $first_name,
        $last_name,
        $email,
        $phone,
        $city
    ]);
    
    foreach ($field_data as $field) {
        if (empty($field['value'])) continue;
        
        // Skip if this exact value was already used in a core field (prevents duplicates)
        if (in_array($field['value'], $used_values, true)) continue;
        
        // Skip if marked as used during extraction
        if ($field['used']) continue;
        
        // Determine the field identifier (use label if available, otherwise field ID)
        $field_identifier = !empty($field['label']) 
            ? sanitize_key(str_replace(' ', '_', $field['label']))
            : sanitize_key($field['id']);
        
        // Store the actual field value
        $field_key = 'elementor_field_' . $field_identifier;
        if (!isset($payload[$field_key])) {
            $payload[$field_key] = $field['value'];
        }
        
        // Store the human-readable label (separate key) - CRITICAL for frontend display
        if (!empty($field['label'])) {
            $label_key = 'elementor_field_label_' . $field_identifier;
            if (!isset($payload[$label_key])) {
                $payload[$label_key] = $field['label']; // Original label with proper casing
            }
        }
    }
    
    return $payload;
}

/**
 * Extract form field definitions from Elementor post data
 */
function oal_get_elementor_form_fields($post_id) {
    $form_meta = get_post_meta($post_id, '_elementor_data', true);
    if (empty($form_meta)) return [];
    
    $elementor_data = json_decode($form_meta, true);
    if (!is_array($elementor_data)) return [];
    
    $fields = [];
    oal_extract_elementor_fields_recursive($elementor_data, $fields);
    return $fields;
}

// Helper function to recursively extract field labels from Elementor data structure
function oal_extract_elementor_fields_recursive($data, &$field_labels) {
    if (!is_array($data)) return;
    
    foreach ($data as $element) {
        if (is_array($element)) {
            // Check if this is a form field element
            if (isset($element['widgetType']) && strpos($element['widgetType'], 'form') !== false) {
                if (isset($element['settings']['form_fields']) && is_array($element['settings']['form_fields'])) {
                    foreach ($element['settings']['form_fields'] as $field) {
                        if (isset($field['custom_id']) && isset($field['field_label'])) {
                            $field_labels[$field['custom_id']] = $field['field_label'];
                        }
                    }
                }
            }
            
            // Recurse into children
            if (isset($element['elements'])) {
                oal_extract_elementor_fields_recursive($element['elements'], $field_labels);
            }
        }
    }
}
