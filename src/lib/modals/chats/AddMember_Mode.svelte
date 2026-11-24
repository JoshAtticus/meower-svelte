<script>
	import Modal from "../../Modal.svelte";

	import AddMemberModal from "./AddMember.svelte";
	import AddMemberSearchModal from "./AddMember_Search.svelte";

	import {authHeader} from "../../stores.js";
	import {chat} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import * as modals from "../../modals.js";

	let linkStatus = "";
	async function copyLink() {
		linkStatus = "";
		try {
			const resp = await fetch(`${apiUrl}invite-links/chat/${$chat._id}`, {
				method: "POST",
				headers: $authHeader,
			});
			if (!resp.ok) throw new Error();
			const {code} = await resp.json();
			await navigator.clipboard.writeText(`${location.origin}/invite/${code}`);
			linkStatus = "Invite link copied!";
		} catch {
			linkStatus = "Couldn't create an invite link.";
		}
	}
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Add Member</h2>
	<div slot="default">
		<button
			class="long"
			on:click={() => modals.replaceLastModal(AddMemberModal)}
		>
			Enter Username
		</button><br />
		<button
			class="long"
			on:click={() => modals.replaceLastModal(AddMemberSearchModal)}
		>
			Search for Users
		</button><br />
		<button class="long" on:click={copyLink}>Copy Invite Link</button>
		{#if linkStatus}<p class="status">{linkStatus}</p>{/if}
	</div>
</Modal>

<style>
	.status {
		margin: 0.4em 0 0;
		font-size: 0.9em;
	}
	.long {
		width: 100%;
		margin-bottom: 0.2em;
	}
</style>
