<script lang="ts">
	import { supabase } from '$lib/supabaseClient.client';
	import { onMount } from 'svelte';

	let session = null;

	onMount(() => {
		supabase.auth.getSession().then(({ data }) => {
			session = data.session;
		});

		supabase.auth.onAuthStateChange((_event, newSession) => {
			session = newSession;
		});
	});
</script>

<slot />
