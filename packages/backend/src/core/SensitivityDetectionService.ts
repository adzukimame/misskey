/*
 * SPDX-FileCopyrightText: adzuki
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { MiMeta } from '@/models/_.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { query } from '@/misc/prelude/url.js';
import type Logger from '@/logger.js';

type DetectionResult = {
	sensitive: boolean;
	porn: boolean;
};

@Injectable()
export class SensitivityDetectionService {
	private logger: Logger;

	constructor(
		@Inject(DI.meta)
		private meta: MiMeta,

		private httpRequestService: HttpRequestService,
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('sensitivity-detection');
	}

	@bindThis
	private getSensitiveThreshold(): number {
		// 感度が高いほどしきい値は低くすることになる
		switch (this.meta.sensitiveMediaDetectionSensitivity) {
			case 'veryHigh': return 0.1;
			case 'high': return 0.3;
			case 'low': return 0.7;
			case 'veryLow': return 0.9;
			default: return 0.5;
		}
	}

	@bindThis
	public async detectSensitivity(url: string): Promise<[sensitive: boolean, porn: boolean]> {
		if (!this.meta.sensitivityDetectionServiceUrl) {
			return [false, false];
		}

		const queryStr = query({
			url: url,
			sensitiveThreshold: this.getSensitiveThreshold(),
			sensitiveThresholdForPorn: 0.75,
			enableDetectionForVideos: this.meta.enableSensitiveMediaDetectionForVideos,
		});

		const requestUrl = `${this.meta.sensitivityDetectionServiceUrl}?${queryStr}`;

		this.logger.info(`Detecting sensitivity for ${url}`);

		try {
			const result = await this.httpRequestService.getJson<DetectionResult>(
				requestUrl,
				'application/json',
				undefined,
				30000,
			);

			this.logger.info(`Detection result for ${url}: sensitive=${result.sensitive}, porn=${result.porn}`);

			return [result.sensitive, result.porn];
		} catch (err) {
			this.logger.warn(`Failed to detect sensitivity for ${url}`, { error: err });
			return [false, false];
		}
	}
}
