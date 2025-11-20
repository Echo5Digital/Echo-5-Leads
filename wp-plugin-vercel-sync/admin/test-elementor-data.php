<?php
/**
 * Diagnostic script to examine Elementor database structure
 * Run this temporarily from WordPress admin to see actual data
 */

// Add to admin menu temporarily
add_action('admin_menu', 'oal_test_elementor_menu');
function oal_test_elementor_menu() {
    add_submenu_page(
        null, // Hidden from menu
        'Test Elementor Data',
        'Test Elementor Data',
        'manage_options',
        'oal-test-elementor',
        'oal_test_elementor_page'
    );
}

function oal_test_elementor_page() {
    global $wpdb;
    
    echo '<div class="wrap">';
    echo '<h1>Elementor Database Diagnostic</h1>';
    
    // Test 1: Check submissions table
    $elementor_table = $wpdb->prefix . 'e_submissions';
    $submission = $wpdb->get_row("SELECT * FROM {$elementor_table} ORDER BY id DESC LIMIT 1");
    
    echo '<h2>Sample Submission Record</h2>';
    echo '<pre>' . print_r($submission, true) . '</pre>';
    
    if ($submission) {
        // Test 2: Check values for this submission
        $values_table = $wpdb->prefix . 'e_submissions_values';
        $values = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$values_table} WHERE submission_id = %d",
            $submission->id
        ));
        
        echo '<h2>Field Values for Submission #' . $submission->id . '</h2>';
        echo '<table border="1" cellpadding="5"><tr><th>Key</th><th>Value</th></tr>';
        foreach ($values as $val) {
            echo '<tr><td>' . esc_html($val->key) . '</td><td>' . esc_html($val->value) . '</td></tr>';
        }
        echo '</table>';
        
        // Test 3: Check actions table for field labels
        $actions_table = $wpdb->prefix . 'e_submissions_actions';
        $actions = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$actions_table} WHERE submission_id = %d",
            $submission->id
        ));
        
        echo '<h2>Actions Records (Field Metadata)</h2>';
        if (empty($actions)) {
            echo '<p><strong>No records found in e_submissions_actions for this submission!</strong></p>';
        } else {
            foreach ($actions as $action) {
                echo '<h3>Action Record</h3>';
                echo '<pre>' . print_r($action, true) . '</pre>';
                
                if (!empty($action->fields)) {
                    $fields_data = json_decode($action->fields, true);
                    echo '<h4>Decoded Fields JSON:</h4>';
                    echo '<pre>' . print_r($fields_data, true) . '</pre>';
                }
            }
        }
        
        // Test 4: Try to get form structure from post meta
        if (!empty($submission->post_id)) {
            echo '<h2>Form Structure from Post #' . $submission->post_id . '</h2>';
            
            $form_meta = get_post_meta($submission->post_id, '_elementor_data', true);
            if ($form_meta) {
                $elementor_data = json_decode($form_meta, true);
                echo '<h3>Elementor Data (searching for form fields):</h3>';
                echo '<pre>' . print_r(oal_find_form_fields_recursive($elementor_data), true) . '</pre>';
            } else {
                echo '<p>No _elementor_data meta found</p>';
            }
        }
        
        // Test 5: Show all e_submissions_actions records
        echo '<h2>All Actions Records (All Submissions)</h2>';
        $all_actions = $wpdb->get_results("SELECT * FROM {$actions_table} LIMIT 10");
        if (empty($all_actions)) {
            echo '<p><strong>The e_submissions_actions table is empty or does not exist!</strong></p>';
            
            // Check if table exists
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$actions_table}'");
            if ($table_exists !== $actions_table) {
                echo '<p><strong>Table does not exist!</strong></p>';
            }
        } else {
            foreach ($all_actions as $action) {
                echo '<div style="border:1px solid #ccc; margin:10px 0; padding:10px;">';
                echo '<strong>Submission ID: ' . $action->submission_id . '</strong><br>';
                if (!empty($action->fields)) {
                    $fields_data = json_decode($action->fields, true);
                    if (is_array($fields_data)) {
                        echo '<ul>';
                        foreach ($fields_data as $field_id => $field_info) {
                            $title = $field_info['title'] ?? 'No Title';
                            echo '<li>' . esc_html($field_id) . ' => ' . esc_html($title) . '</li>';
                        }
                        echo '</ul>';
                    } else {
                        echo '<p>Could not decode fields JSON</p>';
                    }
                } else {
                    echo '<p>No fields data</p>';
                }
                echo '</div>';
            }
        }
    }
    
    echo '</div>';
}

function oal_find_form_fields_recursive($data, $fields = []) {
    if (!is_array($data)) return $fields;
    
    foreach ($data as $element) {
        if (is_array($element)) {
            // Check if this is a form field
            if (isset($element['widgetType']) && strpos($element['widgetType'], 'form') !== false) {
                if (isset($element['settings']['form_fields']) && is_array($element['settings']['form_fields'])) {
                    $fields = array_merge($fields, $element['settings']['form_fields']);
                }
            }
            
            // Recurse into children
            if (isset($element['elements'])) {
                $fields = oal_find_form_fields_recursive($element['elements'], $fields);
            }
        }
    }
    
    return $fields;
}
