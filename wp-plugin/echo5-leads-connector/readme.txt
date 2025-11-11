=== Echo5 Leads Connector ===
Contributors: echo5digital
Tags: leads, crm, elementor, contact form 7, metform, api
Requires at least: 5.8
Tested up to: 6.6
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Fire-and-forget forwarding of form submissions to Echo5 Vercel API (MongoDB) without slowing down WordPress.

== Description ==
Hooks into Elementor, Contact Form 7, and MetForm to collect leads and POST asynchronously to /api/ingest/lead using a Tenant API Key.

== Installation ==
1. Upload the `echo5-leads-connector` folder to `/wp-content/plugins/`.
2. Activate the plugin from the Plugins screen.
3. Go to Settings > Echo5 Leads and set API Base URL and Tenant API Key.

== Frequently Asked Questions ==
= Does this store data in WordPress? =
No. It only forwards to your API.

= Will it slow down form submissions? =
No. Requests are non-blocking (timeout 0.01s, blocking=false).

== Changelog ==
= 0.1.0 =
* Initial release.
