# Guia de desenvolvimento

Separe UI, domínio, adapters e infraestrutura. Toda telemetria carrega proveniência. NAMEPLATE nunca é medição. INFERRED registra método, confiança e limitações. Forecast não substitui OBSERVED. Controle exige ACK/readback.

Adapters isolam fabricantes e protocolos. Não declare suporte de protocolo sem teste de integração.

SQLite localiza cadastro, telemetria pendente, fila de sincronização, evidências/metadados e último plano. Sincronização deve usar event_id/idempotency key.

Forecast registra série de origem, corte, horizonte, método, versão e intervalo de confiança.
