import {writable} from "svelte/store";
import {apiUrl} from "./urls.js";

export const profileCache = writable({});

let _profileCache;
profileCache.subscribe(v => (_profileCache = v));

const SPECIAL_USERS = {
	Notification: 101,
	Announcement: 102,
	Server: -4,
};

function getCache(username, ignoreSpecialUsers) {
	if (!_profileCache[username]) return undefined;
	if (!ignoreSpecialUsers && username in SPECIAL_USERS) {
		return {
			..._profileCache[username],
			pfp_data: SPECIAL_USERS[username],
		};
	}
	return _profileCache[username];
}

const inFlight = {};

export default async function loadProfile(username, ignoreSpecialUsers) {
	if (
		["Server", "Deleted", "Notification", "Announcement"].includes(username)
	) {
		return {
			error: false,
			pfp_data: -2,
			temporary: false,
		};
	}

	if (_profileCache[username] && !_profileCache[username].temporary) {
		return getCache(username, ignoreSpecialUsers);
	}

	// Share one request between concurrent callers instead of handing the
	// placeholder back as if it were the loaded profile
	if (!inFlight[username]) {
		_profileCache[username] = {
			pfp_data: -1,
			temporary: true,
		};
		profileCache.set(_profileCache);

		inFlight[username] = (async () => {
			try {
				let lastError;
				for (let attempt = 0; attempt < 3; attempt++) {
					try {
						const resp = await fetch(`${apiUrl}users/${username}`);
						if (!resp.ok) {
							// a missing user won't appear by retrying
							if (resp.status === 404) attempt = 2;
							throw new Error("response code not OK; code " + resp.status);
						}
						_profileCache[username] = await resp.json();
						profileCache.set(_profileCache);
						return;
					} catch (e) {
						lastError = e;
						if (attempt < 2)
							await new Promise(r => setTimeout(r, 400 * 2 ** attempt));
					}
				}
				throw lastError;
			} catch (e) {
				console.log(e);
				_profileCache[username] = {
					error: true,
					pfp_data: -2,
					temporary: true,
				};
				profileCache.set(_profileCache);
				throw e;
			} finally {
				delete inFlight[username];
			}
		})();
	}
	await inFlight[username];
	return getCache(username, ignoreSpecialUsers);
}
