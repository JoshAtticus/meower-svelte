import {defineConfig} from "vite";
import {svelte} from "@sveltejs/vite-plugin-svelte";
import routify from "@roxi/routify/plugins/rollup.js";

// the commit when built on Cloudflare Pages, otherwise a timestamp
const buildId =
	(process.env.CF_PAGES_COMMIT_SHA || "").slice(0, 7) ||
	Date.now().toString(36);

// import replace from "@rollup/plugin-replace";
// import {injectManifest} from "rollup-plugin-workbox";

// https://vitejs.dev/config/
export default defineConfig(({command}) => ({
	plugins: [
		// /meo -> /meo/, so meo's relative asset paths resolve under /meo/
		{
			name: "meo-trailing-slash",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					if (req.url === "/meo" || req.url.startsWith("/meo?")) {
						res.writeHead(301, {Location: "/meo/" + req.url.slice(4)});
						res.end();
						return;
					}
					next();
				});
			},
		},
		// lets the running app notice when a newer build has been deployed
		{
			name: "version-file",
			generateBundle() {
				this.emitFile({
					type: "asset",
					fileName: "version.json",
					source: JSON.stringify({id: buildId}),
				});
			},
		},
		routify({singleBuild: command === "build"}),
		svelte(),
		/*
		injectManifest({
			swSrc: "sw.js",
			swDest: "dist/sw.js",
			globDirectory: "dist",
			globPatterns: ["**\/*.{js,css,html,svg,png,ttf}"],
			mode: "production"
		}),
		replace({
			is_vite_preview: true,
			preventAssignment: true,
		}),
		*/
	],
	base: "/",
	define: {__BUILD_ID__: JSON.stringify(buildId)},
	// When the dev server is shared (e.g. through a Cloudflare tunnel), it also
	// forwards the API, CloudLink and uploads so one address serves everything.
	server: {
		proxy: {
			"/api": {
				target: "http://127.0.0.1:3001",
				changeOrigin: true,
				rewrite: path => path.replace(/^\/api/, ""),
			},
			"/cloudlink": {
				target: "ws://127.0.0.1:3000",
				ws: true,
				rewrite: path => path.replace(/^\/cloudlink/, ""),
			},
			// meo, served from its own local static server
			"^/meo/": {
				target: "http://127.0.0.1:8090",
				changeOrigin: true,
				rewrite: path => path.replace(/^\/meo/, "") || "/",
			},
			"/uploads": {
				target: "http://127.0.0.1:3002",
				changeOrigin: true,
				rewrite: path => path.replace(/^\/uploads/, ""),
			},
		},
	},
}));
