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
	if (!token) return json({ error: 'Unauthorized (missing Bearer token)' }, { status: 401 });

	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	});

	const { data: userData, error: userErr } = await supabase.auth.getUser(token);
	if (userErr || !userData.user)
		return json({ error: 'Unauthorized (invalid token)' }, { status: 401 });

	const userId = userData.user.id;

	// 1) Cherche la bibliothèque existante (avec dossiers + decks)
	const { data: lib, error: libErr } = await supabase
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
		.eq('user_id', userId)
		.order('created_at', { ascending: true })
		.maybeSingle();

	if (libErr) return json({ error: libErr.message }, { status: 500 });

	// 2) Si aucune library : on la crée, puis on la renvoie (vide)
	if (!lib) {
		const { data: created, error: createErr } = await supabase
			.from('libraries')
			.insert({ user_id: userId, name: 'Ma bibliothèque' })
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
			.single();

		if (createErr) return json({ error: createErr.message }, { status: 500 });

		return json({ library: created });
	}

	return json({ library: lib });
};
