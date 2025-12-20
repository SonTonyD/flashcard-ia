<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.client';
	import { onMount } from 'svelte';

	let user: any = null;

	onMount(async () => {
		const { data } = await supabase.auth.getUser();
		user = data.user;

		if (!user) {
			goto('/login');
		}
	});

	function goToLibrary() {
		goto('/library');
	}

	async function logout() {
		await supabase.auth.signOut();
		goto('/login');
	}
</script>

<h1>Dashboard</h1>

<p>Connecté en tant que {user?.email}</p>

<button on:click={goToLibrary}>Bibliothèque</button>
<button on:click={logout}>Déconnexion</button>
