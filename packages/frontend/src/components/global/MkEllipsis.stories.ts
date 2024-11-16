/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Meta, type StoryObj } from '@storybook/vue3';

const meta = {
	title: 'components/global/MkEllipsis',
	component: MkEllipsis,
} satisfies Meta<typeof MkEllipsis>;

export default meta;

import isChromatic from 'chromatic/isChromatic';
import MkEllipsis from './MkEllipsis.vue';

export const Default = {
	render(args) {
		return {
			components: {
				MkEllipsis,
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
			},
			template: '<MkEllipsis v-bind="props" />',
		};
	},
	args: {
		static: isChromatic(),
	},
	parameters: {
		layout: 'centered',
	},
} satisfies StoryObj<typeof MkEllipsis>;