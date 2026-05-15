import { z } from 'zod'

export const GeoPointBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
})

export const SurfSpotSchema = GeoPointBaseSchema.extend({
  country: z.string(),
  level: z.string(),
  breakType: z.string(),
  facingDeg: z.number().optional(),
  shomHarbor: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

export const SkydiveSchema = GeoPointBaseSchema.extend({
  icao: z.string().optional(),
  altitudeM: z.number(),
  radio: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  aircraft: z.array(z.string()).optional(),
  maxAltitudeM: z.number().optional(),
})

export const ParaglidingSchema = GeoPointBaseSchema.extend({
  country: z.string(),
  type: z.string(),
  level: z.string(),
  altitudeM: z.number(),
  windDirections: z.array(z.string()),
})

export const BasejumpSchema = GeoPointBaseSchema.extend({
  country: z.string(),
  type: z.string(),
  heightM: z.number(),
  openingAltitudeM: z.number(),
  difficulty: z.string(),
  legal: z.string(),
})

export const WebcamSchema = z.object({
  id: z.string(),
  title: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  streamUrl: z.string().url(),
  city: z.string().optional(),
  country: z.string().optional(),
})

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown[], name: string): T[] {
  return data.reduce<T[]>((acc, item, i) => {
    const result = schema.safeParse(item)
    if (!result.success) {
      console.warn(`[SentinAile] ${name}[${i}] warning:`, result.error.flatten())
    } else {
      acc.push(result.data)
    }
    return acc
  }, [])
}
