ARG NODE_VERSION=20.20.2-alpine

# build assets & compile TypeScript

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS native-builder

RUN apk add --no-cache build-base python3

RUN npm install -g corepack@latest && corepack enable

WORKDIR /misskey

COPY --link ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json", "./"]
COPY --link ["scripts", "./scripts"]
COPY --link ["packages/backend/package.json", "./packages/backend/"]
COPY --link ["packages/frontend/package.json", "./packages/frontend/"]
COPY --link ["packages/sw/package.json", "./packages/sw/"]
COPY --link ["packages/misskey-js/package.json", "./packages/misskey-js/"]

RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
	pnpm install --frozen-lockfile --aggregate-output

ARG NODE_ENV=production

COPY --link . ./

RUN pnpm run build

# build native dependencies for target platform

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION} AS target-builder

RUN apk add --no-cache build-base python3

RUN npm install -g corepack@latest && corepack enable

WORKDIR /misskey

COPY --link ["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json", "./"]
COPY --link ["scripts", "./scripts"]
COPY --link ["packages/backend/package.json", "./packages/backend/"]
COPY --link ["packages/misskey-js/package.json", "./packages/misskey-js/"]

ARG NODE_ENV=production

RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
	pnpm install --frozen-lockfile --prod --aggregate-output

# actual runner

FROM --platform=$TARGETPLATFORM node:${NODE_VERSION} AS runner

ARG UID="13616"
ARG GID="13616"

RUN apk add --no-cache \
	ca-certificates ffmpeg tini jemalloc libc6-compat \
	&& ln -s /usr/lib/libjemalloc.so.2 /usr/local/lib/libjemalloc.so \
	&& addgroup -g "${GID}" misskey \
	&& adduser -D -u "${UID}" -G misskey -h /misskey misskey \
	&& find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /u+s -exec chmod u-s {} \; \
	&& find / -type d -path /sys -prune -o -type d -path /proc -prune -o -type f -perm /g+s -exec chmod g-s {} \;

USER misskey
WORKDIR /misskey

COPY --chown=misskey:misskey --from=native-builder /misskey/built ./built
COPY --chown=misskey:misskey --from=native-builder /misskey/packages/misskey-js/built ./packages/misskey-js/built
COPY --chown=misskey:misskey --from=native-builder /misskey/packages/backend/built ./packages/backend/built

COPY --chown=misskey:misskey --from=target-builder /misskey/node_modules ./node_modules
COPY --chown=misskey:misskey --from=target-builder /misskey/packages/backend/node_modules ./packages/backend/node_modules
COPY --chown=misskey:misskey --from=target-builder /misskey/packages/misskey-js/node_modules ./packages/misskey-js/node_modules

COPY --chown=misskey:misskey . ./

RUN chmod +x /misskey/migrate-and-start.sh

ENV LD_PRELOAD=/usr/local/lib/libjemalloc.so
ENV NODE_ENV=production
HEALTHCHECK --start-period=300s --start-interval=5s --interval=20s --retries=5 CMD ["/bin/sh", "/misskey/healthcheck.sh"]
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/misskey/migrate-and-start.sh"]
