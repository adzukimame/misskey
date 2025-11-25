/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ref } from 'vue';
import type { Endpoints as MisskeyEndpoints } from 'misskey-js';
import type { SwitchCaseResponseType } from 'misskey-js/api.types.js';
import { apiUrl } from '@/config.js';
import { $i } from '@/account.js';
export const pendingApiRequestsCount = ref(0);

// Implements Misskey.api.ApiClient.request
export function misskeyApi<
	ResT = void,
	E extends keyof MisskeyEndpoints = keyof MisskeyEndpoints,
	P extends MisskeyEndpoints[E]['req'] = MisskeyEndpoints[E]['req'],
	_ResT = ResT extends void ? SwitchCaseResponseType<E, P> : ResT,
>(
	endpoint: E,
	data: P = {} as any,
	token?: string | null | undefined,
	signal?: AbortSignal,
): Promise<_ResT> {
	if (endpoint.includes('://')) throw new Error('invalid endpoint');
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const promise = new Promise<_ResT>((resolve, reject) => {
		// Append a credential
		if ($i) (data as any).i = $i.token;
		if (token !== undefined) (data as any).i = token;

		// Send request
		window.fetch(`${apiUrl}/${endpoint}`, {
			method: 'POST',
			body: JSON.stringify(data),
			credentials: 'same-origin',
			mode: 'same-origin',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json',
			},
			signal,
		}).then(async (res) => {
			//#region Blocked by Cloudflare WAF
			if (res.headers.get('cf-mitigated') === 'challenge') {
				// Import handler dynamically to avoid circular dependency
				const { showCloudflareChallengeDialog } = await import('@/scripts/cloudflare-challenge.js');

				try {
					// Show challenge dialog (will resolve when challenge completes)
					await showCloudflareChallengeDialog();

					// Challenge completed successfully
					// Reject with specific error so user knows to retry
					reject({
						code: 'CLOUDFLARE_CHALLENGE_REQUIRED',
						message: 'Please try again',
						id: '3f5336d7-2706-494b-811e-fe98d0e65a5d',
					});
				} catch (err) {
					// Challenge dialog not shown (not configured) or user cancelled
					// Pass through the original error/response
					const body = res.status === 204 ? null : await res.json();
					if (res.status === 200) {
						resolve(body);
					} else if (res.status === 204) {
						resolve(undefined as _ResT);
					} else {
						reject(body.error);
					}
				}
				return; // Don't continue with normal processing
			}
			//#endregion

			// Normal response handling
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve(undefined as _ResT); // void -> undefined
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}

// Implements Misskey.api.ApiClient.request
export function misskeyApiGet<
	ResT = void,
	E extends keyof MisskeyEndpoints = keyof MisskeyEndpoints,
	P extends MisskeyEndpoints[E]['req'] = MisskeyEndpoints[E]['req'],
	_ResT = ResT extends void ? SwitchCaseResponseType<E, P> : ResT,
>(
	endpoint: E,
	data: P = {} as any,
): Promise<_ResT> {
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const query = new URLSearchParams(data as any);

	const promise = new Promise<_ResT>((resolve, reject) => {
		// Send request
		window.fetch(`${apiUrl}/${endpoint}?${query}`, {
			method: 'GET',
			credentials: 'same-origin',
			mode: 'same-origin',
			cache: 'default',
		}).then(async (res) => {
			//#region Blocked by Cloudflare WAF
			if (res.headers.get('cf-mitigated') === 'challenge') {
				// Import handler dynamically to avoid circular dependency
				const { showCloudflareChallengeDialog } = await import('@/scripts/cloudflare-challenge.js');

				try {
					// Show challenge dialog (will resolve when challenge completes)
					await showCloudflareChallengeDialog();

					// Challenge completed successfully
					// Reject with specific error so user knows to retry
					reject({
						code: 'CLOUDFLARE_CHALLENGE_REQUIRED',
						message: 'Please try again',
						id: 'c0a62bcd-472b-43c9-8b5e-94de043f1eeb',
					});
				} catch (err) {
					// Challenge dialog not shown (not configured) or user cancelled
					// Pass through the original error/response
					const body = res.status === 204 ? null : await res.json();
					if (res.status === 200) {
						resolve(body);
					} else if (res.status === 204) {
						resolve(undefined as _ResT);
					} else {
						reject(body.error);
					}
				}
				return; // Don't continue with normal processing
			}
			//#endregion

			// Normal response handling
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve(undefined as _ResT); // void -> undefined
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}
