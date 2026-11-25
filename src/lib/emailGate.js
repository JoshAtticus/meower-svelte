// Email verification helpers: refresh state, and show a popup whenever the
// server refuses an action because the account's email isn't verified.
import {get} from "svelte/store";
import {authHeader, user} from "./stores.js";
import {apiUrl} from "./urls.js";
import * as modals from "./modals.js";
import EmailRequiredModal from "./modals/EmailRequired.svelte";

export async function refreshEmailState() {
	try {
		const resp = await fetch(`${apiUrl}me/email/`, {headers: get(authHeader)});
		if (!resp.ok) return;
		const json = await resp.json();
		delete json.error;
		user.update(u => ({...u, email_state: json}));
	} catch {}
}

let lastShown = 0;
const nativeFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
	const resp = await nativeFetch(...args);
	if (resp.status === 403) {
		resp
			.clone()
			.json()
			.then(json => {
				if (json && json.type === "emailNotVerified") {
					user.update(u => ({
						...u,
						email_state: {...(u.email_state || {}), verified: false, required: true},
					}));
					if (Date.now() - lastShown > 4000) {
						lastShown = Date.now();
						modals.showModal(EmailRequiredModal);
					}
				}
			})
			.catch(() => {});
	}
	return resp;
};

export function openEmailSettings() {
	history.pushState({}, "", "/settings");
	window.dispatchEvent(new PopStateEvent("popstate"));
}
