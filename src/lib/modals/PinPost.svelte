<script>
	import Modal from "../Modal.svelte";

	import {authHeader} from "../stores.js";
	import {apiUrl} from "../urls.js";
	import * as modals from "../modals.js";

	import {focus} from "@roxi/routify";

	export let modalData;

	// post: the post being pinned/unpinned; onDone(pinned) updates it
	let {post, onDone} = modalData;
	const unpin = post.pinned;

	let loading, error;
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">{unpin ? "Unpin Post" : "Pin Post"}</h2>
	<div slot="default">
		<form
			on:submit|preventDefault={async () => {
				loading = true;
				try {
					const resp = await fetch(
						`${apiUrl}posts/${post.post_id}/pin`,
						{
							method: unpin ? "DELETE" : "POST",
							headers: $authHeader,
						}
					);
					if (!resp.ok) {
						if (resp.status === 429) {
							throw new Error(
								"Too many requests! Try again later."
							);
						}
						throw new Error(
							"Response code is not OK; code is " + resp.status
						);
					}
					onDone && onDone(!unpin);
					modals.closeLastModal();
				} catch (e) {
					loading = false;
					error = e;
				}
			}}
		>
			<p>
				{#if unpin}
					Are you sure you want to unpin this post from <b>@{post.user}</b>?
				{:else}
					Are you sure you want to pin this post from <b>@{post.user}</b>?
					Everyone in the chat will be able to see it in pinned posts.
				{/if}
			</p>
			{#if error}
				<p style="color: crimson;">{error}</p>
			{:else}
				<br />
			{/if}
			<div class="modal-buttons">
				<button
					type="button"
					disabled={loading}
					on:click|preventDefault={modals.closeLastModal}
					>Cancel</button
				>
				<button type="submit" disabled={loading} use:focus
					>{unpin ? "Unpin" : "Pin"}</button
				>
			</div>
		</form>
	</div>
</Modal>
