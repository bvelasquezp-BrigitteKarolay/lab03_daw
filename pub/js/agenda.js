const API_URL = "/lab03/api/events";
const ICON_EDIT = "/lab03/pub/img/icon-edit.png";
const ICON_DELETE = "/lab03/pub/img/icon-delete.png";



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