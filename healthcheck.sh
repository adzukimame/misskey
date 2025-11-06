#!/bin/bash

# SPDX-FileCopyrightText: syuilo and misskey-project
# SPDX-License-Identifier: AGPL-3.0-only

if [ -z "$PORT" ]; then
	PORT=$(grep '^port:' /misskey/.config/default.yml | awk 'NR==1{print $2; exit}')
fi

curl -Sfso/dev/null "http://localhost:${PORT}/healthz"
