-- Amplia o enum existente com infoprodutos e redes. Aditivo: nenhum valor removido.
ALTER TYPE public.marketplace ADD VALUE IF NOT EXISTS 'hotmart';
ALTER TYPE public.marketplace ADD VALUE IF NOT EXISTS 'monetizze';
ALTER TYPE public.marketplace ADD VALUE IF NOT EXISTS 'eduzz';
ALTER TYPE public.marketplace ADD VALUE IF NOT EXISTS 'braip';
ALTER TYPE public.marketplace ADD VALUE IF NOT EXISTS 'rakuten';
ALTER TYPE public.marketplace ADD VALUE IF NOT EXISTS 'kwai';
