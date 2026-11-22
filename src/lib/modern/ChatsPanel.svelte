<!-- Right-side chats list for the new layout (wide screens) -->
<script>
	import ChatIcon from "../ChatIcon.svelte";

	import {chats} from "../stores.js";
	import {chatReads, isChatUnread} from "../unread.js";

	import {goto, isActive} from "@roxi/routify";

	$: sorted = [
		...$chats.filter(c => c.favorite),
		...$chats.filter(c => !c.favorite),
	];
</script>

<aside class="chats-panel" aria-label="Chats">
	<h2 class="panel-title">Chats</h2>
	<div class="panel-list">
		<button
			class="panel-chat"
			class:active={$isActive("./chats/:id", {id: "livechat"})}
			on:click={() => $goto("/chats/livechat")}
		>
			<span class="live-icon">!</span>
			<span class="panel-name">Livechat</span>
		</button>
		{#each sorted as chat (chat._id)}
			<button
				class="panel-chat"
				class:active={$isActive("./chats/:id", {id: chat._id})}
				on:click={() => $goto(`/chats/${chat._id}`)}
			>
				<ChatIcon {chat} size={0.45} />
				<span class="panel-name"
					>{chat.nickname ||
						chat.members
							.filter(m => m !== undefined)
							.join(", ")}</span
				>
				{#if isChatUnread(chat, $chatReads)}
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
	.live-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.7em;
		height: 1.7em;
		border-radius: 35%;
		background-color: var(--orange);
		color: var(--foreground-orange);
		font-weight: bold;
		flex-shrink: 0;
	}
	.panel-chat.active .live-icon {
		background-color: var(--foreground-orange);
		color: var(--orange);
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
		background: crimson;
		flex-shrink: 0;
	}
</style>
