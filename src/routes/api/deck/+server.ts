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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const id = typeof body?.id === 'string' ? body.id : null;
	const folder_id = typeof body?.folder_id === 'string' ? body.folder_id : null;
	const title = typeof body?.title === 'string' ? body.title.trim() : '';

	const description = typeof body?.description === 'string' ? body.description : null;
	const difficulty = typeof body?.difficulty === 'string' ? body.difficulty : null;
	const objective = typeof body?.objective === 'string' ? body.objective : null;

	if (!title) return json({ error: 'Missing "title"' }, { status: 400 });

	// Rename
	if (id) {
		const { data: updated, error: updateErr } = await supabase
			.from('decks')
			.update({ title, description, difficulty, objective })
			.eq('id', id)
			.select('id, folder_id, title, description, difficulty, objective, created_at')
			.maybeSingle();

		if (updateErr) return json({ error: updateErr.message }, { status: 500 });
		if (!updated) return json({ error: 'Deck not found' }, { status: 404 });

		return json({ deck: updated });
	}

	// Create
	if (!folder_id) return json({ error: 'Missing "folder_id"' }, { status: 400 });

	const { data: created, error: createErr } = await supabase
		.from('decks')
		.insert({ folder_id, title, description, difficulty, objective })
		.select('id, folder_id, title, description, difficulty, objective, created_at')
		.single();

	if (createErr) return json({ error: createErr.message }, { status: 500 });

	return json({ deck: created });
};
