# Arquitetura e regras de negócio HVAC-R

## Escopo

O MEX-utilidades organiza o produto em cinco camadas: **usuário**, **técnico**, **PMOC gerencial**, **backend/gateway** e **dispositivo**. A interface é mobile-first e responsiva para desktop. A regra central é não transformar dado demonstrativo, cálculo ou inferência em medição observada.

## Camadas de entrega

| Camada | Entrega | Fonte de verdade |
|---|---|---|
| Usuário | IAQ GPA Index Rating, eCO2, b-VOC, umidade e qualidade do ar | BME680/IAQ validado |
| Técnico | Evaporadora, condensadora, identidade do ativo, telemetria, DT, performance, forecast e evidências | Gateway, API, dispositivo ou Arduino/GAD |
| PMOC gerencial | Plano, periodicidade, alinhamento, OS preventiva/corretiva e evidências | Plano ativo do servidor/dispositivo + PMOC |
| Backend/gateway | Contratos versionados, ingestão, persistência, proveniência e sincronização | API v1 |
| Dispositivo | M-Smart LAN, sensores e aquisição física | Protocolo e captura bruta |

## Identidade mínima do ativo

Todo ativo deve carregar `assetId`, `serialNumber`, `assetTag` e `patrimonialNumber`. Serial e patrimônio não são intercambiáveis: o primeiro identifica o equipamento de fabricação; o segundo identifica o controle patrimonial; a tag é o identificador operacional utilizado em campo.

## Proveniência

- **OBSERVED:** valor recebido de sensor ou protocolo; deve conservar timestamp, unidade, fonte e evidência bruta.
- **DERIVED:** cálculo determinístico, como `ΔT = T1 - T2`, carga aparente e taxa de resfriamento.
- **INFERRED:** hipótese com método, limitações e confiança. Superaquecimento e sub-resfriamento inferidos não substituem pressão e temperatura de linha medidas.
- **NAMEPLATE:** referência de placa; nunca deve ser exibida como telemetria medida.

## Status operacional

A decisão é centralizada em `src/domain/businessRules.ts`. A precedência evita que a interface esconda risco:

`SUCATA > ESTOQUE/DESCOMISSIONAMENTO > PROJETO > CORRETIVA > PREVENTIVA > OK`

| Status | Cor | Uso |
|---|---|---|
| OK | Verde | Operação dentro dos limites |
| PREVENTIVA | Laranja | Ação PMOC programada ou recomendada |
| CORRETIVA | Vermelho | Falha, gateway offline ou risco térmico |
| PROJETO | Azul | Nova instalação, retrofit ou expansão |
| DESCOMISSIONAMENTO | Roxo | Retirada controlada |
| ESTOQUE | Laranja escuro | Peça/ativo separado para retirada ou reutilização |
| SUCATA | Preto | Baixa patrimonial e descarte autorizado |

## Forecast

Os horizontes de produto são **1D**, **1M** e **1A**. A implementação atual marca as séries locais como `DEMO_SYNTHETIC`; isso impede a apresentação de dados sintéticos como Prophet. Quando o backend Prophet estiver disponível, a origem deve ser `PROPHET_API` e a resposta deve incluir horizonte e intervalo de confiança.

## PMOC e sincronização

Um plano recebido do servidor ou do dispositivo só pode ficar **ATIVO** quando existir plano e houver alinhamento com o escopo e a periodicidade do PMOC gerencial. A sincronização não deve apagar a versão anterior: deve gerar uma nova versão auditável.

## Contratos k6

O cenário `k6/smoke.js` exercita:

- `GET /api/v1/health`
- `GET /api/v1/assets/:assetId/telemetry`
- `GET /api/v1/assets/:assetId/forecast?horizon=1D`
- `GET /api/v1/assets/:assetId/work-orders`

Thresholds: **p95 < 500 ms**, **erro < 1%**, **checks > 99%**. O teste precisa apontar `API_BASE_URL` para o gateway real; executar contra o Vite não substitui o teste do backend.

## Padrões adotados

A camada de domínio utiliza funções puras e contratos explícitos. Adaptadores de API, Firebase, M-Smart e Arduino/GAD devem depender do domínio, nunca o contrário. A UI usa divulgação progressiva: resumo para o usuário, detalhe operacional para o técnico e evidência/proveniência sob demanda.

## Critérios de aceite

1. Todos os valores exibidos têm identidade, timestamp e proveniência.
2. Nenhuma capacidade térmica de placa é usada como potência elétrica.
3. Inferência não é promovida a diagnóstico sem sensores físicos suficientes.
4. Status é consistente em todas as telas e possui cor, texto e ação.
5. Forecast sintético é explicitamente rotulado.
6. Domínio possui cobertura de linhas, branches, funções e statements em 100%.
7. k6 é executável contra um backend real e respeita os thresholds definidos.
