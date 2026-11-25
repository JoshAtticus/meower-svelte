<!-- The "more" dropdown on a chat card (pin / unpin, leave). Bottom sheet on mobile. -->
<script>
	import BasicModal from "./modals/Basic.svelte";
	import LeaveChatModal from "./modals/chats/LeaveChat.svelte";
	import ChatSoundsModal from "./modals/chats/ChatSounds.svelte";

	import {chats, user} from "./stores.js";
	import {mobile} from "./responsiveness.js";
	import {portal} from "./portal.js";
	import {swipeDismiss} from "./swipeDismiss.js";
	import * as modals from "./modals.js";
	import * as clm from "./clmanager.js";

	export let chat;

	let open = false;
	$: pinned = $user.favorited_chats.includes(chat._id);

	function togglePin() {
		if (pinned) {
			$user.favorited_chats.splice($user.favorited_chats.indexOf(chat._id), 1);
			clm.updateProfile({favorited_chats: $user.favorited_chats});
			return;
		}
		$user.favorited_chats = $user.favorited_chats.filter(chatId =>
			$chats.some(_chat => _chat._id === chatId)
		);
		if ($user.favorited_chats.length >= 50) {
			modals.showModal(BasicModal, {
				title: "Too many pins!",
				desc: "Sorry, you can only have up to 50 pinned chats!",
			});
		} else {
			$user.favorited_chats.push(chat._id);
			clm.updateProfile({favorited_chats: $user.favorited_chats});
		}
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<span class="wrap" on:click|stopPropagation>
	<button
		type="button"
		class="circle more trigger"
		title="More"
		aria-label="More"
		aria-expanded={open}
		on:click={() => (open = !open)}
	/>
	{#if open}
		{#if $mobile}
			<div class="sheet-overlay" use:portal on:click={() => (open = false)} />
		{:else}
			<div class="backdrop" on:click={() => (open = false)} />
		{/if}
		<div
			class="settings-controls menu"
			class:action-sheet={$mobile}
			class:open={$mobile}
			class:icon-menu={!$mobile}
			use:portal={$mobile}
			use:swipeDismiss={{enabled: $mobile, onDismiss: () => (open = false)}}
			on:click={() => setTimeout(() => (open = false))}
		>
			<button
				type="button"
				class="circle star"
				class:filled={pinned}
				title={pinned ? "Unpin chat" : "Pin chat"}
				on:click={togglePin}
			/>
			<button
				type="button"
				class="circle settings"
				title="Notification sounds"
				on:click={() => modals.showModal(ChatSoundsModal, {chat})}
			/>
			{#if !pinned}
				<button
					type="button"
					class="circle close"
					title="Leave chat"
					on:click={() => modals.showModal(LeaveChatModal, {chat})}
				/>
			{/if}
		</div>
	{/if}
</span>

<style>
	.wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
	}
	.trigger {
		margin: 0;
		border: none;
	}
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 49;
	}
	.menu:not(.action-sheet) {
		position: absolute;
		right: 0;
		top: calc(100% + 4px);
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 150px;
		padding: 4px;
		background: var(--background);
		border: 2px solid var(--orange);
		border-radius: 0.8em;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
	}
	.menu:not(.action-sheet) button.circle {
		width: 100%;
		height: auto;
		min-height: 2.4em;
		margin: 0;
		border: none;
		border-radius: 6px;
		background-color: transparent;
		background-position: 0.7em center;
		background-size: 1.1em;
		padding-left: 2.6em;
		text-align: left;
		color: inherit;
		font-size: 0.95em;
		transform: none !important;
	}
	.menu:not(.action-sheet) button.circle::after {
		content: attr(title);
	}
	.menu:not(.action-sheet) button.circle:hover,
	.menu:not(.action-sheet) button.circle:focus-visible {
		background-color: rgba(255, 255, 255, 0.12);
		outline: none;
	}
</style>
