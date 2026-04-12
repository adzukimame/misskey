#!/bin/sh

# SPDX-FileCopyrightText: adzuki
# SPDX-License-Identifier: AGPL-3.0-only

set -e

cd /misskey/packages/backend

npm run migrate || {
    echo "Migration failed" >&2
    exit 1
}

npm run check:connect || {
    echo "Redis connectivity check failed" >&2
    exit 1
}

exec node ./built/boot/entry.js
