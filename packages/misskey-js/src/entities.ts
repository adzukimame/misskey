import {
	EmojiDetailed,
	MeDetailed,
	Note,
	Role,
	RolePolicies,
	User,
	UserDetailedNotMe,
} from './autogen/models.js';

export * from './autogen/entities.js';
export * from './autogen/models.js';

export type ID = string;
export type DateString = string;

type NonNullableRecord<T> = {
	[P in keyof T]-?: NonNullable<T[P]>;
};
type AllNullRecord<T> = {
	[P in keyof T]: null;
};

export type PureRenote =
	Omit<Note, 'renote' | 'renoteId' | 'reply' | 'replyId' | 'text' | 'cw' | 'files' | 'fileIds' | 'poll'>
	& AllNullRecord<Pick<Note, 'reply' | 'replyId' | 'text' | 'cw' | 'poll'>>
	& { files: []; fileIds: []; }
	& NonNullableRecord<Pick<Note, 'renote' | 'renoteId'>>;

export type ServerStats = {
	cpu: number;
	mem: number;
};

export type ServerStatsLog = ServerStats[];

export type QueueStats = {
	deliver: {
		activeSincePrevTick: number;
		active: number;
		waiting: number;
		delayed: number;
	};
	inbox: {
		activeSincePrevTick: number;
		active: number;
		waiting: number;
		delayed: number;
	};
};

export type QueueStatsLog = QueueStats[];

export type EmojiAdded = {
	emoji: EmojiDetailed
};

export type EmojiUpdated = {
	emojis: EmojiDetailed[]
};

export type EmojiDeleted = {
	emojis: EmojiDetailed[]
};

export type SignupRequest = {
	username: string;
	password: string;
	host?: string;
	invitationCode?: string;
	emailAddress?: string;
	'hcaptcha-response'?: string | null;
	'g-recaptcha-response'?: string | null;
	'turnstile-response'?: string | null;
}

export type SignupResponse = MeDetailed & {
	token: string;
}

export type SignupPendingRequest = {
	code: string;
};

export type SignupPendingResponse = {
	id: User['id'],
	i: string,
};

export type SigninRequest = {
	username: string;
	password: string;
	token?: string;
};

export type SigninResponse = {
	id: User['id'],
	i: string,
};

type Values<T extends Record<PropertyKey, unknown>> = T[keyof T];

export type PartialRolePolicyOverride = Partial<{[k in keyof RolePolicies]: Omit<Values<Role['policies']>, 'value'> & { value: RolePolicies[k] }}>;
