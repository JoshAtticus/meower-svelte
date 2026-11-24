<!-- A shared group chat invite link -->
<script>
	import Container from "../../lib/Container.svelte";
	import InviteCard from "../../lib/InviteCard.svelte";
	import {params} from "@roxi/routify";
</script>

<Container>
	<h1>Group chat invite</h1>
	<InviteCard code={$params.code} />
</Container>
