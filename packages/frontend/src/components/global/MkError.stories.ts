/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable import/no-default-export */
/* eslint-disable import/no-duplicates */
/* eslint-disable import/order */
import { Meta } from '@storybook/vue3';
const meta = {
	title: 'components/global/MkError',
	component: MkError,
	argTypes: {
		onRetry: {
			action: 'retry',
		},
	},
} satisfies Meta<typeof MkError>;
export default meta;
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { action } from '@storybook/addon-actions';
import { expect, waitFor } from '@storybook/test';
import { StoryObj } from '@storybook/vue3';
import MkError from './MkError.vue';
export const Default = {
	render(args) {
		return {
			components: {
				MkError,
			},
			setup() {
				return {
					args,
				};
			},
			computed: {
				props() {
					return {
						...this.args,
					};
				},
				events() {
					return {
						retry: action('retry'),
					};
				},
			},
			template: '<MkError v-bind="props" v-on="events" />',
		};
	},
	async play({ canvasElement }) {
		await expect(canvasElement.firstElementChild).not.toBeNull();
		await waitFor(async () =>
			expect(canvasElement.firstElementChild?.classList).not.toContain(
				'_transition_zoom-enter-active',
			),
		);
	},
	args: {},
	parameters: {
		layout: 'centered',
	},
} satisfies StoryObj<typeof MkError>;
