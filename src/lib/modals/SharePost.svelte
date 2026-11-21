<script>
	import Modal from "../Modal.svelte";
	import Post from "../Post.svelte";
	import * as modals from "../modals.js";

	export let modalData = {};
	const post = modalData.post;

	$: link = post ? `${window.location.origin}/posts/${post.post_id}` : "";

	let copied = false;
	let copyTimeout;
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => (copied = false), 2000);
		} catch {}
	}
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Share Post</h2>
	<div slot="default">
		{#if post}
			<div class="preview">
				<Post {post} buttons={false} />
			</div>
		{/if}

		<div class="link-row">
			<input
				type="text"
				class="modal-input white"
				readonly
				value={link}
				on:click={e => e.target.select()}
			/>
			<button on:click={copyLink}>{copied ? "Copied!" : "Copy"}</button>
		</div>
		<div class="share-options">
			<button
				class="share-option"
				style:--brand="#1d9bf0"
				on:click={() =>
					window.open(
						`https://twitter.com/intent/tweet?url=${encodeURIComponent(
							link
						)}`,
						"_blank",
						"noopener"
					)}
			>
				<svg viewBox="0 0 24 24" width="1em" height="1em">
					<path
						fill="currentColor"
						d="M23.954 4.569c-.885.389-1.83.654-2.825.775 1.014-.611 1.794-1.574 2.163-2.723-.951.555-2.005.959-3.127 1.184-.896-.959-2.173-1.559-3.591-1.559-2.717 0-4.92 2.203-4.92 4.917 0 .39.045.765.127 1.124C7.691 8.094 4.066 6.13 1.64 3.161c-.427.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.061c0 2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.314 0-.615-.03-.916-.086.631 1.953 2.445 3.377 4.604 3.417-1.68 1.319-3.809 2.105-6.102 2.105-.39 0-.779-.023-1.17-.067 2.189 1.394 4.768 2.209 7.557 2.209 9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63.961-.689 1.8-1.56 2.46-2.548l-.047-.02z"
					/>
				</svg>
				Share to Twitter
			</button>
			<button
				class="share-option"
				style:--brand="#0085ff"
				on:click={() =>
					window.open(
						`https://bsky.app/intent/compose?text=${encodeURIComponent(
							link
						)}`,
						"_blank",
						"noopener"
					)}
			>
				<svg viewBox="0 0 24 24" width="1em" height="1em">
					<path
						fill="currentColor"
						d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"
					/>
				</svg>
				Share to Bluesky
			</button>
			<button
				class="share-option"
				style:--brand="#6364ff"
				on:click={() =>
					window.open(
						`https://mastodonshare.com/?text=${encodeURIComponent(
							link
						)}`,
						"_blank",
						"noopener"
					)}
			>
				<svg viewBox="0 0 24 24" width="1em" height="1em">
					<path
						fill="currentColor"
						d="M4 19V8.6c0-3 2-5 4.5-5 1.7 0 3 .9 3.7 2.3h.4c.7-1.4 2-2.3 3.7-2.3 2.5 0 4.5 2 4.5 5V19h-3.3V9.9c0-1.3-.6-2-1.6-2-1 0-1.6.8-1.6 2.1v9H9.8V10c0-1.3-.6-2.1-1.6-2.1-1 0-1.6.7-1.6 2V19H4z"
					/>
				</svg>
				Share to Mastodon
			</button>
			<button
				class="share-option"
				style:--brand="#ff6b5c"
				on:click={() =>
					window.open(
						`mailto:?body=${encodeURIComponent(link)}`,
						"_blank",
						"noopener"
					)}
			>
				<svg
					viewBox="0 0 24 24"
					width="1em"
					height="1em"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="2" y="4" width="20" height="16" rx="2" />
					<path d="m2 7 10 6 10-6" />
				</svg>
				Share via Email
			</button>
			{#if navigator.share}
				<button
					class="share-option"
					style:--brand="var(--orange-button)"
					on:click={() =>
						navigator.share({url: link}).catch(() => {})}
				>
					<svg
						viewBox="0 0 24 24"
						width="1em"
						height="1em"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<circle cx="18" cy="5" r="3" />
						<circle cx="6" cy="12" r="3" />
						<circle cx="18" cy="19" r="3" />
						<path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
					</svg>
					More Options
				</button>
			{/if}
		</div>
	</div>
</Modal>

<style>
	.preview {
		margin-bottom: 0.75em;
		pointer-events: none;
	}
	.link-row {
		display: flex;
		gap: 0.5em;
		margin-bottom: 0.75em;
	}
	.link-row input {
		flex: 1;
		min-width: 0;
	}
	.share-options {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}
	.share-option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		background-color: var(--brand);
		border-color: var(--brand);
	}
	:global(main.input-hover)
		button.share-option:not(.circle):not(.white):not(:disabled):hover {
		background-color: var(--brand);
		border-color: var(--brand);
		filter: brightness(1.15);
	}
	.share-option svg {
		width: 1.1em;
		height: 1.1em;
		flex-shrink: 0;
	}
</style>
