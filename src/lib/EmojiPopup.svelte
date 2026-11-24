<!-- Discord-style emote picker popup (not a modal) -->
<script>
	import ChatIcon from "./ChatIcon.svelte";

	import {chats} from "./stores.js";
	import {
		chatEmotes,
		loadEmotes,
		recentEmotes,
		recordEmote,
		forgetRecent,
	} from "./emotes.js";
	import {uploadsUrl} from "./urls.js";

	import {createEventDispatcher, onMount} from "svelte";
	import emojilib from "emojilib";
	import {mobile} from "./responsiveness.js";
	import {emojiCharUrl, emojiPlaceholderStyle} from "./emoji.js";
	import {placeholderUrl} from "./postFormat.js";
	import {portal} from "./portal.js";
	import {fly, fade} from "svelte/transition";

	// Mobile sheet: slide out on close, and swipe down (from the top bar) to close
	const sheetOut = node =>
		$mobile ? fly(node, {y: 500, duration: 220}) : {duration: 0};
	const backdropOut = node =>
		$mobile ? fade(node, {duration: 200}) : {duration: 0};
	let dragStart = null;
	let dragY = 0;
	function dragBegin(e) {
		if (!$mobile) return;
		dragStart = e.touches[0].clientY;
		dragY = 0;
	}
	function dragMove(e) {
		if (dragStart === null) return;
		dragY = Math.max(0, e.touches[0].clientY - dragStart);
	}
	function dragEnd() {
		if (dragStart === null) return;
		const close = dragY > 100;
		dragStart = null;
		dragY = 0;
		if (close) onClose && onClose();
	}

	export let chatId;
	export let onEmoji; // (name)
	export let onUnicode; // (char)
	export let onSticker; // (id)
	export let onClose; // () - called after a pick unless shift is held
	// Optional fixed screen position {top|bottom, right} in px, for use inside
	// containers that clip overflow (e.g. posts)
	export let anchor = null;

	// keep an anchored popup fully inside the window
	let popupEl;
	function keepOnScreen() {
		if (!popupEl || $mobile) return;
		popupEl.style.translate = "";
		let r = popupEl.getBoundingClientRect();
		const dx = r.left < 8 ? 8 - r.left : r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : 0;
		const dy = !anchor ? (r.top < 8 ? 8 - r.top : r.bottom > window.innerHeight - 8 ? window.innerHeight - 8 - r.bottom : 0) : 0;
		if (dx || dy) popupEl.style.translate = `${dx}px ${dy}px`;
		if (!anchor) return;
		r = popupEl.getBoundingClientRect();
		if (r.top < 8) {
			popupEl.style.top = "8px";
			popupEl.style.bottom = "auto";
			popupEl.style.maxHeight = window.innerHeight - 16 + "px";
		} else if (r.bottom > window.innerHeight - 8) {
			popupEl.style.top = "auto";
			popupEl.style.bottom = "8px";
			popupEl.style.maxHeight = window.innerHeight - 16 + "px";
		}
	}
	onMount(() => {
		requestAnimationFrame(keepOnScreen);
		window.addEventListener("resize", keepOnScreen);
		return () => window.removeEventListener("resize", keepOnScreen);
	});

	function done(event) {
		if (!(event && event.shiftKey) && onClose) onClose();
	}

	const dispatch = createEventDispatcher();

	const ALL_EMOJI = Object.entries(emojilib).map(([char, keywords]) => ({
		char,
		keywords,
	}));

	let query = "";
	// section: "recent" | "unicode" | `chat:${id}`
	let section =
		chatId && chatId !== "livechat" ? `chat:${chatId}` : "unicode";
	if (section.startsWith("chat:")) loadEmotes(chatId);

	// Fall back to the emoji tab when this chat has nothing to show, unless
	// the user chose the tab themselves
	let userPicked = false;
	$: if (
		!userPicked &&
		section === `chat:${chatId}` &&
		$chatEmotes[chatId] &&
		!$chatEmotes[chatId].emojis.length &&
		(!onSticker || !$chatEmotes[chatId].stickers.length)
	)
		section = "unicode";

	let visibleCount = 120;
	let gridEl;

	$: {
		// reset scroll window when section or query changes
		query, section;
		visibleCount = 120;
	}

	$: filtered = ALL_EMOJI.filter(
		e => !query || e.keywords.some(k => k.includes(query.toLowerCase()))
	);

	$: filteredRecents = $recentEmotes.filter(
		e => !query || (e.name || e.v || "").toLowerCase().includes(query.toLowerCase())
	);
	$: recentEmojis = filteredRecents.filter(e => e.t !== "s");
	$: recentStickers = onSticker
		? filteredRecents.filter(e => e.t === "s")
		: [];

	$: sectionChat = section.startsWith("chat:")
		? $chats.find(c => c._id === section.slice(5))
		: null;
	$: sectionEmotes =
		sectionChat && $chatEmotes[sectionChat._id]
			? $chatEmotes[sectionChat._id]
			: {emojis: [], stickers: []};
	$: filteredEmojis = sectionEmotes.emojis.filter(
		e => !query || e.name.toLowerCase().includes(query.toLowerCase())
	);
	$: filteredStickers = onSticker
		? sectionEmotes.stickers.filter(
				e =>
					!query ||
					e.name.toLowerCase().includes(query.toLowerCase())
			)
		: [];

	function selectChat(c) {
		userPicked = true;
		section = `chat:${c._id}`;
		loadEmotes(c._id);
	}

	function pickUnicode(e, ev) {
		recordEmote({t: "u", v: e.char, name: e.keywords[0] || ""});
		onUnicode && onUnicode(e.char);
		done(ev);
	}
	function pickEmoji(e, chatId, ev) {
		recordEmote({t: "e", id: e._id, name: e.name, chatId});
		onEmoji && onEmoji(e.name, e);
		done(ev);
	}
	function pickSticker(e, chatId, ev) {
		recordEmote({t: "s", id: e._id, name: e.name, chatId});
		onSticker && onSticker(e._id);
		done(ev);
	}
	function pickRecent(e, ev) {
		if (e.t === "u") {
			onUnicode && onUnicode(e.v);
		} else if (e.t === "e") {
			onEmoji && onEmoji(e.name, {_id: e.id, name: e.name});
		} else {
			onSticker && onSticker(e.id);
		}
		recordEmote(e);
		done(ev);
	}

	function onScroll() {
		if (
			gridEl &&
			gridEl.scrollTop + gridEl.clientHeight >=
				gridEl.scrollHeight - 200
		) {
			visibleCount += 120;
		}
	}
</script>

{#if $mobile}
	<div
		class="sheet-backdrop"
		use:portal
		out:backdropOut
		on:click={() => onClose && onClose()}
	/>
{/if}
<div
	bind:this={popupEl}
	class="emoji-popup"
	class:anchored={!!anchor}
	class:sheet={$mobile}
	use:portal={$mobile}
	out:sheetOut
	style:transform={$mobile && dragY ? `translateY(${dragY}px)` : null}
	on:touchstart={e => {
		if (e.target.closest(".search-row, .sidebar, .sheet-handle")) dragBegin(e);
	}}
	on:touchmove={dragMove}
	on:touchend={dragEnd}
	style:top={anchor && anchor.top != null ? anchor.top + "px" : null}
	style:bottom={anchor && anchor.bottom != null ? anchor.bottom + "px" : null}
	style:right={anchor ? anchor.right + "px" : null}
	style:max-height={anchor && !$mobile
		? Math.max(
				200,
				window.innerHeight -
					(anchor.top != null ? anchor.top : anchor.bottom) -
					8
			) + "px"
		: null}
>
	{#if $mobile}
		<div class="sheet-handle" />
	{/if}
	<div class="search-row">
		<input
			type="search"
			placeholder="Find the perfect emote"
			bind:value={query}
		/>
	</div>
	<div class="popup-body">
		<div class="sidebar">
			<button type="button"
				class="side-btn"
				class:active={section === "recent"}
				title="Recent"
				on:click={() => {userPicked = true; section = "recent";}}><svg class="side-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></button
			>
			<button type="button"
				class="side-btn"
				class:active={section === "unicode"}
				title="Emoji"
				on:click={() => {userPicked = true; section = "unicode";}}><svg class="side-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg></button
			>
			{#each $chats.filter(c => c.type === 0) as c}
				<button type="button"
					class="side-btn"
					class:active={section === `chat:${c._id}`}
					title={c.nickname || "DM"}
					on:click={() => selectChat(c)}
				>
					<ChatIcon chat={c} size={0.7} />
				</button>
			{/each}
		</div>
		<div class="emote-grid" bind:this={gridEl} on:scroll={onScroll}>
			{#if section === "recent"}
				{#if recentEmojis.length}
					<p class="group-label">Emojis</p>
					{#each recentEmojis as e}
						{#if e.t === "u"}
							<button
								type="button"
								class="option unicode"
								title={e.name}
								on:click={ev => pickRecent(e, ev)}>{e.v}</button
							>
						{:else}
							<button
								type="button"
								class="option"
								title=":{e.name}:"
								on:click={ev => pickRecent(e, ev)}
							>
								<img
									src="{uploadsUrl}emojis/{e.id}"
									alt={e.name}
									on:error={() => forgetRecent(e.id)}
								/>
							</button>
						{/if}
					{/each}
				{/if}
				{#if recentStickers.length}
					<p class="group-label">Stickers</p>
					{#each recentStickers as e}
						<button
							type="button"
							class="option sticker-option"
							title={e.name}
							on:click={ev => pickRecent(e, ev)}
						>
							<img
								class="sticker"
								src="{uploadsUrl}stickers/{e.id}"
								alt={e.name}
								on:error={() => forgetRecent(e.id)}
							/>
						</button>
					{/each}
				{/if}
				{#if !recentEmojis.length && !recentStickers.length}
					<p class="empty">Nothing here yet.</p>
				{/if}
			{:else if section === "unicode"}
				{#each filtered.slice(0, visibleCount) as e}
					<button type="button"
						class="option unicode"
						title={e.keywords[0] || ""}
						on:click={ev => pickUnicode(e, ev)}
						><img
							class="unicode-img"
							src={emojiCharUrl(e.char, 72)}
							alt={e.char}
							style={emojiPlaceholderStyle([...e.char].map(c => c.codePointAt(0).toString(16)).join("-"))}
							on:load={ev => (ev.target.style.background = "none")}
							class:emoji-loading={true}
							loading="lazy"
							decoding="async"
							draggable="false"
						/></button
					>
				{:else}
					<p class="empty">No emoji found.</p>
				{/each}
			{:else if sectionChat}
				{#if filteredEmojis.length}
					<p class="group-label">Emojis</p>
					{#each filteredEmojis as e}
						<button type="button"
							class="option"
							title=":{e.name}:"
							on:click={ev => pickEmoji(e, sectionChat._id, ev)}
						>
							<img
								src="{uploadsUrl}emojis/{e._id}"
								alt={e.name}
								style:background={e.thumbhash && placeholderUrl(e.thumbhash)
									? `url(${placeholderUrl(e.thumbhash)}) center/cover`
									: null}
								on:load={ev => (ev.target.style.background = "none")}
							/>
						</button>
					{/each}
				{/if}
				{#if filteredStickers.length}
					<p class="group-label">Stickers</p>
					{#each filteredStickers as e}
						<button type="button"
							class="option sticker-option"
							title={e.name}
							on:click={ev => pickSticker(e, sectionChat._id, ev)}
						>
							<img
								class="sticker"
								src="{uploadsUrl}stickers/{e._id}"
								alt={e.name}
								style:background={e.thumbhash && placeholderUrl(e.thumbhash)
									? `url(${placeholderUrl(e.thumbhash)}) center/cover`
									: null}
								on:load={ev => (ev.target.style.background = "none")}
							/>
						</button>
					{/each}
				{/if}
				{#if !filteredEmojis.length && !filteredStickers.length}
					<p class="empty">No emotes in this chat yet.</p>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.option.unicode img.unicode-img {
		width: 100%;
		height: 100%;
		padding: 4px;
		box-sizing: border-box;
		object-fit: contain;
		display: block;
		pointer-events: none;
	}
	.emoji-popup.anchored {
		position: fixed;
		top: auto;
		z-index: 10002;
	}
	.emoji-popup {
		position: absolute;
		top: calc(100% + 0.25em);
		right: 0;
		z-index: 100;

		width: 24em;
		height: 22em;
		display: flex;
		flex-direction: column;

		background-color: var(--background);
		border: solid 2px var(--orange);
		border-radius: 0.8em;
		box-shadow: 0 0 1em rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}
	.search-row {
		padding: 0.5em;
		border-bottom: solid 1px var(--foreground-orange);
	}
	.search-row input {
		width: 100%;
		box-sizing: border-box;
	}
	.popup-body {
		display: flex;
		flex: 1;
		min-height: 0;
	}
	.sidebar {
		width: 3.2em;
		overflow-y: auto;
		border-right: solid 1px var(--foreground-orange);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3em;
		padding: 0.4em 0;
		flex-shrink: 0;
	}
	.side-btn {
		padding: 0.15em;
		background: none;
		border: none;
		font-size: 1.3em;
		line-height: 1;
		opacity: 0.7;
		flex-shrink: 0;
	}
	.side-icon {
		width: 1.4em;
		height: 1.4em;
		display: block;
		color: var(--foreground);
	}
	.side-btn.active {
		opacity: 1;
		background-color: var(--orange-light);
	}
	.emote-grid {
		flex: 1;
		overflow-y: auto;
		padding: 0.4em;
		display: grid;
		grid-template-columns: repeat(auto-fill, 2.4em);
		grid-auto-rows: auto;
		justify-content: space-between;
		align-content: start;
		gap: 0.15em;
	}
	.option {
		width: 2.4em;
		height: 2.4em;
		padding: 0;
		background: none;
		border: none;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 0.4em;
	}
	.option.unicode {
		font-size: 1.4em;
		width: 1.715em;
		height: 1.715em;
	}
	.option.unicode,
	.option img {
		white-space: nowrap;
	}
	.option img {
		width: 2em;
		height: 2em;
		object-fit: contain;
	}
	.option.sticker-option {
		grid-column: span 2;
		width: 4.95em;
		height: 4.95em;
	}
	.option img.sticker {
		width: 4.4em;
		height: 4.4em;
	}
	.group-label {
		grid-column: 1 / -1;
		font-size: 0.75em;
		font-weight: bold;
		text-transform: uppercase;
		opacity: 0.6;
		margin: 0.6em 0 0;
		line-height: 1.2;
	}
	.group-label:first-child {
		margin-top: 0;
	}
	.empty {
		grid-column: 1 / -1;
		text-align: center;
		opacity: 0.6;
	}

	/* Mobile: bottom sheet with the categories in a scrolling row on top */
	.emoji-popup.sheet {
		position: fixed;
		top: auto !important;
		bottom: 0 !important;
		left: 0;
		right: 0 !important;
		width: auto;
		height: 65vh;
		z-index: 10003;
		border-bottom: none;
		border-radius: 1em 1em 0 0;
		padding-bottom: env(safe-area-inset-bottom);
	}
	.emoji-popup.sheet .popup-body {
		flex-direction: column;
	}
	.emoji-popup.sheet .sidebar {
		width: auto;
		flex-direction: row;
		overflow-x: auto;
		overflow-y: hidden;
		border-right: none;
		border-bottom: solid 1px var(--foreground-orange);
		padding: 0.35em 0.5em;
	}
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10002;
		background: rgba(0, 0, 0, 0.5);
		animation: backdrop-in 0.2s ease;
	}
	.emoji-popup.sheet {
		animation: sheet-up 0.25s ease;
	}
	@keyframes sheet-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	@keyframes backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.sheet-handle {
		width: 2.5em;
		height: 0.3em;
		border-radius: 1em;
		background-color: var(--orange);
		opacity: 0.6;
		margin: 0.4em auto 0;
		flex-shrink: 0;
	}
</style>
