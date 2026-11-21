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
