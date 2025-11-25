/*
 * SPDX-FileCopyrightText: adzuki
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { popup } from '@/os.js';
import MkCloudflareChallengeDialog from '@/components/MkCloudflareChallengeDialog.vue';
import { instance } from '@/instance.js';

/**
 * Show Cloudflare challenge dialog
 * @returns Promise that resolves when challenge completes, rejects if cancelled or not configured
 */
export async function showCloudflareChallengeDialog(): Promise<void> {
	// Check if Turnstile is configured
	if (!instance.turnstileSiteKey) {
		// Not configured - don't show dialog
		return Promise.reject(new Error('Turnstile not configured'));
	}

	return new Promise<void>((resolve, reject) => {
		let resolved = false;

		const { dispose } = popup(MkCloudflareChallengeDialog, {
			sitekey: instance.turnstileSiteKey!,
		}, {
			completed: () => {
				// Challenge completed, Cloudflare cookie is now set
				// User can retry the operation manually
				if (!resolved) {
					resolved = true;
					resolve();
				}
			},
			cancelled: () => {
				// User cancelled
				if (!resolved) {
					resolved = true;
					reject(new Error('Challenge cancelled by user'));
				}
			},
			closed: () => {
				// Dialog closed - ensure promise is resolved/rejected
				if (!resolved) {
					resolved = true;
					reject(new Error('Dialog closed without completion'));
				}
				dispose();
			},
		});
	});
}
