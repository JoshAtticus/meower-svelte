<script>
	import Modal from "../../Modal.svelte";

	import {authHeader, chats} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";
	import * as clm from "../../clmanager.js";

	import {focus, goto} from "@roxi/routify";

	export let modalData;

	let {mode, username, chatId} = modalData;

	let loading, error;
	let notify = false;
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">
		{#if mode === "block"}Block @{username}{:else}Ignore Message Request{/if}
	</h2>
	<div slot="default">
		<form
			on:submit|preventDefault={async () => {
				loading = true;
				try {
					if (mode === "block") {
						const resp = await clm.setRelationship(username, 2, {
							notify,
						});
						if (!resp.ok) {
							if (resp.status === 429) {
								throw new Error(
									"Too many requests! Try again later."
								);
							}
							throw new Error(
								"Response code is not OK; code is " +
									resp.status
							);
						}
					}
					const resp = await fetch(
						`${apiUrl}chats/${chatId}/dm_request/ignore`,
						{method: "POST", headers: $authHeader}
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
					$chats = $chats.filter(c => c._id !== chatId);
					modals.closeLastModal();
					$goto("/chats");
				} catch (e) {
					loading = false;
					error = e;
				}
			}}
		>
			{#if mode === "block"}
				<p>
					Block <b>@{username}</b>? They won't be able to message
					you.
				</p>
				<label class="notify-row">
					<input type="checkbox" bind:checked={notify} />
					Let them know they've been blocked
				</label>
			{:else}
				<p>
					Ignore <b>@{username}</b>'s message request? It'll be
					removed from your chats.
				</p>
			{/if}
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
					>{mode === "block" ? "Block" : "Ignore"}</button
				>
			</div>
		</form>
	</div>
</Modal>

<style>
	.notify-row {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}
</style>
