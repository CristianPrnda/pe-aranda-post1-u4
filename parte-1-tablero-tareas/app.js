"use strict";

// Estado central de la aplicación
let tareas = [];
let filtroEstado = "todas";
let filtroPrioridad = "todas";

const SECUENCIA_ESTADOS = ["pendiente", "en-progreso", "completada"];

const leerCampo = (selector) => {
  const campo = document.querySelector(selector);
  const valor = campo.value.trim();
  campo.value = "";
  return valor;
};

const tablero = document.querySelector("#tablero");

// ─── Decisión de diseño: generador de ID — Estrategia A (closure/módulo) ──
// Se eligió por encapsulación: el contador queda inaccesible fuera de esta
// función, así ningún otro código puede reasignarlo por error.
function crearGeneradorId() {
  let contador = 1;
  return () => contador++;
}
const generarId = crearGeneradorId();

// Checkpoint de comprensión: switch es apropiado aquí porque todas las
// ramas comparan la misma variable (prioridad) contra valores discretos
// conocidos de antemano, sin rangos ni condiciones compuestas.
function obtenerConfigPrioridad(prioridad) {
  switch (prioridad) {
    case "alta": return { clase: "prioridad-alta", etiqueta: "Alta" };
    case "media": return { clase: "prioridad-media", etiqueta: "Media" };
    case "baja": return { clase: "prioridad-baja", etiqueta: "Baja" };
    default: return { clase: "prioridad-media", etiqueta: "Media" };
  }
}

function crearElementoTarea({ id, titulo, descripcion, prioridad, estado }) {
  const { clase: clasePrioridad, etiqueta: etiquetaPrioridad } = obtenerConfigPrioridad(prioridad);
  const tarea = document.createElement("article");
  tarea.classList.add("tarea", `estado-${estado}`, clasePrioridad);
  tarea.dataset.id = id;

  const puedeAvanzar = estado !== "completada";
  tarea.innerHTML = `
    <span class="badge-prioridad">${etiquetaPrioridad}</span>
    <span class="badge-estado">${estado}</span>
    <h3>${titulo}</h3>
    <p>${descripcion}</p>
    <div class="acciones-tarea">
      ${puedeAvanzar
        ? `<button class="btn-avanzar" data-id="${id}" data-action="avanzar">Avanzar estado</button>`
        : ""}
      <button class="btn-eliminar" data-id="${id}" data-action="eliminar">Eliminar</button>
    </div>
  `;
  return tarea;
}

function agregarTarea() {
  const titulo = leerCampo("#input-titulo");
  const descripcion = leerCampo("#input-descripcion");
  const prioridad = document.querySelector("#select-prioridad").value;

  if (!titulo || !descripcion) {
    alert("El título y la descripción son obligatorios.");
    return;
  }

  const nuevaTarea = { id: generarId(), titulo, descripcion, prioridad, estado: "pendiente" };
  tareas.push(nuevaTarea);

  const elemento = crearElementoTarea(nuevaTarea);
  tablero.appendChild(elemento);
  actualizarStats();
}
document.querySelector("#btn-agregar").addEventListener("click", agregarTarea);

function actualizarStats() {
  const conteos = tareas.reduce((acumulador, tarea) => {
    acumulador[tarea.estado] = (acumulador[tarea.estado] || 0) + 1;
    return acumulador;
  }, {});

  const partes = [];
  for (const estado of SECUENCIA_ESTADOS) {
    partes.push(`${conteos[estado] || 0} ${estado}`);
  }
  document.querySelector("#stats").textContent =
    `Tareas: ${partes.join(" · ")} (total ${tareas.length})`;
}
actualizarStats();

// ─── Decisión de diseño: actualización del DOM — Estrategia A (dirigida) ──
// Se eligió por eficiencia: solo se toca el nodo de la tarea que cambió,
// sin reconstruir el tablero completo en cada avance de estado.
function actualizarEstadoEnDOM(id, nuevoEstado) {
  const elementoTarea = tablero.querySelector(`[data-id="${id}"]`);
  if (!elementoTarea) return;

  SECUENCIA_ESTADOS.forEach(estado => elementoTarea.classList.remove(`estado-${estado}`));
  elementoTarea.classList.add(`estado-${nuevoEstado}`);

  const badgeEstado = elementoTarea.querySelector(".badge-estado");
  badgeEstado.textContent = nuevoEstado;

  if (nuevoEstado === "completada") {
    const btnAvanzar = elementoTarea.querySelector(".btn-avanzar");
    if (btnAvanzar) btnAvanzar.remove();
  }
}

tablero.addEventListener("click", (e) => {
  const boton = e.target.closest("button[data-action]");
  if (!boton) return;
  const id = Number(boton.dataset.id);

  if (boton.dataset.action === "eliminar") {
    tareas = tareas.filter(t => t.id !== id);
    boton.closest(".tarea").remove();
    actualizarStats();
    return;
  }

  if (boton.dataset.action === "avanzar") {
    const tarea = tareas.find(t => t.id === id);
    const indiceActual = SECUENCIA_ESTADOS.indexOf(tarea.estado);
    tarea.estado = SECUENCIA_ESTADOS[indiceActual + 1];
    actualizarEstadoEnDOM(id, tarea.estado);
    actualizarStats();
  }
});

const btnsFiltroEstado = document.querySelectorAll(".btn-filtro-estado");
btnsFiltroEstado.forEach(btn => {
  btn.addEventListener("click", () => {
    btnsFiltroEstado.forEach(b => b.classList.remove("activo"));
    btn.classList.add("activo");
    filtroEstado = btn.dataset.estado;
    aplicarFiltros();
  });
});

document.querySelector("#select-filtro-prioridad").addEventListener("change", (e) => {
  filtroPrioridad = e.target.value;
  aplicarFiltros();
});

function aplicarFiltros() {
  const todasLasTareas = tablero.querySelectorAll(".tarea");
  todasLasTareas.forEach(elementoTarea => {
    const id = Number(elementoTarea.dataset.id);
    const tarea = tareas.find(t => t.id === id);
    const coincideEstado = filtroEstado === "todas" || tarea.estado === filtroEstado;
    const coincidePrioridad = filtroPrioridad === "todas" || tarea.prioridad === filtroPrioridad;
    elementoTarea.classList.toggle("oculta", !(coincideEstado && coincidePrioridad));
  });
}