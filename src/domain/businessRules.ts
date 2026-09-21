import type { IAQBME680Data } from '../types/airvolution';

export type OperationalStatus =
  | 'OK'
  | 'PREVENTIVA'
  | 'CORRETIVA'
  | 'PROJETO'
  | 'DESCOMISSIONAMENTO'
  | 'ESTOQUE'
  | 'SUCATA';

export type OperationalStatusInput = {
  gateway: 'online' | 'degraded' | 'offline';
  thermal: 'SEM_ANOMALIA_EVIDENTE' | 'OBSERVAR' | 'ATENCAO';
  preventiveDue?: boolean;
  correctiveOpen?: boolean;
  projectPlanned?: boolean;
  decommissioned?: boolean;
  sparePartStock?: boolean;
  scrapped?: boolean;
};

export const OPERATIONAL_STATUS_META: Record<OperationalStatus, { label: string; color: string; description: string }> = {
  OK: { label: 'OK', color: '#16a34a', description: 'Operação dentro dos limites' },
  PREVENTIVA: { label: 'Preventiva', color: '#f59e0b', description: 'Ação preventiva programada ou recomendada' },
  CORRETIVA: { label: 'Corretiva', color: '#dc2626', description: 'Falha ou risco que exige intervenção' },
  PROJETO: { label: 'Projeto', color: '#2563eb', description: 'Nova instalação, retrofit ou expansão' },
  DESCOMISSIONAMENTO: { label: 'Descomissionamento', color: '#7c3aed', description: 'Retirada controlada do ativo' },
  ESTOQUE: { label: 'Estoque', color: '#ea580c', description: 'Peça/ativo separado para retirada ou reutilização' },
  SUCATA: { label: 'Sucata', color: '#111827', description: 'Baixa patrimonial e descarte autorizado' },
};

export const STATUS_LEGEND: OperationalStatus[] = [
  'OK', 'PREVENTIVA', 'CORRETIVA', 'PROJETO', 'DESCOMISSIONAMENTO', 'ESTOQUE', 'SUCATA',
];

/** Precedência: sucata > ciclo de retirada > projeto > corretiva > preventiva > OK. */
export function resolveOperationalStatus(input: OperationalStatusInput): OperationalStatus {
  if (input.scrapped) return 'SUCATA';
  if (input.decommissioned) return input.sparePartStock ? 'ESTOQUE' : 'DESCOMISSIONAMENTO';
  if (input.projectPlanned) return 'PROJETO';
  if (input.correctiveOpen || input.gateway === 'offline' || input.thermal === 'ATENCAO') return 'CORRETIVA';
  if (input.preventiveDue || input.gateway === 'degraded' || input.thermal === 'OBSERVAR') return 'PREVENTIVA';
  return 'OK';
}

export type IAQRating = IAQBME680Data['rating'];

export function resolveIAQRating(score: number): IAQRating {
  if (!Number.isFinite(score) || score < 0 || score > 500) throw new RangeError('IAQ score must be between 0 and 500');
  if (score <= 50) return 'Excelente';
  if (score <= 100) return 'Bom';
  if (score <= 150) return 'Moderado';
  if (score <= 200) return 'Ruim';
  return 'Crítico';
}

export function calculateGpaIAQIndex(input: { eco2Ppm: number; humidityPct: number; bvocPpm: number }): number {
  if (input.eco2Ppm < 0 || input.bvocPpm < 0 || input.humidityPct < 0 || input.humidityPct > 100) {
    throw new RangeError('IAQ sensor values are out of range');
  }
  const co2Penalty = Math.max(0, input.eco2Ppm - 450) / 11;
  const humidityPenalty = input.humidityPct < 40
    ? (40 - input.humidityPct) * 0.8
    : input.humidityPct > 65 ? (input.humidityPct - 65) * 0.8 : 0;
  return Math.min(500, Math.max(0, Number((co2Penalty + humidityPenalty + input.bvocPpm * 30).toFixed(1))));
}

export function canPromoteInferenceToDiagnosis(input: {
  hasPressureSensors: boolean;
  hasLineTemperatureSensors: boolean;
  hasRecentObservedTelemetry: boolean;
}): boolean {
  return input.hasPressureSensors && input.hasLineTemperatureSensors && input.hasRecentObservedTelemetry;
}

export type AssetIdentity = { assetId: string; serialNumber: string; assetTag: string; patrimonialNumber: string };

export function validateAssetIdentity(identity: AssetIdentity): void {
  for (const [name, value] of Object.entries(identity)) if (!value.trim()) throw new Error(`${name} is required`);
}

export const PROVENANCE_RULES = {
  OBSERVED: 'Somente valores recebidos de sensores/protocolo.',
  DERIVED: 'Cálculo determinístico com entradas observadas rastreáveis.',
  INFERRED: 'Hipótese com método, confiança, limitações e ação recomendada.',
  NAMEPLATE: 'Referência de placa; nunca tratar como telemetria medida.',
} as const;

export const FORECAST_RULE = 'Forecast Prophet é projeção, nunca medição observada; expor fonte, horizonte e intervalo de confiança.';

export type ForecastHorizon = '1D' | '1W' | '1M' | '1A';

export function forecastHorizonLabel(horizon: ForecastHorizon): string {
  return { '1D': 'Próximas 24 horas', '1W': 'Próximos 7 dias', '1M': 'Próximos 30 dias', '1A': 'Próximos 12 meses' }[horizon];
}

export function supportsForecastHorizon(value: string): value is ForecastHorizon {
  return value === '1D' || value === '1W' || value === '1M' || value === '1A';
}

export function isWithinDeltaTTarget(deltaT: number): boolean {
  return Number.isFinite(deltaT) && deltaT >= 8 && deltaT <= 14;
}

export function canSyncPlan(hasActivePlan: boolean, alignedWithPMOC: boolean): boolean {
  return hasActivePlan && alignedWithPMOC;
}

export function apiSmokeEndpoints(assetId = 'AV-GPA-01'): string[] {
  const encoded = encodeURIComponent(assetId);
  return ['/api/v1/health', `/api/v1/assets/${encoded}/telemetry`, `/api/v1/assets/${encoded}/forecast`, `/api/v1/assets/${encoded}/work-orders`];
}

export function k6Thresholds(): { p95Ms: number; maxErrorRate: number; minChecks: number } {
  return { p95Ms: 500, maxErrorRate: 0.01, minChecks: 0.99 };
}

export const DOMAIN_VERSION = '1.0.0';

export function statusLabel(status: OperationalStatus): string { return OPERATIONAL_STATUS_META[status].label; }
export function statusColor(status: OperationalStatus): string { return OPERATIONAL_STATUS_META[status].color; }
export function iaqRatingColor(rating: IAQRating): string {
  return { Excelente: '#16a34a', Bom: '#2563eb', Moderado: '#f59e0b', Ruim: '#ea580c', Crítico: '#dc2626' }[rating];
}
export function isOperationalStatus(value: string): value is OperationalStatus { return STATUS_LEGEND.includes(value as OperationalStatus); }
export function statusRequiresWorkOrder(status: OperationalStatus): boolean { return ['PREVENTIVA', 'CORRETIVA', 'DESCOMISSIONAMENTO'].includes(status); }
export function inferenceDisclaimer(): string { return 'Superaquecimento e sub-resfriamento inferidos não substituem pressão e temperatura de linha medidas.'; }
export function forecastSourceLabel(source: 'PROPHET_API' | 'DEMO_SYNTHETIC'): string { return source === 'PROPHET_API' ? 'Prophet API' : 'Demonstração sintética'; }
export function telemetryIsFresh(timestampMs: number, nowMs = Date.now(), maxAgeMs = 300_000): boolean { return Number.isFinite(timestampMs) && nowMs >= timestampMs && nowMs - timestampMs <= maxAgeMs; }
export function assetIdentityComplete(identity: Partial<AssetIdentity>): boolean { return Object.values(identity).every((value) => typeof value === 'string' && value.trim().length > 0); }
export function operationalStatusForDeltaT(deltaT: number): OperationalStatus { return isWithinDeltaTTarget(deltaT) ? 'OK' : 'PREVENTIVA'; }
export function noDiagnosisFromTemperatureOnly(): boolean { return !canPromoteInferenceToDiagnosis({ hasPressureSensors: false, hasLineTemperatureSensors: false, hasRecentObservedTelemetry: true }); }
export function apiHealthPath(): string { return '/api/v1/health'; }
export function userDeliverable(): string { return 'IAQ GPA Index Rating'; }
export function technicianDeliverable(): string { return 'Telemetria, diagnóstico, manutenção e proveniência'; }
export function systemLayers(): string[] { return ['usuário', 'técnico', 'PMOC gerencial', 'backend/gateway', 'dispositivo']; }
export function coverageTarget(): number { return 100; }

export default resolveOperationalStatus;

