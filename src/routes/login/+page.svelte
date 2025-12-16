<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.client';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	onMount(() => {
		// rien ici pour l’instant
	});

	async function login() {
		loading = true;
		error = '';

		const { error: loginError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		loading = false;

		if (loginError) {
			error = loginError.message;
		} else {
			goto('/app');
		}
	}
</script>

<h1>Connexion</h1>

<input placeholder="Email" bind:value={email} />
<input type="password" placeholder="Mot de passe" bind:value={password} />

<button on:click={login} disabled={loading}> Se connecter </button>

{#if error}
	<p style="color:red">{error}</p>
{/if}
