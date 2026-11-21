<!-- Discord-style emote picker popup (not a modal) -->
<script>
	import ChatIcon from "./ChatIcon.svelte";

	import {chats} from "./stores.js";
	import {
		chatEmotes,
		loadEmotes,
		recentEmotes,
		recordEmote,
	} from "./emotes.js";
	import {uploadsUrl} from "./urls.js";

	import {createEventDispatcher, onMount} from "svelte";
	import emojilib from "emojilib";

	export let chatId;
	export let onEmoji; // (name)
	export let onUnicode; // (char)
	export let onSticker; // (id)

	const dispatch = createEventDispatcher();

	const ALL_EMOJI = Object.entries(emojilib).map(([char, keywords]) => ({
		char,
		keywords,
	}));

	let query = "";
	// section: "recent" | "unicode" | `chat:${id}`
	let section = chatId ? `chat:${chatId}` : "recent";
	if (chatId) section = `chat:${chatId}`;

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
	$: filteredStickers = sectionEmotes.stickers.filter(
		e => !query || e.name.toLowerCase().includes(query.toLowerCase())
	);

	function selectChat(c) {
		section = `chat:${c._id}`;
		loadEmotes(c._id);
	}

	function pickUnicode(e) {
		recordEmote({t: "u", v: e.char, name: e.keywords[0] || ""});
		onUnicode && onUnicode(e.char);
	}
	function pickEmoji(e, chatId) {
		recordEmote({t: "e", id: e._id, name: e.name, chatId});
		onEmoji && onEmoji(e.name);
	}
	function pickSticker(e, chatId) {
		recordEmote({t: "s", id: e._id, name: e.name, chatId});
		onSticker && onSticker(e._id);
	}
	function pickRecent(e) {
		if (e.t === "u") {
			onUnicode && onUnicode(e.v);
		} else if (e.t === "e") {
			onEmoji && onEmoji(e.name);
		} else {
			onSticker && onSticker(e.id);
		}
		recordEmote(e);
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

<div class="emoji-popup">
	<div class="search-row">
		<input
			type="search"
			placeholder="Find the perfect emote"
			bind:value={query}
		/>
	</div>
	<div class="popup-body">
		<div class="sidebar">
			<button
				class="side-btn"
				class:active={section === "recent"}
				title="Recent"
				on:click={() => (section = "recent")}>🕘</button
			>
			<button
				class="side-btn"
				class:active={section === "unicode"}
				title="Emoji"
				on:click={() => (section = "unicode")}>😀</button
			>
			{#each $chats.filter(c => c.type === 0 || c.type === 1) as c}
				<button
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
				{#each filteredRecents as e}
					{#if e.t === "u"}
						<button
							class="option unicode"
							title={e.name}
							on:click={() => pickRecent(e)}>{e.v}</button
						>
					{:else if e.t === "e"}
						<button
							class="option"
							title=":{e.name}:"
							on:click={() => pickRecent(e)}
						>
							<img
								src="{uploadsUrl}emojis/{e.id}"
								alt={e.name}
							/>
						</button>
					{:else}
						<button
							class="option"
							title={e.name}
							on:click={() => pickRecent(e)}
						>
							<img
								class="sticker"
								src="{uploadsUrl}stickers/{e.id}"
								alt={e.name}
							/>
						</button>
					{/if}
				{:else}
					<p class="empty">Nothing here yet.</p>
				{/each}
			{:else if section === "unicode"}
				{#each filtered.slice(0, visibleCount) as e}
					<button
						class="option unicode"
						title={e.keywords[0] || ""}
						on:click={() => pickUnicode(e)}>{e.char}</button
					>
				{:else}
					<p class="empty">No emoji found.</p>
				{/each}
			{:else if sectionChat}
				{#if filteredEmojis.length}
					<p class="group-label">Emojis</p>
					{#each filteredEmojis as e}
						<button
							class="option"
							title=":{e.name}:"
							on:click={() => pickEmoji(e, sectionChat._id)}
						>
							<img
								src="{uploadsUrl}emojis/{e._id}"
								alt={e.name}
							/>
						</button>
					{/each}
				{/if}
				{#if filteredStickers.length}
					<p class="group-label">Stickers</p>
					{#each filteredStickers as e}
						<button
							class="option"
							title={e.name}
							on:click={() =>
								pickSticker(e, sectionChat._id)}
						>
							<img
								class="sticker"
								src="{uploadsUrl}stickers/{e._id}"
								alt={e.name}
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
	.emoji-popup {
		position: absolute;
		bottom: calc(100% + 0.5em);
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
	.side-btn.active {
		opacity: 1;
		background-color: var(--orange-light);
	}
	.emote-grid {
		flex: 1;
		overflow-y: auto;
		padding: 0.4em;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.15em;
	}
	.option {
		padding: 0.15em;
		background: none;
		border: none;
		line-height: 1;
	}
	.option.unicode {
		font-size: 1.4em;
	}
	.option img {
		width: 2em;
		height: 2em;
		object-fit: contain;
	}
	.option img.sticker {
		width: 4em;
		height: 4em;
	}
	.group-label {
		width: 100%;
		font-size: 0.75em;
		font-weight: bold;
		text-transform: uppercase;
		opacity: 0.6;
		margin: 0.4em 0 0.1em;
	}
	.empty {
		width: 100%;
		text-align: center;
		opacity: 0.6;
	}
</style>
