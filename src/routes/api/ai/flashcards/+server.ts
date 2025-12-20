/* eslint-disable @typescript-eslint/no-explicit-any */
import { OPENAI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import type { RequestHandler } from './$types';

function getBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;
	const [type, token] = authHeader.split(' ');
	if (type?.toLowerCase() !== 'bearer' || !token) return null;
	return token;
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
	// (recommandé) protège ton endpoint, sinon n’importe qui peut griller ton quota
	const token = getBearerToken(request.headers.get('authorization'));
	if (!token) return json({ error: 'Unauthorized (missing Bearer token)' }, { status: 401 });

	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const theme = typeof body?.theme === 'string' ? body.theme.trim() : '';
	const difficulty = typeof body?.difficulty === 'string' ? body.difficulty.trim() : '';
	const count = typeof body?.count === 'number' ? body.count : parseInt(body?.count, 10);

	const objective = typeof body?.objective === 'string' ? body.objective.trim() : '';
	const details = typeof body?.details === 'string' ? body.details.trim() : '';

	if (!theme) return json({ error: 'Missing "theme"' }, { status: 400 });
	if (!difficulty) return json({ error: 'Missing "difficulty"' }, { status: 400 });
	if (!Number.isFinite(count) || count < 1 || count > 50) {
		return json({ error: '"count" must be between 1 and 50' }, { status: 400 });
	}

	const schema = {
		type: 'object',
		properties: {
			cards: {
				type: 'array',
				minItems: count,
				maxItems: count,
				items: {
					type: 'object',
					properties: {
						front: { type: 'string' },
						back: { type: 'string' }
					},
					required: ['front', 'back'],
					additionalProperties: false
				}
			}
		},
		required: ['cards'],
		additionalProperties: false
	} as const;

	const instructions =
		`Tu es un générateur de flashcards.\n` +
		`Tu produis exactement ${count} flashcards.\n` +
		`- "front" : question courte / terme / prompt\n` +
		`- "back" : réponse courte et utile\n` +
		`- évite les listes longues, 1 à 2 phrases max par champ\n` +
		`- pas de markdown\n` +
		`- n’utilise pas le séparateur "--" dans les champs (réserve-le pour l’affichage)\n`;

	const userPrompt =
		`Thème: ${theme}\n` +
		`Difficulté: ${difficulty}\n` +
		(objective ? `Objectif: ${objective}\n` : '') +
		(details ? `Détails supplémentaires: ${details}\n` : '');

	const resp = await client.responses.create({
		model: 'gpt-4o-mini',
		input: [
			{ role: 'system', content: instructions },
			{ role: 'user', content: userPrompt }
		],
		text: {
			format: {
				type: 'json_schema',
				name: 'flashcards',
				schema,
				strict: true
			}
		}
	});

	// Avec json_schema, output_text est un JSON sous forme de string
	const raw = resp.output_text ?? '';
	let parsed: any;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return json({ error: 'AI returned invalid JSON', raw }, { status: 500 });
	}

	const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
	const lines = cards
		.map((c: any) => {
			const front = String(c?.front ?? '')
				.replaceAll('\n', ' ')
				.trim();
			const back = String(c?.back ?? '')
				.replaceAll('\n', ' ')
				.trim();
			return `${front}--${back}`;
		})
		.join('\n');

	return json({ lines });
};
