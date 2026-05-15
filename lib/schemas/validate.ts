// Run with: npx tsx lib/schemas/validate.ts
import { SurfSpotSchema, SkydiveSchema, ParaglidingSchema, BasejumpSchema, WebcamSchema, validateData } from './index'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const surf = require('../../data/surf-spots.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const skydive = require('../../data/skydive-dz.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const paragliding = require('../../data/paragliding-spots.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const basejump = require('../../data/basejump-exits.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webcams = require('../../data/webcams.json')

validateData(SurfSpotSchema, surf, 'surf-spots')
validateData(SkydiveSchema, skydive, 'skydive-dz')
validateData(ParaglidingSchema, paragliding, 'paragliding-spots')
validateData(BasejumpSchema, basejump, 'basejump-exits')
validateData(WebcamSchema, webcams, 'webcams')
console.log('✅ Validation complete')
