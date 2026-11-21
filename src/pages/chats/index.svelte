<!--
	The chat list
	The part before the group chats™
	
	Or:

	Home but it's a list of group chats.
-->
<script>
	import Container from "../../lib/Container.svelte";
	import ChatIcon from "../../lib/ChatIcon.svelte";
	import ProfileView from "../..//lib/ProfileView.svelte";

	import BasicModal from "../../lib/modals/Basic.svelte";
	import AccountBannedModal from "../../lib/modals/safety/AccountBanned.svelte";
	import CreateChatModal from "../../lib/modals/chats/CreateChat.svelte";
	import LeaveChatModal from "../../lib/modals/chats/LeaveChat.svelte";

	import {chats, user} from "../../lib/stores.js";
	import {default as loadProfile, profileCache} from "../../lib/loadProfile.js";
	import PFP from "../../lib/PFP.svelte";
	import {userRestrictions, isRestricted} from "../../lib/bitField.js";
	import * as modals from "../../lib/modals.js";
	import * as clm from "../../lib/clmanager.js";

	import {fly} from "svelte/transition";
	import {flip} from "svelte/animate";

	import {goto} from "@roxi/routify";

	let favoritedChats, nonFavoritedChats, sortedChats;

	$: {
		favoritedChats = $chats
			.filter(_chat => $user.favorited_chats.includes(_chat._id))
			.sort((a, b) => {
				//return $user.favorited_chats.indexOf(a._id) - $user.favorited_chats.indexOf(b._id);
				return b.last_active - a.last_active;
			});

		nonFavoritedChats = $chats
			.filter(_chat => !$user.favorited_chats.includes(_chat._id))
			.sort((a, b) => {
				return b.last_active - a.last_active;
			});

		sortedChats = favoritedChats.concat(nonFavoritedChats);

		sortedChats.forEach(chat =>
			chat.members.slice(0, 5).forEach(m => loadProfile(m).catch(() => {}))
		);
	}
</script>

<div class="chats">
	<Container>
		<h1>Chats</h1>
		Here are your chats. Press the chat button to enter a chat, and the plus
		to create one.
		<div class="settings-controls">
			<button
				class="circle plus"
				on:click={() => {
					if (isRestricted(userRestrictions.NEW_CHATS)) {
						modals.showModal(AccountBannedModal, {
							ban: $user.ban,
							feature: "creating group chats",
						});
					} else {
						modals.showModal(CreateChatModal);
					}
				}}
			/>
		</div>
	</Container>
	<Container>
		<div class="chat">
			<div class="settings-controls">
				<button
					class="circle join"
					on:click={$goto("/chats/livechat")}
				/>
			</div>

			<h1>Livechat</h1>
			Post history isn't saved here.
		</div>
	</Container>
	{#each sortedChats as chat (chat._id)}
		<div
			transition:fly|local={{y: -50, duration: 250}}
			animate:flip={{duration: 250}}
		>
			{#if chat.type === 0}
				<Container>
					<div class="chat">
						<div class="settings-controls">
							<button
								class="circle star"
								class:filled={$user.favorited_chats.includes(
									chat._id
								)}
								on:click={() => {
									if (
										$user.favorited_chats.includes(chat._id)
									) {
										$user.favorited_chats.splice(
											$user.favorited_chats.indexOf(
												chat._id
											),
											1
										);
										clm.updateProfile({
											favorited_chats:
												$user.favorited_chats,
										});
									} else {
										$user.favorited_chats =
											$user.favorited_chats.filter(
												chatId => {
													return $chats.some(
														_chat =>
															_chat._id === chatId
													);
												}
											);
										if (
											$user.favorited_chats.length >= 50
										) {
											modals.showModal(BasicModal, {
												title: "Too many stars!",
												desc: "Sorry, you can only have up to 50 favorited chats!",
											});
										} else {
											$user.favorited_chats.push(
												chat._id
											);
											clm.updateProfile({
												favorited_chats:
													$user.favorited_chats,
											});
										}
									}
								}}
							/>
							{#if !$user.favorited_chats.includes(chat._id)}
								<button
									class="circle close"
									on:click={() =>
										modals.showModal(LeaveChatModal, {
											chat,
										})}
								/>
							{/if}
							<button
								class="circle join"
								on:click={$goto(`/chats/${chat._id}`)}
							/>
						</div>

						<button
							type="button"
							class="chat-heading"
							title="Open {chat.nickname}"
							on:click={() => $goto(`/chats/${chat._id}`)}
						>
							<span class="chat-heading-icon"><ChatIcon {chat} /></span>
							<h1>{chat.nickname}</h1>
						</button>
						<div class="member-stack">
							{#each chat.members.slice(0, 5) as member}
								<span class="member-pfp">
									<PFP
										icon={($profileCache[member] || {})
											.pfp_data || -1}
										avatar={($profileCache[member] || {})
											.avatar}
										avatarColor={($profileCache[member] ||
											{}).avatar_color}
										alt="{member}'s profile picture"
										size={0.6}
									/>
								</span>
							{/each}
							<span class="member-count">
								{chat.members.length} member{chat.members
									.length === 1
									? ""
									: "s"}
							</span>
						</div>
					</div>
				</Container>
			{:else if chat.type === 1}
				{#if chat.dm_request && chat.dm_request.from !== $user.name}
					<Container>
						<b>@{chat.dm_request.from}</b> sent you a DM
						request — open the chat to accept or decline it.
					</Container>
				{/if}
				<ProfileView
					username={chat.members.filter(
						username => username !== $user.name
					)[0]}
					small={true}
					canClick={true}
					canDoActions={true}
					dmChat={chat}
				/>
			{/if}
		</div>
	{/each}
</div>

<style>
	.chats {
		height: 100%;
	}
	.chat {
		min-height: 4.5em;
	}
	.chat-heading {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0;
		margin: 0;
		border: none;
		background: none !important;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.chat-heading-icon {
		display: inline-flex;
		transition: transform 0.15s;
	}
	:global(main.input-hover) .chat-heading:hover .chat-heading-icon,
	:global(main.input-touch) .chat-heading:active .chat-heading-icon,
	.chat-heading:focus-visible .chat-heading-icon {
		transform: scale(1.1);
	}
	.chat-heading h1 {
		margin: 0 0 0.1em;
	}
	.member-stack {
		display: flex;
		align-items: center;
		margin-top: 0.3em;
	}
	.member-pfp {
		margin-left: -0.5em;
	}
	.member-pfp:first-child {
		margin-left: 0;
	}
	.member-count {
		margin-left: 0.6em;
		font-size: 0.9em;
	}
	.settings-controls {
		position: absolute;
		top: 0.25em;
		right: 0.25em;
	}
	button.circle {
		border: none;
		margin: 0;
		margin-left: 0.125em;
	}
</style>
