<!--
	Type-ahead for custom emoji and stickers in a composer (a richInput element):
	  :na     suggests up to 5 emoji; click or Tab/Enter adds one
	  :name:  becomes the emoji if it exists
	  [na     suggests up to 5 stickers (only when `onSticker` is given)
	  [name]  sends the sticker if it exists
-->
<script>
	import {onDestroy} from "svelte";
	import {get} from "svelte/store";
	import {chatEmotes, loadEmotes} from "./emotes.js";
	import {chats} from "./stores.js";
	import {uploadsUrl} from "./urls.js";

	export let input = null; // the richInput element
	export let chatId = null; // chat whose emotes are preferred
	export let onSticker = null; // (id) => void; omit to disable stickers

	const EMOJI_OPEN = /(?:^|\s):([A-Za-z0-9_-]{1,32})$/;
	const EMOJI_CLOSED = /(?:^|\s):([A-Za-z0-9_-]{1,32}):$/;
	const STICKER_OPEN = /(?:^|\s)\[([A-Za-z0-9_-]{1,32})$/;
	const STICKER_CLOSED = /(?:^|\s)\[([A-Za-z0-9_-]{1,32})\]$/;

	let items = [];
	let kind = "emoji";
	let active = 0;
	let query = "";
	let pos = {left: 0, top: null, bottom: null};
	let loadedAll = false;

	function ensureLoaded() {
		if (chatId) loadEmotes(chatId);
		if (loadedAll) return;
		loadedAll = true;
		get(chats)
			.filter(c => c.type === 0)
			.slice(0, 40)
			.forEach(c => loadEmotes(c._id));
	}

	// the current chat's emotes first, then everything else that has been loaded
	function candidates(type) {
		const cache = get(chatEmotes);
		const order = [chatId, ...Object.keys(cache)].filter(
			(id, i, all) => id && cache[id] && all.indexOf(id) === i
		);
		const seen = new Set();
		const out = [];
		for (const id of order)
			for (const e of cache[id][type] || [])
				if (!seen.has(e._id)) {
					seen.add(e._id);
					out.push(e);
				}
		return out;
	}

	function search(type, q) {
		q = q.toLowerCase();
		const all = candidates(type);
		return [
			...all.filter(e => e.name.toLowerCase().startsWith(q)),
			...all.filter(
				e =>
					!e.name.toLowerCase().startsWith(q) &&
					e.name.toLowerCase().includes(q)
			),
		].slice(0, 5);
	}

	function close() {
		items = [];
	}

	function place() {
		// below the composer, unless there isn't room for the list
		const r = input.getBoundingClientRect();
		const needed = items.length * 52 + 24;
		const left = Math.max(8, r.left);
		pos =
			window.innerHeight - r.bottom >= needed || r.top < needed
				? {left, top: r.bottom + 6, bottom: null}
				: {left, top: null, bottom: window.innerHeight - r.top + 6};
	}

	function check() {
		if (!input || !input.tokenBeforeCaret) return;
		const text = input.tokenBeforeCaret();
		let m;

		if ((m = EMOJI_CLOSED.exec(text))) {
			const found = candidates("emojis").find(
				e => e.name.toLowerCase() === m[1].toLowerCase()
			);
			if (found) {
				input.replaceBeforeCaret(m[1].length + 2, `<:${found._id}>`);
				close();
				return;
			}
		}
		if (onSticker && (m = STICKER_CLOSED.exec(text))) {
			const found = candidates("stickers").find(
				e => e.name.toLowerCase() === m[1].toLowerCase()
			);
			if (found) {
				input.replaceBeforeCaret(m[1].length + 2, "");
				close();
				onSticker(found._id);
				return;
			}
		}

		if ((m = EMOJI_OPEN.exec(text))) {
			kind = "emoji";
		} else if (onSticker && (m = STICKER_OPEN.exec(text))) {
			kind = "sticker";
		} else {
			close();
			return;
		}
		ensureLoaded();
		query = m[1];
		items = search(kind === "emoji" ? "emojis" : "stickers", query);
		active = 0;
		if (items.length) place();
	}

	function accept(item) {
		if (!item) return;
		if (kind === "emoji") {
			input.replaceBeforeCaret(query.length + 1, `<:${item._id}>`);
		} else {
			input.replaceBeforeCaret(query.length + 1, "");
			onSticker && onSticker(item._id);
		}
		close();
	}

	function onKey(e) {
		if (!items.length) return;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
		} else if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			e.stopImmediatePropagation();
			accept(items[active]);
		} else if (e.key === "Escape") {
			e.preventDefault();
			close();
		}
	}

	// re-search when the emotes finish loading
	$: if ($chatEmotes && items.length === 0 && input && query) {
		// only while a token is still open
		if (input.tokenBeforeCaret && (EMOJI_OPEN.test(input.tokenBeforeCaret()) || STICKER_OPEN.test(input.tokenBeforeCaret()))) check();
	}

	let attached = null;
	let cleanup = null;
	function attach(node) {
		const onBlur = () => setTimeout(close, 150);
		node.addEventListener("input", check);
		node.addEventListener("keydown", onKey, true);
		node.addEventListener("blur", onBlur);
		return () => {
			node.removeEventListener("input", check);
			node.removeEventListener("keydown", onKey, true);
			node.removeEventListener("blur", onBlur);
		};
	}
	$: if (input !== attached) {
		if (cleanup) cleanup();
		attached = input;
		cleanup = input ? attach(input) : null;
	}
	onDestroy(() => cleanup && cleanup());
</script>

{#if items.length}
	<div class="suggestions" style:left="{pos.left}px" style:top={pos.top !== null ? `${pos.top}px` : null} style:bottom={pos.bottom !== null ? `${pos.bottom}px` : null} role="listbox">
		{#each items as item, i (item._id)}
			<button
				type="button"
				role="option"
				aria-selected={i === active}
				class:active={i === active}
				on:mousedown|preventDefault={() => accept(item)}
				on:mouseenter={() => (active = i)}
			>
				<img
					class:sticker={kind === "sticker"}
					src="{uploadsUrl}{kind === 'emoji' ? 'emojis' : 'stickers'}/{item._id}"
					alt=""
					draggable="false"
				/>
				<span>{kind === "emoji" ? `:${item.name}:` : `[${item.name}]`}</span>
			</button>
		{/each}
	</div>
{/if}

<style>
	.suggestions {
		position: fixed;
		z-index: 10005;
		display: flex;
		flex-direction: column;
		min-width: 12em;
		max-width: min(24em, calc(100vw - 16px));
		padding: 4px;
		background: var(--background);
		color: var(--foreground);
		border: 2px solid var(--orange);
		border-radius: 0.8em;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
	}
	button {
		display: flex;
		align-items: center;
		gap: 0.6em;
		margin: 0;
		padding: 0.3em 0.6em;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	button.active {
		background: rgba(128, 128, 128, 0.22);
	}
	img {
		width: 1.8em;
		height: 1.8em;
		object-fit: contain;
		flex-shrink: 0;
	}
	img.sticker {
		width: 2.6em;
		height: 2.6em;
	}
	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
