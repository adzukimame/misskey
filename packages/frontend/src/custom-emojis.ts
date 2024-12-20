/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { shallowRef, computed, markRaw, watch } from 'vue';
import type { EmojiSimple } from 'misskey-js/entities.js';
import { misskeyApi, misskeyApiGet } from '@/scripts/misskey-api.js';
import { useStream } from '@/stream.js';
import { get, set } from '@/scripts/idb-proxy.js';

const storageCache = await get('emojis');
export const customEmojis = shallowRef<EmojiSimple[]>(Array.isArray(storageCache) ? storageCache : []);
export const customEmojiCategories = computed<string[]>(() => {
	const categories = new Set<string>();
	for (const emoji of customEmojis.value) {
		if (emoji.category && emoji.category !== 'null') {
			categories.add(emoji.category);
		}
	}
	return markRaw(Array.from(categories));
});

export const customEmojiTags = computed<string[]>(() => {
	const tags = new Set<string>();
	for (const emoji of customEmojis.value) {
		for (const tag of emoji.tags) {
			if (tag !== '') {
				tags.add(tag);
			}
		};
	}
	return markRaw(Array.from(tags).sort());
});
export const customEmojiTagCombinations = computed<Map<string, Set<string>>>(() => {
	const combinations = new Map<string, Set<string>>();
	for (const emoji of customEmojis.value) {
		if (emoji.tags.length < 2) continue;

		for (const tag of emoji.tags) {
			if (tag === '') continue;

			if (combinations.has(tag)) {
				for (const pairedTag of emoji.tags) {
					combinations.get(tag)!.add(pairedTag);
				}
			} else {
				combinations.set(tag, new Set(emoji.tags));
			}
		}
	}
	return markRaw(combinations);
});

export const customEmojisMap = new Map<string, EmojiSimple>();
watch(customEmojis, emojis => {
	customEmojisMap.clear();
	for (const emoji of emojis) {
		customEmojisMap.set(emoji.name, emoji);
	}
}, { immediate: true });

// TODO: ここら辺副作用なのでいい感じにする
const stream = useStream();

stream.on('emojiAdded', emojiData => {
	customEmojis.value = [emojiData.emoji, ...customEmojis.value];
	set('emojis', customEmojis.value);
});

stream.on('emojiUpdated', emojiData => {
	customEmojis.value = customEmojis.value.map(item => emojiData.emojis.find(search => search.name === item.name) ?? item);
	set('emojis', customEmojis.value);
});

stream.on('emojiDeleted', emojiData => {
	customEmojis.value = customEmojis.value.filter(item => !emojiData.emojis.some(search => search.name === item.name));
	set('emojis', customEmojis.value);
});

export async function fetchCustomEmojis(force = false) {
	const now = Date.now();

	let res;
	if (force) {
		res = await misskeyApi('emojis', {});
	} else {
		const lastFetchedAt = await get('lastEmojisFetchedAt');
		if (lastFetchedAt && (now - lastFetchedAt) < 1000 * 60 * 60) return;
		res = await misskeyApiGet('emojis', {});
	}

	customEmojis.value = res.emojis;
	set('emojis', res.emojis);
	set('lastEmojisFetchedAt', now);
}

let cachedTags: string[] | undefined;
export function getCustomEmojiTags() {
	if (cachedTags) return cachedTags;

	const tags = new Set<string>();
	for (const emoji of customEmojis.value) {
		for (const tag of emoji.aliases) {
			tags.add(tag);
		}
	}
	const res = Array.from(tags);
	cachedTags = res;
	return res;
}
