// Open Graph embeds. Link previews (Discord, Twitter, iMessage...) don't run
// JavaScript, so these Cloudflare Pages Functions add the meta tags to the
// page on the server. Needs the API_URL and UPLOADS_URL environment variables
// (with a trailing slash) on the Pages project; without them pages are served as usual.

const esc = s =>
	String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

export const trunc = (s, n) => {
	s = String(s || "").replace(/\s+/g, " ").trim();
	return s.length > n ? s.slice(0, n - 1) + "..." : s;
};

export async function getJson(env, path) {
	if (!env.API_URL) return null;
	const resp = await fetch(env.API_URL + path, {
		headers: {Accept: "application/json"},
		cf: {cacheTtl: 60, cacheEverything: true},
	});
	return resp.ok ? await resp.json() : null;
}

export function uploadUrl(env, bucket, id, filename) {
	if (!env.UPLOADS_URL || !id) return null;
	return `${env.UPLOADS_URL}${bucket}/${id}${filename ? "/" + encodeURIComponent(filename) : ""}`;
}

/** Serves the normal page with Open Graph tags added: {title, description, image, large} */
export async function withMeta(context, meta) {
	const url = new URL(context.request.url);
	const image = meta.image || `${url.origin}/manifest/android-chrome-512x512.png`;
	const tags = [
		["og:site_name", "Meower"],
		["og:type", "website"],
		["og:url", url.href],
		["og:title", meta.title],
		["og:description", meta.description],
		["og:image", image],
		["twitter:card", meta.large ? "summary_large_image" : "summary"],
		["twitter:title", meta.title],
		["twitter:description", meta.description],
		["twitter:image", image],
	]
		.map(([k, v]) => `<meta property="${k}" content="${esc(v)}" />`)
		.join("\n");

	const response = await context.next();
	const rewritten = new HTMLRewriter()
		.on("title", {
			element(el) {
				el.setInnerContent(meta.title);
			},
		})
		.on("head", {
			element(el) {
				el.append(tags, {html: true});
			},
		})
		.transform(response);
	const headers = new Headers(rewritten.headers);
	headers.set("Cache-Control", "public, max-age=60");
	return new Response(rewritten.body, {status: 200, headers});
}
