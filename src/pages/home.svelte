<!--
	The home page!
	It features live post updates and a load more button which is pretty nice.
-->
<script>
	import {ulist} from "../lib/stores.js";
	import {modernLayout} from "../lib/modernLayout.js";
	import {profileCache} from "../lib/loadProfile.js";
	import loadProfile from "../lib/loadProfile.js";
	import Container from "../lib/Container.svelte";
	import PostList from "../lib/PostList.svelte";
	import PFP from "../lib/PFP.svelte";

	$: if ($modernLayout) $ulist.slice(0, 5).forEach(u => loadProfile(u));
</script>

<div class="home">
	<Container>
		<h1>Home</h1>
		{#if $modernLayout}
			<div class="overflow online-sub">
				<span class="online-stack">
					{#each $ulist.slice(0, 5) as u (u)}
						{@const p = $profileCache[u] || {}}
						<span class="online-pfp mpfp">
							<PFP
								raw
								size={0.45}
								icon={p.error ? -2 : p.pfp_data ?? -1}
								avatar={p.avatar}
								avatarColor={p.avatar_color}
								alt="{u}'s profile picture"
							/>
						</span>
					{/each}
				</span>
				{$ulist.length} online
			</div>
		{:else}
			<div class="overflow">
				{#if $ulist.length == 1}
					You are the only user online.
				{:else if $ulist.length == 0}
					Nobody is online.
				{:else}
					There are currently {$ulist.length} users online ({$ulist.join(
						", "
					)}).
				{/if}
			</div>
		{/if}
	</Container>
	<PostList fetchUrl="home" postOrigin="home" canPost={true} />
</div>

<style>
	.online-sub {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}
	.online-stack {
		display: inline-flex;
	}
	.online-pfp {
		display: inline-flex;
		border-radius: 35%;
		box-shadow: 0 0 0 2px var(--background);
	}
	.online-pfp + .online-pfp {
		margin-left: -0.5em;
	}
	.home {
		height: 100%;
	}
</style>
