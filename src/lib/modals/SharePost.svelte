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
						d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
					/>
				</svg>
				Share to X
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
				style:--brand="#777"
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
	:global(main.input-hover) .share-option:hover {
		background-color: var(--brand);
		filter: brightness(1.15);
	}
	.share-option svg {
		width: 1.1em;
		height: 1.1em;
		flex-shrink: 0;
	}
</style>
