import { DatabaseSync } from 'node:sqlite';

export type SqliteTelemetry = {
  eventId: string;
  assetId: string;
  timestampMs: number;
  t1C?: number | null;
  t2C?: number | null;
  t3C?: number | null;
  t4C?: number | null;
  voltageV?: number | null;
  currentA?: number | null;
  provenance: 'OBSERVED' | 'DERIVED' | 'INFERRED' | 'NAMEPLATE';
};

export class SqliteStore {
  private readonly db: DatabaseSync;

  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS telemetry (
        event_id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL,
        t1_c REAL,
        t2_c REAL,
        t3_c REAL,
        t4_c REAL,
        voltage_v REAL,
        current_a REAL,
        provenance TEXT NOT NULL CHECK (provenance IN ('OBSERVED','DERIVED','INFERRED','NAMEPLATE')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_asset_time
        ON telemetry(asset_id, timestamp_ms);
      CREATE TABLE IF NOT EXISTS sync_queue (
        event_id TEXT PRIMARY KEY,
        aggregate_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  saveTelemetry(value: SqliteTelemetry): void {
    const stmt = this.db.prepare(`
      INSERT INTO telemetry
      (event_id, asset_id, timestamp_ms, t1_c, t2_c, t3_c, t4_c, voltage_v, current_a, provenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO NOTHING
    `);
    stmt.run(
      value.eventId, value.assetId, value.timestampMs,
      value.t1C ?? null, value.t2C ?? null, value.t3C ?? null, value.t4C ?? null,
      value.voltageV ?? null, value.currentA ?? null, value.provenance,
    );
  }

  enqueueSync(eventId: string, aggregateType: string, payload: unknown): void {
    this.db.prepare(`
      INSERT INTO sync_queue(event_id, aggregate_type, payload_json)
      VALUES (?, ?, ?)
      ON CONFLICT(event_id) DO NOTHING
    `).run(eventId, aggregateType, JSON.stringify(payload));
  }

  pendingSync(limit = 100): Array<{ eventId: string; aggregateType: string; payloadJson: string; attempts: number }> {
    return this.db.prepare(`
      SELECT event_id as eventId, aggregate_type as aggregateType,
             payload_json as payloadJson, attempts
      FROM sync_queue WHERE state = 'PENDING'
      ORDER BY created_at LIMIT ?
    `).all(limit) as Array<{ eventId: string; aggregateType: string; payloadJson: string; attempts: number }>;
  }

  close(): void {
    this.db.close();
  }
}
