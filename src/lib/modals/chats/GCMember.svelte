<script>
	import Modal from "../../Modal.svelte";
	import ProfileView from "../../ProfileView.svelte";

	import RemoveMemberModal from "./RemoveMember.svelte";
	import BanMemberModal from "./BanMember.svelte";
	import TransferChatOwnershipModal from "./TransferChatOwnership.svelte";

	import {user, chat, authHeader} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import {adminPermissions, hasPermission} from "../../bitField.js";
	import * as modals from "../../modals.js";

	import {params, goto} from "@roxi/routify";

	export let modalData;

	let {username} = modalData;

	let banError = "";

	$: memberBan = ($chat.bans || []).find(
		ban => ban.username === username
	);

	$: {
		if (!$chat.members.includes(username)) modals.closeLastModal();
	}
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">{username}'s Profile</h2>
	<div slot="default">
		<ProfileView {username} canClick={true} canDoActions={true} />
		<button
			class="long"
			on:click={() => {
				modals.closeLastModal();
				$goto(`/users/${username}`);
			}}>View full profile</button
		>
		{#if ($chat.owner == $user.name && username != $user.name)}
			<button
				class="long"
				on:click={() =>
					modals.replaceLastModal(RemoveMemberModal, {username})}
			>
				Remove from chat
			</button>
			{#if memberBan}
				<button
					class="long"
					on:click={async () => {
						banError = "";
						try {
							const resp = await fetch(
								`${apiUrl}chats/${$chat._id}/bans/${username}`,
								{
									method: "DELETE",
									headers: $authHeader,
								}
							);
							if (!resp.ok) {
								throw new Error(
									"Response code is not OK; code is " +
										resp.status
								);
							}
						} catch (e) {
							banError = e;
						}
					}}
				>
					Unban from chat
				</button>
			{:else}
				<button
					class="long"
					on:click={() =>
						modals.replaceLastModal(BanMemberModal, {username})}
				>
					Ban from chat
				</button>
			{/if}
			{#if banError}
				<p style="color: crimson;">{banError}</p>
			{/if}
		{/if}
		{#if ($chat.owner == $user.name && username != $user.name) || ($params.admin && hasPermission(adminPermissions.EDIT_CHATS))}
			<button
				class="long"
				on:click={() =>
					modals.replaceLastModal(TransferChatOwnershipModal, {
						username,
					})}
			>
				Make owner of chat
			</button>
		{/if}
	</div>
</Modal>

<style>
	.long {
		width: 100%;
		margin: 0;
		margin-bottom: 0.2em;
	}
</style>
