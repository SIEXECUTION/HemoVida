BEGIN;

CREATE TABLE IF NOT EXISTS public.categoriaetariadonante (
    codigo varchar(20) PRIMARY KEY,
    nombre varchar(40) NOT NULL,
    edad_min smallint NOT NULL,
    edad_max smallint NOT NULL,
    CHECK (edad_min >= 0 AND edad_min <= edad_max),
    EXCLUDE USING gist (int4range(edad_min, edad_max, '[]') WITH &&)
);

INSERT INTO public.categoriaetariadonante (codigo, nombre, edad_min, edad_max)
VALUES ('ADULTO_JOVEN', 'Adulto joven', 18, 29),
       ('ADULTO', 'Adulto', 30, 59),
       ('ADULTO_MAYOR', 'Adulto mayor', 60, 65)
ON CONFLICT (codigo) DO NOTHING;

CREATE OR REPLACE VIEW public.vw_donante_categoria_etaria AS
SELECT d.idpersona, d.tipodonante, e.edad,
       CASE
           WHEN e.edad IS NULL THEN 'Sin dato'
           ELSE COALESCE(c.nombre, 'Fuera del rango de referencia')
       END AS categoria_etaria
FROM public.donante d
JOIN public.persona p USING (idpersona)
CROSS JOIN LATERAL (
    SELECT CASE WHEN p.fechanacimiento <= public.hemo_dia_clinico()
                THEN EXTRACT(YEAR FROM age(public.hemo_dia_clinico()::timestamp,
                                           p.fechanacimiento::timestamp))::integer
           END AS edad
) e
LEFT JOIN public.categoriaetariadonante c ON e.edad BETWEEN c.edad_min AND c.edad_max;

-- La vista contiene edades y se consulta desde el backend autenticado.
ALTER TABLE public.categoriaetariadonante ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.categoriaetariadonante, public.vw_donante_categoria_etaria FROM PUBLIC;
DO $$
DECLARE
    rol_api text;
BEGIN
    FOR rol_api IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format(
            'REVOKE ALL ON public.categoriaetariadonante, public.vw_donante_categoria_etaria FROM %I',
            rol_api
        );
    END LOOP;
END;
$$;

COMMIT;
