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

export const GET: RequestHandler = async ({ request }) => {
	const token = getBearerToken(request.headers.get('authorization'));
	if (!token) {
		return json({ error: 'Unauthorized (missing Bearer token)' }, { status: 401 });
	}

	// Client Supabase "stateless" qui exécute les requêtes avec le JWT user
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});

	// Valide le JWT + récupère l'user (utile pour filtrer explicitement)
	const { data: userData, error: userErr } = await supabase.auth.getUser(token);
	if (userErr || !userData.user) {
		return json({ error: 'Unauthorized (invalid token)' }, { status: 401 });
	}

	const { data, error } = await supabase
		.from('libraries')
		.select(
			`
      id,
      name,
      created_at,
      folders (
        id,
        name,
        created_at,
        decks (
          id,
          title,
          description,
          difficulty,
          objective,
          created_at
        )
      )
    `
		)
		.eq('user_id', userData.user.id) // explicite, même si RLS suffit
		.maybeSingle();

	if (error) return json({ error: error.message }, { status: 500 });

	return json({ library: data ?? null });
};
