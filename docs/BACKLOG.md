# Backlog vivo — MEX Utilidades / HVAC-R

> Atualizado a cada entrega verificável. Itens só avançam quando existe evidência no repositório, CI ou VUA.

## Regras
- Todo PR aponta para um Sprint/épico.
- Após cada merge: atualizar status, evidência, percentual e próximos itens.
- Documentação isolada não conclui um item.
- 🟢 Done = implementação + testes + cobertura + documentação + VUA quando aplicável + merge.
- 🟡 In progress = iniciado, mas sem evidência completa.
- ⚪ Backlog = não iniciado.
- 🔴 Blocked = depende de acesso, hardware, protocolo ou sistema externo.

## S0 — Fundação / Quality Gates
- [x] Regras de domínio HVAC-R
- [x] Proveniência OBSERVED / DERIVED / INFERRED / NAMEPLATE
- [x] Estados operacionais
- [x] IAQ GPA base
- [x] Forecast 1D / 1W / 1M / 1A
- [x] Testes da camada de domínio
- [x] VUA quality flow
- [x] PR #1 mergeado em `main`
- [ ] Execução CI comprovando 100%
- [ ] k6 executado em CI

## S1 — UX mobile-first
- [ ] Shell mobile Android
- [ ] Desktop responsivo
- [ ] Dashboard Usuário / IAQ
- [ ] Dashboard Técnico
- [ ] Dashboard Gestor/PMOC
- [ ] Design system
- [ ] Figma → implementação
- [ ] testes UX/E2E

## S2 — Cadastro de ativos
- [ ] Asset
- [ ] Evaporador
- [ ] Condensador
- [ ] fabricante/modelo
- [ ] serial
- [ ] tag
- [ ] patrimônio
- [ ] vínculo Asset ↔ DeviceBinding
- [ ] testes de contrato

## S3 — Telemetria + SQLite
- [ ] T1 retorno
- [ ] T2 evaporador
- [ ] T3 descarga
- [ ] T4 ambiente
- [ ] linha de líquido
- [ ] tensão
- [ ] corrente
- [ ] ΔT
- [ ] performance
- [ ] inferência de superheat
- [ ] inferência de subcooling
- [ ] SQLite
- [ ] fila offline
- [ ] sync idempotente

## S4 — API / Gateway
- [ ] REST/OpenAPI
- [ ] servidor local
- [ ] Arduino/ESP32 adapter
- [ ] adapters de fabricantes
- [ ] autenticação
- [ ] readback/ACK quando houver controle
- [ ] testes de integração

## S5 — Dashboards
- [ ] real-time
- [ ] 24h
- [ ] semanal
- [ ] mensal
- [ ] anual
- [ ] consumo previsto
- [ ] detecção de fora do normal
- [ ] estados visualmente distintos
- [ ] exportação

## S6 — Forecast
- [ ] serviço Prophet
- [ ] 1D
- [ ] 1W
- [ ] 1M
- [ ] 1A
- [ ] intervalos de confiança
- [ ] validação temporal
- [ ] somente OBSERVED + DERIVED como entrada
- [ ] monitoramento de erro do forecast

## S7 — PMOC / manutenção
- [ ] plano ativo
- [ ] distribuição
- [ ] aderência
- [ ] WorkOrder
- [ ] evidência antes/durante/depois
- [ ] materiais
- [ ] horas
- [ ] auditoria
- [ ] fechamento da OS

## S8 — Integrações
- [ ] Arduino/ESP32
- [ ] Midea
- [ ] Daikin
- [ ] LG
- [ ] Carrier
- [ ] Samsung
- [ ] Fujitsu
- [ ] Gree
- [ ] TCL
- [ ] Elgin
- [ ] APIs comerciais
- [ ] testes por protocolo antes de declarar suporte

## S9 — IAQ
- [ ] sensores por Environment
- [ ] GPA Index
- [ ] histórico
- [ ] alertas
- [ ] dashboard usuário
- [ ] regras de qualidade
- [ ] documentação das limitações

## S10 — Acesso e segurança
- [ ] USER
- [ ] TECHNICIAN
- [ ] MANAGER
- [ ] ADMIN
- [ ] RBAC
- [ ] escopo por tenant
- [ ] RLS
- [ ] auditoria
- [ ] gestão de sessão

## S11 — Treinamento / agente
- [ ] base documental
- [ ] embeddings
- [ ] pgvector
- [ ] trilha por perfil
- [ ] mini-curso usuário
- [ ] mini-curso técnico
- [ ] mini-curso gestor
- [ ] conhecimento para agente
- [ ] avaliação de respostas

## S12 — Produção
- [ ] CI/CD completo
- [ ] 100% cobertura onde definido
- [ ] k6/load test
- [ ] observabilidade
- [ ] alertas
- [ ] backup/restore testado
- [ ] segurança
- [ ] SLO
- [ ] operação real piloto
- [ ] checklist de go-live
- [ ] Production Ready

## Registro de entregas
| 2026-09-21 | S1 | CI merge gate | coverage 100% + anti-mock + VUA + build + k6 | 🟢 |

| Data | Sprint | Entrega | Evidência | Status |
|---|---|---|---|---|
| 2026-09-21 | S0 | domínio + VUA + quality gates + forecast semanal + roadmap | PR #1 | 🟢 MERGED |
| 2026-09-21 | S0 | roadmap dinâmico e progresso no README | `docs/ROADMAP.md` + `README.md` | 🟢 |
| 2026-09-21 | S0 | backlog vivo por sprint | `docs/BACKLOG.md` | 🟢 |

## Próximo foco

**S1 → UX mobile-first**, começando pelo fluxo do técnico:

`Login → seleção do ativo → evaporador → condensador → telemetria → diagnóstico operacional → manutenção → evidência`.

Após cada novo merge, este arquivo deve ser atualizado com o sprint, evidência e status correspondente.
