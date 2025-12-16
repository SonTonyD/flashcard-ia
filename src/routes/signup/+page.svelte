<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.client';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;

	async function signup() {
		loading = true;
		error = '';

		const { error: signUpError } = await supabase.auth.signUp({
			email,
			password
		});

		loading = false;

		if (signUpError) {
			error = signUpError.message;
		} else {
			goto('/app');
		}
	}
</script>

<h1>Créer un compte</h1>

<input placeholder="Email" bind:value={email} />
<input type="password" placeholder="Mot de passe" bind:value={password} />

<button on:click={signup} disabled={loading}> Créer un compte </button>

{#if error}
	<p style="color:red">{error}</p>
{/if}
