/**
 * @file Server-related URL constants.
 */

export const beta = false;

const dev = import.meta.env.DEV;
// opened from another address (e.g. a tunnel): use the dev server's proxies
const shared =
	dev && !["localhost", "127.0.0.1"].includes(location.hostname);
const wsOrigin = (location.protocol === "https:" ? "wss://" : "ws://") + location.host;

export const linkUrl =
	localStorage.getItem("meower_linkurl") ||
	(dev
		? shared
			? `${wsOrigin}/cloudlink`
			: "ws://127.0.0.1:3000"
		: beta
			? "wss://beta.meower.org/api/v0/cloudlink"
			: "wss://meower-cl.joshatticus.site/v0/cloudlink");
export const apiUrl =
	localStorage.getItem("meower_apiurl") ||
	(dev
		? shared
			? `${location.origin}/api/`
			: "http://127.0.0.1:3001/"
		: beta
			? "https://beta.meower.org/api/"
			: "https://meower-api.joshatticus.site/");
export const uploadsUrl =
	localStorage.getItem("meower_uploadsurl") ||
	(dev
		? shared
			? `${location.origin}/uploads/`
			: "http://127.0.0.1:3002/"
		: "https://uploads.meower.org/");
export const encodeApiURLParams =
	localStorage.getItem("meower_encodeapi") || false;
