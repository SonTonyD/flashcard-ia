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

export const DELETE: RequestHandler = async ({ request, params }) => {
	const token = getBearerToken(request.headers.get('authorization'));
	if (!token) return json({ error: 'Unauthorized (missing Bearer token)' }, { status: 401 });

	const id = params.id;
	if (!id) return json({ error: 'Missing deck id' }, { status: 400 });

	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});

	const { data: userData, error: userErr } = await supabase.auth.getUser(token);
	if (userErr || !userData.user)
		return json({ error: 'Unauthorized (invalid token)' }, { status: 401 });

	// delete + select pour savoir si ça a supprimé quelque chose
	const { data: deleted, error } = await supabase
		.from('decks')
		.delete()
		.eq('id', id)
		.select('id')
		.maybeSingle();

	if (error) return json({ error: error.message }, { status: 500 });
	if (!deleted) return json({ error: 'Deck not found' }, { status: 404 });

	return json({ ok: true, id });
};
