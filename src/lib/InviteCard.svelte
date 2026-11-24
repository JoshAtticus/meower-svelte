<!-- A group chat invite: shown on the invite page and under messages that contain an invite link. -->
<script>
	import ChatIcon from "./ChatIcon.svelte";
	import {authHeader, user, chats} from "./stores.js";
	import {apiUrl} from "./urls.js";
	import {goto} from "@roxi/routify";

	export let code;

	let invite = null;
	let state = "loading"; // loading | ready | invalid
	let joining = false;
	let error = "";

	$: if (code) load(code);

	async function load(c) {
		state = "loading";
		try {
			const resp = await fetch(`${apiUrl}invite-links/${c}`, {headers: $authHeader});
			if (!resp.ok) throw new Error();
			invite = await resp.json();
			state = "ready";
		} catch {
			state = "invalid";
		}
	}

	$: isMember =
		invite && ($chats.some(c => c._id === invite.chat_id) || invite.is_member);

	async function join() {
		if (joining || !invite) return;
		joining = true;
		error = "";
		try {
			const resp = await fetch(`${apiUrl}invite-links/${code}/join`, {
				method: "POST",
				headers: $authHeader,
			});
			const json = await resp.json().catch(() => ({}));
			if (!resp.ok) {
				throw new Error(
					json.type === "chatBanned"
						? "You are banned from this chat."
						: json.type === "chatFull"
						? "This chat is full."
						: json.type === "accountBanned"
						? "Your account can't join chats right now."
						: "Couldn't join this chat."
				);
			}
			$goto(`/chats/${invite.chat_id}`);
		} catch (e) {
			error = e.message;
		}
		joining = false;
	}
</script>

<div class="invite">
	{#if state === "loading"}
		<span class="muted">Loading invite...</span>
	{:else if state === "invalid"}
		<span class="muted">This invite is invalid or has expired.</span>
	{:else}
		<ChatIcon chat={{icon: invite.icon, icon_color: invite.icon_color}} />
		<div class="info">
			<b class="name">{invite.nickname}</b>
			<span class="muted"
				>{invite.member_count} member{invite.member_count === 1 ? "" : "s"}</span
			>
			{#if error}<span class="error">{error}</span>{/if}
		</div>
		{#if isMember}
			<button type="button" on:click={() => $goto(`/chats/${invite.chat_id}`)}>Open</button>
		{:else if !$user.name}
			<span class="muted">Log in to join</span>
		{:else}
			<button type="button" disabled={joining} on:click={join}>
				{joining ? "Joining..." : "Join"}
			</button>
		{/if}
	{/if}
</div>

<style>
	.invite {
		display: flex;
		align-items: center;
		gap: 0.8em;
		max-width: 26em;
		min-width: 0;
		margin-top: 0.5em;
		padding: 0.7em 0.9em;
		border: 2px solid var(--orange);
		border-radius: 0.8em;
		box-sizing: border-box;
	}
	.info {
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-width: 0;
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.muted {
		opacity: 0.7;
		font-size: 0.85em;
	}
	.error {
		color: crimson;
		font-size: 0.85em;
	}
	button {
		flex: 0 0 auto;
		margin: 0;
	}
</style>
