// Shared post content rendering: markdown + mentions + links + emojis.
// Extracted verbatim from Post.svelte so replies render identically.
import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/common";
import "highlight.js/styles/github-dark.css";
import twemoji from "twemoji";
import {goto} from "@roxi/routify";

import ConfirmHyperlinkModal from "./modals/ConfirmHyperlink.svelte";
import * as modals from "./modals.js";

import {IMAGE_HOST_WHITELIST} from "./hostWhitelist.js";
import {uploadsUrl} from "./urls.js";
import {thumbHashToDataURL} from "thumbhash";
import {parseOptions} from "./emoji.js";

const placeholderCache = new Map();
// base64 ThumbHash -> data URL of its blurred preview (null if invalid)
export function placeholderUrl(b64) {
	if (!b64) return null;
	if (!placeholderCache.has(b64)) {
		try {
			placeholderCache.set(
				b64,
				thumbHashToDataURL(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))
			);
		} catch {
			placeholderCache.set(b64, null);
		}
	}
	return placeholderCache.get(b64);
}

export function confirmLink(link) {
	link = atob(link); // we now base64 encode the link to prevent XSS
	if (!link.startsWith("https:") && !link.startsWith("http:") && !link.startsWith("/")) {
		link = "https://" + link;
	}
	let url = new URL(link, location.href);
	if (url.host === location.host) {
		$goto(url.pathname);
	} else {
		modals.showModal(ConfirmHyperlinkModal, {link});
	}
	return false;
}
// @ts-ignore
window.confirmLink = confirmLink;

// Takes already-escaped text from a markdown text token, never rendered
// HTML, so emoji markup can't land inside an attribute value.
// Custom emojis are written <:EMOJI_ID>; the server sends their details
// with the post (post.emojis), so they work outside their own chat too.
function renderTextEmojis(escapedText, emotes, postEmojis = []) {
	escapedText = escapedText.replaceAll(
		/&lt;:([a-zA-Z0-9]{24})&gt;/g,
		(match, id) => {
			const known =
				postEmojis.find(e => (e._id || e) === id) ||
				((emotes && emotes.emojis) || []).find(e => e._id === id);
			const name = known && known.name ? `:${known.name.replace(/[^a-zA-Z0-9_-]/g, "")}:` : "emoji";
			const placeholder = placeholderUrl(known && known.thumbhash);
			const style = placeholder
				? ` style="background:url(${placeholder}) center/cover;animation:none"`
				: "";
			return `<img class="custom-emoji" src="${uploadsUrl}emojis/${id}" alt="${name}" title="${name}"${style} decoding="async" onload="this.dataset.l=1;this.style.background='none'">`;
		}
	);

	return twemoji.parse(escapedText, parseOptions);
}

export function addFancyElements(content, emotes, postEmojis = []) {
	// markdown (which has HTML escaping built-in)
	try {
		const md = new MarkdownIt("default", {
			breaks: true,
			linkify: true,
			typographer: true,
			highlight: function (str, lang) {
				if (lang && hljs.getLanguage(lang)) {
					try {
						return (
							'<pre><code class="hljs">' +
							hljs.highlight(str, {
								language: lang,
								ignoreIllegals: true,
							}).value +
							"</code></pre>"
						);
					} catch {}
				}
				return ""; // use default escaping
			},
		});
		md.linkify.add("@", {
			validate: function (text, pos) {
				var tail = text.slice(pos);
				return tail.match(/[a-zA-Z0-9-_]{0,20}/gs)[0].length;
			},
			normalize: function (match) {
				match.url =
					window.location.host +
					"/users/" +
					match.url.replace(/^@/, "");
			},
		});
		const tokens = md.parse(
			content
				.replaceAll(/\[([^\]]+?): (https:\/\/[^\]]+?)\]/gs, "")
				.replaceAll(/\*\*\*\*/gs, "\*\*\*\*"),
			{}
		);
		for (const token of tokens) {
			if (token.children) {
				for (const childToken of token.children) {
					if (childToken.type === "text") {
						childToken.type = "html_inline";
						childToken.content = renderTextEmojis(
							md.utils.escapeHtml(childToken.content),
							emotes,
							postEmojis
						);
					}
					if (childToken.type === "image") {
						const srcPos = childToken.attrs.findIndex(
							attr => attr[0] === "src"
						);
						if (
							!IMAGE_HOST_WHITELIST.some(o =>
								childToken.attrs[srcPos][1]
									.toLowerCase()
									.startsWith(o.toLowerCase())
							)
						) {
							childToken.attrs[srcPos][1] = "about:blank";
							console.log(childToken);
						}
					}
					if (childToken.type === "link_open") {
						const href = childToken.attrs.find(
							attr => attr[0] === "href"
						)[1];
						const b64href = btoa(href);
						childToken.attrs.push([
							"onclick",
							`return confirmLink('${b64href}')`,
						]);
					}
				}
			}
		}
		content = md.renderer.render(tokens, md.options);

		// add quote containers to blockquotes (although, quotes are currently broken)
		content = content.replaceAll(
			/<blockquote>(.+?)<\/blockquote>/gms,
			'<div class="quote-container"><blockquote>$1</blockquote></div>'
		);
	} catch (e) {
		// this is to stop any possible XSS attacks by bypassing the markdown lib
		// which is responsible for escaping HTML
		return `Failed rendering post: ${e}`;
	}

	return content;
}
