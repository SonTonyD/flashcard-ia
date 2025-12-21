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
		title: string;
		flashcards?: Flashcard[];
	};

	let loading = true;
	let error: string | null = null;

	let deck: Deck | null = null;

	// Session state (temporaire)
	let initialQueue: Flashcard[] = [];
	let queue: Flashcard[] = [];
	let flipped = false;

	const FLIP_MS = 280;
	let advancing = false;

	function sleep(ms: number) {
		return new Promise((r) => setTimeout(r, ms));
	}

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

	function currentCard(): Flashcard | null {
		return queue.length > 0 ? queue[0] : null;
	}

	function resetFlip() {
		flipped = false;
	}

	function shuffleArray<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
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

		const cards = (deck?.flashcards ?? []).map((c) => ({
			...c,
			front: c.front ?? '',
			back: c.back ?? ''
		}));

		initialQueue = [...cards];
		queue = [...cards];
		resetFlip();

		loading = false;
	}

	async function markKnown() {
		if (queue.length === 0 || advancing) return;
		advancing = true;

		// 1) remettre la carte face avant
		flipped = false;

		// 2) attendre la fin de l'animation pour éviter le spoil
		await sleep(FLIP_MS);

		// 3) avancer
		queue = queue.slice(1);

		advancing = false;
	}

	async function markAgain() {
		if (queue.length === 0 || advancing) return;
		advancing = true;

		flipped = false;
		await sleep(FLIP_MS);

		const [first, ...rest] = queue;
		queue = [...rest, first];

		advancing = false;
	}

	function shuffleCurrent() {
		if (queue.length <= 1) return;
		queue = shuffleArray(queue);
		resetFlip();
	}

	function restartSession() {
		queue = [...initialQueue];
		resetFlip();
	}

	function toggleFlip() {
		if (queue.length === 0) return;
		flipped = !flipped;
	}

	let reverseMode = false;

	function displayFront(c: Flashcard | null) {
		if (!c) return '';
		return reverseMode ? c.back : c.front;
	}

	function displayBack(c: Flashcard | null) {
		if (!c) return '';
		return reverseMode ? c.front : c.back;
	}

	let current: Flashcard | null = null;
	let shownFront = '';
	let shownBack = '';

	$: current = queue.length > 0 ? queue[0] : null;
	$: shownFront = current ? (reverseMode ? current.back : current.front) : '';
	$: shownBack = current ? (reverseMode ? current.front : current.back) : '';

	function toggleReverse() {
		reverseMode = !reverseMode;
		flipped = false; // on revient face "avant"
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

<main class="screen">
	<!-- top-left back -->
	<a class="back" href={`/deck/${$page.params.id}`}>←</a>

	{#if loading}
		<p class="center-text">Chargement…</p>
	{:else if error}
		<p class="center-text error">{error}</p>
	{:else if !deck}
		<p class="center-text">Deck introuvable.</p>
	{:else if queue.length === 0}
		<div class="center">
			<h1 class="title">{deck.title}</h1>
			<p class="center-text">Plus de cartes à réviser 🎉</p>
			<div class="finish-actions">
				<button on:click={restartSession} disabled={initialQueue.length === 0}>Recommencer</button>
				<a class="link" href={`/deck/${deck.id}`}>Retour détail</a>
			</div>
		</div>
	{:else}
		<div class="center">
			<h1 class="title">{deck.title}</h1>

			<!-- big card (about 1/4 height) -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="cardWrap" on:click={toggleFlip} role="button" tabindex="0">
				<div class:flipped class="flip">
					<div class="face front">
						<div class="content">{shownFront}</div>
						<div class="tapHint">Tap pour retourner</div>
					</div>
					<div class="face backFace">
						<div class="content">{shownBack}</div>
						<div class="tapHint">Tap pour retourner</div>
					</div>
				</div>
			</div>

			<div class="remaining">
				Cartes restantes : <strong>{queue.length}</strong>
			</div>
		</div>

		<!-- thumb buttons -->
		<div class="thumbBar">
			<button class="btn nope" on:click={markAgain} aria-label="À revoir">✖</button>
			<button class="btn ok" on:click={markKnown} aria-label="Trouvé">✔</button>
		</div>

		<!-- bottom controls -->
		<div class="bottomBar">
			<button class="iconBtn" on:click={shuffleCurrent} aria-label="Mélanger">🔀</button>
			<button class="iconBtn" on:click={restartSession} aria-label="Recommencer">↻</button>
			<button class="iconBtn" on:click={toggleReverse} aria-label="Mode reverse"> ⇄ </button>
		</div>
	{/if}
</main>

<style>
	.screen {
		height: 100vh;
		padding: 16px;
		box-sizing: border-box;
		font-family:
			system-ui,
			-apple-system,
			Segoe UI,
			Roboto,
			Arial,
			sans-serif;
		position: relative;
	}

	.back {
		position: fixed;
		top: 14px;
		left: 14px;
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		border: 1px solid #ddd;
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		background: #fff;
		z-index: 10;
	}

	.center {
		height: 100%;
		display: grid;
		grid-template-rows: auto auto auto;
		justify-items: center;
		align-content: center;
		gap: 12px;
		padding-bottom: 160px; /* laisse la place aux boutons */
	}

	.title {
		margin: 0;
		font-size: 18px;
		color: #333;
	}

	.center-text {
		margin-top: 80px;
		text-align: center;
		color: #333;
	}

	.error {
		padding: 10px;
		border: 1px solid #f2b8b5;
		background: #fff5f5;
		border-radius: 12px;
		display: inline-block;
	}

	/* Card size: un peu plus de 1/4 écran */
	.cardWrap {
		width: min(520px, 92vw);
		height: min(32vh, 320px);
		perspective: 900px;
		cursor: pointer;
	}

	.flip {
		width: 100%;
		height: 100%;
		position: relative;
		transform-style: preserve-3d;
		transition: transform 280ms ease;
	}

	.flip.flipped {
		transform: rotateY(180deg);
	}

	.face {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
		border: 1px solid #e6e6e6;
		border-radius: 18px;
		background: #fff;
		display: grid;
		align-content: center;
		justify-items: center;
		padding: 18px;
		box-sizing: border-box;
	}

	.front {
	}

	.backFace {
		transform: rotateY(180deg);
	}

	.content {
		font-size: 20px;
		text-align: center;
		word-break: break-word;
	}

	.tapHint {
		margin-top: 14px;
		font-size: 12px;
		color: #777;
	}

	.remaining {
		font-size: 14px;
		color: #444;
	}

	/* Thumb buttons (big, lower-mid) */
	.thumbBar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 92px; /* au-dessus de la bottomBar */
		display: flex;
		justify-content: center;
		gap: 14px;
		padding: 0 16px;
	}

	.btn {
		width: min(44vw, 260px);
		height: 62px;
		border-radius: 18px;
		border: 1px solid #ddd;
		font-size: 26px;
		background: #fff;
	}

	.btn.nope {
		border-color: #f2b8b5;
		background: #fff5f5;
	}

	.btn.ok {
		border-color: #bfe7c7;
		background: #f3fff6;
	}

	/* Bottom controls */
	.bottomBar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 16px;
		display: flex;
		justify-content: center;
		gap: 12px;
	}

	.iconBtn {
		width: 54px;
		height: 54px;
		border-radius: 16px;
		border: 1px solid #ddd;
		background: #fff;
		font-size: 20px;
	}

	.finish-actions {
		display: flex;
		gap: 10px;
		margin-top: 10px;
		align-items: center;
	}

	button {
		cursor: pointer;
	}

	.link {
		text-decoration: none;
		color: inherit;
		border: 1px solid #ddd;
		padding: 10px 12px;
		border-radius: 12px;
		background: #fff;
	}

	.iconBtn.active {
		border-color: #bbb;
		background: #f6f6f6;
	}
</style>
