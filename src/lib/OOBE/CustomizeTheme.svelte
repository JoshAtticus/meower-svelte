<script>
	import SwitchThemeModal from "../modals/settings/SwitchTheme.svelte";

	import {user} from "../stores.js"
	import * as clm from "../clmanager.js";
</script>

<div class="content">
	<h1>Make it yours</h1>
	<p>Personalize your layout and theme.</p>
	<SwitchThemeModal fromoobe={true} />
	<p>Hit the gear icon below to switch layouts.</p>
	<button
		class="circle settings"
		on:click={() =>
			clm.updateProfile({
				layout: $user.layout === "new" ? "old" : "new",
			})}
	/>
	<p>You're currently using the "{$user.layout}" layout.</p>
</div>

<style>
	.content {
		text-align: center;
		width: 60%;
		left: 50%;
        transform: translate(-50%,0);
        position: relative;
	}
</style>
