<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<div v-for="user in users" :key="user.id" style="display:inline-block;width:32px;height:32px;margin-right:8px;">
		<MkAvatar :user="user" style="width:32px; height:32px;" link preview/>
	</div>
	<div v-if="userIds.length > limit" style="display: inline-block;">...</div>
</div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import type { UserLite } from 'misskey-js/entities.js';
import { misskeyApi } from '@/scripts/misskey-api.js';

const props = withDefaults(defineProps<{
	userIds: string[];
	limit?: number;
}>(), {
	limit: Infinity,
});

const users = ref<UserLite[]>([]);

onMounted(async () => {
	users.value = await misskeyApi('users/show', {
		userIds: props.userIds.slice(0, props.limit),
	});
});
</script>
