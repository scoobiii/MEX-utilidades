import { NameplateData, ObservedTelemetry, DerivedMetrics, InferredMetrics } from '../types/airvolution';

export const DEFAULT_NAMEPLATE: NameplateData = {
  manufacturer: 'Midea Carrier',
  model_indoor: '42AFVCI18S5',
  model_outdoor: '38TVCI18S5',
  nominal_voltage_v: 220.0,
  phases: 1,
  frequency_hz: 60.0,
  max_current_a: 10.30,
  nominal_cooling_capacity_kw: 5.28, // 18.000 BTU/h
  refrigerant: 'R-32',
};

function rnd(v: number | null | undefined, n = 2): number | null {
  if (v === null || v === undefined || isNaN(v)) return null;
  return Number(v.toFixed(n));
}

export function calculateAirVolutionMetrics(
  observed: ObservedTelemetry,
  previous?: ObservedTelemetry,
  plate: NameplateData = DEFAULT_NAMEPLATE
): { derived: DerivedMetrics; inferred: InferredMetrics } {
  const { t1_c, t2_c, t3_c, t4_c, setpoint_c, voltage_v, current_a, compressor_power_w } = observed;

  // DERIVED: Deterministic calculations from observed physical inputs
  const delta_t_c = t1_c !== null && t2_c !== null ? rnd(t1_c - t2_c) : null;
  const setpoint_error_c = t1_c !== null && setpoint_c !== null ? rnd(t1_c - setpoint_c) : null;

  let cooling_rate_c_per_min: number | null = null;
  if (previous && t1_c !== null && previous.t1_c !== null) {
    const pt = previous.t1_c;
    const pms = previous.timestamp_ms;
    const cms = observed.timestamp_ms;
    if (cms > pms) {
      cooling_rate_c_per_min = rnd((pt - t1_c) / ((cms - pms) / 60000), 4);
    }
  }

  // Electrical: Never fabricate power from cooling capacity (5.28 kW / 220V is forbidden)
  const electrical_apparent_power_va = voltage_v !== null && current_a !== null ? rnd(voltage_v * current_a, 1) : null;
  const electrical_load_pct = current_a !== null ? rnd((100 * current_a) / plate.max_current_a, 1) : null;
  const electrical_power_est_w = compressor_power_w !== null ? compressor_power_w : electrical_apparent_power_va;

  const estimated_cop =
    electrical_power_est_w && electrical_power_est_w > 0
      ? rnd(plate.nominal_cooling_capacity_kw / (electrical_power_est_w / 1000), 3)
      : null;

  // INFERRED: Documented heuristics with explicit physical uncertainty warnings
  let superheat_est_c: number | null = null;
  if (t1_c !== null && t2_c !== null) {
    const rawSh = 6 + 0.08 * Math.max(0, (t1_c - t2_c) - 10) + 0.12 * Math.max(0, 7 - t2_c);
    superheat_est_c = rnd(Math.max(0, Math.min(20, rawSh)), 1);
  }

  let subcooling_est_c: number | null = null;
  if (t3_c !== null && t4_c !== null) {
    const rawSc = 3 + 0.06 * Math.max(0, (t3_c - t4_c) - 10);
    subcooling_est_c = rnd(Math.max(0, Math.min(15, rawSc)), 1);
  }

  // Diagnostic scoring according to AirVolution R8 calculation engine
  let score = 0;
  const reasons: string[] = [];

  if (delta_t_c !== null) {
    if (delta_t_c < 5) {
      score += 35;
      reasons.push('delta_t_baixo (ΔT < 5°C - possível restrição ou baixa troca térmica)');
    } else if (delta_t_c > 25) {
      score += 15;
      reasons.push('delta_t_alto (ΔT > 25°C - vazão de ar reduzida)');
    }
  }

  if (t1_c !== null && t2_c !== null && setpoint_c !== null && t2_c < 3 && t1_c > setpoint_c + 2) {
    score += 25;
    reasons.push('evaporador_muito_frio_com_ambiente_acima_setpoint (risco de congelamento)');
  }

  if (t3_c !== null && t4_c !== null && t3_c - t4_c > 35) {
    score += 25;
    reasons.push('elevacao_condensacao (ΔT condensador > 35°C - condensador sujo ou obstruído)');
  }

  if (current_a !== null && current_a > plate.max_current_a) {
    score += 40;
    reasons.push(`corrente_acima_placa (${current_a}A > ${plate.max_current_a}A - sobrecarga elétrica)`);
  }

  const thermal_status: InferredMetrics['thermal_status'] =
    score >= 60 ? 'ATENCAO' : score >= 30 ? 'OBSERVAR' : 'SEM_ANOMALIA_EVIDENTE';

  return {
    derived: {
      delta_t_c,
      setpoint_error_c,
      cooling_rate_c_per_min,
      electrical_load_pct,
      electrical_apparent_power_va,
      electrical_power_est_w,
      estimated_cop,
    },
    inferred: {
      superheat_est_c,
      subcooling_est_c,
      thermal_anomaly_score: score,
      thermal_status,
      thermal_reasons: reasons,
      limitations: {
        superheat: 'INFERIDO: requer transdutor de pressão de sucção + sonda de contato na linha de sucção para medição física real.',
        subcooling: 'INFERIDO: requer transdutor de pressão de condensação + sonda na linha de líquido para medição física real.',
        electrical: 'Grandezas elétricas são reais apenas quando reportadas pelo protocolo M-Smart; 10,30 A é corrente de placa de referência.',
      },
    },
  };
}
