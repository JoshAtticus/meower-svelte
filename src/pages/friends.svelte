<!-- Friends and friend requests -->
<script>
	import Container from "../lib/Container.svelte";
	import Member from "../lib/Member.svelte";
	import BasicModal from "../lib/modals/Basic.svelte";

	import {friends, user, authHeader, chats} from "../lib/stores.js";
	import {apiUrl} from "../lib/urls.js";
	import * as clm from "../lib/clmanager.js";
	import * as modals from "../lib/modals.js";

	import {goto} from "@roxi/routify";

	let newFriend, adding;

	async function sendRequest() {
		adding = true;
		try {
			const resp = await clm.setRelationship(newFriend, 1);
			if (resp.ok) {
				newFriend = "";
			} else {
				const json = await resp.json().catch(() => null);
				if (resp.status === 404) {
					throw new Error(`${newFriend} doesn't exist.`);
				} else if (resp.status === 400) {
					throw new Error(
						"You can't send a friend request to yourself."
					);
				} else if (resp.status === 429) {
					throw new Error(
						"Too many requests! Try again later."
					);
				} else {
					throw new Error(
						json?.type ??
							"Response code is not OK; code is " + resp.status
					);
				}
			}
		} catch (e) {
			modals.showModal(BasicModal, {
				title: "Friend request failed",
				desc: `${e}`,
			});
		} finally {
			adding = false;
		}
	}

	async function openDM(username) {
		let chat = $chats.find(
			c => c.type === 1 && c.members.includes(username)
		);
		if (chat) {
			$goto(`/chats/${chat._id}`);
			return;
		}
		try {
			const resp = await fetch(`${apiUrl}users/${username}/dm`, {
				headers: $authHeader,
			});
			if (!resp.ok) throw new Error("code " + resp.status);
			chat = await resp.json();
			$chats.push(chat);
			$goto(`/chats/${chat._id}`);
		} catch (e) {
			modals.showModal(BasicModal, {
				title: "Failed to open DM",
				desc: `Couldn't open a DM with ${username}. ${e}`,
			});
		}
	}

</script>

<div>
	{#if !$user.name}
		<Container>
			<h1>Friends</h1>
			You need to be logged in to see your friends.
		</Container>
	{:else}
		<Container>
			<div class="friends-header">
				<h1>Friends</h1>
				<form
					class="add-friend"
					on:submit|preventDefault={sendRequest}
				>
					<input
						type="text"
						class="white"
						placeholder="Add a friend by username..."
						maxlength="20"
						disabled={adding}
						bind:value={newFriend}
					/>
					<button
						type="submit"
						disabled={!newFriend || adding}
						>Send request</button
					>
				</form>
			</div>
		</Container>

		{#if $friends.incoming.length}
			<Container>
				<h2>Friend Requests ({$friends.incoming.length})</h2>
				{#each $friends.incoming as username}
					<div class="friend-row">
						<button
							class="friend-name"
							title="View {username}'s profile"
							on:click={() => $goto(`/users/${username}`)}
						>
							<Member member={username} owner={false} />
						</button>
						<button
							class="circle check"
							title="Accept friend request"
							on:click={() => clm.setRelationship(username, 1)}
						/>
						<button
							class="circle close"
							title="Decline friend request"
							on:click={() => clm.setRelationship(username, 0)}
						/>
					</div>
				{/each}
			</Container>
		{/if}
		{#if $friends.outgoing.length}
			<Container>
				<h2>Sent Requests ({$friends.outgoing.length})</h2>
				{#each $friends.outgoing as username}
					<div class="friend-row">
						<button
							class="friend-name"
							title="View {username}'s profile"
							on:click={() => $goto(`/users/${username}`)}
						>
							<Member member={username} owner={false} />
						</button>
						<button
							class="circle close"
							title="Cancel friend request"
							on:click={() => clm.setRelationship(username, 0)}
						/>
					</div>
				{/each}
			</Container>
		{/if}
		<Container>
			<h2>Friends ({$friends.friends.length})</h2>
			{#each $friends.friends as username}
				<div class="friend-row">
					<button
						class="friend-name"
						title="View {username}'s profile"
						on:click={() => $goto(`/users/${username}`)}
					>
						<Member member={username} owner={false} />
					</button>
					<button
						class="circle join"
						title="Open DM with {username}"
						on:click={() => openDM(username)}
					/>
					<button
						class="circle close"
						title="Remove friend"
						on:click={() => clm.setRelationship(username, 0)}
					/>
				</div>
			{:else}
				<div class="empty">
					<p class="empty-title">No friends yet</p>
					<p>
						Send someone a friend request above, or visit
						their profile and hit "Send Friend Request".
					</p>
				</div>
			{/each}
		</Container>
	{/if}
</div>

<style>
	.friends-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5em;
	}
	.friends-header h1 {
		margin: 0;
	}
	.add-friend {
		display: flex;
		gap: 0.5em;
		flex-grow: 1;
		max-width: 26em;
	}
	.add-friend input {
		flex-grow: 1;
		min-width: 8em;
	}

	.friend-row {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin-bottom: 0.2em;
	}
	.friend-name {
		flex-grow: 1;
		min-width: 0;
		text-align: left;
		padding: 0.3em;
		background: none;
		border: none;
		color: inherit;
		border-radius: 0.5em;
	}
	:global(main.input-hover) .friend-name:hover,
	.friend-name:focus-visible {
		background-color: var(--orange-light);
	}
	.friend-row .circle {
		flex-shrink: 0;
	}

	.empty {
		text-align: center;
		opacity: 0.7;
		padding: 1em 0;
	}
	.empty-title {
		font-size: 1.2em;
		font-weight: bold;
		margin-bottom: 0.25em;
	}
</style>
