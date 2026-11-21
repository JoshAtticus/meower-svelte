<script>
	import Modal from "../Modal.svelte";
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
				on:click={() =>
					window.open(
						`https://twitter.com/intent/tweet?url=${encodeURIComponent(
							link
						)}`,
						"_blank",
						"noopener"
					)}>Share to Twitter</button
			>
			<button
				on:click={() =>
					window.open(
						`https://bsky.app/intent/compose?text=${encodeURIComponent(
							link
						)}`,
						"_blank",
						"noopener"
					)}>Share to Bluesky</button
			>
			<button
				on:click={() =>
					window.open(
						`mailto:?body=${encodeURIComponent(link)}`,
						"_blank",
						"noopener"
					)}>Share via Email</button
			>
			{#if navigator.share}
				<button
					on:click={() =>
						navigator
							.share({url: link})
							.catch(() => {})}>More Options</button
				>
			{/if}
		</div>
	</div>
</Modal>

<style>
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
</style>
