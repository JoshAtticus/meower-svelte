import {writable, get} from "svelte/store";
import {apiUrl} from "./urls.js";
import {authHeader} from "./stores.js";

/**
 * Cache of chat emotes, keyed by chat id.
 * {chatId: {emojis: [{_id, name, animated}], stickers: [...]}}
 */
export const chatEmotes = writable({});

const loading = {};

export async function loadEmotes(chatId) {
	if (!chatId || ["livechat", "inbox"].includes(chatId) || loading[chatId])
		return;
	if (get(chatEmotes)[chatId]) return;
	loading[chatId] = true;
	try {
		const headers = get(authHeader);
		const [emojis, stickers] = await Promise.all([
			fetch(`${apiUrl}chats/${chatId}/emojis`, {headers})
				.then(r => (r.ok ? r.json() : {}))
				.then(j => j.autoget || []),
			fetch(`${apiUrl}chats/${chatId}/stickers`, {headers})
				.then(r => (r.ok ? r.json() : {}))
				.then(j => j.autoget || []),
		]);
		chatEmotes.update(cache => ({...cache, [chatId]: {emojis, stickers}}));
	} catch (e) {
		console.log("Failed to load emotes:", e);
	} finally {
		delete loading[chatId];
	}
}

export function refreshEmotes(chatId) {
	chatEmotes.update(cache => {
		delete cache[chatId];
		return cache;
	});
	return loadEmotes(chatId);
}

/**
 * Recently used emotes, persisted to localStorage.
 * Entries: {t: "u", v: "😀"} | {t: "e"|"s", id, name, chatId}
 */
export const recentEmotes = writable(
	JSON.parse(localStorage.getItem("meower_recent_emotes") || "[]")
);

export function recordEmote(entry) {
	recentEmotes.update(recent => {
		const key = e => `${e.t}:${e.v || e.id}`;
		recent = [
			entry,
			...recent.filter(e => key(e) !== key(entry)),
		].slice(0, 24);
		localStorage.setItem(
			"meower_recent_emotes",
			JSON.stringify(recent)
		);
		return recent;
	});
}
