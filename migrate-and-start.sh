#!/bin/bash

# SPDX-FileCopyrightText: adzuki
# SPDX-License-Identifier: AGPL-3.0-only

set -e

cd /misskey/packages/backend

pnpm migrate || {
    echo "Migration failed" >&2
    exit 1
}

pnpm check:connect || {
    echo "Redis connectivity check failed" >&2
    exit 1
}

exec node ./built/boot/entry.js
