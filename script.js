// ==========================================
// MÓDULO 1: CONFIGURACIÓN FIREBASE FIRESTORE & PIN
// ==========================================
// Usamos el mismo proyecto del club pero en el documento separado 'contabilidad'
const firebaseConfig = {
  apiKey: "AIzaSyC8TnUjhlyhz5VWlkdfiw57-xGX_1_8zcA",
  authDomain: "memorial-quini-elcano.firebaseapp.com",
  projectId: "memorial-quini-elcano",
  storageBucket: "memorial-quini-elcano.firebasestorage.app",
  messagingSenderId: "166426350048",
  appId: "1:166426350048:web:9d9af0e329454a60f3db85"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Mismo PIN de administrador oficial del torneo
const ADMIN_PIN = "1234";
let modoAdmin = false;
let fotoTicketBase64 = "";

const STORAGE_KEY = "club_elcano_contabilidad_v1";

// Datos base con los socios del Memorial Quini
const datosPorDefecto = {
  saldoInicial: 0.00,
  movimientos: [
    { id: 1, fecha: "2026-10-24", concepto: "Cuota mensual socios (4)", tipo: "ingreso", importe: 40.00, ticket: "" },
    { id: 2, fecha: "2026-10-20", concepto: "Caja de tizas verdes máster", tipo: "gasto", importe: 12.50, ticket: "" }
  ],
  socios: [
    { id: 1, nombre: "José Gonzalez", estado: "pagado" },
    { id: 2, nombre: "Juan Rguez", estado: "pendiente" },
    { id: 3, nombre: "Paco Madrigal", estado: "pagado" },
    { id: 4, nombre: "May", estado: "pagado" },
    { id: 5, nombre: "Quini Barbero", estado: "pendiente" },
    { id: 6, nombre: "Javier Santos", estado: "pagado" },
    { id: 7, nombre: "Javi Coco", estado: "pendiente" },
    { id: 8, nombre: "Tony Elena", estado: "pagado" },
    { id: 9, nombre: "Juan Costa", estado: "pendiente" },
    { id: 10, nombre: "Miguel Frade", estado: "pagado" },
    { id: 11, nombre: "Alfonso Santos", estado: "pendiente" },
    { id: 12, nombre: "Paco Vidal", estado: "pendiente" }
  ],
  votaciones: [
    {
      id: 1,
      titulo: "Renovación de paño Simonis 300",
      descripcion: "Presupuesto para cambiar el paño de la mesa principal antes de semifinales.",
      limite: "2026-11-15",
      favor: 8,
      contra: 1
    }
  ]
};

let appData = { ...datosPorDefecto };

// ==========================================
// MÓDULO 2: SINCRONIZACIÓN EN TIEMPO REAL (FIRESTORE)
// ==========================================
function initRealtimeSync() {
  db.collection("bote").doc("contabilidad")
    .onSnapshot((doc) => {
      if (doc.exists) {
        const cloudData = doc.data();
        appData.movimientos = cloudData.movimientos || [];
        appData.socios = cloudData.socios || datosPorDefecto.socios;
        appData.votaciones = cloudData.votaciones || [];
        appData.saldoInicial = cloudData.saldoInicial || 0;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        renderizarTodo();
      } else {
        // Primera vez: sube los datos iniciales a Firestore
        subirEstadoAFirebase();
      }
    }, (error) => {
      console.warn("Firestore offline, usando copia local:", error);
      cargarCopiaLocal();
    });
}

function subirEstadoAFirebase() {
  db.collection("bote").doc("contabilidad").set({
    saldoInicial: appData.saldoInicial,
    movimientos: appData.movimientos,
    socios: appData.socios,
    votaciones: appData.votaciones,
    updatedAt: new Date().toISOString()
  }).catch((err) => {
    console.error("Error al actualizar Firestore:", err);
  });
}

function cargarCopiaLocal() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    appData = JSON.parse(local);
  }
  renderizarTodo();
}

function renderizarTodo() {
  renderizarBote();
  renderizarGastos();
  renderizarSocios();
  renderizarVotaciones();
}

// Formateadores
function formatearEuro(cantidad) {
  return Number(cantidad).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaStr;
}

// ==========================================
// MÓDULO 3: NAVEGACIÓN ENTRE PESTAÑAS
// ==========================================
const TITULOS_SECCION = {
  bote: "Bote y Saldo Actual",
  gastos: "Gastos y Facturas",
  socios: "Socios y Cuotas",
  votaciones: "Propuestas y Votaciones"
};

function cambiarSeccion(seccionId, boton) {
  document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById('sec-' + seccionId).classList.add('activa');
  boton.classList.add('active');

  document.getElementById('headerSubtitulo').textContent = TITULOS_SECCION[seccionId] || "Contabilidad";
  window.scrollTo(0, 0);

  if (seccionId === 'bote') renderizarBote();
  if (seccionId === 'gastos') renderizarGastos();
  if (seccionId === 'socios') renderizarSocios();
  if (seccionId === 'votaciones') renderizarVotaciones();
  lucide.createIcons();
}

// ==========================================
// MÓDULO 4: SECCIÓN 1 - BOTE
// ==========================================
function renderizarBote() {
  const movs = appData.movimientos || [];
  let totalIngresos = 0, totalGastos = 0;

  movs.forEach(m => {
    if (m.tipo === 'ingreso') totalIngresos += Number(m.importe);
    if (m.tipo === 'gasto') totalGastos += Number(m.importe);
  });

  const saldoActual = (appData.saldoInicial || 0) + totalIngresos - totalGastos;

  document.getElementById('boteSaldoTotal').textContent = formatearEuro(saldoActual);
  document.getElementById('boteTotalIngresos').textContent = '+' + formatearEuro(totalIngresos);
  document.getElementById('boteTotalGastos').textContent = '-' + formatearEuro(totalGastos);
  document.getElementById('boteNumMovs').textContent = `(${movs.length})`;

  const listaUl = document.getElementById('listaMovimientosBote');
  listaUl.innerHTML = '';

  if (movs.length === 0) {
    listaUl.innerHTML = '<li style="text-align: center; color: rgba(203,213,225,0.6); padding: 16px;">No hay movimientos registrados.</li>';
    return;
  }

  movs.forEach(mov => {
    const li = document.createElement('li');
    li.className = 'item-movimiento';

    const esIngreso = mov.tipo === 'ingreso';
    const signo = esIngreso ? '+' : '-';
    const claseColor = esIngreso ? 'ingreso' : 'gasto';

    li.innerHTML = `
      <div style="flex:1;">
        <span class="mov-concepto">${mov.concepto}</span>
        <span class="mov-fecha">${formatearFecha(mov.fecha)}</span>
      </div>
      <div class="mov-importe ${claseColor} font-mono">${signo}${formatearEuro(mov.importe)}</div>
      <button class="btn-borrar-item" onclick="eliminarMovimiento(${mov.id})">Borrar</button>
    `;
    listaUl.appendChild(li);
  });
}

function eliminarMovimiento(id) {
  if (!modoAdmin) return;
  if (!confirm("¿Deseas eliminar este registro contable?")) return;

  appData.movimientos = appData.movimientos.filter(m => m.id !== id);
  subirEstadoAFirebase();
}

// ==========================================
// MÓDULO 5: SECCIÓN 2 - GASTOS Y TICKETS
// ==========================================
function renderizarGastos() {
  const gastos = (appData.movimientos || []).filter(m => m.tipo === 'gasto');
  document.getElementById('numGastosTotal').textContent = `(${gastos.length})`;
  const contenedor = document.getElementById('listaGastosDetalle');
  contenedor.innerHTML = '';

  if (gastos.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center; color:rgba(203,213,225,0.6); padding:16px;">No hay gastos con ticket.</p>';
    return;
  }

  gastos.forEach(g => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-gasto';

    const miniatura = g.ticket 
      ? `<div class="miniatura-ticket" onclick="abrirVisor('${g.ticket}')"><img src="${g.ticket}" alt="Ticket"></div>`
      : `<div class="miniatura-ticket" style="color:var(--gold-bright); font-size:22px;">🧾</div>`;

    tarjeta.innerHTML = `
      ${miniatura}
      <div style="flex:1;">
        <div style="font-weight:700; color:#fff;">${g.concepto}</div>
        <div style="font-size:13px; color:rgba(203,213,225,0.7);">${formatearFecha(g.fecha)} ${g.ticket ? '• <span style="color:var(--gold-bright); font-weight:700;">Ver ticket</span>' : ''}</div>
      </div>
      <div style="font-size:18px; font-weight:900; color:var(--rojo-gasto);" class="font-mono">-${formatearEuro(g.importe)}</div>
    `;
    contenedor.appendChild(tarjeta);
  });
}

function procesarFotoTicket(event) {
  const archivo = event.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxAncho = 750;
      const escala = maxAncho / img.width;
      canvas.width = (img.width > maxAncho) ? maxAncho : img.width;
      canvas.height = (img.width > maxAncho) ? (img.height * escala) : img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      fotoTicketBase64 = canvas.toDataURL('image/jpeg', 0.65);
      document.getElementById('imgPrevia').src = fotoTicketBase64;
      document.getElementById('vistaPreviaTicket').style.display = 'block';
    };
    img.src = e.target.result;
  };
  lector.readAsDataURL(archivo);
}

function quitarFotoTicket() {
  fotoTicketBase64 = "";
  document.getElementById('gastoFotoInput').value = "";
  document.getElementById('vistaPreviaTicket').style.display = 'none';
  document.getElementById('imgPrevia').src = "";
}

function guardarNuevoGasto(event) {
  event.preventDefault();
  if (!modoAdmin) {
    clickBotonAdmin();
    return;
  }

  const concepto = document.getElementById('gastoConcepto').value.trim();
  const importe = parseFloat(document.getElementById('gastoImporte').value);
  const fecha = document.getElementById('gastoFecha').value;

  if (!concepto || isNaN(importe) || importe <= 0 || !fecha) {
    alert("Completa concepto, importe y fecha.");
    return;
  }

  const nuevoGasto = {
    id: Date.now(),
    fecha: fecha,
    concepto: concepto,
    tipo: 'gasto',
    importe: importe,
    ticket: fotoTicketBase64
  };

  appData.movimientos.unshift(nuevoGasto);
  subirEstadoAFirebase();

  document.getElementById('gastoConcepto').value = '';
  document.getElementById('gastoImporte').value = '';
  quitarFotoTicket();
  establecerFechaHoy();
}

function abrirVisor(src) {
  if (!src) return;
  document.getElementById('imgVisorCompleta').src = src;
  document.getElementById('modalVisor').classList.add('activo');
}

function cerrarVisor() {
  document.getElementById('modalVisor').classList.remove('activo');
  document.getElementById('imgVisorCompleta').src = '';
}

function establecerFechaHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  const cFecha = document.getElementById('gastoFecha');
  if (cFecha) cFecha.value = hoy;
  const cLimite = document.getElementById('propuestaLimite');
  if (cLimite) cLimite.value = hoy;
}

// ==========================================
// MÓDULO 6: SECCIÓN 3 - SOCIOS Y CUOTAS
// ==========================================
function renderizarSocios() {
  const socios = appData.socios || [];
  const pagados = socios.filter(s => s.estado === 'pagado').length;
  const pendientes = socios.length - pagados;

  document.getElementById('numSociosPagados').textContent = pagados;
  document.getElementById('numSociosPendientes').textContent = pendientes;
  document.getElementById('totalSociosNum').textContent = `(${socios.length})`;

  const contenedor = document.getElementById('contenedorListaSocios');
  contenedor.innerHTML = '';

  socios.forEach(socio => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-socio';

    const esPagado = socio.estado === 'pagado';
    const textoEstado = esPagado ? '✅ Pagado' : '⏳ Pendiente';
    const claseEstado = esPagado ? 'pagado' : 'pendiente';
    const accion = modoAdmin ? `onclick="alternarEstadoSocio(${socio.id})"` : '';

    tarjeta.innerHTML = `
      <div class="socio-nombre">${socio.nombre}</div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="badge-estado ${claseEstado}" ${accion} title="${modoAdmin ? 'Toca para cambiar estado' : ''}">
          ${textoEstado}
        </button>
        <button class="btn-borrar-item" onclick="eliminarSocio(${socio.id})">Baja</button>
      </div>
    `;
    contenedor.appendChild(tarjeta);
  });
}

function alternarEstadoSocio(id) {
  if (!modoAdmin) return;
  const socio = appData.socios.find(s => s.id === id);
  if (socio) {
    socio.estado = (socio.estado === 'pagado') ? 'pendiente' : 'pagado';
    subirEstadoAFirebase();
  }
}

function agregarSocio(event) {
  event.preventDefault();
  if (!modoAdmin) {
    clickBotonAdmin();
    return;
  }

  const input = document.getElementById('nuevoSocioNombre');
  const nombre = input.value.trim();
  if (!nombre) return;

  appData.socios.push({
    id: Date.now(),
    nombre: nombre,
    estado: 'pendiente'
  });

  input.value = '';
  subirEstadoAFirebase();
}

function eliminarSocio(id) {
  if (!modoAdmin) return;
  const socio = appData.socios.find(s => s.id === id);
  if (!confirm(`¿Dar de baja a ${socio ? socio.nombre : 'este socio'}?`)) return;

  appData.socios = appData.socios.filter(s => s.id !== id);
  subirEstadoAFirebase();
}

function reiniciarCuotas() {
  if (!modoAdmin) return;
  if (!confirm("¿Deseas reiniciar todas las cuotas a 'Pendiente' para el nuevo mes?")) return;

  appData.socios.forEach(s => s.estado = 'pendiente');
  subirEstadoAFirebase();
}

// ==========================================
// MÓDULO 7: SECCIÓN 4 - PROPUESTAS Y VOTACIONES
// ==========================================
function renderizarVotaciones() {
  const votaciones = appData.votaciones || [];
  document.getElementById('numVotacionesTotal').textContent = `(${votaciones.length})`;
  const contenedor = document.getElementById('contenedorVotaciones');
  contenedor.innerHTML = '';

  if (votaciones.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center; color:rgba(203,213,225,0.6); padding:16px;">No hay propuestas activas.</p>';
    return;
  }

  votaciones.forEach(prop => {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-votacion';

    const favor = Number(prop.favor) || 0;
    const contra = Number(prop.contra) || 0;
    const total = favor + contra;
    const pctFavor = total > 0 ? Math.round((favor / total) * 100) : 50;

    const yaVoto = localStorage.getItem(`voto_propuesta_${prop.id}`);

    const textoLimite = prop.limite 
      ? `📅 Plazo: hasta el ${formatearFecha(prop.limite)}`
      : `⏳ Plazo: Pendiente de fijar por el Administrador`;

    const estiloLimite = prop.limite
      ? 'background: rgba(250, 204, 21, 0.15); color: var(--gold-bright); border: 1px solid rgba(250, 204, 21, 0.4);'
      : 'background: rgba(248, 113, 113, 0.15); color: var(--rojo-gasto); border: 1px solid rgba(248, 113, 113, 0.4);';

    tarjeta.innerHTML = `
      <div class="votacion-titulo">${prop.titulo}</div>
      <div class="votacion-desc">${prop.descripcion}</div>
      <div class="votacion-limite-tag" style="${estiloLimite}">${textoLimite}</div>

      <!-- Panel Admin para fijar/cambiar fecha -->
      <div class="admin-cambiar-fecha">
        <label style="font-size:12px; font-weight:700; color:var(--gold-bright); display:block; margin-bottom:4px;">Fijar plazo (Admin):</label>
        <div style="display:flex; gap:8px;">
          <input type="date" id="inputFecha_${prop.id}" value="${prop.limite || ''}" class="form-input font-mono" style="padding:6px;">
          <button type="button" class="btn-guardar-oro px-4" style="font-size:12px;" onclick="guardarFechaAdmin(${prop.id})">Guardar</button>
        </div>
      </div>

      <div class="barra-votos">
        <div class="barra-votos-favor" style="width: ${pctFavor}%;"></div>
      </div>
      
      <div class="votos-recuento">
        <span style="color: var(--verde-dinero);">A favor: ${favor} (${pctFavor}%)</span>
        <span style="color: var(--rojo-gasto);">En contra: ${contra} (${100 - pctFavor}%)</span>
      </div>

      <div class="grid-votar">
        <button class="btn-voto favor" onclick="emitirVoto(${prop.id}, 'favor')" ${yaVoto ? 'disabled' : ''}>
          👍 A favor
        </button>
        <button class="btn-voto contra" onclick="emitirVoto(${prop.id}, 'contra')" ${yaVoto ? 'disabled' : ''}>
          👎 En contra
        </button>
      </div>

      ${yaVoto ? '<div style="text-align:center; font-size:13px; font-weight:700; color:var(--gold-bright); margin-top:8px;">✅ Ya has emitido tu voto</div>' : ''}
      <button class="btn-borrar-item mt-3 w-full" style="padding:8px; width:100%;" onclick="eliminarPropuesta(${prop.id})">🗑️ Eliminar Propuesta</button>
    `;

    contenedor.appendChild(tarjeta);
  });
}

function emitirVoto(idPropuesta, sentido) {
  const claveVoto = `voto_propuesta_${idPropuesta}`;
  if (localStorage.getItem(claveVoto)) {
    alert("Ya has votado en esta propuesta.");
    return;
  }

  const prop = (appData.votaciones || []).find(v => v.id === idPropuesta);
  if (!prop) return;

  if (sentido === 'favor') prop.favor = (prop.favor || 0) + 1;
  if (sentido === 'contra') prop.contra = (prop.contra || 0) + 1;

  localStorage.setItem(claveVoto, sentido);
  subirEstadoAFirebase();
}

function crearPropuesta(event) {
  event.preventDefault();

  const titulo = document.getElementById('propuestaTitulo').value.trim();
  const desc = document.getElementById('propuestaDesc').value.trim();
  const inputLimite = document.getElementById('propuestaLimite');
  const limite = (modoAdmin && inputLimite && inputLimite.value) ? inputLimite.value : "";

  if (!titulo || !desc) {
    alert("Completa el título y la descripción.");
    return;
  }

  const nuevaProp = {
    id: Date.now(),
    titulo: titulo,
    descripcion: desc,
    limite: limite,
    favor: 0,
    contra: 0
  };

  if (!appData.votaciones) appData.votaciones = [];
  appData.votaciones.unshift(nuevaProp);
  subirEstadoAFirebase();

  document.getElementById('propuestaTitulo').value = '';
  document.getElementById('propuestaDesc').value = '';
}

function guardarFechaAdmin(idPropuesta) {
  if (!modoAdmin) return;
  const input = document.getElementById(`inputFecha_${idPropuesta}`);
  if (!input || !input.value) {
    alert("Selecciona una fecha válida.");
    return;
  }

  const prop = (appData.votaciones || []).find(v => v.id === idPropuesta);
  if (prop) {
    prop.limite = input.value;
    subirEstadoAFirebase();
  }
}

function eliminarPropuesta(id) {
  if (!modoAdmin) return;
  if (!confirm("¿Deseas eliminar esta propuesta?")) return;

  appData.votaciones = (appData.votaciones || []).filter(v => v.id !== id);
  localStorage.removeItem(`voto_propuesta_${id}`);
  subirEstadoAFirebase();
}

// ==========================================
// MÓDULO 8: CONTROL DE PIN Y ADMINISTRADOR
// ==========================================
function clickBotonAdmin() {
  if (modoAdmin) {
    modoAdmin = false;
    actualizarEstadoAdminUI();
  } else {
    document.getElementById('inputPinAdmin').value = '';
    document.getElementById('pinError').textContent = '';
    document.getElementById('modalPin').classList.add('activo');
    setTimeout(() => document.getElementById('inputPinAdmin').focus(), 150);
  }
}

function cerrarModalPin() {
  document.getElementById('modalPin').classList.remove('activo');
}

function verificarPinAdmin() {
  const input = document.getElementById('inputPinAdmin');
  if (input.value === ADMIN_PIN) {
    modoAdmin = true;
    cerrarModalPin();
    actualizarEstadoAdminUI();
  } else {
    document.getElementById('pinError').textContent = "PIN incorrecto. Inténtalo de nuevo.";
    input.value = "";
  }
}

function actualizarEstadoAdminUI() {
  const btn = document.getElementById('btnAdmin');
  const txt = document.getElementById('textAdmin');
  const icon = document.getElementById('iconAdmin');

  if (modoAdmin) {
    document.body.classList.add('admin-activo');
    btn.classList.add('admin-on');
    txt.textContent = "Admin ON";
    icon.setAttribute('data-lucide', 'lock-open');
  } else {
    document.body.classList.remove('admin-activo');
    btn.classList.remove('admin-on');
    txt.textContent = "Acceso PIN";
    icon.setAttribute('data-lucide', 'lock');
  }
  lucide.createIcons();
  renderizarTodo();
}

// ==========================================
// MÓDULO 9: INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  establecerFechaHoy();
  cargarCopiaLocal();
  initRealtimeSync();
  lucide.createIcons();
});