/* eslint-disable @typescript-eslint/no-explicit-any */
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function getBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;
	const [type, token] = authHeader.split(' ');
	if (type?.toLowerCase() !== 'bearer' || !token) return null;
	return token;
}

type FlashcardItem = { front: string; back: string };

export const POST: RequestHandler = async ({ request }) => {
	const token = getBearerToken(request.headers.get('authorization'));
	if (!token) return json({ error: 'Unauthorized (missing Bearer token)' }, { status: 401 });

	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});

	const { data: userData, error: userErr } = await supabase.auth.getUser(token);
	if (userErr || !userData.user)
		return json({ error: 'Unauthorized (invalid token)' }, { status: 401 });

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const id = typeof body?.id === 'string' ? body.id : null;

	// --- UPDATE (optionnel, tu peux enlever si tu veux)
	if (id) {
		const front = typeof body?.front === 'string' ? body.front.trim() : '';
		const back = typeof body?.back === 'string' ? body.back.trim() : '';
		const status = typeof body?.status === 'string' ? body.status : null;

		if (!front) return json({ error: 'Missing "front"' }, { status: 400 });
		if (!back) return json({ error: 'Missing "back"' }, { status: 400 });

		const payload: any = { front, back };
		if (status) payload.status = status;

		const { data: updated, error } = await supabase
			.from('flashcards')
			.update(payload)
			.eq('id', id)
			.select('id, deck_id, front, back, status, created_at')
			.maybeSingle();

		if (error) return json({ error: error.message }, { status: 500 });
		if (!updated) return json({ error: 'Flashcard not found' }, { status: 404 });

		return json({ flashcard: updated });
	}

	// --- CREATE (single OU bulk)
	const deck_id = typeof body?.deck_id === 'string' ? body.deck_id : null;
	if (!deck_id) return json({ error: 'Missing "deck_id"' }, { status: 400 });

	// Mode BULK: items = [{front, back}, ...]
	if (Array.isArray(body?.items)) {
		const rawItems = body.items as any[];

		// petite barrière anti-abus (tu peux ajuster)
		if (rawItems.length === 0) return json({ error: 'No items to insert' }, { status: 400 });
		if (rawItems.length > 300) return json({ error: 'Too many items (max 300)' }, { status: 400 });

		const items: FlashcardItem[] = rawItems
			.map((it) => ({
				front: typeof it?.front === 'string' ? it.front.trim() : '',
				back: typeof it?.back === 'string' ? it.back.trim() : ''
			}))
			.filter((it) => it.front && it.back);

		if (items.length === 0)
			return json({ error: 'No valid items (need front + back)' }, { status: 400 });

		const { data: created, error } = await supabase
			.from('flashcards')
			.insert(items.map((it) => ({ deck_id, front: it.front, back: it.back })))
			.select('id, deck_id, front, back, status, created_at');

		if (error) return json({ error: error.message }, { status: 500 });

		return json({ createdCount: created?.length ?? 0, flashcards: created ?? [] });
	}

	// Mode SINGLE
	const front = typeof body?.front === 'string' ? body.front.trim() : '';
	const back = typeof body?.back === 'string' ? body.back.trim() : '';
	if (!front) return json({ error: 'Missing "front"' }, { status: 400 });
	if (!back) return json({ error: 'Missing "back"' }, { status: 400 });

	const { data: created, error } = await supabase
		.from('flashcards')
		.insert({ deck_id, front, back })
		.select('id, deck_id, front, back, status, created_at')
		.single();

	if (error) return json({ error: error.message }, { status: 500 });

	return json({ flashcard: created });
};
