// RENAME A FOLDER
if (True) {
	await fetch('/api/folder', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ id: 'UUID_DU_FOLDER', name: 'Japonais (N5)' })
	})
		.then((r) => r.json())
		.then(console.log);
}

// CREATE A FOLDER
if (True) {
	const raw = localStorage.getItem(
		Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
	);
	const token = JSON.parse(raw).access_token;

	await fetch('/api/folder', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ name: 'Japonais' })
	})
		.then((r) => r.json())
		.then(console.log);
}

// CREATE NEW DECK
if (True) {
	const raw = localStorage.getItem(
		Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
	);
	const token = JSON.parse(raw).access_token;

	// remplace par un folder_id existant
	const folderId = '38645387-c3da-4889-85a7-867a6028bf5b';

	await fetch('/api/deck', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			folder_id: folderId,
			title: 'Kanji N5',
			description: 'Deck de révision',
			difficulty: 'easy',
			objective: 'Apprendre les bases'
		})
	})
		.then((r) => r.json())
		.then(console.log);
}

// DELETE A DECK
if (True) {
	const raw = localStorage.getItem(
		Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
	);
	const token = JSON.parse(raw).access_token;

	const deckId = 'UUID_DECK';

	await fetch(`/api/deck/${deckId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	})
		.then((r) => r.json())
		.then(console.log);
}
