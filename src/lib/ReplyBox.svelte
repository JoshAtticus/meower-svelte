<!-- Compact reply composer: text with custom emoji, emoji/sticker picker and :emoji: / [sticker] type-ahead. -->
<script>
	import {richInput} from "./richInput.js";
	import EmojiPopup from "./EmojiPopup.svelte";
	import EmoteAutocomplete from "./EmoteAutocomplete.svelte";
	import emojiIcon from "../assets/emoji.svg";
	import {uploadsUrl} from "./urls.js";

	export let placeholder = "Write a reply...";
	export let chatId = null;
	export let sending = false;
	export let canSticker = true;
	// (content, stickers) => Promise<boolean>; true clears the box
	export let onSend;

	let input;
	let trigger;
	let empty = true;
	let anchor = null;

	export function focus() {
		input && input.focus();
	}

	const update = () => (empty = !input || !input.value.trim());

	async function send() {
		const content = input.value.trim();
		if (!content || sending) return;
		if (await onSend(content, [])) {
			input.value = "";
			update();
		}
	}

	function openPopup() {
		const r = trigger.getBoundingClientRect();
		const right = Math.max(8, window.innerWidth - r.right);
		anchor =
			window.innerHeight - r.bottom > 380
				? {top: r.bottom + 4, right}
				: {bottom: window.innerHeight - r.top + 4, right};
	}

	const sendSticker = id => onSend("", [id]);
</script>

<form class="reply-compose" on:submit|preventDefault={send}>
	<div
		class="reply-input"
		role="textbox"
		aria-multiline="true"
		tabindex="0"
		data-placeholder={placeholder}
		use:richInput={{uploadsUrl, disabled: sending}}
		bind:this={input}
		on:input={update}
		on:keydown={e => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				send();
			}
		}}
	/>
	<button
		type="button"
		class="emoji-btn"
		title="Emoji & stickers"
		aria-label="Emoji & stickers"
		bind:this={trigger}
		on:click={openPopup}
	>
		<span class="emoji-icon" style:--icon={`url(${emojiIcon})`} />
	</button>
	<button type="submit" class="send" disabled={sending || empty}>Reply</button>
</form>

<EmoteAutocomplete
	{input}
	{chatId}
	onSticker={canSticker ? sendSticker : null}
/>

{#if anchor}
	<div class="popup-overlay" on:click={() => (anchor = null)} />
	<EmojiPopup
		{chatId}
		{anchor}
		onEmoji={(name, emote) => input.insert(`<:${emote._id}>`)}
		onUnicode={ch => input.insert(ch)}
		onSticker={canSticker ? sendSticker : null}
		onClose={() => (anchor = null)}
	/>
{/if}

<style>
	.reply-compose {
		display: flex;
		align-items: flex-end;
		gap: 0.4em;
	}
	.reply-input {
		flex: 1;
		min-width: 0;
		max-height: 8em;
		overflow-y: auto;
		border: 1px solid var(--hairline, var(--gray, #ccc));
		border-radius: 16px;
		padding: 0.35em 0.8em;
		background: transparent;
		color: inherit;
		outline: none;
		overflow-wrap: anywhere;
	}
	.reply-input:focus {
		border-color: var(--orange, #f97720);
	}
	.reply-input:global(.empty)::before {
		content: attr(data-placeholder);
		opacity: 0.55;
		pointer-events: none;
	}
	.reply-input :global(img.composer-emoji) {
		width: 1.4em;
		height: 1.4em;
		vertical-align: -0.3em;
	}
	button {
		border: none;
		margin: 0;
		cursor: pointer;
	}
	.send {
		border-radius: 16px;
		padding: 0.35em 1em;
		background: var(--orange, #f97720);
		color: white;
		font-weight: 600;
	}
	.send:disabled {
		opacity: 0.5;
	}
	.emoji-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 2em;
		height: 2em;
		padding: 0;
		border-radius: 50%;
		background: transparent;
		color: inherit;
	}
	.emoji-icon {
		width: 1.3em;
		height: 1.3em;
		background-color: currentColor;
		-webkit-mask: var(--icon) center / contain no-repeat;
		mask: var(--icon) center / contain no-repeat;
		opacity: 0.7;
	}
	.popup-overlay {
		position: fixed;
		inset: 0;
		z-index: 10001;
	}
</style>
