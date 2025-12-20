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

	let newFolderName = '';
	let creatingFolder = false;

	async function createFolder() {
		const name = newFolderName.trim();
		if (!name) return;

		const token = getSupabaseAccessToken();
		if (!token) {
			error = 'Pas de session trouvée (token manquant). Connecte-toi, puis recharge la page.';
			return;
		}

		creatingFolder = true;
		error = null;

		const res = await fetch('/api/folder', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ name })
		});

		const body = await res.json().catch(() => ({}));

		creatingFolder = false;

		if (!res.ok) {
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		newFolderName = '';
		await loadLibrary(); // refresh
	}

	async function deleteSelectedFolder() {
		if (!selectedFolderId) return;

		const folder = (library?.folders ?? []).find((f) => f.id === selectedFolderId);
		const folderName = folder?.name ?? 'ce dossier';

		const ok = confirm(
			`Supprimer "${folderName}" ?\n\nTous les decks et flashcards dedans seront supprimés.`
		);
		if (!ok) return;

		const token = getSupabaseAccessToken();
		if (!token) {
			error = 'Pas de session trouvée (token manquant). Connecte-toi, puis recharge la page.';
			return;
		}

		error = null;

		const res = await fetch(`/api/folder/${selectedFolderId}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}` }
		});

		const body = await res.json().catch(() => ({}));

		if (!res.ok) {
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		// refresh + reset sélection si besoin
		await loadLibrary();

		const folders = library?.folders ?? [];
		selectedFolderId = folders.length > 0 ? folders[0].id : null;
	}

	let newDeckTitle = '';
	let creatingDeck = false;

	async function createDeck() {
		const title = newDeckTitle.trim();
		if (!title) return;

		if (!selectedFolderId) {
			error = 'Sélectionne un dossier avant de créer un deck.';
			return;
		}

		const token = getSupabaseAccessToken();
		if (!token) {
			error = 'Pas de session trouvée (token manquant). Connecte-toi, puis recharge la page.';
			return;
		}

		creatingDeck = true;
		error = null;

		const res = await fetch('/api/deck', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				folder_id: selectedFolderId,
				title
			})
		});

		const body = await res.json().catch(() => ({}));

		creatingDeck = false;

		if (!res.ok) {
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		newDeckTitle = '';
		await loadLibrary(); // refresh
	}

	async function deleteDeck(deckId: string, deckTitle: string) {
		const ok = confirm(
			`Supprimer le deck "${deckTitle}" ?\n\nSes flashcards seront aussi supprimées.`
		);
		if (!ok) return;

		const token = getSupabaseAccessToken();
		if (!token) {
			error = 'Pas de session trouvée (token manquant). Connecte-toi, puis recharge la page.';
			return;
		}

		error = null;

		const res = await fetch(`/api/deck/${deckId}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}` }
		});

		const body = await res.json().catch(() => ({}));

		if (!res.ok) {
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		await loadLibrary(); // refresh
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

				<div class="create">
					<input
						placeholder="Nouveau dossier…"
						bind:value={newFolderName}
						on:keydown={(e) => e.key === 'Enter' && createFolder()}
					/>
					<button on:click={createFolder} disabled={creatingFolder || !newFolderName.trim()}>
						{creatingFolder ? '...' : 'Créer'}
					</button>
				</div>

				{#if selectedFolderId}
					<button class="danger" on:click={deleteSelectedFolder}> Supprimer le dossier </button>
				{/if}

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
					{#if selectedFolderId}
						<div class="create-deck">
							<input
								placeholder="Nouveau deck…"
								bind:value={newDeckTitle}
								on:keydown={(e) => e.key === 'Enter' && createDeck()}
							/>
							<button on:click={createDeck} disabled={creatingDeck || !newDeckTitle.trim()}>
								{creatingDeck ? '...' : 'Créer'}
							</button>
						</div>
					{/if}
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

									<button class="danger" on:click={() => deleteDeck(deck.id, deck.title)}>
										Supprimer
									</button>
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
		padding: 12px;
		margin: 0;
		max-width: 100%;
		font-family:
			system-ui,
			-apple-system,
			Segoe UI,
			Roboto,
			Arial,
			sans-serif;
	}

	/* Header mobile : titre + bouton en pile */
	header {
		display: grid;
		gap: 10px;
		margin-bottom: 12px;
	}

	h1 {
		margin: 0;
		font-size: 20px;
		line-height: 1.2;
	}

	/* Boutons : gros, faciles à cliquer */
	button {
		padding: 12px 12px;
		border: 1px solid #ddd;
		background: #fff;
		border-radius: 12px;
		cursor: pointer;
		font-size: 14px;
		line-height: 1;
		-webkit-tap-highlight-color: transparent;
	}

	button:active {
		transform: translateY(1px);
	}

	button:disabled {
		opacity: 0.6;
		cursor: default;
		transform: none;
	}

	.error {
		padding: 12px;
		border: 1px solid #f2b8b5;
		background: #fff5f5;
		border-radius: 12px;
		font-size: 14px;
	}

	.hint {
		color: #666;
		font-size: 13px;
	}

	/* Layout mobile-first : tout en colonne */
	.layout {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 12px;
	}

	/* Panneaux : plus “cards”, bien séparés */
	.sidebar,
	.content {
		border: 2px solid #474747;
		border-radius: 14px;
		padding: 12px;
		background: #fff;
	}

	h2 {
		margin: 0 0 10px 0;
		font-size: 16px;
		line-height: 1.2;
	}

	/* Inputs : pleine largeur */
	input {
		width: 100%;
		padding: 12px 12px;
		border: 1px solid #ddd;
		border-radius: 12px;
		font-size: 14px;
	}

	/* Création dossier / deck : en pile (mobile) */
	.create,
	.create-deck {
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
		margin: 10px 0 12px 0;
	}

	.create button,
	.create-deck button {
		width: 100%;
	}

	/* Boutons danger : plein largeur */
	.danger {
		width: 100%;
		margin-top: 8px;
		border: 1px solid #f2b8b5;
		background: #fff5f5;
		border-radius: 12px;
		padding: 12px 12px;
	}

	/* Liste dossiers : chips horizontales scrollables */
	.folders {
		list-style: none;
		padding: 0;
		margin: 8px 0 0 0;

		display: flex;
		gap: 8px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none; /* Firefox */
	}

	.folders::-webkit-scrollbar {
		display: none; /* Chrome/Safari */
	}

	.folders li {
		flex: 0 0 auto;
	}

	.folders button {
		width: auto;
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;

		padding: 10px 12px;
		border-radius: 999px; /* look “chip” */
		white-space: nowrap;
	}

	.folders button.selected {
		border-color: #bbb;
		background: #f6f6f6;
	}

	/* Petit compteur */
	.count {
		font-size: 12px;
		color: #666;
		border: 1px solid #e6e6e6;
		border-radius: 999px;
		padding: 2px 8px;
		background: #fff;
	}

	/* Grille decks : 1 colonne sur mobile */
	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 10px;
	}

	/* Cartes deck : espacées, lisibles */
	.card {
		border: 1px solid #eee;
		border-radius: 14px;
		padding: 12px;
		background: #fff;
	}

	.card h3 {
		margin: 0 0 6px 0;
		font-size: 15px;
		line-height: 1.25;
	}

	.card h3 a {
		color: inherit;
		text-decoration: none;
	}

	.card h3 a:active {
		text-decoration: underline;
	}

	.desc {
		margin: 0 0 10px 0;
		color: #444;
		font-size: 13px;
		line-height: 1.35;
	}

	/* Meta : plutôt en colonne sur mobile (lisible) */
	.meta {
		display: grid;
		gap: 6px;
		color: #666;
		font-size: 12px;
	}

	/* Le bouton supprimer dans une card */
	.card .danger {
		margin-top: 10px;
	}
</style>
