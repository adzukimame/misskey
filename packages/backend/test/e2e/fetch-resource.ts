/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { api, channel, clip, play, post, relativeFetch, signup, simpleGet, uploadFile } from '../utils.js';
import type { SimpleGetResponse } from '../utils.js';
import type * as misskey from 'misskey-js';

// Request Accept
const ONLY_AP = 'application/activity+json';
const PREFER_AP = 'application/activity+json, */*';
const PREFER_HTML = 'text/html, */*';
const UNSPECIFIED = '*/*';

// Response Content-Type
const AP = 'application/activity+json; charset=utf-8';
const HTML = 'text/html; charset=utf-8';
const JSON_UTF8 = 'application/json; charset=utf-8';

describe('Webリソース', () => {
	let alice: misskey.entities.SignupResponse;
	let aliceUploadedFile: misskey.entities.DriveFile | null;
	let alicesPost: misskey.entities.Note;
	let alicePlay: misskey.entities.Flash;
	let aliceClip: misskey.entities.Clip;
	let aliceChannel: misskey.entities.Channel;

	let bob: misskey.entities.SignupResponse;

	type Request = {
		path: string,
		accept?: string,
		cookie?: string,
	};
	const ok = async (param: Request & {
		type?: string,
	}):Promise<SimpleGetResponse> => {
		const { path, accept, cookie, type } = param;
		const res = await simpleGet(path, accept, cookie);
		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.type, type ?? HTML);
		return res;
	};

	const notOk = async (param: Request & {
		status?: number,
		code?: string,
	}): Promise<SimpleGetResponse> => {
		const { path, accept, cookie, status, code } = param;
		const res = await simpleGet(path, accept, cookie);
		assert.notStrictEqual(res.status, 200);
		if (status != null) {
			assert.strictEqual(res.status, status);
		}
		if (code != null) {
			assert.strictEqual(res.body.error.code, code);
		}
		return res;
	};

	const notFound = async (param: Request): Promise<SimpleGetResponse> => {
		return await notOk({
			...param,
			status: 404,
		});
	};

	const metaTag = (res: SimpleGetResponse, key: string, superkey = 'name'): string => {
		return res.body.window.document.querySelector('meta[' + superkey + '="' + key + '"]')?.content;
	};

	beforeAll(async () => {
		alice = await signup({ username: 'alice' });
		aliceUploadedFile = (await uploadFile(alice)).body;
		alicesPost = await post(alice, {
			text: 'test',
		});
		alicePlay = await play(alice, {});
		aliceClip = await clip(alice, {});
		aliceChannel = await channel(alice, {});

		bob = await signup({ username: 'bob' });
	}, 1000 * 60 * 2);

	describe.each([
		{ path: '/', type: HTML },
		{ path: '/docs/ja-JP/about', type: HTML }, // "指定されたURLに該当するページはありませんでした。"
		// fastify-static gives charset=UTF-8 instead of utf-8 and that's okay
		{ path: '/api-doc', type: 'text/html; charset=UTF-8' },
		{ path: '/api.json', type: JSON_UTF8 },
		{ path: '/api-console', type: HTML },
		{ path: '/_info_card_', type: HTML },
		{ path: '/bios', type: HTML },
		{ path: '/cli', type: HTML },
		{ path: '/flush', type: HTML },
		{ path: '/robots.txt', type: 'text/plain; charset=UTF-8' },
		{ path: '/favicon.ico', type: 'image/vnd.microsoft.icon' },
		{ path: '/opensearch.xml', type: 'application/opensearchdescription+xml' },
		{ path: '/apple-touch-icon.png', type: 'image/png' },
	])('$path', (p) => {
		test('がGETできる。', async () => await ok({ ...p }));

		// 注意: Webページが200で取得できても、実際のHTMLが正しく表示できるとは限らない
		//      例えば、 /@xxx/pages/yyy に存在しないIDを渡した場合、HTTPレスポンスではエラーを区別できない
		//      こういったアサーションはフロントエンドE2EやAPI Endpointのテストで担保する。
	});

	describe.each([
		{ path: '/twemoji/2764.svg', type: 'image/svg+xml' },
		{ path: '/twemoji/2764-fe0f-200d-1f525.svg', type: 'image/svg+xml' },
		{ path: '/twemoji-badge/2764.png', type: 'image/png' },
		{ path: '/twemoji-badge/2764-fe0f-200d-1f525.png', type: 'image/png' },
		{ path: '/fluent-emoji/2764.png', type: 'image/png' },
		{ path: '/fluent-emoji/2764-fe0f-200d-1f525.png', type: 'image/png' },
	])('$path', (p) => {
		test('のGETリクエストがリダイレクトされる', async () => {
			const res = await simpleGet(p.path);
			assert.strictEqual(res.status, 301);
		});
	});

	describe.each([
		{ path: '/twemoji/2764.png' },
		{ path: '/twemoji/2764-fe0f-200d-1f525.png' },
		{ path: '/twemoji-badge/2764.svg' },
		{ path: '/twemoji-badge/2764-fe0f-200d-1f525.svg' },
		{ path: '/fluent-emoji/2764.svg' },
		{ path: '/fluent-emoji/2764-fe0f-200d-1f525.svg' },
	])('$path', ({ path }) => {
		test('はGETできない。', async () => await notFound({ path }));
	});

	describe.each([{ path: '/api/foo' }])('$path', ({ path }) => {
		test('はGETできない。', async () => await notOk({
			path,
			status: 404,
			code: 'UNKNOWN_API_ENDPOINT',
		}));
	});

	describe.each([{ path: '/queue' }])('$path', ({ path }) => {
		test('はログインしないとGETできない。', async () => await notOk({
			path,
			status: 401,
		}));

		const getBullCookie = async (me: misskey.entities.SignupResponse) => {
			const bullLoginRes = await relativeFetch('/queue/login', { redirect: 'manual' });
			const [session, time, signature] = (<string>bullLoginRes.headers.get('set-cookie')).split(';')[0].split('=')[1].split('.');

			await api('miauth/gen-token', {
				session: session,
				permission: [],
			}, me);

			const bullCallbackRes = await relativeFetch(`/queue/login/callback?session=${session}`, {
				redirect: 'manual',
				headers: {
					cookie: `__Secure-session=${session}.${time}.${signature}`,
				},
			});

			return (<RegExpMatchArray>(<string>bullCallbackRes.headers.get('set-cookie')).match(/(__Secure-token=[^;]+);/))[1];
		};

		test('はadminでなければGETできない。', async () => await notOk({
			path,
			cookie: await getBullCookie(bob),
			status: 403,
		}));

		test('はadminならGETできる。', async () => await ok({
			path,
			cookie: await getBullCookie(alice),
		}));
	});

	describe.each([{ path: '/streaming' }])('$path', ({ path }) => {
		test('はGETできない。', async () => await notOk({
			path,
			status: 503,
		}));
	});

	describe('/@:username', () => {
		const path = (username: string): string => `/@${username}`;

		describe.each([
			{ accept: PREFER_HTML },
			{ accept: UNSPECIFIED },
		])('(Acceptヘッダ: $accept)', ({ accept }) => {
			test('はHTMLとしてGETできる。', async () => {
				const res = await ok({
					path: path(alice.username),
					accept,
					type: HTML,
				});
				assert.strictEqual(metaTag(res, 'misskey:user-username'), alice.username);
				assert.strictEqual(metaTag(res, 'misskey:user-id'), alice.id);

				// TODO ogタグの検証
				// TODO profile.noCrawleの検証
				// TODO twitter:creatorの検証
				// TODO <link rel="me" ...>の検証
			});
			test('はHTMLとしてGETできる。(存在しないIDでも。)', async () => await ok({
				path: path('xxxxxxxxxx'),
				type: HTML,
			}));
		});

		describe.each([
			{ accept: ONLY_AP },
			{ accept: PREFER_AP },
		])('(Acceptヘッダ: $accept)', ({ accept }) => {
			test('はActivityPubとしてGETできる。', async () => {
				const res = await ok({
					path: path(alice.username),
					accept,
					type: AP,
				});
				assert.strictEqual(res.body.type, 'Person');
			});

			test('は存在しないIDのときActivityPubとしてGETできない。', async () => await notFound({
				path: path('xxxxxxxxxx'),
				accept,
			}));
		});
	});

	describe.each([
		// 実際のハンドルはフロントエンド(index.vue)で行われる
		{ sub: 'home' },
		{ sub: 'notes' },
		{ sub: 'activity' },
		{ sub: 'reactions' },
		{ sub: 'clips' },
		{ sub: 'pages' },
	])('/@:username/$sub', ({ sub }) => {
		const path = (username: string): string => `/@${username}/${sub}`;

		test('はHTMLとしてGETできる。', async () => {
			const res = await ok({
				path: path(alice.username),
			});
			assert.strictEqual(metaTag(res, 'misskey:user-username'), alice.username);
			assert.strictEqual(metaTag(res, 'misskey:user-id'), alice.id);
		});
	});

	describe('/users/:id', () => {
		const path = (id: string): string => `/users/${id}`;

		describe.each([
			{ accept: PREFER_HTML },
			{ accept: UNSPECIFIED },
		])('(Acceptヘッダ: $accept)', ({ accept }) => {
			test('は/@:usernameにリダイレクトする', async () => {
				const res = await simpleGet(path(alice.id), accept);
				assert.strictEqual(res.status, 302);
				assert.strictEqual(res.location, `/@${alice.username}`);
			});

			test('は存在しないユーザーはGETできない。', async () => await notFound({
				path: path('xxxxxxxx'),
			}));
		});

		describe.each([
			{ accept: ONLY_AP },
			{ accept: PREFER_AP },
		])('(Acceptヘッダ: $accept)', ({ accept }) => {
			test('はActivityPubとしてGETできる。', async () => {
				const res = await ok({
					path: path(alice.id),
					accept,
					type: AP,
				});
				assert.strictEqual(res.body.type, 'Person');
			});

			test('は存在しないIDのときActivityPubとしてGETできない。', async () => await notOk({
				path: path('xxxxxxxx'),
				accept,
				status: 404,
			}));
		});
	});

	describe('/users/inbox', () => {
		test('がGETできる。(POST専用だけど4xx/5xxにならずHTMLが返ってくる)', async () => await ok({
			path: '/inbox',
		}));

		// test.todo('POSTできる？');
	});

	describe('/users/:id/inbox', () => {
		const path = (id: string): string => `/users/${id}/inbox`;

		test('がGETできる。(POST専用だけど4xx/5xxにならずHTMLが返ってくる)', async () => await ok({
			path: path(alice.id),
		}));

		// test.todo('POSTできる？');
	});

	describe('/users/:id/outbox', () => {
		const path = (id: string): string => `/users/${id}/outbox`;

		test('がGETできる。', async () => {
			const res = await ok({
				path: path(alice.id),
				type: AP,
			});
			assert.strictEqual(res.body.type, 'OrderedCollection');
		});
	});

	describe('/notes/:id', () => {
		const path = (noteId: string): string => `/notes/${noteId}`;

		describe.each([
			{ accept: PREFER_HTML },
			{ accept: UNSPECIFIED },
		])('(Acceptヘッダ: $accept)', ({ accept }) => {
			test('はHTMLとしてGETできる。', async () => {
				const res = await ok({
					path: path(alicesPost.id),
					accept,
					type: HTML,
				});
				assert.strictEqual(metaTag(res, 'misskey:user-username'), alice.username);
				assert.strictEqual(metaTag(res, 'misskey:user-id'), alice.id);
				assert.strictEqual(metaTag(res, 'misskey:note-id'), alicesPost.id);

				// TODO ogタグの検証
				// TODO profile.noCrawleの検証
				// TODO twitter:creatorの検証
			});

			test('はHTMLとしてGETできる。(存在しないIDでも。)', async () => await ok({
				path: path('xxxxxxxxxx'),
			}));
		});

		describe.each([
			{ accept: ONLY_AP },
			{ accept: PREFER_AP },
		])('(Acceptヘッダ: $accept)', ({ accept }) => {
			test('はActivityPubとしてGETできる。', async () => {
				const res = await ok({
					path: path(alicesPost.id),
					accept,
					type: AP,
				});
				assert.strictEqual(res.body.type, 'Note');
			});

			test('は存在しないIDのときActivityPubとしてGETできない。', async () => await notFound({
				path: path('xxxxxxxxxx'),
				accept,
			}));
		});
	});

	describe('/play/:id', () => {
		const path = (playid: string): string => `/play/${playid}`;

		test('がGETできる。', async () => {
			const res = await ok({
				path: path(alicePlay.id),
			});
			assert.strictEqual(metaTag(res, 'misskey:user-username'), alice.username);
			assert.strictEqual(metaTag(res, 'misskey:user-id'), alice.id);
			assert.strictEqual(metaTag(res, 'misskey:flash-id'), alicePlay.id);

			// TODO ogタグの検証
			// TODO profile.noCrawleの検証
			// TODO twitter:creatorの検証
		});

		test('がGETできる。(存在しないIDでも。)', async () => await ok({
			path: path('xxxxxxxxxx'),
		}));
	});

	describe('/clips/:clip', () => {
		const path = (clip: string): string => `/clips/${clip}`;

		test('がGETできる。', async () => {
			const res = await ok({
				path: path(aliceClip.id),
			});
			assert.strictEqual(metaTag(res, 'misskey:user-username'), alice.username);
			assert.strictEqual(metaTag(res, 'misskey:user-id'), alice.id);
			assert.strictEqual(metaTag(res, 'misskey:clip-id'), aliceClip.id);

			// TODO ogタグの検証
			// TODO profile.noCrawleの検証
		});

		test('がGETできる。(存在しないIDでも。)', async () => await ok({
			path: path('xxxxxxxxxx'),
		}));
	});

	describe('/channels/:channel', () => {
		const path = (channel: string): string => `/channels/${channel}`;

		test('はGETできる。', async () => {
			const res = await ok({
				path: path(aliceChannel.id),
			});

			// FIXME: misskey関連のmetaタグの設定がない
			// TODO ogタグの検証
		});

		test('がGETできる。(存在しないIDでも。)', async () => await ok({
			path: path('xxxxxxxxxx'),
		}));
	});
});
