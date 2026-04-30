# Agenda Virtual con Node.js y Express

## Descripción del proyecto

Este proyecto consiste en el desarrollo de una agenda virtual implementada con Node.js y Express, que permite gestionar eventos mediante operaciones CRUD (Crear, Leer, Actualizar y Eliminar).

Los eventos se almacenan en el sistema de archivos local utilizando una estructura organizada por fechas, donde cada evento es guardado como un archivo .md.

---

## Objetivo

Implementar un servidor backend capaz de:

* Registrar eventos con fecha, hora y descripción
* Listar todos los eventos almacenados
* Modificar eventos existentes
* Eliminar eventos

---

## Tecnologías utilizadas

* Node.js
* Express
* Módulo fs (File System)
* Módulo path

---

## Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

* Node.js (versión 14 o superior)
* npm (gestor de paquetes)

Puedes verificarlo con:

bash
node -v
npm -v


---

## Instalación

1. Clonar o descargar el proyecto
2. Abrir una terminal en la carpeta del proyecto
3. Instalar dependencias:

bash
npm install express


---

## Ejecución del programa

Para iniciar el servidor:

bash
node server.js


Luego abrir en el navegador:


http://localhost:8080/lab03


---

## Estructura del proyecto


project/
│
├── pub/          # Archivos públicos (frontend(css, html, js, min.js) )
├── priv/         # Eventos almacenados
├── index.html    # Interfaz principal
├── index.js     # Servidor Express


---

## Funcionamiento general

El sistema organiza los eventos de la siguiente manera:

* Cada fecha se guarda como una carpeta
  Ejemplo: 2026.04.30

* Cada hora se guarda como archivo
  Ejemplo: 14.30.md

Ruta final:


priv/2026.04.30/14.30.md


---

## Operaciones CRUD

### Leer eventos (READ)

Endpoint:


GET /lab03/api/events


Código relevante:

js
app.get(`${BASE_URL}/api/events`, (req, res) => {
  const events = loadAllEvents();
  res.json({ ok: true, events });
});


Este método recorre las carpetas, lee los archivos .md, extrae la información y ordena los eventos.

---

### Crear evento (CREATE)

Endpoint:


POST /lab03/api/events


Ejemplo JSON:

json
{
  "date": "2026-04-30",
  "time": "14:30",
  "description": "Clase"
}


Código resumido:

js
writeEventFile(date, time, description);


Este método valida los datos, crea la carpeta si no existe y guarda el archivo.

---

### Editar evento (UPDATE)

Endpoint:


PUT /lab03/api/events


Código clave:

js
if (oldDate !== date || oldTime !== time) {
  deleteEventFile(oldDate, oldTime);
}
writeEventFile(date, time, description);


Este proceso elimina el evento anterior si cambia la fecha u hora y guarda el nuevo evento actualizado.

---

### Eliminar evento (DELETE)

Endpoint:


DELETE /lab03/api/events


Código:

js
deleteEventFile(date, time);


Este método elimina el archivo del evento y, si la carpeta queda vacía, también la elimina.

---

## Funciones importantes

* ensureDir() crea carpetas si no existen
* loadAllEvents() carga y ordena eventos
* writeEventFile() guarda eventos
* deleteEventFile() elimina eventos

---

