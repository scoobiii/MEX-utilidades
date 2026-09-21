export type ProvenanceNamespace = 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'NAMEPLATE';

export interface DeltaTIntervalPoint {
  time: string;
  dt: number;
  t1: number;
  t2: number;
}

export interface DeltaTIntervalStats {
  label: string;
  interval: '1h' | '24h' | '30d' | '12m' | '5y' | 'max';
  current: number;
  avg: number;
  min: number;
  max: number;
  peakDate?: string;
  minDate?: string;
  data: DeltaTIntervalPoint[];
}

export interface IAQBME680Data {
  iaq_score: number; // 0 - 500
  rating: 'Excelente' | 'Bom' | 'Moderado' | 'Ruim' | 'Crítico';
  rating_color: string;
  eco2_ppm: number; // e.g. 520 ppm
  bvoc_ppm: number; // e.g. 0.18 ppm
  humidity_pct: number; // e.g. 54.2%
  pressure_hpa: number; // e.g. 1014.2 hPa
  gas_resistance_kohm: number; // e.g. 142.5 kOhm
  sensor_temp_c: number; // e.g. 22.1 C
  anvisa_compliance: boolean;
  anvisa_status: string;
  air_renewal_index: string;
  last_calibration: string;
}

export interface EvaporatorTelemetry {
  ambient_return_t1_c: number; // Temperatura Ambiente [Retorno]
  evaporator_coil_t2_c: number; // Temperatura Evaporador
  voltage_v: number; // Tensão Evaporadora (V)
  current_a: number; // Corrente Evaporadora (A)
  delta_t_c: number; // T1 - T2
  delta_t_intervals: {
    horario: DeltaTIntervalStats;
    diario: DeltaTIntervalStats;
    mensal: DeltaTIntervalStats;
    anual: DeltaTIntervalStats;
    '5_anos': DeltaTIntervalStats;
    maximo: DeltaTIntervalStats;
  };
  iaq_bme680: IAQBME680Data;
}

export interface CondenserTelemetry {
  outdoor_ambient_t4_c: number; // Temperatura externa
  discharge_temp_t3_c: number; // Temperatura descarga
  liquid_line_temp_c: number; // Linha de líquido
  delta_t_discharge_liquid_c: number; // DT descarga/linha de líquido
  voltage_v: number; // Tensão Condensador (V)
  current_a: number; // Corrente Condensador (A)
  compressor_freq_hz: number;
  fan_outdoor_rpm: number;
  subcooling_k: number;
  condenser_operational_status: 'Normal' | 'Alerta Térmico' | 'Degelo' | 'Sobrecarga';
}

export interface NameplateData {
  manufacturer: string;
  model_indoor: string;
  model_outdoor: string;
  nominal_voltage_v: number;
  phases: number;
  frequency_hz: number;
  max_current_a: number;
  nominal_cooling_capacity_kw: number;
  refrigerant: string;
}

export const DEFAULT_NAMEPLATE: NameplateData = {
  manufacturer: 'Midea Carrier',
  model_indoor: '42AFCG18F5',
  model_outdoor: '38TVCG18F5',
  nominal_voltage_v: 220,
  phases: 1,
  frequency_hz: 60,
  max_current_a: 10.3,
  nominal_cooling_capacity_kw: 5.28,
  refrigerant: 'R-410A',
};

export interface ObservedTelemetry {
  timestamp_ms: number;
  t1_c: number | null; // Ambient / Return
  t2_c: number | null; // Evaporator / Indoor Coil
  t3_c: number | null; // Condenser / Outdoor Coil
  t4_c: number | null; // Outdoor Ambient
  setpoint_c: number | null;
  mode: 'cool' | 'heat' | 'fan' | 'dry' | 'auto' | 'off';
  fan: 'auto' | 'low' | 'med' | 'high' | number;
  compressor_state: 'on' | 'off' | 'modulating';
  error_code: string | null;
  voltage_v: number | null;
  current_a: number | null;
  compressor_power_w: number | null;
}

export interface DerivedMetrics {
  delta_t_c: number | null; // T1 - T2
  setpoint_error_c: number | null; // T1 - Setpoint
  cooling_rate_c_per_min: number | null;
  electrical_load_pct: number | null; // (current_a / 10.3A) * 100
  electrical_apparent_power_va: number | null;
  electrical_power_est_w: number | null;
  estimated_cop: number | null;
}

export interface InferredMetrics {
  superheat_est_c: number | null;
  subcooling_est_c: number | null;
  thermal_anomaly_score: number;
  thermal_status: 'SEM_ANOMALIA_EVIDENTE' | 'OBSERVAR' | 'ATENCAO';
  thermal_reasons: string[];
  limitations: {
    superheat: string;
    subcooling: string;
    electrical: string;
  };
}

export type CommandAuditState = 'REQUESTED' | 'SENT' | 'ACKNOWLEDGED' | 'VERIFIED' | 'FAILED' | 'TIMEOUT';

export interface CommandAudit {
  id: string;
  timestamp: string;
  command: string;
  target_value: string | number;
  state: CommandAuditState;
  raw_hex_sent?: string;
  raw_hex_ack?: string;
  verification_delay_ms?: number;
  operator: string;
}

export interface RawMideaFrame {
  id: string;
  timestamp: string;
  msg_type: string;
  direction: 'RX' | 'TX';
  raw_hex: string;
  length: number;
  decoder_status: 'UNVERIFIED' | 'VERIFIED' | 'RAW_EVIDENCE';
}

export interface ProvenanceChainItem {
  stage: 'SOURCE' | 'EVIDENCE' | 'INTERPRETATION' | 'ENGINEERING_DECISION' | 'IMPLEMENTATION' | 'VERIFICATION';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED' | 'REJECTED';
  inputs: string[];
  outputs: string[];
  actor: string;
  method: string;
  timestamp: string;
  notes: string;
}

export interface AirVolutionUnit {
  id: string;
  serialNumber: string;
  blockId: string;
  blockName: string;
  location: string;
  ip_address: string;
  port: number;
  gateway_status: 'online' | 'degraded' | 'offline';
  last_ping_ms: number;
  nameplate: NameplateData;
  telemetry: {
    observed: ObservedTelemetry;
    derived: DerivedMetrics;
    inferred: InferredMetrics;
  };
  evaporator?: EvaporatorTelemetry;
  condenser?: CondenserTelemetry;
  recentHistory: {
    time: string;
    timestamp_ms: number;
    t1: number;
    t2: number;
    t3: number;
    t4: number;
    setpoint: number;
    delta_t: number;
    current: number;
    power: number;
    cop: number;
  }[];
  forecast: {
    time: string;
    t1_projected: number;
    delta_t_projected: number;
    thermal_load_projected: number;
    confidence_upper: number;
    confidence_lower: number;
  }[];
  rawFrames: RawMideaFrame[];
  commandAudits: CommandAudit[];
  provenanceChain: ProvenanceChainItem[];
}
