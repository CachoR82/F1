// script.js - Versión autónoma (no requiere Firebase)
const TORRE_NUMERO = "1920";
const SPREADSHEET_ID = "1e5xgFEk3IbOAaJ58z7vZR874JUqMkrN1BH19DW-2eLk"; // ¡Reemplázalo en el paso 3!

// Función para mostrar mensajes
function mostrarMensaje(texto, duracion = 2000) {
    const contenedor = document.getElementById("mensajeContenedor");
    const mensaje = document.createElement("div");
    mensaje.className = "mensaje";
    mensaje.textContent = texto;
    contenedor.appendChild(mensaje);

    setTimeout(() => {
        mensaje.classList.add("oculto");
        setTimeout(() => contenedor.removeChild(mensaje), 500);
    }, duracion);
}

// Función para conectar con Google Sheets
async function accederGoogleSheets(accion, datos = {}) {
    try {
        const url = `https://script.google.com/macros/s/${SPREADSHEET_ID}/exec`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...datos, action: accion })
        });
        return await response.json();
    } catch (error) {
        mostrarMensaje("Error de conexión: " + error.message, 3000);
        return { error: true };
    }
}

// Event Listeners (los mismos que ya tenías)
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("torreNumero").textContent = TORRE_NUMERO;
    
    // [Todos tus event listeners originales...]
    document.getElementById("botonBuscar").addEventListener("click", buscar);
});

// Funciones principales
async function buscar() {
    const piso = document.getElementById("piso").value.trim();
    const depto = document.getElementById("depto").value;
    const clave = document.getElementById("clave").value.trim();

    if (!piso || !clave) {
        mostrarMensaje("Piso y Password son obligatorios", 2000);
        return;
    }

    const respuesta = await accederGoogleSheets("buscar", {
        id: `${TORRE_NUMERO}_${piso}_${depto}`,
        clave: sha256(clave)
    });

    if (respuesta.error) return;

    document.getElementById("contenedorInferiorWrapper").classList.remove("hidden");
    document.getElementById("servicio").checked = respuesta.Servicio || false;
    document.getElementById("comentarios").value = respuesta.Comentarios || "";
}

async function guardar() {
    const piso = document.getElementById("piso").value.trim();
    const depto = document.getElementById("depto").value;
    const clave = document.getElementById("clave").value.trim();
    const servicio = document.getElementById("servicio").checked;
    const comentarios = servicio ? document.getElementById("comentarios").value : "";

    const respuesta = await accederGoogleSheets("guardar", {
        id: `${TORRE_NUMERO}_${piso}_${depto}`,
        Torre: TORRE_NUMERO,
        Piso: piso,
        Depto: depto,
        Servicio: servicio,
        Comentarios: comentarios,
        passCrypt: clave ? sha256(clave) : ""
    });

    if (!respuesta.error) {
        mostrarMensaje("Datos guardados", 2000);
        // [Resetear formulario como en tu versión original]
    }
}