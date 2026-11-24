<script>
	import SwitchThemeModal from "../modals/settings/SwitchTheme.svelte";

</script>

<div class="content">
	<h1>Make it yours</h1>
	<p>Personalize your layout and theme.</p>
	<SwitchThemeModal fromoobe={true} />
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
