<template>
<pre :class="['shiki', ...(tokensResult.themeName?.split(' ') ?? [])]" :style="tokensResult.rootStyle" tabindex="0"><code><span v-for="line in tokensResult.tokens" class="line"><span v-for="token in line" :style="token.htmlStyle">{{ token.content }}</span>{{ '\n' }}</span></code></pre>
</template>

<script lang="ts" setup>
import type { TokensResult } from 'shiki/core';

defineProps<{
	tokensResult: TokensResult;
}>();
</script>
