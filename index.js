const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 8080;
const BASE_URL = "/lab03";

const ROOT_DIR = __dirname;
const PUB_DIR = path.join(ROOT_DIR, "pub");
const PRIV_DIR = path.join(ROOT_DIR, "priv");

app.use(express.json());


app.use(`${BASE_URL}/pub`, express.static(PUB_DIR));

// Pag principal
app.get(`${BASE_URL}`, (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

// Redireccion opcional 
app.get("/", (req, res) => {
  res.redirect(`${BASE_URL}`);
});

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidTime(time) {
  return /^\d{2}:\d{2}$/.test(time);
}

function toFolderName(date) {
  return date.replaceAll("-", ".");
}

function toFileName(time) {
  return `${time.replace(":", ".")}.md`;
}

function getEventFilePath(date, time) {
  const folderPath = path.join(PRIV_DIR, toFolderName(date));
  const filePath = path.join(folderPath, toFileName(time));
  return { folderPath, filePath };
}

function parseEventFile(filePath, folderName, fileName) {
  const raw = fs.readFileSync(filePath, "utf8");

  const descriptionMatch = raw.match(/Descripción:\s*([\s\S]*)$/m);
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";

  const date = folderName.replaceAll(".", "-");
  const time = fileName.replace(".md", "").replace(".", ":");

  return {
    date,
    time,
    description
  };
}

function loadAllEvents() {
  ensureDir(PRIV_DIR);

  const events = [];

  const folders = fs.readdirSync(PRIV_DIR, { withFileTypes: true });
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(folder.name)) continue;

    const folderPath = path.join(PRIV_DIR, folder.name);
    const files = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile()) continue;
      if (!/^\d{2}\.\d{2}\.md$/.test(file.name)) continue;

      const filePath = path.join(folderPath, file.name);
      const event = parseEventFile(filePath, folder.name, file.name);
      events.push(event);
    }
  }

  events.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.time.localeCompare(b.time);
  });

  return events;
}

function writeEventFile(date, time, description) {
  const { folderPath, filePath } = getEventFilePath(date, time);
  ensureDir(folderPath);

  const content = `# Evento
Fecha: ${date}
Hora: ${time}

Descripción:
${description}
`;

  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function deleteEventFile(date, time) {
  const { folderPath, filePath } = getEventFilePath(date, time);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  try {
    const remaining = fs.readdirSync(folderPath);
    if (remaining.length === 0) {
      fs.rmdirSync(folderPath);
    }
  } catch {
  
  }
}

// obtener todos los eventos
app.get(`${BASE_URL}/api/events`, (req, res) => {
  try {
    const events = loadAllEvents();
    res.json({ ok: true, events });
  } catch (error) {
    res.status(500).json({ ok: false, message: "No se pudieron leer los eventos." });
  }
});

// crear evento
app.post(`${BASE_URL}/api/events`, (req, res) => {
  try {
    const { date, time, description } = req.body;

    if (!date || !time || !description) {
      return res.status(400).json({ ok: false, message: "Faltan datos." });
    }

    if (!isValidDate(date) || !isValidTime(time)) {
      return res.status(400).json({ ok: false, message: "Formato de fecha u hora inválido." });
    }

    writeEventFile(date, time, description);
    const events = loadAllEvents();

    res.json({ ok: true, events });
  } catch (error) {
    res.status(500).json({ ok: false, message: "No se pudo guardar el evento." });
  }
});

// editar evento
app.put(`${BASE_URL}/api/events`, (req, res) => {
  try {
    const { oldDate, oldTime, date, time, description } = req.body;

    if (!oldDate || !oldTime || !date || !time || !description) {
      return res.status(400).json({ ok: false, message: "Faltan datos para editar." });
    }

    if (!isValidDate(date) || !isValidTime(time) || !isValidDate(oldDate) || !isValidTime(oldTime)) {
      return res.status(400).json({ ok: false, message: "Formato inválido." });
    }

    if (oldDate !== date || oldTime !== time) {
      deleteEventFile(oldDate, oldTime);
    }

    writeEventFile(date, time, description);
    const events = loadAllEvents();

    res.json({ ok: true, events });
  } catch (error) {
    res.status(500).json({ ok: false, message: "No se pudo actualizar el evento." });
  }
});

// eliminar evento
app.delete(`${BASE_URL}/api/events`, (req, res) => {
  try {
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({ ok: false, message: "Faltan datos para eliminar." });
    }

    deleteEventFile(date, time);
    const events = loadAllEvents();

    res.json({ ok: true, events });
  } catch (error) {
    res.status(500).json({ ok: false, message: "No se pudo eliminar el evento." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://127.0.0.1:8080/lab03`);
});