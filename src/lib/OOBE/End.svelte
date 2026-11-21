<script>
    import {OOBERunning, OOBEPage} from "../stores.js";
    import {goto} from "@roxi/routify";

    let tosettings = true
</script>

<h1>You're all set!</h1>
<p>That's everything for now — you can customize a lot more in Settings.</p>
<p>To get there later, click your profile picture in the bottom left, then choose Settings.</p>
<p>Or head straight there now:</p>
<div id="exitthingy">
    <label for="SettingsONExit">Take me to Settings</label>
    <input
        type="checkbox"
        id="SettingsONExit"
        bind:checked={tosettings}
    />
</div>
<br />
<button
    on:click={() => {
        if (tosettings) {
            $goto("/settings")
        } else {
            $goto("/home")
        }
        OOBERunning.set(false);
    }}>Get started</button
>

<style>
    #exitthingy label {
        bottom: 0.65em;
        position: relative;
    }
</style>
