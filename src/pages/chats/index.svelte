<!--
	The chat list
	The part before the group chats™
	
	Or:

	Home but it's a list of group chats.
-->
<script>
	import Container from "../../lib/Container.svelte";
	import FormattedDate from "../../lib/FormattedDate.svelte";
	import ChatIcon from "../../lib/ChatIcon.svelte";
	import ChatCardMenu from "../../lib/ChatCardMenu.svelte";
	import ProfileView from "../..//lib/ProfileView.svelte";

	import BasicModal from "../../lib/modals/Basic.svelte";
	import AccountBannedModal from "../../lib/modals/safety/AccountBanned.svelte";
	import CreateChatModal from "../../lib/modals/chats/CreateChat.svelte";
	import LeaveChatModal from "../../lib/modals/chats/LeaveChat.svelte";

	import {chats, user, authHeader} from "../../lib/stores.js";
	import {chatReads, chatMentions, isChatUnread, isChatMentioned} from "../../lib/unread.js";
	import {apiUrl} from "../../lib/urls.js";
	import {default as loadProfile, profileCache} from "../../lib/loadProfile.js";
	import PFP from "../../lib/PFP.svelte";
	import {userRestrictions, isRestricted} from "../../lib/bitField.js";
	import * as modals from "../../lib/modals.js";
	import * as clm from "../../lib/clmanager.js";

	import {fly} from "svelte/transition";
	import {flip} from "svelte/animate";

	import {goto} from "@roxi/routify";
	import {onMount, onDestroy} from "svelte";

	let favoritedChats, nonFavoritedChats, sortedChats;

	let invites = [];
	let inviteErrors = {};
	let inviteEvent = null;

	async function loadInvites() {
		try {
			const resp = await fetch(`${apiUrl}invites/`, {
				headers: $authHeader,
			});
			if (resp.ok) invites = (await resp.json()).autoget;
		} catch {}
	}

	async function respondToInvite(invite, accept) {
		inviteErrors[invite._id] = "";
		try {
			const resp = await fetch(`${apiUrl}invites/${invite._id}${accept ? "/accept" : ""}`, {
				method: accept ? "POST" : "DELETE",
				headers: $authHeader,
			});
			if (!resp.ok) {
				const json = await resp.json();
				if (json.type === "chatBanned") {
					throw new Error(
						"You have been banned from this chat."
					);
				}
				throw new Error(
					"Response code is not OK; code is " + resp.status
				);
			}
			invites = invites.filter(i => i._id !== invite._id);
			if (accept) $goto(`/chats/${invite.chat_id}`);
		} catch (e) {
			inviteErrors[invite._id] = e.message;
		}
	}

	onMount(() => {
		loadInvites();
		inviteEvent = clm.link.on("direct", cmd => {
			if (cmd.val && cmd.val.mode === "chat_invite") loadInvites();
		});
	});

	onDestroy(() => {
		if (inviteEvent) clm.link.off(inviteEvent);
	});

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
	{#if invites.length > 0}
		<Container>
			<h2>Group Chat Invites</h2>
			{#each invites as invite (invite._id)}
				<div class="invite">
					<span>
						<b>@{invite.from}</b> invited you to join
						<b>{invite.chat_nickname || "a group chat"}</b>
						{#if invite.expires}
							<i>(expires <FormattedDate date={invite.expires} />)</i>
						{/if}
					</span>
					<span class="invite-buttons">
						<button
							on:click={() => respondToInvite(invite, true)}
							>Accept</button
						>
						<button
							on:click={() => respondToInvite(invite, false)}
							>Decline</button
						>
					</span>
					{#if inviteErrors[invite._id]}
						<p style="color: crimson;">{inviteErrors[invite._id]}</p>
					{/if}
				</div>
			{/each}
		</Container>
	{/if}
	<Container>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="chat clickable"
			role="link"
			tabindex="0"
			on:click={() => $goto("/chats/livechat")}
			on:keydown={e => e.key === "Enter" && $goto("/chats/livechat")}
		>
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
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<div
						class="chat clickable"
						role="link"
						tabindex="0"
						on:click={() => $goto(`/chats/${chat._id}`)}
						on:keydown={e =>
							e.key === "Enter" && $goto(`/chats/${chat._id}`)}
					>
						<div class="settings-controls">
							<ChatCardMenu {chat} />
						</div>

						<button
							type="button"
							class="chat-heading"
							title="Open {chat.nickname}"
							on:click={() => $goto(`/chats/${chat._id}`)}
						>
							<span class="chat-heading-icon"><ChatIcon {chat} /></span>
							{#if isChatMentioned(chat, $chatReads, $chatMentions)}
								<span class="mention-pill" aria-label="Mentioned">@</span>
							{:else if isChatUnread(chat, $chatReads)}
								<span class="unread-dot" />
							{/if}
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
				{#if chat.dm_request && chat.dm_request.to === $user.name && chat.dm_request.from}
					<Container>
						<b>@{chat.dm_request.from}</b> sent you a message
						request.
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
					unread={isChatUnread(chat, $chatReads)}
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
	.chat.clickable {
		cursor: pointer;
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
	.mention-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.3em;
		height: 1.3em;
		padding: 0 0.25em;
		box-sizing: border-box;
		border-radius: 999px;
		background: crimson;
		color: white;
		font-size: 0.6em;
		font-weight: 700;
		line-height: 1;
		flex-shrink: 0;
	}
	.unread-dot {
		display: inline-block;
		width: 0.55em;
		height: 0.55em;
		border-radius: 50%;
		background: var(--orange);
		flex-shrink: 0;
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
	.invite {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5em;
		padding: 0.3em 0;
	}
	.invite-buttons {
		display: flex;
		gap: 0.4em;
	}
</style>
