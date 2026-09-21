# Roadmap dinâmico — MEX Utilidades / HVAC-R

> Fonte de verdade de progresso. A linha do tempo avança por **sprints mergeados**, não por intenção.
> Percentuais são estimativas de entrega contra os requisitos declarados no README.

## Status atual — baseline

**Marco:** S0 — domínio + quality gates  
**Branch:** `feat/vua-100-coverage-ci`  
**Estimativa de requisitos entregues:** **~35%**  
**Produção:** NÃO

### Legenda

- 🟢 Implementado e testado
- 🟡 Implementado como contrato/base, integração pendente
- 🔵 Documentado/modelado
- ⚪ Ainda não implementado
- 🔴 Bloqueado por dependência externa

## Linha do tempo

| Sprint | Marco | Escopo | Status | Evidência |
|---|---|---|---|---|
| S0 | Domínio + VUA | regras HVAC-R, IAQ, proveniência, status, forecast contract, testes | 🟢 | `src/domain`, `tests`, VUA |
| S1 | UX mobile-first | telas usuário/técnico/gestor, responsividade, design system | 🟡 | UI existente + evolução Figma |
| S2 | Cadastro de ativos | fabricante/modelo/serial/tag/patrimônio, evaporador/condensador | 🟡 | domínio/base de dados |
| S3 | Telemetria | T1/T2/T3/T4, tensão, corrente, ΔT, performance, SQLite | 🟡 | contrato + persistência local |
| S4 | API/Gateway | REST/OpenAPI, servidor local, adapters, sincronização offline | 🟡 | smoke contract |
| S5 | Dashboards | real-time, 24h, semanal, mensal, anual | 🟡 | gráficos/base UI |
| S6 | Forecast | Prophet 1D/1W/1M/1A + intervalos/confiança | 🟡 | contrato; serviço produtivo pendente |
| S7 | PMOC | plano, distribuição, aderência, OS e auditoria | 🟡 | regras; backend produtivo pendente |
| S8 | Integrações | Arduino/ESP32 + protocolos + sistemas comerciais | ⚪ | adapters reais pendentes |
| S9 | IAQ | sensores, GPA Index, histórico e alertas por ambiente | 🟡 | regra GPA; aquisição/UI completa pendente |
| S10 | Segurança/acesso | USER/TECHNICIAN/MANAGER/ADMIN, auth, escopo e isolamento | ⚪ | contrato de papéis |
| S11 | Treinamento | pgvector, conteúdo por perfil, mini-cursos e agente | ⚪ | arquitetura definida |
| S12 | Produção | CI/CD, observabilidade, carga, segurança, backup, SLO | ⚪ | k6 local; CI produtivo pendente |

## Critério de avanço

Um sprint só vira **🟢** quando houver:

1. implementação;
2. teste unitário/integrado correspondente;
3. cobertura exigida;
4. teste de contrato quando aplicável;
5. documentação atualizada;
6. VUA: DOCUMENTED → INSPECTED → TESTED → AUDITED → VERIFIED;
7. PR mergeado.

## Percentual

O percentual é calculado por requisito do README, com pesos iguais por capacidade principal. Não conta documentação como implementação.

### Macroprogresso atual

- Camadas UX/usuário/técnico/gestor/backend/dispositivo: **~30%**
- Dados HVAC-R: **~45%**
- Séries temporais/forecast: **~25%**
- Fabricantes/adapters reais: **~10%**
- Integrações/API/offline: **~30%**
- Acesso/perfis: **~20%**
- Proveniência: **~80%**
- VUA/quality gates: **~70%**
- IAQ: **~35%**

**Estimativa consolidada: ~35%.**

> Este percentual não significa 35% de código. Significa aproximadamente 35% dos requisitos funcionais/documentados do README com implementação verificável.

## Business Plan → Produto

A sequência de entrega deve permanecer:

`Fundação → MVP técnico → MVP operacional → PMOC/execução → Integrações → IAQ/treinamento → produção`

O produto é considerado **Production Ready** somente quando S12 estiver 🟢 e houver validação de operação real, não apenas build/testes.

## Regra para atualização automática

A cada PR mergeado:

`merge → identificar sprint → atualizar status → recalcular % → registrar evidência → atualizar README`

Nenhum sprint deve ser marcado como concluído apenas por criação de arquivos.
