const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PUERTO = 8080;
const URL_BASE = "/lab03";

// Rutas principales del proyecto
const DIR_RAIZ = __dirname;
const DIR_PUBLICO = path.join(DIR_RAIZ, "pub");
const DIR_PRIVADO = path.join(DIR_RAIZ, "priv");

app.use(express.json());

// Servir archivos publicos (css, js, imgenes)
app.use(`${URL_BASE}/pub`, express.static(DIR_PUBLICO));

// Pagina principal
app.get(`${URL_BASE}`, (req, res) => {
  res.sendFile(path.join(DIR_RAIZ, "index.html"));
});

// Redirección opcional desde "/"
app.get("/", (req, res) => {
  res.redirect(`${URL_BASE}`);
});

// xista un directorio
function asegurarDirectorio(ruta) {
  if (!fs.existsSync(ruta)) {
    fs.mkdirSync(ruta, { recursive: true });
  }
}

// Validacion formato de fecha (YYYY-MM-DD)
function esFechaValida(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

// Validacion formato de hora (HH:MM)
function esHoraValida(hora) {
  return /^\d{2}:\d{2}$/.test(hora);
}

// Convierte fecha a formato de carpeta (2025.04.30)
function convertirNombreCarpeta(fecha) {
  return fecha.replaceAll("-", ".");
}

// Convierte hora a nombre de archivo (12.30.md)
function convertirNombreArchivo(hora) {
  return `${hora.replace(":", ".")}.md`;
}

// Obtiene la ruta completa del evento (carpeta + archivo)
function obtenerRutaEvento(fecha, hora) {
  const rutaCarpeta = path.join(DIR_PRIVADO, convertirNombreCarpeta(fecha));
  const rutaArchivo = path.join(rutaCarpeta, convertirNombreArchivo(hora));
  return { rutaCarpeta, rutaArchivo };
}

function leerArchivoEvento(rutaArchivo, nombreCarpeta, nombreArchivo) {
  const contenido = fs.readFileSync(rutaArchivo, "utf8");

  const matchDescripcion = contenido.match(/Descripción:\s*([\s\S]*)$/m);
  const descripcion = matchDescripcion ? matchDescripcion[1].trim() : "";

  const fecha = nombreCarpeta.replaceAll(".", "-");
  const hora = nombreArchivo.replace(".md", "").replace(".", ":");

  return {
    date: fecha,
    time: hora,
    description: descripcion
  };
}

// Carga todos los eventos desde el sistema de archivos
function cargarTodosEventos() {
  asegurarDirectorio(DIR_PRIVADO);

  const listaEventos = [];

  const carpetas = fs.readdirSync(DIR_PRIVADO, { withFileTypes: true });

  for (const carpeta of carpetas) {
    if (!carpeta.isDirectory()) continue;
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(carpeta.name)) continue;

    const rutaCarpeta = path.join(DIR_PRIVADO, carpeta.name);
    const archivos = fs.readdirSync(rutaCarpeta, { withFileTypes: true });

    for (const archivo of archivos) {
      if (!archivo.isFile()) continue;
      if (!/^\d{2}\.\d{2}\.md$/.test(archivo.name)) continue;

      const rutaArchivo = path.join(rutaCarpeta, archivo.name);
      const evento = leerArchivoEvento(rutaArchivo, carpeta.name, archivo.name);
      listaEventos.push(evento);
    }
  }

  // Ordenar por fecha y hora
  listaEventos.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.time.localeCompare(b.time);
  });

  return listaEventos;
}

// Guarda un evento en archivo .md
function guardarEvento(fecha, hora, descripcion) {
  const { rutaCarpeta, rutaArchivo } = obtenerRutaEvento(fecha, hora);
  asegurarDirectorio(rutaCarpeta);

  const contenido = `# Evento
Fecha: ${fecha}
Hora: ${hora}

Descripción:
${descripcion}
`;

  fs.writeFileSync(rutaArchivo, contenido, "utf8");
}

// Elimina un evento y su carpeta si queda vacía
function eliminarArchivoEvento(fecha, hora) {
  const { rutaCarpeta, rutaArchivo } = obtenerRutaEvento(fecha, hora);

  if (fs.existsSync(rutaArchivo)) {
    fs.unlinkSync(rutaArchivo);
  }

  try {
    const restante = fs.readdirSync(rutaCarpeta);
    if (restante.length === 0) {
      fs.rmdirSync(rutaCarpeta);
    }
  } catch {}
}

// Obtener todos los eventos
app.get(`${URL_BASE}/api/events`, (req, res) => {
  try {
    const eventos = cargarTodosEventos();
    res.json({ ok: true, events: eventos });
  } catch {
    res.status(500).json({ ok: false, message: "No se pudieron leer los eventos." });
  }
});

// Crear evento
app.post(`${URL_BASE}/api/events`, (req, res) => {
  try {
    const { date, time, description } = req.body;

    if (!date || !time || !description) {
      return res.status(400).json({ ok: false, message: "Faltan datos." });
    }

    if (!esFechaValida(date) || !esHoraValida(time)) {
      return res.status(400).json({ ok: false, message: "Formato inválido." });
    }

    guardarEvento(date, time, description);
    const eventos = cargarTodosEventos();

    res.json({ ok: true, events: eventos });
  } catch {
    res.status(500).json({ ok: false, message: "No se pudo guardar." });
  }
});

// Editar evento
app.put(`${URL_BASE}/api/events`, (req, res) => {
  try {
    const { oldDate, oldTime, date, time, description } = req.body;

    if (!oldDate || !oldTime || !date || !time || !description) {
      return res.status(400).json({ ok: false, message: "Faltan datos." });
    }

    if (!esFechaValida(date) || !esHoraValida(time)) {
      return res.status(400).json({ ok: false, message: "Formato inválido." });
    }

    // Si cambió fecha u hora, elimina el anterior
    if (oldDate !== date || oldTime !== time) {
      eliminarArchivoEvento(oldDate, oldTime);
    }

    guardarEvento(date, time, description);
    const eventos = cargarTodosEventos();

    res.json({ ok: true, events: eventos });
  } catch {
    res.status(500).json({ ok: false, message: "No se pudo actualizar." });
  }
});

// Eliminar evento
app.delete(`${URL_BASE}/api/events`, (req, res) => {
  try {
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({ ok: false, message: "Faltan datos." });
    }

    eliminarArchivoEvento(date, time);
    const eventos = cargarTodosEventos();

    res.json({ ok: true, events: eventos });
  } catch {
    res.status(500).json({ ok: false, message: "No se pudo eliminar." });
  }
});

// Iniciar servidor
app.listen(PUERTO, () => {
  console.log(`Servidor listo en http://127.0.0.1:8080/lab03`);
});

// frontend
const form = document.getElementById("eventForm");
const dateInput = document.getElementById("eventDate");
const timeInput = document.getElementById("eventTime");
const descInput = document.getElementById("eventDescription");
const cancelBtn = document.getElementById("cancelBtn");
const container = document.getElementById("eventsContainer");
const totalEventsEl = document.getElementById("totalEvents");
const uniqueDatesEl = document.getElementById("uniqueDates");
const viewButtons = document.querySelectorAll(".view-btn");

let viewMode = "lista";
let events = [];
let editingKey = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  attachEvents();
  await loadEventsFromServer();
  renderAll();
}

function attachEvents() {
  form.addEventListener("submit", handleSubmit);

  cancelBtn.addEventListener("click", () => {
    editingKey = null;
    form.reset();
  });

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewMode = btn.dataset.view;
      viewButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderEvents();
    });
  });
}

async function loadEventsFromServer() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    events = Array.isArray(data.events) ? data.events : [];
  } catch {
    events = [];
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const date = dateInput.value.trim();
  const time = timeInput.value.trim();
  const description = descInput.value.trim();

  if (!date || !time || !description) {
    alert("Completa la fecha, la hora y la descripción.");
    return;
  }

  try {
    let response;
    if (editingKey) {
      response = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldDate: editingKey.date,
          oldTime: editingKey.time,
          date,
          time,
          description
        })
      });
    } else {
      response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, description })
      });
    }

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.message || "No se pudo guardar.");
      return;
    }

    events = data.events || [];
    editingKey = null;
    form.reset();
    renderAll();
  } catch {
    alert("Error al conectar con el servidor.");
  }
}

function renderAll() {
  renderEvents();
  renderStats();
}

function renderStats() {
  totalEventsEl.textContent = events.length;
  uniqueDatesEl.textContent = new Set(events.map((e) => e.date)).size;
}

function groupByDate(items) {
  const groups = new Map();

  items.forEach((item) => {
    if (!groups.has(item.date)) {
      groups.set(item.date, []);
    }
    groups.get(item.date).push(item);
  });

  return [...groups.entries()];
}

function renderEvents() {
  if (!events.length) {
    container.innerHTML = `
      <div class="empty-state">
        No hay eventos registrados.
      </div>
    `;
    return;
  }

  const grouped = groupByDate(events);

  if (viewMode === "lista") {
    container.innerHTML = grouped
      .map(([date, items]) => `
        <section class="date-group">
          <div class="date-header">
            <span class="calendar-badge"><span>${getDay(date)}</span></span>
            <span>${escapeHTML(date)}</span>
          </div>

          ${items.map(renderEventCard).join("")}
        </section>
      `)
      .join("");
  } else {
    container.innerHTML = `
      <div class="structure-wrap">
        ${grouped
          .map(
            ([date, items]) => `
              <section class="structure-date">
                <div class="date-header">
                  <span class="calendar-badge"><span>${getDay(date)}</span></span>
                  <span>${escapeHTML(date)}</span>
                </div>

                <div class="structure-items">
                  ${items.map(renderStructureItem).join("")}
                </div>
              </section>
            `
          )
          .join("")}
      </div>
    `;
  }

  bindActionButtons();
}

function renderEventCard(event) {
  return `
    <article class="event-card">
      <div class="event-info">
        <div class="event-time">
          <span class="clock-dot"></span>
          <span>${escapeHTML(event.time)}</span>
        </div>
        <p class="event-desc">${toHTML(event.description)}</p>
      </div>

      <div class="event-actions">
        <button class="action-btn action-edit" data-action="edit" data-date="${event.date}" data-time="${event.time}">
          <img src="${ICON_EDIT}" alt="Editar" />
          <span>Editar</span>
        </button>

        <button class="action-btn action-delete" data-action="delete" data-date="${event.date}" data-time="${event.time}">
          <img src="${ICON_DELETE}" alt="Eliminar" />
          <span>Eliminar</span>
        </button>
      </div>
    </article>
  `;
}

function renderStructureItem(event) {
  return `
    <article class="structure-item">
      <div class="event-time">
        <span class="clock-dot"></span>
        <span>${escapeHTML(event.time)}</span>
      </div>
      <p class="event-desc">${toHTML(event.description)}</p>

      <div class="event-actions" style="margin-top:10px; justify-content:flex-end;">
        <button class="action-btn action-edit" data-action="edit" data-date="${event.date}" data-time="${event.time}">
          <img src="${ICON_EDIT}" alt="Editar" />
          <span>Editar</span>
        </button>

        <button class="action-btn action-delete" data-action="delete" data-date="${event.date}" data-time="${event.time}">
          <img src="${ICON_DELETE}" alt="Eliminar" />
          <span>Eliminar</span>
        </button>
      </div>
    </article>
  `;
}

function bindActionButtons() {
  document.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => editEvent(btn.dataset.date, btn.dataset.time));
  });

  document.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => deleteEvent(btn.dataset.date, btn.dataset.time));
  });
}

function editEvent(date, time) {
  const event = events.find((ev) => ev.date === date && ev.time === time);
  if (!event) return;

  editingKey = { date: event.date, time: event.time };
  dateInput.value = event.date;
  timeInput.value = event.time;
  descInput.value = event.description;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteEvent(date, time) {
  const event = events.find((ev) => ev.date === date && ev.time === time);
  if (!event) return;

  const ok = confirm(`¿Eliminar el evento del ${event.date} a las ${event.time}?`);
  if (!ok) return;

  try {
    const response = await fetch(API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, time })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      alert(data.message || "No se pudo eliminar.");
      return;
    }

    events = data.events || [];
    if (editingKey && editingKey.date === date && editingKey.time === time) {
      editingKey = null;
      form.reset();
    }

    renderAll();
  } catch {
    alert("Error al conectar con el servidor.");
  }
}

function getDay(date) {
  const parts = date.split("-");
  return parts.length === 3 ? parts[2] : "00";
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toHTML(text) {
  return escapeHTML(text).replace(/\n/g, "<br>");
}
