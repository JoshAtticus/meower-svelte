import {writable} from "svelte/store";

// Announces live post events to expanded reply sections. Value: {post}
export const replyBus = writable({post: null});
