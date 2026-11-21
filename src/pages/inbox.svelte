<!--
	Home but it's the inbox.
-->
<script>
	import Container from "../lib/Container.svelte";
	import PostList from "../lib/PostList.svelte";

	import {user, authHeader} from "../lib/stores.js";
	import {apiUrl} from "../lib/urls.js";
	import * as clm from "../lib/clmanager.js";
	import * as modals from "../lib/modals.js";
	import BasicModal from "../lib/modals/Basic.svelte";

	import {goto} from "@roxi/routify";
	import {onMount, onDestroy} from "svelte";

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
</script>

<div class="messages">
	<Container>
		<h1>Inbox Messages</h1>
		Here are your latest inbox messages. We will send announcements and important
		messages to here!
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
							<i>
								(expires {new Date(
									invite.expires * 1000
								).toLocaleString()})
							</i>
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
	<PostList
		on:loaded={() => {
			// Mark inbox as read
			if ($user.unread_inbox) clm.updateProfile({unread_inbox: false});
		}}
		fetchUrl={"inbox"}
		postOrigin={"inbox"}
		canPost={false}
	>
		<Container slot="error" let:error>
			Error loading messages. Please try again.
			<pre><code>{error}</code></pre>
		</Container>
		<Container slot="empty">No messages here. Check back later!</Container>
	</PostList>
</div>

<style>
	.messages {
		height: 100%;
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
