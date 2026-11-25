import {get} from "svelte/store";
import {user} from "./stores.js";
import {mentionsUser} from "./unread.js";

const audio = new Audio("../src/assets/menu_notify.wav");

export function playNotification() {
	// Mix with other audio instead of taking over (iOS would otherwise pause
	// the user's music for every message sound)
	if (navigator.audioSession) {
		try {
			navigator.audioSession.type = "ambient";
		} catch (e) {}
	}
	audio.play();
}

/**
 * Plays the notification sound for a live post, honouring sound effects being
 * on and the notification scope (this chat's setting, else the global one).
 */
export function notifyForPost(post) {
	const me = get(user);
	if (me.sfx !== true || post.u === me.name) return;
	const scope = (me.chat_sfx || {})[post.post_origin] || me.sfx_scope || "all";
	if (scope === "mentions") {
		const repliedToMe = (post.reply_to || []).some(p => p && p.u === me.name);
		if (!repliedToMe && !mentionsUser(post.p, me.name)) return;
	}
	playNotification();
}
