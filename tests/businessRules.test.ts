import { describe, expect, it } from 'vitest';
import {
  OPERATIONAL_STATUS_META,
  STATUS_LEGEND,
  apiSmokeEndpoints,
  apiHealthPath,
  assetIdentityComplete,
  calculateGpaIAQIndex,
  canPromoteInferenceToDiagnosis,
  canSyncPlan,
  coverageTarget,
  forecastHorizonLabel,
  forecastSourceLabel,
  iaqRatingColor,
  inferenceDisclaimer,
  isWithinDeltaTTarget,
  isOperationalStatus,
  k6Thresholds,
  noDiagnosisFromTemperatureOnly,
  operationalStatusForDeltaT,
  resolveIAQRating,
  resolveOperationalStatus,
  statusColor,
  statusLabel,
  statusRequiresWorkOrder,
  systemLayers,
  supportsForecastHorizon,
  telemetryIsFresh,
  technicianDeliverable,
  userDeliverable,
  validateAssetIdentity,
} from '../src/domain/businessRules';

describe('regras de status operacional', () => {
  it('aplica precedência de ciclo de vida e risco', () => {
    expect(resolveOperationalStatus({ gateway: 'online', thermal: 'SEM_ANOMALIA_EVIDENTE' })).toBe('OK');
    expect(resolveOperationalStatus({ gateway: 'degraded', thermal: 'SEM_ANOMALIA_EVIDENTE' })).toBe('PREVENTIVA');
    expect(resolveOperationalStatus({ gateway: 'offline', thermal: 'SEM_ANOMALIA_EVIDENTE' })).toBe('CORRETIVA');
    expect(resolveOperationalStatus({ gateway: 'online', thermal: 'ATENCAO' })).toBe('CORRETIVA');
    expect(resolveOperationalStatus({ gateway: 'online', thermal: 'SEM_ANOMALIA_EVIDENTE', projectPlanned: true, correctiveOpen: true })).toBe('PROJETO');
    expect(resolveOperationalStatus({ gateway: 'online', thermal: 'SEM_ANOMALIA_EVIDENTE', decommissioned: true })).toBe('DESCOMISSIONAMENTO');
    expect(resolveOperationalStatus({ gateway: 'online', thermal: 'SEM_ANOMALIA_EVIDENTE', decommissioned: true, sparePartStock: true })).toBe('ESTOQUE');
    expect(resolveOperationalStatus({ gateway: 'online', thermal: 'SEM_ANOMALIA_EVIDENTE', scrapped: true })).toBe('SUCATA');
  });

  it('expõe legenda e metadados para UI', () => {
    expect(STATUS_LEGEND).toHaveLength(7);
    expect(statusLabel('CORRETIVA')).toBe('Corretiva');
    expect(statusColor('SUCATA')).toBe(OPERATIONAL_STATUS_META.SUCATA.color);
    expect(isOperationalStatus('OK')).toBe(true);
    expect(isOperationalStatus('INVALID')).toBe(false);
    expect(coverageTarget()).toBe(100);
    expect(iaqRatingColor('Excelente')).toBe('#16a34a');
    expect(iaqRatingColor('Bom')).toBe('#2563eb');
    expect(iaqRatingColor('Moderado')).toBe('#f59e0b');
    expect(iaqRatingColor('Ruim')).toBe('#ea580c');
    expect(iaqRatingColor('Crítico')).toBe('#dc2626');
    expect(statusRequiresWorkOrder('PREVENTIVA')).toBe(true);
    expect(statusRequiresWorkOrder('CORRETIVA')).toBe(true);
    expect(statusRequiresWorkOrder('OK')).toBe(false);
    expect(inferenceDisclaimer()).toContain('não substituem');
    expect(forecastSourceLabel('PROPHET_API')).toBe('Prophet API');
    expect(forecastSourceLabel('DEMO_SYNTHETIC')).toContain('sintética');
  });
});

describe('IAQ GPA Index', () => {
  it('classifica limites e rejeita valores inválidos', () => {
    expect(resolveIAQRating(0)).toBe('Excelente');
    expect(resolveIAQRating(50)).toBe('Excelente');
    expect(resolveIAQRating(51)).toBe('Bom');
    expect(resolveIAQRating(101)).toBe('Moderado');
    expect(resolveIAQRating(151)).toBe('Ruim');
    expect(resolveIAQRating(201)).toBe('Crítico');
    expect(() => resolveIAQRating(-1)).toThrow(RangeError);
    expect(() => resolveIAQRating(501)).toThrow(RangeError);
    expect(() => resolveIAQRating(Number.NaN)).toThrow(RangeError);
  });

  it('calcula índice somente de entradas físicas válidas', () => {
    expect(calculateGpaIAQIndex({ eco2Ppm: 450, humidityPct: 50, bvocPpm: 0 })).toBe(0);
    expect(calculateGpaIAQIndex({ eco2Ppm: 450, humidityPct: 30, bvocPpm: 0 })).toBe(8);
    expect(calculateGpaIAQIndex({ eco2Ppm: 1000, humidityPct: 70, bvocPpm: 0.1 })).toBeGreaterThan(0);
    expect(() => calculateGpaIAQIndex({ eco2Ppm: -1, humidityPct: 50, bvocPpm: 0 })).toThrow(RangeError);
    expect(() => calculateGpaIAQIndex({ eco2Ppm: 450, humidityPct: 101, bvocPpm: 0 })).toThrow(RangeError);
  });
});

describe('proveniência, identidade e forecast', () => {
  it('bloqueia promoção de inferência sem pressão e linha', () => {
    expect(noDiagnosisFromTemperatureOnly()).toBe(true);
    expect(canPromoteInferenceToDiagnosis({ hasPressureSensors: true, hasLineTemperatureSensors: true, hasRecentObservedTelemetry: true })).toBe(true);
    expect(canPromoteInferenceToDiagnosis({ hasPressureSensors: false, hasLineTemperatureSensors: true, hasRecentObservedTelemetry: true })).toBe(false);
  });

  it('valida identidade patrimonial completa', () => {
    const identity = { assetId: 'AV-1', serialNumber: 'SN-1', assetTag: 'TAG-1', patrimonialNumber: 'PAT-1' };
    expect(assetIdentityComplete(identity)).toBe(true);
    expect(assetIdentityComplete({ ...identity, assetTag: ' ' })).toBe(false);
    expect(() => validateAssetIdentity({ ...identity, serialNumber: '' })).toThrow('serialNumber');
  });

  it('mantém contratos de forecast e PMOC explícitos', () => {
    expect(forecastHorizonLabel('1D')).toContain('24');
    expect(supportsForecastHorizon('1A')).toBe(true);
    expect(supportsForecastHorizon('7D')).toBe(false);
    expect(canSyncPlan(true, true)).toBe(true);
    expect(canSyncPlan(true, false)).toBe(false);
    expect(apiSmokeEndpoints('AV/1')[0]).toBe('/api/v1/health');
    expect(apiHealthPath()).toBe('/api/v1/health');
    expect(userDeliverable()).toContain('IAQ');
    expect(technicianDeliverable()).toContain('Telemetria');
    expect(systemLayers()).toHaveLength(5);
    expect(k6Thresholds()).toEqual({ p95Ms: 500, maxErrorRate: 0.01, minChecks: 0.99 });
  });

  it('avalia validade e faixa do delta T', () => {
    expect(isWithinDeltaTTarget(8)).toBe(true);
    expect(isWithinDeltaTTarget(14)).toBe(true);
    expect(isWithinDeltaTTarget(7.9)).toBe(false);
    expect(operationalStatusForDeltaT(11)).toBe('OK');
    expect(operationalStatusForDeltaT(20)).toBe('PREVENTIVA');
    expect(telemetryIsFresh(1_000, 301_000, 300_000)).toBe(true);
    expect(telemetryIsFresh(1_000, 301_001, 300_000)).toBe(false);
  });
});
