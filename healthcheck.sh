#!/bin/sh

# SPDX-FileCopyrightText: syuilo and misskey-project
# SPDX-License-Identifier: AGPL-3.0-only

if [ -z "$PORT" ]; then
	PORT=$(grep '^port:' /misskey/.config/default.yml | awk 'NR==1{print $2; exit}')
fi

wget -qO/dev/null "http://127.0.0.1:${PORT}/healthz"
