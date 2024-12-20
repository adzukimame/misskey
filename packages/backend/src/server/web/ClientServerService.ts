/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID, randomBytes } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { Inject, Injectable } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { FastifyAdapter as BullBoardFastifyAdapter } from '@bull-board/fastify';
import ms from 'ms';
import pug from 'pug';
import { In, IsNull } from 'typeorm';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyCookie from '@fastify/cookie';
import fastifyProxy from '@fastify/http-proxy';
import vary from 'vary';
import htmlSafeJsonStringify from 'htmlescape';
import type { Config } from '@/config.js';
import { getNoteSummary } from '@/misc/get-note-summary.js';
import { DI } from '@/di-symbols.js';
import * as Acct from '@/misc/acct.js';
import type {
	DbQueue,
	DeliverQueue,
	EndedPollNotificationQueue,
	InboxQueue,
	ObjectStorageQueue,
	SystemQueue,
	UserWebhookDeliverQueue,
} from '@/core/QueueModule.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { MetaEntityService } from '@/core/entities/MetaEntityService.js';
import { ClipEntityService } from '@/core/entities/ClipEntityService.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import type { AccessTokensRepository, ChannelsRepository, ClipsRepository, FlashsRepository, MiMeta, NotesRepository, UserProfilesRepository, UsersRepository } from '@/models/_.js';
import type Logger from '@/logger.js';
import { handleRequestRedirectToOmitSearch } from '@/misc/fastify-hook-handlers.js';
import { bindThis } from '@/decorators.js';
import { FlashEntityService } from '@/core/entities/FlashEntityService.js';
import { RoleService } from '@/core/RoleService.js';
import { UrlPreviewService } from './UrlPreviewService.js';
import { ClientLoggerService } from './ClientLoggerService.js';
import type { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const staticAssets = `${_dirname}/../../../assets/`;
const clientAssets = `${_dirname}/../../../../frontend/assets/`;
const assets = `${_dirname}/../../../../../built/_frontend_dist_/`;
const swAssets = `${_dirname}/../../../../../built/_sw_dist_/`;
const viteOut = `${_dirname}/../../../../../built/_vite_/`;
const tarball = `${_dirname}/../../../../../built/tarball/`;

@Injectable()
export class ClientServerService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		@Inject(DI.clipsRepository)
		private clipsRepository: ClipsRepository,

		@Inject(DI.flashsRepository)
		private flashsRepository: FlashsRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		private flashEntityService: FlashEntityService,
		private userEntityService: UserEntityService,
		private noteEntityService: NoteEntityService,
		private metaEntityService: MetaEntityService,
		private clipEntityService: ClipEntityService,
		private channelEntityService: ChannelEntityService,
		private urlPreviewService: UrlPreviewService,
		private roleService: RoleService,
		private clientLoggerService: ClientLoggerService,

		@Inject('queue:system') public systemQueue: SystemQueue,
		@Inject('queue:endedPollNotification') public endedPollNotificationQueue: EndedPollNotificationQueue,
		@Inject('queue:deliver') public deliverQueue: DeliverQueue,
		@Inject('queue:inbox') public inboxQueue: InboxQueue,
		@Inject('queue:db') public dbQueue: DbQueue,
		@Inject('queue:objectStorage') public objectStorageQueue: ObjectStorageQueue,
		@Inject('queue:userWebhookDeliver') public userWebhookDeliverQueue: UserWebhookDeliverQueue,
	) {
		//this.createServer = this.createServer.bind(this);
	}

	@bindThis
	private async manifestHandler(reply: FastifyReply) {
		let manifest = {
			// 空文字列の場合右辺を使いたいため
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			'short_name': this.meta.shortName || this.meta.name || this.config.host,
			// 空文字列の場合右辺を使いたいため
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			'name': this.meta.name || this.config.host,
			'start_url': '/',
			'display': 'standalone',
			'background_color': '#313a42',
			// 空文字列の場合右辺を使いたいため
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			'theme_color': this.meta.themeColor || '#86b300',
			'icons': [{
				// 空文字列の場合右辺を使いたいため
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				'src': this.meta.app192IconUrl || '/static-assets/icons/192.png',
				'sizes': '192x192',
				'type': 'image/png',
				'purpose': 'maskable',
			}, {
				// 空文字列の場合右辺を使いたいため
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				'src': this.meta.app512IconUrl || '/static-assets/icons/512.png',
				'sizes': '512x512',
				'type': 'image/png',
				'purpose': 'maskable',
			}, {
				'src': '/static-assets/splash.png',
				'sizes': '300x300',
				'type': 'image/png',
				'purpose': 'any',
			}],
			'share_target': {
				'action': '/share/',
				'method': 'GET',
				'enctype': 'application/x-www-form-urlencoded',
				'params': {
					'title': 'title',
					'text': 'text',
					'url': 'url',
				},
			},
		};

		manifest = {
			...manifest,
			...JSON.parse(this.meta.manifestJsonOverride === '' ? '{}' : this.meta.manifestJsonOverride),
		};

		reply.header('Cache-Control', 'max-age=300');
		return (manifest);
	}

	@bindThis
	private async generateCommonPugData(meta: MiMeta) {
		return {
			instanceName: meta.name ?? 'Misskey',
			icon: meta.iconUrl,
			appleTouchIcon: meta.app512IconUrl,
			themeColor: meta.themeColor,
			serverErrorImageUrl: meta.serverErrorImageUrl ?? 'https://xn--931a.moe/assets/error.jpg',
			infoImageUrl: meta.infoImageUrl ?? 'https://xn--931a.moe/assets/info.jpg',
			notFoundImageUrl: meta.notFoundImageUrl ?? 'https://xn--931a.moe/assets/not-found.jpg',
			instanceUrl: this.config.url,
			metaJson: htmlSafeJsonStringify(await this.metaEntityService.packDetailed(meta)),
			now: Date.now(),
		};
	}

	@bindThis
	public createServer(fastify: FastifyInstance, options: FastifyPluginOptions, done: (err?: Error) => void) {
		fastify.register(fastifyCookie, {
			secret: Buffer.from(this.config.bullBoardCookieSignKey ?? randomBytes(32).toString('hex'), 'hex'),
		});

		//#region Bull Dashboard
		const bullBoardPath = '/queue';
		const bullBoardCookieName = '__Secure-token';

		// Authenticate
		fastify.addHook('onRequest', async (request, reply) => {
			if (request.routeOptions.url == null) {
				reply.code(404).send('Not found');
				return;
			}

			// %71ueueとかでリクエストされたら困るため
			const url = decodeURI(request.routeOptions.url);
			if (url === bullBoardPath || url.startsWith(bullBoardPath + '/')) {
				if (!url.startsWith(bullBoardPath + '/static/')) {
					reply.header('Cache-Control', 'private, max-age=0, must-revalidate');
				}

				if (url.startsWith(`${bullBoardPath}/login`)) {
					return;
				}

				const unsignResult = request.unsignCookie(request.cookies[bullBoardCookieName] ?? '');
				const valid = unsignResult.valid, token = unsignResult.value;

				if (!valid || token == null) {
					reply.code(401).send('Login required');
					return;
				}
				const accessToken = await this.accessTokensRepository.findOneBy({ token: token });
				if (accessToken == null) {
					reply.code(403).send('No such user');
					return;
				}
				this.accessTokensRepository.update(accessToken.id, { lastUsedAt: new Date() });
				const user = await this.usersRepository.findOneBy({ id: accessToken.userId });
				if (user == null) {
					reply.code(403).send('No such user');
					return;
				}
				const isAdministrator = await this.roleService.isAdministrator(user);
				if (!isAdministrator) {
					reply.code(403).send('Access denied');
					return;
				}
			}
		});

		const bullBoardTempCookieName = '__Secure-session';
		const miauthParams = new URLSearchParams({
			name: encodeURIComponent('Bull Dashboard'),
			icon: encodeURIComponent(`${this.config.url}/favicon.ico`),
			callback: encodeURIComponent(`${this.config.url}${bullBoardPath}/login/callback`),
		}).toString();

		fastify.get(`${bullBoardPath}/login`, async (request, reply) => {
			const uuid = crypto.randomUUID();
			reply.setCookie(bullBoardTempCookieName, `${uuid}.${Date.now()}`, {
				path: bullBoardPath,
				httpOnly: true,
				secure: true,
				sameSite: true,
				signed: true,
				maxAge: 600,
			});
			return reply.redirect(`/miauth/${uuid}?${miauthParams}`, 302);
		});

		fastify.get<{
			Querystring: { session?: string; };
		}>(`${bullBoardPath}/login/callback`, async(request, reply) => {
			const unsignResult = request.unsignCookie(request.cookies[bullBoardTempCookieName] ?? '');
			const sessionIdFromQuery = request.query.session;

			reply.clearCookie(bullBoardTempCookieName, {
				path: bullBoardPath,
				httpOnly: true,
				secure: true,
				sameSite: true,
			});

			if (unsignResult.valid && unsignResult.value) {
				const [sessionIdFromCookie, time] = unsignResult.value.split('.');
				if (sessionIdFromCookie.length === 36 && sessionIdFromCookie === sessionIdFromQuery && Date.now() - parseInt(time) < 10 * 60 * 1000) {
					try {
						const token = await this.accessTokensRepository.findOneBy({
							session: sessionIdFromCookie,
						});

						if (token && token.session != null && !token.fetched) {
							this.accessTokensRepository.update(token.id, {
								fetched: true,
							});

							reply.setCookie(bullBoardCookieName, token.token, {
								path: bullBoardPath,
								httpOnly: true,
								secure: true,
								sameSite: true,
								signed: true,
								maxAge: 31536000,
							});
							return reply.redirect(bullBoardPath, 302);
						}
					} catch {}
				}
			}

			reply.code(401).send('MiAuth Failed');
		});

		fastify.get(`${bullBoardPath}/login/logout`, async(request, reply) => {
			reply.clearCookie(bullBoardCookieName, {
				path: bullBoardPath,
				httpOnly: true,
				secure: true,
				sameSite: true,
			});
			reply.code(200).send('Logged out');
		});

		const bullBoardServerAdapter = new BullBoardFastifyAdapter();

		createBullBoard({
			queues: [
				this.systemQueue,
				this.endedPollNotificationQueue,
				this.deliverQueue,
				this.inboxQueue,
				this.dbQueue,
				this.objectStorageQueue,
				this.userWebhookDeliverQueue,
			].map(q => new BullMQAdapter(q)),
			serverAdapter: bullBoardServerAdapter,
			options: {
				uiConfig: {
					miscLinks: [
						{
							text: 'Logout',
							url: `${bullBoardPath}/login/logout`,
						},
					],
				},
			},
		});

		bullBoardServerAdapter.setBasePath(bullBoardPath);
		(fastify.register as any)(bullBoardServerAdapter.registerPlugin(), { prefix: bullBoardPath });
		//#endregion

		fastify.register(fastifyView, {
			root: _dirname + '/views',
			engine: {
				pug: pug,
			},
			defaultContext: {
				version: this.config.version,
				config: this.config,
			},
		});

		//#region vite assets
		if (this.config.clientManifestExists) {
			fastify.register((fastify, options, done) => {
				fastify.register(fastifyStatic, {
					root: viteOut,
					prefix: '/vite/',
					maxAge: ms('30 days'),
					immutable: true,
					decorateReply: false,
				});
				fastify.addHook('onRequest', handleRequestRedirectToOmitSearch);
				done();
			});
		} else {
			const port = (process.env.VITE_PORT ?? '5173');
			fastify.register(fastifyProxy, {
				upstream: 'http://localhost:' + port,
				prefix: '/vite',
				rewritePrefix: '/vite',
			});
		}
		//#endregion

		//#region static assets

		fastify.register(fastifyStatic, {
			root: staticAssets,
			prefix: '/static-assets/',
			maxAge: ms('7 days'),
			decorateReply: false,
		});

		fastify.register(fastifyStatic, {
			root: clientAssets,
			prefix: '/client-assets/',
			maxAge: ms('7 days'),
			decorateReply: false,
		});

		fastify.register(fastifyStatic, {
			root: assets,
			prefix: '/assets/',
			maxAge: ms('7 days'),
			decorateReply: false,
		});

		fastify.register((fastify, options, done) => {
			fastify.register(fastifyStatic, {
				root: tarball,
				prefix: '/tarball/',
				maxAge: ms('30 days'),
				immutable: true,
				decorateReply: false,
			});
			fastify.addHook('onRequest', handleRequestRedirectToOmitSearch);
			done();
		});

		fastify.get('/favicon.ico', async (request, reply) => {
			return reply.sendFile('/favicon.ico', staticAssets);
		});

		fastify.get('/apple-touch-icon.png', async (request, reply) => {
			return reply.sendFile('/apple-touch-icon.png', staticAssets);
		});

		fastify.get<{ Params: { path: string } }>('/fluent-emoji/:path(.*)', async (request, reply) => {
			const path = request.params.path;

			if (!path.match(/^[0-9a-f-]+\.png$/)) {
				reply.code(404);
				return;
			}

			reply.header('Cache-Control', 'public, max-age=31536000, immutable');

			return reply.redirect(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${path}`, 301);
		});

		fastify.get<{ Params: { path: string } }>('/twemoji/:path(.*)', async (request, reply) => {
			const path = request.params.path;

			if (!path.match(/^[0-9a-f-]+\.svg$/)) {
				reply.code(404);
				return;
			}

			reply.header('Cache-Control', 'public, max-age=31536000, immutable');

			return reply.redirect(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${path}`, 301);
		});

		fastify.get<{ Params: { path: string } }>('/twemoji-badge/:path(.*)', async (request, reply) => {
			const path = request.params.path;

			if (!path.match(/^[0-9a-f-]+\.png$/)) {
				reply.code(404);
				return;
			}

			reply.header('Cache-Control', 'public, max-age=31536000, immutable');

			return reply.redirect(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${path}`, 301);
		});

		// ServiceWorker
		fastify.get('/sw.js', async (request, reply) => {
			return await reply.sendFile('/sw.js', swAssets, {
				maxAge: ms('10 minutes'),
			});
		});

		// Manifest
		fastify.get('/manifest.json', async (request, reply) => await this.manifestHandler(reply));

		fastify.get('/robots.txt', async (request, reply) => {
			return await reply.sendFile('/robots.txt', staticAssets);
		});

		// OpenSearch XML
		fastify.get('/opensearch.xml', async (request, reply) => {
			const name = this.meta.name ?? 'Misskey';
			let content = '';
			content += '<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">';
			content += `<ShortName>${name}</ShortName>`;
			content += `<Description>${name} Search</Description>`;
			content += '<InputEncoding>UTF-8</InputEncoding>';
			content += `<Image width="16" height="16" type="image/x-icon">${this.config.url}/favicon.ico</Image>`;
			content += `<Url type="text/html" template="${this.config.url}/search?q={searchTerms}"/>`;
			content += '</OpenSearchDescription>';

			reply.header('Content-Type', 'application/opensearchdescription+xml');
			return await reply.send(content);
		});

		//#endregion

		const renderBase = async (reply: FastifyReply, data: { [key: string]: any } = {}) => {
			reply.header('Cache-Control', 'public, max-age=30');
			return await reply.view('base', {
				img: this.meta.bannerUrl,
				url: this.config.url,
				title: this.meta.name ?? 'Misskey',
				desc: this.meta.description,
				...await this.generateCommonPugData(this.meta),
				...data,
			});
		};

		// URL preview endpoint
		fastify.get<{ Querystring: { url: string; lang: string; } }>('/url', (request, reply) => this.urlPreviewService.handle(request, reply));

		//#region SSR (for crawlers)
		// User
		fastify.get<{ Params: { user: string; sub?: string; } }>('/@:user/:sub?', async (request, reply) => {
			const { username, host } = Acct.parse(request.params.user);
			const user = await this.usersRepository.findOneBy({
				usernameLower: username.toLowerCase(),
				host: host ?? IsNull(),
				isSuspended: false,
			});

			vary(reply.raw, 'Accept');

			if (user != null) {
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });
				const me = profile.fields
					? profile.fields
						.filter(filed => filed.value != null && filed.value.match(/^https?:/))
						.map(field => field.value)
					: [];

				reply.header('Cache-Control', 'public, max-age=15');
				return await reply.view('user', {
					user, profile, me,
					avatarUrl: user.avatarUrl ?? this.userEntityService.getIdenticonUrl(user),
					sub: request.params.sub,
					...await this.generateCommonPugData(this.meta),
				});
			} else {
				// リモートユーザーなので
				// モデレータがAPI経由で参照可能にするために404にはしない
				return await renderBase(reply);
			}
		});

		fastify.get<{ Params: { user: string; } }>('/users/:user', async (request, reply) => {
			const user = await this.usersRepository.findOneBy({
				id: request.params.user,
				host: IsNull(),
				isSuspended: false,
			});

			if (user == null) {
				reply.code(404);
				return;
			}

			vary(reply.raw, 'Accept');

			reply.redirect(`/@${user.username}${ user.host == null ? '' : '@' + user.host}`);
		});

		// Note
		fastify.get<{ Params: { note: string; } }>('/notes/:note', async (request, reply) => {
			vary(reply.raw, 'Accept');

			const note = await this.notesRepository.findOneBy({
				id: request.params.note,
				visibility: In(['public', 'home']),
			});

			if (note) {
				const _note = await this.noteEntityService.pack(note);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: note.userId });
				reply.header('Cache-Control', 'public, max-age=15');
				return await reply.view('note', {
					note: _note,
					profile,
					avatarUrl: _note.user.avatarUrl,
					// TODO: Let locale changeable by instance setting
					summary: getNoteSummary(_note),
					...await this.generateCommonPugData(this.meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Flash
		fastify.get<{ Params: { id: string; } }>('/play/:id', async (request, reply) => {
			const flash = await this.flashsRepository.findOneBy({
				id: request.params.id,
			});

			if (flash) {
				const _flash = await this.flashEntityService.pack(flash);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: flash.userId });
				reply.header('Cache-Control', 'public, max-age=15');
				return await reply.view('flash', {
					flash: _flash,
					profile,
					avatarUrl: _flash.user.avatarUrl,
					...await this.generateCommonPugData(this.meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Clip
		fastify.get<{ Params: { clip: string; } }>('/clips/:clip', async (request, reply) => {
			const clip = await this.clipsRepository.findOneBy({
				id: request.params.clip,
			});

			if (clip && clip.isPublic) {
				const _clip = await this.clipEntityService.pack(clip);
				const profile = await this.userProfilesRepository.findOneByOrFail({ userId: clip.userId });
				reply.header('Cache-Control', 'public, max-age=15');
				return await reply.view('clip', {
					clip: _clip,
					profile,
					avatarUrl: _clip.user.avatarUrl,
					...await this.generateCommonPugData(this.meta),
				});
			} else {
				return await renderBase(reply);
			}
		});

		// Channel
		fastify.get<{ Params: { channel: string; } }>('/channels/:channel', async (request, reply) => {
			const channel = await this.channelsRepository.findOneBy({
				id: request.params.channel,
			});

			if (channel) {
				const _channel = await this.channelEntityService.pack(channel);
				reply.header('Cache-Control', 'public, max-age=15');
				return await reply.view('channel', {
					channel: _channel,
					...await this.generateCommonPugData(this.meta),
				});
			} else {
				return await renderBase(reply);
			}
		});
		//#endregion

		//region noindex pages
		// Tags
		fastify.get<{ Params: { clip: string; } }>('/tags/:tag', async (request, reply) => {
			return await renderBase(reply, { noindex: true });
		});

		// User with Tags
		fastify.get<{ Params: { clip: string; } }>('/user-tags/:tag', async (request, reply) => {
			return await renderBase(reply, { noindex: true });
		});
		//endregion

		fastify.get('/_info_card_', async (request, reply) => {
			reply.removeHeader('X-Frame-Options');

			return await reply.view('info-card', {
				version: this.config.version,
				host: this.config.host,
				meta: this.meta,
				originalUsersCount: await this.usersRepository.countBy({ host: IsNull() }),
				originalNotesCount: await this.notesRepository.countBy({ userHost: IsNull() }),
			});
		});

		fastify.get('/bios', async (request, reply) => {
			return await reply.view('bios', {
				version: this.config.version,
			});
		});

		fastify.get('/cli', async (request, reply) => {
			return await reply.view('cli', {
				version: this.config.version,
			});
		});

		const override = (source: string, target: string, depth = 0) =>
			[, ...target.split('/').filter(x => x), ...source.split('/').filter(x => x).splice(depth)].join('/');

		fastify.get('/flush', async (request, reply) => {
			return await reply.view('flush');
		});

		// streamingに非WebSocketリクエストが来た場合にbase htmlをキャシュ付きで返すと、Proxy等でそのパスがキャッシュされておかしくなる
		fastify.get('/streaming', async (request, reply) => {
			reply.code(503);
			reply.header('Cache-Control', 'private, max-age=0');
		});

		// Render base html for all requests
		fastify.get('*', async (request, reply) => {
			return await renderBase(reply);
		});

		fastify.setErrorHandler(async (error, request, reply) => {
			const errId = randomUUID();
			this.clientLoggerService.logger.error(`Internal error occurred in ${request.routeOptions.url}: ${error.message}`, {
				path: request.routeOptions.url,
				params: request.params,
				query: request.query,
				code: error.name,
				stack: error.stack,
				id: errId,
			});
			reply.code(500);
			reply.header('Cache-Control', 'max-age=10, must-revalidate');
			return await reply.view('error', {
				code: error.code,
				id: errId,
			});
		});

		done();
	}
}
