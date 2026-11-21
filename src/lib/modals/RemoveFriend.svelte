<script>
	import Modal from "../Modal.svelte";

	import * as modals from "../modals.js";
	import * as clm from "../clmanager.js";

	import {focus} from "@roxi/routify";

	export let modalData;

	let {username} = modalData;

	let loading, error;
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Remove Friend</h2>
	<div slot="default">
		<form
			on:submit|preventDefault={async () => {
				loading = true;
				try {
					const resp = await clm.setRelationship(username, 0);
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
					modals.closeLastModal();
				} catch (e) {
					loading = false;
					error = e;
				}
			}}
		>
			<p>
				Are you sure you want to remove <b>{username}</b> from your
				friends? You'll have to send each other friend requests again
				to become friends.
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
					>Remove</button
				>
			</div>
		</form>
	</div>
</Modal>
