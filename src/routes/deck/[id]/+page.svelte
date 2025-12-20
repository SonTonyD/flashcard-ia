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

	let showBulkCreate = false;
	let bulkText = '';
	let savingBulk = false;

	function openBulkCreate() {
		showBulkCreate = true;
		bulkText = ''; // toujours vierge, même si des flashcards existent
	}

	function parseBulk(text: string) {
		const lines = text.split('\n');
		const items: { front: string; back: string }[] = [];
		const errors: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const raw = lines[i].trim();
			if (!raw) continue;

			const sepIndex = raw.indexOf('--');
			if (sepIndex === -1) {
				errors.push(`Ligne ${i + 1}: séparateur "--" manquant`);
				continue;
			}

			const front = raw.slice(0, sepIndex).trim();
			const back = raw.slice(sepIndex + 2).trim();

			if (!front || !back) {
				errors.push(`Ligne ${i + 1}: front/back vide`);
				continue;
			}

			items.push({ front, back });
		}

		return { items, errors };
	}

	async function saveBulkFlashcards() {
		if (!deck) return;

		const { items, errors: parseErrors } = parseBulk(bulkText);
		if (parseErrors.length > 0) {
			error = parseErrors.join('\n');
			return;
		}
		if (items.length === 0) {
			error = 'Aucune flashcard détectée.';
			return;
		}

		const token = getSupabaseAccessToken();
		if (!token) {
			error = 'Pas de session trouvée. Connecte-toi puis recharge.';
			return;
		}

		savingBulk = true;
		error = null;

		const res = await fetch('/api/flashcard', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				deck_id: deck.id,
				items
			})
		});

		const body = await res.json().catch(() => ({}));
		savingBulk = false;

		if (!res.ok) {
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		showBulkCreate = false;
		bulkText = '';

		// recharge pour voir les nouvelles flashcards ajoutées aux existantes
		await loadDeck(deck.id);
	}

	let editingId: string | null = null;
	let editFront = '';
	let editBack = '';
	let editStatus = 'NEW';
	let savingEdit = false;

	function startEdit(c: Flashcard) {
		editingId = c.id;
		editFront = c.front;
		editBack = c.back;
		editStatus = c.status ?? 'NEW';
	}

	function cancelEdit() {
		editingId = null;
		editFront = '';
		editBack = '';
		editStatus = 'NEW';
	}

	async function saveEdit() {
		if (!deck || !editingId) return;

		const front = editFront.trim();
		const back = editBack.trim();
		if (!front || !back) {
			error = 'Front et Back sont obligatoires.';
			return;
		}

		const token = getSupabaseAccessToken();
		if (!token) {
			error = 'Pas de session trouvée. Connecte-toi puis recharge.';
			return;
		}

		savingEdit = true;
		error = null;

		const res = await fetch('/api/flashcard', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				id: editingId,
				front,
				back,
				status: editStatus
			})
		});

		const body = await res.json().catch(() => ({}));
		savingEdit = false;

		if (!res.ok) {
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		cancelEdit();
		await loadDeck(deck.id);
	}

	async function deleteFlashcard(flashcardId: string) {
		const ok = confirm('Supprimer cette flashcard ?');
		if (!ok) return;

		const token = getSupabaseAccessToken();
		if (!token) {
			error = 'Pas de session trouvée. Connecte-toi puis recharge.';
			return;
		}
		if (!deck) return;

		error = null;

		const res = await fetch(`/api/flashcard/${flashcardId}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${token}` }
		});

		const body = await res.json().catch(() => ({}));

		if (!res.ok) {
			error = body?.error ?? `Erreur ${res.status}`;
			return;
		}

		await loadDeck(deck.id);
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
			<section style="margin: 12px 0 16px 0;">
				<button on:click={openBulkCreate}> Créer flashcards </button>

				{#if showBulkCreate}
					<div class="bulk">
						<!-- svelte-ignore element_invalid_self_closing_tag -->
						<textarea
							bind:value={bulkText}
							rows="10"
							placeholder="front--back&#10;red--rouge&#10;blue--bleu"
						/>

						<div class="bulk-actions">
							<button on:click={saveBulkFlashcards} disabled={savingBulk || !bulkText.trim()}>
								{savingBulk ? '...' : 'Sauvegarder'}
							</button>

							<button on:click={() => (showBulkCreate = false)} disabled={savingBulk}>
								Annuler
							</button>
						</div>

						<p class="hint">Format: 1 flashcard par ligne, séparée par <code>--</code></p>
					</div>
				{/if}
			</section>

			<h2>Flashcards ({deck.flashcards?.length ?? 0})</h2>

			{#if (deck.flashcards?.length ?? 0) === 0}
				<p class="hint">Aucune flashcard pour l’instant.</p>
			{:else}
				<div class="list">
					{#each deck.flashcards ?? [] as c}
						<article class="card">
							{#if editingId === c.id}
								<div class="edit">
									<label>
										Front
										<input bind:value={editFront} />
									</label>

									<label>
										Back
										<input bind:value={editBack} />
									</label>

									<label>
										Status
										<select bind:value={editStatus}>
											<option value="NEW">NEW</option>
											<option value="LEARNING">LEARNING</option>
											<option value="REVIEW">REVIEW</option>
											<option value="MASTERED">MASTERED</option>
										</select>
									</label>

									<div class="edit-actions">
										<button
											on:click={saveEdit}
											disabled={savingEdit || !editFront.trim() || !editBack.trim()}
										>
											{savingEdit ? '...' : 'Sauvegarder'}
										</button>
										<button on:click={cancelEdit} disabled={savingEdit}> Annuler </button>
									</div>
								</div>
							{:else}
								<div class="row">
									<strong>Front</strong>
									<span class="status">{c.status}</span>
								</div>
								<p>{c.front}</p>

								<strong>Back</strong>
								<p>{c.back}</p>

								<div class="actions">
									<button on:click={() => startEdit(c)}>Modifier</button>
									<button class="danger" on:click={() => deleteFlashcard(c.id)}>Supprimer</button>
								</div>
							{/if}
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

	.bulk {
		margin-top: 10px;
		border: 1px solid #eee;
		border-radius: 12px;
		padding: 12px;
	}

	textarea {
		width: 100%;
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 10px;
		font-family:
			ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
	}

	.bulk-actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}

	.hint {
		color: #666;
		font-size: 13px;
		margin-top: 8px;
	}

	.actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}

	.edit {
		display: grid;
		gap: 10px;
	}

	.edit label {
		display: grid;
		gap: 6px;
		font-size: 13px;
		color: #444;
	}

	select {
		padding: 8px 10px;
		border: 1px solid #ddd;
		border-radius: 10px;
		background: #fff;
	}

	.edit-actions {
		display: flex;
		gap: 8px;
	}
</style>
