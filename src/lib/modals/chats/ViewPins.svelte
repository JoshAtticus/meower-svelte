<script>
	import Modal from "../../Modal.svelte";
	import PostList from "../../PostList.svelte";

	import {chat} from "../../stores.js";
	import * as modals from "../../modals.js";
</script>

<Modal showClose={true} on:close={modals.closeLastModal}>
	<h2 slot="header">Pinned Posts</h2>
	<div slot="default" class="pins">
		<PostList
			fetchUrl="chats/{$chat._id}/pins"
			postOrigin=""
			canPost={false}
		/>
	</div>
</Modal>

<style>
	.pins {
		max-height: 60vh;
		overflow-y: auto;
	}
</style>
