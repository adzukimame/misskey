/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import cluster from 'node:cluster';
import chalk from 'chalk';
import { default as convertColor } from 'color-convert';
import { formatTime } from '@/misc/date-format.js';
import { bindThis } from '@/decorators.js';
import { envOption } from './env.js';
import type { KEYWORD } from 'color-convert/conversions.js';

type Context = {
	name: string;
	color?: KEYWORD;
};

type Level = 'error' | 'success' | 'warning' | 'debug' | 'info';

// eslint-disable-next-line import/no-default-export
export default class Logger {
	private context: Context;
	private parentLogger: Logger | null = null;

	constructor(context: string, color?: KEYWORD) {
		this.context = {
			name: context,
			color: color,
		};
	}

	@bindThis
	public createSubLogger(context: string, color?: KEYWORD): Logger {
		const logger = new Logger(context, color);
		logger.parentLogger = this;
		return logger;
	}

	@bindThis
	private log(level: Level, message: string, data?: Record<string, any> | null, important = false, subContexts: Context[] = []): void {
		if (envOption.quiet) return;

		if (this.parentLogger) {
			this.parentLogger.log(level, message, data, important, [this.context].concat(subContexts));
			return;
		}

		if (envOption.logJson) {
			if (data) {
				for (const key of Object.keys(data)) {
					if (data[key] instanceof Error) {
						data[key] = {
							name: (data[key] as Error).name,
							message: (data[key] as Error).message,
							stack: (data[key] as Error).stack,
						};
					}
				}
			}

			console.log(JSON.stringify({
				time: new Date().toISOString(),
				level: level,
				worker: cluster.isPrimary ? '*' : `${cluster.worker!.id}`,
				context: [this.context.name].concat(subContexts.map(c => c.name)).join('.'),
				important: important,
				message: message,
				data: data,
			}));
			return;
		}

		const time = formatTime(new Date());
		const worker = cluster.isPrimary ? '*' : cluster.worker!.id;
		const colorizedLevel =
			level === 'error' ? important ? chalk.bgRed.white('ERR ') : chalk.red('ERR ') :
			level === 'warning' ? chalk.yellow('WARN') :
			level === 'success' ? important ? chalk.bgGreen.white('DONE') : chalk.green('DONE') :
			level === 'debug' ? chalk.gray('VERB') :
			level === 'info' ? chalk.blue('INFO') :
			null;
		const contexts = [this.context].concat(subContexts).map(d => d.color ? chalk.rgb(...convertColor.keyword.rgb(d.color))(d.name) : chalk.white(d.name));
		const colorizedMessage =
			level === 'error' ? chalk.red(message) :
			level === 'warning' ? chalk.yellow(message) :
			level === 'success' ? chalk.green(message) :
			level === 'debug' ? chalk.gray(message) :
			level === 'info' ? message :
			null;

		let log = `${colorizedLevel} ${worker}\t[${contexts.join(' ')}]\t${colorizedMessage}`;
		if (envOption.withLogTime) log = chalk.gray(time) + ' ' + log;

		const args: unknown[] = [important ? chalk.bold(log) : log];
		if (data != null) {
			args.push(data);
		}
		console.log(...args);
	}

	@bindThis
	public error(x: string | Error, data?: Record<string, any> | null, important = false): void { // 実行を継続できない状況で使う
		if (x instanceof Error) {
			data = data ?? {};
			data.e = x;
			this.log('error', x.toString(), data, important);
		} else if (typeof x === 'object') {
			this.log('error', `${(x as any).message ?? (x as any).name ?? x}`, data, important);
		} else {
			this.log('error', `${x}`, data, important);
		}
	}

	@bindThis
	public warn(message: string, data?: Record<string, any> | null, important = false): void { // 実行を継続できるが改善すべき状況で使う
		this.log('warning', message, data, important);
	}

	@bindThis
	public succ(message: string, data?: Record<string, any> | null, important = false): void { // 何かに成功した状況で使う
		this.log('success', message, data, important);
	}

	@bindThis
	public debug(message: string, data?: Record<string, any> | null, important = false): void { // デバッグ用に使う(開発者に必要だが利用者に不要な情報)
		if (process.env.NODE_ENV !== 'production' || envOption.verbose) {
			this.log('debug', message, data, important);
		}
	}

	@bindThis
	public info(message: string, data?: Record<string, any> | null, important = false): void { // それ以外
		this.log('info', message, data, important);
	}
}
