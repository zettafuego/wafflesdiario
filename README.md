# Waffle Daily

Checklist + **Scrum** + **1:1** (Waffles y lo personal). Online y offline.

Mantra: *Mi paz mental. Dejar todo más ordenado de como lo encontré.*

Voz de Edu: *Eres un crack. El Edu del pasado te quiere mucho.* Una a la vez. uwu.

## Arranque

Doble clic en `start.bat` o `python -m http.server 8768 --bind 127.0.0.1`

http://127.0.0.1:8768

## Scrum

| Vista | Qué es |
|-------|--------|
| Hoy | Foco (WIP 1), **Resolver ahora** (prioridades), daily, checklist |
| Tablero | Backlog → Por hacer → En curso → Revisión → Hecho |
| 1:1 | One to one uwu con cada Waffle y con gente personal |
| Carta | Juego: el Edu del pasado te dice que eres un crack |
| Sprint | Semana ISO (`2026-W37`) · en Más |

Una carta **En curso** a la vez. Eso es el foco.

**Resolver ahora** ordena pendientes así: vitales → 1:1 de hoy → tareas de una vez → lo que ya era la hora → el resto (cuerpo, Waffles, Casma, Love Song…).

**Alertas** (Más → Activar): notificaciones en el celular y en la computadora si instalas la PWA. Horarios: 07:30 cuerpo, 08:00 prioridades, 12:30 foco, 16:00 vitales, 19:00 Bard, 21:45 cargar celu, 22:15 carta del Edu del pasado.

## 1:1

Waffles: Renzo, Juan, Violeta, Zahira, Dizzy, Yose.

Personal: Angela, Maestra, y las que agregues.

Cada ficha: vibe, nota, charla, próximo encuentro, pendientes.

## Base de datos (gratis): Google Sheets + Apps Script

Es la que te recomiendo: 0 soles, ya la usas como Excel de Waffles, y el celu y la PC bajan + suben.

1. En Drive, abre tu Spreadsheet (o crea uno vacío: “Waffle Daily”).
2. **Extensiones → Apps Script**. Borra el stub. Pega todo `apps-script/Code.gs`.
3. Guarda. Función `setup` → **Ejecutar** (autoriza tu cuenta una vez).
4. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **yo**
   - Quién tiene acceso: **Cualquiera** (no «solo yo»: si no, Google pide login y el teléfono no entra)
5. Copia la URL que termina en `/exec` (fija en la app: `Waffle.SCRIPT_URL`).
6. En Waffle Daily → **Más** → **Probar conexión** → **Sincronizar (bajar + subir)**.

Si ya implementaste y Probar conexión falla: **Implementar → Administrar implementaciones → lápiz → Quién tiene acceso: Cualquiera → Nueva versión**.

Si cambias `Code.gs`, **Implementar → Administrar implementaciones → lápiz → Nueva versión**. Si no, el teléfono sigue hablando con el script viejo.

Opcional: pon la misma palabra en `TOKEN` (Code.gs) y en **Más → Token**.

**No uses Firebase/Supabase** para esto: cobran o piden proyecto, y tú ya tienes Drive. Sheets aguanta de sobra un solo Edu.

**Excel de Waffles (control de tareas):** en Hoy, bloque Waffles Tech → **Llenar Excel Waffles**. Copia las filas, baja el CSV y abre la hoja. Columnas: creación · personas · tarea · detalle · prioridad · plazo · bloqueos · estatus.

**Grabar contenido** es tarea diaria de Ámbar.

Sin red, todo sigue en el teléfono. Al volver, sube solo.

**Excel CSV** en Más descarga un `.csv` (UTF-8, `;`) que Excel abre.

Los datos locales siguen en `localStorage`. El Sheet es la copia durable.
