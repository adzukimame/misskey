/*
 * SPDX-FileCopyrightText: adzuki
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Mutex, tryAcquire } from 'async-mutex';
import { popup } from '@/os.js';
import MkCloudflareChallengeDialog from '@/components/MkCloudflareChallengeDialog.vue';
import { instance } from '@/instance.js';

const challengeDialogMutex = new Mutex();

async function showCloudflareChallengeDialogInternal(): Promise<void> {
	if (!instance.turnstileSiteKey) {
		return Promise.reject(new Error('Turnstile not configured'));
	}

	return new Promise<void>((resolve, reject) => {
		let resolved = false;

		const { dispose } = popup(MkCloudflareChallengeDialog, {
			sitekey: instance.turnstileSiteKey!,
		}, {
			completed: () => {
				if (!resolved) {
					resolved = true;
					resolve();
				}
			},
			cancelled: () => {
				if (!resolved) {
					resolved = true;
					reject(new Error('Challenge cancelled by user'));
				}
			},
			closed: () => {
				if (!resolved) {
					resolved = true;
					reject(new Error('Dialog closed without completion'));
				}
				dispose();
			},
		});
	});
}

export async function attemptShowCloudflareChallengeDialog(): Promise<void> {
	return tryAcquire(challengeDialogMutex)
		.acquire()
		.then((releaser) => {
			showCloudflareChallengeDialogInternal()
				.finally(() => {
					releaser();
				});
		})
		.catch(() => {});
}
