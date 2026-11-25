<script>
	import Contributor from "./Contributor.svelte";
	import loadProfile from "./loadProfile.js";

	export let username = "";

	// takes username as an argument so it reloads if it changes
	function load(name) {
		return loadProfile(name);
	}
</script>

{#await load(username)}
	<Contributor {username} isMeower={true}>
		<slot />
	</Contributor>
{:then profile}
	<Contributor
		{username}
		isMeower={true}
		pfp={profile.pfp_data}
		avatar={profile.avatar}
		avatarColor={profile.avatar_color}
	>
		<slot />
	</Contributor>
{:catch}
	<Contributor {username} isMeower={true}>
		<slot />
	</Contributor>
{/await}
