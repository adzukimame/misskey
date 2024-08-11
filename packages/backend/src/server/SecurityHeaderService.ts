import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import pug from 'pug';
import { JSDOM } from 'jsdom';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { bindThis } from '@/decorators.js';
import type { FastifyInstance } from 'fastify';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

@Injectable()
export class SecurityHeaderService {
	private readonly cspEnabled: boolean;
	private readonly reportEnabled: boolean;
	private readonly reportTo: string | undefined;
	private readonly strictestPolicy: string;
	private readonly selfHostedMediaPolicy: string;
	private readonly basePolicy: string;

	constructor(
		@Inject(DI.config)
		private config: Config,
	) {
		this.cspEnabled = this.config.contentSecurityPolicy !== undefined && process.env.NODE_ENV === 'production';

		this.reportEnabled = this.cspEnabled && this.config.contentSecurityPolicy?.reportTo !== undefined;

		if (this.reportEnabled) {
			/* eslint-disable @typescript-eslint/no-non-null-assertion */
			this.reportTo = JSON.stringify({
				group: 'csp',
				max_age: 31536000,
				endpoints: [
					{ url: this.config.contentSecurityPolicy!.reportTo },
				],
				include_subdomains: true,
			});
			/* eslint-enable @typescript-eslint/no-non-null-assertion */
		} else {
			this.reportTo = undefined;
		}

		this.strictestPolicy = `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';${this.reportEnabled ? ' report-to csp;' : ''}`;

		this.selfHostedMediaPolicy = `default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self'; base-uri 'none'; sandbox; form-action 'none'; frame-ancestors 'none';${this.reportEnabled ? ' report-to csp;' : ''}`;

		const baseScripts = new JSDOM(pug.compileFile(`${_dirname}/web/views/base.pug`)({
			version: this.config.version,
			config: this.config,
		})).window.document.getElementsByTagName('script');

		const scriptHash = [
			createHash('sha256').update(baseScripts[0].textContent as string).digest().toString('base64'),
			createHash('sha256').update(readFileSync(`${_dirname}/web/boot.js`)).digest().toString('base64'),
			...(this.config.cfWebAnalyticsToken
				? [createHash('sha256').update(baseScripts[baseScripts.length - 1].textContent as string).digest().toString('base64')]
				: []),
			createHash('sha256').update(readFileSync(`${_dirname}/web/bios.js`)).digest().toString('base64'),
			createHash('sha256').update(readFileSync(`${_dirname}/web/cli.js`)).digest().toString('base64'),
			createHash('sha256').update(new JSDOM(pug.compileFile(`${_dirname}/web/views/flush.pug`)()).window.document.getElementsByTagName('script')[0].textContent as string).digest().toString('base64'),
		];

		const scriptSrc = [
			// eslint-disable-next-line quotes
			"'strict-dynamic'", "'self'", "'wasm-unsafe-eval'", 'https://static.cloudflareinsights.com/beacon.min.js',
			...(scriptHash.map(hash => `'sha256-${hash}'`)),
		].join(' ');

		const mediaProxyOrigin = new URL(this.config.mediaProxy).origin;

		// eslint-disable-next-line quotes
		const imgSrc = ["'self'", 'data:', 'blob:', 'https://xn--931a.moe', 'https://misskey-hub.net', 'https://avatars.githubusercontent.com', 'https://assets.misskey-hub.net', ...(this.config.externalMediaProxyEnabled ? [mediaProxyOrigin] : []), ...(this.config.contentSecurityPolicy?.imgAndMediaSrc ?? [])].join(' ');

		// eslint-disable-next-line quotes
		const mediaSrc = ["'self'", ...(this.config.externalMediaProxyEnabled ? [mediaProxyOrigin] : []), ...(this.config.contentSecurityPolicy?.imgAndMediaSrc ?? [])].join(' ');

		const frameSrc = ['https://www.google.com/recaptcha/', 'https://recaptcha.google.com/recaptcha/', 'https://hcaptcha.com', 'https://*.hcaptcha.com', 'https://challenges.cloudflare.com', ...(this.config.contentSecurityPolicy?.frameSrc ?? [])].join(' ');

		this.basePolicy = `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src ${imgSrc}; media-src ${mediaSrc}; connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://cloudflareinsights.com/cdn-cgi/rum; frame-src ${frameSrc}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types default;${this.reportEnabled ? ' report-to csp;' : ''}`;
	}

	@bindThis
	public attach(fastify: FastifyInstance) {
		fastify.addHook('onRequest', (request, reply, done) => {
			reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai');
			reply.header('Cross-Origin-Opener-Policy', 'same-origin');
			reply.header('Cross-Origin-Resource-Policy', 'same-origin');
			reply.header('Origin-Agent-Cluster', '?1');
			reply.header('Referrer-Policy', 'same-origin');
			reply.header('X-Content-Type-Options', 'nosniff');
			reply.header('X-Frame-Options', 'DENY');
			reply.header('X-XSS-Protection', '0');

			if (this.reportEnabled) {
				reply.header('Report-To', this.reportTo);
			}

			const secFetchSite = request.headers['sec-fetch-site'];
			const secFetchMode = request.headers['sec-fetch-mode'];
			const secFetchDest = request.headers['sec-fetch-dest'];

			if (secFetchSite === 'same-site' || secFetchSite === 'cross-site') {
				/* eslint-disable no-empty */
				if (request.method === 'GET' && secFetchMode === 'navigate' && secFetchDest === 'document') {
				} else if (request.method === 'GET' && secFetchMode === 'navigate' && secFetchDest === 'empty') {
				} else if (request.method === 'GET' && request.routeOptions.url === '/_info_card_' && secFetchMode === 'navigate' && secFetchDest === 'iframe') {
				} else if (request.method === 'GET' && request.routeOptions.url === '/favicon.ico' && secFetchDest === 'image') {
				} else {
					reply.header('Content-Security-Policy', this.strictestPolicy);
					reply.header('Cache-Control', 'private');
					reply.code(400).send();
				}
				/* eslint-enable no-empty */
			}

			if (this.cspEnabled) {
				switch (request.routeOptions.url) {
					// OpenApiServerService
					case '/api-doc':
						reply.header('Content-Security-Policy', `default-src 'self'; script-src https://cdn.redoc.ly; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cdn.redoc.ly; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none';${this.reportEnabled ? ' report-to csp;' : ''}`);
						break;

					// ActivityPubServerService
					case '/inbox':
						reply.header('Content-Security-Policy', this.strictestPolicy);
						break;

					// ServerService
					case '/emoji/:path(.*)':
						reply.header('Content-Security-Policy', this.strictestPolicy);
						break;

					// FileServerService
					case '/files/app-default.jpg':
					case '/files/:key':
					case '/files/:key/*':
					case '/proxy/:url*':
						reply.header('Content-Security-Policy', this.selfHostedMediaPolicy);
						break;

					// ClientServerService
					case '/vite/*':
						reply.header('Content-Security-Policy', this.strictestPolicy);
						break;

					case '/static-assets/*':
					case '/client-assets/*':
					case '/assets/*':
					case '/apple-touch-icon.png':
					case '/fluent-emoji/:path(.*)':
					case '/twemoji/:path(.*)':
					case '/twemoji-badge/:path(.*)':
						reply.header('Content-Security-Policy', this.selfHostedMediaPolicy);
						break;

					case '/favicon.ico':
						reply.removeHeader('Cross-Origin-Resource-Policy');
						reply.header('Content-Security-Policy', this.selfHostedMediaPolicy);
						break;

					case '/sw.js':
						reply.header('Content-Security-Policy-Report-Only', `default-src 'none'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';${this.reportEnabled ? ' report-to csp;' : ''}`);
						break;

					case '/url':
						reply.header('Content-Security-Policy', this.strictestPolicy);
						break;

					case '/_info_card_':
						reply.removeHeader('X-Frame-Options');
						reply.header('Content-Security-Policy', `default-src 'none'; style-src 'unsafe-inline'; img-src ${(this.config.contentSecurityPolicy?.imgAndMediaSrc ?? []).join(' ')}; base-uri 'none'; form-action 'none';${this.reportEnabled ? ' report-to csp;' : ''}`);
						break;

					default:
						if (request.routeOptions.url === undefined) {
							reply.header('Content-Security-Policy', this.strictestPolicy);
						} else if (request.routeOptions.url.startsWith('/api/')) {
							// ApiServerService
							reply.header('Content-Security-Policy', this.strictestPolicy);
						} else if (request.routeOptions.url.startsWith('/oauth/')) {
							// OAuth2ProviderService
							reply.header('Content-Security-Policy-Report-Only', `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';${this.reportEnabled ? ' report-to csp;' : ''}`);
						} else if (request.routeOptions.url === '/queue' || request.routeOptions.url.startsWith('/queue/')) {
							// ClientServerService
							reply.header('Content-Security-Policy', `default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none';${this.reportEnabled ? ' report-to csp;' : ''}`);
						} else {
							reply.header('Content-Security-Policy', this.basePolicy);
						}
						break;
				}
			}

			done();
		});
	}
}
