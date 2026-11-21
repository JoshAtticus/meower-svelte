<script>
	import Modal from "../../Modal.svelte";

	import {authHeader, user} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	import {focus} from "@roxi/routify";

	export let modalData;

	let {chat} = modalData;

	let loading, error;

	$: isDM = chat.type === 1;
	$: otherMember = isDM
		? chat.members.filter(m => m !== $user.name)[0]
		: null;
</script>

<Modal on:close={modals.closeLastModal}>
	<h2 slot="header">{isDM ? "Close DM" : "Leave Chat"}</h2>
	<div slot="default">
		<form
			on:submit|preventDefault={async () => {
				loading = true;
				try {
					const resp = await fetch(`${apiUrl}chats/${chat._id}`, {
						method: "DELETE",
						headers: $authHeader,
					});
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
			{#if isDM}
				Are you sure you want to close your DM with @{otherMember}?
			{:else}
				Are you sure you want to leave {chat.nickname}?
			{/if}
			{#if error}
				<p style="color: crimson;">{error}</p>
			{:else}
				<br /><br />
			{/if}
			<div class="modal-buttons">
				<button
					type="button"
					disabled={loading}
					on:click={modals.closeLastModal}>Cancel</button
				>
				<button type="submit" disabled={loading} use:focus
					>{isDM ? "Close" : "Leave"}</button
				>
			</div>
		</form>
	</div>
</Modal>
