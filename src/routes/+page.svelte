<script lang="ts">
	import { supabase } from '$lib/supabaseClient.client';
	import { onMount } from 'svelte';

	onMount(async () => {
		const { data } = await supabase.auth.getSession();
		console.log('session:', data);
	});
</script>

<h1>Supabase OK</h1>
