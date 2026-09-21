import type { AirVolutionUnit, CondenserTelemetry, EvaporatorTelemetry, IAQBME680Data } from '../types/airvolution';

/**
 * Production data policy:
 * This module contains no demo/synthetic equipment records.
 * Runtime equipment must come from an observed gateway/API source.
 */

export function calculateCurrentDeltaTIntervals(baseT1: number, baseT2: number): EvaporatorTelemetry['delta_t_intervals'] {
  const current = Number((baseT1 - baseT2).toFixed(1));
  const point = { time: 'Agora', dt: current, t1: baseT1, t2: baseT2 };
  const stats = (label: string, interval: '1h' | '24h' | '30d' | '12m' | '5y' | 'max'): EvaporatorTelemetry['delta_t_intervals']['horario'] => ({
    label,
    interval,
    current,
    avg: current,
    min: current,
    max: current,
    data: [point],
  });
  return {
    horario: stats('Horário (dados observados disponíveis)', '1h'),
    diario: stats('Diário (dados observados disponíveis)', '24h'),
    mensal: stats('Mensal (dados observados disponíveis)', '30d'),
    anual: stats('Anual (dados observados disponíveis)', '12m'),
    '5_anos': stats('5 anos (dados observados disponíveis)', '5y'),
    maximo: stats('Máximo histórico (dados observados disponíveis)', 'max'),
  };
}

export function deriveIAQBME680(
  score: number,
  eco2: number,
  bvoc: number,
  hum: number,
  press: number,
  temp: number,
  gasResistanceKohm: number,
): IAQBME680Data {
  let rating: IAQBME680Data['rating'] = 'Excelente';
  let rating_color = 'emerald';
  if (score > 200) { rating = 'Crítico'; rating_color = 'red'; }
  else if (score > 150) { rating = 'Ruim'; rating_color = 'orange'; }
  else if (score > 100) { rating = 'Moderado'; rating_color = 'amber'; }
  else if (score > 50) { rating = 'Bom'; rating_color = 'blue'; }

  return {
    iaq_score: score,
    rating,
    rating_color,
    eco2_ppm: eco2,
    bvoc_ppm: bvoc,
    humidity_pct: hum,
    pressure_hpa: press,
    gas_resistance_kohm: gasResistanceKohm,
    sensor_temp_c: temp,
    anvisa_compliance: eco2 <= 1000,
    anvisa_status: eco2 <= 1000 ? 'Conforme' : 'Não Conforme',
    air_renewal_index: 'Não disponível sem medição/metadata de projeto',
    last_calibration: 'Não informado',
  };
}

export function deriveCondenserData(
  t4: number,
  t3: number,
  tLiq: number,
  voltage: number,
  current: number,
  freq?: number,
  fanRpm?: number,
): CondenserTelemetry {
  const deltaT = Number((t3 - tLiq).toFixed(1));
  return {
    outdoor_ambient_t4_c: t4,
    discharge_temp_t3_c: t3,
    liquid_line_temp_c: tLiq,
    delta_t_discharge_liquid_c: deltaT,
    voltage_v: voltage,
    current_a: current,
    compressor_freq_hz: freq ?? 0,
    fan_outdoor_rpm: fanRpm ?? 0,
    subcooling_k: 0,
    condenser_operational_status: t3 > 95 ? 'Sobrecarga' : t3 > 85 ? 'Alerta Térmico' : 'Normal',
  };
}

/**
 * No seed/mock devices are shipped in production.
 * The UI should populate this collection from the gateway/API.
 */
export const initialAirVolutionUnits: AirVolutionUnit[] = [];
