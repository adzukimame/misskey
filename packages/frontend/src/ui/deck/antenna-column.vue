<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<XColumn :menu="menu" :column="column" :isStacked="isStacked" :refresher="async () => { await timeline?.reloadTimeline() }">
	<template #header>
		<i class="ti ti-antenna"></i><span style="margin-left: 8px;">{{ column.name }}</span>
	</template>

	<MkTimeline v-if="column.antennaId" ref="timeline" src="antenna" :antenna="column.antennaId"/>
</XColumn>
</template>

<script lang="ts" setup>
import { onMounted, ref, shallowRef, watch, defineAsyncComponent } from 'vue';
import type { entities as MisskeyEntities } from 'misskey-js';
import XColumn from './column.vue';
import { updateColumn, Column } from './deck-store.js';
import MkTimeline from '@/components/MkTimeline.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { i18n } from '@/i18n.js';
import { MenuItem } from '@/types/menu.js';
import { antennasCache } from '@/cache.js';

const props = defineProps<{
	column: Column;
	isStacked: boolean;
}>();

const timeline = shallowRef<InstanceType<typeof MkTimeline>>();

onMounted(() => {
	if (props.column.antennaId == null) {
		setAntenna();
	}
});

async function setAntenna() {
	const antennas = await misskeyApi('antennas/list');
	const { canceled, result: antenna } = await os.select<MisskeyEntities.Antenna | '_CREATE_'>({
		title: i18n.ts.selectAntenna,
		items: [
			{ value: '_CREATE_', text: i18n.ts.createNew },
			(antennas.length > 0 ? {
				sectionTitle: i18n.ts.createdAntennas,
				items: antennas.map(x => ({
					value: x, text: x.name,
				})),
			} : undefined),
		],
		default: props.column.antennaId,
	});
	if (canceled) return;

	if (antenna === '_CREATE_') {
		const { dispose } = os.popup(defineAsyncComponent(() => import('@/components/MkAntennaEditorDialog.vue')), {}, {
			created: (newAntenna: MisskeyEntities.Antenna) => {
				antennasCache.delete();
				updateColumn(props.column.id, {
					antennaId: newAntenna.id,
				});
			},
			closed: () => {
				dispose();
			},
		});
		return;
	}

	updateColumn(props.column.id, {
		antennaId: antenna.id,
	});
}

function editAntenna() {
	os.pageWindow('my/antennas/' + props.column.antennaId);
}

const menu: MenuItem[] = [
	{
		icon: 'ti ti-pencil',
		text: i18n.ts.selectAntenna,
		action: setAntenna,
	},
	{
		icon: 'ti ti-settings',
		text: i18n.ts.editAntenna,
		action: editAntenna,
	},
];

/*
function focus() {
	timeline.focus();
}

defineExpose({
	focus,
});
*/
</script>
