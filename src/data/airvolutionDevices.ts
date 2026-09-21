import { 
  AirVolutionUnit, 
  DEFAULT_NAMEPLATE, 
  EvaporatorTelemetry, 
  CondenserTelemetry, 
  IAQBME680Data 
} from '../types/airvolution';
import { calculateAirVolutionMetrics } from '../services/airvolutionEngine';

// Generator for DeltaT across the 6 intervals requested: horario, diario, mensal, anual, 5_anos, maximo
export function generateDeltaTIntervals(baseT1: number, baseT2: number): EvaporatorTelemetry['delta_t_intervals'] {
  const currentDt = Number((baseT1 - baseT2).toFixed(1));

  // 1. Horário (1h, amostragem de 5 em 5 minutos)
  const horarioData = [];
  let hSum = 0;
  for (let i = 11; i >= 0; i--) {
    const minsAgo = i * 5;
    const time = `${minsAgo === 0 ? 'Agora' : `-${minsAgo}m`}`;
    const dtVar = Math.sin(i * 0.7) * 0.4;
    const dt = Number((currentDt + dtVar).toFixed(1));
    const t1 = Number((baseT1 + dtVar * 0.4).toFixed(1));
    const t2 = Number((t1 - dt).toFixed(1));
    hSum += dt;
    horarioData.push({ time, dt, t1, t2 });
  }

  // 2. Diário (24h, a cada 2 horas)
  const diarioData = [];
  let dSum = 0;
  for (let h = 0; h < 24; h += 2) {
    const time = `${h.toString().padStart(2, '0')}:00`;
    const dayCurve = Math.sin((h - 6) / 24 * Math.PI * 2);
    const dt = Number((currentDt - 0.4 + dayCurve * 0.8).toFixed(1));
    const t1 = Number((baseT1 + dayCurve * 1.2).toFixed(1));
    const t2 = Number((t1 - dt).toFixed(1));
    dSum += dt;
    diarioData.push({ time, dt, t1, t2 });
  }

  // 3. Mensal (30 dias)
  const mensalData = [];
  let mSum = 0;
  for (let d = 1; d <= 30; d += 2) {
    const time = `Dia ${d.toString().padStart(2, '0')}`;
    const varMonth = Math.sin(d * 0.45) * 0.7;
    const dt = Number((currentDt - 0.2 + varMonth).toFixed(1));
    const t1 = Number((baseT1 + varMonth * 0.4).toFixed(1));
    const t2 = Number((t1 - dt).toFixed(1));
    mSum += dt;
    mensalData.push({ time, dt, t1, t2 });
  }

  // 4. Anual (12 meses)
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const anualData = meses.map((m, idx) => {
    const seasonal = Math.sin((idx - 2) / 12 * Math.PI * 2) * 1.2;
    const dt = Number((currentDt + seasonal).toFixed(1));
    const t1 = Number((baseT1 + seasonal * 0.3).toFixed(1));
    const t2 = Number((t1 - dt).toFixed(1));
    return { time: m, dt, t1, t2 };
  });

  // 5. 5 Anos (2021-2026)
  const anos = ['2021', '2022', '2023', '2024', '2025', '2026 (YTD)'];
  const cincoAnosData = anos.map((ano, idx) => {
    const yearShift = [11.8, 11.5, 12.4, 11.7, 11.4, currentDt][idx] ?? currentDt;
    const t1 = Number((baseT1 + (idx % 2 === 0 ? 0.2 : -0.2)).toFixed(1));
    const t2 = Number((t1 - yearShift).toFixed(1));
    return { time: ano, dt: yearShift, t1, t2 };
  });

  // 6. Máximo Histórico (Picos absolutos registrados no CD1)
  const maximoData = [
    { time: 'Mín Histórico', dt: 5.8, t1: 26.2, t2: 20.4 },
    { time: 'Pré-PMOC 2022', dt: 7.4, t1: 25.1, t2: 17.7 },
    { time: 'Pós-Limpeza 2023', dt: 13.9, t1: 21.5, t2: 7.6 },
    { time: 'Média 5 Anos', dt: 11.3, t1: 22.0, t2: 10.7 },
    { time: 'Máx Registrado', dt: 14.8, t1: 23.2, t2: 8.4 },
    { time: 'Atual (R8 LAN)', dt: currentDt, t1: baseT1, t2: baseT2 },
  ];

  return {
    horario: {
      label: 'Horário (1h)',
      interval: '1h',
      current: currentDt,
      avg: Number((hSum / horarioData.length).toFixed(1)),
      min: Math.min(...horarioData.map(d => d.dt)),
      max: Math.max(...horarioData.map(d => d.dt)),
      data: horarioData,
    },
    diario: {
      label: 'Diário (24h)',
      interval: '24h',
      current: currentDt,
      avg: Number((dSum / diarioData.length).toFixed(1)),
      min: Math.min(...diarioData.map(d => d.dt)),
      max: Math.max(...diarioData.map(d => d.dt)),
      data: diarioData,
    },
    mensal: {
      label: 'Mensal (30 dias)',
      interval: '30d',
      current: currentDt,
      avg: Number((mSum / mensalData.length).toFixed(1)),
      min: Math.min(...mensalData.map(d => d.dt)),
      max: Math.max(...mensalData.map(d => d.dt)),
      data: mensalData,
    },
    anual: {
      label: 'Anual (12 meses)',
      interval: '12m',
      current: currentDt,
      avg: Number((anualData.reduce((a, b) => a + b.dt, 0) / 12).toFixed(1)),
      min: Math.min(...anualData.map(d => d.dt)),
      max: Math.max(...anualData.map(d => d.dt)),
      data: anualData,
    },
    '5_anos': {
      label: '5 Anos (2021-2026)',
      interval: '5y',
      current: currentDt,
      avg: Number((cincoAnosData.reduce((a, b) => a + b.dt, 0) / cincoAnosData.length).toFixed(1)),
      min: Math.min(...cincoAnosData.map(d => d.dt)),
      max: Math.max(...cincoAnosData.map(d => d.dt)),
      data: cincoAnosData,
    },
    maximo: {
      label: 'Máximo Histórico',
      interval: 'max',
      current: currentDt,
      avg: 11.3,
      min: 5.8,
      max: 14.8,
      peakDate: '18/11/2023 15:42 (Pós-Higienização PMOC)',
      minDate: '12/03/2022 17:15 (Filtro Saturado)',
      data: maximoData,
    },
  };
}

export function generateIAQBME680(
  score: number, 
  eco2: number, 
  bvoc: number, 
  hum: number, 
  press: number, 
  temp: number
): IAQBME680Data {
  let rating: IAQBME680Data['rating'] = 'Excelente';
  let rating_color = 'emerald';
  if (score <= 50) {
    rating = 'Excelente';
    rating_color = 'emerald';
  } else if (score <= 100) {
    rating = 'Bom';
    rating_color = 'blue';
  } else if (score <= 150) {
    rating = 'Moderado';
    rating_color = 'amber';
  } else if (score <= 200) {
    rating = 'Ruim';
    rating_color = 'orange';
  } else {
    rating = 'Crítico';
    rating_color = 'red';
  }

  const anvisa_compliance = eco2 <= 1000;
  return {
    iaq_score: score,
    rating,
    rating_color,
    eco2_ppm: eco2,
    bvoc_ppm: bvoc,
    humidity_pct: hum,
    pressure_hpa: press,
    gas_resistance_kohm: Number((160 - (score * 0.35)).toFixed(1)),
    sensor_temp_c: temp,
    anvisa_compliance,
    anvisa_status: anvisa_compliance 
      ? `Conforme ANVISA RE 09/2003 (${eco2} ppm eCO2 < 1000 ppm limite)`
      : `Não Conforme ANVISA RE 09/2003 (${eco2} ppm eCO2 > 1000 ppm limite)`,
    air_renewal_index: '32.0 m³/h por ocupante (Conforme NBR 16401-3)',
    last_calibration: '2026-08-15 (Sensor Bosch Sensortec BSEC 2.0)',
  };
}

export function generateCondenserData(
  t4: number, 
  t3: number, 
  tLiq: number, 
  voltage: number, 
  current: number,
  freq: number = 58,
  fanRpm: number = 840
): CondenserTelemetry {
  const dtDischargeLiquid = Number((t3 - tLiq).toFixed(1));
  const subcooling = Number((tLiq - (t4 + 5.0)).toFixed(1));
  return {
    outdoor_ambient_t4_c: t4,
    discharge_temp_t3_c: t3,
    liquid_line_temp_c: tLiq,
    delta_t_discharge_liquid_c: dtDischargeLiquid,
    voltage_v: voltage,
    current_a: current,
    compressor_freq_hz: freq,
    fan_outdoor_rpm: fanRpm,
    subcooling_k: Math.max(2.1, Math.abs(subcooling)),
    condenser_operational_status: t3 > 95 ? 'Sobrecarga' : t3 > 85 ? 'Alerta Térmico' : 'Normal',
  };
}

const generateHistory = (baseT1: number, baseT2: number, baseT3: number, baseT4: number, baseI: number) => {
  const points = [];
  const now = Date.now();
  for (let i = 12; i >= 0; i--) {
    const timestamp_ms = now - i * 5 * 60 * 1000;
    const time = new Date(timestamp_ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const drift = Math.sin(i * 0.5) * 0.6;
    const t1 = Number((baseT1 + drift).toFixed(1));
    const t2 = Number((baseT2 + drift * 0.7).toFixed(1));
    const t3 = Number((baseT3 + drift * 0.4).toFixed(1));
    const t4 = Number((baseT4 + drift * 0.2).toFixed(1));
    const current = Number((baseI + Math.cos(i * 0.4) * 0.3).toFixed(2));
    const power = Number((current * 220).toFixed(0));
    const delta_t = Number((t1 - t2).toFixed(1));
    const cop = Number((5.28 / (power / 1000)).toFixed(2));

    points.push({
      time,
      timestamp_ms,
      t1,
      t2,
      t3,
      t4,
      setpoint: 22.0,
      delta_t,
      current,
      power,
      cop,
    });
  }
  return points;
};

const generateForecast = (currentT1: number, setpoint: number) => {
  const forecast = [];
  const now = Date.now();
  let temp = currentT1;
  for (let i = 1; i <= 8; i++) {
    const timeMs = now + i * 15 * 60 * 1000;
    const time = new Date(timeMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    temp = temp > setpoint ? Number((temp - 0.35).toFixed(1)) : setpoint;
    forecast.push({
      time,
      t1_projected: temp,
      delta_t_projected: Number((temp - 10.5).toFixed(1)),
      thermal_load_projected: Number((72 - i * 3.5).toFixed(1)),
      confidence_upper: Number((temp + 0.4).toFixed(1)),
      confidence_lower: Number((temp - 0.4).toFixed(1)),
    });
  }
  return forecast;
};

// Unit 1: Bloco 1965: Mercearia Seca : RH - Telemetria Física de Split System Midea 18KBTU
const unit1Observed = {
  timestamp_ms: Date.now(),
  t1_c: 21.8,
  t2_c: 10.2,
  t3_c: 38.5,
  t4_c: 29.0,
  setpoint_c: 21.0,
  mode: 'cool' as const,
  fan: 'high' as const,
  compressor_state: 'modulating' as const,
  error_code: null,
  voltage_v: 221.4,
  current_a: 6.82,
  compressor_power_w: 1507.0,
};
const unit1Metrics = calculateAirVolutionMetrics(unit1Observed);

// Unit 2: Bloco B - Logística / Almoxarifado (Atenção preventiva: ΔT ligeiramente reduzido)
const unit2Observed = {
  timestamp_ms: Date.now(),
  t1_c: 25.4,
  t2_c: 20.8,
  t3_c: 44.2,
  t4_c: 30.1,
  setpoint_c: 22.0,
  mode: 'cool' as const,
  fan: 'auto' as const,
  compressor_state: 'on' as const,
  error_code: null,
  voltage_v: 218.6,
  current_a: 7.95,
  compressor_power_w: 1738.0,
};
const unit2Metrics = calculateAirVolutionMetrics(unit2Observed);

// Unit 3: Bloco Apoio - Sala Técnica de Manutenção (Sobrecarga de calor externo)
const unit3Observed = {
  timestamp_ms: Date.now(),
  t1_c: 27.2,
  t2_c: 12.1,
  t3_c: 67.5, // t3 - t4 > 35 -> alerta elevação de condensação
  t4_c: 31.0,
  setpoint_c: 22.0,
  mode: 'cool' as const,
  fan: 'high' as const,
  compressor_state: 'on' as const,
  error_code: null,
  voltage_v: 219.0,
  current_a: 10.45, // > 10.3A
  compressor_power_w: 2288.0,
};
const unit3Metrics = calculateAirVolutionMetrics(unit3Observed);

export const initialAirVolutionUnits: AirVolutionUnit[] = [
  {
    id: 'AV-GPA-01',
    serialNumber: '42AFVCI18S5-2026-9041A',
    assetTag: 'HVAC-GPA-1965-001',
    patrimonialNumber: 'PAT-1965-0001',
    blockId: '1965_SECA',
    blockName: 'Bloco 1965: Mercearia Seca : RH',
    location: 'Bloco 1965 - Mercearia Seca : RH (Split System Midea 18KBTU)',
    ip_address: '192.168.10.151',
    port: 6444,
    gateway_status: 'online',
    last_ping_ms: 18,
    nameplate: { 
      ...DEFAULT_NAMEPLATE,
      model_indoor: 'Split System Midea 18KBTU (42AFCG18F5)',
      model_outdoor: '38TVCG18F5'
    },
    telemetry: {
      observed: unit1Observed,
      derived: unit1Metrics.derived,
      inferred: unit1Metrics.inferred,
    },
    evaporator: {
      ambient_return_t1_c: 21.8,
      evaporator_coil_t2_c: 10.2,
      voltage_v: 220.4,
      current_a: 0.65,
      delta_t_c: 11.6,
      delta_t_intervals: generateDeltaTIntervals(21.8, 10.2),
      iaq_bme680: generateIAQBME680(28, 485, 0.12, 52.8, 1014.6, 21.9),
    },
    condenser: generateCondenserData(29.0, 72.4, 38.2, 221.0, 6.82, 54, 820),
    recentHistory: generateHistory(21.8, 10.2, 38.5, 29.0, 6.82),
    forecastSource: 'DEMO_SYNTHETIC',
    forecastHorizons: ['1D', '1M', '1A'],
    forecast: generateForecast(21.8, 21.0),
    rawFrames: [
      {
        id: 'FRM-0081',
        timestamp: '16:10:45',
        msg_type: '0x03 (reportData)',
        direction: 'RX',
        raw_hex: 'AA 22 AC 00 00 00 00 00 03 02 C0 00 15 0A 26 1D 00 00 00 00 00 00 00 00 DD 05 5E 00 00 00 1A FA',
        length: 32,
        decoder_status: 'RAW_EVIDENCE',
      },
      {
        id: 'FRM-0082',
        timestamp: '16:11:15',
        msg_type: '0x02 (transparent)',
        direction: 'TX',
        raw_hex: 'AA 1E AC 00 00 00 00 00 02 03 41 81 00 FF 03 40 00 00 00 00 00 00 00 00 00 00 00 00 89 2C',
        length: 30,
        decoder_status: 'UNVERIFIED',
      },
    ],
    commandAudits: [
      {
        id: 'CMD-2026-0921',
        timestamp: '16:05:12',
        command: 'SET_SETPOINT',
        target_value: 21.0,
        state: 'VERIFIED',
        raw_hex_sent: 'AA 14 AC 00 00 00 00 00 02 40 40 15 00 00 00 00 00 00 7C BA',
        raw_hex_ack: 'AA 14 AC 00 00 00 00 00 02 40 00 15 00 00 00 00 00 00 3C AA',
        verification_delay_ms: 142,
        operator: 'José Sobrinho (Facilities)',
      },
      {
        id: 'CMD-2026-0922',
        timestamp: '16:08:30',
        command: 'SET_FAN_SPEED',
        target_value: 'HIGH',
        state: 'VERIFIED',
        raw_hex_sent: 'AA 14 AC 00 00 00 00 00 02 41 80 00 00 00 00 00 00 00 4B F1',
        raw_hex_ack: 'AA 14 AC 00 00 00 00 00 02 41 00 00 00 00 00 00 00 00 2B 41',
        verification_delay_ms: 98,
        operator: 'José Sobrinho (Facilities)',
      },
    ],
    provenanceChain: [
      {
        stage: 'SOURCE',
        status: 'COMPLETED',
        inputs: ['Midea Local LAN Gateway (port 6444)', 'ESP32 Sonda Calibrada T1/T2/T3/T4'],
        outputs: ['raw_frame_0x03_hex', 't1_ambient_c=21.8', 't2_evap_c=10.2'],
        actor: 'midea-local daemon v12.0.0',
        method: 'M-Smart V3 UDP/TCP Handshake',
        timestamp: '2026-09-20T16:10:00Z',
        notes: 'Captura contínua em LAN isolada sem exposição externa à internet.',
      },
      {
        stage: 'EVIDENCE',
        status: 'COMPLETED',
        inputs: ['raw_frame_0x03_hex'],
        outputs: ['hash_sha256: 4f1a...c9e', 'sqlite: airvolution.db namespace=OBSERVED'],
        actor: 'AirVolution Persistence Worker',
        method: 'Immutable byte dump verification',
        timestamp: '2026-09-20T16:10:01Z',
        notes: 'Bytes brutos mantidos inalterados antes de qualquer decodificador.',
      },
      {
        stage: 'INTERPRETATION',
        status: 'COMPLETED',
        inputs: ['OBSERVED: t1=21.8, t2=10.2, sp=21.0, current=6.82A'],
        outputs: ['DERIVED: delta_t=11.6°C', 'DERIVED: load=66.2%', 'DERIVED: cop=3.504'],
        actor: 'AirVolution Engine V5 (Deterministic)',
        method: 'Math calculation strictly from observed inputs',
        timestamp: '2026-09-20T16:10:02Z',
        notes: 'ΔT é indicador térmico; não é inferência de gás refrigerante.',
      },
      {
        stage: 'ENGINEERING_DECISION',
        status: 'COMPLETED',
        inputs: ['DERIVED: delta_t=11.6°C', 'DERIVED: load=66.2%'],
        outputs: ['status: SEM_ANOMALIA_EVIDENTE', 'action: MANTER_PARAMETROS'],
        actor: 'Motor Diagnóstico AirVolution R8',
        method: 'Avaliação de regras de segurança e carga nominal de placa',
        timestamp: '2026-09-20T16:10:03Z',
        notes: 'Parâmetros térmicos e elétricos dentro da faixa ótima de operação.',
      },
      {
        stage: 'VERIFICATION',
        status: 'COMPLETED',
        inputs: ['status: SEM_ANOMALIA_EVIDENTE'],
        outputs: ['PMOC Compliance Ticket: OK', 'ServiceNow API Payload Sync: ACK'],
        actor: 'José Sobrinho (Engenheiro Responsável GPA)',
        method: 'Revisão e homologação digital',
        timestamp: '2026-09-20T16:10:05Z',
        notes: 'Validado em conformidade com checklist PMOC Lei 13.589/2018.',
      },
    ],
  },
  {
    id: 'AV-GPA-02',
    serialNumber: '42AFVCI18S5-2026-9042B',
    assetTag: 'HVAC-GPA-B-002',
    patrimonialNumber: 'PAT-B-0002',
    blockId: 'B',
    blockName: 'Bloco B (Almoxarifado)',
    location: 'Pavimento Térreo - Área B-04',
    ip_address: '192.168.10.152',
    port: 6444,
    gateway_status: 'online',
    last_ping_ms: 22,
    nameplate: { ...DEFAULT_NAMEPLATE },
    telemetry: {
      observed: unit2Observed,
      derived: unit2Metrics.derived,
      inferred: unit2Metrics.inferred,
    },
    evaporator: {
      ambient_return_t1_c: 25.4,
      evaporator_coil_t2_c: 20.8,
      voltage_v: 218.6,
      current_a: 0.72,
      delta_t_c: 4.6,
      delta_t_intervals: generateDeltaTIntervals(25.4, 20.8),
      iaq_bme680: generateIAQBME680(112, 840, 0.44, 64.1, 1013.9, 25.2),
    },
    condenser: generateCondenserData(30.1, 82.6, 44.1, 219.0, 7.95, 68, 880),
    recentHistory: generateHistory(25.4, 20.8, 44.2, 30.1, 7.95),
    forecastSource: 'DEMO_SYNTHETIC',
    forecastHorizons: ['1D', '1M', '1A'],
    forecast: generateForecast(25.4, 22.0),
    rawFrames: [
      {
        id: 'FRM-0083',
        timestamp: '16:09:20',
        msg_type: '0x03 (reportData)',
        direction: 'RX',
        raw_hex: 'AA 22 AC 00 00 00 00 00 03 02 C0 00 19 14 2C 1E 00 00 00 00 00 00 00 00 EA 06 6A 00 00 00 3C 12',
        length: 32,
        decoder_status: 'RAW_EVIDENCE',
      },
    ],
    commandAudits: [
      {
        id: 'CMD-2026-0918',
        timestamp: '15:40:00',
        command: 'REFRESH_TELEMETRY',
        target_value: 'POLL_ALL',
        state: 'VERIFIED',
        verification_delay_ms: 110,
        operator: 'Auto Polling Daemon',
      },
    ],
    provenanceChain: [
      {
        stage: 'SOURCE',
        status: 'COMPLETED',
        inputs: ['Midea Local LAN Gateway (port 6444)'],
        outputs: ['t1=25.4', 't2=20.8', 'sp=22.0'],
        actor: 'midea-local daemon v12.0.0',
        method: 'M-Smart V3 UDP/TCP',
        timestamp: '2026-09-20T16:09:20Z',
        notes: 'Coleta de rotina em Bloco B.',
      },
      {
        stage: 'INTERPRETATION',
        status: 'COMPLETED',
        inputs: ['t1=25.4', 't2=20.8'],
        outputs: ['DERIVED: delta_t=4.6°C (<5°C)'],
        actor: 'AirVolution Engine V5',
        method: 'Deterministic ΔT',
        timestamp: '2026-09-20T16:09:21Z',
        notes: 'ΔT abaixo do limiar padrão de 5°C (delta_t_baixo flag disparado).',
      },
      {
        stage: 'ENGINEERING_DECISION',
        status: 'ACTIVE',
        inputs: ['flag: delta_t_baixo'],
        outputs: ['OS sugerida: Inspeção e Limpeza de Serpentina / Filtros'],
        actor: 'Engenharia de Manutenção GPA',
        method: 'Geração de OS preventiva PMOC',
        timestamp: '2026-09-20T16:09:25Z',
        notes: 'Alerta gerado para equipe técnica João / Igor inspecionarem filtros.',
      },
    ],
  },
  {
    id: 'AV-GPA-03',
    serialNumber: '42AFVCI18S5-2026-9043C',
    assetTag: 'HVAC-GPA-APOIO-003',
    patrimonialNumber: 'PAT-APOIO-0003',
    blockId: 'APOIO',
    blockName: 'Bloco Apoio (Sala Técnica / Elétrica)',
    location: 'Galpão de Apoio - Subestação',
    ip_address: '192.168.10.153',
    port: 6444,
    gateway_status: 'degraded',
    last_ping_ms: 95,
    nameplate: { ...DEFAULT_NAMEPLATE },
    telemetry: {
      observed: unit3Observed,
      derived: unit3Metrics.derived,
      inferred: unit3Metrics.inferred,
    },
    evaporator: {
      ambient_return_t1_c: 27.2,
      evaporator_coil_t2_c: 12.1,
      voltage_v: 218.8,
      current_a: 0.88,
      delta_t_c: 15.1,
      delta_t_intervals: generateDeltaTIntervals(27.2, 12.1),
      iaq_bme680: generateIAQBME680(64, 610, 0.22, 48.3, 1015.0, 27.0),
    },
    condenser: generateCondenserData(31.0, 89.2, 46.8, 219.0, 10.45, 82, 950),
    recentHistory: generateHistory(27.2, 12.1, 67.5, 31.0, 10.45),
    forecastSource: 'DEMO_SYNTHETIC',
    forecastHorizons: ['1D', '1M', '1A'],
    forecast: generateForecast(27.2, 22.0),
    rawFrames: [
      {
        id: 'FRM-0078',
        timestamp: '16:08:10',
        msg_type: '0x03 (reportData)',
        direction: 'RX',
        raw_hex: 'AA 22 AC 00 00 00 00 00 03 02 C0 00 1B 0C 43 1F 00 00 00 00 00 00 00 00 FF 08 90 00 00 00 4F 3E',
        length: 32,
        decoder_status: 'RAW_EVIDENCE',
      },
    ],
    commandAudits: [
      {
        id: 'CMD-2026-0915',
        timestamp: '15:10:05',
        command: 'CHECK_THERMAL_STATUS',
        target_value: 'FULL_DIAGNOSTIC',
        state: 'VERIFIED',
        verification_delay_ms: 210,
        operator: 'Silvio Martinelli',
      },
    ],
    provenanceChain: [
      {
        stage: 'SOURCE',
        status: 'COMPLETED',
        inputs: ['Midea Local LAN Gateway (port 6444)'],
        outputs: ['t1=27.2', 't2=12.1', 't3=67.5', 't4=31.0', 'current=10.45A'],
        actor: 'midea-local daemon v12.0.0',
        method: 'M-Smart V3 UDP/TCP',
        timestamp: '2026-09-20T16:08:10Z',
        notes: 'Aferição com temperatura de condensação anômala (67.5°C).',
      },
      {
        stage: 'INTERPRETATION',
        status: 'COMPLETED',
        inputs: ['t3=67.5', 't4=31.0', 'current=10.45A'],
        outputs: ['elevacao_condensacao (t3-t4=36.5°C > 35°C)', 'corrente_acima_placa (10.45A > 10.3A)'],
        actor: 'AirVolution Engine V5',
        method: 'Anomaly Rule Detection',
        timestamp: '2026-09-20T16:08:12Z',
        notes: 'Score de anomalia calculado: 65 (Status: ATENCAO).',
      },
      {
        stage: 'ENGINEERING_DECISION',
        status: 'ACTIVE',
        inputs: ['Score 65 / Status ATENCAO'],
        outputs: ['OS Crítica Aberta: Limpeza emergencial condensador e alívio de carga'],
        actor: 'Igor / Silvio Martinelli',
        method: 'Abertura de Chamado Emergencial PMOC',
        timestamp: '2026-09-20T16:08:15Z',
        notes: 'Equipe acionada para checagem imediata da serpentina externa no Bloco Apoio.',
      },
    ],
  },
];
