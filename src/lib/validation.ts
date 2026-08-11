import { z } from 'zod'

// Client-side validation. The authoritative checks are the CHECK constraints in
// supabase/schema.sql — these bounds mirror them so the user gets an immediate,
// readable message in German instead of a Postgres constraint error.

const MAX_DURATION_SECONDS = 86400 // 24 h
const MAX_DISTANCE_M = 200000 // 200 km

/** Tomorrow, to tolerate a device whose clock or timezone is a few hours ahead. */
function latestAllowedDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export const sessionSchema = z.object({
  session_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte ein gültiges Datum wählen.')
    .refine((d) => d >= '2000-01-01', 'Das Datum liegt zu weit in der Vergangenheit.')
    .refine((d) => d <= latestAllowedDate(), 'Das Datum liegt in der Zukunft.'),

  duration_seconds: z
    .int('Bitte die Dauer als mm:ss angeben.')
    .min(1, 'Die Dauer muss größer als null sein.')
    .max(MAX_DURATION_SECONDS, 'Die Dauer ist unrealistisch hoch (max. 24 Stunden).'),

  distance_m: z
    .int('Die Distanz muss eine ganze Zahl in Metern sein.')
    .min(1, 'Die Distanz muss größer als null sein.')
    .max(MAX_DISTANCE_M, 'Die Distanz ist unrealistisch hoch (max. 200 km).'),

  total_strokes: z
    .int('Ruderschläge müssen eine ganze Zahl sein.')
    .min(0)
    .max(100000, 'Die Anzahl Ruderschläge ist unrealistisch hoch.')
    .nullable(),

  avg_spm: z
    .number()
    .min(0)
    .max(200, 'Die Schlagfrequenz ist unrealistisch hoch.')
    .nullable(),

  pace_per_500m_seconds: z
    .number()
    .min(1, 'Die Zeit pro 500 m muss größer als null sein.')
    .max(3600, 'Die Zeit pro 500 m ist unrealistisch hoch.')
    .nullable(),

  resistance_level: z
    .int()
    .min(1, 'Die Widerstandsstufe liegt zwischen 1 und 15.')
    .max(15, 'Die Widerstandsstufe liegt zwischen 1 und 15.')
    .nullable(),
})

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Bitte einen Namen eingeben.')
  .max(40, 'Der Name darf höchstens 40 Zeichen lang sein.')

export const crewNameSchema = z
  .string()
  .trim()
  .max(60, 'Der Crew-Name darf höchstens 60 Zeichen lang sein.')

export type SessionInput = z.infer<typeof sessionSchema>

/** First error message from a parse result, for single-line form feedback. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Eingabe ungültig.'
}
