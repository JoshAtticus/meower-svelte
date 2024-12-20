/**
 * @file Server-related URL constants.
 */

export const beta = false;

export const linkUrl =
	localStorage.getItem("meower_linkurl") ||
	(beta
		? "wss://beta.meower.org/api/v0/cloudlink"
		: "wss://meower-cl.joshatticus.site/v0/cloudlink");
export const apiUrl =
	localStorage.getItem("meower_apiurl") ||
	(beta ? "https://beta.meower.org/api/" : "https://meower-api.joshatticus.site/");
export const uploadsUrl = localStorage.getItem("meower_uploadsurl") || "https://uploads.meower.org/";
export const encodeApiURLParams =
	localStorage.getItem("meower_encodeapi") || false;
