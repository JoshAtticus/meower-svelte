<!--
	Profile view thing to make codebase better

	(Arrow I swear if you comment that this makes your life harder)

	Args:
		Username: The profile username
		Profile: Custom profile JSON, Optional
		Small: If True, the View will be shorter
		CanClick: If True, when you click the PFP, it will go to their profile
		CloseCurrentModal (Defaults to true): If false, the current Modal wont close when Clicking the PFP 
-->

<script>
	import Loading from "./Loading.svelte";
	import Container from "./Container.svelte";
	import PFP from "./PFP.svelte";
	import LiText from "./LiText.svelte";
	import FormattedDate from "./FormattedDate.svelte";
	import Badge from "./Badge.svelte";

	import BasicModal from "./modals/Basic.svelte";
	import LeaveChatModal from "./modals/chats/LeaveChat.svelte";
	import ModerateUserModal from "./modals/moderation/ModerateUser.svelte";
	import ReportUserModal from "./modals/safety/ReportUser.svelte";
	import AccountBannedModal from "./modals/safety/AccountBanned.svelte";

	import {authHeader, chats, ulist, user} from "./stores.js";
	import {apiUrl} from "./urls.js";
	import {userFlags} from "./bitField.js";
	import loadProfile from "./loadProfile.js";
	import * as clm from "./clmanager.js";
	import * as modals from "./modals.js";

	import {goto} from "@roxi/routify";

	export let username = "";
	export let profile = null;
	export let small = false;
	export let canClick = false;
	export let canDoActions = false;
	export let dmChat = null;
	export let onEdit = null;
	export let unread = false;

	// takes the current user as an argument so the template redraws when
	// your own display name changes
	function displayName(data, me) {
		return (
			(data._id === me.name
				? me.display_name ?? data.display_name
				: data.display_name) || ""
		);
	}

	// long names shrink instead of overflowing the card
	function nameSize(name) {
		return name.length > 22 ? "1.7em" : name.length > 14 ? "2.2em" : null;
	}

	function load() {
		if (profile) {
			return profile;
		}
		return loadProfile(username, true);
	}
</script>

<div>
	{#await load()}
		<div class="center">
			<Loading />
		</div>
	{:then data}
		<Container>
			<div class="settings-controls">
				{#if onEdit}
					<button
						class="circle pen"
						title="Edit profile"
						on:click={onEdit}
					/>
				{/if}
				{#if dmChat}
					<button
						class="circle star"
						class:filled={$user.favorited_chats.includes(
							dmChat._id
						)}
						on:click={() => {
							if ($user.favorited_chats.includes(dmChat._id)) {
								$user.favorited_chats.splice(
									$user.favorited_chats.indexOf(dmChat._id),
									1
								);
								clm.updateProfile({
									favorited_chats: $user.favorited_chats,
								});
							} else {
								$user.favorited_chats =
									$user.favorited_chats.filter(chatId => {
										return $chats.some(
											_chat => _chat._id === chatId
										);
									});
								if ($user.favorited_chats.length >= 50) {
									modals.showModal(BasicModal, {
										title: "Too many stars!",
										desc: "Sorry, you can only have up to 50 favorited chats!",
									});
								} else {
									$user.favorited_chats.push(dmChat._id);
									clm.updateProfile({
										favorited_chats: $user.favorited_chats,
									});
								}
							}
						}}
					/>
					{#if !$user.favorited_chats.includes(dmChat._id)}
						<button
							class="circle close"
							on:click={() =>
								modals.showModal(LeaveChatModal, {
									chat: dmChat,
								})}
						/>
					{/if}
					<button
						class="circle join"
						on:click={$goto(`/chats/${dmChat._id}`)}
					/>
				{:else if canDoActions && $user.name}
					{#if $user.permissions}
						<button
							title="Moderate {data._id}"
							class="circle admin"
							on:click={() =>
								modals.showModal(ModerateUserModal, {
									username: data._id,
								})}
						/>
					{/if}
					{#if data._id !== $user.name && (data.flags & userFlags.SYSTEM) !== userFlags.SYSTEM && (data.flags & userFlags.DELETED) !== userFlags.DELETED}
						<button
							title="Report {data._id}"
							class="circle report"
							on:click={() =>
								modals.showModal(ReportUserModal, {user: data})}
						/>
						<button
							title="Open DM with {data._id}"
							class="circle join"
							on:click={async () => {
								let chat = $chats.find(
									_chat =>
										_chat.type === 1 &&
										_chat.members.includes(data._id)
								);
								if (chat) {
									$goto(`/chats/${chat._id}`);
								} else {
									try {
										const resp = await fetch(
											`${apiUrl}users/${data._id}/dm`,
											{
												method: "GET",
												headers: $authHeader,
											}
										);
										if (!resp.ok) {
											switch (resp.status) {
												case 403:
													modals.showModal(
														AccountBannedModal,
														{
															ban: $user.ban,
															feature:
																"starting direct message chats",
														}
													);
													return;
												case 429:
													throw new Error(
														"Too many requests! Try again later."
													);
												default:
													throw new Error(
														"Response code is not OK; code is " +
															resp.status
													);
											}
										}
										const chat = await resp.json();
										if (
											$chats.findIndex(
												_chat => _chat._id === chat._id
											) === -1
										) {
											$chats.push(chat);
										}
										$goto(`/chats/${chat._id}`);
									} catch (e) {
										modals.showModal(BasicModal, {
											title: "Failed to open DM",
											desc: `Failed to open DM with ${data._id}. ${e}`,
										});
									}
								}
							}}
						/>
					{/if}
				{/if}
			</div>

			<div class="profile-header">
				{#if canClick}
					<button
						class="clickable-pfp"
						on:click={$goto(`/users/${data._id}`)}
					>
						<PFP
							online={$ulist.includes(data._id)}
							icon={data._id === $user.name
								? $user.pfp_data
								: data.pfp_data}
							avatar={data._id === $user.name
								? $user.avatar
								: data.avatar}
							avatarColor={data._id === $user.name
								? $user.avatar_color
								: data.avatar_color}
							alt="{data._id}'s profile picture"
							size={small ? 1 : 1.4}
						/>
					</button>
				{:else}
					<PFP
						online={$ulist.includes(data._id)}
						icon={data._id === $user.name
							? $user.pfp_data
							: data.pfp_data}
						avatar={data._id === $user.name
							? $user.avatar
							: data.avatar}
						avatarColor={data._id === $user.name
							? $user.avatar_color
							: data.avatar_color}
						alt="{data._id}'s profile picture"
						size={small ? 1 : 1.4}
					/>
				{/if}
				<div class="profile-header-info" class:small>
					{#if small}
						<h2 class="profile-username">
							{#if unread}<span class="unread-dot" />{/if}<LiText
								text={displayName(data, $user) || data._id}
							/>{#if data.bot}
								<Badge text="BOT" title="Bot account" />
							{/if}
							{#if displayName(data, $user)}<span class="profile-username-sub"
									>@{data._id}</span
								>{/if}
						</h2>
					{:else}
						<h1
							class="profile-username"
							style:font-size={nameSize(displayName(data, $user) || data._id)}
						>
							<LiText text={displayName(data, $user) || data._id} />
							{#if data.bot}
								<span class="profile-bot-badge"
									><Badge text="BOT" title="Bot account" /></span
								>
							{/if}
						</h1>
						{#if displayName(data, $user)}
							<div class="profile-username-sub">@{data._id}</div>
						{/if}
					{/if}
					<div class="profile-active">
						{#if $ulist.includes(data._id)}
							Online
						{:else if (data.flags & userFlags.SYSTEM) === userFlags.SYSTEM}
							System
						{:else if (data.flags & userFlags.DELETED) === userFlags.DELETED}
							Deleted
						{:else if data.banned}
							Banned
						{:else if data.last_seen}
							Offline since <FormattedDate
								date={data.last_seen}
							/>
						{:else}
							Offline
						{/if}
					</div>
					{#if data.bot && data.bot_owner}
						<div class="profile-bot">
							Bot owned by <a
								href="/users/{data.bot_owner}"
								on:click|preventDefault={$goto(
									`/users/${data.bot_owner}`
								)}>@{data.bot_owner}</a
							>
						</div>
					{/if}
				</div>
			</div>
		</Container>
	{:catch e}
		<Container>
			<h2>Error</h2>
			We couldn't get this user's profile info.
			<pre><code>{e}</code></pre>
			Try again. If this issue persists,
			<a
				href="https://github.com/Meower-Media-Co/Meower-Svelte/issues/new"
				>create an issue on Meower Svelte's issue tracker</a
			> with the error code shown above.
		</Container>
	{/await}
</div>

<style>
	.profile-header-info {
		display: flex;
		flex-direction: column;
		align-items: left;
		justify-content: center;
		margin-left: 1em;
		min-height: 6em;
		min-width: 0;
		flex: 1;
		/* leave room for the buttons in the corner */
		padding-right: 4.5em;
	}
	.profile-username {
		overflow-wrap: anywhere;
	}
	.profile-header-info.small {
		height: 4.5em;
	}

	.profile-username {
		margin: 0;
		padding: 0;
		display: inline-block;
		max-width: 100%;
		font-size: 3em;
		line-height: 1;
	}
	h2.profile-username {
		font-size: 200%;
	}

	.profile-username-sub {
		font-size: 0.95em;
		font-weight: normal;
		line-height: 1.1;
		opacity: 0.65;
		/* the big name has empty space below its baseline; pull up to match the
		   gap under the username */
		margin: -0.3em 0 0;
	}
	/* small headers (DMs, chat lists): @username sits under the name */
	.small .profile-username-sub {
		display: block;
		font-size: 0.55em;
		margin: 0;
	}

	.profile-active {
		margin: 0.05em 0 0;
		line-height: 1.1;
	}

	.unread-dot {
		display: inline-block;
		width: 0.55em;
		height: 0.55em;
		border-radius: 50%;
		background: crimson;
		margin-right: 0.15em;
	}

	.clickable-pfp {
		padding: 0;
		border: none;
		background: none !important;
		color: inherit;
	}
	:global(main.input-hover) .clickable-pfp:hover:not(:active) :global(.pfp),
	:global(main.input-touch) .clickable-pfp:active :global(.pfp),
	.clickable-pfp:focus-visible :global(.pfp) {
		transform: scale(1.1);
	}

	.profile-header {
		display: flex;
		align-items: center;
		/* never drop the name under the picture, however long it is */
		flex-wrap: nowrap;
	}
	/* keep the BOT badge badge-sized next to the big name */
	.profile-bot-badge {
		font-size: 0.4em;
		vertical-align: middle;
	}
</style>
