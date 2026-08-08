# Testes de banco

SQL para rodar a mao contra o Supabase, colando no SQL Editor. Nao ha runner
automatizado -- se um dia houver, o candidato natural e o `supabase test db`
(pgTAP).

Cada arquivo e um bloco `DO $$ ... $$` unico, portanto uma transacao so:
qualquer `RAISE EXCEPTION` desfaz tudo. Mesmo assim os testes limpam o que
criaram no fim, para o caso de serem adaptados e rodados fora de transacao.

| arquivo | o que fixa |
|---|---|
| `megaresults_ingest_idempotencia.sql` | contrato de `megaresults.ingest_transactions` / `ingest_clicks`: reimportar arquivo identico nao reescreve linha (`skipped`), mudanca de status/comissao atualiza e gera historico, dimensoes sao resolvidas e o dia marcado em `rollup_dirty` usa o fuso de Sao Paulo |

## Antes de rodar

Os testes usam um `owner_id` fixo, declarado no topo do arquivo. Eles **abortam
se ja houver dados reais desse owner** -- e a guarda que impede rodar em cima de
producao. Se o uuid nao existir no seu ambiente, troque pelo de um usuario de
teste.

## Status

`megaresults_ingest_idempotencia.sql` **rodou verde em 08/08/2026** contra o
projeto `nxlfezpagporealqqbfj`, executado como esta versionado. As 14 assercoes
passaram e a limpeza deixou zero residuo (0 transacoes, 0 conexoes do owner de
teste).

Vale re-rodar sempre que uma das migrations 09-11 for alterada: sao elas que
implementam o contrato que este arquivo fixa.
