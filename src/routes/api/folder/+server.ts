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

	// Valide le JWT + récupère le user
	const { data: userData, error: userErr } = await supabase.auth.getUser(token);
	if (userErr || !userData.user) {
		return json({ error: 'Unauthorized (invalid token)' }, { status: 401 });
	}
	const userId = userData.user.id;

	// Body
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const id = typeof body?.id === 'string' ? body.id : null;
	const name = typeof body?.name === 'string' ? body.name.trim() : '';

	if (!name) return json({ error: 'Missing "name"' }, { status: 400 });

	// Assure qu'une bibliothèque existe (création à la volée)
	let libraryId: string | null = null;

	const { data: lib, error: libErr } = await supabase
		.from('libraries')
		.select('id')
		.eq('user_id', userId)
		.maybeSingle();

	if (libErr) return json({ error: libErr.message }, { status: 500 });

	if (lib?.id) {
		libraryId = lib.id;
	} else {
		const { data: createdLib, error: createLibErr } = await supabase
			.from('libraries')
			.insert({ user_id: userId, name: 'Ma bibliothèque' })
			.select('id')
			.single();

		if (createLibErr) return json({ error: createLibErr.message }, { status: 500 });
		libraryId = createdLib.id;
	}

	// Rename ou Create
	if (id) {
		const { data: updated, error: updateErr } = await supabase
			.from('folders')
			.update({ name })
			.eq('id', id)
			.select('id, library_id, name, created_at')
			.maybeSingle();

		if (updateErr) return json({ error: updateErr.message }, { status: 500 });
		if (!updated) return json({ error: 'Folder not found' }, { status: 404 });

		return json({ folder: updated });
	} else {
		const { data: created, error: createErr } = await supabase
			.from('folders')
			.insert({ library_id: libraryId, name })
			.select('id, library_id, name, created_at')
			.single();

		if (createErr) return json({ error: createErr.message }, { status: 500 });

		return json({ folder: created });
	}
};
