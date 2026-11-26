<!-- Right-side chats list for the new layout (wide screens) -->
<script>
	import ChatIcon from "../ChatIcon.svelte";
	import PFP from "../PFP.svelte";

	import {chats, user} from "../stores.js";
	import {chatReads, chatMentions, isChatUnread, isChatMentioned} from "../unread.js";
	import loadProfile, {profileCache} from "../loadProfile.js";

	import liveIcon from "../../assets/chat_join.svg";

	import {goto, isActive} from "@roxi/routify";

	const byActivity = (a, b) => (b.last_active || 0) - (a.last_active || 0);
	$: pinned = $chats
		.filter(c => $user.favorited_chats.includes(c._id))
		.sort(byActivity);
	$: unpinned = $chats
		.filter(c => !$user.favorited_chats.includes(c._id))
		.sort(byActivity);
	$: sorted = [...pinned, ...unpinned];
	$: sorted.forEach(chat => {
		if (chat.type === 1)
			loadProfile(
				chat.members.filter(m => m !== $user.name)[0]
			).catch(() => {});
	});

	function dmPartner(chat) {
		return chat.members.filter(m => m !== $user.name)[0] || "";
	}
</script>

<aside class="chats-panel" aria-label="Chats">
	<h2 class="panel-title">Chats</h2>
	<div class="panel-list">
		<button
			class="panel-chat"
			class:active={$isActive("./chats/:id", {id: "livechat"})}
			on:click={() => $goto("/chats/livechat")}
		>
			<span class="icon-box live-icon">
				<img src={liveIcon} alt="" draggable={false} />
			</span>
			<span class="panel-name">Livechat</span>
		</button>
		{#each sorted as chat, i (chat._id)}
			{#if pinned.length && i === pinned.length}
				<hr class="panel-divider" />
			{/if}
			<button
				class="panel-chat"
				class:active={$isActive("./chats/:id", {id: chat._id})}
				on:click={() => $goto(`/chats/${chat._id}`)}
			>
				{#if chat.type === 1}
					{@const partner = dmPartner(chat)}
					<span class="icon-box mpfp">
						<PFP
							icon={($profileCache[partner] || {}).pfp_data ||
								-1}
							avatar={($profileCache[partner] || {}).avatar}
							avatarColor={($profileCache[partner] || {})
								.avatar_color}
							alt="{partner}'s profile picture"
							size={0.37}
						/>
					</span>
					<span class="panel-name"
						>{($profileCache[partner] || {}).display_name ||
							`@${partner}`}{#if (
							$profileCache[partner] || {}
						).display_name}<span class="panel-username"
								>@{partner}</span
							>{/if}</span
					>
				{:else}
					<ChatIcon {chat} size={0.5} />
					<span class="panel-name"
						>{chat.nickname ||
							chat.members
								.filter(m => m !== undefined)
								.join(", ")}</span
					>
				{/if}
				{#if isChatMentioned(chat, $chatReads, $chatMentions)}
					<span class="mention-pill" aria-label="Mentioned">@</span>
				{:else if isChatUnread(chat, $chatReads)}
					<span class="panel-badge" aria-label="Unread" />
				{/if}
			</button>
		{/each}
	</div>
</aside>

<style>
	.chats-panel {
		position: sticky;
		top: 0.8em;
		align-self: flex-start;
		width: 280px;
		flex-shrink: 0;
		max-height: calc(100dvh - 1.6em);
		display: flex;
		flex-direction: column;
		padding: 0.7em;
		box-sizing: border-box;
		background-color: var(--surface);
		border: solid 1px var(--hairline);
		border-radius: var(--m-radius);
		user-select: none;
	}
	.panel-title {
		margin: 0 0 0.4em;
		font-size: 1em;
		padding-left: 0.4em;
	}
	.panel-list {
		display: flex;
		flex-direction: column;
		gap: 0.1em;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--hairline) transparent;
	}
	.panel-list::-webkit-scrollbar {
		width: 5px;
	}
	.panel-list::-webkit-scrollbar-thumb {
		background: var(--hairline);
		border-radius: 99px;
	}
	.panel-divider {
		border: none;
		height: 1px;
		margin: 0.4em 0.6em;
		background: var(--hairline);
	}
	.panel-chat {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.55em;
		padding: 0.45em 0.55em;
		border: none;
		border-radius: 12px;
		background: none;
		color: var(--foreground);
		font-family: inherit;
		font-size: 0.92em;
		cursor: pointer;
		text-align: left;
	}
	.panel-chat:hover {
		background-color: var(--surface-2);
	}
	.panel-chat.active {
		background-color: var(--orange);
		color: var(--foreground-orange);
	}
	.icon-box {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.375em;
		height: 1.375em;
		flex-shrink: 0;
	}
	.live-icon {
		border-radius: 35%;
		background-color: var(--orange);
	}
	.live-icon img {
		width: 60%;
		height: 60%;
		object-fit: contain;
	}
	.panel-chat.active .live-icon {
		background-color: var(--foreground-orange);
	}
	/* @username goes under the display name */
	.panel-username {
		display: block;
		font-size: 0.78em;
		line-height: 1.1;
		opacity: 0.55;
		font-weight: normal;
	}
	.panel-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.panel-badge {
		width: 0.55em;
		height: 0.55em;
		border-radius: 50%;
		background: var(--orange);
		flex-shrink: 0;
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
		font-size: 0.7em;
		font-weight: 700;
		line-height: 1;
		flex-shrink: 0;
	}
</style>
