<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<FormSection first>
		<template #label>{{ i18n.ts.timeline }}</template>

		<div v-panel :class="$style.tlTabsRoot">
			<div>
				<div :class="$style.tlTabsMargin">
					<MkButton inline style="margin-right: 8px;" @click="addTlTab"><i class="ti ti-plus"></i> {{ i18n.ts.add }}</MkButton>
					<MkButton inline primary @click="saveTlTabs"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
				</div>

				<Sortable
					v-model="tlTabs"
					class="_gaps_s"
					itemKey="id"
					:animation="150"
					:handle="'.' + $style.dragItemHandle"
					@start="e => e.item.classList.add('active')"
					@end="e => e.item.classList.remove('active')"
				>
					<template #item="{element, index}">
						<div :class="$style.tlTabsDragItem">
							<button class="_button" :class="$style.dragItemHandle" tabindex="-1"><i class="ti ti-menu"></i></button>
							<div :class="$style.tlTabsDragItemTlIcon">
								<i :class="element.icon"></i>
							</div>
							<div>
								{{ element.name }}
							</div>
							<button class="_button" :class="$style.dragItemEdit" @click="editTlTab(index, $event)"><i class="ti ti-settings"></i></button>
							<button :disabled="tlTabs.length < 2" class="_button" :class="$style.dragItemRemove" @click="deleteTlTab(index)"><i class="ti ti-x"></i></button>
						</div>
					</template>
				</Sortable>
			</div>
		</div>
	</FormSection>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import Sortable from 'vuedraggable';
import IconSelecter from './timeline.icon-selecter.vue';
import MkButton from '@/components/MkButton.vue';
import FormSection from '@/components/form/section.vue';
import { defaultStore } from '@/store.js';
import { deepClone } from '@/scripts/clone.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { availableBasicTimelines, basicTimelineIconClass, basicTimelineTypes, type BasicTimelineType } from '@/timelines';

const tlTabs = ref(deepClone(defaultStore.state.timelineTabs));

const addTlTab = async () => {
	const { canceled: canceled1, result: type } = await os.select({
		title: i18n.ts.type,
		items: [
			...availableBasicTimelines().map(tl => ({ text: i18n.ts._timelines[tl], value: tl })),
			{ text: i18n.ts.lists, value: 'list' },
		],
	});

	if (canceled1) return;

	if (basicTimelineTypes.includes(type as BasicTimelineType)) {
		tlTabs.value.push({
			type: type as BasicTimelineType,
			userList: null,
			name: i18n.ts._timelines[type],
			icon: basicTimelineIconClass(type as BasicTimelineType),
		});

		return;
	} else if (type === 'list') {
		const lists = await misskeyApi('users/lists/list');

		const { canceled: canceled2, result: list } = await os.select({
			title: i18n.ts.selectList,
			items: lists.map(x => ({
				value: x, text: x.name,
			})),
		});

		if (canceled2) return;

		tlTabs.value.push({
			type: 'list',
			userList: {
				id: list.id,
				name: list.name,
			},
			name: list.name,
			icon: 'ti ti-list',
		});
	}
};

if (tlTabs.value.length === 0) {
	tlTabs.value.push({
		type: 'home',
		userList: null,
		name: i18n.ts._timelines.home,
		icon: 'ti ti-home',
	});
}

const editTlTab = async (index: number, ev: MouseEvent): Promise<void> => {
	os.popupMenu([
		{
			type: 'button',
			text: i18n.ts.changeIcon,
			action: () => {
				const { dispose } = os.popup(IconSelecter, {
				}, {
					done: (icon: string) => {
						tlTabs.value[index].icon = icon;
					},
					closed: () => dispose(),
				});
			},
		},
	], ev.target);
};

const deleteTlTab = (index: number) => {
	tlTabs.value.splice(index, 1);
};

const saveTlTabs = () => {
	defaultStore.set('timelineTabs', tlTabs.value);
};

definePageMetadata(() => ({
	title: i18n.ts.timeline,
	icon: 'ti ti-layout-navbar',
}));
</script>

<style lang="scss" module>
.tlTabsRoot {
	container-type: inline-size;
	border-radius: 6px;
	padding: 12px;
}

.tlTabsMargin {
	margin-bottom: 1.5em;
}

.tlTabsDragItem {
	display: flex;
	padding-block-end: .75em;
	align-items: center;
	border-bottom: solid 0.5px var(--MI_THEME-divider);

	&:last-child {
		border-bottom: 0;
	}
}

.tlTabsDragItemTlIcon {
	width: 32px;
	display: inline-block;
	margin-inline-end: 2px;
	text-align: center;
	font-size: 1em;
}

.dragItemHandle {
	cursor: grab;
	width: 32px;
	height: 32px;
	margin-inline-end: 8px;
	opacity: 0.5;
	flex-shrink: 0;

	&:active {
		cursor: grabbing;
	}
}

.dragItemEdit {
	@extend .dragItemHandle;

	opacity: 1;
	cursor: pointer;
	margin-inline-start: auto;

	&:hover, &:focus {
		opacity: .7;
	}

	&:active {
		cursor: pointer;
	}
}

.dragItemRemove {
	@extend .dragItemEdit;

	color: #ff2a2a;
	margin-inline-start: 0;

	&[disabled] {
		cursor: not-allowed;
		opacity: .7;
	}
}

.dragItemForm {
	flex-grow: 1;
}

.listButtonCaption {
	font-size: 0.85em;
	padding: 0 0 8px 0;
}
</style>
