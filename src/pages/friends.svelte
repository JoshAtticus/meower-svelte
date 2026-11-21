<!-- Friends and friend requests -->
<script>
	import Container from "../lib/Container.svelte";
	import Member from "../lib/Member.svelte";

	import {friends, user} from "../lib/stores.js";
	import * as clm from "../lib/clmanager.js";

	import {goto, url} from "@roxi/routify";
</script>

<div>
	{#if !$user.name}
		<Container>
			<h1>Friends</h1>
			You need to be logged in to see your friends.
		</Container>
	{:else}
		{#if $friends.incoming.length}
			<Container>
				<h2>Friend Requests ({$friends.incoming.length})</h2>
				{#each $friends.incoming as username}
					<div class="friend-row">
						<button
							class="friend-name"
							on:click={() => $goto(`/users/${username}`)}
						>
							<Member member={username} owner={false} />
						</button>
						<button
							title="Accept friend request"
							on:click={() => clm.setRelationship(username, 1)}
							>Accept</button
						>
						<button
							title="Decline friend request"
							on:click={() => clm.setRelationship(username, 0)}
							>Decline</button
						>
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
							on:click={() => $goto(`/users/${username}`)}
						>
							<Member member={username} owner={false} />
						</button>
						<button
							title="Cancel friend request"
							on:click={() => clm.setRelationship(username, 0)}
							>Cancel</button
						>
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
						on:click={() => $goto(`/users/${username}`)}
					>
						<Member member={username} owner={false} />
					</button>
					<button
						title="Remove friend"
						on:click={() => clm.setRelationship(username, 0)}
						>Remove</button
					>
				</div>
			{:else}
				No friends yet. Why not visit someone's profile and send them a
				friend request?
			{/each}
		</Container>
	{/if}
</div>

<style>
	.friend-row {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin-bottom: 0.4em;
	}
	.friend-name {
		flex-grow: 1;
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
</style>
