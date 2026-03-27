import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPA_URL = "https://chrwixhpvgokojohhlhd.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocndpeGhwdmdva29qb2hobGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzUzMDMsImV4cCI6MjA4ODY1MTMwM30.OJdLg4d6lmo3erITLrnL1yoCm1KlovQ4E435TyD76ak";
const sb = createClient(SUPA_URL, SUPA_KEY);

// ─── DB HELPERS ───────────────────────────────────────────────────────────────
// Convierte snake_case de Supabase a camelCase que usa la app
const mapPedido = r => r ? ({
  nro: r.nro || null,
  id: r.id, clienteId: r.cliente_id, servicio: r.servicio, maquina: r.maquina,
  sucursal: r.sucursal, fechaIngreso: r.fecha_ingreso, horaIngreso: r.hora_ingreso,
  fechaEstRetiro: r.fecha_est_retiro, estado: r.estado, progreso: r.progreso || 0,
  estadoPago: r.estado_pago, metodoPago: r.metodo_pago, monto: r.monto, obs: r.obs,
  ubicacionCanasto: r.ubicacion_canasto || "",
  horaInicio: r.hora_inicio || null,
}) : null;

// Helper: devuelve el label visible — "N° 42" si tiene nro, sino el id corto
const nroPedido = (p) => p?.nro ? `N° ${p.nro}` : (p?.id ? p.id.slice(-6) : "—");

const mapCliente = r => r ? ({
  id: r.id, nombre: r.nombre, tel: r.tel, email: r.email,
  dni: r.dni, dir: r.dir, sucursal: r.sucursal, notas: r.notas,
}) : null;

const mapPago = r => r ? ({
  id: r.id, pedido: r.pedido_id, clienteId: r.cliente_id,
  monto: r.monto, metodo: r.metodo, hora: r.hora,
  sucursal: r.sucursal, fecha: r.fecha,
}) : null;

const mapUsuario = r => r ? ({
  id: r.id, nombre: r.nombre, email: r.email, password: r.password,
  rol: r.rol, sucursal: r.sucursal,
  orgId: r.org_id || null,
  avatar: r.avatar || (r.rol === "superadmin" ? "🛡️" : r.rol === "dueno" ? "👑" : "👤"),
  activo: r.activo,
}) : null;

const mapTracking = r => r ? ({
  id: r.id, pedidoId: r.pedido_id, estadoAnterior: r.estado_anterior,
  estadoNuevo: r.estado_nuevo, maquina: r.maquina,
  usuarioNombre: r.usuario_nombre, hora: r.hora, nota: r.nota,
}) : null;

const mapUbicacion = r => r ? ({
  id: r.id, nombre: r.nombre, descripcion: r.descripcion,
  sucursal: r.sucursal, activo: r.activo,
}) : null;

const mapServicio = r => r ? ({
  id: r.id, nombre: r.nombre, precio: Number(r.precio), duracion: Number(r.duracion),
  icon: r.icon || "🧺", color: r.color || "#00d4ff", activo: r.activo !== false,
}) : null;

const mapMaquina = r => r ? ({
  id: r.id, sucursal: r.sucursal, tipo: r.tipo, capacidad: r.capacidad || "",
  estado: r.estado || "Disponible", activa: r.activa !== false,
}) : null;

const mapSucursal = r => r ? ({
  id: r.id, nombre: r.nombre, direccion: r.direccion || "", ciudad: r.ciudad || "",
  tel: r.tel || "", mpAlias: r.mp_alias || "", activa: r.activa !== false,
  lvTurno1Desde: r.lv_turno1_desde || "09:00", lvTurno1Hasta: r.lv_turno1_hasta || "20:00",
  lvTurno2Desde: r.lv_turno2_desde || "", lvTurno2Hasta: r.lv_turno2_hasta || "",
  lvHorarioCorrido: r.lv_horario_corrido !== false,
  sabAbre: r.sab_abre !== false,
  sabTurno1Desde: r.sab_turno1_desde || "09:00", sabTurno1Hasta: r.sab_turno1_hasta || "13:00",
  sabTurno2Desde: r.sab_turno2_desde || "", sabTurno2Hasta: r.sab_turno2_hasta || "",
  sabHorarioCorrido: r.sab_horario_corrido !== false,
  domAbre: r.dom_abre === true,
}) : null;

// Convierte array [{clave,valor}] a objeto plano
const mapCfg = (rows) => {
  const obj = {};
  (rows || []).forEach(r => { obj[r.clave] = r.valor; });
  return {
    empresa:        obj.empresa        || "LawaWash Argentina",
    icono:          obj.icono          || "🫧",
    slogan:         obj.slogan         || "Gestión Integral · Argentina",
    moneda:         obj.moneda         || "ARS",
    mpToken:        obj.mp_token       || "",
    waNumero:       obj.wa_numero      || "",
    waNotifPedido:  obj.wa_notif_pedido === "true",
    waReporte:      obj.wa_reporte     === "true",
    waFrecuencia:   obj.wa_frecuencia  || "diario",
    waHora:         obj.wa_hora        || "21:00",
    smtpHost:       obj.smtp_host      || "smtp.gmail.com",
    smtpPort:       obj.smtp_port      || "587",
    smtpUser:       obj.smtp_user      || "",
    smtpPass:       obj.smtp_pass      || "",
    smtpFrom:       obj.smtp_from      || "",
    emailDueno:     obj.email_dueno    || "",
    emailNotifPedido: obj.email_notif  === "true",
    emailReporte:   obj.email_reporte  === "true",
    emailFrecuencia: obj.email_frecuencia || "diario",
    emailHora:      obj.email_hora     || "21:00",
  };
};

// ─── USUARIOS ────────────────────────────────────────────────────────────────
const USUARIOS_INIT = [
  { id: 1, nombre: "Carlos Mendez", email: "dueno@lavawash.com", password: "dueno123", rol: "dueno", sucursal: null, avatar: "👑", activo: true },
  { id: 2, nombre: "Ana López", email: "palermo@lavawash.com", password: "emp123", rol: "empleado", sucursal: 1, avatar: "👤", activo: true },
  { id: 3, nombre: "Roberto Silva", email: "belgrano@lavawash.com", password: "emp123", rol: "empleado", sucursal: 2, avatar: "👤", activo: true },
  { id: 4, nombre: "María García", email: "laplata@lavawash.com", password: "emp123", rol: "empleado", sucursal: 3, avatar: "👤", activo: true },
];

// ─── EXCEL EXPORT (client-side via SheetJS) ───────────────────────────────────
const exportarCajaExcel = (pagos, pedidos, clientes, sucursalFiltro) => {
  const XLSX = window.XLSX;
  if (!XLSX) { alert("Error: librería Excel no disponible"); return; }

  const SERV_NAMES = { lav:"Lavado Simple", sec:"Secado", lavysec:"Lavado+Secado", plan:"Planchado", tint:"Tintorería" };
  const MET_NAMES  = { efectivo:"Efectivo", mp_qr:"MP QR", mp_link:"MP Link", transferencia:"Transferencia" };
  const suc_map    = Object.fromEntries(SUCURSALES.map(s => [s.id, s.nombre]));
  const cli_map    = Object.fromEntries(clientes.map(c => [c.id, c.nombre]));

  const filtPagos  = sucursalFiltro === 0 ? pagos  : pagos.filter(p  => p.sucursal === sucursalFiltro);
  const filtPedidos= sucursalFiltro === 0 ? pedidos: pedidos.filter(p => p.sucursal === sucursalFiltro);

  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Resumen ──────────────────────────────────────────────────────
  const total = filtPagos.reduce((a,p)=>a+p.monto,0);
  const porMetodo = filtPagos.reduce((acc,p)=>{acc[p.metodo]=(acc[p.metodo]||0)+p.monto;return acc;},{});
  const resumen = [
    ["LAVAWASH ARGENTINA — CAJA DEL DÍA", "", "", ""],
    [`Fecha: ${hoy}  |  Exportado: ${new Date().toLocaleString("es-AR")}`, "", "", ""],
    [],
    ["RESUMEN GENERAL", "", "", ""],
    ["Recaudación total", `$ ${total.toLocaleString("es-AR")}`, "", ""],
    ["Transacciones", filtPagos.length, "", ""],
    ["Pedidos activos", filtPedidos.filter(p=>p.estado!=="Entregado").length, "", ""],
    ["Pendiente de cobro", `$ ${filtPedidos.filter(p=>p.estadoPago!=="pagado"&&p.estado!=="Entregado").reduce((a,p)=>a+p.monto,0).toLocaleString("es-AR")}`, "", ""],
    [],
    ["POR MÉTODO DE PAGO", "", "", ""],
    ["Método", "Transacciones", "Total ($)", "% del total"],
    ...Object.entries(porMetodo).map(([m,v])=>[
      MET_NAMES[m]||m,
      filtPagos.filter(p=>p.metodo===m).length,
      v,
      `${((v/total)*100).toFixed(1)}%`
    ]),
    [],
    ["POR SUCURSAL", "", "", ""],
    ["Sucursal", "Ciudad", "Transacciones", "Total ($)"],
    ...SUCURSALES.filter(s => sucursalFiltro===0 || s.id===sucursalFiltro).map(s=>{
      const sp = pagos.filter(p=>p.sucursal===s.id);
      return [s.nombre, s.ciudad, sp.length, sp.reduce((a,p)=>a+p.monto,0)];
    }),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resumen);
  ws1["!cols"] = [{wch:30},{wch:20},{wch:18},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

  // ── Hoja 2: Transacciones ─────────────────────────────────────────────────
  const txRows = [
    ["ID Pago","ID Pedido","Cliente","Sucursal","Servicio","Método","Monto ($)","Hora","Fecha"],
    ...filtPagos.map(p=>{
      const ped = pedidos.find(x=>x.id===p.pedido)||{};
      return [p.id, p.pedido, cli_map[p.clienteId]||"—", suc_map[p.sucursal]||"—",
              SERV_NAMES[ped.servicio]||ped.servicio||"—", MET_NAMES[p.metodo]||p.metodo,
              p.monto, p.hora, p.fecha||hoy];
    }),
    ["","","","","","TOTAL", filtPagos.reduce((a,p)=>a+p.monto,0),"",""],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(txRows);
  ws2["!cols"] = [{wch:12},{wch:10},{wch:22},{wch:14},{wch:16},{wch:16},{wch:14},{wch:10},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws2, "Transacciones");

  // ── Hoja 3: Pedidos ───────────────────────────────────────────────────────
  const pedRows = [
    ["ID","Cliente","Sucursal","Servicio","Ingreso","Hora","Retiro Est.","Estado","Pago","Método","Monto ($)","Obs."],
    ...filtPedidos.map(p=>[
      p.id, cli_map[p.clienteId]||"—", suc_map[p.sucursal]||"—",
      SERV_NAMES[p.servicio]||p.servicio, p.fechaIngreso, p.horaIngreso,
      p.fechaEstRetiro, p.estado,
      p.estadoPago==="pagado"?"Pagado":"Al retirar",
      MET_NAMES[p.metodoPago]||p.metodoPago||"—",
      p.monto, p.obs||""
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(pedRows);
  ws3["!cols"] = [{wch:10},{wch:22},{wch:14},{wch:16},{wch:12},{wch:8},{wch:12},{wch:12},{wch:12},{wch:16},{wch:12},{wch:20}];
  XLSX.utils.book_append_sheet(wb, ws3, "Pedidos");

  const fecha_archivo = new Date().toLocaleDateString("es-AR").replace(/\//g,"-");
  XLSX.writeFile(wb, `LawaWash_Caja_${fecha_archivo}.xlsx`);
};

// ─── DATOS ───────────────────────────────────────────────────────────────────
// Fallback: se reemplaza en runtime con datos de Supabase
let SUCURSALES = [
  { id: 1, nombre: "Palermo",  direccion: "Av. Santa Fe 3421",  ciudad: "CABA",     tel: "011-4823-1100", mpAlias: "lavawash.palermo",
    lvTurno1Desde:"09:00", lvTurno1Hasta:"13:00", lvTurno2Desde:"14:00", lvTurno2Hasta:"20:00", lvHorarioCorrido:false,
    sabAbre:true,  sabTurno1Desde:"09:00", sabTurno1Hasta:"13:00", sabTurno2Desde:"", sabTurno2Hasta:"", sabHorarioCorrido:true,
    domAbre:false, activa:true },
  { id: 2, nombre: "Belgrano", direccion: "Juramento 1540",     ciudad: "CABA",     tel: "011-4781-2200", mpAlias: "lavawash.belgrano",
    lvTurno1Desde:"09:00", lvTurno1Hasta:"20:00", lvTurno2Desde:"", lvTurno2Hasta:"", lvHorarioCorrido:true,
    sabAbre:true,  sabTurno1Desde:"09:00", sabTurno1Hasta:"14:00", sabTurno2Desde:"", sabTurno2Hasta:"", sabHorarioCorrido:true,
    domAbre:false, activa:true },
  { id: 3, nombre: "La Plata", direccion: "Diagonal 73 Nº 820", ciudad: "La Plata", tel: "0221-423-3300", mpAlias: "lavawash.laplata",
    lvTurno1Desde:"08:00", lvTurno1Hasta:"12:00", lvTurno2Desde:"13:00", lvTurno2Hasta:"19:00", lvHorarioCorrido:false,
    sabAbre:true,  sabTurno1Desde:"09:00", sabTurno1Hasta:"13:00", sabTurno2Desde:"", sabTurno2Hasta:"", sabHorarioCorrido:true,
    domAbre:false, activa:true },
  { id: 4, nombre: "Quilmes",  direccion: "Rivadavia 598",      ciudad: "Quilmes",  tel: "011-4253-4400", mpAlias: "lavawash.quilmes",
    lvTurno1Desde:"09:00", lvTurno1Hasta:"18:00", lvTurno2Desde:"", lvTurno2Hasta:"", lvHorarioCorrido:true,
    sabAbre:false, sabTurno1Desde:"", sabTurno1Hasta:"", sabTurno2Desde:"", sabTurno2Hasta:"", sabHorarioCorrido:false,
    domAbre:false, activa:true },
];

// Fallback — se reemplaza con datos de Supabase al cargar
let SERVICIOS = [
  { id: "lav",    nombre: "Lavado Simple",   precio: 4500, duracion: 45,  icon: "🫧", color: "#00d4ff" },
  { id: "sec",    nombre: "Secado",           precio: 3200, duracion: 30,  icon: "💨", color: "#ff6b35" },
  { id: "lavysec",nombre: "Lavado + Secado",  precio: 6800, duracion: 75,  icon: "✨", color: "#a78bfa" },
  { id: "plan",   nombre: "Planchado",        precio: 5500, duracion: 60,  icon: "👔", color: "#34d399" },
  { id: "tint",   nombre: "Tintorería",       precio: 9200, duracion: 120, icon: "🧥", color: "#fbbf24" },
];

const METODOS_PAGO = [
  { id: "efectivo", label: "💵 Efectivo", color: "#34d399" },
  { id: "mp_qr", label: "🔳 MP QR", color: "#009ee3" },
  { id: "mp_link", label: "🔗 MP Link", color: "#009ee3" },
  { id: "transferencia", label: "🏦 Transferencia", color: "#a78bfa" },
];

// Fallback — se reemplaza con datos de Supabase al cargar
let MAQUINAS_DB = []; // lista completa [{id, sucursal, tipo, capacidad, estado, activa}]

const EST_MAQ = ["Disponible", "En uso", "Mantenimiento", "Fuera de servicio"];
const EST_MAQ_COL = { "Disponible": "#34d399", "En uso": "#fbbf24", "Mantenimiento": "#60a5fa", "Fuera de servicio": "#f87171" };
const EST_PED_COL = { Pendiente: "#60a5fa", "En uso": "#fbbf24", Listo: "#34d399", Entregado: "#555" };
// UI label: "En uso" en DB se muestra como "En proceso" al usuario
const labelEstado = (e) => e === "En uso" ? "En proceso" : e;

const CLIENTES_INIT = [
  { id: "C-001", nombre: "María González", tel: "5491134218800", email: "maria@mail.com", dni: "28.345.678", dir: "Av. Corrientes 1234", sucursal: 1, notas: "Alérgica a detergente fuerte" },
  { id: "C-002", nombre: "Carlos Ruiz", tel: "5491155672201", email: "carlos@mail.com", dni: "31.456.789", dir: "Thames 890", sucursal: 1, notas: "" },
  { id: "C-003", nombre: "Ana Martínez", tel: "5491178234490", email: "ana@mail.com", dni: "25.234.567", dir: "Cabildo 450", sucursal: 2, notas: "Solo planchado suave" },
  { id: "C-004", nombre: "Luis Fernández", tel: "5492214321122", email: "", dni: "33.567.890", dir: "Diagonal 73 Nro 100", sucursal: 3, notas: "" },
];

const addDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("es-AR");
};

const PEDIDOS_INIT = [
  { id: "P-001", clienteId: "C-001", servicio: "lavysec", maquina: "1-M02", sucursal: 1, fechaIngreso: new Date().toLocaleDateString("es-AR"), horaIngreso: "09:15", fechaEstRetiro: addDias(1), estado: "En uso", progreso: 65, metodoPago: "mp_qr", estadoPago: "pagado", monto: 6800, obs: "" },
  { id: "P-002", clienteId: "C-002", servicio: "lav", maquina: "1-M01", sucursal: 1, fechaIngreso: new Date().toLocaleDateString("es-AR"), horaIngreso: "10:00", fechaEstRetiro: addDias(0), estado: "En uso", progreso: 30, metodoPago: null, estadoPago: "al_retirar", monto: 4500, obs: "" },
  { id: "P-003", clienteId: "C-003", servicio: "plan", maquina: "2-M05", sucursal: 2, fechaIngreso: new Date().toLocaleDateString("es-AR"), horaIngreso: "08:30", fechaEstRetiro: addDias(0), estado: "Listo", progreso: 100, metodoPago: "efectivo", estadoPago: "pagado", monto: 5500, obs: "Traje de gala" },
  { id: "P-004", clienteId: "C-004", servicio: "tint", maquina: "3-M02", sucursal: 3, fechaIngreso: new Date().toLocaleDateString("es-AR"), horaIngreso: "11:00", fechaEstRetiro: addDias(2), estado: "Pendiente", progreso: 0, metodoPago: null, estadoPago: "al_retirar", monto: 9200, obs: "" },
];

const PAGOS_INIT = [
  { id: "PAG-001", pedido: "P-003", clienteId: "C-003", monto: 5500, metodo: "efectivo", hora: "09:31", sucursal: 2, fecha: new Date().toLocaleDateString("es-AR") },
];

// Genera IDs únicos basados en timestamp para evitar colisiones en Supabase
const genId = (p) => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2,5).toUpperCase();
  return `${p}-${ts}${rand}`;
};
const fmt = (n) => `$${Number(n).toLocaleString("es-AR")}`;
const hoy = new Date().toLocaleDateString("es-AR");
const APP_VERSION = "v1.004";

// Normaliza fecha en formato DD/MM/AAAA o D/M/AAAA para comparar — elimina ceros a la izquierda
const normFecha = (f) => {
  if (!f) return "";
  return f.trim().split("/").map((p, i) => i < 2 ? String(parseInt(p, 10)) : p).join("/");
};
const horaActual = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Convierte "HH:MM" a minutos totales desde medianoche
const horaAMin = (h) => {
  if (!h) return null;
  const s = String(h).trim();
  // Detectar formato 12hs: "05:03 p. m." o "5:03 PM" o "5:03 p.m."
  const match12 = s.match(/(\d{1,2}):(\d{2})\s*([ap]\.?\s*m\.?)/i);
  if (match12) {
    let hh = parseInt(match12[1], 10);
    const mm = parseInt(match12[2], 10);
    const periodo = match12[3].replace(/[\s.]/g, "").toLowerCase();
    if (periodo === "am" && hh === 12) hh = 0;
    if (periodo === "pm" && hh !== 12) hh += 12;
    if (isNaN(hh) || isNaN(mm)) return null;
    return hh * 60 + mm;
  }
  // Formato 24hs: "HH:MM" o "H:MM"
  const parts = s.replace(/[^0-9:]/g, "").split(":");
  if (parts.length < 2) return null;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
};
// Convierte minutos totales a "HH:MM"
const minAHora = (totalMin) => {
  if (totalMin === null || totalMin === undefined || isNaN(totalMin)) return "--:--";
  const t = ((totalMin % 1440) + 1440) % 1440;
  const hh = Math.floor(t / 60);
  const mm = t % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

// Calcula datos de timer en tiempo real para un pedido "En uso"
// Retorna: { pct, restanteMins, vencido, horaFinEst, horaInicioStr }
const calcTimer = (pedido, servicio, ahoraMs) => {
  const horaStr = pedido?.horaInicio || pedido?.horaIngreso;
  if (!horaStr || !servicio) return null;
  const duracion = Number(servicio.duracion) || 45;
  const inicioMin = horaAMin(horaStr);
  if (inicioMin === null) return null;
  const ahora = ahoraMs || Date.now();
  const ahoraDate = new Date(ahora);
  const inicioMs = new Date(ahora);
  inicioMs.setHours(Math.floor(inicioMin / 60), inicioMin % 60, 0, 0);
  // Si la hora de inicio es "en el futuro" del mismo día, asumimos que fue ayer
  if (inicioMs > ahoraDate) inicioMs.setDate(inicioMs.getDate() - 1);
  const finMs = new Date(inicioMs.getTime() + duracion * 60000);
  const transcurridoMs = ahora - inicioMs.getTime();
  const pct = Math.min(100, Math.max(0, Math.round((transcurridoMs / (duracion * 60000)) * 100)));
  const restanteMins = Math.round((finMs.getTime() - ahora) / 60000);
  const horaFinEst = minAHora(inicioMin + duracion);
  return { pct, restanteMins, vencido: restanteMins < 0, horaFinEst, horaInicioStr: horaStr };
};

// ─── HELPERS MULTI-SERVICIO ──────────────────────────────────────────────────
// Los servicios múltiples se guardan en obs con un prefijo JSON:
// "__SRVS__:[{srvId,maquina},...]\n" + obs real del usuario
const SRVS_PREFIX = "__SRVS__:";
const encodeSrvs = (items, obsTexto) => {
  if (!items || items.length === 0) return obsTexto || "";
  return `${SRVS_PREFIX}${JSON.stringify(items)}\n${obsTexto || ""}`;
};
const decodeSrvs = (obs, srvPrincipal, maqPrincipal) => {
  if (!obs) return { items: srvPrincipal ? [{ srvId: srvPrincipal, maquina: maqPrincipal || "" }] : [], obsTexto: "" };
  if (obs.startsWith(SRVS_PREFIX)) {
    const nl = obs.indexOf("\n");
    try {
      const items = JSON.parse(obs.slice(SRVS_PREFIX.length, nl === -1 ? undefined : nl));
      const obsTexto = nl === -1 ? "" : obs.slice(nl + 1);
      return { items, obsTexto };
    } catch { /* fallthrough */ }
  }
  return { items: srvPrincipal ? [{ srvId: srvPrincipal, maquina: maqPrincipal || "" }] : [], obsTexto: obs };
};
const servsLabel = (p) => {
  const { items } = decodeSrvs(p.obs, p.servicio, p.maquina);
  return items.map(it => {
    const s = SERVICIOS.find(x => x.id === it.srvId);
    return s ? `${s.icon} ${s.nombre}` : it.srvId;
  }).join(" + ") || "—";
};
const servsTotal = (p) => {
  const { items } = decodeSrvs(p.obs, p.servicio, p.maquina);
  if (items.length === 0) return p.monto;
  return items.reduce((acc, it) => {
    const s = SERVICIOS.find(x => x.id === it.srvId);
    return acc + (s?.precio || 0);
  }, 0);
};

// ─── ESTILOS ─────────────────────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f0f2f8; color: #1a1d2e; font-family: 'Outfit', sans-serif; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #e2e5ef; }
  ::-webkit-scrollbar-thumb { background: #b0b8d0; border-radius: 4px; }
  input, select, textarea, button { font-family: 'Outfit', sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes ping { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @media (max-width: 640px) {
    .rsp-grid2 { grid-template-columns: 1fr !important; }
    .rsp-hide  { display: none !important; }
    .rsp-pad   { padding: 14px !important; }
    .rsp-fcol  { flex-direction: column !important; }
    .rsp-full  { width: 100% !important; }
    .rsp-wrap  { flex-wrap: wrap !important; }
  }
`;

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Card = ({ children, style, glow }) => (
  <div style={{ background: "#ffffff", border: `1px solid ${glow ? glow + "55" : "#e2e5ef"}`, borderRadius: 18, padding: 22, boxShadow: glow ? `0 4px 20px ${glow}22` : "0 1px 6px #1a1d2e0d", animation: "slideIn .3s ease", ...style }}>{children}</div>
);

const Tag = ({ text, color = "#00d4ff" }) => (
  <span style={{ background: color + "18", color, border: `1px solid ${color}40`, padding: "3px 11px", borderRadius: 99, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", display: "inline-block" }}>{text}</span>
);

const Dot = ({ color, pulse }) => (
  <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10, flexShrink: 0 }}>
    {pulse && <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color, animation: "ping 1.4s ease infinite" }} />}
    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 6px ${color}` }} />
  </span>
);

const Bar = ({ val, color = "#00d4ff", h = 6 }) => (
  <div style={{ background: "#e8eaf2", borderRadius: 99, height: h, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(val, 100)}%`, height: "100%", background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: 99, transition: "width .5s ease" }} />
  </div>
);

const Inp = ({ label, ...p }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <span style={{ color: "#6b7280", fontSize: 12, letterSpacing: .5 }}>{label}</span>}
    <input {...p} style={{ background: "#f8f9fc", border: "1px solid #d0d5e8", borderRadius: 10, color: "#1a1d2e", padding: "9px 13px", fontSize: 14, outline: "none", transition: "border .2s", ...p.style }}
      onFocus={e => e.target.style.borderColor = "#0ea5e9"}
      onBlur={e => e.target.style.borderColor = "#d0d5e8"} />
  </label>
);

const Sel = ({ label, children, ...p }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <span style={{ color: "#6b7280", fontSize: 12, letterSpacing: .5 }}>{label}</span>}
    <select {...p} style={{ background: "#f8f9fc", border: "1px solid #d0d5e8", borderRadius: 10, color: "#1a1d2e", padding: "9px 13px", fontSize: 14, outline: "none", cursor: "pointer", ...p.style }}>{children}</select>
  </label>
);

const Textarea = ({ label, ...p }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    {label && <span style={{ color: "#6b7280", fontSize: 12, letterSpacing: .5 }}>{label}</span>}
    <textarea {...p} style={{ background: "#f8f9fc", border: "1px solid #d0d5e8", borderRadius: 10, color: "#1a1d2e", padding: "9px 13px", fontSize: 14, outline: "none", resize: "vertical", minHeight: 70, ...p.style }}
      onFocus={e => e.target.style.borderColor = "#0ea5e9"}
      onBlur={e => e.target.style.borderColor = "#d0d5e8"} />
  </label>
);

const Btn = ({ children, v = "pri", onClick, style, disabled, full }) => {
  const vars = {
    pri: { background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff", fontWeight: 600 },
    suc: { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 600 },
    war: { background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 600 },
    dan: { background: "linear-gradient(135deg,#f87171,#dc2626)", color: "#fff", fontWeight: 600 },
    gho: { background: "#ffffff", color: "#374151", border: "1px solid #d0d5e8", fontWeight: 500 },
    mp:  { background: "linear-gradient(135deg,#009ee3,#0070c0)", color: "#fff", fontWeight: 700 },
    wa:  { background: "linear-gradient(135deg,#25d366,#128c7e)", color: "#fff", fontWeight: 700 },
    rol: { background: "linear-gradient(135deg,#a78bfa,#7c3aed)", color: "#fff", fontWeight: 600 },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...vars[v], borderRadius: 10, padding: "9px 18px", fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", border: vars[v].border || "none", opacity: disabled ? .5 : 1, transition: "transform .12s, opacity .2s", width: full ? "100%" : "auto", ...style }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(.96)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}>{children}</button>
  );
};

const Modal = ({ open, onClose, title, children, color = "#00d4ff", wide }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn .2s ease" }} onClick={onClose}>
      <div style={{ background: "#ffffff", border: `1px solid ${color}44`, borderRadius: 20, padding: 28, maxWidth: wide ? 680 : 500, width: "100%", animation: "slideIn .25s ease", boxShadow: `0 8px 40px #1a1d2e22`, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 800, color }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── LOGIN (Supabase) ─────────────────────────────────────────────────────────
const LoginDB = ({ onLogin, loading, cfgLogin }) => {
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [err, setErr]           = useState("");
  const [trying, setTrying]     = useState(false);
  const [showPassLogin, setShowPassLogin] = useState(false);
  const empresaNombre = cfgLogin?.empresa || "LAVAWASH";
  const empresaIcono  = cfgLogin?.icono   || "🫧";
  const empresaSlogan = cfgLogin?.slogan  || "GESTIÓN INTEGRAL · ARGENTINA";

  const intentar = async () => {
    if (!email || !pass) { setErr("Completá email y contraseña"); return; }
    setTrying(true); setErr("");
    const ok = await onLogin(email.trim().toLowerCase(), pass);
    setTrying(false);
    if (!ok) setErr("Email o contraseña incorrectos, o usuario inactivo");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#e8edf8 0%,#f0f2f8 60%,#e2e8f5 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#0ea5e9,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px" }}>{empresaIcono}</div>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 32, letterSpacing: 3, color: "#0ea5e9" }}>{empresaNombre.toUpperCase()}</div>
          <div style={{ color: "#9ca3af", fontSize: 13, letterSpacing: 2, marginTop: 4 }}>{empresaSlogan.toUpperCase()}</div>
        </div>
        <Card glow="#0ea5e9">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, marginBottom: 22, color: "#1a1d2e" }}>Iniciar sesión</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@lavawash.com" />
            <label style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <span style={{ color:"#6b7280", fontSize:12, letterSpacing:.5 }}>Contraseña</span>
              <div style={{ position:"relative" }}>
                <input type={showPassLogin ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key === "Enter" && intentar()}
                  style={{ background:"#f8f9fc", border:"1px solid #d0d5e8", borderRadius:10, color:"#1a1d2e",
                    padding:"9px 40px 9px 13px", fontSize:14, outline:"none", width:"100%", transition:"border .2s" }}
                  onFocus={e => e.target.style.borderColor="#0ea5e9"}
                  onBlur={e => e.target.style.borderColor="#d0d5e8"} />
                <button type="button" onClick={() => setShowPassLogin(p => !p)}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#9ca3af", padding:0 }}>
                  {showPassLogin ? "🙈" : "👁"}
                </button>
              </div>
            </label>
            {err && <div style={{ color: "#f87171", fontSize: 13, background: "#fef2f2", border: "1px solid #f8717133", borderRadius: 8, padding: "8px 12px" }}>⚠ {err}</div>}
            <Btn full v="pri" onClick={intentar} disabled={trying || loading} style={{ marginTop: 6, padding: 12, fontSize: 15 }}>
              {trying || loading ? "⏳ Verificando..." : "Ingresar"}
            </Btn>
          </div>
          <div style={{ marginTop: 18, color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
            Los usuarios se gestionan desde el panel del supervisor (sección Usuarios 🔑)
          </div>
        </Card>
        <div style={{ textAlign: "center", marginTop: 16, color: "#b0b8d0", fontSize: 11, letterSpacing: 1 }}>
          {APP_VERSION}
        </div>
      </div>
    </div>
  );
};

// ─── MENSAJES WA / EMAIL ─────────────────────────────────────────────────────
const buildWAComprobante = (pedido, cliente, srv, suc, cfg) => {
  const empresa = cfg?.empresa || "LawaWash";
  const icono   = cfg?.icono   || "🫧";
  const metLabel = METODOS_PAGO.find(m => m.id === pedido.metodoPago)?.label || "";
  const pagoEst  = pedido.estadoPago === "pagado"
    ? `✅ *PAGADO*${metLabel ? " · " + metLabel : ""}`
    : "⏳ *Paga al retirar*";
  const { items: srvItems, obsTexto } = decodeSrvs(pedido.obs, pedido.servicio, pedido.maquina);
  const srvsLineas = srvItems.map(it => {
    const s = SERVICIOS.find(x => x.id === it.srvId);
    return `   ${s?.icon || ""} ${s?.nombre || it.srvId}`;
  }).join("\n");
  return `${icono} *${empresa} — Recepción de ropa*
━━━━━━━━━━━━━━━━━━━━━━
Hola *${cliente.nombre.split(" ")[0]}*! Recibimos tu ropa. 👋

📋 *Pedido:* ${nroPedido(pedido)}
📍 *Sucursal:* ${suc.nombre}
   ${suc.direccion}
━━━━━━━━━━━━━━━━━━━━━━
👕 *Servicio${srvItems.length > 1 ? "s" : ""}:*
${srvsLineas}
📅 *Ingreso:* ${pedido.fechaIngreso} · ${pedido.horaIngreso}hs
${pedido.fechaEstRetiro ? `🗓 *Retiro estimado:* ${pedido.fechaEstRetiro}\n` : ""}━━━━━━━━━━━━━━━━━━━━━━
💰 *Total:* ${fmt(pedido.monto)}
💳 *Pago:* ${pagoEst}
${obsTexto ? `📝 *Nota:* ${obsTexto}\n` : ""}━━━━━━━━━━━━━━━━━━━━━━
Guardá este mensaje como comprobante. Cualquier consulta al ${suc.tel}
¡Gracias por elegirnos! 🙏`;
};

const buildWAListo = (pedido, cliente, srv, suc, cfg) => {
  const empresa = cfg?.empresa || "LawaWash";
  const icono   = cfg?.icono   || "🫧";
  const { items: srvItems } = decodeSrvs(pedido.obs, pedido.servicio, pedido.maquina);
  const srvsNombres = srvItems.map(it => {
    const s = SERVICIOS.find(x => x.id === it.srvId);
    return `${s?.icon || ""} ${s?.nombre || it.srvId}`;
  }).join(" + ");
  return `${icono} *${empresa} — ¡Tu ropa está lista!* 🎉
━━━━━━━━━━━━━━━━━━━━━━
Hola *${cliente.nombre.split(" ")[0]}*! 

✅ Tu${srvItems.length > 1 ? "s servicios" : ` *${srvsNombres}*`} ya ${srvItems.length > 1 ? "están listos" : "está listo"} para retirar.
${srvItems.length > 1 ? `*${srvsNombres}*\n` : ""}
📍 *Sucursal:* ${suc.nombre}
   ${suc.direccion}
📋 *Pedido:* ${nroPedido(pedido)}
🕐 *Horario:* Lunes a Sábados 8 a 21hs
━━━━━━━━━━━━━━━━━━━━━━
${pedido.estadoPago !== "pagado"
  ? `💰 *Recordá abonar ${fmt(pedido.monto)} al retirar.*
💳 Aceptamos efectivo, MP y transferencia.
━━━━━━━━━━━━━━━━━━━━━━
`
  : `✅ *Tu pago ya está registrado.*
━━━━━━━━━━━━━━━━━━━━━━
`}¡Te esperamos! 👕✨`;
};

const buildWARecordatorio = (pedido, cliente, srv, suc, cfg) => {
  const empresa = cfg?.empresa || "LawaWash";
  const icono   = cfg?.icono   || "🫧";
  return `${icono} *${empresa} — Recordatorio* ⏰

Hola *${cliente.nombre.split(" ")[0]}*! Te recordamos que tu *${srv.nombre}* sigue esperándote en *${suc.nombre}*.

📋 Pedido: ${nroPedido(pedido)}
📍 ${suc.direccion}

¡Pasá cuando puedas! 🧺`;
};


// ─── MODAL PREVIEW WA ────────────────────────────────────────────────────────
const ModalPreviewWA = ({ open, onClose, pedido, cliente, tipo, cfg }) => {
  if (!open || !pedido || !cliente) return null;
  const srv  = SERVICIOS.find(s => s.id === pedido.servicio);
  const suc  = SUCURSALES.find(s => s.id === pedido.sucursal);
  const msg  = tipo === "listo"
    ? buildWAListo(pedido, cliente, srv, suc, cfg)
    : tipo === "recordatorio"
    ? buildWARecordatorio(pedido, cliente, srv, suc, cfg)
    : buildWAComprobante(pedido, cliente, srv, suc, cfg);

  const TIPO_INFO = {
    comprobante:  { label: "Comprobante de recepción", color: "#0ea5e9",  icon: "📋" },
    listo:        { label: "Ropa lista para retirar",  color: "#34d399",  icon: "✅" },
    recordatorio: { label: "Recordatorio al cliente",  color: "#60a5fa",  icon: "⏰" },
  };
  const info = TIPO_INFO[tipo] || TIPO_INFO.comprobante;

  return (
    <Modal open={open} onClose={onClose} title={`${info.icon} PREVIEW — ${info.label.toUpperCase()}`} color={info.color} wide>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Tag text={`👤 ${cliente.nombre}`} color="#6b7280" />
          {cliente.tel && <Tag text={`📲 +${cliente.tel}`} color="#25d366" />}
          {cliente.email && <Tag text={`✉️ ${cliente.email}`} color="#60a5fa" />}
        </div>

        {/* Bubble simulando WhatsApp */}
        <div style={{ background: "#e9f5e1", borderRadius: "4px 18px 18px 18px", padding: "14px 18px", maxWidth: 420, boxShadow: "0 1px 4px #0002", border: "1px solid #c5e8b0" }}>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: "#1a1d2e", whiteSpace: "pre-line", fontFamily: "monospace" }}>{msg}</div>
          <div style={{ color: "#9ca3af", fontSize: 11, textAlign: "right", marginTop: 8 }}>
            {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} ✓✓
          </div>
        </div>
        <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 8 }}>
          📱 Así verá el mensaje el cliente en WhatsApp
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {cliente.tel && (
          <Btn v="wa" onClick={() => {
            window.open(`https://wa.me/${cliente.tel}?text=${encodeURIComponent(msg)}`, "_blank");
            onClose();
          }} style={{ flex: 1 }}>📲 Enviar por WhatsApp</Btn>
        )}
        {cliente.email && (
          <Btn v="pri" onClick={() => {
            const subj = tipo === "listo"
              ? `${cfg?.empresa || "LawaWash"} — Tu ropa está lista — Pedido ${nroPedido(pedido)}`
              : `${cfg?.empresa || "LawaWash"} — Comprobante pedido ${nroPedido(pedido)}`;
            abrirMailto(cliente.email, subj, msg);
            onClose();
          }} style={{ flex: 1, background: "linear-gradient(135deg,#60a5fa,#3b82f6)", color: "#fff" }}>✉️ Enviar por Email</Btn>
        )}
        <Btn v="gho" onClick={onClose} style={{ flex: 1 }}>Cerrar</Btn>
      </div>
    </Modal>
  );
};

// ─── TICKET IMPRESO ───────────────────────────────────────────────────────────
const ModalTicket = ({ open, onClose, pedido, cliente, cfg }) => {
  if (!open || !pedido || !cliente) return null;
  const srv  = SERVICIOS.find(s => s.id === pedido.servicio);
  const suc  = SUCURSALES.find(s => s.id === pedido.sucursal);
  const empresa = cfg?.empresa || "LawaWash";
  const icono   = cfg?.icono   || "🫧";
  const metLabel = METODOS_PAGO.find(m => m.id === pedido.metodoPago)?.label || "—";
  const { items: srvItems, obsTexto } = decodeSrvs(pedido.obs, pedido.servicio, pedido.maquina);

  // QR simulado pequeño
  const QRSmall = () => {
    const sz = 11; const cells = [];
    for (let r = 0; r < sz; r++) for (let c = 0; c < sz; c++) {
      const corner = (r < 3 && c < 3) || (r < 3 && c >= sz - 3) || (r >= sz - 3 && c < 3);
      if (corner || Math.sin(r * 3.7 + c * 6.1 + 1) > 0.1) cells.push(<rect key={`${r}-${c}`} x={c * 8} y={r * 8} width={7} height={7} rx={1} fill="#1a1d2e" />);
    }
    return <svg width={sz * 8} height={sz * 8}>{cells}</svg>;
  };

  const instrucciones = [
    "Presentar este comprobante al retirar la ropa.",
    "El local no se responsabiliza por prendas no retiradas en 30 días.",
    "Revisá tus prendas al momento del retiro.",
    "Ante consultas llamá al " + (suc?.tel || ""),
  ];

  const printTicket = (formato) => {
    const w = window.open("", "_blank", "width=500,height=700");
    const esTermica = formato === "80mm";
    const ancho = esTermica ? "80mm" : "210mm";

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Ticket ${nroPedido(pedido)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', Arial, sans-serif; width: ${ancho}; margin: 0 auto; padding: ${esTermica ? "8px" : "20px"}; color: #1a1d2e; font-size: ${esTermica ? "11px" : "13px"}; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .sep { border-top: ${esTermica ? "1px dashed #888" : "2px solid #e2e5ef"}; margin: ${esTermica ? "6px 0" : "10px 0"}; }
  .sep-solid { border-top: ${esTermica ? "2px solid #1a1d2e" : "2px solid #1a1d2e"}; margin: ${esTermica ? "6px 0" : "12px 0"}; }
  .header { text-align: center; margin-bottom: ${esTermica ? "8px" : "16px"}; }
  .empresa { font-size: ${esTermica ? "16px" : "22px"}; font-weight: 800; letter-spacing: 2px; }
  .slogan { font-size: ${esTermica ? "9px" : "11px"}; color: #6b7280; letter-spacing: 1px; margin-top: 2px; }
  .ticket-id { font-size: ${esTermica ? "13px" : "18px"}; font-weight: 800; text-align: center; background: #f0f2f8; padding: ${esTermica ? "6px" : "10px"}; border-radius: ${esTermica ? "4px" : "8px"}; margin: ${esTermica ? "6px 0" : "10px 0"}; border: 2px dashed #d0d5e8; letter-spacing: 2px; }
  .row { display: flex; justify-content: space-between; margin: ${esTermica ? "3px 0" : "5px 0"}; }
  .label { color: #6b7280; }
  .value { font-weight: 600; text-align: right; max-width: 55%; word-break: break-word; }
  .servicio-box { background: #f4f5fb; border-radius: ${esTermica ? "4px" : "8px"}; padding: ${esTermica ? "6px 8px" : "10px 14px"}; margin: ${esTermica ? "6px 0" : "10px 0"}; border-left: 3px solid #0ea5e9; }
  .pago-ok { color: #059669; font-weight: 700; }
  .pago-pend { color: #dc2626; font-weight: 700; }
  .qr-box { text-align: center; margin: ${esTermica ? "8px 0 6px" : "12px 0 8px"}; }
  .instrucciones { font-size: ${esTermica ? "8px" : "10px"}; color: #6b7280; margin-top: ${esTermica ? "8px" : "12px"}; }
  .instrucciones li { margin: 2px 0; list-style: "→ "; margin-left: 10px; }
  .gracias { text-align: center; font-size: ${esTermica ? "10px" : "13px"}; font-weight: 700; margin-top: ${esTermica ? "8px" : "14px"}; color: #0ea5e9; }
  .firma-box { border: 1px solid #d0d5e8; border-radius: 6px; height: ${esTermica ? "28px" : "40px"}; margin-top: ${esTermica ? "6px" : "10px"}; display: flex; align-items: center; padding: 0 10px; }
  .firma-label { color: #9ca3af; font-size: ${esTermica ? "8px" : "10px"}; }
  ${!esTermica ? `.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
  .grid-item { background: #f8f9fc; border-radius: 8px; padding: 8px 12px; }
  .grid-label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid-value { font-weight: 700; font-size: 14px; margin-top: 2px; }` : ""}
  @media print { body { margin: 0; } @page { margin: 0; size: ${esTermica ? "80mm auto" : "A4"}; } }
</style>
</head><body>

<div class="header">
  <div style="font-size: ${esTermica ? "24px" : "36px"}">${icono}</div>
  <div class="empresa">${empresa.toUpperCase()}</div>
  <div class="slogan">LAVADERO AUTOMÁTICO</div>
</div>

<div class="sep-solid"></div>

<div class="ticket-id">${nroPedido(pedido)}</div>

${!esTermica ? `<div class="grid">
  <div class="grid-item"><div class="grid-label">Cliente</div><div class="grid-value">${cliente.nombre}</div></div>
  <div class="grid-item"><div class="grid-label">Sucursal</div><div class="grid-value">${suc?.nombre || ""}</div></div>
  <div class="grid-item"><div class="grid-label">Ingreso</div><div class="grid-value">${pedido.fechaIngreso} ${pedido.horaIngreso}hs</div></div>
  ${pedido.fechaEstRetiro ? `<div class="grid-item"><div class="grid-label">Retiro estimado</div><div class="grid-value">${pedido.fechaEstRetiro}</div></div>` : ""}
</div>` : `
<div class="row"><span class="label">Cliente:</span><span class="value bold">${cliente.nombre}</span></div>
<div class="row"><span class="label">Tel:</span><span class="value">${cliente.tel || "—"}</span></div>
<div class="sep"></div>
<div class="row"><span class="label">Ingreso:</span><span class="value">${pedido.fechaIngreso} ${pedido.horaIngreso}hs</span></div>
${pedido.fechaEstRetiro ? `<div class="row"><span class="label">Retiro est.:</span><span class="value bold">${pedido.fechaEstRetiro}</span></div>` : ""}
<div class="row"><span class="label">Sucursal:</span><span class="value">${suc?.nombre || ""}</span></div>
`}

<div class="sep"></div>

<div class="servicio-box">
  ${srvItems.map(it => {
    const s = SERVICIOS.find(x => x.id === it.srvId);
    return `<div class="bold" style="font-size: ${esTermica ? "12px" : "14px"}; margin-bottom:3px">${s?.icon || ""} ${s?.nombre || it.srvId}${it.maquina ? ` <span style="font-weight:400;color:#6b7280;font-size:${esTermica ? "9px" : "11px"}">· Máq. ${it.maquina}</span>` : ""}</div>`;
  }).join("")}
  ${obsTexto ? `<div style="color:#6b7280; font-size:${esTermica ? "9px" : "11px"}; margin-top:4px">📝 ${obsTexto}</div>` : ""}
</div>

<div class="sep"></div>

<div class="row">
  <span class="label">Monto:</span>
  <span class="value bold" style="font-size:${esTermica ? "15px" : "18px"}">${fmt(pedido.monto)}</span>
</div>
<div class="row">
  <span class="label">Estado pago:</span>
  <span class="${pedido.estadoPago === "pagado" ? "pago-ok" : "pago-pend"}">
    ${pedido.estadoPago === "pagado" ? `✓ PAGADO (${metLabel})` : "⏳ PAGA AL RETIRAR"}
  </span>
</div>

<div class="sep"></div>

<div class="qr-box">
  <div style="background:#fff; display:inline-block; padding:8px; border:1px solid #e2e5ef; border-radius:6px;">
    <svg width="${sz_qr}" height="${sz_qr}">${qr_cells}</svg>
  </div>
  <div style="font-size:${esTermica ? "8px" : "10px"}; color:#9ca3af; margin-top:4px">Escaneá para seguimiento</div>
</div>

<div class="instrucciones">
  <ul>
    ${instrucciones.map(i => `<li>${i}</li>`).join("")}
  </ul>
</div>

<div class="gracias">¡Gracias por elegirnos! 🙏</div>

<script>window.onload = () => { window.print(); }</script>
</body></html>`;

    // Generar QR mini en el html
    const sz = 11;
    let qrCells = "";
    for (let r = 0; r < sz; r++) for (let c = 0; c < sz; c++) {
      const corner = (r < 3 && c < 3) || (r < 3 && c >= sz - 3) || (r >= sz - 3 && c < 3);
      if (corner || Math.sin(r * 3.7 + c * 6.1 + 1) > 0.1) {
        qrCells += `<rect x="${c * 8}" y="${r * 8}" width="7" height="7" rx="1" fill="#1a1d2e"/>`;
      }
    }
    const szQr = sz * 8;
    const finalHtml = html.replace("${sz_qr}", szQr).replace("${sz_qr}", szQr).replace("${qr_cells}", qrCells);
    w.document.write(finalHtml);
    w.document.close();
  };

  return (
    <Modal open={open} onClose={onClose} title="🖨️ TICKET DE PEDIDO" color="#0ea5e9" wide>
      {/* Preview del ticket */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Vista previa</div>
        <div style={{ background: "#fff", border: "1px solid #e2e5ef", borderRadius: 12, padding: "18px 20px", maxWidth: 340, margin: "0 auto", boxShadow: "0 4px 16px #1a1d2e12", fontFamily: "monospace" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 28 }}>{icono}</div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, letterSpacing: 2 }}>{empresa.toUpperCase()}</div>
            <div style={{ color: "#9ca3af", fontSize: 10, letterSpacing: 1 }}>LAVADERO AUTOMÁTICO</div>
          </div>
          <div style={{ borderTop: "2px solid #1a1d2e", borderBottom: "2px solid #1a1d2e", padding: "8px 0", textAlign: "center", fontWeight: 800, fontSize: 16, letterSpacing: 3, margin: "8px 0" }}>{nroPedido(pedido)}</div>
          {/* Info */}
          {[
            ["Cliente", cliente.nombre],
            ["Sucursal", suc?.nombre],
            ["Ingreso", `${pedido.fechaIngreso} ${pedido.horaIngreso}hs`],
            ...(pedido.fechaEstRetiro ? [["Retiro est.", pedido.fechaEstRetiro]] : []),
          ].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0", borderBottom: "1px dashed #e8eaf2" }}>
              <span style={{ color: "#9ca3af" }}>{k}</span>
              <span style={{ fontWeight: 600, color: "#1a1d2e", textAlign: "right", maxWidth: "55%", wordBreak: "break-word" }}>{v}</span>
            </div>
          ))}
          <div style={{ background: "#f0f9ff", borderLeft: "3px solid #0ea5e9", borderRadius: 6, padding: "7px 10px", margin: "8px 0", fontSize: 12 }}>
            {srvItems.map((it, i) => {
              const s = SERVICIOS.find(x => x.id === it.srvId);
              return <div key={i} style={{ fontWeight: 700, marginBottom: i < srvItems.length - 1 ? 3 : 0 }}>{s?.icon} {s?.nombre}{it.maquina ? <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 11 }}> · Máq. {it.maquina}</span> : ""}</div>;
            })}
          </div>
          {obsTexto && <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 6, fontStyle: "italic" }}>📝 {obsTexto}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
            <span style={{ color: "#9ca3af", fontSize: 11 }}>Monto:</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#1a1d2e" }}>{fmt(pedido.monto)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#9ca3af", fontSize: 11 }}>Pago:</span>
            <span style={{ fontWeight: 700, fontSize: 11, color: pedido.estadoPago === "pagado" ? "#059669" : "#dc2626" }}>
              {pedido.estadoPago === "pagado" ? `✓ PAGADO (${metLabel})` : "⏳ PAGA AL RETIRAR"}
            </span>
          </div>
          {/* Mini QR */}
          <div style={{ textAlign: "center", margin: "8px 0" }}>
            <div style={{ display: "inline-block", background: "#fff", padding: 6, border: "1px solid #e2e5ef", borderRadius: 6 }}>
              <QRSmall />
            </div>
          </div>
          <div style={{ borderTop: "1px dashed #d0d5e8", paddingTop: 8, marginTop: 8 }}>
            {instrucciones.slice(0, 2).map((inst, i) => (
              <div key={i} style={{ fontSize: 9, color: "#9ca3af", marginBottom: 2 }}>→ {inst}</div>
            ))}
          </div>
          <div style={{ textAlign: "center", fontWeight: 700, color: "#0ea5e9", fontSize: 12, marginTop: 8 }}>¡Gracias por elegirnos! 🙏</div>
        </div>
      </div>

      {/* Botones de impresión */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Btn v="pri" onClick={() => printTicket("80mm")} style={{ flex: 1 }}>🖨️ Ticket 80mm (térmica)</Btn>
        <Btn v="suc" onClick={() => printTicket("A4")} style={{ flex: 1 }}>📄 Imprimir A4</Btn>
        <Btn v="gho" onClick={onClose} style={{ flex: 1 }}>Cerrar</Btn>
      </div>
      <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", marginTop: 10 }}>
        💡 Se abrirá una ventana de impresión del sistema operativo
      </div>
    </Modal>
  );
};

// ─── QR SIMULADO ─────────────────────────────────────────────────────────────
const QRSim = ({ pedido, onConfirm }) => {
  const [seg, setSeg] = useState(0);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setSeg(s => s + 1), 1000);
    const t2 = setTimeout(() => setListo(true), 8000);
    return () => { clearInterval(t); clearTimeout(t2); };
  }, []);
  const size = 17;
  const cells = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const corner = (r < 5 && c < 5) || (r < 5 && c >= size - 5) || (r >= size - 5 && c < 5);
    if (corner || Math.sin(r * 3.7 + c * 6.1) > 0) cells.push(<rect key={`${r}-${c}`} x={c * 11} y={r * 11} width={10} height={10} rx={1} fill="#009ee3" />);
  }
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 14, display: "inline-block", border: "3px solid #009ee3", boxShadow: "0 0 40px #009ee344" }}>
        <svg width={size * 11} height={size * 11}>{cells}</svg>
      </div>
      <div style={{ marginTop: 14 }}>
        {!listo ? (
          <div style={{ color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, border: "2px solid #fbbf24", borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            Esperando pago... {seg}s
          </div>
        ) : (
          <div>
            <div style={{ color: "#34d399", fontWeight: 600, marginBottom: 12 }}>✅ Pago confirmado (simulado)</div>
            <Btn v="suc" onClick={onConfirm} full>Registrar pago</Btn>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MODAL PAGO ──────────────────────────────────────────────────────────────
const ModalPago = ({ pedido, cliente, onConfirm, onClose }) => {
  const [metodo, setMetodo] = useState(null);
  const [step, setStep] = useState("elegir"); // elegir | qr | link | confirm
  const [copiado, setCopiado] = useState(false);
  const link = `https://mpago.la/lavawash/${pedido?.id}`;

  const registrar = (m) => onConfirm(pedido, m);

  if (!pedido) return null;
  return (
    <Modal open={!!pedido} onClose={onClose} title="💳 REGISTRAR PAGO" color="#009ee3">
      {step === "elegir" && (
        <div>
          <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 6 }}>
            Cliente: <strong style={{ color: "#1a1d2e" }}>{cliente?.nombre}</strong>
          </div>
          <div style={{ color: "#fbbf24", fontFamily: "Syne", fontWeight: 800, fontSize: 24, marginBottom: 20 }}>{fmt(pedido.monto)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { id: "efectivo", icon: "💵", label: "Efectivo", desc: "Registrar cobro en mano", color: "#34d399" },
              { id: "mp_qr", icon: "🔳", label: "Mercado Pago QR", desc: "El cliente escanea con su celular", color: "#009ee3" },
              { id: "mp_link", icon: "🔗", label: "MP Link de pago", desc: "Enviar link por WhatsApp", color: "#009ee3" },
              { id: "transferencia", icon: "🏦", label: "Transferencia bancaria", desc: "CBU / Alias bancario", color: "#a78bfa" },
            ].map(opt => (
              <button key={opt.id} onClick={() => {
                setMetodo(opt.id);
                if (opt.id === "efectivo" || opt.id === "transferencia") setStep("confirm");
                else if (opt.id === "mp_qr") setStep("qr");
                else setStep("link");
              }} style={{ background: opt.color + "12", border: `1px solid ${opt.color}44`, borderRadius: 14, padding: "14px 18px", cursor: "pointer", textAlign: "left", color: "#1a1d2e", transition: "background .2s" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: opt.color }}>{opt.icon} {opt.label}</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{metodo === "efectivo" ? "💵" : "🏦"}</div>
          <div style={{ color: "#1a1d2e", fontSize: 16, marginBottom: 6 }}>Confirmá el cobro de</div>
          <div style={{ color: "#34d399", fontFamily: "Syne", fontWeight: 800, fontSize: 32, marginBottom: 20 }}>{fmt(pedido.monto)}</div>
          {metodo === "transferencia" && (
            <div style={{ background: "#f5f3ff", border: "1px solid #a78bfa44", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#a78bfa" }}>
              🏦 CBU: <strong>0000003100123456789012</strong><br />Alias: <strong>lavawash.palermo</strong>
            </div>
          )}
          <Btn v="suc" onClick={() => registrar(metodo)} full style={{ padding: 12 }}>✅ Confirmar pago recibido</Btn>
          <div style={{ marginTop: 10 }}><Btn v="gho" onClick={() => setStep("elegir")} full>← Volver</Btn></div>
        </div>
      )}

      {step === "qr" && (
        <div>
          <QRSim pedido={pedido} onConfirm={() => registrar("mp_qr")} />
          <div style={{ marginTop: 12 }}><Btn v="gho" onClick={() => setStep("elegir")} full>← Volver</Btn></div>
        </div>
      )}

      {step === "link" && (
        <div>
          <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 10 }}>Link generado para {cliente?.nombre}:</div>
          <div style={{ background: "#f4f5fb", border: "1px solid #009ee355", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#009ee3", wordBreak: "break-all", marginBottom: 14 }}>{link}</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <Btn v="mp" onClick={() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} style={{ flex: 1 }}>{copiado ? "✅ Copiado" : "📋 Copiar"}</Btn>
            {cliente?.tel && <Btn v="wa" onClick={() => window.open(`https://wa.me/${cliente.tel}?text=${encodeURIComponent(`Hola ${cliente.nombre.split(" ")[0]}! Pagá tu pedido acá 👉 ${link}`)}`, "_blank")} style={{ flex: 1 }}>📲 Enviar WA</Btn>}
          </div>
          <Btn v="suc" onClick={() => registrar("mp_link")} full>✅ Marcar como pagado</Btn>
          <div style={{ marginTop: 10 }}><Btn v="gho" onClick={() => setStep("elegir")} full>← Volver</Btn></div>
        </div>
      )}
    </Modal>
  );
};

// ─── FORM CLIENTE ─────────────────────────────────────────────────────────────
const FormCliente = ({ inicial, onGuardar, onCancelar, sucursalFija }) => {
  const [f, setF] = useState(inicial || { nombre: "", tel: "", email: "", dni: "", dir: "", sucursal: sucursalFija || 1, notas: "" });
  const [errores, setErrores] = useState({});

  const validarCampo = (campo, valor) => {
    if (campo === "nombre") {
      if (!valor.trim()) return "El nombre es obligatorio";
      if (/^\d+$/.test(valor.trim())) return "El nombre no puede ser solo números — ¿querés poner el DNI abajo?";
    }
    if (campo === "tel") {
      if (!valor.trim()) return "El teléfono es obligatorio";
      if (!/^\+?\d{7,20}$/.test(valor.replace(/[\s\-]/g, ""))) return "Solo se permiten números (ej: 5491134218800)";
    }
    if (campo === "email" && valor) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return "Email inválido";
    }
    if (campo === "dni" && valor) {
      if (!/^[\d\s\.\-]+$/.test(valor)) return "El DNI solo debe contener números";
    }
    return "";
  };

  const setField = (campo, valor) => {
    // Teléfono y DNI: bloquear letras en el input
    if (campo === "tel") valor = valor.replace(/[^\d\+\s\-]/g, "");
    if (campo === "dni") valor = valor.replace(/[^\d\s\.\-]/g, "");
    setF(prev => ({ ...prev, [campo]: valor }));
    setErrores(prev => ({ ...prev, [campo]: validarCampo(campo, valor) }));
  };

  const hayErrores = Object.values(errores).some(e => e);
  const ok = f.nombre.trim() && f.tel.trim() && !hayErrores;

  const ErrMsg = ({ campo }) => errores[campo]
    ? <div style={{ color: "#f87171", fontSize: 12, marginTop: 3 }}>⚠ {errores[campo]}</div>
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="rsp-grid2">
        <div>
          <Inp label="Nombre completo *" value={f.nombre} onChange={e => setField("nombre", e.target.value)} placeholder="Ej: Juan Pérez" />
          <ErrMsg campo="nombre" />
        </div>
        <div>
          <Inp label="WhatsApp (solo números) *" value={f.tel} onChange={e => setField("tel", e.target.value)} placeholder="5491xxxxxxxx" inputMode="tel" />
          <ErrMsg campo="tel" />
        </div>
        <div>
          <Inp label="Email" type="email" value={f.email} onChange={e => setField("email", e.target.value)} placeholder="cliente@mail.com" />
          <ErrMsg campo="email" />
        </div>
        <div>
          <Inp label="DNI (opcional)" value={f.dni} onChange={e => setField("dni", e.target.value)} placeholder="XX.XXX.XXX" inputMode="numeric" />
          <ErrMsg campo="dni" />
        </div>
        <Inp label="Dirección" value={f.dir} onChange={e => setF({ ...f, dir: e.target.value })} placeholder="Calle 1234" />
        {!sucursalFija && (
          <Sel label="Sucursal habitual" value={f.sucursal} onChange={e => setF({ ...f, sucursal: Number(e.target.value) })}>
            {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Sel>
        )}
      </div>
      <Textarea label="Notas / preferencias" value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })} placeholder="Ej: alérgico a perfumes, ropa delicada..." />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn v="suc" onClick={() => ok && onGuardar(f)} disabled={!ok}>Guardar cliente</Btn>
        <Btn v="gho" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </div>
  );
};

// ─── CLIENTES ────────────────────────────────────────────────────────────────
const Clientes = ({ clientes, pedidos, usuario, onGuardar, onEliminar }) => {
  const [buscar, setBuscar] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [confirmarElim1, setConfirmarElim1] = useState(null); // cliente — primera confirmación
  const [confirmarElim2, setConfirmarElim2] = useState(null); // cliente — segunda confirmación

  const sucFija = usuario.rol === "empleado" ? usuario.sucursal : null;
  const lista = clientes
    .filter(c => sucFija ? c.sucursal === sucFija : true)
    .filter(c => `${c.nombre} ${c.tel} ${c.dni}`.toLowerCase().includes(buscar.toLowerCase()));

  const guardar = async (f) => {
    await onGuardar(f, editando?.id || null);
    setShowForm(false); setEditando(null);
  };

  // Solo dueño/superadmin puede eliminar
  const puedeEliminar = usuario.rol === "dueno" || usuario.rol === "superadmin";

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <Inp placeholder="🔍 Buscar por nombre, tel, DNI..." value={buscar} onChange={e => setBuscar(e.target.value)} style={{ minWidth: 240 }} />
        <Btn onClick={() => { setEditando(null); setShowForm(true); }}>+ Nuevo cliente</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20 }} glow="#34d399">
          <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 800, color: "#34d399", marginBottom: 16 }}>
            {editando ? "✏️ EDITAR CLIENTE" : "➕ NUEVO CLIENTE"}
          </div>
          <FormCliente inicial={editando} onGuardar={guardar} onCancelar={() => { setShowForm(false); setEditando(null); }} sucursalFija={sucFija} />
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {lista.map(c => {
          const suc = SUCURSALES.find(s => s.id === c.sucursal);
          const pedsCli = pedidos.filter(p => p.clienteId === c.id);
          const activos = pedsCli.filter(p => p.estado !== "Entregado").length;
          return (
            <Card key={c.id} style={{ cursor: "pointer" }} glow={activos > 0 ? "#00d4ff" : undefined}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#00d4ff18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {activos > 0 && <Tag text={`${activos} activo${activos > 1 ? "s" : ""}`} color="#00d4ff" />}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{c.nombre}</div>
              <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 2 }}>📞 +{c.tel}</div>
              {c.dni && <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 2 }}>🪪 {c.dni}</div>}
              {suc && <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>📍 {suc.nombre}</div>}
              {c.notas && <div style={{ color: "#6b7280", fontSize: 12, fontStyle: "italic", marginBottom: 10 }}>"{c.notas}"</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <Btn v="gho" onClick={() => setDetalle(c)} style={{ fontSize: 12, padding: "5px 12px" }}>Ver historial</Btn>
                <Btn v="gho" onClick={() => { setEditando(c); setShowForm(true); }} style={{ fontSize: 12, padding: "5px 12px" }}>✏️ Editar</Btn>
                {puedeEliminar && (
                  <Btn v="gho" onClick={() => setConfirmarElim1(c)} style={{ fontSize: 12, padding: "5px 12px", color: "#f87171", borderColor: "#f8717155" }}>🗑️</Btn>
                )}
              </div>
            </Card>
          );
        })}
        {lista.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", padding: 40, gridColumn: "1/-1" }}>Sin clientes encontrados</div>}
      </div>

      {/* Detalle cliente */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={`👤 ${detalle?.nombre}`} color="#00d4ff" wide>
        {detalle && (() => {
          const peds = pedidos.filter(p => p.clienteId === detalle.id);
          const totalGastado = peds.filter(p => p.estadoPago === "pagado").reduce((a, p) => a + p.monto, 0);
          return (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div style={{ background: "#f4f5fb", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase" }}>Tel</div>
                  <div style={{ color: "#00d4ff" }}>+{detalle.tel}</div>
                </div>
                <div style={{ background: "#f4f5fb", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase" }}>Total gastado</div>
                  <div style={{ color: "#fbbf24", fontFamily: "Syne", fontWeight: 700 }}>{fmt(totalGastado)}</div>
                </div>
                <div style={{ background: "#f4f5fb", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase" }}>Pedidos totales</div>
                  <div style={{ color: "#34d399", fontFamily: "Syne", fontWeight: 700 }}>{peds.length}</div>
                </div>
                {detalle.notas && <div style={{ background: "#f4f5fb", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase" }}>Notas</div>
                  <div style={{ color: "#1a1d2e", fontSize: 13 }}>{detalle.notas}</div>
                </div>}
              </div>
              <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14, color: "#6b7280", marginBottom: 10 }}>HISTORIAL DE PEDIDOS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {peds.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", padding: 16 }}>Sin pedidos</div>}
                {peds.map(p => {
                  const srv = SERVICIOS.find(s => s.id === p.servicio);
                  return (
                    <div key={p.id} style={{ background: "#f4f5fb", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{srv?.icon} {srv?.nombre}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>{p.id} · {p.fechaIngreso} · {p.horaIngreso}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Tag text={labelEstado(p.estado)} color={EST_PED_COL[p.estado]} />
                        <Tag text={p.estadoPago === "pagado" ? "✅ Pagado" : "⏳ Al retirar"} color={p.estadoPago === "pagado" ? "#34d399" : "#f87171"} />
                        <span style={{ color: "#fbbf24", fontWeight: 600 }}>{fmt(p.monto)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal confirmar eliminar — primera confirmación */}
      <Modal open={!!confirmarElim1} onClose={() => setConfirmarElim1(null)} title="🗑️ Eliminar cliente" color="#f87171">
        {confirmarElim1 && (
          <div>
            <div style={{ color: "#374151", marginBottom: 16, lineHeight: 1.6 }}>
              ¿Estás seguro de que querés eliminar al cliente <strong>{confirmarElim1.nombre}</strong>?
            </div>
            {pedidos.filter(p => p.clienteId === confirmarElim1.id && p.estado !== "Entregado").length > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #f8717133", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#92400e" }}>
                ⚠️ Este cliente tiene <strong>{pedidos.filter(p => p.clienteId === confirmarElim1.id && p.estado !== "Entregado").length} pedidos activos</strong>. Asegurate de resolverlos antes de eliminar.
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn v="dan" onClick={() => { setConfirmarElim2(confirmarElim1); setConfirmarElim1(null); }} style={{ flex: 1 }}>
                Sí, continuar
              </Btn>
              <Btn v="gho" onClick={() => setConfirmarElim1(null)} style={{ flex: 1 }}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirmar eliminar — segunda confirmación */}
      <Modal open={!!confirmarElim2} onClose={() => setConfirmarElim2(null)} title="⚠️ Confirmar eliminación definitiva" color="#f87171">
        {confirmarElim2 && (
          <div>
            <div style={{ color: "#374151", marginBottom: 12, lineHeight: 1.6 }}>
              Última confirmación: vas a eliminar permanentemente a <strong>{confirmarElim2.nombre}</strong> y todos sus datos.<br/>
              <span style={{ color: "#f87171", fontWeight: 600 }}>Esta acción no se puede deshacer.</span>
            </div>
            <div style={{ background: "#fef2f2", border: "1px solid #f87171", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#b91c1c" }}>
              ⚠️ Sus pedidos quedarán sin cliente asociado. Procedé solo si estás completamente seguro.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn v="dan" onClick={() => { onEliminar(confirmarElim2.id); setConfirmarElim2(null); }} style={{ flex: 1 }}>
                🗑️ Sí, eliminar definitivamente
              </Btn>
              <Btn v="gho" onClick={() => setConfirmarElim2(null)} style={{ flex: 1 }}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ─── FORM PEDIDO ──────────────────────────────────────────────────────────────

const FormPedido = ({ clientes, usuario, onGuardar, onCancelar, onAltaCliente, pedidos: pedidosList, ubicaciones: ubicacionesList }) => {
  const sucFija = usuario.rol === "empleado" ? usuario.sucursal : null;
  const mañana = new Date(); mañana.setDate(mañana.getDate() + 1);

  // Estado del formulario base
  const [f, setF] = useState({
    clienteId: "", sucursal: sucFija || 1,
    fechaEstRetiro: "", obs: "",  // vacío por defecto, el usuario decide
    estadoPago: "al_retirar", metodoPago: "",
    ubicacionCanasto: "",
  });
  const [estimarFecha, setEstimarFecha] = useState(false); // tilde para calcular automático
  // Lista de servicios: [{srvId, maquina}]
  const [servicios, setServicios] = useState([{ srvId: "", maquina: "" }]);

  const [busqCli, setBusqCli] = useState("");
  const [showDropCli, setShowDropCli] = useState(false);

  const cli = clientes.find(c => c.id === f.clienteId);
  const clisFiltrados = clientes
    .filter(c => sucFija ? c.sucursal === sucFija : true)
    .filter(c => `${c.nombre} ${c.tel} ${c.dni}`.toLowerCase().includes(busqCli.toLowerCase()))
    .slice(0, 6);

  const getMaquinas = (sucId) => MAQUINAS_DB.filter(m => m.sucursal === Number(sucId) && m.activa !== false);

  // Calcula fecha estimada respetando el horario de la sucursal
  const calcRetiroEstimado = (maquinaId, servicioId, sucursalId) => {
    if (!servicioId) return "";
    const srv = SERVICIOS.find(s => s.id === servicioId);
    if (!srv) return "";
    const duracion = srv.duracion || 45;
    const activos = maquinaId
      ? (pedidosList || []).filter(p => p.maquina === maquinaId && p.estado !== "Entregado")
      : [];
    const minutosOcupados = activos.reduce((acc, p) => {
      const srvP = SERVICIOS.find(s => s.id === p.servicio);
      return acc + (srvP?.duracion || 45);
    }, 0);

    const finEst = new Date(Date.now() + (minutosOcupados + duracion) * 60000);

    // Verificar si cae dentro del horario de la sucursal
    const suc = SUCURSALES.find(s => s.id === Number(sucursalId));
    if (suc) {
      const diaSemana = finEst.getDay(); // 0=dom,1=lun,...,6=sab
      const esSab = diaSemana === 6;
      const esDom = diaSemana === 0;

      let hastaStr = "";
      if (esDom) {
        if (!suc.domAbre) { finEst.setDate(finEst.getDate() + 1); finEst.setHours(9,0,0,0); }
      } else if (esSab) {
        hastaStr = suc.sabHorarioCorrido ? suc.sabTurno1Hasta : suc.sabTurno2Hasta || suc.sabTurno1Hasta;
        if (!suc.sabAbre) { finEst.setDate(finEst.getDate() + (diaSemana === 6 ? 2 : 1)); finEst.setHours(9,0,0,0); }
      } else {
        hastaStr = suc.lvHorarioCorrido ? suc.lvTurno1Hasta : suc.lvTurno2Hasta || suc.lvTurno1Hasta;
      }

      if (hastaStr) {
        const [hh, mm] = hastaStr.split(":").map(Number);
        const cierre = new Date(finEst); cierre.setHours(hh, mm, 0, 0);
        if (finEst > cierre) {
          // Pasa al día siguiente hábil
          let sig = new Date(finEst); sig.setDate(sig.getDate() + 1); sig.setHours(9, 0, 0, 0);
          const diaSig = sig.getDay();
          if (diaSig === 0 && !suc.domAbre) sig.setDate(sig.getDate() + 1);
          if (diaSig === 6 && !suc.sabAbre) sig.setDate(sig.getDate() + (suc.domAbre ? 1 : 2));
          return sig.toLocaleDateString("es-AR");
        }
      }
    }
    return finEst.toLocaleDateString("es-AR");
  };

  const updateServicio = (idx, campo, valor) => {
    const copia = servicios.map((s, i) => i === idx ? { ...s, [campo]: valor } : s);
    // Recalcular fecha estimada si el tilde está activo
    if (estimarFecha && (campo === "maquina" || campo === "srvId")) {
      const maqId = campo === "maquina" ? valor : copia[idx].maquina;
      const srvId = campo === "srvId" ? valor : copia[idx].srvId;
      if (srvId) {
        const retiro = calcRetiroEstimado(maqId, srvId, f.sucursal);
        if (retiro) setF(prev => ({ ...prev, fechaEstRetiro: retiro }));
      }
    }
    setServicios(copia);
  };

  const agregarServicio = () => setServicios([...servicios, { srvId: "", maquina: "" }]);

  const quitarServicio = (idx) => {
    if (servicios.length === 1) return;
    setServicios(servicios.filter((_, i) => i !== idx));
  };

  const totalMonto = servicios.reduce((acc, it) => {
    const s = SERVICIOS.find(x => x.id === it.srvId);
    return acc + (s?.precio || 0);
  }, 0);

  const ok = f.clienteId && servicios.some(s => s.srvId);

  const handleGuardar = () => {
    if (!ok) return;
    const srvsFiltrados = servicios.filter(s => s.srvId);
    const primero = srvsFiltrados[0];
    const obsFinal = encodeSrvs(srvsFiltrados, f.obs);
    onGuardar({
      ...f,
      servicio: primero.srvId,
      maquina: primero.maquina || "",
      obs: obsFinal,
      _servicios: srvsFiltrados,
      _monto: totalMonto,
      ubicacionCanasto: f.ubicacionCanasto || "",
    });
  };

  const btnAddStyle = {
    background: "transparent", border: "1px dashed #0ea5e9", borderRadius: 10,
    color: "#0ea5e9", cursor: "pointer", padding: "8px 16px", fontSize: 13,
    fontFamily: "Outfit", fontWeight: 600, width: "100%", marginTop: 4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Buscar cliente */}
      <div style={{ position: "relative" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ color: "#6b7280", fontSize: 12 }}>Cliente *</span>
          <input value={cli ? cli.nombre : busqCli} onChange={e => { setBusqCli(e.target.value); setF({ ...f, clienteId: "" }); setShowDropCli(true); }}
            onFocus={() => setShowDropCli(true)}
            placeholder="Buscar por nombre, tel o DNI..."
            style={{ background: "#f4f5fb", border: `1px solid ${f.clienteId ? "#34d399" : "#d0d5e8"}`, borderRadius: 10, color: "#1a1d2e", padding: "9px 13px", fontSize: 14, outline: "none" }} />
        </label>
        {showDropCli && !f.clienteId && clisFiltrados.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#f0f2f8", border: "1px solid #252545", borderRadius: 10, zIndex: 100, overflow: "hidden", marginTop: 4 }}>
            {clisFiltrados.map(c => (
              <div key={c.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #1a1a30" }}
                onMouseDown={() => { setF({ ...f, clienteId: c.id, sucursal: sucFija || c.sucursal }); setBusqCli(""); setShowDropCli(false); }}
                onMouseEnter={e => e.currentTarget.style.background = "#e8eaf2"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>📞 +{c.tel} · 🪪 {c.dni || "—"}</div>
              </div>
            ))}
          </div>
        )}
        {cli && <div style={{ background: "#f0fdf4", border: "1px solid #34d39944", borderRadius: 10, padding: "10px 14px", marginTop: 8, fontSize: 13 }}>
          ✅ <strong>{cli.nombre}</strong> · 📞 +{cli.tel} {cli.notas && <span style={{ color: "#fbbf24" }}>· ⚠ {cli.notas}</span>}
        </div>}
      </div>

      {/* Sucursal (solo dueño) */}
      {!sucFija && (
        <Sel label="Sucursal" value={f.sucursal} onChange={e => setF({ ...f, sucursal: Number(e.target.value) })}>
          {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Sel>
      )}

      {/* ── SERVICIOS MÚLTIPLES ── */}
      <div style={{ background: "#f4f5fb", borderRadius: 14, padding: 16, border: "1px solid #252545" }}>
        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>
          Servicios * <span style={{ color: "#9ca3af", fontWeight: 400, textTransform: "none" }}>— podés agregar más de uno</span>
        </div>

        {servicios.map((item, idx) => {
          const srvData = SERVICIOS.find(s => s.id === item.srvId);
          const maquinas = getMaquinas(f.sucursal);
          return (
            <div key={idx} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: `1px solid ${item.srvId ? (srvData?.color || "#00d4ff") + "55" : "#e2e5ef"}`, position: "relative" }}>
              {/* Número de ítem */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: item.srvId ? (srvData?.color || "#00d4ff") + "22" : "#e8eaf2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: item.srvId ? (srvData?.color || "#00d4ff") : "#9ca3af", flexShrink: 0 }}>
                  {item.srvId ? srvData?.icon : idx + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: item.srvId ? "#1a1d2e" : "#9ca3af" }}>
                  {item.srvId ? `${srvData?.nombre} — ${fmt(srvData?.precio)}` : `Servicio ${idx + 1}`}
                </span>
                {servicios.length > 1 && (
                  <button onClick={() => quitarServicio(idx)} title="Quitar" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* Selector de servicio */}
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ color: "#6b7280", fontSize: 11 }}>Tipo de servicio *</span>
                  <select value={item.srvId} onChange={e => updateServicio(idx, "srvId", e.target.value)}
                    style={{ background: "#f4f5fb", border: `1px solid ${item.srvId ? "#34d399" : "#d0d5e8"}`, borderRadius: 8, color: "#1a1d2e", padding: "8px 10px", fontSize: 13, outline: "none" }}>
                    <option value="">Seleccioná...</option>
                    {SERVICIOS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.nombre} — {fmt(s.precio)}</option>)}
                  </select>
                </label>

                {/* Selector de máquina — opcional */}
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ color: "#6b7280", fontSize: 11 }}>Máquina <span style={{ color: "#9ca3af" }}>(opcional)</span></span>
                  <select value={item.maquina} onChange={e => updateServicio(idx, "maquina", e.target.value)}
                    style={{ background: "#f4f5fb", border: "1px solid #d0d5e8", borderRadius: 8, color: "#1a1d2e", padding: "8px 10px", fontSize: 13, outline: "none" }}>
                    <option value="">Sin máquina asignada</option>
                    {maquinas.map(m => <option key={m.id} value={m.id}>{m.id} — {m.tipo} ({m.estado})</option>)}
                  </select>
                  {item.maquina && item.srvId && (
                    <span style={{ fontSize: 10, color: "#0ea5e9" }}>📅 Retiro calculado según carga</span>
                  )}
                </label>
              </div>
            </div>
          );
        })}

        <button onClick={agregarServicio} style={btnAddStyle}>+ Agregar otro servicio</button>

        {/* Total calculado */}
        {totalMonto > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, paddingTop: 10, borderTop: "1px solid #e2e5ef" }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Total: </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0ea5e9", marginLeft: 8 }}>{fmt(totalMonto)}</span>
          </div>
        )}
      </div>

      {/* Fecha retiro: opcional, con tilde de estimación */}
      <div style={{ background: "#f4f5fb", borderRadius: 14, padding: 16, border: "1px solid #252545" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: estimarFecha || f.fechaEstRetiro ? 12 : 0 }}>
          <div style={{ color: "#6b7280", fontSize: 12, textTransform: "uppercase", letterSpacing: .5 }}>
            Fecha estimada de retiro <span style={{ fontWeight: 400, textTransform: "none", color: "#9ca3af" }}>(opcional)</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none" }}>
            <div onClick={() => {
              const nuevoEstimar = !estimarFecha;
              setEstimarFecha(nuevoEstimar);
              if (nuevoEstimar) {
                // Calcular con el primer servicio que tenga srvId
                const primero = servicios.find(s => s.srvId);
                if (primero) {
                  const retiro = calcRetiroEstimado(primero.maquina, primero.srvId, f.sucursal);
                  if (retiro) setF(prev => ({ ...prev, fechaEstRetiro: retiro }));
                }
              } else {
                setF(prev => ({ ...prev, fechaEstRetiro: "" }));
              }
            }} style={{
              width: 36, height: 20, borderRadius: 99, background: estimarFecha ? "#0ea5e9" : "#d0d5e8",
              position: "relative", transition: "background .2s", cursor: "pointer",
            }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: estimarFecha ? 19 : 3, transition: "left .2s", boxShadow: "0 1px 3px #0003" }} />
            </div>
            <span style={{ fontSize: 12, color: estimarFecha ? "#0ea5e9" : "#6b7280", fontWeight: estimarFecha ? 600 : 400 }}>
              📅 Estimar automáticamente
            </span>
          </label>
        </div>

        {(estimarFecha || f.fechaEstRetiro) && (
          <div>
            <input
              value={f.fechaEstRetiro}
              onChange={e => { setEstimarFecha(false); setF({ ...f, fechaEstRetiro: e.target.value }); }}
              placeholder="DD/MM/AAAA"
              style={{ background: "#fff", border: `1px solid ${f.fechaEstRetiro ? "#34d399" : "#d0d5e8"}`, borderRadius: 10, color: "#1a1d2e", padding: "9px 13px", fontSize: 14, outline: "none", width: "100%", fontFamily: "Outfit" }}
            />
            {estimarFecha && f.fechaEstRetiro && (
              <div style={{ fontSize: 11, color: "#0ea5e9", marginTop: 5 }}>
                📅 Calculado según duración del servicio y horario de la sucursal. Podés editarlo.
              </div>
            )}
            {estimarFecha && !f.fechaEstRetiro && (
              <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 5 }}>
                ⚠ Seleccioná un servicio para calcular la fecha.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pago */}
      <div style={{ background: "#f4f5fb", borderRadius: 14, padding: 16, border: "1px solid #252545" }}>
        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>Estado de pago</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {[
            { v: "al_retirar", label: "⏳ Paga al retirar", col: "#f87171" },
            { v: "pagado", label: "✅ Ya pagó", col: "#34d399" },
          ].map(opt => (
            <button key={opt.v} onClick={() => setF({ ...f, estadoPago: opt.v })} style={{
              flex: 1, padding: "9px 14px", borderRadius: 10, border: `2px solid ${f.estadoPago === opt.v ? opt.col : "#d0d5e8"}`,
              background: f.estadoPago === opt.v ? opt.col + "18" : "transparent",
              color: f.estadoPago === opt.v ? opt.col : "#666", cursor: "pointer", fontFamily: "Outfit", fontSize: 13, fontWeight: f.estadoPago === opt.v ? 600 : 400,
            }}>{opt.label}</button>
          ))}
        </div>
        {f.estadoPago === "pagado" && (
          <Sel label="Método de pago" value={f.metodoPago} onChange={e => setF({ ...f, metodoPago: e.target.value })}>
            <option value="">Seleccioná método</option>
            {METODOS_PAGO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Sel>
        )}
      </div>

      <Textarea label="Observaciones" value={f.obs} onChange={e => setF({ ...f, obs: e.target.value })} placeholder="Prendas especiales, instrucciones, etc..." />

      {/* ── CANASTO / UBICACIÓN ── */}
      <div style={{ background: "#f4f5fb", borderRadius: 14, padding: 16, border: "1px solid #252545" }}>
        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>
          🧺 Canasto / Ubicación <span style={{ fontWeight: 400, textTransform: "none", color: "#9ca3af" }}>(opcional)</span>
        </div>
        <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 10 }}>
          Podés asignarlo ahora o más tarde cuando el pedido quede listo.
        </div>
        <SelectorUbicacion
          ubicaciones={ubicacionesList || []}
          seleccionada={f.ubicacionCanasto}
          setSeleccionada={val => setF({ ...f, ubicacionCanasto: val })}
          accentColor="#0ea5e9"
        />
      </div>

      {/* Resumen final */}
      {f.clienteId && servicios.some(s => s.srvId) && (
        <div style={{ background: "#f0fdf4", border: "1px solid #34d39944", borderRadius: 12, padding: "12px 16px", fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>📋 Resumen del pedido</div>
          <div style={{ color: "#1a1d2e", marginBottom: 4 }}>👤 <strong>{cli?.nombre}</strong></div>
          {servicios.filter(s => s.srvId).map((it, i) => {
            const s = SERVICIOS.find(x => x.id === it.srvId);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "#374151", marginBottom: 2 }}>
                <span>{s?.icon} {s?.nombre}{it.maquina ? ` · Máq. ${it.maquina}` : " · sin máquina"}</span>
                <strong>{fmt(s?.precio)}</strong>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid #34d39944", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#6b7280" }}>Total{f.fechaEstRetiro ? ` · Retiro est.: ${f.fechaEstRetiro}` : " · Sin fecha de retiro asignada"}</span>
            <strong style={{ color: "#0ea5e9", fontSize: 15 }}>{fmt(totalMonto)}</strong>
          </div>
        </div>
      )}

      {/* Validación */}
      {!ok && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b55", borderRadius: 12, padding: "12px 16px", fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 6 }}>⚠ Para crear el pedido necesitás:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {!f.clienteId && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b45309" }}>
                <span>❌ Seleccionar un cliente</span>
                {busqCli.length > 0 && clisFiltrados.length === 0 && (
                  <button onClick={() => {
                    // Si lo buscado parece un DNI (solo números/puntos), precargarlo en dni y limpiar nombre
                    const esDni = /^[\d\.\s]+$/.test(busqCli.trim()) && busqCli.trim().length >= 6;
                    onAltaCliente && onAltaCliente(esDni ? "" : busqCli, esDni ? busqCli : "");
                  }}
                    style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "3px 12px", fontSize: 12, cursor: "pointer", fontFamily: "Outfit", fontWeight: 600 }}>
                    + Dar de alta "{busqCli}"
                  </button>
                )}
                {(busqCli.length === 0 || clisFiltrados.length > 0) && (
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>— buscá por nombre, tel o DNI</span>
                )}
              </div>
            )}
            {!servicios.some(s => s.srvId) && <div style={{ color: "#b45309" }}>❌ Elegir al menos un servicio</div>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn v="suc" onClick={handleGuardar} disabled={!ok} style={{ flex: 1 }}>✅ Crear pedido</Btn>
        <Btn v="gho" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </div>
  );
};

// ─── SELECTOR DE UBICACIÓN REUTILIZABLE ──────────────────────────────────────
// seleccionada: string con el nombre actual | setSeleccionada: fn
// accentColor: color del tema del modal
const SelectorUbicacion = ({ ubicaciones, seleccionada, setSeleccionada, accentColor = "#0ea5e9" }) => {
  const [manual, setManual] = useState("");
  // Deduplicar por nombre
  const ubiLista = Array.from(
    new Map((ubicaciones || []).filter(u => u.activo !== false).map(u => [u.nombre, u])).values()
  );
  const esDeLista = ubiLista.some(u => u.nombre === seleccionada);

  // Si cambia la selección desde afuera y es manual, poblar el input
  useEffect(() => {
    if (seleccionada && !ubiLista.some(u => u.nombre === seleccionada)) {
      setManual(seleccionada);
    } else {
      setManual("");
    }
  }, [seleccionada]);

  const elegirDeLista = (nombre) => {
    setManual("");
    setSeleccionada(seleccionada === nombre ? "" : nombre);
  };

  const escribirManual = (val) => {
    setManual(val);
    setSeleccionada(val); // sincroniza siempre
  };

  return (
    <div>
      {ubiLista.length > 0 && (
        <>
          <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>Seleccioná una ubicación:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {ubiLista.map(u => (
              <button
                key={u.nombre}
                onClick={() => elegirDeLista(u.nombre)}
                style={{
                  padding: "7px 14px", borderRadius: 10,
                  border: `2px solid ${seleccionada === u.nombre ? accentColor : "#d0d5e8"}`,
                  background: seleccionada === u.nombre ? accentColor + "18" : "#f4f5fb",
                  color: seleccionada === u.nombre ? accentColor : "#374151",
                  cursor: "pointer", fontFamily: "Outfit", fontSize: 13,
                  fontWeight: seleccionada === u.nombre ? 700 : 400, transition: "all .15s",
                }}
              >
                🧺 {u.nombre}{u.descripcion ? <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 11 }}> — {u.descripcion}</span> : ""}
              </button>
            ))}
            <button
              onClick={() => { setManual(""); setSeleccionada(""); }}
              style={{
                padding: "7px 14px", borderRadius: 10,
                border: `2px solid ${!seleccionada ? "#f87171" : "#e2e5ef"}`,
                background: !seleccionada ? "#fef2f2" : "#f4f5fb",
                color: !seleccionada ? "#f87171" : "#9ca3af",
                cursor: "pointer", fontFamily: "Outfit", fontSize: 13,
              }}
            >✕ Sin ubicación</button>
          </div>
          <div style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6 }}>O escribí una ubicación manual:</div>
        </>
      )}
      <input
        value={manual}
        onChange={e => escribirManual(e.target.value)}
        placeholder="Ej: Canasto 3, Estante A, Sector 2..."
        style={{
          background: "#f4f5fb", border: `1px solid ${!esDeLista && seleccionada ? accentColor : "#d0d5e8"}`,
          borderRadius: 10, color: "#1a1d2e", padding: "9px 13px", fontSize: 13,
          outline: "none", width: "100%", fontFamily: "Outfit",
        }}
      />
      {seleccionada && (
        <div style={{ marginTop: 10, background: accentColor + "10", border: `1px solid ${accentColor}44`, borderRadius: 10, padding: "9px 14px", fontSize: 13 }}>
          🧺 Guardado en: <strong style={{ color: accentColor }}>{seleccionada}</strong>
        </div>
      )}
    </div>
  );
};

// ─── MODAL CAMBIAR UBICACIÓN (en cualquier estado) ───────────────────────────
const ModalCambiarUbicacion = ({ open, pedido, ubicaciones, onConfirm, onClose }) => {
  const [seleccionada, setSeleccionada] = useState("");

  useEffect(() => {
    if (open) setSeleccionada(pedido?.ubicacionCanasto || "");
  }, [open, pedido]);

  if (!open || !pedido) return null;

  const ESTADO_COLOR = { Pendiente: "#60a5fa", "En uso": "#fbbf24", Listo: "#34d399", Entregado: "#a78bfa" };
  const col = ESTADO_COLOR[pedido.estado] || "#60a5fa";

  return (
    <Modal open={open} onClose={onClose} title="🧺 CAMBIAR UBICACIÓN / CANASTO" color="#0ea5e9">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ background: col + "22", color: col, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{pedido.estado}</span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>Pedido {pedido.nro ? `N° ${pedido.nro}` : `#${pedido.id?.slice(-6)}`}</span>
      </div>
      {pedido.ubicacionCanasto && (
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#0ea5e9", marginBottom: 14 }}>
          Ubicación actual: <strong>{pedido.ubicacionCanasto}</strong>
        </div>
      )}
      <SelectorUbicacion ubicaciones={ubicaciones} seleccionada={seleccionada} setSeleccionada={setSeleccionada} accentColor="#0ea5e9" />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn v="pri" onClick={() => onConfirm(pedido, seleccionada)} style={{ flex: 1 }}>💾 Guardar ubicación</Btn>
        <Btn v="gho" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
};

// ─── MODAL ASIGNAR CANASTO/UBICACIÓN (al marcar Listo) ───────────────────────
const ModalAsignarUbicacion = ({ open, pedido, ubicaciones, onConfirm, onClose }) => {
  const [seleccionada, setSeleccionada] = useState("");

  useEffect(() => {
    if (open) setSeleccionada(pedido?.ubicacionCanasto || "");
  }, [open, pedido]);

  if (!open || !pedido) return null;

  return (
    <Modal open={open} onClose={onClose} title="✅ PEDIDO LISTO" color="#10b981">
      <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>
        ¿En qué canasto o estantería dejás la ropa del pedido <strong style={{ color: "#1a1d2e" }}>{pedido.nro ? `N° ${pedido.nro}` : `#${pedido.id?.slice(-6)}`}</strong>?
      </div>
      <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 14 }}>
        Permite ubicar rápido el pedido cuando el cliente venga a buscarlo. Es opcional.
      </div>
      <SelectorUbicacion ubicaciones={ubicaciones} seleccionada={seleccionada} setSeleccionada={setSeleccionada} accentColor="#10b981" />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn v="suc" onClick={() => onConfirm(pedido, seleccionada)} style={{ flex: 1 }}>
          ✅ {seleccionada ? "Marcar listo y guardar ubicación" : "Marcar como listo"}
        </Btn>
        <Btn v="gho" onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
};

// ─── PEDIDOS ─────────────────────────────────────────────────────────────────
const ModalTracking = ({ open, onClose, pedidoId, nroPed }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !pedidoId) return;
    setLoading(true);
    sb.from("pedido_tracking")
      .select("*").eq("pedido_id", pedidoId).order("hora", { ascending: true })
      .then(({ data }) => { setItems((data || []).map(mapTracking)); setLoading(false); });
  }, [open, pedidoId]);

  const EST_ICON = { Pendiente:"⏸", "En uso":"🔄", "En proceso":"🔄", Listo:"✅", Entregado:"📦" };
  return (
    <Modal open={open} onClose={onClose} title={`📋 TRACKING — ${nroPed || pedidoId}`} color="#a78bfa">
      {loading && <div style={{ textAlign:"center", padding:20, color:"#9ca3af" }}>⏳ Cargando historial...</div>}
      {!loading && items.length === 0 && <div style={{ textAlign:"center", color:"#9ca3af", padding:20 }}>Sin registros de seguimiento</div>}
      {!loading && items.length > 0 && (
        <div style={{ position:"relative", paddingLeft:28 }}>
          <div style={{ position:"absolute", left:10, top:0, bottom:0, width:2, background:"#e8eaf2", borderRadius:99 }} />
          {items.map((it, i) => (
            <div key={it.id} style={{ position:"relative", marginBottom:20 }}>
              <div style={{ position:"absolute", left:-22, top:2, width:16, height:16, borderRadius:"50%", background: it.estadoNuevo==="Listo"?"#10b981":it.estadoNuevo==="Entregado"?"#a78bfa":it.estadoNuevo==="En uso"?"#f59e0b":"#60a5fa", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", fontWeight:700 }}>
                {i+1}
              </div>
              <div style={{ background:"#f8f9fc", border:"1px solid #e2e5ef", borderRadius:12, padding:"10px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{EST_ICON[it.estadoNuevo] || "🔹"} {it.estadoNuevo}</span>
                  <span style={{ color:"#9ca3af", fontSize:11 }}>{it.hora ? new Date(it.hora).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"}) : ""}</span>
                </div>
                {it.estadoAnterior && <div style={{ fontSize:12, color:"#6b7280" }}>Desde: {it.estadoAnterior}</div>}
                {it.maquina && <div style={{ fontSize:12, color:"#0ea5e9" }}>🔧 {it.maquina}</div>}
                {it.usuarioNombre && <div style={{ fontSize:12, color:"#6b7280" }}>👤 {it.usuarioNombre}</div>}
                {it.nota && <div style={{ fontSize:12, color:"#374151", marginTop:4, fontStyle:"italic" }}>"{it.nota}"</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

const Pedidos = ({ pedidos, pagos, clientes, usuario, cfg, onCrear, onCambiarEstado, onConfirmarPago, onGuardarCliente, onActualizarPedido, ubicaciones, toast }) => {
  const [filtro, setFiltro] = useState("Todos");
  const [busqPed, setBusqPed] = useState("");        // búsqueda por nro pedido o cliente
  const [busqTipo, setBusqTipo] = useState("pedido"); // "pedido" | "cliente"
  const [filtroFecha, setFiltroFecha] = useState(""); // para Entregados: fecha DD/MM/AAAA
  const [showForm, setShowForm] = useState(false);
  const [pedPago, setPedPago] = useState(null);
  const [pedTicket, setPedTicket] = useState(null);
  const [pedPreviewWA, setPedPreviewWA] = useState({ open: false, pedido: null, tipo: "comprobante" });
  const [altaCliModal, setAltaCliModal] = useState({ open: false, nombre: "", dni: "" });
  const [trackingModal, setTrackingModal] = useState({ open: false, pedidoId: null, nroPed: null });
  const [guardando, setGuardando] = useState(false);
  const [modalUbicacion, setModalUbicacion] = useState({ open: false, pedido: null }); // asignar canasto al marcar Listo
  const [modalCambiarUbi, setModalCambiarUbi] = useState({ open: false, pedido: null }); // cambiar ubicacion en cualquier estado
  const [ahora, setAhora] = useState(Date.now());
  const [alertasVencidas, setAlertasVencidas] = useState([]); // pedidos vencidos para mostrar alerta
  const alertasMostradas = useRef(new Set()); // IDs ya alertados en esta sesión

  // Tick cada 30s para actualizar barras y detectar vencimientos
  useEffect(() => {
    const t = setInterval(() => {
      setAhora(Date.now());
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // Detectar pedidos que vencieron y no fueron alertados
  useEffect(() => {
    const enUso = pedidos.filter(p => p.estado === "En uso");
    const nuevasAlertas = [];
    enUso.forEach(p => {
      const srv = SERVICIOS.find(s => s.id === p.servicio);
      const timer = calcTimer(p, srv, ahora);
      if (timer?.vencido && !alertasMostradas.current.has(p.id)) {
        alertasMostradas.current.add(p.id);
        nuevasAlertas.push({ pedidoId: p.id, nroPed: nroPedido(p), maquina: p.maquina, producto: srv?.nombre || "Servicio", horaFinEst: timer.horaFinEst, mins: Math.abs(timer.restanteMins) });
      }
    });
    if (nuevasAlertas.length > 0) {
      setAlertasVencidas(prev => [...prev, ...nuevasAlertas]);
    }
  }, [ahora, pedidos]);

  const sucFija = usuario.rol === "empleado" ? usuario.sucursal : null;
  const FILTROS = ["Todos", "Pendiente", "En uso", "Listo", "Entregado"];
  const FILTROS_LABEL = { "Todos":"Todos", "Pendiente":"Pendiente", "En uso":"En proceso", "Listo":"Listo", "Entregado":"Entregado" };

  // Contadores por estado para los badges
  const contadores = pedidos
    .filter(p => sucFija ? p.sucursal === sucFija : true)
    .reduce((acc, p) => { acc[p.estado] = (acc[p.estado] || 0) + 1; return acc; }, {});

  const lista = pedidos
    .filter(p => sucFija ? p.sucursal === sucFija : true)
    .filter(p => filtro === "Todos" || p.estado === filtro)
    // Búsqueda por nro de pedido o cliente
    .filter(p => {
      if (!busqPed.trim()) return true;
      const q = busqPed.trim().toLowerCase();
      if (busqTipo === "pedido") return String(p.nro || "").includes(q) || p.id.toLowerCase().includes(q);
      const cli = clientes.find(c => c.id === p.clienteId);
      return (cli?.nombre || "").toLowerCase().includes(q) || (cli?.tel || "").includes(q) || (cli?.dni || "").includes(q);
    })
    // Filtro de fecha solo para Entregados
    .filter(p => {
      if (filtro !== "Entregado" || !filtroFecha.trim()) return true;
      return normFecha(p.fechaIngreso) === normFecha(filtroFecha);
    })
    // Performance: limitar Entregados sin filtro (son los que más crecen)
    .slice(0, filtro === "Entregado" && !busqPed && !filtroFecha ? 50 : undefined);

  const crearPedido = async (f) => {
    setGuardando(true);
    const monto = f._monto || (() => { const s = SERVICIOS.find(x => x.id === f.servicio); return s?.precio || 0; })();
    const nuevo = {
      id: genId("P"), clienteId: f.clienteId, servicio: f.servicio,
      maquina: f.maquina || "", sucursal: Number(f.sucursal),
      fechaIngreso: hoy, horaIngreso: horaActual(), fechaEstRetiro: f.fechaEstRetiro,
      estado: "Pendiente", progreso: 0,
      estadoPago: f.estadoPago, metodoPago: f.estadoPago === "pagado" ? f.metodoPago : null,
      monto, obs: f.obs, ubicacionCanasto: f.ubicacionCanasto || "",
    };
    // onCrear inserta en DB y llama cargarDatos() — la pantalla se refresca
    const creado = await onCrear(nuevo);
    // Si ya pagó, registrar pago también
    if (f.estadoPago === "pagado" && f.metodoPago) {
      await sb.from("pagos").insert([{
        id: genId("PAG"), pedido_id: nuevo.id, cliente_id: f.clienteId,
        monto, metodo: f.metodoPago,
        hora: horaActual(), sucursal: Number(f.sucursal), fecha: hoy,
        ...(usuario.orgId ? { organization_id: usuario.orgId } : {}),
      }]);
    }
    setGuardando(false);
    setShowForm(false);
  };

  const guardarNuevoCli = async (f) => {
    await onGuardarCliente(f, null);
    setAltaCliModal({ open: false, nombre: "" });
  };

  const [modalEntregarSinPago, setModalEntregarSinPago] = useState(null); // pedido pendiente de confirmar entrega sin pago

  const cambiarEstado = async (pedido, est) => {
    // Al marcar como "Listo", preguntar por canasto/ubicación (opcional)
    if (est === "Listo") {
      setModalUbicacion({ open: true, pedido, estadoDestino: est });
      return;
    }
    // Al entregar sin pago registrado, mostrar advertencia
    if (est === "Entregado" && pedido.estadoPago !== "pagado") {
      setModalEntregarSinPago(pedido);
      return;
    }
    await onCambiarEstado(pedido.id || pedido, est, null, null);
  };

  const confirmarPago = async (ped, metodo) => {
    await onConfirmarPago(ped, metodo);
    setPedPago(null);
  };

  return (
    <div style={{ padding: 28 }}>
      {/* ── Alertas de máquinas vencidas ── */}
      {alertasVencidas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {alertasVencidas.map((alerta, i) => {
            const ped = pedidos.find(p => p.id === alerta.pedidoId);
            const cli = ped ? clientes.find(c => c.id === ped.clienteId) : null;
            return (
              <div key={i} style={{ background: "linear-gradient(135deg, #fef2f2, #fff7ed)", border: "2px solid #f87171", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", animation: "slideIn .3s ease", boxShadow: "0 4px 20px #f8717133" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#dc2626", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ background: "#dc2626", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 14 }}>{alerta.nroPed}</span>
                      Revisar máquina
                      <span style={{ background: "#fef2f2", border: "1px solid #f87171", borderRadius: 6, padding: "2px 8px", fontSize: 14 }}>{alerta.maquina}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
                      <strong>{alerta.producto}</strong>{cli ? ` · ${cli.nombre}` : ""} · Finalizó a las <strong>{alerta.horaFinEst}</strong> · Hace <strong>{alerta.mins} min</strong>
                    </div>
                  </div>
                </div>
                <button onClick={() => setAlertasVencidas(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: "#f871711a", border: "1px solid #f87171", borderRadius: 8, padding: "6px 14px", color: "#dc2626", cursor: "pointer", fontSize: 12, fontFamily: "Outfit", fontWeight: 700 }}>
                  ✓ Entendido
                </button>
              </div>
            );
          })}
        </div>
      )}
      {/* ── Barra superior: filtros + búsqueda + botón nuevo ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {/* Fila 1: filtros de estado + botón nuevo */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTROS.map(f => {
              const cnt = f === "Todos" ? Object.values(contadores).reduce((a,b)=>a+b,0) : (contadores[f] || 0);
              return (
                <button key={f} onClick={() => { setFiltro(f); setBusqPed(""); setFiltroFecha(""); }} style={{
                  padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13,
                  background: filtro === f ? "#0ea5e9" : "#e8eaf2", color: filtro === f ? "#fff" : "#4b5563", fontFamily: "Outfit",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {FILTROS_LABEL[f] || f}
                  {cnt > 0 && f !== "Entregado" && (
                    <span style={{ background: filtro === f ? "#ffffff33" : "#0ea5e922", color: filtro === f ? "#fff" : "#0ea5e9", borderRadius: 99, padding: "0 6px", fontSize: 11, fontWeight: 700 }}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>
          <Btn onClick={() => setShowForm(!showForm)}>+ Nuevo pedido</Btn>
        </div>

        {/* Fila 2: barra de búsqueda */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Toggle tipo búsqueda */}
          <div style={{ display: "flex", background: "#e8eaf2", borderRadius: 10, padding: 3, gap: 2 }}>
            {[["pedido","🔢 N° Pedido"],["cliente","👤 Cliente"]].map(([v,lbl]) => (
              <button key={v} onClick={() => { setBusqTipo(v); setBusqPed(""); }} style={{
                padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                background: busqTipo === v ? "#fff" : "transparent", color: busqTipo === v ? "#0ea5e9" : "#6b7280",
                fontFamily: "Outfit", fontWeight: busqTipo === v ? 700 : 400, boxShadow: busqTipo === v ? "0 1px 4px #0002" : "none",
              }}>{lbl}</button>
            ))}
          </div>
          <div style={{ flex: 1, position: "relative", minWidth: 180 }}>
            <input
              value={busqPed} onChange={e => setBusqPed(e.target.value)}
              placeholder={busqTipo === "pedido" ? "Buscar por N° de pedido..." : "Buscar por nombre, tel o DNI..."}
              style={{ width: "100%", background: "#f4f5fb", border: `1px solid ${busqPed ? "#0ea5e9" : "#d0d5e8"}`, borderRadius: 10, padding: "8px 36px 8px 13px", fontSize: 13, color: "#1a1d2e", outline: "none", fontFamily: "Outfit" }}
            />
            {busqPed
              ? <button onClick={() => setBusqPed("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16 }}>✕</button>
              : <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>🔍</span>
            }
          </div>
          {/* Filtro de fecha solo si está en "Entregado" */}
          {filtro === "Entregado" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" }}>📅 Fecha:</span>
              <input
                type="text" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{ background: "#f4f5fb", border: `1px solid ${filtroFecha ? "#0ea5e9" : "#d0d5e8"}`, borderRadius: 10, padding: "7px 12px", fontSize: 13, color: "#1a1d2e", outline: "none", fontFamily: "Outfit", width: 130 }}
              />
              {filtroFecha && <button onClick={() => setFiltroFecha("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14 }}>✕</button>}
            </div>
          )}
        </div>

        {/* Info de resultados */}
        {(busqPed || filtroFecha) && (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {lista.length === 0 ? "Sin resultados" : `${lista.length} pedido${lista.length !== 1 ? "s" : ""} encontrado${lista.length !== 1 ? "s" : ""}`}
            {filtro === "Entregado" && !busqPed && !filtroFecha && <span> · mostrando últimos 50</span>}
          </div>
        )}
        {filtro === "Entregado" && !busqPed && !filtroFecha && (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>📂 Mostrando los últimos 50 entregados. Usá el filtro de fecha o búsqueda para ver más.</div>
        )}
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20 }} glow="#00d4ff">
          <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 800, color: "#00d4ff", marginBottom: 16 }}>NUEVO PEDIDO</div>
          <FormPedido clientes={clientes} usuario={usuario} onGuardar={crearPedido} onCancelar={() => setShowForm(false)} onAltaCliente={(nombre, dni) => setAltaCliModal({ open: true, nombre, dni: dni || "" })} pedidos={pedidos} ubicaciones={ubicaciones} />
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lista.map(p => {
          const cli = clientes.find(c => c.id === p.clienteId);
          const srv = SERVICIOS.find(s => s.id === p.servicio);
          const suc = SUCURSALES.find(s => s.id === p.sucursal);
          const metLabel = METODOS_PAGO.find(m => m.id === p.metodoPago)?.label;
          return (
            <Card key={p.id} glow={EST_PED_COL[p.estado]}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: (srv?.color || "#00d4ff") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{srv?.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cli?.nombre || "—"}</div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 5 }}>
                      {nroPedido(p)} · {p.fechaIngreso} {p.horaIngreso}{p.fechaEstRetiro ? <> · Retiro: <strong style={{ color: "#1a1d2e" }}>{p.fechaEstRetiro}</strong></> : null} · {suc?.nombre}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {/* Mostrar todos los servicios del pedido */}
                      {(() => {
                        const { items } = decodeSrvs(p.obs, p.servicio, p.maquina);
                        return items.map((it, i) => {
                          const s = SERVICIOS.find(x => x.id === it.srvId);
                          return <Tag key={i} text={`${s?.icon || ""} ${s?.nombre || it.srvId}${it.maquina ? ` · Máq.${it.maquina}` : ""}`} color={s?.color || "#00d4ff"} />;
                        });
                      })()}
                      <Tag text={labelEstado(p.estado)} color={EST_PED_COL[p.estado]} />
                      <Tag text={p.estadoPago === "pagado" ? `✅ Pagado${metLabel ? " · " + metLabel : ""}` : "⏳ Al retirar"} color={p.estadoPago === "pagado" ? "#34d399" : "#f87171"} />
                      <Tag text={fmt(p.monto)} color="#fbbf24" />
                      {p.ubicacionCanasto && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: "#0ea5e922", border: "1px solid #0ea5e9",
                          borderRadius: 99, padding: "2px 10px",
                          fontSize: 12, fontWeight: 700, color: "#0ea5e9",
                        }}>
                          🧺 {p.ubicacionCanasto}
                        </span>
                      )}
                    </div>
                    {(() => { const { obsTexto } = decodeSrvs(p.obs, p.servicio, p.maquina); return obsTexto ? <div style={{ color: "#6b7280", fontSize: 12, marginTop: 5, fontStyle: "italic" }}>📝 {obsTexto}</div> : null; })()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                  {p.estado === "Pendiente" && <Btn v="pri" onClick={() => cambiarEstado(p, "En uso")} style={{ fontSize: 12, padding: "6px 12px" }}>▶ Iniciar</Btn>}
                  {p.estado === "En uso" && <Btn v="suc" onClick={() => cambiarEstado(p, "Listo")} style={{ fontSize: 12, padding: "6px 12px" }}>✅ Listo</Btn>}
                  {p.estado === "Listo" && <Btn v="gho" onClick={() => cambiarEstado(p, "Entregado")} style={{ fontSize: 12, padding: "6px 12px" }}>📦 Entregar</Btn>}
                  {p.estado !== "Entregado" && (
                    <Btn v="gho" onClick={() => setModalCambiarUbi({ open: true, pedido: p })} style={{ fontSize: 12, padding: "6px 12px", borderColor: p.ubicacionCanasto ? "#0ea5e9" : undefined, color: p.ubicacionCanasto ? "#0ea5e9" : undefined }}>
                      🧺 {p.ubicacionCanasto || "Ubicación"}
                    </Btn>
                  )}
                  {p.estadoPago !== "pagado" && <Btn v="mp" onClick={() => setPedPago(p)} style={{ fontSize: 12, padding: "6px 12px" }}>💳 Cobrar</Btn>}
                  <Btn v="gho" onClick={() => setPedTicket(p)} style={{ fontSize: 12, padding: "6px 12px" }}>🖨️ Ticket</Btn>
                  {(cli?.tel || cli?.email) && (
                    <Btn v="wa" onClick={() => setPedPreviewWA({ open: true, pedido: p, tipo: p.estado === "Listo" ? "listo" : "comprobante" })}
                      style={{ fontSize: 12, padding: "6px 12px" }}>📲 Notif.</Btn>
                  )}
                  <Btn v="rol" onClick={() => setTrackingModal({ open: true, pedidoId: p.id, nroPed: nroPedido(p) })} style={{ fontSize: 12, padding: "6px 12px" }}>📋 Tracking</Btn>
                </div>
              </div>
              {p.estado === "En uso" && (() => {
                const srv2 = SERVICIOS.find(s => s.id === p.servicio);
                const timer = calcTimer(p, srv2, ahora);
                if (!timer) return null;
                const barColor = timer.vencido ? "#f87171" : timer.restanteMins <= 5 ? "#f59e0b" : srv2?.color || "#00d4ff";
                return (
                  <div style={{ marginTop: 14, background: timer.vencido ? "#fef2f230" : "#f4f5fb", borderRadius: 10, padding: "10px 14px", border: `1px solid ${barColor}44` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#6b7280" }}>
                        <span>🕐 Inicio: <strong style={{ color: "#374151" }}>{timer.horaInicioStr}</strong></span>
                        <span>🏁 Fin est.: <strong style={{ color: barColor }}>{timer.horaFinEst}</strong></span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                        {timer.vencido
                          ? `⚠️ Venció hace ${Math.abs(timer.restanteMins)} min`
                          : timer.restanteMins <= 5
                            ? `⏳ ${timer.restanteMins} min restantes`
                            : `${timer.pct}% · ${timer.restanteMins} min`}
                      </span>
                    </div>
                    <Bar val={timer.pct} color={barColor} />
                  </div>
                );
              })()}
              {/* Banner de ubicación — siempre visible si está Listo con ubicacion asignada */}
              {p.estado === "Listo" && p.ubicacionCanasto && (
                <div style={{
                  marginTop: 14, background: "linear-gradient(135deg, #10b98118, #0ea5e918)",
                  border: "2px solid #10b981", borderRadius: 12, padding: "12px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 28 }}>🧺</span>
                  <div>
                    <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: .5, marginBottom: 2 }}>La ropa está en</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>{p.ubicacionCanasto}</div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {lista.length === 0 && <div style={{ color: "#333", textAlign: "center", padding: 50 }}>Sin pedidos con este filtro</div>}
      </div>

      <ModalTracking
        open={trackingModal.open}
        onClose={() => setTrackingModal({ open: false, pedidoId: null, nroPed: null })}
        pedidoId={trackingModal.pedidoId}
        nroPed={trackingModal.nroPed}
      />
      <ModalPago
        pedido={pedPago}
        cliente={pedPago ? clientes.find(c => c.id === pedPago.clienteId) : null}
        onConfirm={confirmarPago}
        onClose={() => setPedPago(null)}
      />
      <Modal open={altaCliModal.open} onClose={() => setAltaCliModal({ open: false, nombre: "", dni: "" })} title="👤 DAR DE ALTA CLIENTE" color="#34d399">
        <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
          Completá los datos del nuevo cliente. Una vez guardado, volvé a buscarlo en el formulario de pedido.
        </div>
        <FormCliente
          inicial={{ nombre: altaCliModal.nombre, tel: "", email: "", dni: altaCliModal.dni || "", dir: "", sucursal: usuario.rol === "empleado" ? usuario.sucursal : 1, notas: "" }}
          onGuardar={guardarNuevoCli}
          onCancelar={() => setAltaCliModal({ open: false, nombre: "", dni: "" })}
          sucursalFija={usuario.rol === "empleado" ? usuario.sucursal : null}
        />
      </Modal>
      <ModalTicket
        open={!!pedTicket}
        onClose={() => setPedTicket(null)}
        pedido={pedTicket}
        cliente={pedTicket ? clientes.find(c => c.id === pedTicket.clienteId) : null}
        cfg={cfg}
      />
      <ModalPreviewWA
        open={pedPreviewWA.open}
        onClose={() => setPedPreviewWA({ open: false, pedido: null, tipo: "comprobante" })}
        pedido={pedPreviewWA.pedido}
        cliente={pedPreviewWA.pedido ? clientes.find(c => c.id === pedPreviewWA.pedido.clienteId) : null}
        tipo={pedPreviewWA.tipo}
        cfg={cfg}
      />

      {/* ── Modal asignar canasto/ubicación al marcar Listo ── */}
      <ModalAsignarUbicacion
        open={modalUbicacion.open}
        pedido={modalUbicacion.pedido}
        ubicaciones={ubicaciones}
        onConfirm={async (ped, ubicacion) => {
          setModalUbicacion({ open: false, pedido: null });
          if (ubicacion) {
            await onActualizarPedido(ped.id, { ubicacionCanasto: ubicacion });
          }
          await onCambiarEstado(ped.id, "Listo", null, null);
        }}
        onClose={() => setModalUbicacion({ open: false, pedido: null })}
      />

      {/* ── Modal cambiar ubicación en cualquier estado ── */}
      <ModalCambiarUbicacion
        open={modalCambiarUbi.open}
        pedido={modalCambiarUbi.pedido}
        ubicaciones={ubicaciones}
        onConfirm={async (ped, ubicacion) => {
          setModalCambiarUbi({ open: false, pedido: null });
          await onActualizarPedido(ped.id, { ubicacionCanasto: ubicacion });
        }}
        onClose={() => setModalCambiarUbi({ open: false, pedido: null })}
      />

      {/* ── Modal advertencia entrega sin pago ── */}
      {modalEntregarSinPago && (
        <Modal open={true} onClose={() => setModalEntregarSinPago(null)} color="#f59e0b">
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💳</div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, color: "#b45309", marginBottom: 6 }}>
              Pago no registrado
            </div>
            <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
              El pedido <strong>{nroPedido(modalEntregarSinPago)}</strong> de <strong>{clientes.find(c => c.id === modalEntregarSinPago.clienteId)?.nombre}</strong> tiene un saldo pendiente de <strong style={{ color: "#b45309" }}>{fmt(modalEntregarSinPago.monto)}</strong> sin cobrar.
            </div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 8 }}>
              ¿Querés registrar el cobro antes, o entregar de todas formas?
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn v="mp" onClick={() => { setPedPago(modalEntregarSinPago); setModalEntregarSinPago(null); }} full>
              💳 Registrar cobro ahora
            </Btn>
            <Btn v="gho" onClick={async () => { await onCambiarEstado(modalEntregarSinPago.id, "Entregado", null, null); setModalEntregarSinPago(null); }} full style={{ color: "#9ca3af" }}>
              📦 Entregar sin cobrar de todas formas
            </Btn>
            <Btn v="gho" onClick={() => setModalEntregarSinPago(null)} full>
              Cancelar
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── MÁQUINAS (ABM dueño + timers) ──────────────────────────────────────────
const MAQUINAS_TIPOS_OPCIONES = ["Lavadora","Secadora","Planchadora","Centrifugadora","Otro"];
const EST_MAQ_OPTS = ["Disponible","Mantenimiento","Fuera de servicio"];

const Maquinas = ({ sucursalActiva, pedidos, maquinas: maqProp, onCambiarEstado,
  onGuardarMaquina, onEliminarMaquina, onCambiarEstadoMaquina, usuario, toast }) => {
  const [ahora, setAhora]     = useState(Date.now());
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmarElimMaq, setConfirmarElimMaq] = useState(null); // {id, tipo}
  const formRef = useRef(null);
  const FORM_INIT = { tipo: "Lavadora", capacidad: "", sucursal: sucursalActiva || 1, estado: "Disponible" };
  const [form, setForm] = useState(FORM_INIT);
  const isDueno = usuario?.rol === "dueno" || usuario?.rol === "superadmin";

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const maquinasList = maqProp && maqProp.length > 0 ? maqProp : MAQUINAS_DB;

  const sucursales = sucursalActiva === 0
    ? SUCURSALES
    : SUCURSALES.filter(s => s.id === sucursalActiva);

  const abrirForm = (maq = null) => {
    setEditando(maq);
    setForm(maq ? { tipo: maq.tipo, capacidad: maq.capacidad, sucursal: maq.sucursal, estado: maq.estado } : FORM_INIT);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 80);
  };

  const guardarMaquina = async () => {
    await onGuardarMaquina(form, editando?.id || null);
    setShowForm(false); setEditando(null); setForm(FORM_INIT);
  };

  const getMaquinasDeSuc = (sucId) => maquinasList.filter(m => m.sucursal === sucId);

  const getTimer = (maq) => {
    const p = pedidos.find(p => p.maquina === maq.id && p.estado === "En uso");
    if (!p || !p.horaIngreso) return null;
    const srv = SERVICIOS.find(s => s.id === p.servicio);
    const dur = srv?.duracion || 45;
    const [hh, mm] = p.horaIngreso.split(":").map(Number);
    const inicio = new Date(); inicio.setHours(hh, mm, 0, 0);
    const fin = new Date(inicio.getTime() + dur * 60000);
    const restante = Math.round((fin - ahora) / 60000);
    return { pedido: p, srv, dur, restante, vencida: restante < 0 };
  };

  const EST_COLOR = { Disponible:"#34d399", "En uso":"#f59e0b", Mantenimiento:"#60a5fa", "Fuera de servicio":"#f87171", vencida:"#f87171" };

  return (
    <div style={{ padding:28, display:"flex", flexDirection:"column", gap:24 }}>
      {isDueno && (
        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <Btn onClick={() => abrirForm()}>+ Nueva máquina</Btn>
        </div>
      )}

      {isDueno && showForm && (
        <div ref={formRef} style={{ scrollMarginTop:16 }}>
          <Card glow="#0ea5e9">
            <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16, color:"#0ea5e9", marginBottom:16 }}>
              {editando ? "✏️ EDITAR MÁQUINA" : "➕ NUEVA MÁQUINA"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
              <Sel label="Tipo" value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}>
                {MAQUINAS_TIPOS_OPCIONES.map(t => <option key={t} value={t}>{t}</option>)}
              </Sel>
              <Inp label="Capacidad" value={form.capacidad} onChange={e => setForm({...form, capacidad:e.target.value})} placeholder="Ej: 8 kg" />
              <Sel label="Sucursal" value={form.sucursal} onChange={e => setForm({...form, sucursal:Number(e.target.value)})}>
                {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Sel>
              {editando && (
                <Sel label="Estado" value={form.estado} onChange={e => setForm({...form, estado:e.target.value})}>
                  {EST_MAQ_OPTS.map(e => <option key={e} value={e}>{e}</option>)}
                </Sel>
              )}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <Btn v="suc" onClick={guardarMaquina} disabled={!form.tipo} style={{ flex:1 }}>Guardar</Btn>
              <Btn v="gho" onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Btn>
            </div>
          </Card>
        </div>
      )}

      {sucursales.map(suc => {
        const maqs = getMaquinasDeSuc(suc.id);
        const enProceso = maqs.filter(m => pedidos.some(p => p.maquina === m.id && p.estado === "En uso")).length;
        const vencidas  = maqs.filter(m => { const t = getTimer(m); return t?.vencida; }).length;
        return (
          <Card key={suc.id} glow="#0ea5e9">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16 }}>📍 {suc.nombre}</div>
                <div style={{ color:"#6b7280", fontSize:12 }}>{suc.direccion}</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Tag text={`🔄 ${enProceso} en proceso`} color="#f59e0b" />
                {vencidas > 0 && <Tag text={`⚠️ ${vencidas} vencida${vencidas>1?"s":""}`} color="#f87171" />}
                <Tag text={`${maqs.length} máq.`} color="#0ea5e9" />
              </div>
            </div>
            {maqs.length === 0 && <div style={{ color:"#9ca3af", textAlign:"center", padding:20 }}>No hay máquinas registradas para esta sucursal</div>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
              {maqs.map(maq => {
                const timer = getTimer(maq);
                const pedActivo = timer?.pedido || pedidos.find(p => p.maquina === maq.id && p.estado === "Pendiente");
                const estadoVis = timer?.vencida ? "vencida" : pedActivo ? pedActivo.estado : maq.estado;
                const col = EST_COLOR[estadoVis] || "#34d399";
                const pct = timer ? Math.min(100, Math.max(0, Math.round(((timer.dur - Math.max(0, timer.restante)) / timer.dur) * 100))) : 0;
                return (
                  <div key={maq.id} style={{ background:col+"12", border:`2px solid ${col}44`, borderRadius:16, padding:16,
                    outline: timer?.vencida ? `2px solid #f87171` : "none",
                    boxShadow: timer?.vencida ? "0 0 12px #f8717144" : "none" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div>
                        <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:14 }}>{maq.tipo}</div>
                        <div style={{ color:"#6b7280", fontSize:11 }}>{maq.id}{maq.capacidad ? ` · ${maq.capacidad}` : ""}</div>
                      </div>
                      {isDueno && (
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={() => abrirForm(maq)}
                            style={{ background:"none", border:"1px solid #d0d5e8", borderRadius:8, padding:"2px 7px", cursor:"pointer", fontSize:12 }}>✏️</button>
                          <button onClick={() => setConfirmarElimMaq({ id: maq.id, tipo: maq.tipo, sucursal: suc.nombre })}
                            title="Eliminar máquina"
                            style={{ background:"none", border:"1px solid #fca5a5", borderRadius:8, padding:"2px 7px", cursor:"pointer", fontSize:12, color:"#f87171" }}>🗑️</button>
                        </div>
                      )}
                    </div>
                    {!pedActivo && maq.estado === "Disponible" && (
                      <div style={{ color:"#34d399", fontWeight:700, fontSize:13 }}>✅ Disponible</div>
                    )}
                    {maq.estado !== "Disponible" && !pedActivo && (
                      <Tag text={maq.estado} color={EST_COLOR[maq.estado] || "#9ca3af"} />
                    )}
                    {pedActivo && (
                      <>
                        <Tag text={timer?.vencida ? "⚠️ VENCIDA" : labelEstado(pedActivo.estado)} color={col} />
                        <div style={{ fontSize:12, marginTop:8, color:"#374151" }}>
                          <div style={{ fontWeight:600 }}>{pedActivo.id}</div>
                          {timer?.srv && <div>{timer.srv.icon} {timer.srv.nombre} · {timer.dur} min</div>}
                        </div>
                        {timer && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4, color:"#6b7280" }}>
                              <span>{pct}% completado</span>
                              <span style={{ fontWeight:700, color: timer.vencida?"#f87171":timer.restante<5?"#f59e0b":"#34d399" }}>
                                {timer.vencida ? `+${Math.abs(timer.restante)}min` : `${timer.restante}min`}
                              </span>
                            </div>
                            <Bar val={pct} color={timer.vencida?"#f87171":timer.restante<5?"#f59e0b":col} h={6} />
                          </div>
                        )}
                        {timer?.vencida && (
                          <Btn v="suc" onClick={() => onCambiarEstado(pedActivo.id,"Listo",maq.id,"Listo desde panel máquinas")}
                            style={{ fontSize:11, padding:"5px 10px", width:"100%", marginTop:8 }}>✅ Marcar listo</Btn>
                        )}
                      </>
                    )}
                    {isDueno && maq.estado === "Disponible" && !pedActivo && (
                      <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                        {EST_MAQ_OPTS.filter(e => e !== "Disponible").map(e => (
                          <button key={e} onClick={() => onCambiarEstadoMaquina(maq.id, e)}
                            style={{ background:"none", border:`1px solid ${EST_COLOR[e]}`, color:EST_COLOR[e],
                              borderRadius:8, padding:"3px 8px", cursor:"pointer", fontSize:11 }}>
                            {e === "Mantenimiento" ? "🔧" : "🚫"} {e}
                          </button>
                        ))}
                      </div>
                    )}
                    {isDueno && maq.estado !== "Disponible" && !pedActivo && (
                      <button onClick={() => onCambiarEstadoMaquina(maq.id, "Disponible")}
                        style={{ marginTop:8, background:"none", border:"1px solid #34d399", color:"#34d399",
                          borderRadius:8, padding:"3px 10px", cursor:"pointer", fontSize:11, width:"100%" }}>
                        ✅ Marcar disponible
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Modal confirmación eliminar máquina */}
      <Modal open={!!confirmarElimMaq} onClose={() => setConfirmarElimMaq(null)} title="⚠️ Eliminar máquina" color="#f87171">
        {confirmarElimMaq && (
          <div>
            <div style={{ color:"#374151", marginBottom:16, lineHeight:1.6 }}>
              Estás por eliminar la máquina <strong>{confirmarElimMaq.tipo}</strong> ({confirmarElimMaq.id}) de <strong>{confirmarElimMaq.sucursal}</strong>.<br/>
              <span style={{ color:"#f87171" }}>Esta acción no se puede deshacer.</span>
            </div>
            <div style={{ background:"#fef2f2", border:"1px solid #f8717133", borderRadius:10, padding:"10px 14px", marginBottom:18, fontSize:13, color:"#92400e" }}>
              ⚠️ Asegurate de que no haya pedidos activos asignados a esta máquina antes de eliminarla.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn v="dan" onClick={() => { onEliminarMaquina(confirmarElimMaq.id); setConfirmarElimMaq(null); }} style={{ flex:1 }}>
                🗑️ Sí, eliminar máquina
              </Btn>
              <Btn v="gho" onClick={() => setConfirmarElimMaq(null)} style={{ flex:1 }}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};


const Dashboard = ({ pedidos, pagos, clientes, sucursalActiva, usuario }) => {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 30000); return () => clearInterval(t); }, []);
  const sucFija = usuario.rol === "empleado" ? usuario.sucursal : sucursalActiva;
  const filtrar = arr => sucFija === 0 ? arr : arr.filter(p => p.sucursal === sucFija);
  // Dashboard muestra SOLO datos de hoy
  const ped = filtrar(pedidos).filter(p => normFecha(p.fechaIngreso) === normFecha(hoy));
  const pag = filtrar(pagos).filter(p => normFecha(p.fecha || hoy) === normFecha(hoy));
  const pendInicio= ped.filter(p => p.estado === "Pendiente").length;
  const enUso    = ped.filter(p => p.estado === "En uso").length;
  const listos   = ped.filter(p => p.estado === "Listo").length;
  const entregados= ped.filter(p => p.estado === "Entregado").length;
  const recaudado= pag.reduce((a, p) => a + p.monto, 0);
  const sinCobrar= ped.filter(p => p.estadoPago !== "pagado" && p.estado !== "Entregado").reduce((a, p) => a + p.monto, 0);

  // Desglose por método de pago
  const METODOS_INFO = [
    { id: "efectivo",      label: "Efectivo",       icon: "💵", color: "#34d399" },
    { id: "mp_qr",         label: "MP QR",          icon: "🔳", color: "#009ee3" },
    { id: "mp_link",       label: "MP Link",        icon: "🔗", color: "#60a5fa" },
    { id: "transferencia", label: "Transferencia",  icon: "🏦", color: "#a78bfa" },
  ];
  const porMetodo = METODOS_INFO.map(m => ({
    ...m,
    total: pag.filter(p => p.metodo === m.id).reduce((a, p) => a + p.monto, 0),
    cant:  pag.filter(p => p.metodo === m.id).length,
  })).filter(m => m.total > 0);

  // Pendiente desglosado: cuántos pedidos y suma por cada estado
  const pendientes = ped.filter(p => p.estadoPago !== "pagado" && p.estado !== "Entregado");
  const sinCobrarPorEstado = [
    { label: "Listos p/ retirar", color: "#34d399", icon: "✅", peds: pendientes.filter(p => p.estado === "Listo") },
    { label: "En proceso",        color: "#fbbf24", icon: "🔄", peds: pendientes.filter(p => p.estado === "En uso") },
    { label: "Pendiente inicio",  color: "#60a5fa", icon: "⏳", peds: pendientes.filter(p => p.estado === "Pendiente") },
  ].filter(g => g.peds.length > 0);

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>

      {/* PIPELINE DE ESTADOS — barra visual completa */}
      <Card>
        <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 14, color: "#1a1d2e", marginBottom: 14 }}>📊 ESTADO DE PEDIDOS HOY</div>
        <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", height: 10, marginBottom: 16 }}>
          {[
            { val: pendInicio, color: "#60a5fa" },
            { val: enUso,      color: "#fbbf24" },
            { val: listos,     color: "#34d399" },
            { val: entregados, color: "#a78bfa" },
          ].map((s, i) => {
            const total2 = pendInicio + enUso + listos + entregados || 1;
            return <div key={i} style={{ flex: s.val / total2, background: s.color, minWidth: s.val > 0 ? 4 : 0, transition: "flex .5s" }} />;
          })}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Pendiente inicio", val: pendInicio, color: "#60a5fa",  icon: "⏸",  sub: "Sin iniciar" },
            { label: "En proceso",       val: enUso,      color: "#fbbf24",  icon: "🔄",  sub: "En máquina" },
            { label: "Listo p/ retirar", val: listos,     color: "#34d399",  icon: "✅",  sub: "Esperando cliente" },
            { label: "Entregados hoy",   val: entregados, color: "#a78bfa",  icon: "📦",  sub: "Completados" },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, minWidth: 120, background: k.color + "12", border: `1px solid ${k.color}33`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>{k.icon}</span>
                <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 28, color: k.color }}>{k.val}</span>
              </div>
              <div style={{ color: "#1a1d2e", fontSize: 12, fontWeight: 600, marginTop: 6 }}>{k.label}</div>
              <div style={{ color: "#9ca3af", fontSize: 11 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* KPI financiero: dueño ve todo, empleado solo efectivo cobrado */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {usuario.rol === "dueno" ? (
          <>
            {[
              { label: "Recaudado hoy",    val: fmt(recaudado),   color: "#009ee3", icon: "💳", sub: `${pag.length} transacciones` },
              { label: "Pendiente cobro",  val: fmt(sinCobrar),   color: "#f87171", icon: "⏳", sub: `${pendientes.length} pedidos` },
              { label: "Total proyectado", val: fmt(recaudado + sinCobrar), color: "#fbbf24", icon: "📈", sub: "cobrado + pendiente" },
              { label: "Clientes",         val: clientes.filter(c => sucFija === 0 ? true : c.sucursal === sucFija).length, color: "#a78bfa", icon: "👥", sub: "registrados" },
            ].map(k => (
              <Card key={k.label} style={{ flex: 1, minWidth: 140 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{k.label}</div>
                    <div style={{ color: k.color, fontFamily: "Syne", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{k.val}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>{k.sub}</div>
                  </div>
                  <span style={{ fontSize: 22 }}>{k.icon}</span>
                </div>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card style={{ flex: 1, minWidth: 160 }} glow="#34d399">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>💵 Efectivo cobrado</div>
                  <div style={{ color: "#34d399", fontFamily: "Syne", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{fmt(pag.filter(p => p.metodo === "efectivo").reduce((a,p) => a+p.monto, 0))}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>{pag.filter(p => p.metodo === "efectivo").length} cobros en efectivo</div>
                </div>
                <span style={{ fontSize: 22 }}>💵</span>
              </div>
            </Card>
            <Card style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>⏳ Pendiente cobro</div>
                  <div style={{ color: "#f87171", fontFamily: "Syne", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{pendientes.length} pedidos</div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Cobrar al retirar</div>
                </div>
                <span style={{ fontSize: 22 }}>⏳</span>
              </div>
            </Card>
            <Card style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>👥 Clientes</div>
                  <div style={{ color: "#a78bfa", fontFamily: "Syne", fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{clientes.filter(c => c.sucursal === sucFija).length}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>en esta sucursal</div>
                </div>
                <span style={{ fontSize: 22 }}>👥</span>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* RECAUDACIÓN DESGLOSADA */}
      <Card glow="#009ee3">
        <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "#009ee3", marginBottom: 16 }}>
          💳 COMPOSICIÓN DE LA RECAUDACIÓN HOY
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch" }}>

          {/* Total grande */}
          <div style={{ background: "#f4f5fb", borderRadius: 14, padding: "18px 22px", minWidth: 160, display: "flex", flexDirection: "column", justifyContent: "center", border: "1px solid #009ee344" }}>
            <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Total cobrado</div>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 32, color: "#009ee3", lineHeight: 1 }}>{fmt(recaudado)}</div>
            <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>{pag.length} transacciones</div>
          </div>

          {/* Divisor */}
          <div style={{ width: 1, background: "#e2e5ef", alignSelf: "stretch", flexShrink: 0 }} />

          {/* Por método */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
            <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Desglose por medio de pago</div>
            {porMetodo.length === 0 && <div style={{ color: "#333", fontSize: 13 }}>Sin pagos registrados hoy</div>}
            {porMetodo.map(m => (
              <div key={m.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 15 }}>{m.icon}</span>
                    <span style={{ fontSize: 13, color: "#1a1d2e" }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>({m.cant})</span>
                  </div>
                  <span style={{ color: m.color, fontWeight: 700, fontFamily: "Syne", fontSize: 15 }}>{fmt(m.total)}</span>
                </div>
                <Bar val={recaudado ? (m.total / recaudado) * 100 : 0} color={m.color} h={5} />
              </div>
            ))}
          </div>

          {/* Divisor */}
          <div style={{ width: 1, background: "#e2e5ef", alignSelf: "stretch", flexShrink: 0 }} />

          {/* Pendiente por cobrar desglosado */}
          <div style={{ minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Pendiente de cobro</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "#1a1d2e" }}>Total a cobrar</span>
              <span style={{ color: "#f87171", fontWeight: 800, fontFamily: "Syne", fontSize: 18 }}>{fmt(sinCobrar)}</span>
            </div>
            {sinCobrarPorEstado.length === 0 && <div style={{ color: "#333", fontSize: 13 }}>Sin pendientes 🎉</div>}
            {sinCobrarPorEstado.map(g => (
              <div key={g.label} style={{ background: "#f4f5fb", borderRadius: 10, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{g.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, color: g.color }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{g.peds.length} pedido{g.peds.length > 1 ? "s" : ""}</div>
                  </div>
                </div>
                <span style={{ color: "#f87171", fontWeight: 600, fontSize: 14 }}>
                  {fmt(g.peds.reduce((a, p) => a + p.monto, 0))}
                </span>
              </div>
            ))}
            <div style={{ background: "#fef2f2", border: "1px solid #f8717133", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#f87171", marginTop: 2 }}>
              💡 Total proyectado hoy: <strong>{fmt(recaudado + sinCobrar)}</strong>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card style={{ flex: 2, minWidth: 300 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "#fbbf24", marginBottom: 14 }}>🔄 EN PROCESO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ped.filter(p => p.estado === "En uso").map(p => {
              const srv = SERVICIOS.find(s => s.id === p.servicio);
              const cli = clientes.find(c => c.id === p.clienteId);
              const timer = calcTimer(p, srv, ahora);
              const barColor = timer?.vencido ? "#f87171" : timer?.restanteMins <= 5 ? "#f59e0b" : srv?.color || "#00d4ff";
              return (
                <div key={p.id} style={{ background: timer?.vencido ? "#fef2f230" : "#f4f5fb", borderRadius: 12, padding: "12px 14px", border: `1px solid ${timer?.vencido ? "#f8717155" : "transparent"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{cli?.nombre}</span>
                      <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>· {srv?.nombre}</span>
                    </div>
                    <Tag text={p.estadoPago === "pagado" ? "✅ Pagado" : `⏳ ${fmt(p.monto)}`} color={p.estadoPago === "pagado" ? "#34d399" : "#f87171"} />
                  </div>
                  {timer ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 5 }}>
                        <span>🕐 {timer.horaInicioStr} → 🏁 {timer.horaFinEst}</span>
                        <span style={{ fontWeight: 700, color: barColor }}>
                          {timer.vencido ? `⚠️ Venció hace ${Math.abs(timer.restanteMins)} min` : `${timer.restanteMins} min restantes`}
                        </span>
                      </div>
                      <Bar val={timer.pct} color={barColor} />
                    </>
                  ) : (
                    <Bar val={0} color={srv?.color} />
                  )}
                  {p.ubicacionCanasto && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#0ea5e9" }}>🧺 Canasto: <strong>{p.ubicacionCanasto}</strong></div>
                  )}
                </div>
              );
            })}
            {ped.filter(p => p.estado === "En uso").length === 0 && <div style={{ color: "#333", textAlign: "center", padding: 16 }}>Sin pedidos activos</div>}
          </div>
        </Card>
        <Card style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "#a78bfa", marginBottom: 14 }}>SERVICIOS</div>
          {SERVICIOS.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1a1a30" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>{s.icon}</span><span style={{ fontSize: 13 }}>{s.nombre}</span></div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: s.color, fontWeight: 600 }}>{fmt(s.precio)}</div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>{s.duracion}′</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {ped.filter(p => p.estado === "Listo").length > 0 && (
        <Card glow="#34d399">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "#34d399", marginBottom: 12 }}>✅ LISTOS PARA RETIRAR</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {ped.filter(p => p.estado === "Listo").map(p => {
              const cli = clientes.find(c => c.id === p.clienteId);
              const srv = SERVICIOS.find(s => s.id === p.servicio);
              return (
                <div key={p.id} style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 16px", border: "1px solid #34d39955", minWidth: 180 }}>
                  <div style={{ fontWeight: 600 }}>{cli?.nombre}</div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{srv?.icon} {srv?.nombre}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>📞 +{cli?.tel}</div>
                  {p.ubicacionCanasto && (
                    <div style={{ marginTop: 6, background: "#dcfce7", border: "1px solid #34d39966", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#16a34a", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      🧺 {p.ubicacionCanasto}
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}><Tag text={p.estadoPago === "pagado" ? "💳 Pagado" : `⏳ Debe ${fmt(p.monto)}`} color={p.estadoPago === "pagado" ? "#34d399" : "#f87171"} /></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── CAJA ────────────────────────────────────────────────────────────────────
const Caja = ({ pagos, pedidos, clientes, sucursalActiva, usuario }) => {
  const esEmpleado = usuario.rol === "empleado";
  const sucFija = esEmpleado ? usuario.sucursal : sucursalActiva;
  const filtrar = arr => sucFija === 0 ? arr : arr.filter(p => p.sucursal === sucFija);
  // Caja Diaria: solo muestra los pagos del día de hoy
  const pags = filtrar(pagos).filter(p => normFecha(p.fecha || hoy) === normFecha(hoy));

  // Empleado: solo ve efectivo (para cierre de caja manual)
  const pagsEfectivo = pags.filter(p => p.metodo === "efectivo");
  const totalEfectivo = pagsEfectivo.reduce((a, p) => a + p.monto, 0);
  const total = pags.reduce((a, p) => a + p.monto, 0);
  const porMetodo = pags.reduce((acc, p) => { acc[p.metodo] = (acc[p.metodo] || 0) + p.monto; return acc; }, {});
  // porSuc también usa pags (ya filtrado por hoy) — no pagos acumulados
  const porSuc = SUCURSALES.map(s => ({ ...s, total: pags.filter(p => p.sucursal === s.id).reduce((a, p) => a + p.monto, 0) }));
  const [exportando, setExportando] = useState(false);

  const handleExport = () => {
    setExportando(true);
    setTimeout(() => { exportarCajaExcel(pagos, pedidos, clientes, sucFija); setExportando(false); }, 300);
  };

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── VISTA EMPLEADO: solo efectivo ── */}
      {esEmpleado && (
        <>
          <Card glow="#34d399">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <div>
                <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>💵 Efectivo recibido hoy</div>
                <div style={{ fontFamily: "Syne", fontSize: 42, fontWeight: 800, color: "#34d399", lineHeight: 1.1 }}>{fmt(totalEfectivo)}</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{pagsEfectivo.length} cobros en efectivo · {hoy}</div>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #34d39944", borderRadius: 14, padding: "14px 20px", textAlign: "center" }}>
                <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total de pedidos cobrados</div>
                <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18, color: "#1a1d2e" }}>{pagsEfectivo.length}</div>
              </div>
            </div>
          </Card>
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b55", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#92400e" }}>
            ℹ️ Como empleado solo ves el <strong>efectivo que recibiste</strong>. El supervisor tiene acceso a la recaudación total por todos los medios de pago.
          </div>
          <Card>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "#34d399", marginBottom: 14 }}>💵 COBROS EN EFECTIVO</div>
            {pagsEfectivo.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Sin cobros en efectivo hoy</div>}
            {pagsEfectivo.map(p => {
              const cli = clientes.find(c => c.id === p.clienteId);
              return (
                <div key={p.id} style={{ background: "#f4f5fb", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{cli?.nombre || "—"}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{p.pedido} · {p.hora}</div>
                  </div>
                  <span style={{ color: "#34d399", fontFamily: "Syne", fontWeight: 700, fontSize: 16 }}>{fmt(p.monto)}</span>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {/* ── VISTA DUEÑO: recaudación completa ── */}
      {!esEmpleado && (
        <>
          <Card glow="#fbbf24">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Recaudación total hoy</div>
                <div style={{ fontFamily: "Syne", fontSize: 38, fontWeight: 800, color: "#fbbf24", lineHeight: 1.1 }}>{fmt(total)}</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{pags.length} transacciones · {hoy}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {Object.entries(porMetodo).map(([m, v]) => {
                    const mp = METODOS_PAGO.find(x => x.id === m);
                    return <div key={m} style={{ textAlign: "center", background: "#f8f9fc", borderRadius: 10, padding: "8px 14px", border: "1px solid #e2e5ef" }}>
                      <div style={{ color: mp?.color || "#fbbf24", fontFamily: "Syne", fontWeight: 700, fontSize: 18 }}>{fmt(v)}</div>
                      <div style={{ color: "#6b7280", fontSize: 11 }}>{mp?.label || m}</div>
                    </div>;
                  })}
                </div>
                <Btn v="suc" onClick={handleExport} disabled={exportando} style={{ fontSize: 13 }}>
                  {exportando ? "⏳ Generando..." : "📥 Exportar Excel"}
                </Btn>
              </div>
            </div>
          </Card>

          {sucFija === 0 && (
            <Card>
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "#a78bfa", marginBottom: 14 }}>POR SUCURSAL</div>
              {porSuc.map(s => (
                <div key={s.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 14 }}>📍 {s.nombre}</span>
                    <span style={{ color: "#fbbf24", fontWeight: 600 }}>{fmt(s.total)}</span>
                  </div>
                  <Bar val={total ? (s.total / total) * 100 : 0} color="#a78bfa" h={5} />
                </div>
              ))}
            </Card>
          )}

          <Card>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "#34d399", marginBottom: 14 }}>TODAS LAS TRANSACCIONES</div>
            {pags.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Sin pagos registrados</div>}
            {pags.map(p => {
              const cli = clientes.find(c => c.id === p.clienteId);
              const suc = SUCURSALES.find(s => s.id === p.sucursal);
              const mp = METODOS_PAGO.find(m => m.id === p.metodo);
              return (
                <div key={p.id} style={{ background: "#f4f5fb", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{cli?.nombre || "—"}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{p.pedido} · {suc?.nombre} · {p.hora}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Tag text={mp?.label || p.metodo} color={mp?.color || "#6b7280"} />
                    <span style={{ color: "#34d399", fontFamily: "Syne", fontWeight: 700, fontSize: 16 }}>{fmt(p.monto)}</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
};

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
const WAPanel = ({ pedidos, clientes, sucursalActiva, usuario, cfg }) => {
  const sucFija = usuario.rol === "empleado" ? usuario.sucursal : sucursalActiva;
  const [log, setLog] = useState([]);
  const [resumEnviado, setResumEnviado] = useState(false);
  const [pedTicketWA, setPedTicketWA] = useState(null);
  const [pedPreviewWA, setPedPreviewWA] = useState({ open: false, pedido: null, tipo: 'comprobante' });

  // ── Filtros ──
  const [busqTexto, setBusqTexto] = useState("");   // nombre o teléfono
  const [busqFecha, setBusqFecha] = useState("");   // DD/MM/AAAA
  const [busqTipo, setBusqTipo]   = useState("auto"); // "auto" | "nombre" | "tel"

  const ped = (sucFija === 0 ? pedidos : pedidos.filter(p => p.sucursal === sucFija));

  // ── Regla de visibilidad por defecto (sin filtros activos) ──
  // Hoy: todos los estados. Días anteriores: solo los NO entregados (pendiente, en uso, listo)
  const hayFiltro = busqTexto.trim() || busqFecha.trim();

  const pedFiltrados = ped.filter(p => {
    if (hayFiltro) {
      // Si hay filtro activo, mostrar todo lo que coincida (sin restricción de fecha/estado)
      const cli = clientes.find(c => c.id === p.clienteId);
      if (busqFecha.trim()) {
        return normFecha(p.fechaIngreso) === normFecha(busqFecha);
      }
      const q = busqTexto.trim().toLowerCase();
      if (busqTipo === "tel") return (cli?.tel || "").includes(q);
      if (busqTipo === "nombre") return (cli?.nombre || "").toLowerCase().includes(q);
      // "auto": busca en nombre y teléfono
      return (cli?.nombre || "").toLowerCase().includes(q) || (cli?.tel || "").includes(q);
    }
    // Sin filtro: hoy todos, días anteriores solo no entregados
    if (normFecha(p.fechaIngreso) === normFecha(hoy)) return true;
    return p.estado !== "Entregado";
  });

  const addLog = (tipo, canal, cliente, msg) =>
    setLog(l => [{ tipo, canal, cliente, msg, hora: horaActual() }, ...l]);

  const enviarWA = (tipo, p) => {
    const cli = clientes.find(c => c.id === p.clienteId);
    const srv = SERVICIOS.find(s => s.id === p.servicio);
    const suc = SUCURSALES.find(s => s.id === p.sucursal);
    if (!cli?.tel) { alert("El cliente no tiene WhatsApp registrado"); return; }
    const msg = tipo === "comprobante" ? buildWAComprobante(p, cli, srv, suc, cfg)
      : tipo === "listo" ? buildWAListo(p, cli, srv, suc, cfg)
      : buildWARecordatorio(p, cli, srv, suc, cfg);
    addLog(tipo, "wa", cli.nombre, msg);
    window.open(`https://wa.me/${cli.tel}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const enviarEmail = (tipo, p) => {
    const cli = clientes.find(c => c.id === p.clienteId);
    const srv = SERVICIOS.find(s => s.id === p.servicio);
    const suc = SUCURSALES.find(s => s.id === p.sucursal);
    if (!cli?.email) { alert("El cliente no tiene email registrado"); return; }
    const datos = tipo === "listo" ? buildEmailListo(p, cli, srv, suc, cfg) : buildEmailComprobante(p, cli, srv, suc, cfg);
    addLog(tipo, "email", cli.nombre, datos.body);
    abrirMailto(cli.email, datos.subject, datos.body);
  };

  const enviarResumen = () => {
    const listos = ped.filter(p => p.estado === "Listo").length;
    const enUso  = ped.filter(p => p.estado === "En uso").length;
    const rec    = ped.filter(p => p.estadoPago === "pagado").reduce((a, p) => a + p.monto, 0);
    const sinCob = ped.filter(p => p.estadoPago !== "pagado" && p.estado !== "Entregado").reduce((a, p) => a + p.monto, 0);
    const msgWA  = `${cfg.icono} *${cfg.empresa} — Resumen ${hoy}*\n\n✅ Listos para retirar: ${listos}\n🔄 En proceso: ${enUso}\n💰 Recaudado: ${fmt(rec)}\n⏳ Pendiente cobro: ${fmt(sinCob)}\n\n¡Buen trabajo! 💪`;
    const subjEmail = `[${cfg.empresa}] Resumen del día — ${hoy}`;
    const bodyEmail = `Resumen operativo — ${hoy}\n\nListos para retirar: ${listos}\nEn proceso: ${enUso}\nRecaudado: ${fmt(rec)}\nPendiente de cobro: ${fmt(sinCob)}\n\n${cfg.empresa}`;
    if (cfg.waReporte && cfg.waNumero) {
      addLog("resumen","wa","Supervisor",msgWA);
      window.open(`https://wa.me/${cfg.waNumero}?text=${encodeURIComponent(msgWA)}`, "_blank");
    }
    if (cfg.emailReporte && cfg.emailDueno) {
      addLog("resumen","email","Supervisor",bodyEmail);
      setTimeout(() => abrirMailto(cfg.emailDueno, subjEmail, bodyEmail), 500);
    }
    setResumEnviado(true); setTimeout(() => setResumEnviado(false), 3000);
  };

  const TIPO_COL = { comprobante: "#00d4ff", listo: "#34d399", recordatorio: "#60a5fa", resumen: "#a78bfa" };
  const TIPO_LAB = { comprobante: "📋 Comprobante", listo: "✅ Listo", recordatorio: "⏰ Recordatorio", resumen: "📊 Resumen" };
  const CANAL_COL = { wa: "#25d366", email: "#60a5fa" };
  const CANAL_LAB = { wa: "📲 WA", email: "✉️ Mail" };

  // Conteo para badge informativo
  const totalHoy     = ped.filter(p => normFecha(p.fechaIngreso) === normFecha(hoy)).length;
  const totalPendAnt = ped.filter(p => normFecha(p.fechaIngreso) !== normFecha(hoy) && p.estado !== "Entregado").length;

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
      {usuario.rol === "dueno" && (
        <Card glow="#25d366">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "Syne", fontWeight: 800, color: "#25d366", fontSize: 16 }}>📊 Resumen al supervisor</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 3 }}>
                Canales activos: {[cfg.waReporte && "📲 WA", cfg.emailReporte && cfg.emailDueno && "✉️ Email"].filter(Boolean).join(" · ") || "Ninguno configurado"}
              </div>
              <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                Frecuencia: {cfg.waFrecuencia === "diario" ? `Diario a las ${cfg.waHora}` : `Cada ${cfg.waIntervaloHs}hs`}
              </div>
            </div>
            <Btn v="wa" onClick={enviarResumen}>{resumEnviado ? "✅ Enviado" : "📤 Enviar ahora"}</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontFamily: "Syne", fontWeight: 800, color: "#25d366", fontSize: 15, marginBottom: 14 }}>💬 NOTIFICACIONES POR PEDIDO</div>

        {/* ── Barra de filtros ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, background: "#f4f5fb", borderRadius: 12, padding: 14, border: "1px solid #e2e5ef" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

            {/* Toggle tipo búsqueda texto */}
            <div style={{ display: "flex", background: "#e8eaf2", borderRadius: 10, padding: 3, gap: 2 }}>
              {[["auto","🔍 Todos"],["nombre","👤 Nombre"],["tel","📱 Teléfono"]].map(([v,lbl]) => (
                <button key={v} onClick={() => { setBusqTipo(v); setBusqTexto(""); setBusqFecha(""); }}
                  style={{ padding: "5px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                    background: busqTipo === v && !busqFecha ? "#fff" : "transparent",
                    color: busqTipo === v && !busqFecha ? "#25d366" : "#6b7280",
                    fontFamily: "Outfit", fontWeight: busqTipo === v && !busqFecha ? 700 : 400,
                    boxShadow: busqTipo === v && !busqFecha ? "0 1px 4px #0002" : "none",
                  }}>{lbl}</button>
              ))}
              <button onClick={() => { setBusqTipo("fecha"); setBusqTexto(""); }}
                style={{ padding: "5px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
                  background: busqFecha ? "#fff" : "transparent",
                  color: busqFecha ? "#25d366" : "#6b7280",
                  fontFamily: "Outfit", fontWeight: busqFecha ? 700 : 400,
                  boxShadow: busqFecha ? "0 1px 4px #0002" : "none",
                }}>📅 Día</button>
            </div>

            {/* Input texto o fecha */}
            {busqTipo !== "fecha" ? (
              <div style={{ flex: 1, position: "relative", minWidth: 180 }}>
                <input
                  value={busqTexto}
                  onChange={e => { setBusqTexto(e.target.value); setBusqFecha(""); }}
                  placeholder={busqTipo === "tel" ? "Buscar por teléfono..." : busqTipo === "nombre" ? "Buscar por nombre..." : "Buscar por nombre o teléfono..."}
                  style={{ width: "100%", background: "#fff", border: `1px solid ${busqTexto ? "#25d366" : "#d0d5e8"}`, borderRadius: 10, padding: "8px 34px 8px 13px", fontSize: 13, color: "#1a1d2e", outline: "none", fontFamily: "Outfit" }}
                />
                {busqTexto
                  ? <button onClick={() => setBusqTexto("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 15 }}>✕</button>
                  : <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
                }
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 180 }}>
                <input
                  type="text" value={busqFecha}
                  onChange={e => setBusqFecha(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  style={{ flex: 1, background: "#fff", border: `1px solid ${busqFecha ? "#25d366" : "#d0d5e8"}`, borderRadius: 10, padding: "8px 13px", fontSize: 13, color: "#1a1d2e", outline: "none", fontFamily: "Outfit" }}
                />
                {busqFecha
                  ? <button onClick={() => setBusqFecha("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 15 }}>✕</button>
                  : <button onClick={() => setBusqFecha(hoy)} style={{ background: "#25d36622", border: "1px solid #25d36644", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#25d366", cursor: "pointer", fontFamily: "Outfit", whiteSpace: "nowrap" }}>Hoy</button>
                }
              </div>
            )}

            {/* Limpiar todo */}
            {(busqTexto || busqFecha) && (
              <button onClick={() => { setBusqTexto(""); setBusqFecha(""); setBusqTipo("auto"); }}
                style={{ background: "none", border: "1px solid #d0d5e8", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#9ca3af", cursor: "pointer", fontFamily: "Outfit" }}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Info de qué se está mostrando */}
          <div style={{ fontSize: 12, color: "#6b7280", display: "flex", gap: 12, flexWrap: "wrap" }}>
            {!hayFiltro ? (
              <>
                <span>📅 Hoy: <strong style={{ color: "#1a1d2e" }}>{totalHoy}</strong> pedidos</span>
                {totalPendAnt > 0 && <span>⏳ Días anteriores pendientes: <strong style={{ color: "#f59e0b" }}>{totalPendAnt}</strong></span>}
                <span style={{ color: "#9ca3af" }}>— Los entregados de días anteriores se ocultan. Buscá por fecha para verlos.</span>
              </>
            ) : (
              <span>{pedFiltrados.length === 0 ? "Sin resultados" : `${pedFiltrados.length} pedido${pedFiltrados.length !== 1 ? "s" : ""} encontrado${pedFiltrados.length !== 1 ? "s" : ""}`}</span>
            )}
          </div>
        </div>

        {/* ── Lista de pedidos ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pedFiltrados.map(p => {
            const cli = clientes.find(c => c.id === p.clienteId);
            const srv = SERVICIOS.find(s => s.id === p.servicio);
            const tieneWA    = !!cli?.tel;
            const tieneEmail = !!cli?.email;
            const esDeAyer   = p.fechaIngreso !== hoy;
            return (
              <div key={p.id} style={{ background: "#f4f5fb", borderRadius: 14, padding: "14px 16px", border: `1px solid ${esDeAyer ? "#f59e0b33" : "#1e1e3a"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{cli?.nombre}</span>
                      {esDeAyer && <span style={{ fontSize: 11, background: "#f59e0b22", color: "#f59e0b", borderRadius: 6, padding: "1px 7px", fontWeight: 600 }}>📅 {p.fechaIngreso}</span>}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12, display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                      {tieneWA    && <span>📲 +{cli.tel}</span>}
                      {tieneEmail && <span>✉️ {cli.email}</span>}
                      <span>{srv?.icon} {srv?.nombre}</span>
                      <Tag text={labelEstado(p.estado)} color={EST_PED_COL[p.estado]} />
                    </div>
                  </div>
                </div>
                {/* Ticket impreso */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <Btn v="gho" onClick={() => setPedTicketWA(p)} style={{ fontSize: 12, padding: "5px 12px" }}>🖨️ Ver ticket</Btn>
                </div>
                {/* Comprobante */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ color: "#9ca3af", fontSize: 12, alignSelf: "center", minWidth: 88 }}>📋 Comprobante:</span>
                  {(tieneWA || tieneEmail) && <Btn v="wa" onClick={() => setPedPreviewWA({ open:true, pedido:p, tipo:"comprobante" })} style={{ fontSize: 12, padding: "5px 10px" }}>👁 Ver y enviar</Btn>}
                  {!tieneWA && !tieneEmail && <span style={{ color: "#9ca3af", fontSize: 12 }}>Sin contacto registrado</span>}
                </div>
                {/* Listo */}
                {p.estado === "Listo" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ color: "#9ca3af", fontSize: 12, alignSelf: "center", minWidth: 88 }}>✅ Listo aviso:</span>
                    {(tieneWA || tieneEmail) && <Btn v="suc" onClick={() => setPedPreviewWA({ open:true, pedido:p, tipo:"listo" })} style={{ fontSize: 12, padding: "5px 10px", color:"#fff" }}>👁 Ver y enviar</Btn>}
                  </div>
                )}
                {/* Recordatorio */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ color: "#9ca3af", fontSize: 12, alignSelf: "center", minWidth: 88 }}>⏰ Recordatorio:</span>
                  {tieneWA && <Btn v="gho" onClick={() => setPedPreviewWA({ open:true, pedido:p, tipo:"recordatorio" })} style={{ fontSize: 12, padding: "5px 10px" }}>👁 Ver y enviar</Btn>}
                </div>
              </div>
            );
          })}
          {pedFiltrados.length === 0 && (
            <div style={{ color: "#9ca3af", textAlign: "center", padding: 30 }}>
              {hayFiltro ? "Sin resultados para esa búsqueda" : "Sin pedidos para mostrar"}
            </div>
          )}
        </div>
      </Card>

      {log.length > 0 && (
        <Card>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14, color: "#9ca3af", marginBottom: 12 }}>REGISTRO DE ENVÍOS</div>
          {log.slice(0, 8).map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #1a1a30" }}>
              <div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Tag text={TIPO_LAB[l.tipo]} color={TIPO_COL[l.tipo]} />
                  <Tag text={CANAL_LAB[l.canal]} color={CANAL_COL[l.canal]} />
                </div>
                <div style={{ color: "#1a1d2e", fontSize: 13, marginTop: 5 }}>{l.msg.slice(0, 90)}…</div>
                <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>A: {l.cliente}</div>
              </div>
              <div style={{ color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap" }}>{l.hora}</div>
            </div>
          ))}
        </Card>
      )}
      <ModalTicket
        open={!!pedTicketWA}
        onClose={() => setPedTicketWA(null)}
        pedido={pedTicketWA}
        cliente={pedTicketWA ? clientes.find(c => c.id === pedTicketWA.clienteId) : null}
        cfg={cfg}
      />
      <ModalPreviewWA
        open={pedPreviewWA.open}
        onClose={() => setPedPreviewWA({ open:false, pedido:null, tipo:"comprobante" })}
        pedido={pedPreviewWA.pedido}
        cliente={pedPreviewWA.pedido ? clientes.find(c => c.id === pedPreviewWA.pedido.clienteId) : null}
        tipo={pedPreviewWA.tipo}
        cfg={cfg}
      />
    </div>
  );
};

// ─── SUCURSALES (solo dueño) ──────────────────────────────────────────────────
// ─── HORARIO DISPLAY ─────────────────────────────────────────────────────────
const HorarioTexto = ({ s }) => {
  const turnoStr = (d, h) => d && h ? `${d} a ${h}` : null;
  const lv = s.lvHorarioCorrido
    ? turnoStr(s.lvTurno1Desde, s.lvTurno1Hasta)
    : [turnoStr(s.lvTurno1Desde, s.lvTurno1Hasta), turnoStr(s.lvTurno2Desde, s.lvTurno2Hasta)].filter(Boolean).join(" / ");
  const sab = !s.sabAbre ? "Cerrado" :
    s.sabHorarioCorrido
      ? turnoStr(s.sabTurno1Desde, s.sabTurno1Hasta)
      : [turnoStr(s.sabTurno1Desde, s.sabTurno1Hasta), turnoStr(s.sabTurno2Desde, s.sabTurno2Hasta)].filter(Boolean).join(" / ");
  return (
    <div style={{ fontSize:12, color:"#4b5563", display:"flex", flexDirection:"column", gap:3 }}>
      <div>🗓 Lun–Vie: <strong>{lv || "—"}</strong></div>
      <div>📅 Sábados: <strong style={{ color: s.sabAbre ? "#1a1d2e":"#f87171" }}>{sab}</strong></div>
      <div style={{ color:"#f87171" }}>🚫 Domingos: Cerrado</div>
    </div>
  );
};

// ─── FORM SUCURSAL (horarios por turno) ──────────────────────────────────────
const FormSucursal = ({ inicial, onGuardar, onCancelar }) => {
  const INIT = {
    nombre:"", direccion:"", ciudad:"", tel:"", mpAlias:"",
    lvTurno1Desde:"09:00", lvTurno1Hasta:"20:00",
    lvTurno2Desde:"14:00", lvTurno2Hasta:"20:00",
    lvHorarioCorrido: true,
    sabAbre: true,
    sabTurno1Desde:"09:00", sabTurno1Hasta:"13:00",
    sabTurno2Desde:"", sabTurno2Hasta:"",
    sabHorarioCorrido: true,
    domAbre: false,
  };
  const [f, setF] = useState(inicial || INIT);
  const [guardando, setGuardando] = useState(false);
  const ok = f.nombre.trim() && f.ciudad.trim();
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    await onGuardar(f);
    setGuardando(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Datos básicos */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
        <Inp label="Nombre *" value={f.nombre} onChange={e => set("nombre",e.target.value)} placeholder="Ej: Palermo" />
        <Inp label="Ciudad *" value={f.ciudad} onChange={e => set("ciudad",e.target.value)} placeholder="Ej: CABA" />
        <Inp label="Dirección" value={f.direccion} onChange={e => set("direccion",e.target.value)} placeholder="Av. Santa Fe 1234" />
        <Inp label="Teléfono" value={f.tel} onChange={e => set("tel",e.target.value)} placeholder="011-xxxx-xxxx" />
        <Inp label="Alias Mercado Pago" value={f.mpAlias} onChange={e => set("mpAlias",e.target.value)} placeholder="lavawash.sucursal" />
      </div>

      {/* Horarios Lunes a Viernes */}
      <div style={{ background:"#f0f9ff", border:"1px solid #0ea5e933", borderRadius:14, padding:16 }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#0ea5e9", marginBottom:12 }}>🗓 Horario Lunes a Viernes</div>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
            <input type="checkbox" checked={f.lvHorarioCorrido} onChange={e => set("lvHorarioCorrido", e.target.checked)}
              style={{ width:16, height:16, cursor:"pointer" }} />
            Horario corrido (sin corte al mediodía)
          </label>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Inp label={f.lvHorarioCorrido ? "Desde" : "Turno mañana — Desde"} type="time" value={f.lvTurno1Desde} onChange={e => set("lvTurno1Desde",e.target.value)} />
          <Inp label={f.lvHorarioCorrido ? "Hasta" : "Turno mañana — Hasta"} type="time" value={f.lvTurno1Hasta} onChange={e => set("lvTurno1Hasta",e.target.value)} />
          {!f.lvHorarioCorrido && <>
            <Inp label="Turno tarde — Desde" type="time" value={f.lvTurno2Desde} onChange={e => set("lvTurno2Desde",e.target.value)} />
            <Inp label="Turno tarde — Hasta" type="time" value={f.lvTurno2Hasta} onChange={e => set("lvTurno2Hasta",e.target.value)} />
          </>}
        </div>
      </div>

      {/* Sábados */}
      <div style={{ background:"#fef9f0", border:"1px solid #fbbf2433", borderRadius:14, padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#f59e0b" }}>📅 Sábados</div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
            <input type="checkbox" checked={f.sabAbre} onChange={e => set("sabAbre", e.target.checked)}
              style={{ width:16, height:16, cursor:"pointer" }} />
            Abre los sábados
          </label>
        </div>
        {f.sabAbre && (
          <>
            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                <input type="checkbox" checked={f.sabHorarioCorrido} onChange={e => set("sabHorarioCorrido", e.target.checked)}
                  style={{ width:16, height:16, cursor:"pointer" }} />
                Horario corrido
              </label>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Inp label={f.sabHorarioCorrido ? "Desde" : "Turno mañana — Desde"} type="time" value={f.sabTurno1Desde} onChange={e => set("sabTurno1Desde",e.target.value)} />
              <Inp label={f.sabHorarioCorrido ? "Hasta" : "Turno mañana — Hasta"} type="time" value={f.sabTurno1Hasta} onChange={e => set("sabTurno1Hasta",e.target.value)} />
              {!f.sabHorarioCorrido && <>
                <Inp label="Turno tarde — Desde" type="time" value={f.sabTurno2Desde} onChange={e => set("sabTurno2Desde",e.target.value)} />
                <Inp label="Turno tarde — Hasta" type="time" value={f.sabTurno2Hasta} onChange={e => set("sabTurno2Hasta",e.target.value)} />
              </>}
            </div>
          </>
        )}
        {!f.sabAbre && <div style={{ color:"#f87171", fontSize:13 }}>🚫 Cerrado los sábados</div>}
      </div>

      <div style={{ background:"#fef2f2", border:"1px solid #f8717133", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#6b7280" }}>
        🚫 <strong>Domingos:</strong> siempre cerrado
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <Btn v="suc" onClick={guardar} disabled={!ok || guardando} style={{ flex:1 }}>
          {guardando ? "⏳ Guardando..." : "Guardar sucursal"}
        </Btn>
        <Btn v="gho" onClick={onCancelar}>Cancelar</Btn>
      </div>
    </div>
  );
};

// ─── PROVEEDORES & PEDIDOS DE INSUMOS ────────────────────────────────────────

const ProveedoresPanel = ({ usuario, proveedores, pedidosInsumos, onGuardarProveedor, onEliminarProveedor, onGuardarPedidoInsumo, onActualizarEstadoInsumo, toast }) => {
  const [tab, setTab] = useState(usuario.rol === "dueno" ? "pedidos" : "nuevo");
  const [showFormProv, setShowFormProv] = useState(false);
  const [editProv, setEditProv] = useState(null);
  const [formProv, setFormProv] = useState({ nombre: "", contacto: "", tel: "", email: "", productos: "", notas: "" });
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // proveedor a eliminar
  const [trackingOpen, setTrackingOpen] = useState(null); // id pedido con tracking abierto

  // Form nuevo pedido insumo
  const [formPed, setFormPed] = useState({
    proveedorId: "", producto: "", cantidad: "", unidad: "", urgente: false, notas: "",
    sucursal: usuario.rol === "empleado" ? usuario.sucursal : 1,
  });
  const [guardandoPed, setGuardandoPed] = useState(false);

  const EST_COL = { pendiente: "#f59e0b", enviado: "#60a5fa", recibido: "#34d399", resuelto: "#10b981", cancelado: "#9ca3af" };
  const EST_LAB = { pendiente: "⏳ Pendiente", enviado: "📤 Enviado al proveedor", recibido: "📥 Mercadería recibida", resuelto: "✅ Resuelto", cancelado: "✕ Cancelado" };
  // Flujo de estados posibles desde cada estado
  const EST_NEXT = {
    pendiente: [{ val: "enviado", label: "📤 Marcar enviado", v: "pri" }, { val: "cancelado", label: "✕ Cancelar", v: "gho" }],
    enviado:   [{ val: "recibido", label: "📥 Mercadería recibida", v: "suc" }, { val: "cancelado", label: "✕ Cancelar", v: "gho" }],
    recibido:  [{ val: "resuelto", label: "✅ Marcar resuelto", v: "suc" }],
    resuelto:  [],
    cancelado: [],
  };

  const abrirFormProv = (p = null) => {
    setEditProv(p?.id || null);
    setFormProv(p ? { nombre: p.nombre, contacto: p.contacto || "", tel: p.tel || "", email: p.email || "", productos: p.productos || "", notas: p.notas || "" }
      : { nombre: "", contacto: "", tel: "", email: "", productos: "", notas: "" });
    setShowFormProv(true);
  };

  const guardarProv = async () => {
    if (!formProv.nombre.trim()) return;
    await onGuardarProveedor(formProv, editProv);
    setShowFormProv(false); setEditProv(null);
  };

  const enviarPedido = async () => {
    if (!formPed.producto.trim() || !formPed.cantidad.trim()) return;
    setGuardandoPed(true);
    await onGuardarPedidoInsumo({
      ...formPed,
      sucursal: Number(formPed.sucursal),
      solicitadoPor: usuario.nombre,
      fecha: hoy,
      estado: "pendiente",
    });
    setFormPed({ proveedorId: "", producto: "", cantidad: "", unidad: "", urgente: false, notas: "", sucursal: usuario.rol === "empleado" ? usuario.sucursal : 1 });
    setGuardandoPed(false);
    toast("Pedido de insumo enviado", "ok", "✅ Listo");
  };

  const pedsFiltrados = usuario.rol === "dueno"
    ? pedidosInsumos
    : pedidosInsumos.filter(p => p.sucursal === usuario.sucursal || p.solicitadoPor === usuario.nombre);

  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {usuario.rol === "dueno" && (
          <button onClick={() => setTab("pedidos")} style={{ padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Outfit", fontWeight: tab === "pedidos" ? 700 : 400, background: tab === "pedidos" ? "#f59e0b" : "#e8eaf2", color: tab === "pedidos" ? "#fff" : "#4b5563" }}>
            📋 Pedidos {pedsFiltrados.filter(p => p.estado === "pendiente").length > 0 && <span style={{ background: "#fff3", borderRadius: 99, padding: "0 6px", marginLeft: 4, fontSize: 11 }}>{pedsFiltrados.filter(p => p.estado === "pendiente").length}</span>}
          </button>
        )}
        <button onClick={() => setTab("nuevo")} style={{ padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Outfit", fontWeight: tab === "nuevo" ? 700 : 400, background: tab === "nuevo" ? "#0ea5e9" : "#e8eaf2", color: tab === "nuevo" ? "#fff" : "#4b5563" }}>
          ➕ Nuevo pedido
        </button>
        {usuario.rol === "dueno" && (
          <button onClick={() => setTab("proveedores")} style={{ padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "Outfit", fontWeight: tab === "proveedores" ? 700 : 400, background: tab === "proveedores" ? "#a78bfa" : "#e8eaf2", color: tab === "proveedores" ? "#fff" : "#4b5563" }}>
            🏢 Proveedores
          </button>
        )}
      </div>

      {/* ── Tab: Nuevo pedido ── */}
      {tab === "nuevo" && (
        <Card glow="#0ea5e9">
          <div style={{ fontFamily: "Syne", fontWeight: 800, color: "#0ea5e9", fontSize: 15, marginBottom: 16 }}>➕ SOLICITAR INSUMO / MATERIA PRIMA</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {usuario.rol === "dueno" ? (
              <Sel label="Sucursal que lo necesita" value={formPed.sucursal} onChange={e => setFormPed({ ...formPed, sucursal: Number(e.target.value) })}>
                {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Sel>
            ) : (
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                📍 Sucursal: <strong>{SUCURSALES.find(s => s.id === usuario.sucursal)?.nombre || `#${usuario.sucursal}`}</strong>
              </div>
            )}
            {proveedores.length > 0 && (
              <Sel label="Proveedor (opcional)" value={formPed.proveedorId} onChange={e => setFormPed({ ...formPed, proveedorId: e.target.value })}>
                <option value="">Sin proveedor específico</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}{p.productos ? ` — ${p.productos}` : ""}</option>)}
              </Sel>
            )}
            <Inp label="Producto / insumo *" value={formPed.producto} onChange={e => setFormPed({ ...formPed, producto: e.target.value })} placeholder="Ej: Perfume floral, Jabón líquido, Bolsas..." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="Cantidad *" value={formPed.cantidad} onChange={e => setFormPed({ ...formPed, cantidad: e.target.value })} placeholder="Ej: 5" />
              <Inp label="Unidad" value={formPed.unidad} onChange={e => setFormPed({ ...formPed, unidad: e.target.value })} placeholder="Ej: litros, kg, unidades..." />
            </div>
            <Textarea label="Notas adicionales" value={formPed.notas} onChange={e => setFormPed({ ...formPed, notas: e.target.value })} placeholder="Marca preferida, urgencia, instrucciones especiales..." />
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <div onClick={() => setFormPed({ ...formPed, urgente: !formPed.urgente })} style={{ width: 36, height: 20, borderRadius: 99, background: formPed.urgente ? "#f87171" : "#d0d5e8", position: "relative", transition: "background .2s", cursor: "pointer", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: formPed.urgente ? 19 : 3, transition: "left .2s", boxShadow: "0 1px 3px #0003" }} />
              </div>
              <span style={{ fontSize: 13, color: formPed.urgente ? "#f87171" : "#6b7280", fontWeight: formPed.urgente ? 700 : 400 }}>🚨 Urgente</span>
            </label>
            <Btn v="pri" onClick={enviarPedido} disabled={!formPed.producto.trim() || !formPed.cantidad.trim() || guardandoPed} style={{ alignSelf: "flex-start" }}>
              {guardandoPed ? "Enviando..." : "📤 Enviar pedido al supervisor"}
            </Btn>
          </div>
        </Card>
      )}

      {/* ── Tab: Lista de pedidos (dueño) ── */}
      {tab === "pedidos" && usuario.rol === "dueno" && (
        <Card>
          <div style={{ fontFamily: "Syne", fontWeight: 800, color: "#f59e0b", fontSize: 15, marginBottom: 16 }}>📋 PEDIDOS DE INSUMOS</div>
          {pedsFiltrados.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", padding: 30 }}>Sin pedidos de insumos</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...pedsFiltrados].sort((a, b) => {
              if (a.urgente && !b.urgente) return -1;
              if (!a.urgente && b.urgente) return 1;
              const ord = { pendiente: 0, enviado: 1, recibido: 2, resuelto: 3, cancelado: 4 };
              return (ord[a.estado] ?? 9) - (ord[b.estado] ?? 9);
            }).map(p => {
              const prov = proveedores.find(pr => pr.id === p.proveedorId);
              const suc = SUCURSALES.find(s => s.id === p.sucursal);
              const trackingAbierto = trackingOpen === p.id;
              return (
                <div key={p.id} style={{ background: "#f4f5fb", borderRadius: 14, padding: "14px 16px", border: `1px solid ${p.urgente ? "#f8717155" : "#e2e5ef"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        {p.urgente && <span style={{ background: "#fef2f2", color: "#f87171", borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>🚨 URGENTE</span>}
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{p.producto}</span>
                        {p.cantidad && <span style={{ color: "#6b7280", fontSize: 13 }}>· {p.cantidad} {p.unidad}</span>}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span>📍 {suc?.nombre || `Suc. ${p.sucursal}`}</span>
                        <span>👤 {p.solicitadoPor}</span>
                        <span>📅 {p.fecha}</span>
                        {prov && <span>🏢 {prov.nombre}</span>}
                      </div>
                      {p.notas && <div style={{ color: "#374151", fontSize: 12, marginTop: 4, fontStyle: "italic" }}>📝 {p.notas}</div>}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {/* Badge estado */}
                      <span style={{ background: (EST_COL[p.estado] || "#9ca3af") + "22", color: EST_COL[p.estado] || "#9ca3af", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                        {EST_LAB[p.estado] || p.estado}
                      </span>
                      {/* Botones de avance de estado */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {(EST_NEXT[p.estado] || []).map(next => (
                          <Btn key={next.val} v={next.v} onClick={() => onActualizarEstadoInsumo(p.id, next.val, usuario.nombre)} style={{ fontSize: 11, padding: "4px 10px" }}>
                            {next.label}
                          </Btn>
                        ))}
                        {/* Botón tracking */}
                        <Btn v="gho" onClick={() => setTrackingOpen(trackingAbierto ? null : p.id)} style={{ fontSize: 11, padding: "4px 10px", color: "#a78bfa", borderColor: "#a78bfa" }}>
                          📋 {trackingAbierto ? "Ocultar" : "Ver historial"}
                        </Btn>
                      </div>
                    </div>
                  </div>

                  {/* Tracking expandible */}
                  {trackingAbierto && (
                    <div style={{ marginTop: 10, borderTop: "1px solid #e2e5ef", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>📋 Historial de cambios</div>
                      {(!p.tracking || p.tracking.length === 0) ? (
                        <div style={{ color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>Sin historial registrado aún</div>
                      ) : (
                        <div style={{ position: "relative", paddingLeft: 24 }}>
                          <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "#e2e5ef", borderRadius: 99 }} />
                          {p.tracking.map((t, i) => (
                            <div key={i} style={{ position: "relative", marginBottom: 12 }}>
                              <div style={{ position: "absolute", left: -20, top: 2, width: 12, height: 12, borderRadius: "50%", background: EST_COL[t.estadoNuevo] || "#9ca3af", border: "2px solid #fff", boxShadow: "0 1px 3px #0002" }} />
                              <div style={{ background: "#fff", border: "1px solid #e2e5ef", borderRadius: 10, padding: "8px 12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontWeight: 700, fontSize: 12, color: EST_COL[t.estadoNuevo] || "#374151" }}>{EST_LAB[t.estadoNuevo] || t.estadoNuevo}</span>
                                  <span style={{ color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap" }}>{t.hora}</span>
                                </div>
                                {t.estadoAnterior && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Desde: {EST_LAB[t.estadoAnterior] || t.estadoAnterior}</div>}
                                {t.usuario && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>👤 {t.usuario}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Tab: ABM Proveedores ── */}
      {tab === "proveedores" && usuario.rol === "dueno" && (
        <Card glow="#a78bfa">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "Syne", fontWeight: 800, color: "#a78bfa", fontSize: 15 }}>🏢 PROVEEDORES</div>
            <Btn v="rol" onClick={() => abrirFormProv()}>+ Nuevo proveedor</Btn>
          </div>

          {showFormProv && (
            <div style={{ background: "#f0f2f8", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #a78bfa44" }}>
              <div style={{ fontWeight: 700, color: "#a78bfa", marginBottom: 12 }}>{editProv ? "✏️ Editar proveedor" : "➕ Nuevo proveedor"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Inp label="Nombre / Razón social *" value={formProv.nombre} onChange={e => setFormProv({ ...formProv, nombre: e.target.value })} placeholder="Ej: Distribuidora Limpieza SA" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Inp label="Contacto" value={formProv.contacto} onChange={e => setFormProv({ ...formProv, contacto: e.target.value })} placeholder="Nombre del vendedor" />
                  <Inp label="Teléfono / WhatsApp" value={formProv.tel} onChange={e => setFormProv({ ...formProv, tel: e.target.value })} placeholder="5491xxxxxxxx" />
                </div>
                <Inp label="Email" value={formProv.email} onChange={e => setFormProv({ ...formProv, email: e.target.value })} placeholder="ventas@proveedor.com" />
                <Inp label="Productos que provee" value={formProv.productos} onChange={e => setFormProv({ ...formProv, productos: e.target.value })} placeholder="Ej: Jabón líquido, perfume, bolsas..." />
                <Textarea label="Notas" value={formProv.notas} onChange={e => setFormProv({ ...formProv, notas: e.target.value })} placeholder="Días de entrega, mínimo de compra, etc." />
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn v="suc" onClick={guardarProv} disabled={!formProv.nombre.trim()} style={{ flex: 1 }}>💾 Guardar</Btn>
                  <Btn v="gho" onClick={() => { setShowFormProv(false); setEditProv(null); }}>Cancelar</Btn>
                </div>
              </div>
            </div>
          )}

          {/* Modal confirmación eliminar */}
          {confirmarEliminar && (
            <div style={{ background: "#fef2f2", border: "1px solid #f8717155", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#f87171", marginBottom: 8 }}>⚠️ ¿Eliminar proveedor?</div>
              <div style={{ color: "#374151", fontSize: 13, marginBottom: 14 }}>
                Estás por eliminar a <strong>{confirmarEliminar.nombre}</strong>. Esta acción no se puede deshacer.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn v="gho" onClick={() => { onEliminarProveedor(confirmarEliminar.id); setConfirmarEliminar(null); }} style={{ background: "#f87171", color: "#fff", borderColor: "#f87171" }}>
                  🗑 Sí, eliminar
                </Btn>
                <Btn v="gho" onClick={() => setConfirmarEliminar(null)}>Cancelar</Btn>
              </div>
            </div>
          )}

          {proveedores.length === 0 && !showFormProv && (
            <div style={{ color: "#9ca3af", textAlign: "center", padding: 30 }}>No hay proveedores cargados todavía</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {proveedores.map(p => (
              <div key={p.id} style={{ background: "#f4f5fb", borderRadius: 14, padding: "14px 16px", border: "1px solid #e2e5ef" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🏢 {p.nombre}</div>
                    <div style={{ color: "#6b7280", fontSize: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {p.contacto && <span>👤 {p.contacto}</span>}
                      {p.tel && <span>📱 +{p.tel}</span>}
                      {p.email && <span>✉️ {p.email}</span>}
                    </div>
                    {p.productos && <div style={{ color: "#374151", fontSize: 12, marginTop: 4 }}>📦 {p.productos}</div>}
                    {p.notas && <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 3, fontStyle: "italic" }}>📝 {p.notas}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    {p.tel && <a href={`https://wa.me/${p.tel}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><Btn v="wa" style={{ fontSize: 11, padding: "5px 10px" }}>📲 WA</Btn></a>}
                    <Btn v="gho" onClick={() => abrirFormProv(p)} style={{ fontSize: 11, padding: "5px 10px" }}>✏️ Editar</Btn>
                    <Btn v="gho" onClick={() => setConfirmarEliminar(p)} style={{ fontSize: 11, padding: "5px 10px", color: "#f87171", borderColor: "#f8717155" }}>
                      🗑 Eliminar
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── SUCURSALES ABM ───────────────────────────────────────────────────────────
const Sucursales = ({ pedidos, clientes, sucursales, onGuardar, onEliminar }) => {
  const lista = sucursales && sucursales.length > 0 ? sucursales : SUCURSALES;
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);

  const guardar = async (f) => {
    await onGuardar(f, editando?.id || null);
    setShowForm(false); setEditando(null);
  };

  return (
    <div style={{ padding:28, display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <Btn onClick={() => { setEditando(null); setShowForm(true); }}>+ Nueva sucursal</Btn>
      </div>

      {showForm && (
        <Card glow="#a78bfa">
          <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:16, color:"#a78bfa", marginBottom:18 }}>
            {editando ? "✏️ EDITAR SUCURSAL" : "➕ NUEVA SUCURSAL"}
          </div>
          <FormSucursal
            inicial={editando}
            onGuardar={guardar}
            onCancelar={() => { setShowForm(false); setEditando(null); }}
          />
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
        {lista.map(s => {
          const activos = pedidos.filter(p => p.sucursal === s.id && p.estado === "En uso").length;
          const listos  = pedidos.filter(p => p.sucursal === s.id && p.estado === "Listo").length;
          const rec     = pedidos.filter(p => p.sucursal === s.id && p.estadoPago === "pagado").reduce((a, p) => a + p.monto, 0);
          const numCli  = clientes.filter(c => c.sucursal === s.id).length;
          return (
            <Card key={s.id} glow="#a78bfa">
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                <div>
                  <div style={{ fontFamily:"Syne", fontSize:20, fontWeight:800, color:"#a78bfa" }}>{s.nombre}</div>
                  <div style={{ color:"#6b7280", fontSize:13 }}>{s.ciudad}</div>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                  <Tag text="Activa" color="#34d399" />
                  <button onClick={() => { setEditando(s); setShowForm(true); }}
                    style={{ background:"none", border:"1px solid #d0d5e8", borderRadius:8, padding:"3px 8px", cursor:"pointer", fontSize:13 }}>✏️</button>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:14 }}>
                {s.direccion && <div style={{ color:"#4b5563", fontSize:13 }}>📍 {s.direccion}</div>}
                {s.tel && <div style={{ color:"#4b5563", fontSize:13 }}>📞 {s.tel}</div>}
                {s.mpAlias && <div style={{ color:"#009ee3", fontSize:13 }}>💳 {s.mpAlias}</div>}
              </div>
              <HorarioTexto s={s} />
              <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginTop:14, paddingTop:12, borderTop:"1px solid #e8eaf2" }}>
                {[
                  { val:activos, label:"En uso",    color:"#fbbf24" },
                  { val:listos,  label:"Listos",     color:"#34d399" },
                  { val:numCli,  label:"Clientes",   color:"#a78bfa" },
                  { val:fmt(rec),label:"Recaudado",  color:"#0ea5e9" },
                ].map(k => (
                  <div key={k.label} style={{ textAlign:"center" }}>
                    <div style={{ color:k.color, fontFamily:"Syne", fontWeight:700, fontSize:18 }}>{k.val}</div>
                    <div style={{ color:"#9ca3af", fontSize:11 }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// ─── UBICACIONES (CANASTOS) ABM ──────────────────────────────────────────────
const UbicacionesPanel = ({ ubicaciones: ubiProp, onGuardar, onEliminar }) => {
  const ubicaciones = ubiProp || [];
  const FORM_INIT = { nombre: "", descripcion: "", sucursal: 1 };
  const [form, setForm] = useState(FORM_INIT);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarElimUbi, setConfirmarElimUbi] = useState(null);
  const formRef = useRef(null);

  const abrir = (u = null) => {
    setEditandoId(u?.id || null);
    setForm(u ? { nombre: u.nombre, descripcion: u.descripcion || "", sucursal: u.sucursal || 1 } : FORM_INIT);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    await onGuardar(form, editandoId);
    setGuardando(false);
    setForm(FORM_INIT); setEditandoId(null);
  };

  return (
    <Card glow="#0ea5e9">
      <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:17, color:"#0ea5e9", marginBottom:18 }}>🧺 GESTIÓN DE CANASTOS Y UBICACIONES</div>
      <div style={{ color:"#6b7280", fontSize:13, marginBottom:18 }}>
        Definí los lugares donde guardás la ropa: estantes, canastos, zonas. Se asignan al crear o actualizar un pedido.
      </div>

      {/* Form */}
      <div ref={formRef} style={{ scrollMarginTop:80, background:"#f0f9ff", border:"1px solid #0ea5e933", borderRadius:14, padding:18, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#1a1d2e", marginBottom:12 }}>
          {editandoId ? "✏️ Editar ubicación" : "➕ Nueva ubicación"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
          <Inp label="Nombre *" value={form.nombre} onChange={e => setForm({...form,nombre:e.target.value})} placeholder="Ej: Estante A1, Canasto rojo..." />
          <Inp label="Descripción" value={form.descripcion} onChange={e => setForm({...form,descripcion:e.target.value})} placeholder="Ej: Zona izquierda, nivel 2" />
          <Sel label="Sucursal" value={form.sucursal} onChange={e => setForm({...form,sucursal:Number(e.target.value)})}>
            {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Sel>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          <Btn v="suc" onClick={guardar} disabled={!form.nombre.trim() || guardando} style={{ flex:1 }}>
            {guardando ? "⏳ Guardando..." : "Guardar ubicación"}
          </Btn>
          {editandoId && <Btn v="gho" onClick={() => { setForm(FORM_INIT); setEditandoId(null); }}>Cancelar</Btn>}
        </div>
      </div>

      {/* Lista */}
      {ubicaciones.length === 0 && (
        <div style={{ textAlign:"center", color:"#9ca3af", padding:20 }}>No hay ubicaciones configuradas todavía</div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
        {ubicaciones.map(u => {
          const suc = SUCURSALES.find(s => s.id === u.sucursal);
          return (
            <div key={u.id} style={{ background:"#f8f9fc", border:"1px solid #e2e5ef", borderRadius:12, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"#1a1d2e" }}>🧺 {u.nombre}</div>
                {u.descripcion && <div style={{ color:"#6b7280", fontSize:12, marginTop:2 }}>{u.descripcion}</div>}
                {suc && <div style={{ color:"#0ea5e9", fontSize:11, marginTop:4 }}>📍 {suc.nombre}</div>}
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button onClick={() => abrir(u)} style={{ background:"none", border:"1px solid #d0d5e8", borderRadius:8, padding:"4px 8px", cursor:"pointer", fontSize:13 }}>✏️</button>
                <button onClick={() => setConfirmarElimUbi(u)} style={{ background:"none", border:"1px solid #fca5a5", borderRadius:8, padding:"4px 8px", cursor:"pointer", fontSize:13, color:"#f87171" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal confirmación eliminar ubicación */}
      <Modal open={!!confirmarElimUbi} onClose={() => setConfirmarElimUbi(null)} title="⚠️ Eliminar ubicación" color="#f87171">
        {confirmarElimUbi && (
          <div>
            <div style={{ color:"#374151", marginBottom:12, lineHeight:1.6 }}>
              ¿Eliminás la ubicación <strong>🧺 {confirmarElimUbi.nombre}</strong>?
            </div>
            <div style={{ background:"#fef2f2", border:"1px solid #f8717133", borderRadius:10, padding:"10px 14px", marginBottom:18, fontSize:13, color:"#92400e" }}>
              ⚠️ Los pedidos que tengan esta ubicación asignada la perderán. Esta acción no se puede deshacer.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn v="dan" onClick={() => { onEliminar(confirmarElimUbi.id); setConfirmarElimUbi(null); }} style={{ flex:1 }}>
                🗑️ Sí, eliminar
              </Btn>
              <Btn v="gho" onClick={() => setConfirmarElimUbi(null)} style={{ flex:1 }}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

// ─── SERVICIOS PANEL ─────────────────────────────────────────────────────────
const COLORES_SRV = ["#00d4ff","#ff6b35","#a78bfa","#34d399","#fbbf24","#f87171","#60a5fa","#0ea5e9","#10b981","#ec4899"];
const ICONOS_SRV  = ["🫧","👕","🧺","🧼","✨","💧","🌊","⭐","🔵","👔","🧥","💨","🏪","🎽","🪡"];

const ServiciosPanel = ({ servicios, onGuardar, onEliminar }) => {
  const lista = servicios || [];
  const FORM_INIT = { nombre:"", precio:"", duracion:"45", icon:"🫧", color:"#00d4ff" };
  const [form, setForm] = useState(FORM_INIT);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarElimSrv, setConfirmarElimSrv] = useState(null);
  const formRef = useRef(null);
  const set = (k,v) => setForm(p => ({...p,[k]:v}));

  const abrir = (s = null) => {
    setEditandoId(s?.id || null);
    setForm(s ? { nombre:s.nombre, precio:String(s.precio), duracion:String(s.duracion), icon:s.icon, color:s.color } : FORM_INIT);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 80);
  };

  const guardar = async () => {
    if (!form.nombre || !form.precio) return;
    setGuardando(true);
    await onGuardar(form, editandoId);
    setGuardando(false);
    setForm(FORM_INIT); setEditandoId(null);
  };

  return (
    <Card glow="#fbbf24">
      <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:17, color:"#f59e0b", marginBottom:18 }}>🛎 GESTIÓN DE SERVICIOS</div>

      {/* Form */}
      <div ref={formRef} style={{ scrollMarginTop:80, background:"#fffbeb", border:"1px solid #fbbf2433", borderRadius:14, padding:18, marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#1a1d2e", marginBottom:12 }}>
          {editandoId ? "✏️ Editar servicio" : "➕ Nuevo servicio"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
          <Inp label="Nombre *" value={form.nombre} onChange={e => set("nombre",e.target.value)} placeholder="Ej: Lavado XL" />
          <Inp label="Precio ($) *" type="number" value={form.precio} onChange={e => set("precio",e.target.value)} placeholder="0" />
          <Inp label="Duración (min)" type="number" value={form.duracion} onChange={e => set("duracion",e.target.value)} placeholder="45" />
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <span style={{ color:"#6b7280", fontSize:12 }}>Ícono</span>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ICONOS_SRV.map(ic => (
                <button key={ic} onClick={() => set("icon",ic)}
                  style={{ width:32, height:32, fontSize:18, borderRadius:8, cursor:"pointer",
                    border: form.icon===ic ? "2px solid #f59e0b" : "1px solid #e2e5ef",
                    background: form.icon===ic ? "#fffbeb" : "#f8f9fc" }}>{ic}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <span style={{ color:"#6b7280", fontSize:12 }}>Color</span>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {COLORES_SRV.map(c => (
                <button key={c} onClick={() => set("color",c)}
                  style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer",
                    border: form.color===c ? "3px solid #1a1d2e" : "2px solid #fff",
                    boxShadow:"0 0 0 1px #d0d5e8" }} />
              ))}
            </div>
          </div>
        </div>
        {/* Preview */}
        <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:10, background:"#f8f9fc", borderRadius:10, padding:"10px 14px" }}>
          <div style={{ width:40, height:40, borderRadius:12, background:form.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{form.icon}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:form.color }}>{form.nombre || "Nombre del servicio"}</div>
            <div style={{ fontSize:13, color:"#6b7280" }}>{fmt(Number(form.precio)||0)} · {form.duracion} min</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          <Btn v="war" onClick={guardar} disabled={!form.nombre||!form.precio||guardando} style={{ flex:1 }}>
            {guardando ? "⏳ Guardando..." : editandoId ? "Guardar cambios" : "Agregar servicio"}
          </Btn>
          {editandoId && <Btn v="gho" onClick={() => { setForm(FORM_INIT); setEditandoId(null); }}>Cancelar</Btn>}
        </div>
      </div>

      {/* Lista */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {lista.map(s => (
          <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            background:"#f8f9fc", border:"1px solid #e2e5ef", borderRadius:12, padding:"12px 16px", flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:s.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{s.nombre}</div>
                <div style={{ color:"#6b7280", fontSize:12 }}>
                  <strong style={{ color:s.color }}>{fmt(s.precio)}</strong> · {s.duracion} min · ID: <code>{s.id}</code>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn v="gho" onClick={() => abrir(s)} style={{ fontSize:12, padding:"5px 12px" }}>✏️ Editar</Btn>
              <Btn v="dan" onClick={() => setConfirmarElimSrv(s)} style={{ fontSize:12, padding:"5px 12px" }}>🗑️ Eliminar</Btn>
            </div>
          </div>
        ))}
      </div>

      {/* Modal confirmación eliminar servicio */}
      <Modal open={!!confirmarElimSrv} onClose={() => setConfirmarElimSrv(null)} title="⚠️ Eliminar servicio" color="#f87171">
        {confirmarElimSrv && (
          <div>
            <div style={{ color:"#374151", marginBottom:12, lineHeight:1.6 }}>
              ¿Estás seguro de que querés eliminar el servicio <strong>{confirmarElimSrv.icon} {confirmarElimSrv.nombre}</strong>?
            </div>
            <div style={{ background:"#fef2f2", border:"1px solid #f8717133", borderRadius:10, padding:"10px 14px", marginBottom:18, fontSize:13, color:"#92400e" }}>
              ⚠️ Los pedidos existentes con este servicio no se verán afectados, pero ya no podrás crear nuevos pedidos con él.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn v="dan" onClick={() => { onEliminar(confirmarElimSrv.id); setConfirmarElimSrv(null); }} style={{ flex:1 }}>
                🗑️ Sí, eliminar servicio
              </Btn>
              <Btn v="gho" onClick={() => setConfirmarElimSrv(null)} style={{ flex:1 }}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

// ─── CONFIG LOG PANEL ─────────────────────────────────────────────────────────
const ConfigLogPanel = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroSec, setFiltroSec] = useState("Todos");

  useEffect(() => {
    sb.from("config_log").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const SECCIONES = ["Todos","servicios","maquinas","configuracion","sucursales","usuarios","identidad"];
  const ACCION_COL = { crear:"#34d399", editar:"#60a5fa", eliminar:"#f87171" };

  const lista = filtroSec === "Todos" ? logs : logs.filter(l => l.seccion === filtroSec);

  return (
    <Card glow="#a78bfa">
      <div style={{ fontFamily:"Syne", fontWeight:800, fontSize:17, color:"#a78bfa", marginBottom:18 }}>📋 LOG DE CAMBIOS DE CONFIGURACIÓN</div>
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {SECCIONES.map(s => (
          <button key={s} onClick={() => setFiltroSec(s)}
            style={{ padding:"5px 12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12,
              background: filtroSec===s ? "#a78bfa" : "#e8eaf2", color: filtroSec===s ? "#fff" : "#4b5563" }}>
            {s}
          </button>
        ))}
      </div>
      {loading && <div style={{ textAlign:"center", color:"#9ca3af", padding:20 }}>⏳ Cargando log...</div>}
      {!loading && lista.length === 0 && <div style={{ textAlign:"center", color:"#9ca3af", padding:20 }}>Sin registros</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:500, overflowY:"auto" }}>
        {lista.map(l => (
          <div key={l.id} style={{ background:"#f8f9fc", border:"1px solid #e2e5ef", borderRadius:10, padding:"10px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, flexWrap:"wrap", gap:6 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ background:(ACCION_COL[l.accion]||"#9ca3af")+"22", color:ACCION_COL[l.accion]||"#9ca3af",
                  border:`1px solid ${ACCION_COL[l.accion]||"#9ca3af"}40`,
                  padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:600 }}>{l.accion}</span>
                <span style={{ background:"#e8eaf2", color:"#4b5563", padding:"2px 10px", borderRadius:99, fontSize:11 }}>{l.seccion}</span>
              </div>
              <span style={{ color:"#9ca3af", fontSize:11 }}>
                {l.created_at ? new Date(l.created_at).toLocaleString("es-AR",{dateStyle:"short",timeStyle:"short"}) : ""}
              </span>
            </div>
            <div style={{ fontSize:13, color:"#1a1d2e", fontWeight:500 }}>{l.detalle}</div>
            <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>👤 {l.usuario_nombre}</div>
            {(l.valor_anterior||l.valor_nuevo) && (
              <div style={{ fontSize:11, color:"#6b7280", marginTop:4, display:"flex", gap:12, flexWrap:"wrap" }}>
                {l.valor_anterior && <span>Antes: <code style={{ background:"#fee2e2", padding:"1px 6px", borderRadius:4 }}>{l.valor_anterior}</code></span>}
                {l.valor_nuevo    && <span>Ahora: <code style={{ background:"#dcfce7", padding:"1px 6px", borderRadius:4 }}>{l.valor_nuevo}</code></span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CFG_DEFAULT = {
  // Branding
  empresa: "LawaWash Argentina", icono: "🫧", slogan: "Gestión Integral · Argentina",
  // General
  apertura: "08:00", cierre: "21:00", moneda: "ARS",
  // MP
  mpToken: "TEST-xxxx-xxxx",
  // WA
  waNumero: "5491100000000",
  waNotifPedido: true, waReporte: true, waFrecuencia: "diario", waHora: "21:00", waIntervaloHs: "8",
  // Email / SMTP
  smtpHost: "smtp.gmail.com", smtpPort: "587", smtpUser: "", smtpPass: "", smtpFrom: "lavawash@tudominio.com",
  emailDueno: "", emailNotifPedido: true, emailReporte: true, emailFrecuencia: "diario", emailHora: "21:00",
};

// Config global accesible por toda la app
let _cfg = { ...CFG_DEFAULT };
const getCfg = () => _cfg;
const setCfgGlobal = (c) => { _cfg = { ..._cfg, ...c }; };

const Configuracion = ({ cfg, setCfg, ubicaciones, onGuardarUbicacion, onEliminarUbicacion, onGuardarCfg, servicios: srvProp, onGuardarServicio, onEliminarServicio }) => {
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("branding");

  const guardar = async () => {
    setSaved("saving");
    await onGuardarCfg(cfg);
    setSaved("ok");
    setTimeout(() => setSaved(false), 2500);
  };

  const TABS = [
    { id: "branding",    label: "🎨 Identidad" },
    { id: "general",     label: "⚙️ General" },
    { id: "servicios",   label: "🛎 Servicios" },
    { id: "canastos",    label: "🧺 Canastos" },
    { id: "mp",          label: "💳 Mercado Pago" },
    { id: "wa",          label: "📲 WhatsApp" },
    { id: "email",       label: "✉️ Email / SMTP" },
    { id: "notif",       label: "🔔 Notificaciones" },
    { id: "log",         label: "📋 Log" },
  ];

  const ICONOS = ["🫧","👕","🧺","🧼","✨","💧","🌊","⭐","🏪","🔵"];

  return (
    <div style={{ padding: 28, maxWidth: 740 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 22, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "7px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13,
            background: tab === t.id ? "#0ea5e9" : "#e8eaf2", color: tab === t.id ? "#fff" : "#4b5563",
            fontFamily: "Outfit", fontWeight: tab === t.id ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* BRANDING */}
      {tab === "branding" && (
        <Card glow="#a78bfa">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, color: "#a78bfa", marginBottom: 18 }}>🎨 IDENTIDAD DE LA EMPRESA</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#f5f3ff", border: "1px solid #a78bfa44", borderRadius: 14, padding: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ fontSize: 48 }}>{cfg.icono}</div>
              <div>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 22, letterSpacing: 2, color: "#00d4ff" }}>{cfg.empresa || "Nombre del negocio"}</div>
                <div style={{ color: "#9ca3af", fontSize: 12, letterSpacing: 1.5 }}>{cfg.slogan}</div>
              </div>
            </div>
            <Inp label="Nombre del negocio" value={cfg.empresa} onChange={e => setCfg({ ...cfg, empresa: e.target.value })} placeholder="Ej: LawaWash Argentina" />
            <Inp label="Slogan / subtítulo" value={cfg.slogan} onChange={e => setCfg({ ...cfg, slogan: e.target.value })} placeholder="Ej: Gestión Integral · Argentina" />
            <div>
              <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>Ícono del negocio</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ICONOS.map(ic => (
                  <button key={ic} onClick={() => setCfg({ ...cfg, icono: ic })} style={{
                    width: 44, height: 44, fontSize: 24, borderRadius: 10, border: `2px solid ${cfg.icono === ic ? "#a78bfa" : "#d0d5e8"}`,
                    background: cfg.icono === ic ? "#a78bfa18" : "#0b0b18", cursor: "pointer"
                  }}>{ic}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* GENERAL */}
      {tab === "general" && (
        <Card glow="#00d4ff">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, color: "#00d4ff", marginBottom: 18 }}>⚙️ CONFIGURACIÓN GENERAL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sel label="Moneda" value={cfg.moneda || "ARS"} onChange={e => setCfg({ ...cfg, moneda: e.target.value })}>
              <option value="ARS">ARS — Peso Argentino</option>
              <option value="USD">USD — Dólar</option>
            </Sel>
            <div style={{ background:"#f0f9ff", border:"1px solid #0ea5e933", borderRadius:12, padding:"12px 16px", fontSize:13, color:"#374151" }}>
              💡 Los horarios de atención se configuran <strong>por sucursal</strong> desde el menú <strong>Sucursales</strong> (botón ✏️ en cada una).
            </div>
          </div>
        </Card>
      )}

      {/* MERCADO PAGO */}
      {tab === "mp" && (
        <Card glow="#009ee3">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, color: "#009ee3", marginBottom: 18 }}>💳 MERCADO PAGO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="Access Token" value={cfg.mpToken} onChange={e => setCfg({ ...cfg, mpToken: e.target.value })} placeholder="TEST-xxxx o APP_USR-xxxx" />
            {SUCURSALES.map(s => (
              <Inp key={s.id} label={`Alias MP — ${s.nombre}`} defaultValue={s.mpAlias} placeholder={`lavawash.${s.nombre.toLowerCase()}`} />
            ))}
            <div style={{ background: "#e0f2fe", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              💡 Obtené tu token en <strong style={{ color: "#009ee3" }}>mercadopago.com.ar/developers</strong>. Usá <code>TEST-</code> para pruebas.
            </div>
          </div>
        </Card>
      )}

      {/* WHATSAPP */}
      {tab === "wa" && (
        <Card glow="#25d366">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, color: "#25d366", marginBottom: 18 }}>📲 WHATSAPP</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Inp label="Número del supervisor (con cód. país)" value={cfg.waNumero} onChange={e => setCfg({ ...cfg, waNumero: e.target.value })} placeholder="5491100000000" />
            <div style={{ background: "#dcfce7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#6b7280" }}>
              💡 Para automatización sin intervención manual, integrá con <strong style={{ color: "#25d366" }}>WhatsApp Business API</strong> (Meta for Developers).
            </div>
          </div>
        </Card>
      )}

      {/* EMAIL / SMTP */}
      {tab === "email" && (
        <Card glow="#60a5fa">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, color: "#60a5fa", marginBottom: 18 }}>✉️ CONFIGURACIÓN SMTP</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
              <Inp label="Servidor SMTP (host)" value={cfg.smtpHost} onChange={e => setCfg({ ...cfg, smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
              <Inp label="Puerto" value={cfg.smtpPort} onChange={e => setCfg({ ...cfg, smtpPort: e.target.value })} placeholder="587" />
            </div>
            <Inp label="Usuario SMTP" value={cfg.smtpUser} onChange={e => setCfg({ ...cfg, smtpUser: e.target.value })} placeholder="tu@gmail.com" />
            <Inp label="Contraseña / App Password" type="password" value={cfg.smtpPass} onChange={e => setCfg({ ...cfg, smtpPass: e.target.value })} placeholder="••••••••••••" />
            <Inp label="Email remitente (From)" value={cfg.smtpFrom} onChange={e => setCfg({ ...cfg, smtpFrom: e.target.value })} placeholder="noreply@lavawash.com.ar" />
            <Inp label="Email del supervisor (para reportes)" value={cfg.emailDueno} onChange={e => setCfg({ ...cfg, emailDueno: e.target.value })} placeholder="dueno@tudominio.com" />
            <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#6b7280" }}>
              <div style={{ color: "#60a5fa", fontWeight: 600, marginBottom: 8 }}>📋 Cómo configurar Gmail:</div>
              <div>1. Activá "Verificación en 2 pasos" en tu cuenta Google.</div>
              <div>2. En <strong style={{ color: "#60a5fa" }}>myaccount.google.com → Seguridad → Contraseñas de aplicaciones</strong> generá una.</div>
              <div>3. Usá <strong>smtp.gmail.com</strong>, puerto <strong>587</strong>, y pegá la contraseña generada arriba.</div>
            </div>
          </div>
        </Card>
      )}

      {/* NOTIFICACIONES */}
      {tab === "notif" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Por cada nuevo pedido */}
          <Card glow="#fbbf24">
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, color: "#fbbf24", marginBottom: 14 }}>🎫 NOTIFICACIÓN POR CADA PEDIDO</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>El supervisor recibe aviso cada vez que se crea un nuevo pedido.</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { key: "waNotifPedido", label: "📲 WhatsApp", color: "#25d366" },
                { key: "emailNotifPedido", label: "✉️ Email", color: "#60a5fa" },
              ].map(opt => (
                <button key={opt.key} onClick={() => setCfg({ ...cfg, [opt.key]: !cfg[opt.key] })} style={{
                  padding: "10px 20px", borderRadius: 10, border: `2px solid ${cfg[opt.key] ? opt.color : "#d0d5e8"}`,
                  background: cfg[opt.key] ? opt.color + "18" : "#f0f2f8",
                  color: cfg[opt.key] ? opt.color : "#6b7280", cursor: "pointer", fontFamily: "Outfit",
                  fontSize: 14, fontWeight: cfg[opt.key] ? 600 : 400
                }}>{cfg[opt.key] ? "✅ " : "⬜ "}{opt.label}</button>
              ))}
            </div>
          </Card>

          {/* Reporte periódico */}
          <Card glow="#a78bfa">
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, color: "#a78bfa", marginBottom: 14 }}>📊 REPORTE PERIÓDICO AL DUEÑO</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Envío automático de resumen con totales de pedidos y recaudación.</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                { key: "waReporte", label: "📲 WhatsApp", color: "#25d366" },
                { key: "emailReporte", label: "✉️ Email", color: "#60a5fa" },
              ].map(opt => (
                <button key={opt.key} onClick={() => setCfg({ ...cfg, [opt.key]: !cfg[opt.key] })} style={{
                  padding: "10px 20px", borderRadius: 10, border: `2px solid ${cfg[opt.key] ? opt.color : "#d0d5e8"}`,
                  background: cfg[opt.key] ? opt.color + "18" : "#f0f2f8",
                  color: cfg[opt.key] ? opt.color : "#6b7280", cursor: "pointer", fontFamily: "Outfit",
                  fontSize: 14, fontWeight: cfg[opt.key] ? 600 : 400
                }}>{cfg[opt.key] ? "✅ " : "⬜ "}{opt.label}</button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              <Sel label="Frecuencia" value={cfg.waFrecuencia} onChange={e => setCfg({ ...cfg, waFrecuencia: e.target.value, emailFrecuencia: e.target.value })}>
                <option value="diario">Diario (1 vez al día)</option>
                <option value="intervalo">Por intervalo de horas</option>
              </Sel>
              {cfg.waFrecuencia === "diario" && (
                <Inp label="Hora de envío diario" type="time" value={cfg.waHora} onChange={e => setCfg({ ...cfg, waHora: e.target.value, emailHora: e.target.value })} />
              )}
              {cfg.waFrecuencia === "intervalo" && (
                <Inp label="Cada cuántas horas" type="number" min="1" max="24" value={cfg.waIntervaloHs} onChange={e => setCfg({ ...cfg, waIntervaloHs: e.target.value })} placeholder="Ej: 4" />
              )}
            </div>

            {/* Preview del reporte */}
            <div style={{ marginTop: 16, background: "#f4f5fb", border: "1px solid #252545", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Vista previa del mensaje</div>
              <div style={{ color: "#1a1d2e", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>
{`${cfg.icono} *${cfg.empresa} — Reporte ${cfg.waFrecuencia === "diario" ? "diario" : `cada ${cfg.waIntervaloHs}hs`}*

📅 Período: ${new Date().toLocaleDateString("es-AR")}
✅ Pedidos completados: —
🔄 En proceso: —
💰 Recaudado: —
⏳ Pendiente cobro: —

¡Buen trabajo equipo! 💪`}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SERVICIOS */}
      {tab === "servicios" && (
        <ServiciosPanel servicios={srvProp || SERVICIOS} onGuardar={onGuardarServicio} onEliminar={onEliminarServicio} />
      )}

      {/* LOG */}
      {tab === "log" && <ConfigLogPanel />}

      {/* CANASTOS */}
      {tab === "canastos" && (
        <UbicacionesPanel ubicaciones={ubicaciones || []} onGuardar={onGuardarUbicacion} onEliminar={onEliminarUbicacion} />
      )}

      {/* Guardar — solo visible en tabs que no son canastos */}
      {tab !== "canastos" && (
        <div style={{ marginTop: 20 }}>
          <Btn v="suc" onClick={guardar} full style={{ padding: 12 }} disabled={saved === "saving"}>
            {saved === "saving" ? "⏳ Guardando..." : saved === "ok" ? "✅ Guardado" : "💾 Guardar cambios"}
          </Btn>
        </div>
      )}
    </div>
  );
};


// ─── CAMBIAR CONTRASEÑA ──────────────────────────────────────────────────────
const ModalCambiarPass = ({ open, onClose, usuario, onGuardar }) => {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const guardar = () => {
    setErr("");
    if (actual !== usuario.password) { setErr("La contraseña actual es incorrecta"); return; }
    if (nueva.length < 6) { setErr("La nueva contraseña debe tener al menos 6 caracteres"); return; }
    if (nueva !== confirmar) { setErr("Las contraseñas no coinciden"); return; }
    onGuardar(nueva);
    setOk(true);
    setActual(""); setNueva(""); setConfirmar("");
    setTimeout(() => { setOk(false); onClose(); }, 1500);
  };

  const reset = () => { setActual(""); setNueva(""); setConfirmar(""); setErr(""); setOk(false); };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="🔐 CAMBIAR CONTRASEÑA" color="#a78bfa">
      {ok ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18, color: "#34d399", marginTop: 12 }}>¡Contraseña actualizada!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Inp label="Contraseña actual" type="password" value={actual} onChange={e => setActual(e.target.value)} placeholder="Tu contraseña actual" />
          <Inp label="Nueva contraseña" type="password" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <Inp label="Confirmar nueva contraseña" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repetí la nueva contraseña" />
          {err && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
              ❌ {err}
            </div>
          )}
          {nueva.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: -8 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: nueva.length > i * 3 ? (nueva.length >= 10 ? "#34d399" : nueva.length >= 6 ? "#fbbf24" : "#f87171") : "#e8eaf2" }} />
              ))}
              <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", alignSelf: "center", marginLeft: 6 }}>
                {nueva.length < 6 ? "Muy corta" : nueva.length < 10 ? "Aceptable" : "Segura"}
              </span>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <Btn v="rol" onClick={guardar} disabled={!actual || !nueva || !confirmar} style={{ flex: 1 }}>Guardar contraseña</Btn>
            <Btn v="gho" onClick={() => { reset(); onClose(); }}>Cancelar</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── GESTIÓN DE USUARIOS ──────────────────────────────────────────────────────
const Usuarios = ({ usuarios, onGuardar, onToggle, onEliminar }) => {
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const FORM_INIT = { nombre: "", email: "", password: "", rol: "empleado", sucursal: 1, activo: true };
  const [form, setForm] = useState(FORM_INIT);
  const [showPass, setShowPass] = useState(false);
  const [confirmarElimU, setConfirmarElimU] = useState(null);
  const formRef = useRef(null);

  const abrir = (u = null) => {
    setEditando(u);
    setForm(u ? { ...u } : FORM_INIT);
    setShowForm(true);
    // Scroll al form con pequeño delay para que React lo renderice primero
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };
  const cerrar = () => { setShowForm(false); setEditando(null); setForm(FORM_INIT); };

  const guardar = async () => {
    if (!form.nombre || !form.email || !form.password) return;
    if (!editando && usuarios.find(u => u.email === form.email)) { alert("Ya existe un usuario con ese email"); return; }
    const duenos = usuarios.filter(u => u.rol === "dueno");
    if (editando?.rol === "dueno" && form.rol !== "dueno" && duenos.length === 1) { alert("Debe haber al menos un supervisor"); return; }
    await onGuardar(form, editando?.id || null);
    cerrar();
  };

  const toggleActivo = async (id) => {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;
    if (u.rol === "dueno" && u.activo && usuarios.filter(x => x.rol === "dueno" && x.activo).length === 1) { alert("Debe haber al menos un supervisor activo"); return; }
    await onToggle(id, !u.activo);
  };

  const eliminar = async (u) => {
    if (usuarios.filter(x => x.rol === "dueno").length === 1 && u.rol === "dueno") {
      alert("Debe haber al menos un supervisor"); return;
    }
    setConfirmarElimU(u);
  };

  const ROL_COL = { dueno: "#fbbf24", empleado: "#00d4ff" };
  const ROL_LAB = { dueno: "👑 Supervisor", empleado: "👤 Empleado" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <Btn onClick={() => abrir()}>+ Nuevo usuario</Btn>
      </div>

      {showForm && (
        <div ref={formRef} style={{ scrollMarginTop: 16 }}>
        <Card style={{ marginBottom: 20 }} glow="#a78bfa">
          <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 800, color: "#a78bfa", marginBottom: 16 }}>
            {editando ? "✏️ EDITAR USUARIO" : "➕ NUEVO USUARIO"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            <Inp label="Nombre completo *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan Pérez" />
            <Inp label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="usuario@lavawash.com" />
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ color: "#6b7280", fontSize: 12 }}>Contraseña *</span>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 caracteres"
                  style={{ background: "#f4f5fb", border: "1px solid #252545", borderRadius: 10, color: "#1a1d2e", padding: "9px 40px 9px 13px", fontSize: 14, outline: "none", width: "100%" }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16 }}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </label>
            <Sel label="Rol" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value, sucursal: e.target.value === "dueno" ? null : (form.sucursal || 1) })}>
              <option value="empleado">👤 Empleado</option>
              <option value="dueno">👑 Supervisor</option>
            </Sel>
            {form.rol === "empleado" && (
              <Sel label="Sucursal asignada" value={form.sucursal || 1} onChange={e => setForm({ ...form, sucursal: Number(e.target.value) })}>
                {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Sel>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22, cursor: "pointer" }}>
              <input type="checkbox" checked={form.activo !== false} onChange={e => setForm({ ...form, activo: e.target.checked })} style={{ width: 16, height: 16 }} />
              <span style={{ color: "#4b5563", fontSize: 14 }}>Usuario activo</span>
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn v="suc" onClick={guardar} disabled={!form.nombre || !form.email || !form.password}>Guardar</Btn>
            <Btn v="gho" onClick={cerrar}>Cancelar</Btn>
          </div>
        </Card>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {usuarios.map(u => {
          const suc = SUCURSALES.find(s => s.id === u.sucursal);
          return (
            <Card key={u.id} glow={u.activo !== false ? ROL_COL[u.rol] : undefined} style={{ opacity: u.activo !== false ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: ROL_COL[u.rol] + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{u.avatar}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <Tag text={ROL_LAB[u.rol]} color={ROL_COL[u.rol]} />
                  <Tag text={u.activo !== false ? "Activo" : "Inactivo"} color={u.activo !== false ? "#34d399" : "#f87171"} />
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{u.nombre}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 2 }}>✉ {u.email}</div>
              {suc && <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 10 }}>📍 {suc.nombre}</div>}
              {!suc && u.rol === "dueno" && <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 10 }}>📍 Todas las sucursales</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <Btn v="gho" onClick={() => abrir(u)} style={{ fontSize: 12, padding: "5px 12px" }}>✏️ Editar</Btn>
                <Btn v="gho" onClick={() => toggleActivo(u.id)} style={{ fontSize: 12, padding: "5px 12px", color: u.activo !== false ? "#f87171" : "#34d399" }}>
                  {u.activo !== false ? "⏸ Desactivar" : "▶ Activar"}
                </Btn>
                <Btn v="dan" onClick={() => eliminar(u)} style={{ fontSize: 12, padding: "5px 12px" }}>🗑️ Eliminar</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal confirmación eliminar usuario */}
      <Modal open={!!confirmarElimU} onClose={() => setConfirmarElimU(null)} title="⚠️ Eliminar usuario" color="#f87171">
        {confirmarElimU && (
          <div>
            <div style={{ color: "#374151", marginBottom: 12, lineHeight: 1.6 }}>
              ¿Estás seguro de que querés eliminar al usuario <strong>{confirmarElimU.nombre}</strong> ({confirmarElimU.email})?
            </div>
            <div style={{ background: "#fef2f2", border: "1px solid #f8717133", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#92400e" }}>
              ⚠️ Esta acción no se puede deshacer. Si solo querés que no pueda ingresar, usá <strong>Desactivar</strong> en su lugar.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn v="dan" onClick={async () => { await onEliminar(confirmarElimU.id); setConfirmarElimU(null); }} style={{ flex: 1 }}>
                🗑️ Sí, eliminar usuario
              </Btn>
              <Btn v="gho" onClick={() => setConfirmarElimU(null)} style={{ flex: 1 }}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ─── EMAIL HELPERS ────────────────────────────────────────────────────────────
const abrirMailto = (to, subject, body) => {
  window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
};

const buildEmailComprobante = (pedido, cliente, srv, suc, cfg) => ({
  subject: `[${cfg.empresa}] Comprobante pedido ${nroPedido(pedido)}`,
  body: `Estimado/a ${cliente.nombre},\n\nAdjuntamos el comprobante de su pedido en ${cfg.empresa}.\n\n` +
    `──────────────────────────\n` +
    `Nro de pedido: ${nroPedido(pedido)}\n` +
    `Sucursal: ${suc.nombre} — ${suc.direccion}\n` +
    `Servicio: ${srv.nombre}\n` +
    `Fecha de ingreso: ${pedido.fechaIngreso} a las ${pedido.horaIngreso}\n` +
    `Retiro estimado: ${pedido.fechaEstRetiro}\n` +
    `──────────────────────────\n` +
    `Monto: $${pedido.monto.toLocaleString("es-AR")}\n` +
    `Estado de pago: ${pedido.estadoPago === "pagado" ? "PAGADO" : "Paga al retirar"}\n` +
    `──────────────────────────\n` +
    `${pedido.obs ? `Observaciones: ${pedido.obs}\n──────────────────────────\n` : ""}` +
    `Ante cualquier consulta llamá al ${suc.tel}\n\nGracias por elegirnos!\n${cfg.empresa}`
});

const buildEmailListo = (pedido, cliente, srv, suc, cfg) => ({
  subject: `[${cfg.empresa}] Tu ropa está lista para retirar — Pedido ${nroPedido(pedido)}`,
  body: `Hola ${cliente.nombre.split(" ")[0]}!\n\nTu ${srv.nombre} está lista para retirar en ${suc.nombre}.\n\nDirección: ${suc.direccion}\nPedido: ${nroPedido(pedido)}\n${pedido.estadoPago !== "pagado" ? `Recordá abonar $${pedido.monto.toLocaleString("es-AR")} al retirar.\n` : ""}\nTe esperamos!\n${cfg.empresa}`
});

// ─── REPORTES HISTÓRICOS ──────────────────────────────────────────────────────
const PEDIDOS_HIST = [
  { id:"PH-001", clienteId:"C-001", servicio:"lav",     sucursal:1, fechaIngreso:"05/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"efectivo",      monto:4500 },
  { id:"PH-002", clienteId:"C-003", servicio:"tint",    sucursal:2, fechaIngreso:"05/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"mp_qr",          monto:9200 },
  { id:"PH-003", clienteId:"C-002", servicio:"lavysec", sucursal:1, fechaIngreso:"06/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"transferencia",  monto:6800 },
  { id:"PH-004", clienteId:"C-004", servicio:"sec",     sucursal:3, fechaIngreso:"06/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"efectivo",       monto:3200 },
  { id:"PH-005", clienteId:"C-001", servicio:"plan",    sucursal:1, fechaIngreso:"07/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"mp_link",        monto:5500 },
  { id:"PH-006", clienteId:"C-002", servicio:"tint",    sucursal:2, fechaIngreso:"07/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"mp_qr",          monto:9200 },
  { id:"PH-007", clienteId:"C-003", servicio:"lav",     sucursal:3, fechaIngreso:"08/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"efectivo",       monto:4500 },
  { id:"PH-008", clienteId:"C-004", servicio:"lavysec", sucursal:4, fechaIngreso:"08/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"transferencia",  monto:6800 },
  { id:"PH-009", clienteId:"C-001", servicio:"sec",     sucursal:1, fechaIngreso:"08/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"mp_qr",          monto:3200 },
  { id:"PH-010", clienteId:"C-002", servicio:"plan",    sucursal:2, fechaIngreso:"08/03/2026", estado:"Entregado", estadoPago:"pagado", metodoPago:"efectivo",       monto:5500 },
];

const SERV_NAMES = { lav:"Lavado Simple", sec:"Secado", lavysec:"Lavado+Secado", plan:"Planchado", tint:"Tintorería" };
const MET_NAMES  = { efectivo:"Efectivo", mp_qr:"MP QR", mp_link:"MP Link", transferencia:"Transferencia" };

const Reportes = ({ pedidos, pagos, clientes, sucursalActiva }) => {
  const [periodo, setPeriodo] = useState("semana");
  // sucFiltro sigue al sidebar automáticamente
  const [sucFiltro, setSucFiltro] = useState(sucursalActiva || 0);
  const [tabR, setTabR] = useState("recaudacion");

  // Sincronizar cuando el usuario cambia sucursal desde el sidebar
  useEffect(() => { setSucFiltro(sucursalActiva || 0); }, [sucursalActiva]);

  // Combinamos pedidos actuales + históricos
  const todosPedidos = [...pedidos, ...PEDIDOS_HIST];
  const todosPagos   = [...pagos,   ...PEDIDOS_HIST.map(p => ({ id:"PAG-H"+p.id, pedido:p.id, clienteId:p.clienteId, monto:p.monto, metodo:p.metodoPago, sucursal:p.sucursal, fecha:p.fechaIngreso }))];

  // ── Filtro por período ──────────────────────────────────────────────────────
  const parseFechaAR = (str) => {
    if (!str) return null;
    // Acepta DD/MM/AAAA o AAAA-MM-DD
    if (str.includes("-")) {
      const [a, m, d] = str.split("-");
      return new Date(Number(a), Number(m) - 1, Number(d));
    }
    const [d, m, a] = str.split("/");
    if (!d || !m || !a) return null;
    return new Date(Number(a), Number(m) - 1, Number(d));
  };

  const filtrarPorPeriodo = (arr) => {
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    if (periodo === "total") return arr;
    const limite = new Date(hoyDate);
    if (periodo === "semana") limite.setDate(hoyDate.getDate() - 6);
    else if (periodo === "mes") limite.setDate(hoyDate.getDate() - 29);
    return arr.filter(p => {
      const f = parseFechaAR(p.fecha || p.fechaIngreso);
      return f && f >= limite;
    });
  };

  const filtrarSuc = arr => sucFiltro === 0 ? arr : arr.filter(x => x.sucursal === sucFiltro);
  const ped = filtrarPorPeriodo(filtrarSuc(todosPedidos));
  const pag = filtrarPorPeriodo(filtrarSuc(todosPagos));

  // Agrupar pagos por fecha (simulado para distintos períodos)
  const agruparPorFecha = (arr) => {
    const grupos = {};
    arr.forEach(p => { const f = p.fecha||p.fechaIngreso||hoy; grupos[f] = (grupos[f]||0)+p.monto; });
    return Object.entries(grupos).sort(([a],[b])=>a.localeCompare(b)).map(([fecha,total])=>({fecha,total}));
  };

  const porFecha = agruparPorFecha(pag);

  // Por servicio
  const porServicio = SERVICIOS.map(s => ({
    ...s, cantidad: ped.filter(p=>p.servicio===s.id).length,
    total: ped.filter(p=>p.servicio===s.id).reduce((a,p)=>a+p.monto,0)
  })).sort((a,b)=>b.total-a.total);

  // Por sucursal
  const porSucursal = SUCURSALES.map(s => ({
    ...s,
    pedidos: ped.filter(p=>p.sucursal===s.id).length,
    total: pag.filter(p=>p.sucursal===s.id).reduce((a,p)=>a+p.monto,0),
    clientes: clientes.filter(c=>c.sucursal===s.id).length,
  }));

  // Clientes nuevos vs recurrentes
  const pedPorCliente = {};
  ped.forEach(p => { pedPorCliente[p.clienteId] = (pedPorCliente[p.clienteId]||0)+1; });
  const nuevos     = Object.values(pedPorCliente).filter(n=>n===1).length;
  const recurrentes= Object.values(pedPorCliente).filter(n=>n>1).length;

  // Top clientes
  const topClientes = Object.entries(pedPorCliente)
    .map(([id,cnt])=>({ cli: clientes.find(c=>c.id===id), cnt, gasto: ped.filter(p=>p.clienteId===id).reduce((a,p)=>a+p.monto,0) }))
    .filter(x=>x.cli).sort((a,b)=>b.gasto-a.gasto).slice(0,5);

  const totalRec = pag.reduce((a,p)=>a+p.monto,0);
  const maxBar = Math.max(...porFecha.map(x=>x.total),1);

  const exportarExcel = () => {
    const XLSX = window.XLSX;
    if (!XLSX) { alert("Librería Excel no disponible"); return; }
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([
      ["LAVAWASH — REPORTE HISTÓRICO"],
      [`Generado: ${new Date().toLocaleString("es-AR")}`],[],
      ["Fecha","Recaudación ($)"],
      ...porFecha.map(x=>[x.fecha, x.total]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Por Fecha");
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["Servicio","Cantidad","Total ($)"],
      ...porServicio.map(s=>[s.nombre, s.cantidad, s.total]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, "Por Servicio");
    const ws3 = XLSX.utils.aoa_to_sheet([
      ["Sucursal","Pedidos","Total ($)","Clientes"],
      ...porSucursal.map(s=>[s.nombre, s.pedidos, s.total, s.clientes]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws3, "Por Sucursal");
    XLSX.writeFile(wb, `LawaWash_Reporte_${new Date().toLocaleDateString("es-AR").replace(/\//g,"-")}.xlsx`);
  };

  const TABS_R = [
    { id:"recaudacion", label:"💰 Recaudación" },
    { id:"servicios",   label:"👕 Servicios" },
    { id:"sucursales",  label:"📍 Sucursales" },
    { id:"clientes",    label:"👥 Clientes" },
  ];

  return (
    <div style={{ padding: 28, display:"flex", flexDirection:"column", gap:20 }}>
      {/* Filtros — período + indicador sucursal activa */}
      <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {/* Indicador de sucursal activa (controlada desde el sidebar) */}
          <div style={{ background:"#f0f2f8", border:"1px solid #d0d5e8", borderRadius:99, padding:"7px 14px", fontSize:13, color:"#374151", display:"flex", alignItems:"center", gap:6 }}>
            📍 {sucFiltro === 0 ? "Todas las sucursales" : SUCURSALES.find(s=>s.id===sucFiltro)?.nombre || "Sucursal"}
          </div>
          {["semana","mes","total"].map(p=>(
            <button key={p} onClick={()=>setPeriodo(p)} style={{
              padding:"7px 14px", borderRadius:99, border:"none", cursor:"pointer", fontSize:13,
              background:periodo===p?"#0ea5e9":"#e8eaf2", color:periodo===p?"#fff":"#4b5563", fontFamily:"Outfit"
            }}>{p==="semana"?"Esta semana":p==="mes"?"Este mes":"Todo"}</button>
          ))}
        </div>
        <Btn v="suc" onClick={exportarExcel} style={{fontSize:13}}>📥 Exportar Excel</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {[
          { label:"Recaudación total", val:fmt(totalRec), color:"#fbbf24", icon:"💰" },
          { label:"Total pedidos", val:ped.length, color:"#00d4ff", icon:"👕" },
          { label:"Clientes nuevos", val:nuevos, color:"#34d399", icon:"🆕" },
          { label:"Recurrentes", val:recurrentes, color:"#a78bfa", icon:"🔁" },
        ].map(k=>(
          <Card key={k.label} style={{flex:1,minWidth:140}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{color:"#8888aa",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{k.label}</div>
                <div style={{color:k.color,fontFamily:"Syne",fontWeight:800,fontSize:26,lineHeight:1}}>{k.val}</div>
              </div>
              <span style={{fontSize:22}}>{k.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {TABS_R.map(t=>(
          <button key={t.id} onClick={()=>setTabR(t.id)} style={{
            padding:"7px 14px", borderRadius:10, border:"1px solid #d0d5e8", cursor:"pointer", fontSize:13,
            background:tabR===t.id?"#a78bfa":"#f0f2f8",
            color:tabR===t.id?"#fff":"#374151",
            fontFamily:"Outfit", fontWeight: tabR===t.id ? 600 : 400
          }}>{t.label}</button>
        ))}
      </div>

      {/* RECAUDACIÓN */}
      {tabR==="recaudacion" && (
        <Card>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#fbbf24",marginBottom:16}}>RECAUDACIÓN POR DÍA</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {porFecha.map(({fecha,total})=>(
              <div key={fecha}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#aaa",fontSize:13}}>{fecha}</span>
                  <span style={{color:"#fbbf24",fontWeight:600}}>{fmt(total)}</span>
                </div>
                <Bar val={(total/maxBar)*100} color="#fbbf24" h={8}/>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SERVICIOS */}
      {tabR==="servicios" && (
        <Card>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#00d4ff",marginBottom:16}}>PEDIDOS POR SERVICIO</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {porServicio.map(s=>(
              <div key={s.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>{s.icon}</span>
                    <span style={{fontSize:14}}>{s.nombre}</span>
                    <Tag text={`${s.cantidad} pedidos`} color={s.color}/>
                  </div>
                  <span style={{color:s.color,fontWeight:700}}>{fmt(s.total)}</span>
                </div>
                <Bar val={s.total?(s.total/porServicio[0].total)*100:0} color={s.color} h={6}/>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SUCURSALES */}
      {tabR==="sucursales" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
          {porSucursal.map(s=>(
            <Card key={s.id} glow="#a78bfa">
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:18,color:"#a78bfa",marginBottom:8}}>{s.nombre}</div>
              <div style={{color:"#8888aa",fontSize:12,marginBottom:14}}>{s.ciudad}</div>
              <div style={{display:"flex",gap:20}}>
                {[
                  {val:s.pedidos,label:"Pedidos",color:"#00d4ff"},
                  {val:s.clientes,label:"Clientes",color:"#34d399"},
                  {val:fmt(s.total),label:"Recaudado",color:"#fbbf24"},
                ].map(k=>(
                  <div key={k.label} style={{textAlign:"center"}}>
                    <div style={{color:k.color,fontFamily:"Syne",fontWeight:700,fontSize:20}}>{k.val}</div>
                    <div style={{color:"#555",fontSize:11}}>{k.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CLIENTES */}
      {tabR==="clientes" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            <Card style={{flex:1,minWidth:200}} glow="#34d399">
              <div style={{color:"#8888aa",fontSize:12,marginBottom:6}}>CLIENTES NUEVOS</div>
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:36,color:"#34d399"}}>{nuevos}</div>
              <div style={{color:"#555",fontSize:12,marginTop:4}}>1 sola visita</div>
              <Bar val={nuevos+recurrentes?(nuevos/(nuevos+recurrentes))*100:0} color="#34d399" h={6}/>
            </Card>
            <Card style={{flex:1,minWidth:200}} glow="#a78bfa">
              <div style={{color:"#8888aa",fontSize:12,marginBottom:6}}>CLIENTES RECURRENTES</div>
              <div style={{fontFamily:"Syne",fontWeight:800,fontSize:36,color:"#a78bfa"}}>{recurrentes}</div>
              <div style={{color:"#555",fontSize:12,marginTop:4}}>2+ visitas</div>
              <Bar val={nuevos+recurrentes?(recurrentes/(nuevos+recurrentes))*100:0} color="#a78bfa" h={6}/>
            </Card>
          </div>
          <Card>
            <div style={{fontFamily:"Syne",fontWeight:800,fontSize:15,color:"#fbbf24",marginBottom:14}}>🏆 TOP CLIENTES</div>
            {topClientes.map((x,i)=>(
              <div key={x.cli.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1a1a30"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:28,height:28,borderRadius:8,background:["#fbbf24","#8888aa","#f87171","#555","#555"][i]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:["#fbbf24","#aaa","#f87171","#555","#555"][i],fontWeight:700}}>#{i+1}</div>
                  <div>
                    <div style={{fontWeight:600}}>{x.cli.nombre}</div>
                    <div style={{color:"#8888aa",fontSize:12}}>{x.cnt} pedidos</div>
                  </div>
                </div>
                <span style={{color:"#fbbf24",fontWeight:700}}>{fmt(x.gasto)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
};

// ─── MENU ─────────────────────────────────────────────────────────────────────
const MENU_DUENO = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "pedidos", icon: "👕", label: "Pedidos" },
  { id: "clientes", icon: "👥", label: "Clientes" },
  { id: "maquinas", icon: "⚙️", label: "Máquinas" },
  { id: "pagos", icon: "💳", label: "Caja del día" },
  { id: "reportes", icon: "📈", label: "Reportes" },
  { id: "whatsapp", icon: "📲", label: "WhatsApp" },
  { id: "insumos", icon: "📦", label: "Insumos" },
  { id: "sucursales", icon: "📍", label: "Sucursales" },
  { id: "usuarios", icon: "🔑", label: "Usuarios" },
  { id: "config", icon: "🔧", label: "Config." },
];

// Superadmin: ve todo + panel de empresas
const MENU_SUPERADMIN = [
  { id: "empresas", icon: "🏢", label: "Empresas" },
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "pedidos", icon: "👕", label: "Pedidos" },
  { id: "clientes", icon: "👥", label: "Clientes" },
  { id: "maquinas", icon: "⚙️", label: "Máquinas" },
  { id: "pagos", icon: "💳", label: "Caja del día" },
  { id: "reportes", icon: "📈", label: "Reportes" },
  { id: "whatsapp", icon: "📲", label: "WhatsApp" },
  { id: "insumos", icon: "📦", label: "Insumos" },
  { id: "sucursales", icon: "📍", label: "Sucursales" },
  { id: "usuarios", icon: "🔑", label: "Usuarios" },
  { id: "config", icon: "🔧", label: "Config." },
];

const MENU_EMPLEADO = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "pedidos", icon: "👕", label: "Pedidos" },
  { id: "clientes", icon: "👥", label: "Clientes" },
  { id: "maquinas", icon: "⚙️", label: "Máquinas" },
  { id: "pagos", icon: "💳", label: "Caja" },
  { id: "whatsapp", icon: "📲", label: "WhatsApp" },
  { id: "insumos", icon: "📦", label: "Insumos" },
];

// ─── SUPERADMIN PANEL ────────────────────────────────────────────────────────
const SuperAdminPanel = ({ toast }) => {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const FORM_INIT = { nombre: "", slug: "", plan: "free", activa: true };
  const [form, setForm] = useState(FORM_INIT);
  const [editandoId, setEditandoId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await sb.from("organizations").select("*").order("created_at", { ascending: false });
    if (!error) setEmpresas(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.nombre || !form.slug) return;
    if (editandoId) {
      await sb.from("organizations").update({ nombre: form.nombre, slug: form.slug, plan: form.plan, activa: form.activa }).eq("id", editandoId);
      toast("Empresa actualizada", "ok");
    } else {
      const { error } = await sb.from("organizations").insert([{ nombre: form.nombre, slug: form.slug, plan: form.plan, activa: true }]);
      if (error) { toast(error.message, "error"); return; }
      toast("Empresa creada", "ok");
    }
    setShowForm(false); setEditandoId(null); setForm(FORM_INIT);
    await cargar();
  };

  const toggleActiva = async (id, activa) => {
    await sb.from("organizations").update({ activa: !activa }).eq("id", id);
    await cargar();
  };

  const PLAN_COL = { free: "#9ca3af", pro: "#0ea5e9", enterprise: "#a78bfa" };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, color: "#fff" }}>
        <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🛡️ Panel SuperAdmin</div>
        <div style={{ fontSize: 13, opacity: .85 }}>Gestión global de empresas clientes. Este panel solo es visible para el rol SuperAdmin.</div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn onClick={() => { setEditandoId(null); setForm(FORM_INIT); setShowForm(true); }}>+ Nueva empresa</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20 }} glow="#a78bfa">
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, color: "#a78bfa", marginBottom: 16 }}>
            {editandoId ? "✏️ EDITAR EMPRESA" : "➕ NUEVA EMPRESA"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            <Inp label="Nombre de la empresa *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Lavandería San Martín" />
            <Inp label="Slug único *" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g,"-") })} placeholder="lavanderia-san-martin" />
            <Sel label="Plan" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </Sel>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Btn v="suc" onClick={guardar} disabled={!form.nombre || !form.slug}>💾 Guardar</Btn>
            <Btn v="gho" onClick={() => { setShowForm(false); setEditandoId(null); setForm(FORM_INIT); }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>⏳ Cargando empresas...</div>}
      {!loading && empresas.length === 0 && (
        <Card><div style={{ textAlign: "center", color: "#9ca3af", padding: 20 }}>Sin empresas registradas. Creá la primera.</div></Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {empresas.map(e => (
          <Card key={e.id} glow={e.activa ? "#a78bfa" : undefined} style={{ opacity: e.activa ? 1 : 0.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16 }}>🏢 {e.nombre}</div>
              <Tag text={e.plan?.toUpperCase() || "FREE"} color={PLAN_COL[e.plan] || "#9ca3af"} />
            </div>
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>🔗 slug: <code style={{ background: "#f0f2f8", padding: "1px 6px", borderRadius: 4 }}>{e.slug}</code></div>
            <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>📅 {e.created_at ? new Date(e.created_at).toLocaleDateString("es-AR") : "—"}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn v="gho" onClick={() => { setEditandoId(e.id); setForm({ nombre: e.nombre, slug: e.slug, plan: e.plan || "free", activa: e.activa }); setShowForm(true); }} style={{ fontSize: 12, padding: "5px 12px" }}>✏️ Editar</Btn>
              <Btn v="gho" onClick={() => toggleActiva(e.id, e.activa)} style={{ fontSize: 12, padding: "5px 12px", color: e.activa ? "#f87171" : "#34d399" }}>
                {e.activa ? "⏸ Suspender" : "▶ Activar"}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const TITULOS = { empresas: "🛡️ SuperAdmin — Empresas", dashboard: "Dashboard", pedidos: "Pedidos", clientes: "Clientes", maquinas: "Máquinas", pagos: "Caja del Día", reportes: "Reportes Históricos", whatsapp: "WhatsApp", insumos: "Proveedores e Insumos", sucursales: "Sucursales", usuarios: "Gestión de Usuarios", config: "Configuración" };

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const Sidebar = ({ vista, setVista, sucursalActiva, setSucursalActiva, col, setCol, usuario, onLogout, cfg }) => {
  const menu = usuario.rol === "superadmin" ? MENU_SUPERADMIN : usuario.rol === "dueno" ? MENU_DUENO : MENU_EMPLEADO;
  const nombre = cfg?.empresa || "LAVAWASH";
  const icono  = cfg?.icono  || "🫧";
  const slogan = cfg?.slogan || "GESTIÓN INTEGRAL";
  return (
    <aside style={{ width: col ? 58 : 214, minHeight: "100vh", background: "#1e2235", borderRight: "1px solid #161929", display: "flex", flexDirection: "column", transition: "width .3s ease", flexShrink: 0, position: "sticky", top: 0 }}>
      <div style={{ padding: "16px 14px", borderBottom: "1px solid #2a2f45", display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#00d4ff,#006fff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icono}</div>
        {!col && <div>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 13, letterSpacing: 1.5, color: "#00d4ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{nombre.toUpperCase()}</div>
          <div style={{ fontSize: 9, color: "#7a8ab0", letterSpacing: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{slogan.toUpperCase()}</div>
        </div>}
      </div>

      {!col && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #2a2f45" }}>
          <div style={{ background: usuario.rol === "superadmin" ? "#a78bfa15" : usuario.rol === "dueno" ? "#fbbf2415" : "#00d4ff15", border: `1px solid ${usuario.rol === "superadmin" ? "#a78bfa44" : usuario.rol === "dueno" ? "#fbbf2444" : "#00d4ff44"}`, borderRadius: 10, padding: "8px 12px" }}>
            <div style={{ color: usuario.rol === "superadmin" ? "#a78bfa" : usuario.rol === "dueno" ? "#fbbf24" : "#38bdf8", fontSize: 12, fontWeight: 700 }}>{usuario.avatar} {usuario.nombre}</div>
            <div style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
              {usuario.rol === "superadmin" ? "🛡️ SuperAdmin" : usuario.rol === "dueno" ? "👑 Supervisor" : "👤 Empleado"}
            </div>
          </div>
          {(usuario.rol === "dueno" || usuario.rol === "superadmin") && (
            <select value={sucursalActiva} onChange={e => setSucursalActiva(Number(e.target.value))} style={{ background: "#252b42", border: "1px solid #3a4060", borderRadius: 8, color: "#e8eaf2", padding: "6px 10px", fontSize: 12, width: "100%", cursor: "pointer", marginTop: 8 }}>
              <option value={0}>Todas las sucursales</option>
              {SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          )}
          {usuario.rol === "empleado" && (
            <div style={{ color: "#8fa0c0", fontSize: 12, marginTop: 8 }}>📍 {SUCURSALES.find(s => s.id === usuario.sucursal)?.nombre}</div>
          )}
        </div>
      )}

      <nav style={{ flex: 1, padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
        {menu.map(item => (
          <button key={item.id} onClick={() => setVista(item.id)} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: col ? "10px" : "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            fontFamily: "Outfit", fontSize: 13, width: "100%", justifyContent: col ? "center" : "flex-start",
            background: vista === item.id ? "#38bdf818" : "transparent",
            color: vista === item.id ? "#38bdf8" : "#94a3c8",
            borderLeft: vista === item.id ? "2px solid #38bdf8" : "2px solid transparent", transition: "all .2s"
          }}>
            <span style={{ fontSize: 17, flexShrink: 0, filter: "none" }}>{item.icon}</span>
            {!col && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div style={{ padding: "6px 6px 10px" }}>
        {!col && <button onClick={onLogout} style={{ width: "100%", padding: "8px 12px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, color: "#dc2626", cursor: "pointer", fontFamily: "Outfit", fontSize: 13, marginBottom: 6 }}>← Cerrar sesión</button>}
        <button onClick={() => setCol(!col)} style={{ width: "100%", padding: 7, background: "#252b42", border: "1px solid #3a4060", borderRadius: 8, color: "#6b7a99", cursor: "pointer", fontSize: 14, display: "flex", justifyContent: "center" }}>
          {col ? "▶" : "◀"}
        </button>
      </div>
    </aside>
  );
};

// ─── APP ─────────────────────────────────────────────────────────────────────
// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────
const ToastCtx = ({ toasts, removeToast }) => (
  <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
    {toasts.map(t => (
      <div key={t.id} onClick={() => removeToast(t.id)} style={{
        background: t.type==="error" ? "#fef2f2" : t.type==="warn" ? "#fef3c7" : "#f0fdf4",
        border: `1px solid ${t.type==="error"?"#fca5a5":t.type==="warn"?"#fbbf24":"#86efac"}`,
        borderRadius:12, padding:"12px 18px", minWidth:280, maxWidth:380,
        boxShadow:"0 4px 20px #1a1d2e18", cursor:"pointer", animation:"slideIn .3s ease",
        display:"flex", alignItems:"flex-start", gap:10
      }}>
        <span style={{fontSize:18}}>{t.type==="error"?"❌":t.type==="warn"?"⚠️":"✅"}</span>
        <div>
          {t.title && <div style={{fontWeight:700, fontSize:13, color:"#1a1d2e", marginBottom:2}}>{t.title}</div>}
          <div style={{fontSize:13, color:"#374151"}}>{t.msg}</div>
        </div>
      </div>
    ))}
  </div>
);

export default function App() {
  const [usuario, setUsuario]           = useState(null);
  const [vista, setVista]               = useState("dashboard");
  const [sucursalActiva, setSucursalActiva] = useState(0);
  const [col, setCol]                   = useState(false);
  const [pedidos, setPedidos]           = useState([]);
  const [pagos, setPagos]               = useState([]);
  const [clientes, setClientes]         = useState([]);
  const [usuarios, setUsuarios]         = useState([]);
  const [ubicaciones, setUbicaciones]   = useState([]);
  const [sucursalesDB, setSucursalesDB] = useState([]);
  const [serviciosDB, setServiciosDB]   = useState([]);
  const [proveedores, setProveedores]   = useState([]);
  const [pedidosInsumos, setPedidosInsumos] = useState([]);
  const [maquinasDB, setMaquinasDB]     = useState([]);
  const [cfg, setCfg]                   = useState({ ...CFG_DEFAULT });
  const [hora, setHora]                 = useState(horaActual());
  const [showCambiarPass, setShowCambiarPass] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [toasts, setToasts]             = useState([]);
  const toastId                         = useRef(0);

  // ── Toast helpers ──────────────────────────────────────────────
  const toast = useCallback((msg, type="ok", title="") => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, msg, type, title }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const removeToast = id => setToasts(t => t.filter(x => x.id !== id));

  // ── Load all data from Supabase ────────────────────────────────
  const cargarDatos = useCallback(async () => {
    try {
      // Filtrar todos los datos por organization_id si el usuario tiene uno (multiempresa)
      const orgId = usuario?.orgId;
      const qBase = (tabla) => orgId ? sb.from(tabla).eq("organization_id", orgId) : sb.from(tabla);

      const [rPed, rPag, rCli, rUbi, rSuc, rCfg, rSrv, rMaq, rProv, rIns] = await Promise.all([
        qBase("pedidos").select("*").order("created_at", { ascending: false }),
        qBase("pagos").select("*").order("created_at", { ascending: false }),
        qBase("clientes").select("*").order("nombre"),
        qBase("ubicaciones").select("*").eq("activo", true).order("nombre"),
        qBase("sucursales").select("*").eq("activa", true).order("id"),
        qBase("configuracion").select("*"),
        qBase("servicios").select("*").eq("activo", true).order("orden"),
        qBase("maquinas").select("*").eq("activa", true).order("sucursal").order("orden"),
        qBase("proveedores").select("*").eq("activo", true).order("nombre"),
        qBase("pedidos_insumos").select("*").order("created_at", { ascending: false }),
      ]);
      if (rPed.error) throw rPed.error;
      if (rPag.error) throw rPag.error;
      if (rCli.error) throw rCli.error;
      setPedidos((rPed.data || []).map(mapPedido));
      setPagos((rPag.data || []).map(mapPago));
      setClientes((rCli.data || []).map(mapCliente));
      setUbicaciones((rUbi.data || []).map(mapUbicacion));
      if (rSuc.data && rSuc.data.length > 0) {
        const mapped = rSuc.data.map(mapSucursal);
        setSucursalesDB(mapped);
        SUCURSALES = mapped;
      }
      if (rCfg.data && rCfg.data.length > 0) setCfg(mapCfg(rCfg.data));
      if (rSrv.data && rSrv.data.length > 0) {
        const mapped = rSrv.data.map(mapServicio);
        setServiciosDB(mapped);
        SERVICIOS = mapped;
      }
      if (rMaq.data && rMaq.data.length > 0) {
        const mapped = rMaq.data.map(mapMaquina);
        setMaquinasDB(mapped);
        MAQUINAS_DB = mapped;
      }
      setProveedores((rProv.data || []).map(r => ({ id: r.id, nombre: r.nombre, contacto: r.contacto || "", tel: r.tel || "", email: r.email || "", productos: r.productos || "", notas: r.notas || "" })));
      setPedidosInsumos((rIns.data || []).map(r => ({ id: r.id, proveedorId: r.proveedor_id || "", producto: r.producto, cantidad: r.cantidad || "", unidad: r.unidad || "", urgente: r.urgente || false, notas: r.notas || "", sucursal: r.sucursal, solicitadoPor: r.solicitado_por || "", fecha: r.fecha || "", estado: r.estado || "pendiente", tracking: Array.isArray(r.tracking) ? r.tracking : [] })));
    } catch(e) {
      toast("No se pudo cargar datos de la base. Revisá la conexión.", "error", "Error de conexión");
      console.error(e);
    }
  }, [toast]);

  const cargarUsuarios = useCallback(async () => {
    const { data, error } = await sb.from("usuarios").select("*");
    if (!error) setUsuarios((data || []).map(mapUsuario));
  }, []);

  // ── Cargar configuración antes del login (para mostrar nombre empresa) ──
  useEffect(() => {
    sb.from("configuracion").select("*").then(({ data }) => {
      if (data && data.length > 0) setCfg(mapCfg(data));
    });
  }, []);

  // ── Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    if (!usuario) return;
    cargarDatos();
    const ch = sb.channel("lavawash-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => cargarDatos())
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos" }, () => cargarDatos())
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => cargarDatos())
      .subscribe();
    return () => sb.removeChannel(ch);
  }, [usuario, cargarDatos]);

  // ── SheetJS + clock ───────────────────────────────────────────
  useEffect(() => {
    if (!window.XLSX) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      document.head.appendChild(s);
    }
    const t = setInterval(() => setHora(horaActual()), 15000);
    return () => clearInterval(t);
  }, []);

  // ── CRUD: Pedidos ─────────────────────────────────────────────
  const dbCrearPedido = async (pedido) => {
    const { data, error } = await sb.from("pedidos").insert([{
      id: pedido.id, cliente_id: pedido.clienteId, servicio: pedido.servicio,
      maquina: pedido.maquina, sucursal: pedido.sucursal,
      fecha_ingreso: pedido.fechaIngreso, hora_ingreso: pedido.horaIngreso,
      fecha_est_retiro: pedido.fechaEstRetiro, estado: pedido.estado,
      progreso: pedido.progreso, estado_pago: pedido.estadoPago,
      metodo_pago: pedido.metodoPago, monto: pedido.monto, obs: pedido.obs,
      ubicacion_canasto: pedido.ubicacionCanasto || null,
      ...(usuario.orgId ? { organization_id: usuario.orgId } : {}),
    }]).select().single();
    if (error) { toast(error.message, "error", "Error al crear pedido"); return null; }
    // Tracking inicial
    await sb.from("pedido_tracking").insert([{
      pedido_id: pedido.id, estado_anterior: null, estado_nuevo: "Pendiente",
      maquina: pedido.maquina, usuario_nombre: usuario.nombre,
      nota: "Pedido creado",
    }]);
    const pedidoCreado = mapPedido(data);
    toast(`Pedido ${nroPedido(pedidoCreado)} creado`, "ok", "Pedido guardado");
    // Refrescar inmediatamente sin esperar al canal realtime
    await cargarDatos();
    return pedidoCreado;
  };

  const dbCambiarEstado = async (pedidoId, estadoNuevo, maquina, nota) => {
    const ped = pedidos.find(p => p.id === pedidoId);
    const upd = { estado: estadoNuevo };
    if (estadoNuevo === "Listo") upd.progreso = 100;
    if (estadoNuevo === "En uso") upd.hora_inicio = horaActual();
    const { error } = await sb.from("pedidos").update(upd).eq("id", pedidoId);
    if (error) { toast(error.message, "error", "Error al cambiar estado"); return; }
    await sb.from("pedido_tracking").insert([{
      pedido_id: pedidoId, estado_anterior: ped?.estado, estado_nuevo: estadoNuevo,
      maquina: maquina || ped?.maquina, usuario_nombre: usuario.nombre,
      nota: nota || `Cambio a ${estadoNuevo}`,
    }]);
    await cargarDatos();
  };

  const dbActualizarPedido = async (id, campos) => {
    const dbCampos = {};
    if (campos.ubicacionCanasto !== undefined) dbCampos.ubicacion_canasto = campos.ubicacionCanasto;
    if (campos.maquina !== undefined) dbCampos.maquina = campos.maquina;
    if (campos.fechaEstRetiro !== undefined) dbCampos.fecha_est_retiro = campos.fechaEstRetiro;
    if (campos.progreso !== undefined) dbCampos.progreso = campos.progreso;
    if (campos.horaInicio !== undefined) dbCampos.hora_inicio = campos.horaInicio;
    if (Object.keys(dbCampos).length === 0) return;
    const { error } = await sb.from("pedidos").update(dbCampos).eq("id", id);
    if (error) { toast(error.message, "error", "Error al actualizar pedido"); return; }
    // Registrar en tracking si cambia la ubicación
    if (campos.ubicacionCanasto !== undefined) {
      const ped = pedidos.find(p => p.id === id);
      const anterior = ped?.ubicacionCanasto || "(sin ubicación)";
      const nueva = campos.ubicacionCanasto || "(sin ubicación)";
      await sb.from("pedido_tracking").insert([{
        pedido_id: id, estado_anterior: ped?.estado, estado_nuevo: ped?.estado,
        maquina: ped?.maquina, usuario_nombre: usuario.nombre,
        nota: `📦 Ubicación: ${anterior} → ${nueva}`,
      }]);
    }
    await cargarDatos();
  };

  const dbConfirmarPago = async (ped, metodo) => {
    await sb.from("pedidos").update({ estado_pago: "pagado", metodo_pago: metodo }).eq("id", ped.id);
    const pagoId = genId("PAG");
    await sb.from("pagos").insert([{
      id: pagoId, pedido_id: ped.id, cliente_id: ped.clienteId,
      monto: ped.monto, metodo, hora: horaActual(),
      sucursal: ped.sucursal, fecha: hoy,
      ...(usuario.orgId ? { organization_id: usuario.orgId } : {}),
    }]);
    toast("Pago registrado correctamente", "ok");
    await cargarDatos();
  };

  // ── CRUD: Clientes ────────────────────────────────────────────
  const dbGuardarCliente = async (f, editandoId) => {
    if (editandoId) {
      const { error } = await sb.from("clientes").update({
        nombre: f.nombre, tel: f.tel, email: f.email, dni: f.dni,
        dir: f.dir, sucursal: Number(f.sucursal), notas: f.notas,
      }).eq("id", editandoId);
      if (error) { toast(error.message, "error"); return null; }
      await cargarDatos();
      return editandoId;
    } else {
      const id = genId("C");
      const { error } = await sb.from("clientes").insert([{
        id, nombre: f.nombre, tel: f.tel, email: f.email, dni: f.dni,
        dir: f.dir, sucursal: Number(f.sucursal) || 1, notas: f.notas,
        ...(usuario.orgId ? { organization_id: usuario.orgId } : {}),
      }]);
      if (error) { toast(error.message, "error"); return null; }
      toast(`Cliente ${f.nombre} guardado`, "ok");
      await cargarDatos();
      return id;
    }
  };

  const dbEliminarCliente = async (id) => {
    const { error } = await sb.from("clientes").delete().eq("id", id);
    if (error) { toast(error.message, "error"); return; }
    toast("Cliente eliminado", "ok");
    await cargarDatos();
  };

  // ── CRUD: Usuarios ────────────────────────────────────────────
  const dbGuardarUsuario = async (form, editandoId) => {
    if (editandoId) {
      await sb.from("usuarios").update({
        nombre: form.nombre, email: form.email, password: form.password,
        rol: form.rol, sucursal: form.rol === "dueno" ? null : Number(form.sucursal),
        activo: form.activo !== false,
        avatar: form.rol === "dueno" ? "👑" : "👤",
      }).eq("id", editandoId);
    } else {
      await sb.from("usuarios").insert([{
        nombre: form.nombre, email: form.email, password: form.password,
        rol: form.rol, sucursal: form.rol === "dueno" ? null : Number(form.sucursal),
        activo: true, avatar: form.rol === "dueno" ? "👑" : "👤",
        ...(usuario.orgId ? { org_id: usuario.orgId } : {}),
      }]);
    }
    await cargarUsuarios();
  };

  const dbToggleUsuario = async (id, activo) => {
    await sb.from("usuarios").update({ activo }).eq("id", id);
    await cargarUsuarios();
  };

  const dbEliminarUsuario = async (id) => {
    await sb.from("usuarios").delete().eq("id", id);
    await cargarUsuarios();
  };

  const dbCambiarPassword = async (nueva) => {
    await sb.from("usuarios").update({ password: nueva }).eq("id", usuario.id);
    setUsuario(u => ({ ...u, password: nueva }));
    toast("Contraseña actualizada", "ok");
  };

  // ── CRUD: Ubicaciones ─────────────────────────────────────────
  const dbGuardarUbicacion = async (f, editandoId) => {
    if (editandoId) {
      await sb.from("ubicaciones").update({ nombre: f.nombre, descripcion: f.descripcion, sucursal: Number(f.sucursal) }).eq("id", editandoId);
    } else {
      await sb.from("ubicaciones").insert([{ nombre: f.nombre, descripcion: f.descripcion, sucursal: Number(f.sucursal), activo: true, ...(usuario.orgId ? { organization_id: usuario.orgId } : {}) }]);
    }
    const { data } = await sb.from("ubicaciones").select("*").eq("activo", true).order("nombre");
    setUbicaciones((data || []).map(mapUbicacion));
  };

  const dbEliminarUbicacion = async (id) => {
    await sb.from("ubicaciones").update({ activo: false }).eq("id", id);
    setUbicaciones(u => u.filter(x => x.id !== id));
  };

  // ── Sucursales ────────────────────────────────────────────────
  const dbGuardarSucursal = async (f, editandoId) => {
    const row = {
      nombre: f.nombre, direccion: f.direccion, ciudad: f.ciudad,
      tel: f.tel, mp_alias: f.mpAlias, activa: true,
      lv_turno1_desde: f.lvTurno1Desde, lv_turno1_hasta: f.lvTurno1Hasta,
      lv_turno2_desde: f.lvHorarioCorrido ? null : (f.lvTurno2Desde || null),
      lv_turno2_hasta: f.lvHorarioCorrido ? null : (f.lvTurno2Hasta || null),
      lv_horario_corrido: f.lvHorarioCorrido,
      sab_abre: f.sabAbre,
      sab_turno1_desde: f.sabAbre ? f.sabTurno1Desde : null,
      sab_turno1_hasta: f.sabAbre ? f.sabTurno1Hasta : null,
      sab_turno2_desde: (f.sabAbre && !f.sabHorarioCorrido) ? (f.sabTurno2Desde || null) : null,
      sab_turno2_hasta: (f.sabAbre && !f.sabHorarioCorrido) ? (f.sabTurno2Hasta || null) : null,
      sab_horario_corrido: f.sabHorarioCorrido,
      dom_abre: false,
    };
    let newId = editandoId;
    if (editandoId) {
      const { error } = await sb.from("sucursales").update(row).eq("id", editandoId);
      if (error) { toast(error.message, "error"); return; }
    } else {
      const { data, error } = await sb.from("sucursales").insert([{ ...row, ...(usuario.orgId ? { organization_id: usuario.orgId } : {}) }]).select().single();
      if (error) { toast(error.message, "error"); return; }
      newId = data.id;
    }
    toast("Sucursal guardada", "ok");
    await cargarDatos();
    return newId;
  };

  const dbEliminarSucursal = async (id) => {
    await sb.from("sucursales").update({ activa: false }).eq("id", id);
    toast("Sucursal desactivada", "ok");
    await cargarDatos();
  };

  // ── Configuración general ──────────────────────────────────────
  const dbGuardarCfg = async (nuevaCfg) => {
    const rows = [
      { clave: "empresa",           valor: nuevaCfg.empresa },
      { clave: "icono",             valor: nuevaCfg.icono },
      { clave: "slogan",            valor: nuevaCfg.slogan },
      { clave: "moneda",            valor: nuevaCfg.moneda },
      { clave: "mp_token",          valor: nuevaCfg.mpToken },
      { clave: "wa_numero",         valor: nuevaCfg.waNumero },
      { clave: "wa_notif_pedido",   valor: String(nuevaCfg.waNotifPedido) },
      { clave: "wa_reporte",        valor: String(nuevaCfg.waReporte) },
      { clave: "wa_frecuencia",     valor: nuevaCfg.waFrecuencia },
      { clave: "wa_hora",           valor: nuevaCfg.waHora },
      { clave: "smtp_host",         valor: nuevaCfg.smtpHost },
      { clave: "smtp_port",         valor: nuevaCfg.smtpPort },
      { clave: "smtp_user",         valor: nuevaCfg.smtpUser },
      { clave: "smtp_pass",         valor: nuevaCfg.smtpPass || "" },
      { clave: "smtp_from",         valor: nuevaCfg.smtpFrom },
      { clave: "email_dueno",       valor: nuevaCfg.emailDueno },
      { clave: "email_notif",       valor: String(nuevaCfg.emailNotifPedido) },
      { clave: "email_reporte",     valor: String(nuevaCfg.emailReporte) },
      { clave: "email_frecuencia",  valor: nuevaCfg.emailFrecuencia || "diario" },
      { clave: "email_hora",        valor: nuevaCfg.emailHora || "21:00" },
    ];
    const errors = [];
    for (const row of rows) {
      // Si el usuario tiene org, incluir en el upsert y filtrar por org
      const rowConOrg = usuario.orgId ? { ...row, organization_id: usuario.orgId } : row;
      const q = usuario.orgId
        ? sb.from("configuracion").upsert(rowConOrg, { onConflict: "clave,organization_id" })
        : sb.from("configuracion").upsert(rowConOrg, { onConflict: "clave" });
      const { error } = await q;
      if (error) errors.push(row.clave);
    }
    if (errors.length > 0) {
      toast(`Error guardando: ${errors.join(", ")}`, "error", "Error de guardado");
    } else {
      setCfgGlobal(nuevaCfg);
      setCfg(nuevaCfg);
      await logCambio("configuracion", "editar", `Guardó configuración: ${nuevaCfg.empresa} | moneda: ${nuevaCfg.moneda}`);
      toast("Configuración guardada correctamente", "ok", "✅ Guardado");
    }
  };

  // ── Log de cambios ────────────────────────────────────────────────────────────
  const logCambio = async (seccion, accion, detalle, valorAnterior = "", valorNuevo = "") => {
    try {
      await sb.from("config_log").insert([{
        usuario_id: String(usuario?.id || ""),
        usuario_nombre: usuario?.nombre || "Sistema",
        seccion, accion, detalle,
        valor_anterior: valorAnterior ? String(valorAnterior).slice(0, 500) : "",
        valor_nuevo: valorNuevo ? String(valorNuevo).slice(0, 500) : "",
      }]);
    } catch(e) { console.error("Log error:", e); }
  };

  // ── Servicios ─────────────────────────────────────────────────────────────────
  const dbGuardarServicio = async (f, editandoId) => {
    const ant = editandoId ? SERVICIOS.find(s => s.id === editandoId) : null;
    const row = {
      nombre: f.nombre, precio: Number(f.precio), duracion: Number(f.duracion),
      icon: f.icon || "🧺", color: f.color || "#00d4ff", activo: true,
    };
    if (editandoId) {
      const { error } = await sb.from("servicios").update(row).eq("id", editandoId);
      if (error) { toast(error.message, "error"); return; }
      await logCambio("servicios", "editar", `Editó "${f.nombre}"`,
        `precio: $${ant?.precio}`, `precio: $${f.precio}, duración: ${f.duracion}min`);
    } else {
      const newId = f.id || f.nombre.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0,20);
      const { error } = await sb.from("servicios").insert([{ id: newId, ...row, orden: 99, ...(usuario.orgId ? { organization_id: usuario.orgId } : {}) }]);
      if (error) { toast(error.message, "error"); return; }
      await logCambio("servicios", "crear", `Creó servicio: "${f.nombre}" — $${f.precio}`);
    }
    toast(`Servicio "${f.nombre}" guardado`, "ok");
    await cargarDatos();
  };

  const dbEliminarServicio = async (id) => {
    const srv = SERVICIOS.find(s => s.id === id);
    await sb.from("servicios").update({ activo: false }).eq("id", id);
    await logCambio("servicios", "eliminar", `Desactivó servicio: "${srv?.nombre || id}"`);
    toast("Servicio desactivado", "ok");
    await cargarDatos();
  };

  // ── Máquinas ─────────────────────────────────────────────────────────────────
  const dbGuardarMaquina = async (f, editandoId) => {
    const ant = editandoId ? MAQUINAS_DB.find(m => m.id === editandoId) : null;
    if (editandoId) {
      const { error } = await sb.from("maquinas").update({
        tipo: f.tipo, capacidad: f.capacidad || "", estado: f.estado,
        sucursal: Number(f.sucursal),
      }).eq("id", editandoId);
      if (error) { toast(error.message, "error"); return; }
      await logCambio("maquinas", "editar", `Editó máquina ${editandoId}`,
        `${ant?.tipo} — ${ant?.estado}`, `${f.tipo} — ${f.estado}`);
    } else {
      const sucId = Number(f.sucursal);
      const maqs = MAQUINAS_DB.filter(m => m.sucursal === sucId);
      const nextN = maqs.length + 1;
      const newId = `${sucId}-M${String(nextN).padStart(2,"0")}`;
      const { error } = await sb.from("maquinas").insert([{
        id: newId, sucursal: sucId, tipo: f.tipo,
        capacidad: f.capacidad || "", estado: "Disponible", activa: true, orden: nextN,
        ...(usuario.orgId ? { organization_id: usuario.orgId } : {}),
      }]);
      if (error) { toast(error.message, "error"); return; }
      await logCambio("maquinas", "crear", `Creó máquina ${newId}: ${f.tipo} — Suc ${sucId}`);
    }
    toast("Máquina guardada", "ok");
    await cargarDatos();
  };

  const dbCambiarEstadoMaquina = async (id, estado) => {
    const ant = MAQUINAS_DB.find(m => m.id === id);
    await sb.from("maquinas").update({ estado }).eq("id", id);
    await logCambio("maquinas", "editar", `Estado máquina ${id}: "${ant?.estado}" → "${estado}"`);
    await cargarDatos();
  };

  const dbEliminarMaquina = async (id) => {
    const maq = MAQUINAS_DB.find(m => m.id === id);
    await sb.from("maquinas").update({ activa: false }).eq("id", id);
    await logCambio("maquinas", "eliminar", `Desactivó máquina: ${id} — ${maq?.tipo || ""}`);
    toast("Máquina desactivada", "ok");
    await cargarDatos();
  };

  // ── Proveedores ────────────────────────────────────────────────
  const dbGuardarProveedor = async (f, editandoId) => {
    if (editandoId) {
      const { error } = await sb.from("proveedores").update({ nombre: f.nombre, contacto: f.contacto, tel: f.tel, email: f.email, productos: f.productos, notas: f.notas }).eq("id", editandoId);
      if (error) { toast(error.message, "error"); return; }
      toast("Proveedor actualizado", "ok");
    } else {
      const { error } = await sb.from("proveedores").insert([{ nombre: f.nombre, contacto: f.contacto, tel: f.tel, email: f.email, productos: f.productos, notas: f.notas, activo: true, ...(usuario.orgId ? { organization_id: usuario.orgId } : {}) }]);
      if (error) { toast(error.message, "error"); return; }
      toast("Proveedor guardado", "ok");
    }
    await cargarDatos();
  };

  const dbEliminarProveedor = async (id) => {
    await sb.from("proveedores").update({ activo: false }).eq("id", id);
    toast("Proveedor eliminado", "ok");
    await cargarDatos();
  };

  // ── Pedidos de insumos ─────────────────────────────────────────
  const dbGuardarPedidoInsumo = async (f) => {
    const trackingInicial = [{ estadoAnterior: null, estadoNuevo: "pendiente", usuario: f.solicitadoPor, hora: `${hoy} ${horaActual()}` }];
    const { error } = await sb.from("pedidos_insumos").insert([{
      proveedor_id: f.proveedorId || null, producto: f.producto,
      cantidad: f.cantidad, unidad: f.unidad || "",
      urgente: f.urgente || false, notas: f.notas || "",
      sucursal: f.sucursal, solicitado_por: f.solicitadoPor,
      fecha: f.fecha, estado: "pendiente",
      tracking: trackingInicial,
      ...(usuario.orgId ? { organization_id: usuario.orgId } : {}),
    }]);
    if (error) { toast(error.message, "error"); return; }
    await cargarDatos();
  };

  const dbActualizarEstadoInsumo = async (id, estadoNuevo, nombreUsuario) => {
    // Obtener estado anterior
    const pedActual = pedidosInsumos.find(p => p.id === id);
    const estadoAnterior = pedActual?.estado || "";
    // Construir nuevo tracking
    const nuevoEntry = { estadoAnterior, estadoNuevo, usuario: nombreUsuario || usuario.nombre, hora: `${hoy} ${horaActual()}` };
    const trackingActual = pedActual?.tracking || [];
    const trackingActualizado = [...trackingActual, nuevoEntry];
    await sb.from("pedidos_insumos").update({ estado: estadoNuevo, tracking: trackingActualizado }).eq("id", id);
    const EST_LAB_SHORT = { pendiente: "Pendiente", enviado: "Enviado", recibido: "Recibido", resuelto: "Resuelto", cancelado: "Cancelado" };
    toast(`Pedido: ${EST_LAB_SHORT[estadoNuevo] || estadoNuevo}`, "ok");
    await cargarDatos();
  };

  // ── Login ─────────────────────────────────────────────────────
  const handleLogin = async (email, pass) => {
    setLoading(true);
    const { data, error } = await sb.from("usuarios")
      .select("*").eq("email", email).eq("password", pass).eq("activo", true).single();
    setLoading(false);
    if (error || !data) return false;
    const u = mapUsuario(data);
    setUsuario(u);
    if (u.rol === "empleado") setSucursalActiva(u.sucursal);
    // Si tiene org_id, cargar la configuración específica de esa empresa
    if (u.orgId) {
      const { data: cfgData } = await sb.from("configuracion").select("*").eq("organization_id", u.orgId);
      if (cfgData && cfgData.length > 0) setCfg(mapCfg(cfgData));
    }
    await cargarUsuarios();
    return true;
  };

  if (!usuario) return (
    <><style>{G}</style>
      <LoginDB onLogin={handleLogin} loading={loading} cfgLogin={cfg} />
    </>
  );

  const sucFija = usuario.rol === "empleado" ? usuario.sucursal : sucursalActiva;
  const suc = SUCURSALES.find(s => s.id === sucFija);

  return (
    <>
      <style>{G}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar vista={vista} setVista={setVista} sucursalActiva={sucursalActiva} setSucursalActiva={setSucursalActiva} col={col} setCol={setCol} usuario={usuario} onLogout={() => setUsuario(null)} cfg={cfg} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
          <div style={{ padding: "14px 28px", borderBottom: "1px solid #e2e5ef", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", position: "sticky", top: 0, zIndex: 10 }}>
            <div>
              <h1 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, color: "#1a1d2e" }}>{TITULOS[vista]}</h1>
              <div style={{ color: "#9ca3af", fontSize: 12 }}>{suc ? `📍 ${suc.nombre} · ${suc.direccion}` : "Todas las sucursales"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#f0f2f8", border: "1px solid #d0d5e8", borderRadius: 10, padding: "5px 14px", color: "#0ea5e9", fontFamily: "Syne", fontWeight: 700, fontSize: 18 }}>{hora}</div>
              <button onClick={() => setShowCambiarPass(true)} title="Cambiar contraseña" style={{ background: "#f0f2f8", border: "1px solid #d0d5e8", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15 }}>🔐</button>
              <div onClick={() => setShowCambiarPass(true)} style={{ background: usuario.rol === "dueno" ? "linear-gradient(135deg,#fbbf24,#d97706)" : "linear-gradient(135deg,#0ea5e9,#2563eb)", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer" }}>{usuario.avatar}</div>
            </div>
          </div>
          <main style={{ flex: 1 }}>
            {vista === "dashboard"  && <Dashboard pedidos={pedidos} pagos={pagos} clientes={clientes} sucursalActiva={sucursalActiva} usuario={usuario} />}
            {vista === "pedidos"    && <Pedidos pedidos={pedidos} pagos={pagos} clientes={clientes} usuario={usuario} cfg={cfg}
                                         onCrear={dbCrearPedido} onCambiarEstado={dbCambiarEstado}
                                         onConfirmarPago={dbConfirmarPago} onGuardarCliente={dbGuardarCliente}
                                         onActualizarPedido={dbActualizarPedido} ubicaciones={ubicaciones} toast={toast} />}
            {vista === "clientes"   && <Clientes clientes={clientes} pedidos={pedidos} usuario={usuario} onGuardar={dbGuardarCliente} onEliminar={dbEliminarCliente} />}
            {vista === "maquinas"   && <Maquinas sucursalActiva={sucFija} pedidos={pedidos}
                                         maquinas={maquinasDB} onCambiarEstado={dbCambiarEstado}
                                         onGuardarMaquina={dbGuardarMaquina} onEliminarMaquina={dbEliminarMaquina}
                                         onCambiarEstadoMaquina={dbCambiarEstadoMaquina}
                                         usuario={usuario} toast={toast} />}
            {vista === "pagos"      && <Caja pagos={pagos} pedidos={pedidos} clientes={clientes} sucursalActiva={sucursalActiva} usuario={usuario} />}
            {vista === "reportes"   && (usuario.rol === "dueno" || usuario.rol === "superadmin") && <Reportes pedidos={pedidos} pagos={pagos} clientes={clientes} sucursalActiva={sucursalActiva} />}
            {vista === "whatsapp"   && <WAPanel pedidos={pedidos} clientes={clientes} sucursalActiva={sucursalActiva} usuario={usuario} cfg={cfg} />}
            {vista === "insumos"    && <ProveedoresPanel usuario={usuario} proveedores={proveedores} pedidosInsumos={pedidosInsumos} onGuardarProveedor={dbGuardarProveedor} onEliminarProveedor={dbEliminarProveedor} onGuardarPedidoInsumo={dbGuardarPedidoInsumo} onActualizarEstadoInsumo={dbActualizarEstadoInsumo} toast={toast} />}
            {vista === "sucursales" && (usuario.rol === "dueno" || usuario.rol === "superadmin") && <Sucursales pedidos={pedidos} clientes={clientes}
                                         sucursales={sucursalesDB.length > 0 ? sucursalesDB : SUCURSALES}
                                         onGuardar={dbGuardarSucursal} onEliminar={dbEliminarSucursal} />}
            {vista === "usuarios"   && (usuario.rol === "dueno" || usuario.rol === "superadmin") && <Usuarios usuarios={usuarios.filter(u => u.rol !== "superadmin")}
                                         onGuardar={dbGuardarUsuario} onToggle={dbToggleUsuario} onEliminar={dbEliminarUsuario} />}
            {vista === "config"     && (usuario.rol === "dueno" || usuario.rol === "superadmin") && <Configuracion cfg={cfg} setCfg={setCfg}
                                         ubicaciones={ubicaciones} onGuardarUbicacion={dbGuardarUbicacion} onEliminarUbicacion={dbEliminarUbicacion}
                                         onGuardarCfg={dbGuardarCfg}
                                         servicios={serviciosDB.length > 0 ? serviciosDB : SERVICIOS}
                                         onGuardarServicio={dbGuardarServicio} onEliminarServicio={dbEliminarServicio}
                                         logEntries={[]} />}
            {vista === "empresas"   && usuario.rol === "superadmin" && <SuperAdminPanel toast={toast} />}
          </main>
        </div>
      </div>
      <ModalCambiarPass open={showCambiarPass} onClose={() => setShowCambiarPass(false)} usuario={usuario} onGuardar={dbCambiarPassword} />
      <ToastCtx toasts={toasts} removeToast={removeToast} />
    </>
  );
}
