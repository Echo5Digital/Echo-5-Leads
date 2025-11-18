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
    $options = get_option('oal_settings', []);
    $api_url = $options['vercel_api_url'] ?? '';
    $api_key = $options['vercel_api_key'] ?? '';
    $configured = !empty($api_url) && !empty($api_key);
    ?>
    <div class="wrap">
        <h1>Migrate Existing Leads to Vercel</h1>
        <div class="card" style="max-width:800px;">
            <h2>📊 Migration Status</h2>
            <p><strong>WordPress Database:</strong> <?php echo esc_html($leads_count); ?> leads found</p>
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
                <li>This will send <strong>ALL <?php echo esc_html($leads_count); ?></strong> existing leads from WordPress to Vercel.</li>
                <li>Duplicates are avoided in Vercel by email/phone per-tenant.</li>
                <li><strong>Recommended:</strong> Use the async migration below to avoid timeouts and huge scroll logs.</li>
                <li>You can keep this tab open; leaving will stop the UI but you can restart and it will continue.</li>
            </ul>

            <?php if ($configured && $leads_count > 0): ?>
                <hr>
                <h2>🚀 Async Migration (Recommended)</h2>
                <div id="oal-migrate-controls" style="margin-bottom:12px;">
                    <button id="oal-start-migration" class="button button-primary button-large">Start Migration</button>
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
