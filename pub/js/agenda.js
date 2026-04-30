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