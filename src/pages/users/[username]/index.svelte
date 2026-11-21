<!-- The profile page, now with viewing others' profiles. -->
<script>
	import ProfileView from "../../../lib/ProfileView.svelte";
	import Loading from "../../../lib/Loading.svelte";
	import Container from "../../../lib/Container.svelte";
	import PostList from "../../../lib/PostList.svelte";
	import EditProfileModal from "../../../lib/modals/EditProfile.svelte";
	import AddMemberProfileModal from "../../../lib/modals/chats/AddMember_Profile.svelte";
	import BlockUserModal from "../../../lib/modals/safety/BlockUser.svelte";
	import RemoveFriendModal from "../../../lib/modals/RemoveFriend.svelte";

	import {relationships, friends, user} from "../../../lib/stores.js";
	import {apiUrl, encodeApiURLParams} from "../../../lib/urls.js";
	import * as modals from "../../../lib/modals.js";
	import * as clm from "../../../lib/clmanager.js";

	import {params, goto} from "@roxi/routify";

	async function loadProfile() {
		let path = `users/${$params.username}`;
		if (encodeApiURLParams) path = encodeURIComponent(path);
		const resp = await fetch(`${apiUrl}${path}`);
		if (!resp.ok) {
			throw new Error("Response code is not OK; code is " + resp.status);
		}
		const json = await resp.json();
		return json;
	}

</script>

<div>
	{#await loadProfile()}
		<div class="fullcenter">
			<Loading />
		</div>
	{:then data}
		{@const profileColor =
			(data._id === $user.name
				? $user.avatar_color
				: data.avatar_color) || ""}
		<div
			style:--orange={/^[0-9a-fA-F]{6}$/.test(profileColor) &&
			profileColor !== "000000"
				? `#${profileColor}`
				: null}
			style:--orange-button={/^[0-9a-fA-F]{6}$/.test(profileColor) &&
			profileColor !== "000000"
				? `#${profileColor}`
				: null}
			style:--orange-light={/^[0-9a-fA-F]{6}$/.test(profileColor) &&
			profileColor !== "000000"
				? `color-mix(in srgb, #${profileColor} 60%, white)`
				: null}
			style:--orange-dark={/^[0-9a-fA-F]{6}$/.test(profileColor) &&
			profileColor !== "000000"
				? `color-mix(in srgb, #${profileColor} 70%, black)`
				: null}
		>
		<ProfileView
			profile={data}
			canDoActions={true}
			onEdit={$user.name === data._id
				? () => modals.showModal(EditProfileModal)
				: null}
		/>

		{#if data._id === $user.name ? $user.quote : data.quote}
			<Container>
				<h3>Quote</h3>
				<p>"<i>{data._id === $user.name ? $user.quote : data.quote}</i>"</p>
			</Container>
		{/if}


		{#if $user.name && $user.name !== data._id}
			{#if $relationships[data._id] !== 2}
				{#if $friends.friends.includes(data._id)}
					<button
						class="long"
						on:click={() =>
							modals.showModal(RemoveFriendModal, {
								username: data._id,
							})}>Remove Friend</button
					>
				{:else if $friends.outgoing.includes(data._id)}
					<button
						class="long"
						on:click={() => clm.setRelationship(data._id, 0)}
						>Cancel Friend Request</button
					>
				{:else if $friends.incoming.includes(data._id)}
					<button
						class="long"
						on:click={() => clm.setRelationship(data._id, 1)}
						>Accept Friend Request</button
					>
				{:else}
					<button
						class="long"
						on:click={() => clm.setRelationship(data._id, 1)}
						>Send Friend Request</button
					>
				{/if}
				<button
					class="long"
					on:click={() =>
						modals.showModal(AddMemberProfileModal, {
							username: data._id,
						})}>Add to Chat</button
				>
			{/if}
			<button
				class="long"
				title="{$relationships[data._id] === 2 ? 'Unb' : 'B'}lock User"
				on:click={() =>
					modals.showModal(BlockUserModal, {username: data._id})}
				>{$relationships[data._id] === 2 ? "Unb" : "B"}lock User</button
			>
		{/if}

		<h2 class="recent-title">Recent Posts</h2>
		{#key data._id}
			<PostList
				fetchUrl="users/{data._id}/posts"
				postOrigin=""
				canPost={false}
				showJump={true}
			>
				<Container slot="empty">
					{data._id} hasn't made any posts yet.
				</Container>
			</PostList>
		{/key}
		</div>
	{:catch}
		<ProfileView username={$params.username} />
	{/await}
</div>

<style>
	.recent-title {
		margin: 0.75em 0 0.4em 0.2em;
	}
	.fullcenter {
		text-align: center;
		display: flex;
		justify-content: center;
		align-items: center;

		width: 100vw;
		height: 100vh;

		position: fixed;
		top: 0;
		left: 0;
	}

	.long {
		width: 100%;
		margin: 0;
		margin-bottom: 0.2em;
	}

</style>
