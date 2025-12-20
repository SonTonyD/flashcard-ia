import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs24.x' // ou nodejs22.x
		})
	},

	vite: {
		ssr: {
			noExternal: ['@supabase/supabase-js', '@supabase/ssr']
		}
	}
};

export default config;
