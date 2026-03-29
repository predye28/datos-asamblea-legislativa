etapas:

extracion de datos:

Se utilizara Playwright
pip install playwright

python extraer_proyectos.py


sigueiente paso el sync engine

pip install psycopg2-binary python-dotenv

psycopg2 es el driver que conecta Python con PostgreSQL. python-dotenv es para que las credenciales de la base de datos no queden hardcodeadas en el código.

en la parte de bd se esta uitliando el servicio de neon con postgresql

para la parte del backend:

FastAPI + Railway

FastAPI porque ya tenés todo en Python, comparte las mismas dependencias (psycopg2, python-dotenv), genera documentación automática en /docs, y es muy rápido para APIs de este tipo.
Railway porque conecta directo con GitHub, deploy automático en cada push, tiene tier gratuito generoso, y configurar la variable DATABASE_URL es trivial. Render también funciona igual de bien.

cd api
pip install -r requirements.txt
uvicorn main:app --reload




Por qué este portal importa
La Asamblea Legislativa publica sus datos, pero los publica de una forma que solo un abogado o un politólogo puede navegar. El ciudadano promedio no sabe que existe el SIL, y si lo visita, se va sin entender nada. El problema no es falta de transparencia, es falta de traducción.


metricas que tengo pensadas:

1. Proyectos presentados vs. leyes aprobadas
La mayoría de ticos no sabe que la tasa de aprobación legislativa es bajísima. Ver que de 500 proyectos solo 12 se convirtieron en ley genera una conversación importante: ¿por qué? ¿quiénes los bloquean? ¿cuáles son los que nunca avanzan?
2. Proyectos próximos a vencer
Cada proyecto tiene 4 años de vida. Si no se aprueba, muere. Mostrar esto crea urgencia real y periodística: "Este proyecto que beneficia a X personas muere en 30 días". Es el dato más accionable del portal.
3. Quién propone más leyes (ranking de diputados)
No como ranking político, sino como dato de actividad. El ciudadano puede ver si su diputado está trabajando o no. Es transparencia sin editorial.
4. Dónde se atascan los proyectos (órganos)
Muchos proyectos pasan años en la misma comisión. Mostrar qué comisiones tienen más proyectos acumulados revela dónde está el cuello de botella legislativo.
5. Actividad por mes
¿Hay más actividad antes de elecciones? ¿En ciertos meses? El ciudadano puede ver patrones que los medios no reportan.
6. Buscador por tema o diputado
Para que cualquier persona pueda preguntar: "¿qué ha hecho el diputado X?" o "¿hay algún proyecto sobre agua?"


frondend:

cd asamblea-portal-frontend
npm install
npm run dev


ahora para desplegarlo la idea es usar:

para el frontend vercel:

y el backend render:
https://dashboard.render.com/web/srv-d74ol094tr6s73cth550