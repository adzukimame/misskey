<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkWindow ref="uiWindow" :initialWidth="400" :initialHeight="500" :canResize="true">
	<template #header>
		<i class="ti ti-exclamation-circle" style="margin-right: 0.5em;"></i>
		<I18n :src="i18n.ts.reportAbuseOf" tag="span">
			<template #name>
				<b><MkAcct :user="user"/></b>
			</template>
		</I18n>
	</template>
	<MkSpacer :marginMin="20" :marginMax="28">
		<div class="_gaps_m" :class="$style.root">
			<div class="">
				<MkTextarea v-model="comment">
					<template #label>{{ i18n.ts.details }}</template>
					<template #caption>{{ i18n.ts.fillAbuseReportDescription }}</template>
				</MkTextarea>
			</div>
			<div class="">
				<MkButton primary full :disabled="comment.length === 0">{{ i18n.ts.send }}</MkButton>
			</div>
		</div>
	</MkSpacer>
</MkWindow>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import type { UserLite } from 'misskey-js/entities.js';
import MkWindow from '@/components/MkWindow.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	user: UserLite;
	initialComment?: string;
}>();

const uiWindow = useTemplateRef('uiWindow');
const comment = ref(props.initialComment ?? '');
</script>

<style lang="scss" module>
.root {
	--root-margin: 16px;
}
</style>
