<!-- Legacy: Search moved to /explore -->
<script>
	import {goto} from "@roxi/routify";
	import {onMount} from "svelte";
	onMount(() => {
		const q = new URLSearchParams(location.search).get("q");
		location.replace("/explore" + (q ? "?q=" + encodeURIComponent(q) : ""));
	});
</script>
