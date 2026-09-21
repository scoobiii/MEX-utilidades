# MEX Utilidades — HVAC-R Mobile + Operação

Plataforma mobile-first / desktop responsiva para cadastro, telemetria e manutenção de equipamentos de ar-condicionado split.

## Camadas
1. Usuário — IAQ GPA Index, conforto, consumo previsto e alertas.
2. Técnico — identidade patrimonial, evaporador, condensador, elétrica, ΔT, desempenho e manutenção.
3. Gestor/PMOC — planos, distribuição, aderência, ordens e auditoria.
4. Backend/Gateway — API, SQLite local, sincronização, protocolos e evidências.
5. Dispositivo — split, sensores, Arduino/ESP32 e gateways.

## Dados HVAC
Evaporador: fabricante, modelo, série, tag, patrimônio, T1/retorno, T2/evaporador, tensão, corrente, ΔT e performance.
Condensador: fabricante, modelo, série, tag, patrimônio, T4/ambiente, T3/descarga, linha de líquido, tensão, corrente, ΔT descarga-líquido, performance, sub-resfriamento e superaquecimento.

Superaquecimento/sub-resfriamento inferidos são estimativas e devem mostrar método, confiança e limitações.

## Séries temporais
Gráficos real-time e histórico: 24h, semanal, mensal e anual. Forecast deve separar observado de projetado. Prophet pode gerar projeções diária, semanal, mensal e anual, registrando origem, horizonte, modelo e intervalo de confiança.

## Fabricantes
O domínio é multi-fabricante. Catálogo inicial pode contemplar Midea, Daikin, LG, Carrier, Samsung, Fujitsu, Gree, TCL e Elgin. Suporte a protocolo só é declarado quando existir adapter e teste.

## Integrações
REST/OpenAPI, APIs comerciais, Arduino/ESP32, gateways, adapters de protocolo e operação offline. SQLite funciona como persistência local/buffer com sincronização idempotente.

## Acesso
USER, TECHNICIAN, MANAGER e ADMIN. Permissões são por capacidade e escopo.

## Proveniência
OBSERVED = medido/recebido; DERIVED = cálculo determinístico; INFERRED = estimativa; NAMEPLATE = dado documental.

## VUA
DOCUMENTED → INSPECTED → TESTED → AUDITED → VERIFIED → PUBLISH.
Gates: typecheck, testes, cobertura de domínio 100%, build, evidência VUA e k6.

## Comandos
npm install
npm run lint
npm test
npm run coverage
npm run vua:verify
npm run build
npm run k6
