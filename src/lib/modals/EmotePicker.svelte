<script>
	import Modal from "../Modal.svelte";

	import {chatEmotes, loadEmotes} from "../emotes.js";
	import {chat} from "../stores.js";
	import {uploadsUrl} from "../urls.js";
	import * as modals from "../modals.js";

	import {onMount} from "svelte";

	export let modalData = {};
	// modalData: {chatId, onEmoji(name), onSticker(id)}

	const chatId = modalData.chatId;

	let tab = "emojis";

	onMount(() => loadEmotes(chatId));

	$: emotes = $chatEmotes[chatId] || {emojis: [], stickers: []};
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Emotes</h2>
	<div slot="default">
		<div class="tabs">
			<button
				class:active={tab === "emojis"}
				on:click={() => (tab = "emojis")}>Emojis</button
			>
			<button
				class:active={tab === "stickers"}
				on:click={() => (tab = "stickers")}>Stickers</button
			>
		</div>

		<div class="emote-grid">
			{#each emotes[tab] as emote}
				<button
					class="emote-option"
					title={emote.name}
					on:click={() => {
						if (tab === "emojis" && modalData.onEmoji)
							modalData.onEmoji(emote.name);
						if (tab === "stickers" && modalData.onSticker)
							modalData.onSticker(emote._id);
						modals.closeLastModal();
					}}
				>
					<img
						src="{uploadsUrl}{tab}/{emote._id}"
						alt={emote.name}
						class:sticker={tab === "stickers"}
					/>
				</button>
			{:else}
				<p class="emote-empty">No {tab} in this chat yet.</p>
			{/each}
		</div>
	</div>
</Modal>

<style>
	.tabs {
		display: flex;
		gap: 0.5em;
		margin-bottom: 1em;
	}
	.tabs button {
		flex: 1;
		opacity: 0.7;
	}
	.tabs button.active {
		opacity: 1;
		font-weight: bold;
	}

	.emote-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4em;
		max-height: 18em;
		overflow-y: auto;
	}
	.emote-option {
		padding: 0.25em;
		background: none;
		border: none;
	}
	.emote-option img {
		width: 2.5em;
		height: 2.5em;
		object-fit: contain;
	}
	.emote-option img.sticker {
		width: 5em;
		height: 5em;
	}
	.emote-empty {
		opacity: 0.7;
	}
</style>
