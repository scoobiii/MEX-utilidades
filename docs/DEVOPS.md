# Guia DevOps / VUA

Os mesmos gates devem rodar localmente e no CI:
npm run lint
npm test
npm run coverage
npm run vua:verify
npm run build
npm run k6

A cobertura de 100% é aplicada à camada de domínio/regras de negócio. k6 mede comportamento/performance, não cobertura de código.

Segredos não entram no Git. Integrações externas devem autenticar, validar origem e registrar eventos.
