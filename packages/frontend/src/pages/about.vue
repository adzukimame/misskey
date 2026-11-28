<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><MkPageHeader v-model:tab="tab" :tabs="headerTabs"/></template>
	<MkSpacer v-if="tab === 'overview'" :contentMax="600" :marginMin="20">
		<XOverview/>
	</MkSpacer>
	<MkSpacer v-else-if="tab === 'emojis'" :contentMax="1000" :marginMin="20">
		<XEmojis/>
	</MkSpacer>
	<MkSpacer v-else-if="tab === 'federation' && $i" :contentMax="1000" :marginMin="20">
		<XFederation/>
	</MkSpacer>
	<MkSpacer v-else-if="tab === 'charts' && $i" :contentMax="1000" :marginMin="20">
		<MkInstanceStats/>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, ref } from 'vue';
import { i18n } from '@/i18n.js';
import { $i } from '@/account.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';

const XOverview = defineAsyncComponent(() => import('@/pages/about.overview.vue'));
const XEmojis = defineAsyncComponent(() => import('@/pages/about.emojis.vue'));
const XFederation = defineAsyncComponent(() => import('@/pages/about.federation.vue'));
const MkInstanceStats = defineAsyncComponent(() => import('@/components/MkInstanceStats.vue'));

const props = withDefaults(defineProps<{
	initialTab?: string;
}>(), {
	initialTab: 'overview',
});

const tab = ref(props.initialTab);

const headerTabs = computed(() => [
	{
		key: 'overview',
		title: i18n.ts.overview,
	},
	{
		key: 'emojis',
		title: i18n.ts.customEmojis,
		icon: 'ti ti-icons',
	},
	$i
		? {
			key: 'federation',
			title: i18n.ts.federation,
			icon: 'ti ti-whirl',
		}
		: undefined,
	$i
		? {
			key: 'charts',
			title: i18n.ts.charts,
			icon: 'ti ti-chart-line',
		}
		: undefined,
]);

definePageMetadata(() => ({
	title: i18n.ts.instanceInfo,
	icon: 'ti ti-info-circle',
}));
</script>
