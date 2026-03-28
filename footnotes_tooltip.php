<?php
/*
Plugin Name: Footnotes Tooltip
Description: Transforms standard WordPress footnotes into elegant, interactive tooltips.
Version: 1.0.1
Author: FROSTEYe
Author URI: https://frosteye.net/
Text Domain: footnotes-tooltip
Requires at least: 6.1
Requires PHP: 7.4
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Checks if the current page contains footnotes to optimize script loading.
 * This prevents unnecessary asset loading on pages without footnotes.
 *
 * @return bool True if footnotes are detected, false otherwise.
 */
function footnotes_tooltip_has_footnotes() {
    // Use a static variable to cache the result for the current request.
    static $has_footnotes = null;
    
    if ( $has_footnotes !== null ) {
        return $has_footnotes;
    }

    // Exclude admin screens and restrict to singular post/page views for performance.
    if ( is_admin() || ! is_singular() ) {
        return $has_footnotes = false;
    }

    $post = get_post();
    if ( ! $post || empty( $post->post_content ) ) {
        return $has_footnotes = false;
    }

    /**
     * Detection Logic:
     * 1. Detect Gutenberg core footnotes block or related classes.
     * 2. Identify manual footnote patterns (sup tags with internal anchor links).
     * 3. Check for common footnote identifiers used by various themes.
     */
    if ( has_block( 'core/footnotes', $post->post_content ) || 
         strpos( $post->post_content, 'wp-block-footnotes' ) !== false ) {
        return $has_footnotes = true;
    }

    // Pattern matching for <sup> tags containing internal hash links.
    if ( strpos( $post->post_content, '<sup' ) !== false && 
         strpos( $post->post_content, 'href="#' ) !== false ) {
        return $has_footnotes = true;
    }

    // Additional check for common footnote CSS classes or IDs.
    if ( strpos( $post->post_content, 'class="fn"' ) !== false || 
         strpos( $post->post_content, 'id="fn' ) !== false ) {
        return $has_footnotes = true;
    }
    
    return $has_footnotes = false;
}

/**
 * Enqueues the plugin's CSS and JavaScript assets.
 * Implements filemtime-based versioning to ensure cache busting on updates.
 */
function footnotes_tooltip_enqueue_scripts() {
    // Only load assets if the page actually contains footnotes.
    if ( ! footnotes_tooltip_has_footnotes() ) {
        return;
    }
    
    $plugin_path = plugin_dir_path( __FILE__ );
    $plugin_url  = plugin_dir_url( __FILE__ );

    // Versioning based on file modification time to prevent browser caching issues.
    $css_ver = file_exists( $plugin_path . 'style.css' ) ? filemtime( $plugin_path . 'style.css' ) : '1.0.0';
    $js_ver  = file_exists( $plugin_path . 'javascript.js' ) ? filemtime( $plugin_path . 'javascript.js' ) : '1.0.0';

    // Enqueue Stylesheet.
    wp_enqueue_style(
        'footnotes-tooltip-style',
        $plugin_url . 'style.css',
        array(),
        $css_ver
    );
    
    // Enqueue JavaScript in the footer for better rendering performance.
    wp_enqueue_script(
        'footnotes-tooltip-script',
        $plugin_url . 'javascript.js',
        array(),
        $js_ver,
        true
    );
}

// Hook into wp_enqueue_scripts.
add_action( 'wp_enqueue_scripts', 'footnotes_tooltip_enqueue_scripts' );
