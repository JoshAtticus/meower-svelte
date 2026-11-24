import {getJson, uploadUrl, withMeta} from "../_lib/og.js";

export async function onRequestGet(context) {
	try {
		const invite = await getJson(context.env, `invite-links/${encodeURIComponent(context.params.code)}`);
		if (invite) {
			return await withMeta(context, {
				title: `Join ${invite.nickname} on Meower`,
				description: `${invite.member_count} member${invite.member_count === 1 ? "" : "s"}. You've been invited to join this group chat.`,
				image: uploadUrl(context.env, "icons", invite.icon),
			});
		}
	} catch {}
	return context.next();
}
