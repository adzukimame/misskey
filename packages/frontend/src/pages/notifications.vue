<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><MkPageHeader v-model:tab="tab" :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :contentMax="800">
		<div v-if="tab === 'all'" key="all">
			<XNotifications :class="$style.notifications" :excludeTypes="excludeTypes"/>
		</div>
		<div v-else-if="tab === 'mentions'" key="mention">
			<MkNotes :pagination="mentionsPagination"/>
		</div>
		<div v-else-if="tab === 'directNotes'" key="directNotes">
			<MkNotes :pagination="directNotesPagination"/>
		</div>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { MenuItem } from '@/types/menu';
import XNotifications from '@/components/MkNotifications.vue';
import MkNotes from '@/components/MkNotes.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { notificationTypes } from '@/const.js';

const tab = ref<'all' | 'mentions' | 'directNotes'>('all');
const includeTypes = ref<string[]>();
const excludeTypes = computed(() => includeTypes.value ? notificationTypes.filter(t => !includeTypes.value?.includes(t)) : []);

const mentionsPagination = {
	endpoint: 'notes/mentions' as const,
	limit: 10,
};

const directNotesPagination = {
	endpoint: 'notes/mentions' as const,
	limit: 10,
	params: {
		visibility: 'specified',
	},
};

function setFilter(ev) {
	const typeItems = notificationTypes.map(t => ({
		text: i18n.ts._notification._types[t],
		active: (includeTypes.value && includeTypes.value.includes(t)) ?? false,
		action: () => {
			includeTypes.value = [t];
		},
	}));

	const items: MenuItem[] = [
		includeTypes.value !== undefined
			? {
				icon: 'ti ti-x',
				text: i18n.ts.clear,
				action: () => {
					includeTypes.value = undefined;
				},
			}
			: undefined,
		includeTypes.value !== undefined
			? { type: 'divider' }
			: undefined,
		...typeItems,
	];

	os.popupMenu(items, ev.currentTarget ?? ev.target);
}

const headerActions = computed(() => tab.value === 'all' ? [
	{
		text: i18n.ts.filter,
		icon: 'ti ti-filter',
		highlighted: includeTypes.value !== undefined,
		handler: setFilter,
	},
	{
		text: i18n.ts.markAllAsRead,
		icon: 'ti ti-check',
		handler: () => {
			os.apiWithDialog('notifications/mark-all-as-read', {});
		},
	},
] : undefined);

const headerTabs = computed(() => [
	{
		key: 'all',
		title: i18n.ts.all,
		icon: 'ti ti-point',
	},
	{
		key: 'mentions',
		title: i18n.ts.mentions,
		icon: 'ti ti-at',
	},
	{
		key: 'directNotes',
		title: i18n.ts.directNotes,
		icon: 'ti ti-mail',
	},
]);

definePageMetadata(() => ({
	title: i18n.ts.notifications,
	icon: 'ti ti-bell',
}));
</script>

<style module lang="scss">
.notifications {
	border-radius: var(--MI-radius);
	overflow: clip;
}
</style>
