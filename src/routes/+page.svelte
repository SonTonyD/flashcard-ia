<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.client';
	import { onMount } from 'svelte';

	onMount(async () => {
		const { data } = await supabase.auth.getSession();
		console.log('session:', data);
	});

	function goSignup() {
		goto('/signup');
	}

	function goLogin() {
		goto('/login');
	}
</script>

<h1>Flashcard IA</h1>

<button on:click={goSignup}>Signup</button>
<button on:click={goLogin}>Login</button>
