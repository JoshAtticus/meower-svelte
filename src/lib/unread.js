/**
 * Client-only unread indicators for chats.
 *
 * `chatReads` persists {chatId: unixSeconds} in localStorage. Chats with no
 * entry are treated as read since `chatReadsSince` (set on first run), so
 * nothing is unread the first time someone uses this.
 */

import {writable} from "svelte/store";

const now = () => Math.floor(Date.now() / 1000);

let initialReads = {};
try {
	initialReads = JSON.parse(localStorage.meower_chat_reads || "{}") || {};
} catch {
	initialReads = {};
}

let since = parseInt(localStorage.meower_chat_reads_since);
if (!since) {
	since = now();
	localStorage.meower_chat_reads_since = since;
}
export const chatReadsSince = since;

export const chatReads = writable(initialReads);
chatReads.subscribe(reads => {
	localStorage.meower_chat_reads = JSON.stringify(reads);
});

// {chatId: unixSeconds of the latest message that mentioned you}
let initialMentions = {};
try {
	initialMentions = JSON.parse(localStorage.meower_chat_mentions || "{}") || {};
} catch {
	initialMentions = {};
}
export const chatMentions = writable(initialMentions);
chatMentions.subscribe(m => {
	localStorage.meower_chat_mentions = JSON.stringify(m);
});

export function recordMention(chatId, ts = now()) {
	chatMentions.update(m => {
		m[chatId] = Math.max(m[chatId] || 0, ts);
		return m;
	});
}

/** Whether a message mentions the user (@name, not part of a longer name). */
export function mentionsUser(content, name) {
	if (!content || !name) return false;
	// usernames only contain letters, digits, _ and -, so no escaping is needed
	const esc = name;
	return new RegExp(`(^|[^A-Za-z0-9_-])@${esc}(?![A-Za-z0-9_-])`, "i").test(content);
}

export function markChatRead(chatId, ts = now()) {
	chatReads.update(reads => {
		reads[chatId] = Math.max(reads[chatId] || 0, ts);
		return reads;
	});
}

export function isChatUnread(chat, reads) {
	if (!chat || chat._id === "livechat" || !chat.last_active) return false;
	return chat.last_active > (reads[chat._id] ?? chatReadsSince);
}

/** Unread mentions of you in a chat (newer than the last time it was read). */
export function isChatMentioned(chat, reads, mentions) {
	if (!chat || !mentions[chat._id]) return false;
	return mentions[chat._id] > (reads[chat._id] ?? chatReadsSince);
}
