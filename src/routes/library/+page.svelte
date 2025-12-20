<script lang="ts">
	import { onMount } from 'svelte';

	type Deck = {
		id: string;
		title: string;
		description: string | null;
		difficulty: string | null;
		objective: string | null;
		created_at: string;
	};

	type Folder = {
		id: string;
		name: string;
		created_at: string;
		decks?: Deck[];
	};

	type Library = {
		id: string;
		name: string;
		created_at: string;
		folders?: Folder[];
	};

	let loading = true;
	let error: string | null = null;

	let library: Library | null = null;
	let selectedFolderId: string | null = null;

	function getSupabaseAccessToken(): string | null {
		// Trouve automatiquement la clé du type "sb-...-auth-token"
		const key = Object.keys(localStorage).find(
			(k) => k.startsWith('sb-') && k.endsWith('-auth-token')
		);
		if (!key) return null;

		try {
			const raw = localStorage.getItem(key);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			return parsed?.access_token ?? null;
		} catch {
			return null;
		}
	}

	function selectFirstFolderIfNeeded(lib: Library | null) {
		const folders = lib?.folders ?? [];
		if (!selectedFolderId && folders.length > 0) {
			selectedFolderId = folders[0].id;
		}
	}

	function getSelectedFolder(): Folder | null {
		const folders = library?.folders ?? [];
		return folders.find((f) => f.id === selectedFolderId) ?? null;
	}

	async function loadLibrary() {
		loading = true;
		error = null;

		const token = getSupabaseAccessToken();
		if (!token) {
			loading = false;
			error = 'Pas de session trouvée (token manquant). Connecte-toi, puis recharge la page.';
			return;
		}

		const res = await fetch('/api/library', {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		const body = await res.json().catch(() => ({}));

		if (!res.ok) {
			loading = false;
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		library = body?.library ?? null;
		selectFirstFolderIfNeeded(library);

		loading = false;
	}

	onMount(() => {
		loadLibrary();
	});
</script>

<main>
	<header>
		<h1>Bibliothèque</h1>
		<button on:click={loadLibrary} disabled={loading}>
			{loading ? 'Chargement…' : 'Rafraîchir'}
		</button>
	</header>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if loading}
		<p>Chargement…</p>
	{:else if !library}
		<p>Aucune bibliothèque trouvée (library = null).</p>
		<p class="hint">
			Ça peut être normal si tu n’as pas encore créé la ligne <code>libraries</code> pour ce user.
		</p>
	{:else}
		<section class="layout">
			<!-- Sidebar dossiers -->
			<aside class="sidebar">
				<h2>Dossiers</h2>

				{#if (library.folders?.length ?? 0) === 0}
					<p class="hint">Aucun dossier.</p>
				{:else}
					<ul class="folders">
						{#each library.folders ?? [] as folder}
							<li>
								<button
									class:selected={folder.id === selectedFolderId}
									on:click={() => (selectedFolderId = folder.id)}
								>
									{folder.name}
									<span class="count">{folder.decks?.length ?? 0}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</aside>

			<!-- Contenu decks -->
			<section class="content">
				{#if !getSelectedFolder()}
					<h2>Decks</h2>
					<p class="hint">Sélectionne un dossier.</p>
				{:else}
					{@const folder = getSelectedFolder()}
					<h2>Decks — {folder?.name}</h2>

					{#if (folder?.decks?.length ?? 0) === 0}
						<p class="hint">Aucun deck dans ce dossier.</p>
					{:else}
						<div class="grid">
							{#each folder?.decks ?? [] as deck}
								<article class="card">
									<h3><a href={`/deck/${deck.id}`}>{deck.title}</a></h3>

									{#if deck.description}
										<p class="desc">{deck.description}</p>
									{/if}

									<div class="meta">
										{#if deck.difficulty}<span>Diff: {deck.difficulty}</span>{/if}
										{#if deck.objective}<span>Obj: {deck.objective}</span>{/if}
									</div>
								</article>
							{/each}
						</div>
					{/if}
				{/if}
			</section>
		</section>
	{/if}
</main>

<style>
	main {
		padding: 16px;
		max-width: 1000px;
		margin: 0 auto;
		font-family:
			system-ui,
			-apple-system,
			Segoe UI,
			Roboto,
			Arial,
			sans-serif;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	h1 {
		margin: 0;
		font-size: 22px;
	}

	button {
		padding: 8px 10px;
		border: 1px solid #ddd;
		background: #fff;
		border-radius: 8px;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.error {
		padding: 10px;
		border: 1px solid #f2b8b5;
		background: #fff5f5;
		border-radius: 10px;
	}

	.hint {
		color: #666;
		font-size: 14px;
	}

	.layout {
		display: grid;
		grid-template-columns: 260px 1fr;
		gap: 16px;
		margin-top: 12px;
	}

	.sidebar {
		border: 1px solid #eee;
		border-radius: 12px;
		padding: 12px;
	}

	.folders {
		list-style: none;
		padding: 0;
		margin: 8px 0 0 0;
		display: grid;
		gap: 8px;
	}

	.folders button {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-radius: 10px;
	}

	.folders button.selected {
		border-color: #bbb;
		background: #f6f6f6;
	}

	.count {
		font-size: 12px;
		color: #666;
	}

	.content {
		border: 1px solid #eee;
		border-radius: 12px;
		padding: 12px;
		min-height: 200px;
	}

	h2 {
		margin: 0 0 12px 0;
		font-size: 18px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}

	.card {
		border: 1px solid #eee;
		border-radius: 12px;
		padding: 12px;
		background: #fff;
	}

	.card h3 {
		margin: 0 0 6px 0;
		font-size: 16px;
	}

	.desc {
		margin: 0 0 10px 0;
		color: #444;
		font-size: 14px;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		color: #666;
		font-size: 12px;
	}
</style>
