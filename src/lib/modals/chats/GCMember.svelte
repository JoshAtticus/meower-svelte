<script>
	import Modal from "../../Modal.svelte";
	import ProfileView from "../../ProfileView.svelte";

	import RemoveMemberModal from "./RemoveMember.svelte";
	import BanMemberModal from "./BanMember.svelte";
	import TransferChatOwnershipModal from "./TransferChatOwnership.svelte";

	import {user, chat, authHeader} from "../../stores.js";
	import {apiUrl} from "../../urls.js";
	import {adminPermissions, hasPermission} from "../../bitField.js";
	import {
		has as hasChatPerm,
		outranks,
		canAssignRole,
	} from "../../chatPermissions.js";
	import * as modals from "../../modals.js";

	import {params, goto} from "@roxi/routify";

	export let modalData;

	let {username} = modalData;

	let banError = "";
	let roleError = "";

	$: memberBan = ($chat.bans || []).find(
		ban => ban.username === username
	);

	$: isGroup = $chat.type === 0;
	$: isSelf = username === $user.name;
	$: canRemove =
		isGroup &&
		!isSelf &&
		hasChatPerm($chat, $user.name, "remove_members") &&
		outranks($chat, $user.name, username);
	$: canBan =
		isGroup &&
		!isSelf &&
		hasChatPerm($chat, $user.name, "ban_members") &&
		outranks($chat, $user.name, username);
	$: isAdmin = $params.admin && hasPermission(adminPermissions.EDIT_CHATS);

	$: sortedRoles = ($chat.roles || [])
		.map((role, i) => ({role, i}))
		.sort((a, b) => b.role.tier - a.role.tier || a.i - b.i)
		.map(({role}) => role);

	async function toggleMemberRole(role, checked) {
		roleError = "";
		try {
			const resp = await fetch(
				`${apiUrl}chats/${$chat._id}/members/${username}/roles/${role._id}`,
				{
					method: checked ? "PUT" : "DELETE",
					headers: $authHeader,
				}
			);
			if (!resp.ok) {
				const json = await resp.json().catch(() => ({}));
				throw new Error(
					{
						missingPermission:
							"You don't have permission to do that.",
						insufficientRank:
							"You can't manage someone ranked at or above you.",
					}[json.type] ||
						"Response code is not OK; code is " + resp.status
				);
			}
		} catch (e) {
			roleError = e;
		}
	}

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
		{#if canRemove || isAdmin}
			<button
				class="long"
				on:click={() =>
					modals.replaceLastModal(RemoveMemberModal, {username})}
			>
				Remove from chat
			</button>
		{/if}
		{#if canBan || (isAdmin && !isSelf)}
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
		{#if ($chat.owner == $user.name && username != $user.name) || isAdmin}
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
		{#if isGroup && sortedRoles.length}
			<h3 class="roles-title">Roles</h3>
			<div class="roles-list">
				{#each sortedRoles as role (role._id)}
					<label class="role-row">
						<input
							type="checkbox"
							checked={($chat.member_roles?.[username] ||
								[]
							).includes(role._id)}
							disabled={!canAssignRole(
								$chat,
								$user.name,
								username,
								role
							)}
							on:change={e =>
								toggleMemberRole(role, e.target.checked)}
						/>
						{role.name}
					</label>
				{/each}
			</div>
			{#if roleError}
				<p style="color: crimson;">{roleError}</p>
			{/if}
		{/if}
	</div>
</Modal>

<style>
	.long {
		width: 100%;
		margin: 0;
		margin-bottom: 0.2em;
	}
	.roles-title {
		margin: 0.6em 0 0.3em 0;
		font-size: 1em;
	}
	.roles-list {
		display: flex;
		flex-direction: column;
		gap: 0.3em;
	}
	.role-row {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}
</style>
