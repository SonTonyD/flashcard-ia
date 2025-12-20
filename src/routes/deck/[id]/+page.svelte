<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	type Flashcard = {
		id: string;
		front: string;
		back: string;
		status: string;
		created_at: string;
	};

	type Deck = {
		id: string;
		folder_id: string;
		title: string;
		description: string | null;
		difficulty: string | null;
		objective: string | null;
		created_at: string;
		flashcards?: Flashcard[];
	};

	let loading = true;
	let error: string | null = null;
	let deck: Deck | null = null;

	function getSupabaseAccessToken(): string | null {
		const key = Object.keys(localStorage).find(
			(k) => k.startsWith('sb-') && k.endsWith('-auth-token')
		);
		if (!key) return null;
		try {
			const raw = localStorage.getItem(key);
			if (!raw) return null;
			return JSON.parse(raw)?.access_token ?? null;
		} catch {
			return null;
		}
	}

	async function loadDeck(deckId: string) {
		loading = true;
		error = null;

		const token = getSupabaseAccessToken();
		if (!token) {
			loading = false;
			error = 'Pas de session trouvée. Connecte-toi puis recharge.';
			return;
		}

		const res = await fetch(`/api/deck/${deckId}`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		const body = await res.json().catch(() => ({}));

		if (!res.ok) {
			loading = false;
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		deck = body?.deck ?? null;
		loading = false;
	}

	onMount(() => {
		const id = $page.params.id;

		if (!id) {
			loading = false;
			error = 'Deck id manquant dans l’URL.';
			return;
		}

		loadDeck(id);
	});
</script>

<main>
	<a class="back" href="/library">← Retour bibliothèque</a>

	{#if loading}
		<p>Chargement…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if !deck}
		<p>Deck introuvable.</p>
	{:else}
		<header>
			<h1>{deck.title}</h1>
			<p class="meta">
				{#if deck.difficulty}Diff: {deck.difficulty}{/if}
				{#if deck.objective}
					— Obj: {deck.objective}{/if}
			</p>
			{#if deck.description}
				<p class="desc">{deck.description}</p>
			{/if}
		</header>

		<section>
			<h2>Flashcards ({deck.flashcards?.length ?? 0})</h2>

			{#if (deck.flashcards?.length ?? 0) === 0}
				<p class="hint">Aucune flashcard pour l’instant.</p>
			{:else}
				<div class="list">
					{#each deck.flashcards ?? [] as c}
						<article class="card">
							<div class="row">
								<strong>Front</strong>
								<span class="status">{c.status}</span>
							</div>
							<p>{c.front}</p>

							<strong>Back</strong>
							<p>{c.back}</p>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</main>

<style>
	main {
		padding: 16px;
		max-width: 900px;
		margin: 0 auto;
		font-family:
			system-ui,
			-apple-system,
			Segoe UI,
			Roboto,
			Arial,
			sans-serif;
	}
	.back {
		display: inline-block;
		margin-bottom: 12px;
		color: inherit;
		text-decoration: none;
	}
	.error {
		padding: 10px;
		border: 1px solid #f2b8b5;
		background: #fff5f5;
		border-radius: 10px;
	}
	header {
		border: 1px solid #eee;
		border-radius: 12px;
		padding: 12px;
		margin-bottom: 16px;
	}
	h1 {
		margin: 0 0 6px 0;
		font-size: 22px;
	}
	.meta {
		margin: 0;
		color: #666;
		font-size: 13px;
	}
	.desc {
		margin: 10px 0 0 0;
		color: #333;
	}
	h2 {
		margin: 0 0 10px 0;
		font-size: 18px;
	}
	.hint {
		color: #666;
		font-size: 14px;
	}
	.list {
		display: grid;
		gap: 12px;
	}
	.card {
		border: 1px solid #eee;
		border-radius: 12px;
		padding: 12px;
		background: #fff;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 6px;
	}
	.status {
		font-size: 12px;
		color: #666;
	}
	p {
		margin: 6px 0 10px 0;
	}
</style>
