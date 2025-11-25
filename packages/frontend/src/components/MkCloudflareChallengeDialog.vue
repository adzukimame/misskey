<!--
SPDX-FileCopyrightText: adzuki
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal ref="modal" :preferType="'dialog'" :zPriority="'high'" @closed="emit('closed')">
	<div :class="[$style.root, { [$style.completed]: completed }]">
		<!-- Show Turnstile widget while not completed -->
		<div v-if="!completed">
			<div :class="$style.icon">
				<i class="ti ti-shield-check"></i>
			</div>
			<header :class="$style.title">{{ i18n.ts._cloudflareChallenges.verificationRequired }}</header>
			<div :class="$style.text">{{ i18n.ts._cloudflareChallenges.verificationDescription }}</div>

			<MkCaptcha
				ref="captchaEl"
				v-model="turnstileResponse"
				provider="turnstile"
				:sitekey="sitekey"
			/>

			<MkButton :class="$style.cancelButton" @click="cancel">
				{{ i18n.ts.cancel }}
			</MkButton>
		</div>

		<!-- Show success message after completion -->
		<div v-else :class="$style.successContainer">
			<i :class="[$style.icon, $style.successIcon]" class="ti ti-check"></i>
			<div :class="$style.successText">{{ i18n.ts._cloudflareChallenges.verificationCompleted }}</div>
			<MkButton primary :class="$style.closeButton" @click="close">
				{{ i18n.ts.close }}
			</MkButton>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, shallowRef, watch } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkCaptcha from '@/components/MkCaptcha.vue';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';

const props = defineProps<{
	sitekey: string;
}>();

const emit = defineEmits<{
	(ev: 'completed'): void;
	(ev: 'cancelled'): void;
	(ev: 'closed'): void;
}>();

const modal = shallowRef<InstanceType<typeof MkModal>>();
const captchaEl = shallowRef<InstanceType<typeof MkCaptcha>>();
const turnstileResponse = ref<string | null>(null);
const completed = ref(false);

function cancel() {
	emit('cancelled');
	if (modal.value) modal.value.close();
}

function close() {
	if (modal.value) modal.value.close();
}

// Watch for challenge completion
watch(turnstileResponse, (newValue) => {
	if (newValue && !completed.value) {
		// User completed the challenge
		completed.value = true;
		emit('completed');

		// Auto-close after 3 seconds
		setTimeout(() => {
			if (modal.value) modal.value.close();
		}, 4000);
	}
});
</script>

<style lang="scss" module>
.root {
	margin: auto;
	position: relative;
	padding: 32px;
	box-sizing: border-box;
	text-align: center;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
	min-width: 320px;
	max-width: 480px;

	&.completed {
		padding: 48px 32px;
	}
}

.icon {
	font-size: 48px;
	margin-bottom: 16px;
	color: var(--MI_THEME-accent);

	&.successIcon {
		font-size: 64px;
		color: var(--MI_THEME-success);
	}
}

.title {
	font-size: 1.2em;
	font-weight: bold;
	margin-bottom: 8px;
}

.text {
	margin-bottom: 16px;
	color: var(--MI_THEME-fg);
	opacity: 0.8;
}

.cancelButton {
	margin-top: 16px;
}

.successContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
}

.successText {
	font-size: 1.1em;
	line-height: 1.5;
	color: var(--MI_THEME-fg);
}

.closeButton {
	margin-top: 8px;
}
</style>
