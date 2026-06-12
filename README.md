# football-db-app

Backend de fútbol sin API en tiempo real. La app consulta solo PostgreSQL y la base se actualiza sola con GitHub Actions usando datasets públicos.

## Qué incluye

- Top 5 ligas + segundas divisiones
- Primeira Liga
- Eredivisie
- Saudi Pro League preparada para importar después con CSV manual
- Selecciones internacionales
- Predicción básica para goles, corners y tarjetas
- PostgreSQL como única fuente de datos de la app
- Workflow automático diario

## Fuentes de datos

- football-data.co.uk para resultados, corners, tarjetas, tiros y odds históricos en CSV
- openfootball / international_results para histórico de selecciones
- Puedes extender con openfootball world / worldcup para torneos concretos

## Base de datos recomendada

Usa Neon Postgres gratis.

## Pasos rápidos desde el móvil

1. Descarga este proyecto y súbelo a un repo nuevo en GitHub.
2. Crea una base de datos gratis en Neon.
3. Copia la cadena de conexión en GitHub Secrets como `DATABASE_URL`.
4. En GitHub abre Actions y ejecuta manualmente `Update football database`.
5. Cuando termine, ya tendrás la base llena y la actualización diaria activa.
6. Si quieres desplegar la API, crea un Web Service en Render y conecta el repo.

## Variables

- `DATABASE_URL`
- `PORT`
- `IMPORT_YEARS`
- `DAILY_LOOKBACK_DAYS`

## Comandos

- `npm install`
- `psql $DATABASE_URL -f sql/schema.sql`
- `psql $DATABASE_URL -f sql/views.sql`
- `npm run import:all`
- `npm start`

## Endpoints

- `GET /`
- `GET /api/health`
- `GET /api/competitions`
- `GET /api/matches?date=2026-06-12`
- `GET /api/matches/:id`

## Notas reales importantes

- No hay API en vivo en la app: todo sale de PostgreSQL.
- La actualización automática sí descarga datasets públicos para refrescar la base.
- football-data.co.uk cubre muy bien goles, corners, tarjetas y tiros en muchas ligas europeas, pero no todas las competiciones tienen exactamente las mismas columnas todos los años.
- Saudi Pro League queda preparada en `config/competitions.json`, pero normalmente necesitarás añadir un importador CSV específico cuando decidas la fuente exacta.
- Para Mundial, Euro y Copa América puedes ampliar con otro importador usando openfootball/worldcup.json u otras competiciones openfootball.

## Siguiente mejora

- añadir importador de mundial y euro
- añadir panel web
- añadir tablas de medias por local/visitante
- añadir picks más avanzados
