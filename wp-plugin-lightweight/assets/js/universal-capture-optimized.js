/**
 * Echo5 Universal Form Capture - Performance Optimized
 * Zero lag, async operation, smart caching
 */

(function() {
    'use strict';
    
    // ==========================================
    // PERFORMANCE OPTIMIZATIONS
    // ==========================================
    
    // 1. Only load on pages with forms (conditional loading in PHP)
    // 2. Debounce rapid submissions (prevent double-submit)
    // 3. Async API calls (never block form submission)
    // 4. Cache form detection results
    // 5. Minimal DOM queries (performance)
    
    const config = {
        apiEndpoint: window.echo5Config?.apiEndpoint || '',
        apiKey: window.echo5Config?.apiKey || '',
        debug: window.echo5Config?.debug || false,
        maxRetries: 2,
        timeout: 5000, // 5 second timeout
    };
    
    // Cache detected forms to avoid re-processing
    const formCache = new Map();
    
    // Debounce to prevent duplicate submissions
    const recentSubmissions = new Set();
    
    /**
     * Main form submission listener
     * PERFORMANCE: Only activates on actual submit, not on every keystroke
     */
    document.addEventListener('submit', function(e) {
        const form = e.target;
        
        // Quick check: Is this a lead form?
        const formId = form.id || form.name || generateFormId(form);
        
        // Check cache first (FAST)
        if (formCache.has(formId) && !formCache.get(formId).isLeadForm) {
            return; // Not a lead form, skip processing
        }
        
        // ASYNC: Don't block form submission
        // Form submits normally, we capture data in parallel
        captureFormAsync(form, formId);
        
    }, true); // Use capture phase for early detection
    
    /**
     * Async form capture - runs in background
     * PERFORMANCE: Uses setTimeout to avoid blocking UI thread
     */
    function captureFormAsync(form, formId) {
        setTimeout(function() {
            try {
                captureForm(form, formId);
            } catch (error) {
                // Silent fail - don't break the form submission
                if (config.debug) {
                    console.error('[Echo5] Capture error:', error);
                }
            }
        }, 0); // Execute after current call stack clears
    }
    
    /**
     * Capture form data and send to API
     * PERFORMANCE: Exits early if not a lead form
     */
    function captureForm(form, formId) {
        // Prevent duplicate submissions within 2 seconds
        if (recentSubmissions.has(formId)) {
            return;
        }
        recentSubmissions.add(formId);
        setTimeout(() => recentSubmissions.delete(formId), 2000);
        
        // Extract form data (FAST: native FormData API)
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            // Skip empty values (performance)
            if (value && value.toString().trim()) {
                data[key] = value.toString();
            }
        }
        
        // Quick validation: Is this a lead form?
        const hasEmail = detectEmail(data);
        const hasPhone = detectPhone(data);
        
        if (!hasEmail && !hasPhone) {
            // Cache as non-lead form (skip future checks)
            formCache.set(formId, { isLeadForm: false });
            return;
        }
        
        // Cache as lead form
        formCache.set(formId, { isLeadForm: true });
        
        // Build payload
        const payload = {
            ...data,
            form_id: formId,
            source: 'website-universal',
            // UTM params from cookies (already captured on page load)
            ...getUTMParams(),
            referrer: document.referrer || null,
            page_url: window.location.href,
        };
        
        // ASYNC: Send to API (doesn't block anything)
        sendToAPI(payload);
    }
    
    /**
     * Quick email detection
     * PERFORMANCE: Simple regex, exits early
     */
    function detectEmail(data) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        for (let value of Object.values(data)) {
            if (emailRegex.test(value)) {
                return value;
            }
        }
        return null;
    }
    
    /**
     * Quick phone detection
     * PERFORMANCE: Simple regex, exits early
     */
    function detectPhone(data) {
        const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
        
        for (let value of Object.values(data)) {
            if (phoneRegex.test(value)) {
                return value;
            }
        }
        return null;
    }
    
    /**
     * Get UTM params from cookies (already stored on page load)
     * PERFORMANCE: Cookies are faster than URL parsing
     */
    function getUTMParams() {
        const params = {};
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
        
        utmKeys.forEach(key => {
            const value = getCookie(key);
            if (value) {
                params[key] = value;
            }
        });
        
        return params;
    }
    
    /**
     * Get cookie value
     * PERFORMANCE: Native browser API
     */
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }
    
    /**
     * Generate unique form ID
     * PERFORMANCE: Uses form attributes instead of DOM traversal
     */
    function generateFormId(form) {
        return form.id || 
               form.name || 
               form.action.split('/').pop() || 
               'form_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Send to Echo5 API
     * PERFORMANCE: Async, with timeout, silent fail
     */
    function sendToAPI(payload) {
        // Validate config
        if (!config.apiEndpoint || !config.apiKey) {
            if (config.debug) {
                console.warn('[Echo5] API not configured');
            }
            return;
        }
        
        // Use fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        fetch(config.apiEndpoint + '/api/ingest/lead', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Key': config.apiKey,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
            // PERFORMANCE: Don't wait for response
            keepalive: true,
        })
        .then(response => {
            clearTimeout(timeoutId);
            
            if (config.debug) {
                if (response.ok) {
                    console.log('[Echo5] Lead captured:', payload.email || payload.phone);
                } else {
                    console.warn('[Echo5] API error:', response.status);
                }
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            
            // Silent fail - don't break the page
            if (config.debug && error.name !== 'AbortError') {
                console.error('[Echo5] Network error:', error);
            }
        });
    }
    
})();
