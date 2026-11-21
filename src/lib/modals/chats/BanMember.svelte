<script>
	import Modal from "../../Modal.svelte";

	import {authHeader, chat} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	export let modalData;

	let {username} = modalData;

	let duration = 0;
	let loading, error;

	const durations = [
		{label: "Never (permanent)", value: 0},
		{label: "1 hour", value: 3600},
		{label: "1 day", value: 86400},
		{label: "7 days", value: 604800},
		{label: "30 days", value: 2592000},
	];
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">Ban Member</h2>
	<div slot="default">
		<form
			on:submit|preventDefault={async () => {
				loading = true;
				try {
					const resp = await fetch(
						`${apiUrl}chats/${$chat._id}/bans/${username}`,
						{
							method: "PUT",
							headers: {
								"Content-Type": "application/json",
								...$authHeader,
							},
							body: JSON.stringify({
								expires_in: duration || null,
							}),
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
					modals.closeLastModal();
				} catch (e) {
					loading = false;
					error = e;
				}
			}}
		>
			Banning <b>@{username}</b> from <b>{$chat.nickname}</b> will
			prevent them from posting, but they will stay a member of the
			chat.
			<br /><br />
			<label for="duration"><b>Ban expires</b></label>
			<select
				id="duration"
				class="modal-input white"
				disabled={loading}
				bind:value={duration}
			>
				{#each durations as d}
					<option value={d.value}>{d.label}</option>
				{/each}
			</select>
			{#if error}
				<p style="color: crimson;">{error}</p>
			{:else}
				<br /><br />
			{/if}
			<div class="modal-buttons">
				<button
					type="button"
					disabled={loading}
					on:click|preventDefault={() => modals.closeLastModal()}
					>Cancel</button
				>
				<button type="submit" disabled={loading}>Ban member</button>
			</div>
		</form>
	</div>
</Modal>
