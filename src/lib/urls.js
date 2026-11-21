/**
 * @file Server-related URL constants.
 */

export const beta = false;

const dev = import.meta.env.DEV;

export const linkUrl =
	localStorage.getItem("meower_linkurl") ||
	(dev
		? "ws://127.0.0.1:3000"
		: beta
			? "wss://beta.meower.org/api/v0/cloudlink"
			: "wss://meower-cl.joshatticus.site/v0/cloudlink");
export const apiUrl =
	localStorage.getItem("meower_apiurl") ||
	(dev
		? "http://127.0.0.1:3001/"
		: beta
			? "https://beta.meower.org/api/"
			: "https://meower-api.joshatticus.site/");
export const uploadsUrl =
	localStorage.getItem("meower_uploadsurl") ||
	(dev ? "http://127.0.0.1:3001/" : "https://uploads.meower.org/");
export const encodeApiURLParams =
	localStorage.getItem("meower_encodeapi") || false;
