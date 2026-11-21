<script>
	import PFP from "../lib/PFP.svelte";

	import {ulist} from "../lib/stores.js";

	import {onMount} from "svelte";
	import loadProfile from "./loadProfile.js";
	import crown from "../assets/crown.svg";

	export let member = "";
	export let owner = false;
	export let role = "";

	let pfp = 0;
	let avatar = "";
	let avatarColor = "";

	let error;

	/**
	 * Initialize this post's user profile - gets profile info from the cache or fetches it.
	 */
	async function initPostUser() {
		try {
			const profile = await loadProfile(member);
			pfp = profile.pfp_data;
			avatar = profile.avatar;
			avatarColor = profile.avatar_color;
		} catch (e) {
			error = e;
			pfp = -2;
		}
	}
	onMount(initPostUser);
</script>

{#if !error}
	<div class="member">
		<div class="member-pfp">
			<PFP
				icon={pfp}
				{avatar}
				{avatarColor}
				alt="{member}'s profile picture"
				online={$ulist.includes(member)}
				size={0.5}
			/>
		</div>
		<div class="member-text">
			<p class="member-name">{member}</p>
			{#if role}
				<p class="member-role">{role}</p>
			{/if}
		</div>

		{#if owner}
			<img
				src={crown}
				alt="Owner"
				class="owner-icon"
				title="Owns this chat"
			/>
		{/if}
	</div>
{:else}
	<div class="error">error loading member {member}: {error}</div>
{/if}

<style>
	.owner-icon {
		height: 40%;
	}

	:global(#main.mode-dark) .owner-icon {
		filter: invert(1);
	}

	.member {
		display: flex;
		flex-wrap: nowrap;
		flex-direction: row;
		align-items: center;

		width: 100%;
		height: 2.5em;
		gap: 0.5em;
		padding: 0 0.5em;
		box-sizing: border-box;
	}

	.member-text {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.member-name,
	.member-role {
		margin: 0;
		line-height: 1.15;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.member-role {
		font-size: 0.72em;
		opacity: 0.6;
		overflow: hidden;
	}

	.member-name {
		flex-grow: 1;
		flex-shrink: 1;

		text-align: left;
		text-overflow: clip;
		overflow: hidden;
	}

	.error {
		padding: 0.25em;
		font-style: italic;
		font-size: 80%;
	}
</style>
