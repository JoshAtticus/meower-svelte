<script>
	import {user} from "../stores.js"
	import * as clm from "../clmanager.js";
	import {userRestrictions,isRestricted } from "../bitField.js";
</script>

<div class="content">
	<h1>Quote</h1>
	Write a quote for yourself — it's shown on your profile like a bio.
	<br />
	<br />
	<input
		type="text"
		id="quotething"
		class="modal-input white"
		placeholder="Write something..."
		maxlength="360"
		disabled={isRestricted(userRestrictions.EDITING_PROFILE)}
		bind:value={$user.quote}
		on:change={() => clm.updateProfile({quote: $user.quote})}
	/>
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
