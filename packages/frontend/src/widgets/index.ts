/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { App, defineAsyncComponent } from 'vue';

export default function(app: App) {
	app.component('WidgetProfile', defineAsyncComponent(() => import('./WidgetProfile.vue')));
	app.component('WidgetInstanceInfo', defineAsyncComponent(() => import('./WidgetInstanceInfo.vue')));
	app.component('WidgetJobQueue', defineAsyncComponent(() => import('./WidgetJobQueue.vue')));
}

export const widgets = [
	'profile',
	'instanceInfo',
	'jobQueue',
];
