export const notificationTypes = ['note', 'follow', 'mention', 'reply', 'renote', 'quote', 'reaction', 'pollEnded', 'receiveFollowRequest', 'followRequestAccepted', 'app', 'roleAssigned'] as const;

export const noteVisibilities = ['public', 'home', 'followers', 'specified'] as const;

export const mutedNoteReasons = ['word', 'manual', 'spam', 'other'] as const;

export const followingVisibilities = ['public', 'followers', 'private'] as const;

export const followersVisibilities = ['public', 'followers', 'private'] as const;

export const permissions = [
	'read:account',
	'write:account',
	'read:blocks',
	'write:blocks',
	'read:drive',
	'write:drive',
	'read:favorites',
	'write:favorites',
	'read:following',
	'write:following',
	'read:messaging',
	'write:messaging',
	'read:mutes',
	'write:mutes',
	'write:notes',
	'read:notifications',
	'write:notifications',
	'read:reactions',
	'write:reactions',
	'write:votes',
	'read:pages',
	'write:pages',
	'write:page-likes',
	'read:page-likes',
	'read:user-groups',
	'write:user-groups',
	'read:channels',
	'write:channels',
	'read:flash',
	'write:flash',
	'read:flash-likes',
	'write:flash-likes',
	'write:admin:delete-account',
	'write:admin:delete-all-files-of-a-user',
	'read:admin:index-stats',
	'read:admin:table-stats',
	'read:admin:user-ips',
	'read:admin:meta',
	'write:admin:reset-password',
	'write:admin:send-email',
	'read:admin:server-info',
	'read:admin:show-user',
	'write:admin:suspend-user',
	'write:admin:unset-user-avatar',
	'write:admin:unset-user-banner',
	'write:admin:unsuspend-user',
	'write:admin:meta',
	'write:admin:user-note',
	'write:admin:roles',
	'read:admin:roles',
	'write:admin:relays',
	'read:admin:relays',
	'write:admin:invite-codes',
	'read:admin:invite-codes',
	'write:admin:federation',
	'write:admin:account',
	'read:admin:account',
	'write:admin:emoji',
	'read:admin:emoji',
	'write:admin:queue',
	'read:admin:queue',
	'write:admin:promo',
	'write:admin:drive',
	'read:admin:drive',
	'write:admin:ad',
	'read:admin:ad',
	'write:invite-codes',
	'read:invite-codes',
	'write:clip-favorite',
	'read:clip-favorite',
	'read:federation',
] as const;
