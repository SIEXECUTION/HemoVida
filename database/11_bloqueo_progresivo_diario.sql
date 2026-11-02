-- CU01: contador diario en America/La_Paz, sin alterar contraseñas ni estados existentes.
-- Aplicar antes de desplegar el código que utiliza fechaintentosdia.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS fechaintentosdia date;
COMMENT ON COLUMN public.usuario.fechaintentosdia IS 'Día de Bolivia del contador diario de fallos; reinicio al siguiente intento del nuevo día';
COMMIT;
