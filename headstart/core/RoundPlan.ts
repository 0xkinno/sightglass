// RoundPlan.ts
// The round card: which gauges the duty engineer reads, in walking order, with the limits the
// chief engineer set. Everything here is a human assertion (memory comes only from people).
// Values below are a sample machinery space for a slow-speed two-stroke main engine plant,
// modelled on typical limits; the README must call it "a sample round card", not a real ship's.

export interface Bands {
  alarmLow?: number
  warnLow?: number
  warnHigh?: number
  alarmHigh?: number
}

export interface GaugeSpec {
  id: string // stable id used in the log, e.g. "ME-LO-IN"
  label: string // what the engineer calls it, e.g. "Main engine LO inlet"
  station: string // where it is on the walk, e.g. "Main engine, manoeuvring side"
  unit: string
  min: number // lowest printed value on the dial
  max: number // highest printed value on the dial
  minorTick: number
  bands: Bands
  maxChangePerHour: number // a reading that moved faster than this since the last watch goes to REVIEW
}

export interface RoundPlan {
  id: string
  name: string
  gauges: GaugeSpec[]
}

// Sample round card. Keep it short enough to film (8 gauges), long enough to be a real round.
export const SAMPLE_UMS_ROUND: RoundPlan = {
  id: "ums-evening-v1",
  name: "Evening round before UMS",
  gauges: [
    {
      id: "ME-LO-IN",
      label: "Main engine LO inlet",
      station: "Main engine, manoeuvring side",
      unit: "bar",
      min: 0,
      max: 6,
      minorTick: 0.2,
      bands: {alarmLow: 1.8, warnLow: 2.2, warnHigh: 4.5},
      maxChangePerHour: 0.6,
    },
    {
      id: "ME-JCW-OUT",
      label: "Jacket cooling water outlet",
      station: "Main engine, manoeuvring side",
      unit: "C",
      min: 0,
      max: 120,
      minorTick: 2,
      bands: {warnLow: 70, warnHigh: 88, alarmHigh: 92},
      maxChangePerHour: 8,
    },
    {
      id: "ME-SCAV",
      label: "Scavenge air pressure",
      station: "Main engine, exhaust side",
      unit: "bar",
      min: 0,
      max: 4,
      minorTick: 0.1,
      bands: {warnHigh: 3.4, alarmHigh: 3.7},
      maxChangePerHour: 0.5,
    },
    {
      id: "FO-SUP",
      label: "Fuel oil supply pressure",
      station: "Fuel module",
      unit: "bar",
      min: 0,
      max: 16,
      minorTick: 0.5,
      bands: {alarmLow: 6, warnLow: 7, warnHigh: 10},
      maxChangePerHour: 1.5,
    },
    {
      id: "SW-PUMP",
      label: "Sea water pump discharge",
      station: "Pump flat",
      unit: "bar",
      min: 0,
      max: 6,
      minorTick: 0.2,
      bands: {alarmLow: 1.2, warnLow: 1.6},
      maxChangePerHour: 0.6,
    },
    {
      id: "AE1-LO",
      label: "Generator 1 LO pressure",
      station: "Generator flat",
      unit: "bar",
      min: 0,
      max: 10,
      minorTick: 0.2,
      bands: {alarmLow: 3.0, warnLow: 3.5},
      maxChangePerHour: 0.8,
    },
    {
      id: "AIR-START",
      label: "Starting air receiver",
      station: "Compressor room",
      unit: "bar",
      min: 0,
      max: 40,
      minorTick: 1,
      bands: {alarmLow: 15, warnLow: 22},
      maxChangePerHour: 6,
    },
    {
      id: "STG-OIL",
      label: "Steering gear oil temperature",
      station: "Steering gear room",
      unit: "C",
      min: 0,
      max: 100,
      minorTick: 2,
      bands: {warnHigh: 60, alarmHigh: 70},
      maxChangePerHour: 10,
    },
  ],
}

export function gaugeById(plan: RoundPlan, id: string): GaugeSpec | null {
  for (const g of plan.gauges) if (g.id === id) return g
  return null
}
