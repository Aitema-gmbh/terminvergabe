import adapter from "@sveltejs/adapter-node";

/** @type {import("@sveltejs/kit").Config} */
const config = {
  kit: {
    adapter: adapter({
      out: "build",
    }),
    alias: {
      "$components": "src/lib/components",
      "$lib": "src/lib",
      "$i18n": "src/lib/i18n",
    },
  },
};

export default config;
