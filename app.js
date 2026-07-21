// app.js - CMMS & Bidding Dashboard for MTI Servicios Industriales 2026
// Reconstrucción al 100% orientada al mantenimiento predictivo e industrial de motores.
// Separación de historial activo (contrato MTI) y antecedentes históricos (pre-2026).

document.addEventListener('DOMContentLoaded', () => {
    if (typeof isAuthenticated === 'function' && !isAuthenticated()) return;
    initApp();
});

// Global state
let STATE = {
    activeTab: 'dashboard',
    searchQuery: '',
    areaFilter: 'all',
    statusFilter: 'all',
    selectedEquipmentId: null,
    selectedMonth: 1,
    equipment: [], // Active filtered equipment list
    allEquipment: [], // Master equipment list across all centers
    selectedClient: 'Cermaq',
    selectedCenter: 'Sta Juana',
    plannedTasks: [],
    bearingsStats: [],
    history: [], // Active contract service logs (filtered)
    auditHistory: [], // Legacy reference audit logs (filtered)
    activeHistoryType: 'activo', // 'activo' or 'auditoria'
    fieldMode: false,
    tempImageBase64: null,
    editMode: 'edit', // 'edit' or 'create'
    plannerSortBy: 'none',
    plannerFilterCrit: 'all',
    plannerFilterStatus: 'all'
};

// Raw database loaded from window or localStorage
let RAW_DB = null;

// Mapping of Months for the 1-Year Tender Plan (Period: June 2026 - May 2027)
const PLANNER_MONTHS = [
    { num: 1, name: "Junio 2026" },
    { num: 2, name: "Julio 2026" },
    { num: 3, name: "Agosto 2026" },
    { num: 4, name: "Septiembre 2026" },
    { num: 5, name: "Octubre 2026" },
    { num: 6, name: "Noviembre 2026" },
    { num: 7, name: "Diciembre 2026" },
    { num: 8, name: "Enero 2027" },
    { num: 9, name: "Febrero 2027" },
    { num: 10, name: "Marzo 2027" },
    { num: 11, name: "Abril 2027" },
    { num: 12, name: "Mayo 2027" }
];

// Helper to provide technical default specifications for motors and equipment
function getSmartDefaultSpecs(nombre, area) {
    const nameLower = nombre.toLowerCase();
    
    // Base defaults
    let specs = {
        marca: "Siemens",
        modelo: "1LA7 Premium",
        serie: "MTI-SN-" + Math.floor(100000 + Math.random() * 900000),
        potencia: "1.5 kW / 2.0 HP",
        voltaje: "380 V / 220 V",
        amperaje: "3.4 A / 5.9 A",
        conexion: "Estrella (Y)",
        cos_fi: "0.82",
        cable_awg: "14 AWG",
        rpm: "1450 RPM",
        rodamientos: ["6204-2RS"],
        repuestos: "Kit de sellos mecánicos, empaquetadura de caja de conexiones, grasa de litio para alta temperatura",
        frecuencia_meses: 6,
        ultima_mantencion: "2026-03-10",
        proxima_mantencion: "2026-09-10"
    };

    if (nameLower.includes("bomba") || nameLower.includes("bba") || nameLower.includes("pompe")) {
        specs.marca = "Grundfos";
        specs.modelo = "CR 15-3 A-F-A-E-HQQE";
        specs.potencia = "3.0 kW / 4.0 HP";
        specs.amperaje = "6.4 A";
        specs.conexion = "Triángulo (Δ)";
        specs.cos_fi = "0.85";
        specs.cable_awg = "12 AWG";
        specs.rpm = "2900 RPM";
        specs.rodamientos = ["6206-2RS", "6205-2RS"];
        specs.repuestos = "Sello mecánico HQQE 12mm, acoplamiento flexible, o-ring de cámara";
        specs.frecuencia_meses = 6;
    } else if (nameLower.includes("chiller")) {
        specs.marca = "Carrier";
        specs.modelo = "AquaSnap 30MP";
        specs.potencia = "18.5 kW / 25 HP";
        specs.voltaje = "380 V";
        specs.amperaje = "36 A";
        specs.conexion = "Estrella/Triángulo (Y/Δ)";
        specs.cos_fi = "0.88";
        specs.cable_awg = "8 AWG";
        specs.rpm = "2900 RPM";
        specs.rodamientos = ["6309-C3", "6208-C3"];
        specs.repuestos = "Filtro secador Danfoss, presostato de alta/baja, aceite POE para compresor, refrigerante R410A";
        specs.frecuencia_meses = 3;
    } else if (nameLower.includes("caldera")) {
        specs.marca = "Attila";
        specs.modelo = "HS-150 Vapor";
        specs.potencia = "7.5 kW / 10 HP (Quemador)";
        specs.voltaje = "380 V";
        specs.amperaje = "15.4 A";
        specs.conexion = "Triángulo (Δ)";
        specs.cos_fi = "0.84";
        specs.cable_awg = "10 AWG";
        specs.rpm = "2850 RPM";
        specs.rodamientos = ["6205-ZZ", "6204-ZZ"];
        specs.repuestos = "Electrodo de encendido, fotocelda Siemens, empaquetadura de grafito, sensor de nivel McDounell";
        specs.frecuencia_meses = 6;
    } else if (nameLower.includes("alimentador") || nameLower.includes("ali") || nameLower.includes("arvotec")) {
        specs.marca = "Arvotec";
        specs.modelo = "Disp-100 Feed System";
        specs.potencia = "0.18 kW / 0.25 HP";
        specs.voltaje = "24 VDC";
        specs.amperaje = "7.5 A";
        specs.conexion = "DC Directa";
        specs.cos_fi = "1.00";
        specs.cable_awg = "16 AWG";
        specs.rpm = "450 RPM";
        specs.rodamientos = ["6202-2RS"];
        specs.repuestos = "Motorreductor 24V, piñón de arrastre de dispersador, fusible de control 3A";
        specs.frecuencia_meses = 12;
    } else if (nameLower.includes("led") || nameLower.includes("foco") || nameLower.includes("ilumina") || nameLower.includes("lampara")) {
        specs.marca = "Philips";
        specs.modelo = "Tango LED 30W IP66";
        specs.potencia = "0.03 kW";
        specs.voltaje = "220 V";
        specs.amperaje = "0.14 A";
        specs.conexion = "Monofásico";
        specs.cos_fi = "0.95";
        specs.cable_awg = "14 AWG";
        specs.rpm = "N/A (Estático)";
        specs.rodamientos = [];
        specs.repuestos = "Driver LED Philips 30W, prensaestopa PG9, módulo LED de repuesto";
        specs.frecuencia_meses = 12;
    } else if (nameLower.includes("blower") || nameLower.includes("soplador")) {
        specs.marca = "Robuschi";
        specs.modelo = "RBS 35";
        specs.potencia = "5.5 kW / 7.5 HP";
        specs.voltaje = "380 V";
        specs.amperaje = "11.2 A";
        specs.conexion = "Triángulo (Δ)";
        specs.cos_fi = "0.83";
        specs.cable_awg = "12 AWG";
        specs.rpm = "1450 RPM";
        specs.rodamientos = ["6307-C3", "6306-C3"];
        specs.repuestos = "Correa de transmisión Optibelt SPZ, filtro de aspiración, aceite sintético para soplador Robuschi";
        specs.frecuencia_meses = 4;
    } else if (nameLower.includes("ventilador") || nameLower.includes("extractor") || nameLower.includes("axia")) {
        specs.marca = "Vent-Axia";
        specs.modelo = "T-Series Industrial";
        specs.potencia = "0.37 kW / 0.5 HP";
        specs.voltaje = "220 V";
        specs.amperaje = "1.9 A";
        specs.conexion = "Monofásico";
        specs.cos_fi = "0.85";
        specs.cable_awg = "14 AWG";
        specs.rpm = "1400 RPM";
        specs.rodamientos = ["6201-2RS"];
        specs.repuestos = "Condensador de arranque 12uF, hélice plástica de repuesto";
        specs.frecuencia_meses = 6;
    } else if (nameLower.includes("decanter") || nameLower.includes("alfa")) {
        specs.marca = "Alfa Laval";
        specs.modelo = "Decanter NX 314";
        specs.potencia = "15 kW / 20 HP";
        specs.voltaje = "380 V";
        specs.amperaje = "29.5 A";
        specs.conexion = "Triángulo (Δ)";
        specs.cos_fi = "0.86";
        specs.cable_awg = "8 AWG";
        specs.rpm = "3200 RPM";
        specs.rodamientos = ["NU 212 (Rodillos)", "6310-C3"];
        specs.repuestos = "Sellos de laberinto, kit de correas Gates, carbón de desgaste para salida";
        specs.frecuencia_meses = 3;
    }

    return specs;
}

// Fallback image helper — paths moved to assets/imagenes-tipo/
function getFallbackImage(nombre) {
    if (!nombre) return null;
    const nameLower = nombre.toLowerCase();
    if (nameLower.includes("chiller")) return "assets/imagenes-tipo/Chiller.jpg.jpeg";
    if (nameLower.includes("caldera")) return "assets/imagenes-tipo/Caldera.jpg.jpeg";
    if (nameLower.includes("ozono")) return "assets/imagenes-tipo/Generadores de Ozono.jpg.jpeg";
    if (nameLower.includes("cono") && nameLower.includes("oxigeno")) return "assets/imagenes-tipo/Conos de Oxigeno.jpg.jpeg";
    if (nameLower.includes("decanter") || nameLower.includes("alfa laval")) return "assets/imagenes-tipo/Decanter Alfa Laval.jpg.jpeg";
    if (nameLower.includes("filtro") && nameLower.includes("banda")) return "assets/imagenes-tipo/Filtro de banda.jpg.jpeg";
    if (nameLower.includes("filtro") && (nameLower.includes("tambor") || nameLower.includes("ftr"))) return "assets/imagenes-tipo/Filtro tambor rotatio (FTR).jpg.jpeg";
    if (nameLower.includes("uv") || nameLower.includes("atlantium")) return "assets/imagenes-tipo/Filtros UV Atlantium.jpg.jpeg";
    if (nameLower.includes("grundfos cr")) return "assets/imagenes-tipo/bba Grundfos Cr.jpg.jpeg";
    if (nameLower.includes("grundfos nb")) return "assets/imagenes-tipo/bba Grundfos nb.jpg.jpeg";
    if (nameLower.includes("grundfos")) return "assets/imagenes-tipo/bba Grundfos Cr.jpg.jpeg";
    if (nameLower.includes("blower") || nameLower.includes("soplador")) return "assets/imagenes-tipo/blower.jpg.jpeg";
    if (nameLower.includes("bomba") && nameLower.includes("calor")) return "assets/imagenes-tipo/bomba de calor.jpg.jpeg";
    if (nameLower.includes("compresor")) return "assets/imagenes-tipo/compresor de aire.jpg.jpeg";
    if (nameLower.includes("secador")) return "assets/imagenes-tipo/filtro secador.jpg.jpeg";
    if (nameLower.includes("motorreduct") || nameLower.includes("reductor")) return "assets/imagenes-tipo/motorreductores.jpg.jpeg";
    if (nameLower.includes("motor")) return "assets/imagenes-tipo/motores electricos.jpg.jpeg";
    if (nameLower.includes("tablero") || nameLower.includes("control")) return "assets/imagenes-tipo/tablero de control.jpg.jpeg";
    if (nameLower.includes("alimentador") || nameLower.includes("arvotec")) return "assets/imagenes-tipo/alimentadores arvotec.jpg.jpeg";
    if (nameLower.includes("led") || nameLower.includes("foco") || nameLower.includes("ilumina") || nameLower.includes("lampara")) return "assets/imagenes-tipo/Lámparas led.jpg.jpeg";
    if (nameLower.includes("seleccionadora") || nameLower.includes("apollo")) return "assets/imagenes-tipo/Seleccionadora Apollo.jpg.jpeg";
    if (nameLower.includes("ventilador") || nameLower.includes("extractor") || nameLower.includes("axia")) return "assets/imagenes-tipo/Ventilador Vent-axia & Vortice.jpg.jpeg";
    if (nameLower.includes("tecnicapompe") || nameLower.includes("pompe") || nameLower.includes("pin pin")) return "assets/imagenes-tipo/Bomba Pin Pin - Pompe.jpg.jpeg";
    if (nameLower.includes("sandpiper") || nameLower.includes("sand piper")) return "assets/imagenes-tipo/Bomba Sand piper.jpg.jpeg";
    return null;
}

let appInitialized = false;

// Initialize Application
function initApp() {
    // Check if we are in Terrain QR View Mode first
    const urlParams = new URLSearchParams(window.location.search);
    const eqIdParam = urlParams.get('eqId');
    
    if (appInitialized) {
        // Load database from cache/memory and filter
        const savedRaw = localStorage.getItem('PISCICULTURA_CONSOLIDATED_RAW');
        if (savedRaw) {
            try {
                RAW_DB = JSON.parse(savedRaw);
            } catch (e) {}
        }
        if (RAW_DB) {
            STATE.allEquipment = RAW_DB.Equipos || [];
            updateTenantFiltering();
        }
        syncWithSheets();
        return;
    }
    appInitialized = true;
    
    // Load database from localStorage or window global
    const savedRaw = localStorage.getItem('PISCICULTURA_CONSOLIDATED_RAW');
    if (savedRaw) {
        try {
            RAW_DB = JSON.parse(savedRaw);
            console.log("Database loaded from localStorage");
        } catch (e) {
            console.error("Error parsing saved database from localStorage.", e);
            RAW_DB = window.DB_PISCICULTURA;
        }
    } else {
        RAW_DB = window.DB_PISCICULTURA;
    }

    if (!RAW_DB) {
        console.error("Database not loaded. Reverting to empty template.");
        RAW_DB = { Equipos: [], HistorialGlobal: [], AntecedentesGlobal: [], TrabajosExtraordinarios: [], TarifaHoraMTI: 0 };
    }

    // Defensive migrations for new v3.0 fields
    if (!RAW_DB.TrabajosExtraordinarios) RAW_DB.TrabajosExtraordinarios = [];
    if (!RAW_DB.hasOwnProperty('TarifaHoraMTI')) RAW_DB.TarifaHoraMTI = 0;
    if (!RAW_DB.OtrosRepuestos) RAW_DB.OtrosRepuestos = [];
    // Migrate HistorialGlobal entries to include costoRepuestos if missing
    (RAW_DB.HistorialGlobal || []).forEach(h => { if (!h.hasOwnProperty('costoRepuestos')) h.costoRepuestos = 0; });

    // Migrate any active history (HistorialGlobal) to legacy history (AntecedentesGlobal) to start clean at 0
    if (RAW_DB.HistorialGlobal && RAW_DB.HistorialGlobal.length > 0) {
        console.log(`Moving ${RAW_DB.HistorialGlobal.length} active history entries to AntecedentesGlobal as reference...`);
        if (!RAW_DB.AntecedentesGlobal) RAW_DB.AntecedentesGlobal = [];
        
        RAW_DB.HistorialGlobal.forEach(h => {
            const eq = (RAW_DB.Equipos || []).find(e => e.id === (h.eqId || h.id));
            RAW_DB.AntecedentesGlobal.push({
                fecha: h.fecha,
                tarea: h.trabajo || h.tarea || 'Orden de Trabajo',
                rodamientos: h.rodamientos || [],
                eqId: h.eqId || h.id,
                eqName: eq ? eq.nombre : (h.eqName || ''),
                area: eq ? eq.area : (h.area || ''),
                fuente: h.fuente || "Bitácora de Referencia Anterior",
                tecnico: h.tecnico || 'Pre-MTI',
                detalles: h.comentarios || h.detalles || '',
                costoRepuestos: h.costoRepuestos || 0,
                tiempoReparacion: h.tiempoReparacion || h.horas || 0,
                tipo: h.tipo || 'OT'
            });
        });
        
        // Clear active history so it starts clean at 0
        RAW_DB.HistorialGlobal = [];
        
        // Save database changes
        localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
        saveToLocalServer(RAW_DB);
        console.log("Active history successfully moved to legacy references.");
    }

    // Trigger migration if old structure or no AntecedentesGlobal is detected
    if (!RAW_DB.hasOwnProperty('AntecedentesGlobal')) {
        console.log("Forcing database migration to MTI split history format (Active Contract = Clean)...");
        RAW_DB = migrateDatabaseFormat(RAW_DB);
        // Persist migrated database
        localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
        saveToLocalServer(RAW_DB);
    }

    // Load active selection or default
    STATE.selectedClient = localStorage.getItem('MTI_SELECTED_CLIENT') || 'Cermaq';
    STATE.selectedCenter = localStorage.getItem('MTI_SELECTED_CENTER') || 'Sta Juana';

    // Verify and initialize RAW_DB dynamic list of Clients/Centers
    if (!RAW_DB.Clientes) {
        RAW_DB.Clientes = ["Cermaq"];
    }
    if (!RAW_DB.Centros) {
        RAW_DB.Centros = {
            "Cermaq": ["Sta Juana", "Rahue", "Trafun"]
        };
    }

    // Migrate all equipments to have client/center and fix generic image paths if missing
    let dbUpdated = false;
    STATE.allEquipment = RAW_DB.Equipos || [];
    STATE.allEquipment.forEach(eq => {
        let eqUpdated = false;
        if (!eq.cliente) {
            eq.cliente = "Cermaq";
            eqUpdated = true;
        }
        if (!eq.centro) {
            eq.centro = "Sta Juana";
            eqUpdated = true;
        }
        
        // Fix generic image path for eq.imagen
        if (eq.imagen && !eq.imagen.startsWith('assets/') && !eq.imagen.startsWith('fotos_equipos/') && !eq.imagen.startsWith('http') && !eq.imagen.startsWith('data:')) {
            eq.imagen = `assets/imagenes-tipo/${eq.imagen}`;
            eqUpdated = true;
        }

        // Fix generic image paths for eq.imagenes list
        if (!eq.imagenes) {
            eq.imagenes = eq.imagen ? [eq.imagen] : [];
            eqUpdated = true;
        } else {
            eq.imagenes = eq.imagenes.map(img => {
                if (img && !img.startsWith('assets/') && !img.startsWith('fotos_equipos/') && !img.startsWith('http') && !img.startsWith('data:')) {
                    eqUpdated = true;
                    return `assets/imagenes-tipo/${img}`;
                }
                return img;
            });
        }
        
        if (eqUpdated) {
            dbUpdated = true;
        }
    });

    if (dbUpdated) {
        RAW_DB.Equipos = STATE.allEquipment;
        localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
        saveToLocalServer(RAW_DB);
        console.log("Database image paths/tenancy self-healing completed");
    }

    if (eqIdParam) {
        STATE.fieldMode = true;
        STATE.selectedEquipmentId = eqIdParam;
        
        // Find the equipment in all equipment to switch center
        const eq = STATE.allEquipment.find(e => e.id === eqIdParam);
        if (eq) {
            STATE.selectedClient = eq.cliente || 'Cermaq';
            STATE.selectedCenter = eq.centro || 'Sta Juana';
            localStorage.setItem('MTI_SELECTED_CLIENT', STATE.selectedClient);
            localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
        }
    }

    // Filter equipment and history for the active selection
    STATE.equipment = STATE.allEquipment.filter(e => e.cliente === STATE.selectedClient && e.centro === STATE.selectedCenter);
    const activeEqIds = new Set(STATE.equipment.map(e => e.id));
    STATE.history = (RAW_DB.HistorialGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));
    STATE.auditHistory = (RAW_DB.AntecedentesGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));

    // Update dynamic subtitle in header
    const subtitle = document.getElementById('app-subtitle-display');
    if (subtitle) {
        subtitle.innerText = `Mantenimiento ${STATE.selectedClient.toUpperCase()} ${STATE.selectedCenter.toUpperCase()} 2026`;
    }

    if (eqIdParam) {
        // Show only mobile terrain view
        document.getElementById('terrain-field-view').style.display = 'block';
        document.querySelector('.app-container').style.display = 'none';
        renderTerrainView(eqIdParam);
    } else {
        STATE.fieldMode = false;
        document.getElementById('terrain-field-view').style.display = 'none';
        document.querySelector('.app-container').style.display = 'flex';
        
        // Populate and setup dynamic selectors in sidebar
        populateTenantSelectors();
        setupTenantSelectors();

        // Run core CMMS
        generatePlannedTasks();
        renderKPIs();
        renderTabContent();
        setupEventListeners();
        checkLocalServerConnection();
    }

    // Remote Google Sheets real-time database sync check
    setupConnectionMonitoring();
    syncWithSheets();
}

// Populate Client and Center Selectors
function populateTenantSelectors() {
    const clientSelect = document.getElementById('global-client-select');
    const centerSelect = document.getElementById('global-center-select');
    if (!clientSelect || !centerSelect) return;

    // Load list from RAW_DB (with migration fallback)
    if (!RAW_DB.Clientes) {
        RAW_DB.Clientes = ["Cermaq"];
    }
    if (!RAW_DB.Centros) {
        RAW_DB.Centros = {
            "Cermaq": ["Sta Juana", "Rahue", "Trafun"]
        };
    }

    // Populate Clients
    let clientHtml = RAW_DB.Clientes.map(c => `<option value="${c}" ${c === STATE.selectedClient ? 'selected' : ''}>${c}</option>`).join('');
    clientHtml += `<option value="ADD_NEW_CLIENT" style="color: var(--accent-blue-glow); font-weight: bold;">+ Nuevo Cliente...</option>`;
    clientSelect.innerHTML = clientHtml;

    // Populate Centers for selected client
    const centers = RAW_DB.Centros[STATE.selectedClient] || [];
    let centerHtml = centers.map(c => `<option value="${c}" ${c === STATE.selectedCenter ? 'selected' : ''}>${c}</option>`).join('');
    centerHtml += `<option value="ADD_NEW_CENTER" style="color: var(--accent-blue-glow); font-weight: bold;">+ Nuevo Centro...</option>`;
    centerSelect.innerHTML = centerHtml;
}

// Setup Tenant Listeners
function setupTenantSelectors() {
    const clientSelect = document.getElementById('global-client-select');
    const centerSelect = document.getElementById('global-center-select');
    if (!clientSelect || !centerSelect) return;

    let previousClient = STATE.selectedClient;
    clientSelect.addEventListener('change', () => {
        const val = clientSelect.value;
        if (val === 'ADD_NEW_CLIENT') {
            const name = prompt("Ingrese el nombre de la nueva empresa/cliente:");
            if (name && name.trim()) {
                const cleanName = name.trim();
                if (!RAW_DB.Clientes.includes(cleanName)) {
                    RAW_DB.Clientes.push(cleanName);
                    // Initialize first center for this client
                    const firstCenter = prompt(`Ingrese el primer centro para ${cleanName}:`, "Centro Principal");
                    const cleanCenter = firstCenter ? firstCenter.trim() : "Centro Principal";
                    RAW_DB.Centros[cleanName] = [cleanCenter];
                    
                    STATE.selectedClient = cleanName;
                    STATE.selectedCenter = cleanCenter;
                    previousClient = cleanName;

                    localStorage.setItem('MTI_SELECTED_CLIENT', STATE.selectedClient);
                    localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
                    
                    saveToLocalServer(RAW_DB);
                } else {
                    alert("Ese cliente ya existe.");
                    clientSelect.value = previousClient;
                }
            } else {
                clientSelect.value = previousClient;
            }
        } else {
            STATE.selectedClient = val;
            previousClient = val;
            
            // Default to first center of new client
            const centers = RAW_DB.Centros[val] || [];
            STATE.selectedCenter = centers[0] || "";
            
            localStorage.setItem('MTI_SELECTED_CLIENT', STATE.selectedClient);
            localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
        }
        
        updateTenantFiltering();
    });

    let previousCenter = STATE.selectedCenter;
    centerSelect.addEventListener('change', () => {
        const val = centerSelect.value;
        if (val === 'ADD_NEW_CENTER') {
            const name = prompt("Ingrese el nombre del nuevo centro de cultivo:");
            if (name && name.trim()) {
                const cleanName = name.trim();
                const centers = RAW_DB.Centros[STATE.selectedClient] || [];
                if (!centers.includes(cleanName)) {
                    centers.push(cleanName);
                    RAW_DB.Centros[STATE.selectedClient] = centers;
                    
                    STATE.selectedCenter = cleanName;
                    previousCenter = cleanName;

                    localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
                    
                    saveToLocalServer(RAW_DB);
                } else {
                    alert("Ese centro ya existe.");
                    centerSelect.value = previousCenter;
                }
            } else {
                centerSelect.value = previousCenter;
            }
        } else {
            STATE.selectedCenter = val;
            previousCenter = val;
            localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
        }
        
        updateTenantFiltering();
    });
}

// Re-filter equipment and history, and refresh UI
function updateTenantFiltering() {
    // Re-filter active equipment
    STATE.equipment = STATE.allEquipment.filter(e => e.cliente === STATE.selectedClient && e.centro === STATE.selectedCenter);
    
    // Re-filter active history and audit history
    const activeEqIds = new Set(STATE.equipment.map(e => e.id));
    STATE.history = (RAW_DB.HistorialGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));
    STATE.auditHistory = (RAW_DB.AntecedentesGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));

    // Update dynamic subtitle in header
    const subtitle = document.getElementById('app-subtitle-display');
    if (subtitle) {
        subtitle.innerText = `Mantenimiento ${STATE.selectedClient.toUpperCase()} ${STATE.selectedCenter.toUpperCase()} 2026`;
    }

    // Refresh selectors to ensure selections are correct
    populateTenantSelectors();

    // Regenerate planned tasks for calendar
    generatePlannedTasks();

    // Refresh current tab/view
    renderKPIs();
    renderTabContent();
}


// Database Migrator: converts legacy tables to MTI consolidated motor technical structure with SPLIT history

function migrateDatabaseFormat(oldDb) {
    let consolidated = [];
    let idMap = new Set();
    let globalLegacyHistory = [];

    // Check if we are migrating from old consolidated format or the raw one
    let legacyEquiposSource = [];
    let isV1Consolidated = oldDb.hasOwnProperty('Equipos');

    function parseBearings(bearingStr) {
        if (!bearingStr) return [];
        if (Array.isArray(bearingStr)) return bearingStr;
        const matches = bearingStr.match(/\b\d{4}\b/g);
        return matches ? [...new Set(matches)] : [];
    }

    if (isV1Consolidated) {
        // We already have some Equipment arrays in V1 format. We migrate them to V2 (clearing active history, keeping original dates in antecedentes)
        oldDb.Equipos.forEach(eq => {
            const defaults = getSmartDefaultSpecs(eq.nombre, eq.area);
            
            // Reconstruct antecedentes from active historico if we are upgrading v1, keeping original dates
            let antecedents = [];
            if (eq.historico && eq.historico.length > 0) {
                antecedents = eq.historico.map(h => ({
                    fecha: h.fecha,
                    tipo: h.tipo || "Preventivo",
                    rodamientos: h.rodamientos || [],
                    trabajo: h.trabajo,
                    tecnico: h.tecnico || "Auditoría Planta"
                }));
            }
            
            const item = {
                id: eq.id,
                nombre: eq.nombre,
                area: eq.area,
                designacion: eq.designacion || "",
                cantidad: eq.cantidad || 1,
                horasFuncionamiento: eq.horasFuncionamiento || 8,
                criticidad: eq.criticidad || "Baja",
                estado: eq.estado || "Operativo",
                imagen: eq.imagen || "",
                
                marca: eq.marca || defaults.marca,
                modelo: eq.modelo || defaults.modelo,
                serie: eq.serie || defaults.serie,
                potencia: eq.potencia || defaults.potencia,
                voltaje: eq.voltaje || defaults.voltaje,
                amperaje: eq.amperaje || defaults.amperaje,
                conexion: eq.conexion || defaults.conexion,
                cos_fi: eq.cos_fi || defaults.cos_fi,
                cable_awg: eq.cable_awg || defaults.cable_awg,
                rpm: eq.rpm || defaults.rpm,
                
                rodamientos: eq.rodamientos || [],
                repuestos: eq.repuestos || defaults.repuestos,
                
                ultima_mantencion: eq.ultima_mantencion || "2026-03-01",
                proxima_mantencion: eq.proxima_mantencion || "2026-09-01",
                frecuencia_meses: eq.frecuencia_meses || defaults.frecuencia_meses,
                
                antecedentes: antecedents,
                historico: [] // Clean active log!
            };
            consolidated.push(item);
        });

        // Add legacy services from old db
        if (oldDb.AntecedentesGlobal) {
            globalLegacyHistory = oldDb.AntecedentesGlobal;
        } else {
            // Recompile from v1 history
            if (oldDb.HistorialGlobal) {
                globalLegacyHistory = oldDb.HistorialGlobal.map(h => ({
                    ...h,
                    tecnico: h.tecnico || "Auditoría Planta",
                    fuente: "Auditoría Histórica"
                }));
            }
        }
    } else {
        // Migrating straight from raw legacy database.js
        // A. Parse DetallesMantenimientoPorArea
        if (oldDb.DetallesMantenimientoPorArea) {
            const areas = oldDb.DetallesMantenimientoPorArea;
            for (const rawArea in areas) {
                let areaLabel = rawArea;
                if (rawArea === 'equipos ex') areaLabel = 'Exteriores';
                if (rawArea === 'HATCT') areaLabel = 'Hatchery';
                
                areas[rawArea].forEach(eq => {
                    const genEq = oldDb.InventarioGeneral ? oldDb.InventarioGeneral.find(g => g.Nombre.toLowerCase().trim() === eq.Nombre.toLowerCase().trim()) : null;
                    const id = eq.Id || `MTI-EQ-${Math.floor(1000 + Math.random() * 9000)}`;
                    idMap.add(id);

                    const defaults = getSmartDefaultSpecs(eq.Nombre, areaLabel);

                    const item = {
                        id: id,
                        nombre: eq.Nombre,
                        area: areaLabel,
                        designacion: eq.Designacion || (genEq ? genEq.Designacion : "") || "",
                        cantidad: parseInt(eq.Cantidad) || (genEq ? parseInt(genEq.Cantidad) : 1) || 1,
                        horasFuncionamiento: parseInt(eq.HorasFuncionamiento) || (genEq ? parseInt(genEq.HorasFuncionamiento) : 8) || 8,
                        criticidad: "Baja",
                        estado: eq.Realizado === "si" ? "Operativo" : "Requiere Revisión",
                        imagen: getFallbackImage(eq.Nombre) || "",
                        
                        marca: defaults.marca,
                        modelo: defaults.modelo,
                        serie: defaults.serie,
                        potencia: eq.Potencia || (genEq ? genEq.Potencia : "") || defaults.potencia,
                        voltaje: defaults.voltaje,
                        amperaje: defaults.amperaje,
                        conexion: defaults.conexion,
                        cos_fi: defaults.cos_fi,
                        cable_awg: defaults.cable_awg,
                        rpm: defaults.rpm,
                        
                        rodamientos: parseBearings(eq.RodamientosPrincipales).length > 0 ? parseBearings(eq.RodamientosPrincipales) : defaults.rodamientos,
                        repuestos: defaults.repuestos,
                        
                        // Default predictive dates for start of contract
                        ultima_mantencion: "2026-03-01",
                        proxima_mantencion: "2026-09-01",
                        frecuencia_meses: defaults.frecuencia_meses,
                        
                        // Legacy history goes under antecedentes, original dates preserved
                        antecedentes: (eq.HistoricoIntervenciones || []).map(h => ({
                            fecha: h.Fecha || "2014-04-12",
                            tipo: h.Trabajo?.toLowerCase().includes("instala") ? "Instalación" : "Preventivo",
                            rodamientos: parseBearings(h.Rodamientos),
                            trabajo: h.Trabajo || "Mantención general realizada en planta",
                            tecnico: "Auditoría Planta"
                        })).filter(h => h.trabajo),
                        historico: [] // Start blank
                    };

                    if (item.horasFuncionamiento >= 24) item.criticidad = "Alta";
                    else if (item.horasFuncionamiento >= 12) item.criticidad = "Media";

                    consolidated.push(item);
                });
            }
        }

        // B. Merge remaining General inventory items
        if (oldDb.InventarioGeneral) {
            oldDb.InventarioGeneral.forEach(genEq => {
                const exists = consolidated.some(c => c.nombre.toLowerCase().trim() === genEq.Nombre.toLowerCase().trim());
                if (!exists) {
                    const id = genEq.Id || `MTI-EQ-${Math.floor(1000 + Math.random() * 9000)}`;
                    const area = genEq.Area || 'Hatchery';
                    const defaults = getSmartDefaultSpecs(genEq.Nombre, area);

                    const item = {
                        id: id,
                        nombre: genEq.Nombre,
                        area: area,
                        designacion: genEq.Designacion || "",
                        cantidad: parseInt(genEq.Cantidad) || 1,
                        horasFuncionamiento: parseInt(genEq.HorasFuncionamiento) || 8,
                        criticidad: "Baja",
                        estado: "Operativo",
                        imagen: getFallbackImage(genEq.Nombre) || "",
                        
                        marca: defaults.marca,
                        modelo: defaults.modelo,
                        serie: defaults.serie,
                        potencia: genEq.Potencia || defaults.potencia,
                        voltaje: defaults.voltaje,
                        amperaje: defaults.amperaje,
                        conexion: defaults.conexion,
                        cos_fi: defaults.cos_fi,
                        cable_awg: defaults.cable_awg,
                        rpm: defaults.rpm,
                        
                        rodamientos: parseBearings(genEq.RodamientosPrincipales || "").length > 0 ? parseBearings(genEq.RodamientosPrincipales || "") : defaults.rodamientos,
                        repuestos: defaults.repuestos,
                        
                        ultima_mantencion: "2026-03-01",
                        proxima_mantencion: "2026-09-01",
                        frecuencia_meses: defaults.frecuencia_meses,
                        antecedentes: [],
                        historico: []
                    };

                    if (item.horasFuncionamiento >= 24) item.criticidad = "Alta";
                    else if (item.horasFuncionamiento >= 12) item.criticidad = "Media";

                    consolidated.push(item);
                }
            });
        }

        // C. Add Focos LED
        if (oldDb.RegistroIluminacionFocosLed) {
            oldDb.RegistroIluminacionFocosLed.forEach((foco, index) => {
                const id = foco.Id || `MTI-LGT-${index + 1}`;
                const name = foco.Nombre || `Luminaria Foco Led Estanque ${foco.Registro2014?.Estanque || index + 1}`;
                const defaults = getSmartDefaultSpecs(name, "Iluminación");

                const item = {
                    id: id,
                    nombre: name,
                    area: "Iluminación",
                    designacion: "Luminarias Estanques",
                    cantidad: foco.Cantidad || 1,
                    horasFuncionamiento: foco.HorasFuncionamiento || 12,
                    criticidad: "Baja",
                    estado: foco.Registro2015?.Estado === "malo" ? "Requiere Revisión" : "Operativo",
                    imagen: "Lámparas led.jpg.jpeg",
                    
                    marca: defaults.marca,
                    modelo: defaults.modelo,
                    serie: defaults.serie,
                    potencia: foco.Potencia || defaults.potencia,
                    voltaje: defaults.voltaje,
                    amperaje: defaults.amperaje,
                    conexion: defaults.conexion,
                    cos_fi: defaults.cos_fi,
                    cable_awg: defaults.cable_awg,
                    rpm: defaults.rpm,
                    
                    rodamientos: [],
                    repuestos: defaults.repuestos,
                    
                    ultima_mantencion: "2026-01-10",
                    proxima_mantencion: "2026-07-10",
                    frecuencia_meses: 6,
                    antecedentes: [],
                    historico: []
                };

                if (foco.Registro2014?.Fecha) {
                    item.antecedentes.push({
                        fecha: foco.Registro2014.Fecha,
                        tipo: "Instalación",
                        rodamientos: [],
                        trabajo: foco.Registro2014.Tipo || "Montaje inicial de foco LED",
                        tecnico: "Auditoría Planta"
                    });
                }
                if (foco.Registro2015?.Fecha) {
                    item.antecedentes.push({
                        fecha: foco.Registro2015.Fecha,
                        tipo: "Preventivo",
                        rodamientos: [],
                        trabajo: foco.Registro2015.Observacion || "Inspección de estanqueidad y hermeticidad",
                        tecnico: "Auditoría Planta"
                    });
                }

                consolidated.push(item);
            });
        }

        // D. Add Alimentadores
        if (oldDb.InventarioAlimentadoresSmolt) {
            oldDb.InventarioAlimentadoresSmolt.forEach((ali, index) => {
                const id = ali.Id || `MTI-ALI-${index + 1}`;
                const name = ali.Nombre || `Alimentador Smolt Estanque ${ali.Estanque || index + 1}`;
                const defaults = getSmartDefaultSpecs(name, "Alimentación");

                const item = {
                    id: id,
                    nombre: name,
                    area: "Alimentación",
                    designacion: "Alimentadores Automáticos",
                    cantidad: ali.Cantidad || 1,
                    horasFuncionamiento: ali.HorasFuncionamiento || 4,
                    criticidad: "Media",
                    estado: ali.Mantenimiento2015?.Estado?.includes("quemado") ? "Crítico" : "Operativo",
                    imagen: "alimentadores arvotec.jpg.jpeg",
                    
                    marca: defaults.marca,
                    modelo: defaults.modelo,
                    serie: defaults.serie,
                    potencia: ali.Potencia || defaults.potencia,
                    voltaje: defaults.voltaje,
                    amperaje: defaults.amperaje,
                    conexion: defaults.conexion,
                    cos_fi: defaults.cos_fi,
                    cable_awg: defaults.cable_awg,
                    rpm: defaults.rpm,
                    
                    rodamientos: parseBearings(ali.RodamientosPrincipales || "6202").length > 0 ? parseBearings(ali.RodamientosPrincipales || "6202") : ["6202-2RS"],
                    repuestos: defaults.repuestos,
                    
                    ultima_mantencion: "2026-02-15",
                    proxima_mantencion: "2026-08-15",
                    frecuencia_meses: 6,
                    antecedentes: [],
                    historico: []
                };

                if (ali.Mantenimiento2014?.Fecha) {
                    item.antecedentes.push({
                        fecha: ali.Mantenimiento2014.Fecha,
                        tipo: "Preventivo",
                        rodamientos: [],
                        trabajo: ali.Mantenimiento2014.Observacion || "Mantención e inspección de motores",
                        tecnico: "Auditoría Planta"
                    });
                }
                if (ali.Mantenimiento2015?.Fecha) {
                    item.antecedentes.push({
                        fecha: ali.Mantenimiento2015.Fecha,
                        tipo: "Preventivo",
                        rodamientos: ["6202"],
                        trabajo: ali.Mantenimiento2015.Observacion || "Cambio de motor de dispersador por rodamiento ruidoso",
                        tecnico: "Auditoría Planta"
                    });
                }

                consolidated.push(item);
            });
        }

        // Build global legacy audit history timeline
        consolidated.forEach(eq => {
            eq.antecedentes.forEach(h => {
                globalLegacyHistory.push({
                    fecha: h.fecha,
                    tarea: h.trabajo,
                    rodamientos: h.rodamientos,
                    eqId: eq.id,
                    eqName: eq.nombre,
                    area: eq.area,
                    fuente: "Auditoría Planta",
                    tecnico: "Auditoría Planta"
                });
            });
        });

        if (oldDb.ControlServiciosLog) {
            oldDb.ControlServiciosLog.forEach(srv => {
                globalLegacyHistory.push({
                    fecha: srv.Fecha || "2014-07-01",
                    tarea: `Servicio Planta: ${srv.Tarea}`,
                    rodamientos: [],
                    eqId: null,
                    eqName: "Servicios Generales Planta",
                    area: "Servicios",
                    fuente: "Control de Servicios",
                    tecnico: srv.Responsable || "Planta",
                    detalles: srv.Detalles
                });
            });
        }

        if (oldDb.VisitasTecnicasLog) {
            oldDb.VisitasTecnicasLog.forEach(vis => {
                globalLegacyHistory.push({
                    fecha: vis.Fecha || "2014-06-01",
                    tarea: `Visita Técnica Externa: ${vis.TrabajoRealizado}`,
                    rodamientos: [],
                    eqId: null,
                    eqName: `Técnicos: ${vis.Tecnicos}`,
                    area: "Externo",
                    fuente: "Planilla de Visitas",
                    tecnico: "Externo",
                    detalles: `Hora llegada: ${vis.HoraLlegada} | Estado: ${vis.EstadoDebe}`
                });
            });
        }
    }

    globalLegacyHistory.sort((a, b) => b.fecha.localeCompare(a.fecha));

    return {
        "Equipos": consolidated,
        "HistorialGlobal": [], // Active contract history starts clean!
        "AntecedentesGlobal": globalLegacyHistory
    };
}

// Generate planned 1-year preventive tasks scheduled for 2026-2027 period
function generatePlannedTasks() {
    let tasks = [];

    STATE.equipment.forEach(eq => {
        const crit = eq.criticidad;
        
        // Loop through the 12 calendar months of our tender plan
        for (let m = 1; m <= 12; m++) {
            let taskText = "";
            let requiredBearings = [];
            
            // Core preventive routines based on machine criticality and months
            if (crit === "Alta") {
                if (m === 12) {
                    taskText = "Overhaul General Anual: Desarme completo de motor, cambio de rodamientos principales y sellos mecánicos, verificación de conexiones Estrella/Triángulo y coseno de fi.";
                    requiredBearings = [...eq.rodamientos];
                } else if (m === 6) {
                    taskText = "Inspección Semestral: Megado de bobinado, medición de consumo de corriente en cable AWG, balanceo dinámico e inspección de rodamientos.";
                } else {
                    taskText = "Control Mensual Rutinario: Limpieza de carcasa de motor, reapriete eléctrico de bornes en tablero y medición de temperatura infrarroja.";
                }
            } else if (crit === "Media") {
                // Occurs every 3 months (quarterly cycle)
                if (m === 12) {
                    taskText = "Mantención Anual: Cambio de rodamientos de motor, inspección de ventilador de acople, alineación láser y engrase general.";
                    requiredBearings = [...eq.rodamientos];
                } else if (m % 3 === 0) {
                    taskText = `Mantención Trimestral: Medición de vibración, reapriete de cable de alimentación en borneras y limpieza del rotor.`;
                }
            } else {
                // Low criticality (inspections every 6 months)
                if (m === 12) {
                    taskText = "Revisión Anual Preventiva: Verificación de cableado de alimentación, limpieza por soplado, lubricación y comprobación de consumo.";
                } else if (m === 6) {
                    taskText = "Inspección Semestral: Limpieza de rejilla de ventilador, inspección visual de fisuras y prueba de partida en vacío.";
                }
            }

            if (taskText !== "") {
                const taskId = `PLAN-${eq.id}-${m}`;
                const completada = (RAW_DB && RAW_DB.TareasCompletadas) ? RAW_DB.TareasCompletadas.includes(taskId) : false;
                tasks.push({
                    id: taskId,
                    eqId: eq.id,
                    eqName: eq.nombre,
                    area: eq.area,
                    horasFuncionamiento: eq.horasFuncionamiento || 8,
                    cliente: eq.cliente || 'Cermaq',
                    centro: eq.centro || 'Sta Juana',
                    mes: m,
                    tarea: taskText,
                    rodamientos: requiredBearings,
                    criticidad: crit,
                    completada: completada
                });
            }

        }
    });

    STATE.plannedTasks = tasks;
}

// Render Dashboard KPI Cards
function renderKPIs() {
    document.getElementById('kpi-total-equipos').innerText = STATE.equipment.length;
    
    let totalPower = 0;
    STATE.equipment.forEach(e => {
        if (e.potencia) {
            // Strip out non-numeric characters to sum the KW
            const cleanKW = e.potencia.match(/[\d\.]+/);
            if (cleanKW) {
                const num = parseFloat(cleanKW[0]);
                if (!isNaN(num)) {
                    totalPower += num * (e.cantidad || 1);
                }
            }
        }
    });
    document.getElementById('kpi-potencia').innerText = `${totalPower.toFixed(1)} KW`;
    
    const alerts = STATE.equipment.filter(e => e.estado !== 'Operativo').length;
    document.getElementById('kpi-alertas').innerText = alerts;
    
    const rate = STATE.equipment.length > 0 ? ((STATE.equipment.length - alerts) / STATE.equipment.length) * 100 : 100;
    document.getElementById('kpi-operatividad').innerText = `${rate.toFixed(1)}%`;

    // Reliability KPIs Calculation (MTI contract active logs)
    const activeCorrectiveLogs = STATE.history.filter(h => h.tipo === 'Correctivo');
    const F = activeCorrectiveLogs.length;

    // Determine days elapsed in the contract (June 1, 2026 is Day 1)
    let days = 30; // base assumption
    if (F > 0) {
        let maxDate = new Date("2026-06-01");
        activeCorrectiveLogs.forEach(h => {
            const d = new Date(h.fecha);
            if (d > maxDate) maxDate = d;
        });
        const diffTime = Math.abs(maxDate - new Date("2026-06-01"));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) days = diffDays;
    }

    // Total running hours of all equipment combined
    let totalRunningHours = 0;
    STATE.equipment.forEach(e => {
        const hoursPerDay = parseFloat(e.horasFuncionamiento) || 8;
        const qty = parseInt(e.cantidad) || 1;
        totalRunningHours += hoursPerDay * days * qty;
    });

    let mtbfText = "Sin Fallas (>10k h)";
    let mttrText = "0.0 h";
    let availabilityVal = 100;

    if (F > 0) {
        const mtbfHours = totalRunningHours / F;
        mtbfText = `${mtbfHours.toFixed(0)} h`;

        let totalRepairHours = 0;
        activeCorrectiveLogs.forEach(h => {
            totalRepairHours += parseFloat(h.tiempoReparacion) || 1.0;
        });
        const mttrHours = totalRepairHours / F;
        mttrText = `${mttrHours.toFixed(1)} h`;

        availabilityVal = ((totalRunningHours - totalRepairHours) / totalRunningHours) * 100;
    }

    const mtbfEl = document.getElementById('kpi-mtbf');
    const mttrEl = document.getElementById('kpi-mttr');
    const availabilityEl = document.getElementById('kpi-disponibilidad');

    if (mtbfEl) mtbfEl.innerText = mtbfText;
    if (mttrEl) mttrEl.innerText = mttrText;
    if (availabilityEl) availabilityEl.innerText = `${availabilityVal.toFixed(3)}%`;
}

// Control tab content swapping
function renderTabContent() {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const activePanel = document.getElementById(`panel-${STATE.activeTab}`);
    if (activePanel) activePanel.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === STATE.activeTab) {
            item.classList.add('active');
        }
    });

    if (STATE.activeTab === 'dashboard') renderDashboardTab();
    else if (STATE.activeTab === 'inventario') renderInventarioTab();
    else if (STATE.activeTab === 'planner') renderPlannerTab();
    else if (STATE.activeTab === 'repuestos') renderRepuestosTab();
    else if (STATE.activeTab === 'historial') renderHistorialTab();
    else if (STATE.activeTab === 'work-orders') renderWorkOrdersTab();
    else if (STATE.activeTab === 'database') renderDatabaseTab();
    else if (STATE.activeTab === 'trabajo-actual') renderProyectosTab();
    else if (STATE.activeTab === 'info-general') renderInfoGeneralTab();
}

// Render Database Tab stats
function renderDatabaseTab() {
    const rawData = localStorage.getItem('PISCICULTURA_CONSOLIDATED_RAW') || JSON.stringify(RAW_DB);
    const dbSizeKB = (rawData.length / 1024).toFixed(2);
    
    const activeEquip = STATE.allEquipment.filter(e => e.cliente === STATE.selectedClient && e.centro === STATE.selectedCenter);
    const activeEqIds = new Set(activeEquip.map(e => e.id));
    const activeOrders = (RAW_DB.HistorialGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));
    const activeTasks = STATE.plannedTasks.filter(t => t.cliente === STATE.selectedClient && t.centro === STATE.selectedCenter);
    const completedCount = activeTasks.filter(t => t.completada).length;

    const elSize = document.getElementById('db-stat-size');
    const elEquipos = document.getElementById('db-stat-equipos');
    const elEventos = document.getElementById('db-stat-eventos');
    const elCompletadas = document.getElementById('db-stat-completadas');
    if (elSize) elSize.innerText = `${dbSizeKB} KB`;
    if (elEquipos) elEquipos.innerText = activeEquip.length;
    if (elEventos) elEventos.innerText = activeOrders.length;
    if (elCompletadas) elCompletadas.innerText = completedCount;

    // Load tarifa
    const tarifaEl = document.getElementById('db-tarifa-hh');
    if (tarifaEl) tarifaEl.value = RAW_DB.TarifaHoraMTI || '';
}

// Render Dashboard Overview
function renderDashboardTab() {
    const criticalList = document.getElementById('dash-critical-list');
    criticalList.innerHTML = '';
    const criticalEqs = STATE.equipment.filter(e => e.criticidad === 'Alta').slice(0, 6);
    
    criticalEqs.forEach(eq => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.style.cursor = 'pointer';
        card.onclick = () => showEquipmentDetails(eq.id);
        
        card.innerHTML = `
            <div class="task-info" style="flex-grow: 1;">
                <div class="task-info-header">
                    <span class="task-eq-name">${eq.id} | ${eq.area}</span>
                    <span class="task-crit-badge" style="background-color: var(--status-critico-bg); color: var(--status-critico);">24 HORAS</span>
                </div>
                <div class="task-info-main" style="font-size: 14px;">${eq.nombre}</div>
                <div class="task-meta" style="font-size: 11px; margin-top: 4px;">
                    <span><i class="fa fa-bolt"></i> ${eq.potencia}</span>
                    <span><i class="fa-solid fa-gauge-high"></i> ${eq.rpm}</span>
                    <span><i class="fa fa-cog"></i> ${eq.rodamientos.join(', ') || 'N/A'}</span>
                </div>
            </div>
        `;
        criticalList.appendChild(card);
    });

    const alertsList = document.getElementById('dash-alerts-list');
    alertsList.innerHTML = '';
    const alertEqs = STATE.equipment.filter(e => e.estado !== 'Operativo').slice(0, 6);
    
    if (alertEqs.length === 0) {
        alertsList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 20px;"><i class="fa-regular fa-circle-check" style="font-size: 24px; margin-bottom: 8px; color: var(--status-operativo); display: block;"></i>Planta 100% operativa.</div>';
    } else {
        alertEqs.forEach(eq => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.style.cursor = 'pointer';
            card.onclick = () => showEquipmentDetails(eq.id);
            
            let statusColor = 'var(--status-advertencia)';
            let statusBg = 'var(--status-advertencia-bg)';
            if (eq.estado === 'Crítico') {
                statusColor = 'var(--status-critico)';
                statusBg = 'var(--status-critico-bg)';
            }

            card.innerHTML = `
                <div class="task-info">
                    <div class="task-info-header">
                        <span class="task-eq-name">${eq.id} | ${eq.area}</span>
                        <span class="task-crit-badge" style="background-color: ${statusBg}; color: ${statusColor};">${eq.estado}</span>
                    </div>
                    <div class="task-info-main" style="font-size: 14px;">${eq.nombre}</div>
                    <div class="task-meta" style="font-size: 11px; margin-top: 4px; color: var(--status-advertencia);">
                        <span><i class="fa fa-triangle-exclamation"></i> Próxima mantención: ${eq.proxima_mantencion}</span>
                    </div>
                </div>
            `;
            alertsList.appendChild(card);
        });
    }

    // Render cost KPIs
    renderCostKPIs();
}

// ----- Render Cost KPI Cards -----
function renderCostKPIs() {
    const tarifa = parseFloat(RAW_DB.TarifaHoraMTI) || 0;
    const activeEqIds = new Set(STATE.equipment.map(e => e.id));

    // Sum from HistorialGlobal (OT) for the active center
    const activeOTs = (RAW_DB.HistorialGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));
    let totalHoras = 0;
    let totalCostoRepuestos = 0;
    activeOTs.forEach(ot => {
        totalHoras += parseFloat(ot.tiempoReparacion || ot.horas || 0);
        totalCostoRepuestos += parseFloat(ot.costoRepuestos || 0);
    });

    const totalHH = totalHoras * tarifa;

    // Count trabajos extraordinarios for the active center
    const teCount = (RAW_DB.TrabajosExtraordinarios || []).filter(
        te => te.cliente === STATE.selectedClient && te.centro === STATE.selectedCenter
    ).length;

    const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CL');

    const elTotal = document.getElementById('kpi-costo-total');
    const elHoras = document.getElementById('kpi-horas-hombre');
    const elRep = document.getElementById('kpi-costo-repuestos');
    const elTE = document.getElementById('kpi-trabajos-extra');

    if (elTotal) elTotal.innerText = tarifa > 0 ? fmt(totalHH) : '-- (sin tarifa)';
    if (elHoras) elHoras.innerText = totalHoras.toFixed(1) + ' hrs';
    if (elRep) elRep.innerText = fmt(totalCostoRepuestos);
    if (elTE) elTE.innerText = teCount;
}

// Render Catalog Grid View
function renderInventarioTab() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    
    const filtered = STATE.equipment.filter(eq => {
        const matchesSearch = eq.nombre.toLowerCase().includes(STATE.searchQuery.toLowerCase()) || 
                              eq.id.toLowerCase().includes(STATE.searchQuery.toLowerCase()) ||
                              (eq.designacion && eq.designacion.toLowerCase().includes(STATE.searchQuery.toLowerCase())) ||
                              (eq.marca && eq.marca.toLowerCase().includes(STATE.searchQuery.toLowerCase()));
        
        const matchesArea = STATE.areaFilter === 'all' || eq.area.toLowerCase().includes(STATE.areaFilter.toLowerCase());
        
        let matchesStatus = true;
        if (STATE.statusFilter === 'operativo') matchesStatus = eq.estado === 'Operativo';
        if (STATE.statusFilter === 'alerta') matchesStatus = eq.estado !== 'Operativo';
        if (STATE.statusFilter === 'critico') matchesStatus = eq.criticidad === 'Alta';

        return matchesSearch && matchesArea && matchesStatus;
    });

    document.getElementById('inventory-count-badge').innerText = `${filtered.length} motores/equipos consolidados`;

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);"><i class="fa fa-search" style="font-size: 32px; margin-bottom: 12px; display: block;"></i>No se encontraron equipos en la búsqueda.</div>';
        return;
    }

    filtered.forEach(eq => {
        const card = document.createElement('div');
        card.className = 'equipment-card';
        card.onclick = () => showEquipmentDetails(eq.id);
        
        let badgeClass = 'operativo';
        let statusLabel = 'Operativo';
        if (eq.estado === 'Requiere Revisión') {
            badgeClass = 'advertencia';
            statusLabel = 'Revisión';
        } else if (eq.estado === 'Crítico') {
            badgeClass = 'critico';
            statusLabel = 'Falla / Parada';
        }

        let imageHtml = `
            <div class="image-placeholder">
                <i class="fa-solid fa-gauge-high"></i>
                <span style="font-size:10px;">${eq.area}</span>
            </div>
        `;
        if (eq.imagen) {
            imageHtml = `<img src="${eq.imagen}" class="card-image" alt="${eq.nombre}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="image-placeholder" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%;">
                <i class="fa-solid fa-gauge-high"></i>
                <span>${eq.area}</span>
            </div>`;
        }

        card.innerHTML = `
            <div class="card-image-container">
                ${imageHtml}
                <span class="card-badge-status badge-status ${badgeClass}">${statusLabel}</span>
                <span class="card-badge-area">${eq.area}</span>
            </div>
            <div class="card-content">
                <div class="card-id">${eq.id} ${eq.designacion ? `• ${eq.designacion}` : ''}</div>
                <div class="card-title" title="${eq.nombre}">${eq.nombre}</div>
                <div class="card-specs" style="grid-template-columns: 1fr 1fr; border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: auto; font-size: 11px;">
                    <div class="spec-item">
                        <span class="spec-label">Potencia / Marca</span>
                        <span class="spec-value" style="font-weight:600;" title="${eq.potencia} | ${eq.marca}">${eq.potencia} / ${eq.marca}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Conexión / AWG</span>
                        <span class="spec-value" title="${eq.conexion} | ${eq.cable_awg}">${eq.conexion} / ${eq.cable_awg}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Rodamientos</span>
                        <span class="spec-value" title="${eq.rodamientos.join(', ') || 'N/A'}">${eq.rodamientos.join(', ') || 'N/A'}</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Próxima Fecha</span>
                        <span class="spec-value" style="color: var(--accent-blue-glow); font-weight:600;">${eq.proxima_mantencion || 'Planificar'}</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Render Monthly Preventive Planner (June 2026 - May 2027)
function renderPlannerTab() {
    const monthsContainer = document.getElementById('planner-months-list');
    monthsContainer.innerHTML = '';
    
    PLANNER_MONTHS.forEach(m => {
        const count = STATE.plannedTasks.filter(t => t.mes === m.num).length;
        const completed = STATE.plannedTasks.filter(t => t.mes === m.num && t.completada).length;
        
        const li = document.createElement('li');
        li.className = `month-item ${STATE.selectedMonth === m.num ? 'active' : ''}`;
        li.onclick = () => {
            STATE.selectedMonth = m.num;
            renderPlannerTab();
        };
        
        li.innerHTML = `
            <span>${m.name}</span>
            <span class="month-badge">${completed}/${count}</span>
        `;
        monthsContainer.appendChild(li);
    });

    const activeMonthObj = PLANNER_MONTHS.find(m => m.num === STATE.selectedMonth);
    document.getElementById('selected-month-title').innerText = `Tareas Planificadas - ${activeMonthObj.name}`;
    
    const tasksContainer = document.getElementById('planner-tasks-list');
    tasksContainer.innerHTML = '';

    const monthTasks = STATE.plannedTasks.filter(t => t.mes === STATE.selectedMonth);

    // Apply Filters
    let filteredTasks = [...monthTasks];

    if (STATE.plannerFilterCrit && STATE.plannerFilterCrit !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.criticidad === STATE.plannerFilterCrit);
    }

    if (STATE.plannerFilterStatus && STATE.plannerFilterStatus !== 'all') {
        if (STATE.plannerFilterStatus === 'pendiente') {
            filteredTasks = filteredTasks.filter(t => !t.completada);
        } else if (STATE.plannerFilterStatus === 'completada') {
            filteredTasks = filteredTasks.filter(t => t.completada);
        }
    }

    // Apply Sorting
    if (STATE.plannerSortBy === 'criticidad') {
        const critOrder = { "Alta": 1, "Media": 2, "Baja": 3 };
        filteredTasks.sort((a, b) => (critOrder[a.criticidad] || 99) - (critOrder[b.criticidad] || 99));
    } else if (STATE.plannerSortBy === 'area') {
        filteredTasks.sort((a, b) => a.area.localeCompare(b.area));
    } else if (STATE.plannerSortBy === 'horas') {
        filteredTasks.sort((a, b) => (b.horasFuncionamiento || 0) - (a.horasFuncionamiento || 0));
    }

    if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);"><i class="fa-solid fa-filter-circle-xmark" style="font-size: 28px; margin-bottom: 12px; display: block;"></i>No hay tareas que coincidan con los filtros seleccionados.</div>';
        return;
    }

    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.completada ? 'completed' : ''}`;
        
        let critColor = 'var(--text-secondary)';
        let critBg = 'rgba(255, 255, 255, 0.05)';
        if (task.criticidad === 'Alta') {
            critColor = 'var(--status-critico)';
            critBg = 'var(--status-critico-bg)';
        } else if (task.criticidad === 'Media') {
            critColor = 'var(--status-advertencia)';
            critBg = 'var(--status-advertencia-bg)';
        }

        card.innerHTML = `
            <div class="task-checkbox-container" onclick="toggleTaskCompletion('${task.id}')">
                <div class="task-checkbox">
                    ${task.completada ? '<i class="fa fa-check"></i>' : ''}
                </div>
            </div>
            <div class="task-info">
                <div class="task-info-header">
                    <span class="task-eq-name" style="cursor:pointer;" onclick="showEquipmentDetails('${task.eqId}')">
                        ${task.eqId} | ${task.eqName}
                        <small style="color: var(--text-secondary); font-size: 11px; margin-left: 6px;">(${task.centro})</small>
                    </span>
                    <span class="task-crit-badge" style="background-color: ${critBg}; color: ${critColor}">${task.criticidad}</span>
                </div>
                <div class="task-info-main" style="font-size: 13.5px; line-height: 1.4; font-weight:500;">${task.tarea}</div>
                <div class="task-meta">
                    ${task.rodamientos.length > 0 ? `<span><i class="fa fa-cog"></i> Repuestos: Rodamiento ${task.rodamientos.join(', ')}</span>` : ''}
                    <span><i class="fa fa-wrench"></i> Ciclo Preventivo Licitación MTI</span>
                </div>
            </div>
        `;
        tasksContainer.appendChild(card);
    });
}

function toggleTaskCompletion(taskId) {
    const task = STATE.plannedTasks.find(t => t.id === taskId);
    if (task) {
        task.completada = !task.completada;
        
        if (!RAW_DB.TareasCompletadas) {
            RAW_DB.TareasCompletadas = [];
        }

        if (task.completada) {
            if (!RAW_DB.TareasCompletadas.includes(taskId)) {
                RAW_DB.TareasCompletadas.push(taskId);
            }
        } else {
            RAW_DB.TareasCompletadas = RAW_DB.TareasCompletadas.filter(id => id !== taskId);
        }

        // Persist
        localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
        saveToLocalServer(RAW_DB);

        // Enqueue Sheets sync transaction
        if (window.dbStore) {
            window.dbStore.addToSyncQueue("updateConfig", { clave: "TareasCompletadas", valor: RAW_DB.TareasCompletadas }).then(() => syncWithSheets());
        }

        renderPlannerTab();
        renderKPIs();
    }
}

// Render Bearings demand & Critial Spare parts analysis
function renderRepuestosTab() {
    const tbody = document.getElementById('rodamientos-table-body');
    tbody.innerHTML = '';

    // Calculate dynamic demand from future maintenance routines
    let bearingsDemand = {};
    STATE.plannedTasks.forEach(task => {
        if (task.rodamientos && task.rodamientos.length > 0) {
            task.rodamientos.forEach(b => {
                bearingsDemand[b] = (bearingsDemand[b] || 0) + 1;
            });
        }
    });

    // Consolidate bear stats
    let bearingList = [];
    STATE.equipment.forEach(eq => {
        eq.rodamientos.forEach(b => {
            let found = bearingList.find(x => x.modelo === b);
            if (!found) {
                found = { modelo: b, menciones: 0, equipos: [] };
                bearingList.push(found);
            }
            found.menciones += 1;
            if (!found.equipos.includes(eq.id)) {
                found.equipos.push(eq.id);
            }
        });
    });
    
    bearingList.sort((a, b) => b.menciones - a.menciones);

    if (bearingList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No hay rodamientos definidos en los equipos.</td></tr>';
    } else {
        bearingList.forEach(b => {
            const demand = bearingsDemand[b.modelo] || 0;
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td><span class="bearing-badge">${b.modelo}</span></td>
                <td style="font-weight: 600;">${b.menciones} equipos</td>
                <td style="color: var(--accent-blue-glow); font-weight: 700;">${demand} unidades/año</td>
                <td style="font-size:12px; color: var(--text-secondary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${b.equipos.join(', ')}">
                    ${b.equipos.length} equipos (${b.equipos.slice(0, 5).join(', ')}${b.equipos.length > 5 ? '...' : ''})
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    let totalDemandCount = 0;
    Object.values(bearingsDemand).forEach(v => totalDemandCount += v);
    document.getElementById('total-bearings-demand').innerText = `${totalDemandCount} Unidades`;

    const criticalModel = bearingList[0] ? bearingList[0].modelo : 'Ninguno';
    document.getElementById('most-critical-bearing').innerText = `Rodamiento ${criticalModel}`;

    // --- Custom Critical Spare Parts rendering ---
    const activeEquip = STATE.equipment;
    const eqSelect = document.getElementById('rep-custom-eq');
    if (eqSelect) {
        let selectHtml = '<option value="">-- Sin equipo (Repuesto General) --</option>';
        selectHtml += activeEquip.map(e => `<option value="${e.id}">${e.id} | ${e.nombre}</option>`).join('');
        eqSelect.innerHTML = selectHtml;
    }

    const customTbody = document.getElementById('custom-repuestos-table-body');
    if (customTbody) {
        customTbody.innerHTML = '';
        
        const customItems = (RAW_DB.OtrosRepuestos || []).filter(item => 
            item.cliente === STATE.selectedClient && item.centro === STATE.selectedCenter
        );
        
        if (customItems.length === 0) {
            customTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No hay repuestos críticos adicionales registrados.</td></tr>';
        } else {
            customItems.forEach(item => {
                const tr = document.createElement('tr');
                
                let statusColor = 'var(--text-secondary)';
                let statusBg = 'rgba(255, 255, 255, 0.05)';
                if (item.estado === 'En Stock') {
                    statusColor = 'var(--status-operativo)';
                    statusBg = 'rgba(16, 185, 129, 0.08)';
                } else if (item.estado === 'En Tránsito') {
                    statusColor = 'var(--status-advertencia)';
                    statusBg = 'rgba(245, 158, 11, 0.08)';
                } else if (item.estado === 'Pendiente') {
                    statusColor = 'var(--status-critico)';
                    statusBg = 'rgba(239, 68, 68, 0.08)';
                }
                
                const eqText = item.eqId ? `${item.eqId}` : '<span style="color: var(--text-muted);">Stock General</span>';

                tr.innerHTML = `
                    <td><strong style="color: var(--text-primary); font-size: 13.5px;">${item.nombre}</strong></td>
                    <td>${eqText}</td>
                    <td style="text-align: center; font-weight: 700;">${item.cantidad}</td>
                    <td style="text-align: center;">
                        <span class="task-crit-badge" style="background-color: ${statusBg}; color: ${statusColor}; font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid ${statusColor}44; display: inline-block;">
                            ${item.estado}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-secondary" onclick="deleteCustomRepuesto('${item.id}')" style="padding: 6px 10px; font-size: 11px; background-color: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); color: var(--status-critico); cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; height: auto;">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                `;
                customTbody.appendChild(tr);
            });
        }
    }
}

// Add a custom critical spare part
function saveCustomRepuesto() {
    const nombre = document.getElementById('rep-custom-nombre').value.trim();
    const eqId = document.getElementById('rep-custom-eq').value;
    const cantidad = parseInt(document.getElementById('rep-custom-cant').value) || 1;
    const estado = document.getElementById('rep-custom-estado').value;

    if (!nombre) {
        alert("Por favor ingrese el nombre del repuesto");
        return;
    }

    const newItem = {
        id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nombre: nombre,
        eqId: eqId || "",
        cantidad: cantidad,
        estado: estado,
        cliente: STATE.selectedClient,
        centro: STATE.selectedCenter
    };

    if (!RAW_DB.OtrosRepuestos) {
        RAW_DB.OtrosRepuestos = [];
    }

    RAW_DB.OtrosRepuestos.push(newItem);

    // Save
    localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
    saveToLocalServer(RAW_DB);

    // Enqueue Sheets sync transaction
    if (window.dbStore) {
        const parentEq = STATE.allEquipment.find(e => e.id === eqId);
        const sheetRep = {
            id: newItem.id,
            nombre: newItem.nombre,
            equipoId: newItem.eqId,
            equipoNombre: parentEq ? parentEq.nombre : "Sin asociar",
            cantidad: newItem.cantidad,
            estado: newItem.estado
        };
        window.dbStore.addToSyncQueue("addCustomRepuesto", { repuesto: sheetRep }).then(() => syncWithSheets());
    }

    // Toast and Reset Form
    showToast("Repuesto crítico agregado con éxito", "success");
    document.getElementById('form-add-custom-repuesto').reset();
    document.getElementById('rep-custom-cant').value = 1;

    // Refresh
    renderRepuestosTab();
}

// Delete custom critical spare part
function deleteCustomRepuesto(itemId) {
    if (confirm("¿Está seguro de que desea eliminar este repuesto crítico de la planificación?")) {
        if (RAW_DB.OtrosRepuestos) {
            RAW_DB.OtrosRepuestos = RAW_DB.OtrosRepuestos.filter(item => item.id !== itemId);
            
            // Save
            localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
            saveToLocalServer(RAW_DB);

            // Enqueue Sheets sync transaction
            if (window.dbStore) {
                window.dbStore.addToSyncQueue("deleteCustomRepuesto", { repuestoId: itemId }).then(() => syncWithSheets());
            }

            showToast("Repuesto eliminado con éxito", "success");
            renderRepuestosTab();
        }
    }
}

// Obtener entradas de historial filtradas por tipo, búsqueda por texto, año, mes, período y abecedario
function getFilteredHistoryEntries() {
    const filterType = (document.getElementById('select-history-type') || {}).value || 'todos';
    const searchText = ((document.getElementById('history-search') || {}).value || '').toLowerCase().trim();
    const yearFilter = (document.getElementById('select-history-year') || {}).value || 'todos';
    const monthFilter = (document.getElementById('select-history-month') || {}).value || 'todos';
    const periodFilter = (document.getElementById('select-history-period') || {}).value || 'todos';
    const alphabetFilter = (document.getElementById('select-history-alphabet') || {}).value || 'todos';

    let allEntries = [];
    const activeEqIds = new Set(STATE.equipment.map(e => e.id));

    // Source 1: OT del centro activo
    (RAW_DB.HistorialGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id)).forEach(h => {
        const eq = STATE.equipment.find(e => e.id === (h.eqId || h.id));
        allEntries.push({
            _type: 'activo',
            fecha: h.fecha,
            titulo: h.trabajo || h.tarea || 'Orden de Trabajo',
            desc: h.comentarios || h.detalles || '',
            tecnico: h.tecnico || 'Técnico MTI',
            eqId: h.eqId || h.id,
            eqName: eq ? eq.nombre : (h.eqName || ''),
            area: eq ? eq.area : (h.area || ''),
            costoRepuestos: h.costoRepuestos || 0,
            horas: h.tiempoReparacion || h.horas || 0,
            tipo: h.tipo || 'OT',
            rodamientos: h.rodamientos || []
        });
    });

    // Source 2: Trabajos Extraordinarios del centro activo
    (RAW_DB.TrabajosExtraordinarios || []).filter(te =>
        te.cliente === STATE.selectedClient && te.centro === STATE.selectedCenter
    ).forEach(te => {
        allEntries.push({
            _type: 'extraordinario',
            fecha: te.fecha,
            titulo: te.titulo || 'Trabajo Extraordinario',
            desc: te.descripcion || '',
            tecnico: te.tecnico || 'MTI',
            eqId: null,
            eqName: te.empresa || '',
            area: 'Extraordinario',
            costoRepuestos: te.costoMateriales || 0,
            horas: te.horas || 0,
            tipo: 'Extraordinario',
            materiales: te.materiales || '',
            estado: te.estado || '',
            teId: te.id
        });
    });

    // Source 3: Auditoría Pre-2026 del centro activo
    (RAW_DB.AntecedentesGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id)).forEach(h => {
        const eq = STATE.equipment.find(e => e.id === (h.eqId || h.id));
        allEntries.push({
            _type: 'auditoria',
            fecha: h.fecha,
            titulo: h.tarea || h.trabajo || 'Auditoría',
            desc: h.detalles || h.comentarios || '',
            tecnico: h.tecnico || 'Pre-MTI',
            eqId: h.eqId || h.id,
            eqName: eq ? eq.nombre : (h.eqName || ''),
            area: eq ? eq.area : (h.area || ''),
            costoRepuestos: 0,
            horas: 0,
            tipo: 'Auditoría',
            rodamientos: h.rodamientos || []
        });
    });

    // Sort by date descending
    allEntries.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    // Apply type filter
    if (filterType !== 'todos') {
        allEntries = allEntries.filter(e => e._type === filterType);
    }

    // Apply text search
    if (searchText) {
        allEntries = allEntries.filter(e =>
            (e.titulo || '').toLowerCase().includes(searchText) ||
            (e.desc || '').toLowerCase().includes(searchText) ||
            (e.tecnico || '').toLowerCase().includes(searchText) ||
            (e.eqName || '').toLowerCase().includes(searchText) ||
            (e.eqId || '').toLowerCase().includes(searchText) ||
            (e.area || '').toLowerCase().includes(searchText)
        );
    }

    // Apply Year filter
    if (yearFilter !== 'todos') {
        allEntries = allEntries.filter(e => {
            if (!e.fecha) return false;
            const parts = e.fecha.split('-');
            return parts[0] === yearFilter;
        });
    }

    // Apply Month filter
    if (monthFilter !== 'todos') {
        allEntries = allEntries.filter(e => {
            if (!e.fecha) return false;
            const parts = e.fecha.split('-');
            return parts[1] === monthFilter;
        });
    }

    // Apply Period/Range filter
    if (periodFilter !== 'todos') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        allEntries = allEntries.filter(e => {
            if (!e.fecha) return false;
            const parts = e.fecha.split('-');
            if (parts.length < 3) return false;
            const entryDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            
            if (periodFilter === 'esta-semana') {
                const currentDay = today.getDay();
                const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - distanceToMonday);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return entryDate >= startOfWeek && entryDate <= endOfWeek;
            }
            if (periodFilter === 'semana-pasada') {
                const currentDay = today.getDay();
                const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - distanceToMonday);
                const startOfLastWeek = new Date(startOfWeek);
                startOfLastWeek.setDate(startOfWeek.getDate() - 7);
                const endOfLastWeek = new Date(startOfLastWeek);
                endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
                return entryDate >= startOfLastWeek && entryDate <= endOfLastWeek;
            }
            if (periodFilter === 'este-mes') {
                return entryDate.getFullYear() === today.getFullYear() && entryDate.getMonth() === today.getMonth();
            }
            if (periodFilter === 'mes-anterior') {
                const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                return entryDate.getFullYear() === prevMonthDate.getFullYear() && entryDate.getMonth() === prevMonthDate.getMonth();
            }
            if (periodFilter === 'ultimos-7-dias') {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                return entryDate >= sevenDaysAgo && entryDate <= today;
            }
            if (periodFilter === 'ultimos-30-dias') {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                return entryDate >= thirtyDaysAgo && entryDate <= today;
            }
            if (periodFilter === 'año-actual') {
                return entryDate.getFullYear() === today.getFullYear();
            }
            return true;
        });
    }

    // Apply Alphabet/A-Z filter
    if (alphabetFilter !== 'todos') {
        allEntries = allEntries.filter(e => {
            const nameToTest = e.eqName || e.titulo || '';
            if (!nameToTest) return false;
            const firstChar = nameToTest.trim().charAt(0).toUpperCase();
            if (firstChar < 'A' || firstChar > 'Z') return false;
            
            if (alphabetFilter === 'A-E') return firstChar >= 'A' && firstChar <= 'E';
            if (alphabetFilter === 'F-J') return firstChar >= 'F' && firstChar <= 'J';
            if (alphabetFilter === 'K-O') return firstChar >= 'K' && firstChar <= 'O';
            if (alphabetFilter === 'P-T') return firstChar >= 'P' && firstChar <= 'T';
            if (alphabetFilter === 'U-Z') return firstChar >= 'U' && firstChar <= 'Z';
            return true;
        });
    }

    return allEntries;
}

// Render Global Service Timeline Log (Unified: OT + Extraordinarios + Auditoría)
function renderHistorialTab() {
    const timeline = document.getElementById('history-timeline');
    timeline.innerHTML = '';

    const allEntries = getFilteredHistoryEntries();

    if (allEntries.length === 0) {
        timeline.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 28px; margin-bottom: 12px; display: block;"></i>
            <p style="font-size: 14px; font-weight: 600;">No se encontraron registros</p>
            <p style="font-size: 12px; margin-top: 4px;">Prueba ajustando los filtros o registra una nueva orden de trabajo.</p>
        </div>`;
        return;
    }

    // Badge config per type
    const typeBadge = {
        activo: { label: 'OT Mantenimiento', color: 'var(--accent-blue-glow)', bg: 'rgba(14,165,233,0.1)' },
        extraordinario: { label: 'Trabajo Extraordinario', color: 'var(--status-advertencia)', bg: 'rgba(245,158,11,0.1)' },
        auditoria: { label: 'Auditoría Pre-2026', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)' }
    };

    allEntries.forEach(h => {
        const card = document.createElement('div');
        card.className = 'timeline-item';

        let dateStr = h.fecha || 'Sin Fecha';
        let yearStr = '';
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            yearStr = parts[0];
            dateStr = `${parts[2]}/${parts[1]}`;
        }

        const badge = typeBadge[h._type] || typeBadge.activo;
        const eqLinkHtml = h.eqId
            ? `<div class="timeline-eq-link" onclick="showEquipmentDetails('${h.eqId}')"><i class="fa fa-link"></i> ${h.eqId} | ${h.eqName}</div>`
            : `<div class="timeline-eq-link" style="cursor:default;text-decoration:none;color:var(--text-secondary);"><i class="fa-solid fa-building"></i> ${h.eqName || 'Trabajo General'}</div>`;

        const costoHtml = (h.costoRepuestos > 0 || h.horas > 0)
            ? `<span style="color: var(--status-advertencia);"><i class="fa-solid fa-coins"></i> ${h.horas}h · Repuestos: $${Math.round(h.costoRepuestos || 0).toLocaleString('es-CL')}</span>`
            : '';

        const materialesHtml = h.materiales
            ? `<div class="timeline-desc" style="font-size:11px;margin-top:4px;color:var(--text-muted);"><i class="fa fa-box"></i> ${h.materiales}</div>`
            : '';

        const estadoHtml = h.estado
            ? `<span style="font-size:11px; background: rgba(255,255,255,0.05); border-radius:4px; padding: 2px 6px;">${h.estado}</span>`
            : '';

        card.innerHTML = `
            <div class="timeline-date">
                <span>${dateStr}</span>
                <span class="timeline-date-year">${yearStr}</span>
            </div>
            <div class="timeline-content">
                <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                    <span style="font-size:10px; font-weight:600; background:${badge.bg}; color:${badge.color}; border-radius:4px; padding:2px 7px; letter-spacing:0.5px;">${badge.label}</span>
                    ${estadoHtml}
                </div>
                ${eqLinkHtml}
                <div class="timeline-title" style="font-size:15px; margin-top:4px; font-weight:600;">${h.titulo}</div>
                ${h.desc ? `<div class="timeline-desc" style="font-size:12px;margin-top:4px;color:var(--text-secondary);"><i class="fa fa-info-circle"></i> ${h.desc}</div>` : ''}
                ${materialesHtml}
                <div class="timeline-meta" style="margin-top:8px;">
                    <span><i class="fa fa-user"></i> ${h.tecnico}</span>
                    ${h.area && h.area !== 'Extraordinario' ? `<span><i class="fa fa-tag"></i> ${h.area}</span>` : ''}
                    ${costoHtml}
                    ${h.rodamientos && h.rodamientos.length > 0 ? `<span><i class="fa fa-cog"></i> Rodamientos: ${h.rodamientos.join(', ')}</span>` : ''}
                </div>
            </div>
        `;
        timeline.appendChild(card);
    });
}

// Show Equipment Details in Modal (Supports Edit & Create Mode)
function showEquipmentDetails(eqId, mode = 'edit') {
    STATE.selectedEquipmentId = eqId;
    STATE.editMode = mode;
    STATE.tempImageBase64 = null;
    
    // Switch modal tabs back to 'General' tab on load
    switchModalTab('tab-gen');

    const modalTitle = document.getElementById('modal-eq-title');
    const modalSubtitle = document.getElementById('modal-eq-id');
    const deleteBtn = document.getElementById('modal-delete-btn');
    const idInput = document.getElementById('modal-edit-id');
    
    // Clear forms and toggles
    document.getElementById('modal-add-history-form').style.display = 'none';
    
    let eq = null;

    // Populate and configure modal Client/Center selects
    const modalClientSelect = document.getElementById('modal-edit-cliente');
    const modalCenterSelect = document.getElementById('modal-edit-centro');
    if (modalClientSelect && modalCenterSelect) {
        modalClientSelect.innerHTML = RAW_DB.Clientes.map(c => `<option value="${c}">${c}</option>`).join('');
        
        modalClientSelect.onchange = () => {
            const clientVal = modalClientSelect.value;
            const centers = RAW_DB.Centros[clientVal] || [];
            modalCenterSelect.innerHTML = centers.map(c => `<option value="${c}">${c}</option>`).join('');
        };
    }

    if (mode === 'create') {
        modalTitle.innerText = "Agregar Nuevo Equipo";
        modalSubtitle.innerText = "NUEVO EQUIPO MOTOR";
        deleteBtn.style.display = 'none';
        
        idInput.value = "";
        idInput.disabled = false;
        
        // Reset fields to empty/default values
        document.getElementById('modal-edit-nombre').value = "";
        document.getElementById('modal-edit-area').value = "Hatchery";
        document.getElementById('modal-edit-designacion').value = "";
        document.getElementById('modal-edit-cantidad').value = 1;
        document.getElementById('modal-edit-horas').value = 8;
        document.getElementById('modal-edit-estado').value = "Operativo";
        document.getElementById('modal-edit-frecuencia').value = 6;
        
        document.getElementById('modal-edit-marca').value = "Siemens";
        document.getElementById('modal-edit-modelo').value = "";
        document.getElementById('modal-edit-serie').value = "";
        document.getElementById('modal-edit-potencia').value = "";
        document.getElementById('modal-edit-voltaje').value = "380 V";
        document.getElementById('modal-edit-amperaje').value = "";
        document.getElementById('modal-edit-conexion').value = "Estrella (Y)";
        document.getElementById('modal-edit-cosfi').value = "0.82";
        document.getElementById('modal-edit-cable').value = "14 AWG";
        document.getElementById('modal-edit-rpm').value = "1450 RPM";
        
        document.getElementById('modal-edit-rodamientos').value = "";
        document.getElementById('modal-edit-repuestos').value = "";
        
        document.getElementById('modal-edit-ultima').value = new Date().toISOString().split('T')[0];
        document.getElementById('modal-edit-proxima').value = "";
        document.getElementById('modal-edit-image-url').value = "";

        if (modalClientSelect && modalCenterSelect) {
            modalClientSelect.value = STATE.selectedClient;
            modalClientSelect.onchange();
            modalCenterSelect.value = STATE.selectedCenter;
        }

        STATE.selectedEquipmentImages = [];
        renderModalImages();
        
        // Hide schedule & history subpanels for creation
        document.getElementById('modal-sched-list').innerHTML = '<div style="font-size:12px; color:var(--text-secondary); text-align:center; padding:10px;">Se generará al guardar.</div>';
        document.getElementById('modal-history-list').innerHTML = '<div style="font-size:12px; color:var(--text-secondary); text-align:center; padding:10px;">Se habilitará al guardar.</div>';
        document.getElementById('modal-pauta-title').innerText = "Pauta Técnica MTI";
        document.getElementById('modal-pauta-list').innerHTML = '<div style="font-size:12px; color:var(--text-secondary); text-align:center; padding:10px;">Se generará al guardar.</div>';
        
        // Hide QR box during creation
        document.getElementById('modal-qr-container').innerHTML = '<div style="font-size:10px; color:var(--text-muted);">Guardar primero para generar QR.</div>';
        document.getElementById('modal-qr-url-label').innerText = "Sin ID";
        document.getElementById('btn-print-qr').style.display = 'none';

    } else {
        // Edit mode
        eq = STATE.allEquipment.find(e => e.id === eqId);
        if (!eq) return;

        if (modalClientSelect && modalCenterSelect) {
            modalClientSelect.value = eq.cliente || 'Cermaq';
            modalClientSelect.onchange();
            modalCenterSelect.value = eq.centro || 'Sta Juana';
        }


        modalTitle.innerText = eq.nombre;
        modalSubtitle.innerText = `${eq.id} | ${eq.area}`;
        deleteBtn.style.display = 'inline-flex';
        
        idInput.value = eq.id;
        idInput.disabled = true; // Cannot edit ID for existing items
        
        // Load properties
        document.getElementById('modal-edit-nombre').value = eq.nombre;
        document.getElementById('modal-edit-area').value = eq.area;
        document.getElementById('modal-edit-designacion').value = eq.designacion || "";
        document.getElementById('modal-edit-cantidad').value = eq.cantidad || 1;
        document.getElementById('modal-edit-horas').value = eq.horasFuncionamiento || 8;
        document.getElementById('modal-edit-estado').value = eq.estado || "Operativo";
        document.getElementById('modal-edit-frecuencia').value = eq.frecuencia_meses || 6;
        
        document.getElementById('modal-edit-marca').value = eq.marca || "";
        document.getElementById('modal-edit-modelo').value = eq.modelo || "";
        document.getElementById('modal-edit-serie').value = eq.serie || "";
        document.getElementById('modal-edit-potencia').value = eq.potencia || "";
        document.getElementById('modal-edit-voltaje').value = eq.voltaje || "";
        document.getElementById('modal-edit-amperaje').value = eq.amperaje || "";
        document.getElementById('modal-edit-conexion').value = eq.conexion || "Estrella (Y)";
        document.getElementById('modal-edit-cosfi').value = eq.cos_fi || "";
        document.getElementById('modal-edit-cable').value = eq.cable_awg || "";
        document.getElementById('modal-edit-rpm').value = eq.rpm || "";
        
        document.getElementById('modal-edit-rodamientos').value = eq.rodamientos.join(', ') || "";
        document.getElementById('modal-edit-repuestos').value = eq.repuestos || "";
        
        document.getElementById('modal-edit-ultima').value = eq.ultima_mantencion || "";
        document.getElementById('modal-edit-proxima').value = eq.proxima_mantencion || "";
        document.getElementById('modal-edit-image-url').value = "";

        STATE.selectedEquipmentImages = eq.imagenes ? [...eq.imagenes] : (eq.imagen ? [eq.imagen] : []);
        renderModalImages();

        // Generate QR code dynamically
        const qrUrl = `${window.location.origin}/equipo.html?eqId=${eq.id}`;
        document.getElementById('modal-qr-container').innerHTML = `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" alt="Código QR" class="qr-code-image" />
        `;
        document.getElementById('modal-qr-url-label').innerText = eq.id;
        document.getElementById('btn-print-qr').style.display = 'inline-flex';

        // Load future plan task checklist
        const schedContainer = document.getElementById('modal-sched-list');
        schedContainer.innerHTML = '';
        const eqTasks = STATE.plannedTasks.filter(t => t.eqId === eqId);
        
        if (eqTasks.length === 0) {
            schedContainer.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); text-align: center;">No hay tareas preventivas programadas.</div>';
        } else {
            eqTasks.forEach(task => {
                const activeMonthObj = PLANNER_MONTHS.find(m => m.num === task.mes);
                const card = document.createElement('div');
                card.className = `modal-history-card`;
                card.style.cursor = 'pointer';
                card.onclick = () => {
                    toggleTaskCompletion(task.id);
                    showEquipmentDetails(eqId, mode);
                };
                card.innerHTML = `
                    <div class="history-card-details">
                        <div class="history-card-title">${activeMonthObj.name}: ${task.tarea}</div>
                        ${task.rodamientos.length > 0 ? `<div class="history-card-bearings">Repuestos: Rodamientos ${task.rodamientos.join(', ')}</div>` : ''}
                    </div>
                    <div class="history-card-date" style="color: ${task.completada ? 'var(--status-operativo)' : 'var(--text-secondary)'}; font-weight: 600; white-space: nowrap;">
                        ${task.completada ? '<i class="fa fa-check-circle"></i> Listo' : '<i class="fa-regular fa-circle"></i> Pendiente'}
                    </div>
                `;
                schedContainer.appendChild(card);
            });
        }

        // Load History logs & Plant Legacy Audit logs
        const histContainer = document.getElementById('modal-history-list');
        histContainer.innerHTML = '';
        
        // 1. Render Active MTI Contract History (Empty initially)
        const hasActiveLogs = eq.historico && eq.historico.length > 0;
        const hasLegacyLogs = eq.antecedentes && eq.antecedentes.length > 0;
        
        if (!hasActiveLogs && !hasLegacyLogs) {
            histContainer.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); text-align: center;">Sin bitácora registrada.</div>';
        } else {
            // Render active contract logs if any
            if (hasActiveLogs) {
                const activeHeader = document.createElement('div');
                activeHeader.style = "font-size: 11px; font-weight:600; color: var(--accent-blue-glow); margin-bottom: 6px; text-transform: uppercase;";
                activeHeader.innerText = "Bitácora Contrato Activo MTI";
                histContainer.appendChild(activeHeader);

                const sortedHist = [...eq.historico].sort((a,b) => b.fecha.localeCompare(a.fecha));
                sortedHist.forEach(h => {
                    const card = document.createElement('div');
                    card.className = 'modal-history-card';
                    card.style.borderColor = 'rgba(2,102,204,0.3)';
                    card.innerHTML = `
                        <div class="history-card-details">
                            <div class="history-card-title" style="font-weight:600;">${h.trabajo}</div>
                            <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                                <span>Tipo: ${h.tipo || 'Preventivo'}</span> | 
                                <span>Téc: ${h.tecnico || 'MTI'}</span>
                                ${h.rodamientos && h.rodamientos.length > 0 ? ` | <span class="history-card-bearings">Rodamientos: ${h.rodamientos.join(', ')}</span>` : ''}
                            </div>
                        </div>
                        <div class="history-card-date" style="color: var(--accent-blue-glow);">${h.fecha}</div>
                    `;
                    histContainer.appendChild(card);
                });
            }

            // Render pre-existing plant legacy audit logs
            if (hasLegacyLogs) {
                const legacyHeader = document.createElement('div');
                legacyHeader.style = `font-size: 11px; font-weight:600; color: var(--text-muted); margin-top: ${hasActiveLogs ? '14px' : '0'}; margin-bottom: 6px; text-transform: uppercase;`;
                legacyHeader.innerText = "Antecedentes de Auditoría de Planta (Pre-2026)";
                histContainer.appendChild(legacyHeader);

                const sortedLegacy = [...eq.antecedentes].sort((a,b) => b.fecha.localeCompare(a.fecha));
                sortedLegacy.forEach(h => {
                    const card = document.createElement('div');
                    card.className = 'modal-history-card';
                    card.style.opacity = '0.75';
                    card.innerHTML = `
                        <div class="history-card-details">
                            <div class="history-card-title" style="font-weight:500;">${h.trabajo}</div>
                            <div style="font-size:10px; color:var(--text-secondary); margin-top:2px;">
                                <span>Tipo: ${h.tipo || 'Auditoría'}</span> | 
                                <span>Fuente: ${h.tecnico || 'Planta'}</span>
                                ${h.rodamientos && h.rodamientos.length > 0 ? ` | <span class="history-card-bearings" style="color:var(--text-secondary);">Rodamientos: ${h.rodamientos.join(', ')}</span>` : ''}
                            </div>
                        </div>
                        <div class="history-card-date">${h.fecha}</div>
                    `;
                    histContainer.appendChild(card);
                });
            }
        }

        // Load Pauta Técnica MTI
        const checklistObj = getMaintenanceChecklist(eq.nombre);
        document.getElementById('modal-pauta-title').innerText = `Pauta Técnica: ${checklistObj.title}`;
        const pautaListEl = document.getElementById('modal-pauta-list');
        pautaListEl.innerHTML = '';
        checklistObj.checklist.forEach(item => {
            const li = document.createElement('li');
            li.style.marginBottom = '8px';
            li.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-blue-glow); margin-right: 8px;"></i> ${item}`;
            pautaListEl.appendChild(li);
        });
    }

    document.getElementById('eq-modal-overlay').classList.add('active');
}

// Close Modal
function closeEquipmentModal() {
    document.getElementById('eq-modal-overlay').classList.remove('active');
    STATE.selectedEquipmentId = null;
    STATE.tempImageBase64 = null;
}

// Switch between tabs inside the Equipment Detail Modal
function switchModalTab(tabId) {
    // Remove active from all tabs
    document.querySelectorAll('#modal-tab-headers .modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-modaltab') === tabId) {
            btn.classList.add('active');
        }
    });

    // Remove active from all content panels
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(tabId);
    if(targetContent) targetContent.classList.add('active');
}

// Save Changes edited (or created) in modal forms
function saveEquipmentChanges() {
    const editMode = STATE.editMode;
    let eqId = STATE.selectedEquipmentId;

    const newNombre = document.getElementById('modal-edit-nombre').value.trim();
    if (!newNombre) {
        showToast("El nombre del equipo es obligatorio", "error");
        return;
    }

    // Technical specifications
    const newArea = document.getElementById('modal-edit-area').value;
    const newDesignacion = document.getElementById('modal-edit-designacion').value.trim();
    const newCantidad = parseInt(document.getElementById('modal-edit-cantidad').value) || 1;
    const newHoras = parseInt(document.getElementById('modal-edit-horas').value) || 8;
    const newEstado = document.getElementById('modal-edit-estado').value;
    const newFrecuencia = parseInt(document.getElementById('modal-edit-frecuencia').value) || 6;
    
    const newMarca = document.getElementById('modal-edit-marca').value.trim();
    const newModelo = document.getElementById('modal-edit-modelo').value.trim();
    const newSerie = document.getElementById('modal-edit-serie').value.trim();
    const newPotencia = document.getElementById('modal-edit-potencia').value.trim();
    const newVoltaje = document.getElementById('modal-edit-voltaje').value.trim();
    const newAmperaje = document.getElementById('modal-edit-amperaje').value.trim();
    const newConexion = document.getElementById('modal-edit-conexion').value;
    const newCosfi = document.getElementById('modal-edit-cosfi').value.trim();
    const newCable = document.getElementById('modal-edit-cable').value.trim();
    const newRpm = document.getElementById('modal-edit-rpm').value.trim();
    
    const newCliente = document.getElementById('modal-edit-cliente').value;
    const newCentro = document.getElementById('modal-edit-centro').value;
    
    const rodInput = document.getElementById('modal-edit-rodamientos').value;
    const newRodamientos = rodInput.split(',')
                                  .map(r => r.trim())
                                  .filter(r => r.length > 0);

    const newRepuestos = document.getElementById('modal-edit-repuestos').value.trim();
    
    const newUltima = document.getElementById('modal-edit-ultima').value;
    let newProxima = document.getElementById('modal-edit-proxima').value;
    
    // Automatically calculate next maintenance if blank
    if (!newProxima && newUltima) {
        const lastDate = new Date(newUltima);
        lastDate.setMonth(lastDate.getMonth() + newFrecuencia);
        newProxima = lastDate.toISOString().split('T')[0];
    }

    const newImagenes = STATE.selectedEquipmentImages || [];
    const primaryImage = newImagenes[0] || "";

    if (editMode === 'create') {
        // Auto-generate ID if empty
        const prefix = newArea.substring(0, 3).toUpperCase();
        eqId = document.getElementById('modal-edit-id').value.trim() || `MTI-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Verify uniqueness across all centers
        const exists = STATE.allEquipment.some(e => e.id === eqId);
        if (exists) {
            showToast(`El ID ${eqId} ya existe. Utiliza otro diferente.`, "error");
            return;
        }

        const newEq = {
            id: eqId,
            nombre: newNombre,
            area: newArea,
            designacion: newDesignacion,
            cantidad: newCantidad,
            horasFuncionamiento: newHoras,
            criticidad: newHoras >= 24 ? "Alta" : (newHoras >= 12 ? "Media" : "Baja"),
            estado: newEstado,
            imagen: primaryImage,
            imagenes: newImagenes,
            cliente: newCliente,
            centro: newCentro,
            
            marca: newMarca,
            modelo: newModelo,
            serie: newSerie,
            potencia: newPotencia,
            voltaje: newVoltaje,
            amperaje: newAmperaje,
            conexion: newConexion,
            cos_fi: newCosfi,
            cable_awg: newCable,
            rpm: newRpm,
            
            rodamientos: newRodamientos,
            repuestos: newRepuestos,
            
            ultima_mantencion: newUltima,
            proxima_mantencion: newProxima,
            frecuencia_meses: newFrecuencia,
            antecedentes: [],
            historico: []
        };

        STATE.allEquipment.push(newEq);
        showToast("Equipo motor agregado con éxito!", "success");
    } else {
        // Editing existing
        const eq = STATE.allEquipment.find(e => e.id === eqId);
        if (eq) {
            eq.nombre = newNombre;
            eq.area = newArea;
            eq.designacion = newDesignacion;
            eq.cantidad = newCantidad;
            eq.horasFuncionamiento = newHoras;
            eq.criticidad = newHoras >= 24 ? "Alta" : (newHoras >= 12 ? "Media" : "Baja");
            eq.estado = newEstado;
            eq.imagen = primaryImage;
            eq.imagenes = newImagenes;
            eq.cliente = newCliente;
            eq.centro = newCentro;
            
            eq.marca = newMarca;
            eq.modelo = newModelo;
            eq.serie = newSerie;
            eq.potencia = newPotencia;
            eq.voltaje = newVoltaje;
            eq.amperaje = newAmperaje;
            eq.conexion = newConexion;
            eq.cos_fi = newCosfi;
            eq.cable_awg = newCable;
            eq.rpm = newRpm;
            
            eq.rodamientos = newRodamientos;
            eq.repuestos = newRepuestos;
            
            eq.ultima_mantencion = newUltima;
            eq.proxima_mantencion = newProxima;
            eq.frecuencia_meses = newFrecuencia;
        }
        showToast("Cambios guardados con éxito!", "success");
    }

    // Sync back to RAW_DB
    RAW_DB.Equipos = STATE.allEquipment;
    
    // Recalculate global active history log from all items
    let globalHistory = [];
    STATE.allEquipment.forEach(eq => {
        eq.historico.forEach(h => {
            globalHistory.push({
                fecha: h.fecha,
                tarea: h.trabajo,
                rodamientos: h.rodamientos,
                eqId: eq.id,
                eqName: eq.nombre,
                area: eq.area,
                fuente: "Registro de Terreno",
                tecnico: h.tecnico || "Técnico MTI"
            });
        });
    });
    globalHistory.sort((a, b) => b.fecha.localeCompare(a.fecha));
    RAW_DB.HistorialGlobal = globalHistory;

    // Save to Cache & File
    localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
    saveToLocalServer(RAW_DB);

    // Enqueue Sheets sync transaction
    if (window.dbStore) {
        if (editMode === 'create') {
            const newEq = STATE.allEquipment.find(e => e.id === eqId);
            window.dbStore.addToSyncQueue("addEquipment", {
                center: newCentro,
                equipment: localToSheetEq(newEq)
            }).then(() => syncWithSheets());
        } else {
            const eq = STATE.allEquipment.find(e => e.id === eqId);
            window.dbStore.addToSyncQueue("updateEquipment", {
                center: newCentro,
                equipmentId: eqId,
                field: "ALL_ROW",
                value: localToSheetEq(eq)
            }).then(() => syncWithSheets());
        }
    }

    // Refresh UI and filter settings
    updateTenantFiltering();
    closeEquipmentModal();
}


// Delete an equipment permanently from Catalog
function deleteEquipment() {
    const eqId = STATE.selectedEquipmentId;
    if (!eqId) return;

    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el equipo ${eqId}?`)) {
        STATE.allEquipment = STATE.allEquipment.filter(e => e.id !== eqId);
        RAW_DB.Equipos = STATE.allEquipment;
        
        // Clean history references
        RAW_DB.HistorialGlobal = RAW_DB.HistorialGlobal.filter(h => h.eqId !== eqId);
        STATE.history = RAW_DB.HistorialGlobal;

        localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
        saveToLocalServer(RAW_DB);

        updateTenantFiltering();
        closeEquipmentModal();
        showToast("Equipo eliminado correctamente", "warning");
    }
}


// Add a new manual maintenance log item from modal (Goes to Active History)
function addManualHistory() {
    const eqId = STATE.selectedEquipmentId;
    if (!eqId) return;

    const fecha = document.getElementById('history-new-fecha').value;
    const tipo = document.getElementById('history-new-tipo').value;
    const work = document.getElementById('history-new-trabajo').value.trim();
    const tech = document.getElementById('history-new-tecnico').value.trim() || "Técnico MTI";
    const rodInput = document.getElementById('history-new-rodamientos').value;
    const rods = rodInput.split(',').map(r => r.trim()).filter(r => r.length > 0);

    if (!fecha || !work) {
        showToast("Fecha y detalles del trabajo son requeridos", "error");
        return;
    }

    const eq = STATE.allEquipment.find(e => e.id === eqId);
    if (eq) {
        if (!eq.historico) eq.historico = [];
        
        // Add new active log to item
        eq.historico.push({
            fecha: fecha,
            tipo: tipo,
            rodamientos: rods,
            trabajo: work,
            tecnico: tech
        });

        // Set last maintenance date to this new date
        eq.ultima_mantencion = fecha;
        
        // Recalculate next maintenance date
        const lastDate = new Date(fecha);
        lastDate.setMonth(lastDate.getMonth() + (eq.frecuencia_meses || 6));
        eq.proxima_mantencion = lastDate.toISOString().split('T')[0];

        // Update modal forms
        document.getElementById('modal-edit-ultima').value = eq.ultima_mantencion;
        document.getElementById('modal-edit-proxima').value = eq.proxima_mantencion;

        // Save master list
        RAW_DB.Equipos = STATE.allEquipment;
        
        // Append to global active history
        RAW_DB.HistorialGlobal.unshift({
            fecha: fecha,
            tarea: work,
            rodamientos: rods,
            eqId: eq.id,
            eqName: eq.nombre,
            area: eq.area,
            fuente: "Registro de Terreno",
            tecnico: tech
        });

        localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
        saveToLocalServer(RAW_DB);

        updateTenantFiltering();

        // Reset inputs
        document.getElementById('history-new-fecha').value = "";
        document.getElementById('history-new-trabajo').value = "";
        document.getElementById('history-new-rodamientos').value = "";
        document.getElementById('modal-add-history-form').style.display = 'none';

        // Refresh lists in modal
        showEquipmentDetails(eqId, 'edit');
        showToast("Bitácora registrada con éxito", "success");
    }
}


// Print QR label page wrapper
function printEquipmentQR() {
    const eqId = STATE.selectedEquipmentId;
    if (!eqId) return;

    const eq = STATE.equipment.find(e => e.id === eqId);
    if (!eq) return;

    const qrUrl = `${window.location.origin}${window.location.pathname}?eqId=${eq.id}`;
    
    // Set print template values
    document.getElementById('print-qr-eq-name').innerText = eq.nombre;
    document.getElementById('print-qr-eq-id').innerText = eq.id;
    document.getElementById('print-qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`;
    
    // Unhide print container, call browser print, then hide again
    const container = document.getElementById('print-qr-card-container');
    container.style.display = 'block';
    
    setTimeout(() => {
        window.print();
        container.style.display = 'none';
    }, 500);
}

// open modal for adding new equipment
function openAddEquipmentModal() {
    showEquipmentDetails(null, 'create');
}

// Renders the mobile-responsive Technical page when scanned via QR code
function renderTerrainView(eqId) {
    const content = document.getElementById('terrain-content');
    const eq = STATE.equipment.find(e => e.id === eqId);

    if (!eq) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; color: var(--text-secondary);">
                <i class="fa fa-exclamation-triangle" style="font-size: 40px; color: var(--status-critico); margin-bottom: 12px;"></i>
                <h3>Equipo No Encontrado</h3>
                <p style="font-size: 13px; margin-top: 8px;">El ID de equipo '${eqId}' no existe en la base de datos del CMMS.</p>
                <button class="btn-mti secondary" style="margin-top: 20px;" onclick="window.location.href=window.location.pathname">Ir al Panel Principal</button>
            </div>
        `;
        return;
    }

    // Pre-calculate today's date for mobile form
    const todayStr = new Date().toISOString().split('T')[0];

    // Build history logs layout
    let historyHtml = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 10px;">Sin historial registrado en el contrato activo. El historial comenzará a correr una vez se inicie el servicio.</div>';
    
    // Build active history lists
    const hasActive = eq.historico && eq.historico.length > 0;
    const hasLegacy = eq.antecedentes && eq.antecedentes.length > 0;
    
    if (hasActive || hasLegacy) {
        let activeHtml = '';
        let legacyHtml = '';
        
        if (hasActive) {
            const sortedActive = [...eq.historico].sort((a,b) => b.fecha.localeCompare(a.fecha));
            activeHtml = `
                <div style="font-size: 11px; font-weight: 700; color: var(--accent-blue-glow); margin-bottom: 6px; text-transform: uppercase;">Bitácora Contrato Activo MTI</div>
                ${sortedActive.map(h => `
                    <div class="field-history-item" style="border-color: rgba(2,102,204,0.3); margin-bottom: 8px;">
                        <div class="field-history-header">
                            <span style="color: var(--accent-blue-glow); font-weight:700;">${h.fecha}</span>
                            <span class="badge-status" style="font-size: 8px; padding: 1px 4px; background: rgba(16,185,129,0.08); color: var(--status-operativo);">${h.tipo || 'Preventivo'}</span>
                        </div>
                        <div class="field-history-body">${h.trabajo}</div>
                        <div class="field-history-tech">
                            <i class="fa fa-user"></i> ${h.tecnico || 'Técnico MTI'}
                            ${h.rodamientos && h.rodamientos.length > 0 ? ` | <i class="fa fa-cog"></i> Rodamientos: ${h.rodamientos.join(', ')}` : ''}
                        </div>
                    </div>
                `).join('')}
            `;
        }

        if (hasLegacy) {
            const sortedLegacy = [...eq.antecedentes].sort((a,b) => b.fecha.localeCompare(a.fecha));
            legacyHtml = `
                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-top: 14px; margin-bottom: 6px; text-transform: uppercase;">Antecedentes Planta (Pre-2026)</div>
                ${sortedLegacy.map(h => `
                    <div class="field-history-item" style="opacity: 0.8; margin-bottom: 8px;">
                        <div class="field-history-header">
                            <span>${h.fecha}</span>
                            <span class="badge-status" style="font-size: 8px; padding: 1px 4px; background: rgba(255,255,255,0.05); color: var(--text-secondary);">${h.tipo || 'Auditoría'}</span>
                        </div>
                        <div class="field-history-body">${h.trabajo}</div>
                        <div class="field-history-tech">
                            <i class="fa fa-database"></i> Fuente: ${h.tecnico || 'Planta'}
                            ${h.rodamientos && h.rodamientos.length > 0 ? ` | <i class="fa fa-cog"></i> Rodamientos: ${h.rodamientos.join(', ')}` : ''}
                        </div>
                    </div>
                `).join('')}
            `;
        }
        
        historyHtml = activeHtml + legacyHtml;
    }

    let imageTag = `
        <div class="image-placeholder" style="height:140px; border-radius: 8px; border:1px solid var(--border-color); background: rgba(255,255,255,0.01);">
            <i class="fa-solid fa-gauge-high" style="font-size: 32px; color: var(--text-muted);"></i>
            <span style="font-size:10px;">${eq.area}</span>
        </div>
    `;
    if (eq.imagen) {
        imageTag = `
            <div style="height: 140px; width: 100%; border-radius: 8px; overflow: hidden; border:1px solid var(--border-color);">
                <img src="${eq.imagen}" style="width:100%; height:100%; object-fit:cover;" alt="${eq.nombre}" />
            </div>
        `;
    }

    let statusBadge = `<span class="badge-status operativo">Operativo</span>`;
    if (eq.estado === 'Requiere Revisión') statusBadge = `<span class="badge-status advertencia">Revisión Requerida</span>`;
    else if (eq.estado === 'Crítico') statusBadge = `<span class="badge-status critico">Falla / Parado</span>`;

    content.innerHTML = `
        <!-- Terrain view submenu tabs -->
        <div class="terrain-submenu">
            <button class="terrain-tab-btn active" onclick="switchTerrainTab('ficha')" id="btn-t-ficha">
                <i class="fa-solid fa-file-lines"></i> Ficha
            </button>
            <button class="terrain-tab-btn" onclick="switchTerrainTab('historial')" id="btn-t-historial">
                <i class="fa-solid fa-clock-rotate-left"></i> Historial
            </button>
            <button class="terrain-tab-btn" onclick="switchTerrainTab('registrar')" id="btn-t-registrar">
                <i class="fa-solid fa-plus-circle"></i> Registrar
            </button>
        </div>

        <!-- TAB CONTENT 1: FICHA TÉCNICA -->
        <div id="t-tab-ficha-content" class="terrain-tab-content">
            <!-- Media & Status -->
            ${imageTag}
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 16px;">
                <div>
                    <h2 style="font-size: 18px; font-weight: 700; color:var(--text-primary);">${eq.nombre}</h2>
                    <p style="font-family:monospace; font-size:12px; color:var(--accent-blue-glow); margin-top: 2px;">${eq.id} • Area ${eq.area}</p>
                </div>
                ${statusBadge}
            </div>

            <!-- Spec groups -->
            <div class="spec-group-title">Especificaciones Técnicas (Motor)</div>
            <table class="spec-table">
                <tr><td class="label">Marca / Modelo</td><td class="value">${eq.marca || 'N/A'} / ${eq.modelo || 'N/A'}</td></tr>
                <tr><td class="label">N° Serie</td><td class="value" style="font-family: monospace;">${eq.serie || 'N/A'}</td></tr>
                <tr><td class="label">Potencia Eléctrica</td><td class="value">${eq.potencia || 'N/A'}</td></tr>
                <tr><td class="label">Voltaje Nominal</td><td class="value">${eq.voltaje || 'N/A'}</td></tr>
                <tr><td class="label">Amperaje Nominal</td><td class="value">${eq.amperaje || 'N/A'}</td></tr>
                <tr><td class="label">Tipo Conexión</td><td class="value">${eq.conexion || 'N/A'}</td></tr>
                <tr><td class="label">Coseno de Fi (cos φ)</td><td class="value">${eq.cos_fi || 'N/A'}</td></tr>
                <tr><td class="label">Calibre Cable AWG</td><td class="value">${eq.cable_awg || 'N/A'}</td></tr>
                <tr><td class="label">Velocidad (RPM)</td><td class="value">${eq.rpm || 'N/A'}</td></tr>
                <tr><td class="label">Rodamientos</td><td class="value" style="font-family: monospace; font-weight: 700; color: var(--accent-blue-glow);">${eq.rodamientos.join(', ') || 'N/A'}</td></tr>
                <tr><td class="label">Repuestos Críticos</td><td class="value" style="font-size:11px; font-weight: 400; text-align: left; line-height: 1.3;" colspan="2"><br>${eq.repuestos || 'N/A'}</td></tr>
            </table>

            <!-- Dates -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
                <div>
                    <div style="font-size: 9px; text-transform: uppercase; color: var(--text-secondary);">Última Mantención</div>
                    <div style="font-size: 13px; font-weight: 700; margin-top: 2px;">${eq.ultima_mantencion}</div>
                </div>
                <div>
                    <div style="font-size: 9px; text-transform: uppercase; color: var(--text-secondary);">Próxima Mantención</div>
                    <div style="font-size: 13px; font-weight: 700; margin-top: 2px; color: var(--accent-blue-glow);">${eq.proxima_mantencion}</div>
                </div>
            </div>

            <button class="btn-mti secondary" onclick="window.location.href=window.location.pathname" style="margin-top: 10px; margin-bottom: 40px;">
                <i class="fa fa-arrow-left"></i> Volver al Panel Principal (CMMS)
            </button>
        </div>

        <!-- TAB CONTENT 2: HISTORIAL -->
        <div id="t-tab-historial-content" class="terrain-tab-content" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                <h3 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">Historial de Mantención</h3>
                <span style="font-size:11px; color:var(--accent-blue-glow); font-family:monospace;">${eq.id}</span>
            </div>
            <div class="field-history-timeline" style="margin-bottom: 30px;">
                ${historyHtml}
            </div>
            <button class="btn-mti secondary" onclick="window.location.href=window.location.pathname" style="margin-top: 10px; margin-bottom: 40px;">
                <i class="fa fa-arrow-left"></i> Volver al Panel Principal (CMMS)
            </button>
        </div>

        <!-- TAB CONTENT 3: REGISTRAR -->
        <div id="t-tab-registrar-content" class="terrain-tab-content" style="display:none;">
            <div style="margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                <h3 style="font-size:14px; font-weight:700; color:var(--text-primary); margin:0;">Registrar en Terreno</h3>
                <p style="font-size:11px; color:var(--text-secondary); margin:2px 0 0 0;">Reportar mantenimiento realizado a ${eq.nombre} (${eq.id})</p>
            </div>
            <form id="terrain-log-form" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; width:100%;" onsubmit="handleTerrainFormSubmit(event, '${eq.id}')">
                <div class="form-group">
                    <label class="form-label">Fecha del Trabajo</label>
                    <input type="date" id="t-fecha" class="form-input-text" value="${todayStr}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Trabajo</label>
                    <select id="t-tipo" class="form-select" required>
                        <option value="Preventivo">Inspección / Mantenimiento Preventivo</option>
                        <option value="Correctivo">Reparación Correctiva (Falla)</option>
                        <option value="Calibración">Alineación / Calibración</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Estado de la Máquina en Entrega</label>
                    <select id="t-estado" class="form-select" required>
                        <option value="Operativo">Operativo (Habilitado)</option>
                        <option value="Requiere Revisión">Requiere Revisión Adicional</option>
                        <option value="Crítico">Fuera de Servicio (Parado)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Rodamientos Cambiados (Opcional)</label>
                    <input type="text" id="t-rodamientos" class="form-input-text" placeholder="Ej: 6206-C3">
                </div>
                <div class="form-group">
                    <label class="form-label">Detalles del Trabajo Ejecutado *</label>
                    <textarea id="t-trabajo" class="form-input-text" rows="3" placeholder="Detalle la mantención efectuada..." required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Técnico Responsable *</label>
                    <input type="text" id="t-tecnico" class="form-input-text" placeholder="Su nombre (MTI)" required>
                </div>
                
                <button type="submit" class="btn-mti primary" style="margin-top: 10px;">
                    <i class="fa fa-save"></i> Guardar Intervención en Terreno
                </button>
            </form>
            <button class="btn-mti secondary" onclick="window.location.href=window.location.pathname" style="margin-top: 10px; margin-bottom: 40px;">
                <i class="fa fa-arrow-left"></i> Volver al Panel Principal (CMMS)
            </button>
        </div>
    `;
}

// Handle submission of terrain mobile form
function handleTerrainFormSubmit(event, eqId) {
    event.preventDefault();

    const fecha = document.getElementById('t-fecha').value;
    const tipo = document.getElementById('t-tipo').value;
    const estado = document.getElementById('t-estado').value;
    const work = document.getElementById('t-trabajo').value.trim();
    const tech = document.getElementById('t-tecnico').value.trim();
    const rodInput = document.getElementById('t-rodamientos').value;
    const rods = rodInput.split(',').map(r => r.trim()).filter(r => r.length > 0);

    if (!fecha || !work || !tech) {
        alert("Todos los campos obligatorios (*) deben ser completados.");
        return;
    }

    const eq = STATE.allEquipment.find(e => e.id === eqId);
    if (eq) {
        if (!eq.historico) eq.historico = [];
        
        // Append history to item (Active history)
        eq.historico.push({
            fecha: fecha,
            tipo: tipo,
            rodamientos: rods,
            trabajo: work,
            tecnico: tech
        });

        // Update item values
        eq.ultima_mantencion = fecha;
        eq.estado = estado;
        
        // Recalculate next date
        const lastDate = new Date(fecha);
        lastDate.setMonth(lastDate.getMonth() + (eq.frecuencia_meses || 6));
        eq.proxima_mantencion = lastDate.toISOString().split('T')[0];

        // Sync RAW_DB
        RAW_DB.Equipos = STATE.allEquipment;
        
        // Add to global timeline log (Active)
        RAW_DB.HistorialGlobal.unshift({
            fecha: fecha,
            tarea: work,
            rodamientos: rods,
            eqId: eq.id,
            eqName: eq.nombre,
            area: eq.area,
            fuente: "Registro de Terreno",
            tecnico: tech
        });
        STATE.history = RAW_DB.HistorialGlobal;
        
        // Save
        localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
        saveToLocalServer(RAW_DB);

        // Enqueue Sheets sync transaction
        if (window.dbStore) {
            const sheetLog = {
                Fecha: fecha,
                ID_Equipo: eq.id,
                Nombre_Equipo: eq.nombre,
                Area: eq.area,
                Tipo_Mantencion: tipo,
                Descripcion: work,
                Tecnico: tech,
                Estado_Final: estado,
                Proxima_Fecha: eq.proxima_mantencion,
                Cliente: eq.cliente || STATE.selectedClient,
                Centro: eq.centro || STATE.selectedCenter
            };
            window.dbStore.addToSyncQueue("addMaintenanceLog", { log: sheetLog }).then(() => syncWithSheets());
        }

        alert("¡Registro guardado con éxito! Se ha actualizado la base de datos física del CMMS.");
        
        // Reload terrain view to show the new history entry
        renderTerrainView(eqId);
    }
}

// Send updated database to local PowerShell Server or Cloudflare KV depending on environment
function saveToLocalServer(db) {
    const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '');
    const url = isLocal ? 'http://localhost:8080/api/save' : '/api/database';
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(db)
    })
    .then(response => {
        if (response.ok) {
            console.log(isLocal ? "Success: Database file updated on local disk!" : "Success: Database updated in Cloudflare KV!");
            showToast(isLocal ? "Guardado físico exitoso en database.js!" : "Sincronizado con base de datos en la nube!", "success");
        } else {
            console.error("Server error writing database.");
            showToast("Error al guardar datos en el servidor", "error");
        }
    })
    .catch(error => {
        if (isLocal) {
            console.warn("Local server start_server.ps1 is not running. Saved to browser cache only.", error);
            showToast("Guardado en navegador (Servidor local inactivo)", "warning");
        } else {
            console.error("Cloudflare sync failed. Saved to browser cache only.", error);
            showToast("Guardado en navegador (Error de sincronización con la nube)", "warning");
        }
    });
}

// Check local server or Cloudflare status connection status on startup
function checkLocalServerConnection() {
    const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '');
    const url = isLocal ? 'http://localhost:8080/api/status' : '/api/database';
    
    fetch(url, { method: 'GET' })
    .then(() => {
        showToast(isLocal ? "Servidor local MTI conectado. Guardado directo habilitado." : "Conectado a Cloudflare KV. Sincronización en la nube activa.", "success");
    })
    .catch(() => {
        if (isLocal) {
            console.log("Not running local server. Standard offline mode active.");
        } else {
            console.warn("Cloudflare KV offline. Standard offline mode active.");
        }
    });
}

// Synchronize Database with Cloudflare KV
function syncDatabaseFromCloudflare() {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '') {
        fetch('/api/database')
        .then(res => {
            if (res.ok) return res.json();
            throw new Error('Cloudflare fetch failed');
        })
        .then(onlineDb => {
            if (onlineDb && onlineDb.Equipos) {
                const currentLocalRaw = localStorage.getItem('PISCICULTURA_CONSOLIDATED_RAW');
                if (JSON.stringify(onlineDb) !== currentLocalRaw) {
                    localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(onlineDb));
                    RAW_DB = onlineDb;
                    console.log("Database successfully synced from Cloudflare KV remotely.");
                    
                    // Re-initialize state and refresh UI dynamically
                    STATE.allEquipment = RAW_DB.Equipos || [];
                    
                    const urlParams = new URLSearchParams(window.location.search);
                    const eqIdParam = urlParams.get('eqId');
                    
                    if (eqIdParam || STATE.fieldMode) {
                        const targetId = eqIdParam || STATE.selectedEquipmentId;
                        const eq = STATE.allEquipment.find(e => e.id === targetId);
                        if (eq) {
                            STATE.selectedClient = eq.cliente || 'Cermaq';
                            STATE.selectedCenter = eq.centro || 'Sta Juana';
                            localStorage.setItem('MTI_SELECTED_CLIENT', STATE.selectedClient);
                            localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
                        }
                    }
                    
                    // Filter equipment and history for active client/center
                    STATE.equipment = STATE.allEquipment.filter(e => e.cliente === STATE.selectedClient && e.centro === STATE.selectedCenter);
                    const activeEqIds = new Set(STATE.equipment.map(e => e.id));
                    STATE.history = (RAW_DB.HistorialGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));
                    STATE.auditHistory = (RAW_DB.AntecedentesGlobal || []).filter(h => activeEqIds.has(h.eqId || h.id));

                    if (eqIdParam || STATE.fieldMode) {
                        renderTerrainView(eqIdParam || STATE.selectedEquipmentId);
                    } else {
                        // Re-render dashboard elements
                        const subtitle = document.getElementById('app-subtitle-display');
                        if (subtitle) {
                            subtitle.innerText = `Mantenimiento ${STATE.selectedClient.toUpperCase()} ${STATE.selectedCenter.toUpperCase()} 2026`;
                        }
                        populateTenantSelectors();
                        generatePlannedTasks();
                        renderKPIs();
                        renderTabContent();
                    }
                    showToast("Base de datos sincronizada con la nube", "success");
                }
            }
        })
        .catch(err => {
            console.warn("Could not sync with Cloudflare KV database. Standard offline mode active.", err);
        });
    }
}

// Display visual toast notification
function showToast(message, type = "success") {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'error') icon = 'fa-times-circle';

    toast.innerHTML = `<i class="fa ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

// Export database as pure JSON
function exportDatabaseJSON() {
    const rawData = localStorage.getItem('PISCICULTURA_CONSOLIDATED_RAW') || JSON.stringify(RAW_DB);
    const blob = new Blob([rawData], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mti_cmms_db.json";
    link.click();
    showToast("Base de datos descargada como archivo JSON puro", "success");
}

// Export current center's equipment to an Excel-compatible CSV
function exportEquipmentExcel() {
    // Filter active client and center, then apply the same search query, area, and status filters as in renderInventarioTab()
    const activeEquip = STATE.equipment.filter(eq => {
        const matchesSearch = eq.nombre.toLowerCase().includes(STATE.searchQuery.toLowerCase()) || 
                              eq.id.toLowerCase().includes(STATE.searchQuery.toLowerCase()) ||
                              (eq.designacion && eq.designacion.toLowerCase().includes(STATE.searchQuery.toLowerCase())) ||
                              (eq.marca && eq.marca.toLowerCase().includes(STATE.searchQuery.toLowerCase()));
        
        const matchesArea = STATE.areaFilter === 'all' || eq.area.toLowerCase().includes(STATE.areaFilter.toLowerCase());
        
        let matchesStatus = true;
        if (STATE.statusFilter === 'operativo') matchesStatus = eq.estado === 'Operativo';
        if (STATE.statusFilter === 'alerta') matchesStatus = eq.estado !== 'Operativo';
        if (STATE.statusFilter === 'critico') matchesStatus = eq.criticidad === 'Alta';

        return matchesSearch && matchesArea && matchesStatus;
    });
    
    if (activeEquip.length === 0) {
        showToast("No hay equipos registrados en el centro actual para exportar", "warning");
        return;
    }

    let csvContent = "\uFEFF";
    const headers = [
        "ID", "Nombre", "Área", "Designación", "Cantidad", "Horas Operación Diarias",
        "Estado", "Frecuencia (Meses)", "Última Mantención", "Próxima Mantención",
        "Marca Motor", "Modelo Motor", "N° Serie", "Potencia", "Voltaje",
        "Corriente (A)", "Conexión", "Coseno Fi (cos φ)", "Cable AWG", "RPM",
        "Rodamientos Principales", "Repuestos Críticos", "Cliente", "Centro"
    ];
    csvContent += headers.join(";") + "\r\n";

    activeEquip.forEach(eq => {
        const row = [
            eq.id || "",
            eq.nombre || "",
            eq.area || "",
            eq.designacion || "",
            eq.cantidad || 1,
            eq.horasFuncionamiento || 8,
            eq.estado || "",
            eq.frecuencia_meses || 6,
            eq.ultima_mantencion || "",
            eq.proxima_mantencion || "",
            eq.marca || "",
            eq.modelo || "",
            eq.serie || "",
            eq.potencia || "",
            eq.voltaje || "",
            eq.amperaje || "",
            eq.conexion || "",
            eq.cos_fi || "",
            eq.cable_awg || "",
            eq.rpm || "",
            (eq.rodamientos || []).join(", "),
            eq.repuestos || "",
            eq.cliente || STATE.selectedClient,
            eq.centro || STATE.selectedCenter
        ];
        
        const escapedRow = row.map(val => {
            let str = String(val);
            // Replace any semicolons in values to avoid column breaking, and escape quotes
            str = str.replace(/;/g, ",").replace(/"/g, '""');
            return `"${str}"`;
        });
        
        csvContent += escapedRow.join(";") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `Equipos_${STATE.selectedClient}_${STATE.selectedCenter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Planilla Excel exportada con éxito (${activeEquip.length} equipos)`, "success");
}

// Import database from pure JSON
function importDatabaseJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Basic validation of schema
            if (!importedData.Equipos || !importedData.HistorialGlobal) {
                alert("Error: El archivo JSON no tiene el formato válido del CMMS MTI.");
                return;
            }

            if (confirm("¿Está seguro de que desea importar este archivo? Esto sobrescribirá la base de datos actual y se guardará físicamente en el servidor.")) {
                RAW_DB = importedData;
                
                // Migrate / ensure multi-tenant properties
                if (!RAW_DB.Clientes) RAW_DB.Clientes = ["Cermaq"];
                if (!RAW_DB.Centros) RAW_DB.Centros = { "Cermaq": ["Sta Juana", "Rahue", "Trafun"] };
                
                STATE.allEquipment = RAW_DB.Equipos || [];
                STATE.allEquipment.forEach(eq => {
                    if (!eq.cliente) eq.cliente = "Cermaq";
                    if (!eq.centro) eq.centro = "Sta Juana";
                    
                    // Fix generic image path for eq.imagen
                    if (eq.imagen && !eq.imagen.startsWith('assets/') && !eq.imagen.startsWith('fotos_equipos/') && !eq.imagen.startsWith('http') && !eq.imagen.startsWith('data:')) {
                        eq.imagen = `assets/imagenes-tipo/${eq.imagen}`;
                    }

                    // Fix generic image paths for eq.imagenes list
                    if (!eq.imagenes) {
                        eq.imagenes = eq.imagen ? [eq.imagen] : [];
                    } else {
                        eq.imagenes = eq.imagenes.map(img => {
                            if (img && !img.startsWith('assets/') && !img.startsWith('fotos_equipos/') && !img.startsWith('http') && !img.startsWith('data:')) {
                                return `assets/imagenes-tipo/${img}`;
                            }
                            return img;
                        });
                    }
                });
                
                // Select first client/center if current selection is not available in imported data
                if (!RAW_DB.Clientes.includes(STATE.selectedClient)) {
                    STATE.selectedClient = RAW_DB.Clientes[0] || 'Cermaq';
                    STATE.selectedCenter = (RAW_DB.Centros[STATE.selectedClient] && RAW_DB.Centros[STATE.selectedClient][0]) || 'Sta Juana';
                    localStorage.setItem('MTI_SELECTED_CLIENT', STATE.selectedClient);
                    localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
                } else {
                    const centers = RAW_DB.Centros[STATE.selectedClient] || [];
                    if (!centers.includes(STATE.selectedCenter)) {
                        STATE.selectedCenter = centers[0] || 'Sta Juana';
                        localStorage.setItem('MTI_SELECTED_CENTER', STATE.selectedCenter);
                    }
                }

                localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
                saveToLocalServer(RAW_DB);
                
                showToast("¡Base de datos importada con éxito!", "success");
                
                // Clear input
                event.target.value = '';

                // Re-apply filters and reload selectors
                populateTenantSelectors();
                updateTenantFiltering();
            } else {
                event.target.value = '';
            }
        } catch (err) {
            console.error(err);
            alert("Error al analizar el archivo JSON. Asegúrese de que sea un archivo JSON válido.");
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}


// Upload image to server
function uploadImageToServer(filename, base64) {
    const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '');
    const url = isLocal ? 'http://localhost:8080/api/upload-image' : '/api/upload-image';
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename, base64 })
    })
    .then(res => {
        if (res.ok) return res.json();
        throw new Error("Server failed to save image");
    });
}

// Render main image preview and thumbnail gallery in details modal
function renderModalImages(activeIndex = 0) {
    const imgWrapper = document.getElementById('modal-eq-image-wrapper');
    const thumbWrapper = document.getElementById('modal-thumbnails-wrapper');
    if (!imgWrapper || !thumbWrapper) return;

    const images = STATE.selectedEquipmentImages || [];
    
    // 1. Render Main Preview Image
    if (images.length > 0) {
        const activeSrc = images[activeIndex];
        imgWrapper.innerHTML = `
            <img src="${activeSrc}" class="modal-img" alt="Vista principal" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;" onclick="openLightbox(${activeIndex})" title="Haga clic para ampliar la imagen" />
            <div class="image-placeholder" style="display:none; height:100%; width:100%;">
                <i class="fa-solid fa-camera" style="font-size:48px; color: var(--text-muted);"></i>
                <span style="font-size: 11px;">Error al cargar imagen</span>
            </div>
        `;
    } else {
        imgWrapper.innerHTML = `
            <div class="image-placeholder" style="height:100%; width:100%;">
                <i class="fa-solid fa-camera" style="font-size:48px; color: var(--text-muted);"></i>
                <span style="font-size: 11px;">Sube fotos o pega una URL</span>
            </div>
        `;
    }

    // 2. Render Thumbnails
    thumbWrapper.innerHTML = '';
    images.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `thumbnail-item ${idx === activeIndex ? 'active' : ''}`;
        thumb.innerHTML = `
            <img src="${src}" class="thumbnail-img" />
            <button type="button" class="thumbnail-delete-btn" onclick="removeModalImage(${idx}, event)">&times;</button>
        `;
        thumb.onclick = () => renderModalImages(idx);
        thumbWrapper.appendChild(thumb);
    });
}

// Lightbox State
let lightboxActiveIndex = 0;

// Open lightbox showing the image at activeIndex
function openLightbox(index) {
    const images = STATE.selectedEquipmentImages || [];
    if (images.length === 0) return;
    
    lightboxActiveIndex = index;
    const modal = document.getElementById('lightbox-modal');
    if (modal) {
        modal.style.display = 'flex';
        updateLightboxContent();
        
        // Close on clicking backdrop
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeLightbox();
            }
        };
        
        // Add keyboard listener for navigation and closing
        document.addEventListener('keydown', handleLightboxKeydown);
    }
}

// Close the lightbox
function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) {
        modal.style.display = 'none';
        document.removeEventListener('keydown', handleLightboxKeydown);
    }
}

// Update image and caption in the lightbox
function updateLightboxContent() {
    const images = STATE.selectedEquipmentImages || [];
    const imgEl = document.getElementById('lightbox-image');
    const capEl = document.getElementById('lightbox-caption');
    if (!imgEl || !capEl || images.length === 0) return;
    
    // Bounds check
    if (lightboxActiveIndex < 0) lightboxActiveIndex = images.length - 1;
    if (lightboxActiveIndex >= images.length) lightboxActiveIndex = 0;
    
    imgEl.src = images[lightboxActiveIndex];
    capEl.innerText = `Foto ${lightboxActiveIndex + 1} de ${images.length}`;
}

// Navigate images by direction (-1 or +1)
function changeLightboxImage(direction) {
    const images = STATE.selectedEquipmentImages || [];
    if (images.length <= 1) return;
    
    lightboxActiveIndex += direction;
    updateLightboxContent();
}

// Keyboard navigation handler
function handleLightboxKeydown(event) {
    if (event.key === 'ArrowLeft') {
        changeLightboxImage(-1);
    } else if (event.key === 'ArrowRight') {
        changeLightboxImage(1);
    } else if (event.key === 'Escape') {
        closeLightbox();
    }
}


// Remove image from selectedEquipmentImages array at index
function removeModalImage(index, event) {
    if (event) event.stopPropagation();
    
    if (confirm("¿Está seguro de que desea eliminar esta imagen?")) {
        STATE.selectedEquipmentImages.splice(index, 1);
        const nextIndex = Math.max(0, index - 1);
        renderModalImages(nextIndex);
    }
}

// Add a manual URL to the selectedEquipmentImages array
function addUrlPhoto() {
    const urlInput = document.getElementById('modal-edit-image-url');
    if (!urlInput) return;
    const url = urlInput.value.trim();
    if (!url) {
        alert("Por favor ingrese una URL de imagen válida.");
        return;
    }
    
    if (!STATE.selectedEquipmentImages) STATE.selectedEquipmentImages = [];
    STATE.selectedEquipmentImages.push(url);
    urlInput.value = '';
    renderModalImages(STATE.selectedEquipmentImages.length - 1);
    showToast("Imagen agregada.", "success");
}

// Render the Work Orders panel list and set defaults
function renderWorkOrdersTab() {
    const dateInput = document.getElementById('wo-fecha');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    const tipoSelect = document.getElementById('wo-tipo-trabajo');
    const fallaGroup = document.getElementById('wo-tipo-falla-group');
    if (tipoSelect && fallaGroup) {
        if (tipoSelect.value === 'Correctivo') {
            fallaGroup.style.display = 'block';
        } else {
            fallaGroup.style.display = 'none';
        }
        tipoSelect.onchange = () => {
            if (tipoSelect.value === 'Correctivo') {
                fallaGroup.style.display = 'block';
            } else {
                fallaGroup.style.display = 'none';
            }
        };
    }

    const recentList = document.getElementById('wo-recent-list');
    if (!recentList) return;
    
    recentList.innerHTML = '';
    
    // Sort MTI contract active history by date descending
    const sortedHistory = [...STATE.history].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if (sortedHistory.length === 0) {
        recentList.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px;"><i class="fa-regular fa-clipboard" style="font-size: 28px; margin-bottom: 8px; color: var(--text-muted); display: block;"></i>No hay órdenes registradas bajo el contrato MTI aún.</div>';
        return;
    }

    sortedHistory.forEach(h => {
        const eq = STATE.equipment.find(e => e.id === h.id);
        const eqName = eq ? eq.nombre : "Equipo Desconocido";
        const area = eq ? eq.area : "";
        
        let statusBadgeColor = 'var(--accent-blue)';
        if (h.tipo === 'Correctivo') statusBadgeColor = 'var(--status-critico)';
        if (h.tipo === 'Calibración') statusBadgeColor = 'var(--status-advertencia)';
        if (h.tipo === 'Instalación') statusBadgeColor = 'var(--accent-teal)';

        const card = document.createElement('div');
        card.className = 'wo-item-card';
        card.innerHTML = `
            <div class="wo-item-header">
                <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${h.id} <span style="font-weight: normal; color: var(--text-secondary);">- ${eqName}</span></span>
                <span class="wo-badge" style="background-color: rgba(255,255,255,0.05); color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor};">${h.tipo}</span>
            </div>
            <div class="wo-details">
                <strong>Trabajo:</strong> ${h.trabajo}
                ${h.tipoFalla ? `<br><strong>Tipo Falla:</strong> <span style="color: var(--status-critico);">${h.tipoFalla}</span>` : ''}
                ${h.comentarios ? `<br><strong>Notas:</strong> <em>${h.comentarios}</em>` : ''}
            </div>
            <div class="wo-meta">
                <span><i class="fa-regular fa-calendar"></i> ${h.fecha}</span>
                <span><i class="fa-regular fa-clock"></i> ${h.tiempoReparacion || '1.0'} h</span>
                <span><i class="fa-regular fa-user"></i> ${h.tecnico}</span>
                ${area ? `<span><i class="fa-solid fa-location-dot"></i> ${area}</span>` : ''}
            </div>
        `;
        recentList.appendChild(card);
    });
}

// Process and submit a new Work Order
function submitWorkOrder() {
    const eqId = document.getElementById('wo-eq-id').value;
    
    if (!eqId) {
        alert("Por favor seleccione un equipo de la lista de sugerencias de autocompletado.");
        return;
    }

    const tipo = document.getElementById('wo-tipo-trabajo').value;
    const tipoFalla = document.getElementById('wo-tipo-falla').value;
    const fecha = document.getElementById('wo-fecha').value;
    const tecnico = document.getElementById('wo-tecnico').value;
    const reparacionHoras = parseFloat(document.getElementById('wo-reparacion-horas').value) || 1.0;
    const costoRepuestos = parseFloat(document.getElementById('wo-costo-repuestos').value) || 0;
    const puestaMarcha = document.getElementById('wo-puesta-marcha').value;
    const acciones = document.getElementById('wo-acciones').value;
    const comentarios = document.getElementById('wo-comentarios').value;

    const newOrder = {
        fecha: fecha,
        id: eqId,
        eqId: eqId,
        tipo: tipo,
        tipoFalla: tipo === 'Correctivo' ? tipoFalla : "",
        trabajo: acciones,
        comentarios: comentarios,
        tiempoReparacion: reparacionHoras,
        costoRepuestos: costoRepuestos,
        tecnico: tecnico,
        puestaMarcha: puestaMarcha
    };

    // Push globally
    RAW_DB.HistorialGlobal.push(newOrder);

    // Push to the specific equipment historico
    const eqIndex = RAW_DB.Equipos.findIndex(e => e.id === eqId);
    if (eqIndex !== -1) {
        if (!RAW_DB.Equipos[eqIndex].historico) {
            RAW_DB.Equipos[eqIndex].historico = [];
        }
        RAW_DB.Equipos[eqIndex].historico.push({
            fecha: fecha,
            tipo: tipo,
            tipoFalla: tipo === 'Correctivo' ? tipoFalla : "",
            trabajo: acciones,
            comentarios: comentarios,
            tiempoReparacion: reparacionHoras,
            costoRepuestos: costoRepuestos,
            tecnico: tecnico,
            puestaMarcha: puestaMarcha
        });

        // Update equipment status
        RAW_DB.Equipos[eqIndex].estado = puestaMarcha;
        
        // Update dates
        RAW_DB.Equipos[eqIndex].ultima_mantencion = fecha;
        
        const freq = parseInt(RAW_DB.Equipos[eqIndex].frecuencia_meses) || 6;
        const nextDate = new Date(fecha);
        nextDate.setMonth(nextDate.getMonth() + freq);
        RAW_DB.Equipos[eqIndex].proxima_mantencion = nextDate.toISOString().split('T')[0];
    }

    STATE.allEquipment = RAW_DB.Equipos;

    // Save
    localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
    saveToLocalServer(RAW_DB);

    // Enqueue Sheets sync transaction
    if (window.dbStore) {
        const eq = STATE.allEquipment.find(e => e.id === eqId);
        const sheetLog = {
            Fecha: fecha,
            ID_Equipo: eqId,
            Nombre_Equipo: eq ? eq.nombre : "Equipo Desconocido",
            Area: eq ? eq.area : "",
            Tipo_Mantencion: tipo,
            Descripcion: acciones,
            Tecnico: tecnico,
            Estado_Final: puestaMarcha,
            Proxima_Fecha: eq ? eq.proxima_mantencion : "",
            Cliente: STATE.selectedClient,
            Centro: STATE.selectedCenter
        };
        const workLog = {
            Fecha: fecha,
            ID_Equipo: eqId,
            Nombre_Equipo: eq ? eq.nombre : "Equipo Desconocido",
            Tipo_Trabajo: tipo,
            Observaciones: comentarios,
            Repuestos_Utilizados: "",
            Materiales_Utilizados: acciones,
            Horas_Trabajadas: reparacionHoras,
            Tecnico: tecnico,
            Costo_Repuestos: costoRepuestos,
            Cliente: STATE.selectedClient,
            Centro: STATE.selectedCenter
        };
        window.dbStore.addToSyncQueue("addMaintenanceLog", { log: sheetLog });
        window.dbStore.addToSyncQueue("addWorkLog", { log: workLog, isExtraordinary: false }).then(() => syncWithSheets());
    }

    // Filter and refresh active lists/UI
    updateTenantFiltering();

    // Show toast and reset form
    showToast("Orden de trabajo registrada y sincronizada con éxito", "success");

    document.getElementById('form-work-order').reset();
    document.getElementById('wo-eq-id').value = '';
    document.getElementById('wo-eq-search').value = '';
    document.getElementById('wo-fecha').value = new Date().toISOString().split('T')[0];
    
    // Refresh KPIs and current view
    renderKPIs();
    renderWorkOrdersTab();
}

// Setup Event Listeners
function setupEventListeners() {
    // Sync Button
    const syncBtn = document.getElementById('btn-sync-now');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            syncWithSheets();
        });
    }

    // Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            if (tab) {
                STATE.activeTab = tab;
                renderTabContent();
            }
        });
    });

    // Modal Tabs Navigation
    document.querySelectorAll('#modal-tab-headers .modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.currentTarget.getAttribute('data-modaltab');
            if (tabId) {
                switchModalTab(tabId);
            }
        });
    });

    // History Type selector (Active vs Legacy Audit)
    const selectHistoryType = document.getElementById('select-history-type');
    if (selectHistoryType) {
        selectHistoryType.addEventListener('change', (e) => {
            STATE.activeHistoryType = e.target.value;
            renderHistorialTab();
        });
    }

    // Search and filters
    const searchBox = document.getElementById('inventory-search');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            STATE.searchQuery = e.target.value;
            renderInventarioTab();
        });
    }

    const areaFilterSelect = document.getElementById('filter-area');
    if (areaFilterSelect) {
        areaFilterSelect.addEventListener('change', (e) => {
            STATE.areaFilter = e.target.value;
            renderInventarioTab();
        });
    }

    const statusFilterSelect = document.getElementById('filter-status');
    if (statusFilterSelect) {
        statusFilterSelect.addEventListener('change', (e) => {
            STATE.statusFilter = e.target.value;
            renderInventarioTab();
        });
    }

    // Planner sorting and filters
    const plannerSortSelect = document.getElementById('planner-sort-by');
    if (plannerSortSelect) {
        plannerSortSelect.value = STATE.plannerSortBy || 'none';
        plannerSortSelect.addEventListener('change', (e) => {
            STATE.plannerSortBy = e.target.value;
            renderPlannerTab();
        });
    }

    const plannerFilterCritSelect = document.getElementById('planner-filter-crit');
    if (plannerFilterCritSelect) {
        plannerFilterCritSelect.value = STATE.plannerFilterCrit || 'all';
        plannerFilterCritSelect.addEventListener('change', (e) => {
            STATE.plannerFilterCrit = e.target.value;
            renderPlannerTab();
        });
    }

    const plannerFilterStatusSelect = document.getElementById('planner-filter-status');
    if (plannerFilterStatusSelect) {
        plannerFilterStatusSelect.value = STATE.plannerFilterStatus || 'all';
        plannerFilterStatusSelect.addEventListener('change', (e) => {
            STATE.plannerFilterStatus = e.target.value;
            renderPlannerTab();
        });
    }

    const btnCompleteAll = document.getElementById('btn-planner-complete-all');
    if (btnCompleteAll) {
        btnCompleteAll.addEventListener('click', () => {
            const activeMonthObj = PLANNER_MONTHS.find(m => m.num === STATE.selectedMonth);
            const monthTasks = STATE.plannedTasks.filter(t => t.mes === STATE.selectedMonth);
            
            // Apply current filters
            let filteredTasks = [...monthTasks];
            if (STATE.plannerFilterCrit && STATE.plannerFilterCrit !== 'all') {
                filteredTasks = filteredTasks.filter(t => t.criticidad === STATE.plannerFilterCrit);
            }
            if (STATE.plannerFilterStatus && STATE.plannerFilterStatus !== 'all') {
                if (STATE.plannerFilterStatus === 'pendiente') {
                    filteredTasks = filteredTasks.filter(t => !t.completada);
                } else if (STATE.plannerFilterStatus === 'completada') {
                    filteredTasks = filteredTasks.filter(t => t.completada);
                }
            }

            // Filter out already completed ones to check what we're completing
            const pendingToComplete = filteredTasks.filter(t => !t.completada);

            if (pendingToComplete.length === 0) {
                showToast("No hay tareas pendientes en el filtro actual para completar", "info");
                return;
            }

            if (!RAW_DB.TareasCompletadas) {
                RAW_DB.TareasCompletadas = [];
            }

            pendingToComplete.forEach(task => {
                task.completada = true;
                if (!RAW_DB.TareasCompletadas.includes(task.id)) {
                    RAW_DB.TareasCompletadas.push(task.id);
                }
            });

            // Persist
            localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
            saveToLocalServer(RAW_DB);

            showToast(`Se completaron ${pendingToComplete.length} tareas del mes ${activeMonthObj.name}`, "success");
            renderPlannerTab();
            renderKPIs();
        });
    }

    // Modal close and cancel
    const closeModalBtn = document.getElementById('modal-close-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEquipmentModal);
    }

    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeEquipmentModal);
    }

    const modalOverlay = document.getElementById('eq-modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeEquipmentModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEquipmentModal();
        }
    });

    // Actions
    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) {
        saveBtn.onclick = saveEquipmentChanges;
    }

    const deleteBtn = document.getElementById('modal-delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = deleteEquipment;
    }

    const printQrBtn = document.getElementById('btn-print-qr');
    if (printQrBtn) {
        printQrBtn.onclick = printEquipmentQR;
    }

    // Image Upload (Multiple base64 files and physical server storage)
    const fileInput = document.getElementById('modal-upload-image');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            const eqId = document.getElementById('modal-edit-id').value || "NUEVO_EQUIPO";
            
            let uploadPromises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const base64 = evt.target.result;
                        const ext = file.name.split('.').pop() || 'jpg';
                        const filename = `${eqId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                        
                        // Check server connection dynamically
                        const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '');
                        const checkUrl = isLocal ? 'http://localhost:8080/api/status' : '/api/database';
                        
                        fetch(checkUrl, { method: 'GET' })
                        .then(() => {
                            // Server active - upload and save to folder or Cloudflare R2/KV
                            uploadImageToServer(filename, base64)
                            .then(data => {
                                resolve(data.url);
                            })
                            .catch(err => {
                                console.warn("Failed upload, fall back to base64", err);
                                resolve(base64);
                            });
                        })
                        .catch(() => {
                            // Server offline - save as inline base64 string
                            resolve(base64);
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });
            
            Promise.all(uploadPromises)
            .then(urls => {
                if (!STATE.selectedEquipmentImages) STATE.selectedEquipmentImages = [];
                STATE.selectedEquipmentImages.push(...urls);
                renderModalImages(STATE.selectedEquipmentImages.length - 1);
                showToast(`Cargada(s) ${urls.length} imagen(es) con éxito.`, "success");
                fileInput.value = '';
            })
            .catch(err => {
                console.error(err);
                showToast("Error al cargar fotos", "error");
            });
        });
    }

    // History Sub-form togglers
    const toggleHistoryBtn = document.getElementById('btn-toggle-add-history');
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', () => {
            const form = document.getElementById('modal-add-history-form');
            if(form.style.display === 'none') {
                form.style.display = 'block';
                // Set default date to today
                document.getElementById('history-new-fecha').value = new Date().toISOString().split('T')[0];
            } else {
                form.style.display = 'none';
            }
        });
    }

    const cancelHistoryBtn = document.getElementById('btn-cancel-history');
    if (cancelHistoryBtn) {
        cancelHistoryBtn.addEventListener('click', () => {
            document.getElementById('modal-add-history-form').style.display = 'none';
        });
    }

    const saveHistoryBtn = document.getElementById('btn-save-history');
    if (saveHistoryBtn) {
        saveHistoryBtn.onclick = addManualHistory;
    }

    // Autocomplete for Work Orders Search
    const searchInput = document.getElementById('wo-eq-search');
    const autocompleteList = document.getElementById('wo-autocomplete-list');
    const hiddenIdInput = document.getElementById('wo-eq-id');

    if (searchInput && autocompleteList && hiddenIdInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) {
                autocompleteList.innerHTML = '';
                autocompleteList.style.display = 'none';
                hiddenIdInput.value = '';
                return;
            }

            const matches = STATE.equipment.filter(e => 
                e.id.toLowerCase().includes(query) || 
                e.nombre.toLowerCase().includes(query)
            ).slice(0, 10);

            if (matches.length === 0) {
                autocompleteList.innerHTML = '<li class="autocomplete-item" style="color: var(--text-muted); cursor: default;">No se encontraron equipos</li>';
            } else {
                autocompleteList.innerHTML = matches.map(e => `
                    <li class="autocomplete-item" data-id="${e.id}" data-text="${e.id} - ${e.nombre}">
                        <strong>${e.id}</strong> - ${e.nombre} (${e.area})
                    </li>
                `).join('');
            }
            autocompleteList.style.display = 'block';
        });

        // Close autocomplete on click outside
        document.addEventListener('click', (e) => {
            if (e.target !== searchInput && e.target !== autocompleteList) {
                autocompleteList.style.display = 'none';
            }
        });

        // Event delegation for autocomplete items selection
        autocompleteList.addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item && item.getAttribute('data-id')) {
                const id = item.getAttribute('data-id');
                const text = item.getAttribute('data-text');
                searchInput.value = text;
                hiddenIdInput.value = id;
                autocompleteList.style.display = 'none';
            }
        });
    }

    // Work Order form reset handling
    const woForm = document.getElementById('form-work-order');
    if (woForm) {
        woForm.addEventListener('reset', () => {
            setTimeout(() => {
                document.getElementById('wo-eq-id').value = '';
                document.getElementById('wo-fecha').value = new Date().toISOString().split('T')[0];
                const fallaGroup = document.getElementById('wo-tipo-falla-group');
                if (fallaGroup) fallaGroup.style.display = 'none';
                const preview = document.getElementById('wo-costo-hh-preview');
                if (preview) preview.innerText = '$0';
            }, 10);
        });
    }

    // Live HH cost preview on work orders form
    ['wo-reparacion-horas'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                const horas = parseFloat(document.getElementById('wo-reparacion-horas').value) || 0;
                const tarifa = parseFloat(RAW_DB.TarifaHoraMTI) || 0;
                const preview = document.getElementById('wo-costo-hh-preview');
                if (preview) {
                    if (tarifa > 0) {
                        preview.innerText = '$' + Math.round(horas * tarifa).toLocaleString('es-CL');
                    } else {
                        preview.innerText = '-- (configura tarifa en BD)';
                    }
                }
            });
        }
    });

    // History filters live update
    const historyTypeSelect = document.getElementById('select-history-type');
    const historySearchInput = document.getElementById('history-search');
    const historyYearSelect = document.getElementById('select-history-year');
    const historyMonthSelect = document.getElementById('select-history-month');
    const historyPeriodSelect = document.getElementById('select-history-period');
    const historyAlphabetSelect = document.getElementById('select-history-alphabet');
    const historyClearBtn = document.getElementById('btn-clear-history-filters');

    if (historyTypeSelect) historyTypeSelect.addEventListener('change', () => { if (STATE.activeTab === 'historial') renderHistorialTab(); });
    if (historySearchInput) historySearchInput.addEventListener('input', () => { if (STATE.activeTab === 'historial') renderHistorialTab(); });
    if (historyYearSelect) historyYearSelect.addEventListener('change', () => { if (STATE.activeTab === 'historial') renderHistorialTab(); });
    if (historyMonthSelect) historyMonthSelect.addEventListener('change', () => { if (STATE.activeTab === 'historial') renderHistorialTab(); });
    if (historyPeriodSelect) historyPeriodSelect.addEventListener('change', () => { if (STATE.activeTab === 'historial') renderHistorialTab(); });
    if (historyAlphabetSelect) historyAlphabetSelect.addEventListener('change', () => { if (STATE.activeTab === 'historial') renderHistorialTab(); });
    
    if (historyClearBtn) {
        historyClearBtn.addEventListener('click', () => {
            if (historyTypeSelect) historyTypeSelect.value = 'todos';
            if (historySearchInput) historySearchInput.value = '';
            if (historyYearSelect) historyYearSelect.value = 'todos';
            if (historyMonthSelect) historyMonthSelect.value = 'todos';
            if (historyPeriodSelect) historyPeriodSelect.value = 'todos';
            if (historyAlphabetSelect) historyAlphabetSelect.value = 'todos';
            
            if (STATE.activeTab === 'historial') renderHistorialTab();
        });
    }

    // Pre-fill Trabajo Actual form with current center
    const teCentroInput = document.getElementById('te-centro');
    const teEmpresaInput = document.getElementById('te-empresa');
    if (teCentroInput) teCentroInput.value = STATE.selectedCenter;
    if (teEmpresaInput) teEmpresaInput.placeholder = STATE.selectedClient;
    const teFechaInput = document.getElementById('te-fecha');
    if (teFechaInput) teFechaInput.value = new Date().toISOString().split('T')[0];

    // PWA Install Button handling
    let deferredPrompt;
    const installBtn = document.getElementById('pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) {
            installBtn.style.display = 'inline-flex';
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to PWA install: ${outcome}`);
                deferredPrompt = null;
                installBtn.style.display = 'none';
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    });

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }
}

// ===============================================================
// MÓDULO: Trabajo Actual (Trabajos Extraordinarios)
// ===============================================================

function renderTrabajoActualTab() {
    // Pre-fill form fields with active center
    const teCentroEl = document.getElementById('te-centro');
    const teFechaEl = document.getElementById('te-fecha');
    if (teCentroEl) teCentroEl.value = STATE.selectedCenter;
    if (teFechaEl && !teFechaEl.value) teFechaEl.value = new Date().toISOString().split('T')[0];

    const lista = document.getElementById('te-lista');
    if (!lista) return;
    lista.innerHTML = '';

    const trabajos = (RAW_DB.TrabajosExtraordinarios || []).filter(
        te => te.cliente === STATE.selectedClient && te.centro === STATE.selectedCenter
    ).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    if (trabajos.length === 0) {
        lista.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">
            <i class="fa-solid fa-hammer" style="font-size:28px; margin-bottom:12px; display:block;"></i>
            <p style="font-size:14px; font-weight:600;">No hay trabajos extraordinarios registrados</p>
            <p style="font-size:12px; margin-top:4px;">Usa el formulario para registrar pinturas, instalaciones u otros trabajos.</p>
        </div>`;
        return;
    }

    const estadoColor = { 'Completado': 'var(--status-operativo)', 'En Progreso': 'var(--status-advertencia)', 'Pendiente': 'var(--status-critico)' };

    trabajos.forEach(te => {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:16px; position:relative;';
        const color = estadoColor[te.estado] || 'var(--text-muted)';
        const tarifa = parseFloat(RAW_DB.TarifaHoraMTI) || 0;
        const costoHH = tarifa > 0 ? tarifa * (te.horas || 0) : null;
        const costoTotal = (te.costoMateriales || 0) + (costoHH || 0);

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div style="flex:1;">
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px; flex-wrap:wrap;">
                        <span style="font-size:10px; font-weight:700; background:rgba(245,158,11,0.1); color:var(--status-advertencia); border-radius:4px; padding:2px 7px;">EXTRAORDINARIO</span>
                        <span style="font-size:10px; font-weight:700; color:${color}; border-radius:4px; padding:2px 7px; background:rgba(255,255,255,0.04);">${te.estado || 'Sin Estado'}</span>
                    </div>
                    <div style="font-weight:700; font-size:14px; color:var(--text-primary); margin-bottom:4px;">${te.titulo || 'Sin título'}</div>
                    <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">
                        <i class="fa fa-building"></i> ${te.empresa || '—'} &nbsp;·&nbsp;
                        <i class="fa fa-map-marker-alt"></i> ${te.centro || '—'} &nbsp;·&nbsp;
                        <i class="fa fa-calendar"></i> ${te.fecha || '—'}
                    </div>
                    ${te.descripcion ? `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:6px;">${te.descripcion}</div>` : ''}
                    ${te.materiales ? `<div style="font-size:11px; color:var(--text-muted);"><i class="fa fa-box"></i> ${te.materiales}</div>` : ''}
                    <div style="display:flex; gap:12px; margin-top:10px; flex-wrap:wrap; font-size:12px;">
                        <span style="color:var(--accent-blue-glow);"><i class="fa fa-clock"></i> ${te.horas || 0} hrs — ${te.tecnico || '—'}</span>
                        <span style="color:var(--status-advertencia);"><i class="fa-solid fa-coins"></i> Materiales: $${Math.round(te.costoMateriales || 0).toLocaleString('es-CL')}</span>
                        ${costoHH !== null ? `<span style="color:var(--accent-teal-glow);"><i class="fa-solid fa-receipt"></i> Total estimado: $${Math.round(costoTotal).toLocaleString('es-CL')}</span>` : ''}
                    </div>
                </div>
                <button onclick="deleteTrabajoExtraordinario('${te.id}')" style="background:none; border:none; cursor:pointer; color:var(--status-critico); font-size:14px; padding:4px; opacity:0.7; flex-shrink:0;" title="Eliminar">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;
        lista.appendChild(card);
    });
}

function saveTrabajoExtraordinario() {
    const empresa = (document.getElementById('te-empresa').value || '').trim();
    const centro = document.getElementById('te-centro').value || STATE.selectedCenter;
    const titulo = (document.getElementById('te-titulo').value || '').trim();
    const descripcion = (document.getElementById('te-descripcion').value || '').trim();
    const materiales = (document.getElementById('te-materiales').value || '').trim();
    const horas = parseFloat(document.getElementById('te-horas').value) || 0;
    const costoMateriales = parseFloat(document.getElementById('te-costo-materiales').value) || 0;
    const tecnico = (document.getElementById('te-tecnico').value || '').trim();
    const fecha = document.getElementById('te-fecha').value;
    const estado = document.getElementById('te-estado').value;

    if (!titulo || !tecnico || !fecha) {
        showToast('Por favor completa los campos obligatorios (Título, Técnico, Fecha).', 'error');
        return;
    }

    const newTE = {
        id: 'TE-' + Date.now(),
        empresa: empresa,
        cliente: STATE.selectedClient,
        centro: centro,
        titulo: titulo,
        descripcion: descripcion,
        materiales: materiales,
        horas: horas,
        costoMateriales: costoMateriales,
        tecnico: tecnico,
        fecha: fecha,
        estado: estado
    };

    if (!RAW_DB.TrabajosExtraordinarios) RAW_DB.TrabajosExtraordinarios = [];
    RAW_DB.TrabajosExtraordinarios.push(newTE);

    localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
    saveToLocalServer(RAW_DB);

    // Enqueue Sheets sync transaction
    if (window.dbStore) {
        const extraLog = {
            Fecha: newTE.fecha,
            Descripcion: newTE.titulo,
            ID_Equipo: newTE.id,
            Nombre_Equipo: newTE.tecnico,
            Horas_Trabajadas: newTE.horas,
            Costo_Materiales: newTE.costoMateriales,
            Costo_Total: (newTE.costoMateriales || 0) + (parseFloat(RAW_DB.TarifaHoraMTI || 0) * (newTE.horas || 0)),
            Observaciones: newTE.descripcion,
            Cliente: STATE.selectedClient,
            Centro: newTE.centro
        };
        window.dbStore.addToSyncQueue("addWorkLog", { log: extraLog, isExtraordinary: true }).then(() => syncWithSheets());
    }

    showToast(`Trabajo "${titulo}" registrado con éxito.`, 'success');

    document.getElementById('form-trabajo-actual').reset();
    document.getElementById('te-centro').value = STATE.selectedCenter;
    document.getElementById('te-fecha').value = new Date().toISOString().split('T')[0];

    renderTrabajoActualTab();
}

function deleteTrabajoExtraordinario(id) {
    if (!confirm('¿Eliminar este trabajo extraordinario del registro?')) return;
    RAW_DB.TrabajosExtraordinarios = (RAW_DB.TrabajosExtraordinarios || []).filter(te => te.id !== id);
    localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
    saveToLocalServer(RAW_DB);
    showToast('Trabajo eliminado.', 'success');
    renderTrabajoActualTab();
}

function saveTarifaHH() {
    const val = parseFloat(document.getElementById('db-tarifa-hh').value) || 0;
    RAW_DB.TarifaHoraMTI = val;
    localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
    saveToLocalServer(RAW_DB);

    // Enqueue Sheets sync transaction
    if (window.dbStore) {
        window.dbStore.addToSyncQueue("updateConfig", { clave: "TarifaHoraMTI", valor: RAW_DB.TarifaHoraMTI }).then(() => syncWithSheets());
    }

    showToast(`Tarifa guardada: $${val.toLocaleString('es-CL')}/hr`, 'success');
    // Refresh dashboard KPIs if visible
    if (STATE.activeTab === 'dashboard') renderCostKPIs();
}

// Genera y gatilla la impresión de un reporte limpio en PDF/impresora del historial filtrado
function printUnifiedHistoryReport() {
    const allEntries = getFilteredHistoryEntries();

    // Populate metadata
    document.getElementById('report-client-name').innerText = STATE.selectedClient || 'Cermaq';
    document.getElementById('report-center-name').innerText = STATE.selectedCenter || 'Sta Juana';
    document.getElementById('report-emission-date').innerText = new Date().toLocaleString('es-CL');

    // Populate KPIs
    document.getElementById('report-total-jobs').innerText = allEntries.length;
    
    let totalHrs = 0;
    let totalCosto = 0;
    allEntries.forEach(e => {
        totalHrs += parseFloat(e.horas || 0);
        totalCosto += parseFloat(e.costoRepuestos || 0);
    });
    
    document.getElementById('report-total-hours').innerText = `${totalHrs} hrs`;
    document.getElementById('report-total-costs').innerText = '$' + Math.round(totalCosto).toLocaleString('es-CL');

    // Populate report table
    const tbody = document.getElementById('report-table-body');
    tbody.innerHTML = '';

    if (allEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay registros con los filtros activos.</td></tr>';
    } else {
        const typeLabels = {
            activo: 'OT Mantenimiento MTI',
            extraordinario: 'Trabajo Extraordinario',
            auditoria: 'Auditoría Pre-2026'
        };
        
        allEntries.forEach(e => {
            const tr = document.createElement('tr');
            
            // Format dates
            let formattedDate = e.fecha || '—';
            if (formattedDate.includes('-')) {
                const p = formattedDate.split('-');
                formattedDate = `${p[2]}/${p[1]}/${p[0]}`;
            }

            const eqCol = e.eqId ? `${e.eqId}<br><span style="font-size: 9px; color: #555;">${e.eqName} (${e.area})</span>` : `${e.eqName || 'Trabajo General'}`;
            
            let details = '';
            if (e.horas > 0) details += `${e.horas} hrs<br>`;
            if (e.costoRepuestos > 0) details += `$${Math.round(e.costoRepuestos).toLocaleString('es-CL')}<br>`;
            if (e.rodamientos && e.rodamientos.length > 0) details += `Rods: ${e.rodamientos.join(', ')}`;
            if (e.materiales) details += `Mat: ${e.materiales}`;

            tr.innerHTML = `
                <td><strong>${formattedDate}</strong></td>
                <td><span style="font-size: 9px; padding: 2px 4px; background: #eee; border-radius: 3px; font-weight: bold;">${typeLabels[e._type] || 'OT'}</span></td>
                <td>${eqCol}</td>
                <td>
                    <strong>${e.titulo}</strong>
                    ${e.desc ? `<br><span style="font-size: 9.5px; color: #444;">${e.desc}</span>` : ''}
                </td>
                <td>${e.tecnico}</td>
                <td style="font-size: 9.5px;">${details || '—'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Trigger printing
    const reportContainer = document.getElementById('print-history-report-container');
    reportContainer.style.display = 'block';
    
    setTimeout(() => {
        window.print();
        reportContainer.style.display = 'none';
    }, 500);
}

// Cambia de pestaña en la vista de terreno móvil QR
function switchTerrainTab(tabId) {
    document.querySelectorAll('.terrain-tab-content').forEach(el => {
        el.style.display = 'none';
    });
    
    const targetContent = document.getElementById(`t-tab-${tabId}-content`);
    if (targetContent) {
        targetContent.style.display = 'block';
    }
    
    document.querySelectorAll('.terrain-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetBtn = document.getElementById(`btn-t-${tabId}`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
}

// Biblia de Mantenimiento / Pautas MTI
const MTI_MANUAL_CHECKLISTS = {
    "bomba-grundfos-nb": {
        title: "Bomba Grundfos NB",
        icon: "fa-solid fa-water",
        checklist: [
            "Evaluación visual de funcionamiento",
            "Desconectar suministro eléctrico e instalación señal de seguridad",
            "Estado Sello mecánico",
            "Revisión Impulsor",
            "Estado pernos y prisioneros",
            "Estado ventilador y tapa",
            "Pintado y Raspado",
            "Lubricación",
            "Conexión eléctrica",
            "Sentido Giro",
            "Prueba Funcionamiento",
            "Revisión de alarmas asociadas"
        ]
    },
    "bomba-grundfos-cr": {
        title: "Bomba Grundfos CR",
        icon: "fa-solid fa-water-ladder",
        checklist: [
            "Evaluación Visual de funcionamiento",
            "Desconectar suministro eléctrico e instalación señal de seguridad",
            "Desmontaje mitades acoplamiento",
            "Estado Sello mecánico",
            "Estado Pernos y prisioneros",
            "Revisión Cámaras",
            "Revisión Impulsores",
            "Estado Espaciadores",
            "Lubricación",
            "Estado ventilador y tapa",
            "Pintura y Raspado",
            "Conexión eléctrica",
            "Sentido de Giro",
            "Prueba funcionamiento",
            "Revisión de alarmas asociadas"
        ]
    },
    "motoreductores": {
        title: "Motoreductores",
        icon: "fa-solid fa-gears",
        checklist: [
            "Evaluación Visual de funcionamiento",
            "Desconectar suministro eléctrico e instalación señal de seguridad",
            "Estado Pernos",
            "Estado y nivel de Aceite",
            "Estado Retenes",
            "Estado engranajes",
            "Pintura y raspado",
            "Conexión eléctrica",
            "Sentido Giro",
            "Prueba Funcionamiento",
            "Respetar tipo de rodamientos para evitar problemas posteriores"
        ]
    },
    "compresor-aire": {
        title: "Compresor de Aire",
        icon: "fa-solid fa-wind",
        checklist: [
            "Evaluación visual de funcionamiento",
            "Desconectar suministro eléctrico e instalación señal de seguridad",
            "Chequeo estado y nivel aceite",
            "Cambio Rodamientos",
            "Chequeo Correas",
            "Chequeo Unidad FRL",
            "Chequeo Manómetros",
            "Limpieza Filtro aire",
            "Chequeo funcionamiento Presostato",
            "Chequeo Despiche automático",
            "Estado Desconectador",
            "Chequeo Poleas",
            "Chequeo Cabezales",
            "Chequeo Protección",
            "Estado de pernos",
            "Conexión eléctrica",
            "Prueba Funcionamiento"
        ]
    },
    "tablero-control": {
        title: "Tablero de Control",
        icon: "fa-solid fa-table-columns",
        checklist: [
            "Desconectar suministro eléctrico",
            "Reapriete",
            "Sirena y Baliza",
            "Selectores",
            "Estado componentes",
            "Conexión eléctrica",
            "Medición de voltajes",
            "Evaluación cables y conductores",
            "Limpieza",
            "Medición temperatura",
            "Raspado y pintado",
            "Chequeo funcionamiento"
        ]
    },
    "motores-electricos": {
        title: "Motores Eléctricos",
        icon: "fa-solid fa-bolt",
        checklist: [
            "Evaluación de consumo",
            "Evaluación Visual de funcionamiento",
            "Evaluación Contactores, cables, guarda motor e interruptores",
            "Desconectar suministro eléctrico e instalar señal de seguridad",
            "Cambio rodamientos",
            "Chequeo vibración",
            "Estado Rotor y estator",
            "Estado fijación y pernos",
            "Chequeo bobinado y aislación",
            "Pintura y raspado",
            "Conexión eléctrica",
            "Sentido de giro",
            "Prueba funcionamiento"
        ]
    },
    "filtro-secador": {
        title: "Filtro Secador (Compresores)",
        icon: "fa-solid fa-filter",
        checklist: [
            "Estado funcionamiento",
            "Revisión presiones de trabajo (alta y baja)",
            "Revisión aceite",
            "Estado conexiones eléctricas"
        ]
    },
    "alimentadores-arvotec": {
        title: "Alimentadores Arvotec",
        icon: "fa-solid fa-fish",
        checklist: [
            "Evaluación visual de funcionamiento",
            "Desconectar Suministro eléctrico",
            "Separar dispersor de alimentador",
            "Reemplazo rodamientos y seguros",
            "Estado pernos y prisioneros",
            "Limpieza engranajes",
            "Lubricación",
            "Estado potenciómetro",
            "Conexión eléctrica"
        ]
    },
    "blower": {
        title: "Blower",
        icon: "fa-solid fa-fan",
        checklist: [
            "Evaluación de consumo",
            "Evaluación visual de funcionamiento",
            "Desconectar suministro eléctrico e instalar señal de seguridad",
            "Estado de pernos y fijación",
            "Evaluación estado de turbina",
            "Cambio Rodamientos",
            "Cambio retén",
            "Lubricación",
            "Pintura y raspado",
            "Conexión eléctrica",
            "Estado válvula seguridad",
            "Estado válvula chapaleta",
            "Cambio filtro de aire",
            "Sentido de giro",
            "Prueba funcionamiento"
        ]
    },
    "filtro-tambor-rotatorio": {
        title: "Filtro Tambor Rotatorio",
        icon: "fa-solid fa-circle-notch",
        checklist: [
            "Evaluación visual de funcionamiento",
            "Evaluación consumo",
            "Desconectar suministro eléctrico e instalar señal de seguridad",
            "Chequeo estado aspersores",
            "Chequeo estado paneles filtrante",
            "Chequeo estado ruedas",
            "Cambio de rodamientos",
            "Cambio retenes",
            "Chequeo aceite cadena",
            "Chequeo estado y tensión cadena",
            "Chequeo burlete perimetral",
            "Chequeo buje",
            "Chequeo piñón de arrastre",
            "Engrase",
            "Conexión eléctrica",
            "Sentido de giro",
            "Prueba funcionamiento"
        ]
    },
    "bomba-calor": {
        title: "Bomba de Calor",
        icon: "fa-solid fa-temperature-arrow-up",
        checklist: [
            "Evaluación visual de funcionamiento",
            "Chequeo presiones de trabajo",
            "Desconectar suministro eléctrico e instalar señal de seguridad",
            "Chequeo presostato",
            "Chequeo nivel aceite",
            "Chequeo diferencial de aceite",
            "Chequeo circuito de glicol",
            "Chequeo resistencia cárter",
            "Chequeo bomba de aceite",
            "Limpieza intercambiadores de calor",
            "Chequeo Limpieza filtros de línea",
            "Estado filtro briqueta",
            "Chequeo sensores de temperatura",
            "Chequeo sensores de presión",
            "Chequeo funcionamiento bombas",
            "Chequeo variador de frecuencia",
            "Chequeo manómetros",
            "Chequeo parámetros de funcionamiento",
            "Chequeo válvula y dispositivos de Expansión",
            "Chequeo válvula solenoide",
            "Chequeo aislación térmica",
            "Chequeo Flowswitch",
            "Reapriete tablero",
            "Chequeo válvula 4 vías",
            "Chequeo piping",
            "Conexión eléctrica",
            "Prueba de funcionamiento"
        ]
    },
    "chiller": {
        title: "Chiller",
        icon: "fa-solid fa-snowflake",
        checklist: [
            "Chequeo funcionamiento",
            "Chequeo parámetros de funcionamiento",
            "Chequeo resistencia cárter",
            "Chequeo presiones (alta, baja y glicol)",
            "Nivel aceite",
            "Desconectar suministro eléctrico e instalar señal de seguridad",
            "Reapriete componentes eléctricos",
            "Chequeo bomba de agua",
            "Chequeo cables e interruptores",
            "Conexión eléctrica",
            "Prueba de funcionamiento"
        ]
    },
    "decanter-alfa-laval": {
        title: "Decanter Alfa Laval",
        icon: "fa-solid fa-arrows-spin",
        checklist: [
            "Chequeo funcionamiento",
            "Chequeo parámetros tablero eléctrico",
            "Desconectar suministro eléctrico e instalar señal de seguridad",
            "Reapriete componentes eléctricos",
            "Estado y tensión correas",
            "Nivel aceite caja reductora",
            "Chequeo y revisión sensores (sinfín y tambor)",
            "Estado borneras, rodamientos y conexiones de motores",
            "Chequeo y/o cambio de rodamientos",
            "Estado sinfín y tambor",
            "Estado O-rings",
            "Estado graseras",
            "Conexión eléctrica",
            "Prueba funcionamiento"
        ]
    },
    "filtro-banda": {
        title: "Filtro de Banda",
        icon: "fa-solid fa-scroll",
        checklist: [
            "Estado funcionamiento",
            "Desconectar suministro eléctrico e instalar señal de seguridad",
            "Estado desconectadores",
            "Estado electroválvulas (Agua)",
            "Estado motor (conexiones eléctricas)",
            "Estado sensores (Hopper)",
            "Estado línea retrolavado y aspersores",
            "Conexión eléctrica",
            "Prueba de funcionamiento"
        ]
    },
    "generadores-ozono": {
        title: "Generadores de Ozono",
        icon: "fa-solid fa-cloud-sun",
        checklist: [
            "Inspección visual de funcionamiento",
            "Revisión de Oxigeno en la entrada del reactor este no debe exceder a 1,5 bar",
            "Revisión de presiones en ventury deben ser mayores a 1,5 bar de diferencia entre entrada y salida",
            "Revisión de presiones en reactor estas deben estar entre 3 y 9 psi en funcionamiento y nunca exceder de los 12 psi",
            "Revisión de flujo en rotámetro este flujo es proporcional a la succión del ventury y la presión del reactor",
            "Revisión y reparación de fugas de ozono."
        ]
    },
    "filtros-uv-atlantium": {
        title: "Filtros UV Atlantium",
        icon: "fa-solid fa-circle-radiation",
        checklist: [
            "Inspección visual de funcionamiento",
            "Revisión de válvulas instaladas antes y después del Reactor UV",
            "Revisión de bomba operando",
            "Inspección de flujo",
            "Inspección de tramitancia en pantalla del UV",
            "Inspección de dosis esta debe ser igual o mayor al setpoint",
            "Revisión del estado de las lámparas y cantidad de estas",
            "Prueba de funcionamiento."
        ]
    },
    "bomba-sand-piper": {
        title: "Bomba Sand Piper",
        icon: "fa-solid fa-water-ladder",
        checklist: [
            "Estado funcionamiento",
            "Desconectar suministro de aire",
            "Estado asientos y bolas",
            "Estado Kit de aire",
            "Estado silenciador",
            "Estado barras de accionamiento",
            "Estado diafragma",
            "Estado estructura general",
            "Estado electroválvula",
            "Estado unidad FRL",
            "Conexión suministro de aire",
            "Prueba de funcionamiento"
        ]
    },
    "ventilador-vent-axia": {
        title: "Ventilador Vent-axia / Vortice",
        icon: "fa-solid fa-fan",
        checklist: [
            "Estado funcionamiento",
            "Desconexión suministro eléctrico",
            "Estado conectores eléctricos (bornera, desconectador)",
            "Desarme equipo",
            "Estado condensador",
            "Cambio rodamientos",
            "Limpieza general",
            "Raspado y pintado",
            "Conexión eléctrica",
            "Prueba de funcionamiento"
        ]
    },
    "bomba-pin-pin": {
        title: "Bomba Pin-Pin",
        icon: "fa-solid fa-water",
        checklist: [
            "Estado funcionamiento",
            "Desconexion eléctrica",
            "Chequeo bomba",
            "Cambio de rodamientos",
            "Cambio de correas",
            "Raspado y pintado estructura",
            "Prueba de funcionamiento"
        ]
    },
    "lamparas-led": {
        title: "Lámparas Led",
        icon: "fa-regular fa-lightbulb",
        checklist: [
            "Estado funcionamiento",
            "Desconectar suministro eléctrico e instalar tarjeta de seguridad",
            "Chequeo estado fuente de poder",
            "Estado vidrio y sellos",
            "Estado cables",
            "Prueba de funcionamiento"
        ]
    },
    "caldera": {
        title: "Caldera",
        icon: "fa-solid fa-fire",
        checklist: [
            "Estado funcionamiento",
            "Revisión presiones de trabajo",
            "Limpieza hogar",
            "Chequeo quemadores",
            "Estado termocupla",
            "Estado sensor PT-100",
            "Estado conexiones eléctricas",
            "Cambio rodamientos bomba de agua",
            "Pintado y raspado Bomba",
            "Mellado motor Bomba",
            "Reapriete tablero eléctrico"
        ]
    },
    "seleccionadora-apollo": {
        title: "Seleccionadora Apollo",
        icon: "fa-solid fa-fish-fins",
        checklist: [
            "Estado funcionamiento.",
            "Estado estructura en general",
            "Revision de rodillos",
            "Estado de cadena de transmisión y lubricación",
            "Estado sproket de arrastre",
            "Revisión motoreductor (intervenir si se requiere)",
            "Ajuste rodillos",
            "Reapriete tablero eléctrico",
            "Revisión componentes tablero"
        ]
    },
    "bomba-pompe": {
        title: "Bomba Pompe",
        icon: "fa-solid fa-water",
        checklist: [
            "Estado funcionamiento",
            "Revisión estado impeler",
            "Chequeo sello mecánico",
            "Cambio retenes",
            "Cambio de rodamientos motor principal.",
            "Intervención bomba de cebado",
            "Estado estructura en general",
            "Revisión estado compresor",
            "Revisión estado presostato compresor",
            "Revisión estado descanso compresor",
            "Chequeo nivel de aceite en compresor",
            "Reapriete componentes eléctricos tablero",
            "Prueba funcionamiento."
        ]
    },
    "conos-oxigeno": {
        title: "Conos de oxígeno",
        icon: "fa-solid fa-bottle-water",
        checklist: [
            "Chequeo funcionamiento",
            "Chequeo manómetros",
            "Revisión conectores rápidos",
            "Chequeo pasada de estanque",
            "Revisión mangueras",
            "Revisión válvula despiche",
            "Revisión válvula check"
        ]
    }
};

function getMaintenanceChecklist(eqName) {
    if (!eqName) return MTI_MANUAL_CHECKLISTS["motores-electricos"];
    const nameLower = eqName.toLowerCase().trim();

    if (nameLower.includes("nb") && nameLower.includes("grundfos")) return MTI_MANUAL_CHECKLISTS["bomba-grundfos-nb"];
    if (nameLower.includes("cr") && nameLower.includes("grundfos")) return MTI_MANUAL_CHECKLISTS["bomba-grundfos-cr"];
    if (nameLower.includes("grundfos") || nameLower.includes("bba grundfos")) {
        if (nameLower.includes("cr")) return MTI_MANUAL_CHECKLISTS["bomba-grundfos-cr"];
        return MTI_MANUAL_CHECKLISTS["bomba-grundfos-nb"];
    }
    if (nameLower.includes("motorreductor") || nameLower.includes("motorreductores") || nameLower.includes("motoreductor")) return MTI_MANUAL_CHECKLISTS["motoreductores"];
    if (nameLower.includes("compresor")) return MTI_MANUAL_CHECKLISTS["compresor-aire"];
    if (nameLower.includes("tablero")) return MTI_MANUAL_CHECKLISTS["tablero-control"];
    if (nameLower.includes("filtro secador") || nameLower.includes("secador")) return MTI_MANUAL_CHECKLISTS["filtro-secador"];
    if (nameLower.includes("arvotec")) return MTI_MANUAL_CHECKLISTS["alimentadores-arvotec"];
    if (nameLower.includes("alimentador")) return MTI_MANUAL_CHECKLISTS["alimentadores-arvotec"];
    if (nameLower.includes("blower") || nameLower.includes("soplador")) return MTI_MANUAL_CHECKLISTS["blower"];
    if (nameLower.includes("tambor") || nameLower.includes("ftr") || nameLower.includes("rotatorio") || nameLower.includes("rotativo")) return MTI_MANUAL_CHECKLISTS["filtro-tambor-rotatorio"];
    if (nameLower.includes("bomba de calor") || nameLower.includes("bomba calor") || nameLower.includes("calor")) return MTI_MANUAL_CHECKLISTS["bomba-calor"];
    if (nameLower.includes("chiller")) return MTI_MANUAL_CHECKLISTS["chiller"];
    if (nameLower.includes("decanter") || nameLower.includes("alfa laval")) return MTI_MANUAL_CHECKLISTS["decanter-alfa-laval"];
    if (nameLower.includes("banda")) return MTI_MANUAL_CHECKLISTS["filtro-banda"];
    if (nameLower.includes("ozono")) return MTI_MANUAL_CHECKLISTS["generadores-ozono"];
    if (nameLower.includes("uv") || nameLower.includes("atlantium")) return MTI_MANUAL_CHECKLISTS["filtros-uv-atlantium"];
    if (nameLower.includes("sand piper") || nameLower.includes("sandpiper")) return MTI_MANUAL_CHECKLISTS["bomba-sand-piper"];
    if (nameLower.includes("ventilador") || nameLower.includes("vent-axia") || nameLower.includes("vortice")) return MTI_MANUAL_CHECKLISTS["ventilador-vent-axia"];
    if (nameLower.includes("pin pin") || nameLower.includes("pin-pin")) return MTI_MANUAL_CHECKLISTS["bomba-pin-pin"];
    if (nameLower.includes("led") || nameLower.includes("lampara led") || nameLower.includes("lámparas led") || nameLower.includes("iluminacion") || nameLower.includes("iluminación")) return MTI_MANUAL_CHECKLISTS["lamparas-led"];
    if (nameLower.includes("caldera")) return MTI_MANUAL_CHECKLISTS["caldera"];
    if (nameLower.includes("apollo") || nameLower.includes("seleccionadora")) return MTI_MANUAL_CHECKLISTS["seleccionadora-apollo"];
    if (nameLower.includes("pompe") || nameLower.includes("bomba pompe")) return MTI_MANUAL_CHECKLISTS["bomba-pompe"];
    if (nameLower.includes("cono") || nameLower.includes("oxigeno") || nameLower.includes("oxígeno")) return MTI_MANUAL_CHECKLISTS["conos-oxigeno"];

    return MTI_MANUAL_CHECKLISTS["motores-electricos"];
}

function renderInfoGeneralTab() {
    const listEl = document.getElementById('info-manuals-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const keys = Object.keys(MTI_MANUAL_CHECKLISTS);
    keys.forEach(key => {
        const item = MTI_MANUAL_CHECKLISTS[key];
        const li = document.createElement('li');
        li.className = 'manual-index-item';
        li.setAttribute('data-manual', key);
        li.innerHTML = `<i class="${item.icon || 'fa-solid fa-circle-info'}"></i> <span>${item.title}</span>`;
        li.onclick = () => {
            document.querySelectorAll('#info-manuals-list .manual-index-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            showManualDetails(key);
        };
        listEl.appendChild(li);
    });

    const liColors = document.createElement('li');
    liColors.className = 'manual-index-item';
    liColors.setAttribute('data-manual', 'electric-color-code');
    liColors.innerHTML = `<i class="fa-solid fa-palette"></i> <span>Código de Colores Eléctricos</span>`;
    liColors.onclick = () => {
        document.querySelectorAll('#info-manuals-list .manual-index-item').forEach(el => el.classList.remove('active'));
        liColors.classList.add('active');
        showManualDetails('electric-color-code');
    };
    listEl.appendChild(liColors);

    const firstItem = listEl.querySelector('.manual-index-item');
    if (firstItem) {
        firstItem.click();
    }
}

function showManualDetails(manualKey) {
    const detailEl = document.getElementById('info-manual-detail');
    if (!detailEl) return;
    detailEl.innerHTML = '';

    if (manualKey === 'electric-color-code') {
        detailEl.innerHTML = `
            <div class="manual-detail-header">
                <h3 class="manual-detail-title">
                    <i class="fa-solid fa-palette" style="color: var(--accent-blue-glow);"></i>
                    Código de Colores en Cordones Eléctricos
                </h3>
                <p class="manual-detail-subtitle">Guía de referencia visual de colores para identificación de fases y conductores.</p>
            </div>
            
            <div class="color-guide-layout">
                <div class="color-guide-card">
                    <h4 class="color-guide-title">
                        <i class="fa-solid fa-circle-dot" style="color: var(--accent-blue-glow);"></i>
                        Cordón 1
                    </h4>
                    <div class="color-row">
                        <div class="color-circle azul"></div>
                        <span class="color-name">Azul</span>
                    </div>
                    <div class="color-row">
                        <div class="color-circle negro"></div>
                        <span class="color-name">Negro</span>
                    </div>
                    <div class="color-row">
                        <div class="color-circle rojo"></div>
                        <span class="color-name">Rojo</span>
                    </div>
                    <div class="color-row">
                        <div class="color-circle blanco"></div>
                        <span class="color-name">Blanco</span>
                    </div>
                    <div class="color-row">
                        <div class="color-circle verde"></div>
                        <span class="color-name">Verde</span>
                    </div>
                </div>

                <div class="color-guide-card">
                    <h4 class="color-guide-title">
                        <i class="fa-solid fa-circle-dot" style="color: var(--accent-teal-glow);"></i>
                        Cordón 2
                    </h4>
                    <div class="color-row">
                        <div class="color-circle gris"></div>
                        <span class="color-name">Gris</span>
                    </div>
                    <div class="color-row">
                        <div class="color-circle negro"></div>
                        <span class="color-name">Negro</span>
                    </div>
                    <div class="color-row">
                        <div class="color-circle cafe"></div>
                        <span class="color-name">Café</span>
                    </div>
                    <div class="color-row">
                        <div class="color-circle verde"></div>
                        <span class="color-name">Verde</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        const manual = MTI_MANUAL_CHECKLISTS[manualKey];
        if (!manual) return;

        const header = document.createElement('div');
        header.className = 'manual-detail-header';
        header.innerHTML = `
            <h3 class="manual-detail-title">
                <i class="${manual.icon || 'fa-solid fa-circle-info'}"></i>
                ${manual.title}
            </h3>
            <p class="manual-detail-subtitle">Pauta Oficial de Inspección y Mantenimiento Preventivo de Terreno MTI.</p>
        `;
        detailEl.appendChild(header);

        const list = document.createElement('ul');
        list.className = 'manual-checklist';
        manual.checklist.forEach(item => {
            const li = document.createElement('li');
            li.className = 'manual-checklist-item';
            li.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${item}</span>`;
            list.appendChild(li);
        });
        detailEl.appendChild(list);
    }
}

// Expose functions globally to HTML window
window.exportDatabaseJSON = exportDatabaseJSON;
window.importDatabaseJSON = importDatabaseJSON;
window.openAddEquipmentModal = openAddEquipmentModal;
window.handleTerrainFormSubmit = handleTerrainFormSubmit;
window.switchModalTab = switchModalTab;
window.submitWorkOrder = submitWorkOrder;
window.addUrlPhoto = addUrlPhoto;
window.removeModalImage = removeModalImage;
window.renderModalImages = renderModalImages;
window.exportEquipmentExcel = exportEquipmentExcel;
window.saveCustomRepuesto = saveCustomRepuesto;
window.deleteCustomRepuesto = deleteCustomRepuesto;
window.saveTrabajoExtraordinario = saveTrabajoExtraordinario;
window.deleteTrabajoExtraordinario = deleteTrabajoExtraordinario;
window.saveTarifaHH = saveTarifaHH;
window.renderHistorialTab = renderHistorialTab;
window.printUnifiedHistoryReport = printUnifiedHistoryReport;
window.switchTerrainTab = switchTerrainTab;
window.renderInfoGeneralTab = renderInfoGeneralTab;
window.showManualDetails = showManualDetails;
window.getMaintenanceChecklist = getMaintenanceChecklist;

// ===============================================================
// GOOGLE SHEETS & APPS SCRIPT OFFLINE-FIRST SYNCHRONIZATION
// ===============================================================

// Casing Normalization: Sheets PascalCase Columns -> Local camelCase Properties
function sheetToLocalEq(eq) {
    if (!eq) return null;
    let rodamientos = eq.Rodamientos || eq.rodamientos || [];
    if (typeof rodamientos === 'string') {
        rodamientos = rodamientos.split(',').map(r => r.trim()).filter(Boolean);
    }
    let imagenes = eq.imagenes || [];
    if (eq.Imagen || eq.imagen) {
        const primary = eq.Imagen || eq.imagen;
        if (!imagenes.includes(primary)) {
            imagenes = [primary, ...imagenes];
        }
    }
    return {
        id: eq.ID || eq.id || "",
        nombre: eq.Nombre || eq.nombre || "",
        area: eq.Area || eq.area || "",
        designacion: eq.Designacion || eq.designacion || "",
        cantidad: parseInt(eq.Cantidad !== undefined ? eq.Cantidad : eq.cantidad) || 1,
        horasFuncionamiento: parseInt(eq.HorasFuncionamiento !== undefined ? eq.HorasFuncionamiento : (eq.horasFuncionamiento || eq.horasFuncionamientoDiarias)) || 8,
        criticidad: eq.Criticidad || eq.criticidad || "Baja",
        estado: eq.Estado || eq.estado || "Operativo",
        imagen: eq.Imagen || eq.imagen || "",
        imagenes: imagenes,
        cliente: eq.cliente || eq.Cliente || "Cermaq",
        centro: eq.centro || eq.Centro || "Sta Juana",
        marca: eq.Marca || eq.marca || "",
        modelo: eq.Modelo || eq.modelo || "",
        serie: eq.Serie || eq.serie || "",
        potencia: eq.Potencia || eq.potencia || "",
        voltaje: eq.Voltaje || eq.voltaje || "",
        amperaje: eq.Amperaje || eq.amperaje || "",
        conexion: eq.Conexion || eq.conexion || "",
        cos_fi: eq.Cos_fi || eq.cos_fi || "",
        cable_awg: eq.Cable_awg || eq.cable_awg || "",
        rpm: eq.RPM || eq.rpm || "",
        rodamientos: rodamientos,
        repuestos: eq.Repuestos || eq.repuestos || "",
        ultima_mantencion: eq.Ultima_Mantencion || eq.ultima_mantencion || "",
        proxima_mantencion: eq.Proxima_Mantencion || eq.proxima_mantencion || "",
        frecuencia_meses: parseInt(eq.Frecuencia_Meses !== undefined ? eq.Frecuencia_Meses : eq.frecuencia_meses) || 6,
        antecedentes: eq.antecedentes || [],
        historico: eq.historico || []
    };
}

// Casing Normalization: Local camelCase Properties -> Sheets PascalCase Columns
function localToSheetEq(eq) {
    if (!eq) return null;
    return {
        ID: eq.id || "",
        Nombre: eq.nombre || "",
        Area: eq.area || "",
        Designacion: eq.designacion || "",
        Cantidad: eq.cantidad || 1,
        HorasFuncionamiento: eq.horasFuncionamiento || 8,
        Criticidad: eq.criticidad || "Baja",
        Estado: eq.estado || "Operativo",
        Imagen: eq.imagen || "",
        Marca: eq.marca || "",
        Modelo: eq.modelo || "",
        Serie: eq.serie || "",
        Potencia: eq.potencia || "",
        Voltaje: eq.voltaje || "",
        Amperaje: eq.amperaje || "",
        Conexion: eq.conexion || "",
        Cos_fi: eq.cos_fi || "",
        Cable_awg: eq.cable_awg || "",
        RPM: eq.rpm || "",
        Rodamientos: Array.isArray(eq.rodamientos) ? eq.rodamientos.join(", ") : (eq.rodamientos || ""),
        Repuestos: eq.repuestos || "",
        Ultima_Mantencion: eq.ultima_mantencion || "",
        Proxima_Mantencion: eq.proxima_mantencion || "",
        Frecuencia_Meses: eq.frecuencia_meses || 6
    };
}

function sheetToLocalMaintLog(log) {
    return {
        fecha: log.Fecha || log.fecha || "",
        id: log.ID_Equipo || log.eqId || log.id || "",
        eqId: log.ID_Equipo || log.eqId || log.id || "",
        tipo: log.Tipo_Mantencion || log.tipo || "Preventivo",
        tipoFalla: log.Tipo_Falla || log.tipoFalla || "",
        trabajo: log.Descripcion || log.trabajo || log.tarea || "",
        comentarios: log.Estado_Final ? "Estado final: " + log.Estado_Final : (log.comentarios || ""),
        tiempoReparacion: parseFloat(log.Tiempo_Reparacion || log.tiempoReparacion) || 1.0,
        costoRepuestos: parseFloat(log.Costo_Repuestos || log.costoRepuestos) || 0,
        tecnico: log.Tecnico || log.tecnico || "Técnico MTI",
        puestaMarcha: log.Estado_Final || log.puestaMarcha || "Operativo"
    };
}

function sheetToLocalWorkLog(log) {
    return {
        fecha: log.Fecha || log.fecha || "",
        id: log.ID_Equipo || log.eqId || log.id || "",
        eqId: log.ID_Equipo || log.eqId || log.id || "",
        tipo: log.Tipo_Trabajo || log.tipo || "Mecánico",
        trabajo: log.Observaciones || log.trabajo || "",
        comentarios: log.Observaciones || log.comentarios || "",
        repuestosUtilizados: log.Repuestos_Utilizados || log.repuestosUtilizados || "",
        materialesUtilizados: log.Materiales_Utilizados || log.materialesUtilizados || "",
        tiempoReparacion: parseFloat(log.Horas_Trabajadas || log.tiempoReparacion) || 1.0,
        costoRepuestos: parseFloat(log.Costo_Repuestos || log.costoRepuestos) || 0,
        tecnico: log.Tecnico || log.tecnico || "Técnico MTI"
    };
}

function sheetToLocalExtraWorkLog(log) {
    return {
        id: log.ID_Equipo || log.id || "",
        empresa: log.Nombre_Equipo || log.empresa || "",
        cliente: log.Cliente || "Cermaq",
        centro: log.Centro || "Sta Juana",
        titulo: log.Descripcion || log.titulo || "",
        descripcion: log.Observaciones || log.descripcion || "",
        materiales: log.Materiales_Utilizados || log.materiales || "",
        horas: parseFloat(log.Horas_Trabajadas || log.horas) || 0,
        costoMateriales: parseFloat(log.Costo_Materiales || log.costoMateriales) || 0,
        tecnico: log.Nombre_Equipo || log.tecnico || "",
        fecha: log.Fecha || log.fecha || "",
        estado: log.Estado || log.estado || "Completado"
    };
}

function sheetToLocalAntecedente(log) {
    let rodamientos = log.Rodamientos || log.rodamientos || [];
    if (typeof rodamientos === 'string') {
        rodamientos = rodamientos.split(',').map(r => r.trim()).filter(Boolean);
    }
    return {
        fecha: log.Fecha || log.fecha || "",
        tarea: log.Tarea || log.tarea || log.trabajo || "",
        rodamientos: rodamientos,
        eqId: log.ID_Equipo || log.eqId || log.id || "",
        eqName: log.Nombre_Equipo || log.eqName || "",
        area: log.Area || log.area || "",
        fuente: log.Fuente || log.fuente || "Bitácora de Referencia Anterior",
        tecnico: log.Tecnico || log.tecnico || "Pre-MTI"
    };
}

// Sync Loading Badge triggers
function showSyncBadge(text) {
    const badge = document.getElementById("sync-badge");
    const badgeText = document.getElementById("sync-badge-text");
    if (badge && badgeText) {
        badgeText.innerText = text;
        badge.classList.remove("hide");
        badge.style.display = "inline-flex";
    }
}

function hideSyncBadge() {
    const badge = document.getElementById("sync-badge");
    if (badge) {
        badge.classList.add("hide");
        badge.style.display = "none";
    }
}

// Upload Photo Blob
async function uploadPhotoToR2(blob, fileName, token) {
    try {
        const formData = new FormData();
        formData.append("file", blob, fileName);

        const response = await fetch("./api/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload status error: ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error("Fallo al subir imagen:", err);
        return null;
    }
}

// Monitor Online/Offline window events
function setupConnectionMonitoring() {
    STATE.isOffline = !navigator.onLine;

    window.addEventListener("online", () => {
        STATE.isOffline = false;
        showToast("Conexión restablecida. Sincronizando...", "success");
        syncWithSheets();
    });

    window.addEventListener("offline", () => {
        STATE.isOffline = true;
        showToast("Se perdió la conexión. Modo sin conexión activo.", "warning");
    });
}

// Sync with Google Sheets
async function syncWithSheets() {
    const isDemoMode = window.API_URL.includes("YOUR_APPS_SCRIPT_URL_HERE");
    if (isDemoMode) {
        console.log("Corriendo en MODO DEMO / SIMULACIÓN local.");
        return;
    }

    if (STATE.isOffline) {
        console.log("Trabajando sin conexión. Sincronización en servidor pospuesta.");
        return;
    }

    // 1. Process Offline Queue first
    await processOfflineQueue();

    // 2. Fetch fresh database
    const token = localStorage.getItem("mti_session_token");
    if (!token) return;

    showSyncBadge("Sincronizando base de datos...");
    
    try {
        const response = await fetch(window.API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "getDatabase", token: token })
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const result = await response.json();
        if (result.success && result.database) {
            const sheetsEmpty = !result.database.Equipos || result.database.Equipos.length === 0;
            const localHasData = window.DB_PISCICULTURA && window.DB_PISCICULTURA.Equipos && window.DB_PISCICULTURA.Equipos.length > 0;
            
            if (sheetsEmpty && localHasData) {
                if (confirm("La base de datos de Google Sheets está vacía en Drive.\n\n¿Desea cargar/importar los equipos semilla locales del historial de planta a sus hojas de cálculo de Google Drive?")) {
                    showSyncBadge("Importando base de datos semilla...");
                    try {
                        const importedDb = {
                            Equipos: RAW_DB.Equipos.map(localToSheetEq),
                            HistorialGlobal: RAW_DB.HistorialGlobal.map(ot => ({
                                Fecha: ot.fecha || "",
                                ID_Equipo: ot.eqId || ot.id || "",
                                Nombre_Equipo: ot.eqName || "",
                                Area: ot.area || "",
                                Tipo_Mantencion: ot.tipo || "Preventivo",
                                Descripcion: ot.trabajo || "",
                                Tecnico: ot.tecnico || "",
                                Estado_Final: ot.puestaMarcha || "Operativo",
                                Proxima_Fecha: ot.proxima_fecha || "",
                                Cliente: ot.cliente || "Cermaq",
                                Centro: ot.centro || "Sta Juana"
                            })),
                            AntecedentesGlobal: RAW_DB.AntecedentesGlobal.map(ant => ({
                                Fecha: ant.fecha || "",
                                Tarea: ant.tarea || "",
                                Rodamientos: Array.isArray(ant.rodamientos) ? ant.rodamientos.join(", ") : (ant.rodamientos || ""),
                                ID_Equipo: ant.eqId || "",
                                Nombre_Equipo: ant.eqName || "",
                                Area: ant.area || "",
                                Fuente: ant.fuente || "",
                                Tecnico: ant.tecnico || ""
                            })),
                            TrabajosMantenimiento: RAW_DB.TrabajosMantenimiento || [],
                            TrabajosExtraordinarios: RAW_DB.TrabajosExtraordinarios || [],
                            Clientes: RAW_DB.Clientes || ["Cermaq"],
                            Centros: RAW_DB.Centros || { "Cermaq": ["Sta Juana", "Rahue", "Trafun"] },
                            TarifaHoraMTI: RAW_DB.TarifaHoraMTI || 0,
                            TareasCompletadas: RAW_DB.TareasCompletadas || []
                        };

                        const importRes = await fetch(window.API_URL, {
                            method: "POST",
                            headers: { "Content-Type": "text/plain" },
                            body: JSON.stringify({ action: "importFullDatabase", token: token, database: importedDb })
                        });
                        const importResult = await importRes.json();
                        if (importResult.success) {
                            alert("¡Importación completada! Los equipos y su historial se han subido a sus hojas de Google Sheets.");
                            await syncWithSheets();
                            return;
                        } else {
                            alert("Error durante la importación: " + importResult.error);
                        }
                    } catch (importErr) {
                        console.error(importErr);
                        alert("Error de comunicación durante la importación.");
                    } finally {
                        hideSyncBadge();
                    }
                }
            }

            // Merge Sheets database with local RAW_DB
            const sheetEquips = result.database.Equipos || [];
            const localEquips = sheetEquips.map(sheetToLocalEq);
            
            const sheetMaintLogs = result.database.HistorialGlobal || [];
            const localMaintLogs = sheetMaintLogs.map(sheetToLocalMaintLog);

            const sheetAntecedentes = result.database.AntecedentesGlobal || [];
            const localAntecedentes = sheetAntecedentes.map(sheetToLocalAntecedente);

            const sheetWorkLogs = result.database.TrabajosMantenimiento || [];
            const localWorkLogs = sheetWorkLogs.map(sheetToLocalWorkLog);

            const sheetExtraLogs = result.database.TrabajosExtraordinarios || [];
            const localExtraLogs = sheetExtraLogs.map(sheetToLocalExtraWorkLog);

            localEquips.forEach(eq => {
                eq.historico = localMaintLogs.filter(h => h.eqId === eq.id);
                eq.antecedentes = localAntecedentes.filter(h => h.eqId === eq.id);
            });

            RAW_DB = {
                Equipos: localEquips,
                HistorialGlobal: localMaintLogs,
                AntecedentesGlobal: localAntecedentes,
                TrabajosMantenimiento: localWorkLogs,
                TrabajosExtraordinarios: localExtraLogs,
                Clientes: result.database.Clientes || ["Cermaq"],
                Centros: result.database.Centros || { "Cermaq": ["Sta Juana", "Rahue", "Trafun"] },
                TarifaHoraMTI: parseFloat(result.database.TarifaHoraMTI) || 0,
                TareasCompletadas: result.database.TareasCompletadas || [],
                OtrosRepuestos: (result.database.OtrosRepuestos || []).map(item => ({
                    id: item.id,
                    nombre: item.nombre,
                    eqId: item.equipoId || item.eqId || "",
                    cantidad: item.cantidad || 1,
                    estado: item.estado || "En Stock",
                    cliente: item.cliente || "Cermaq",
                    centro: item.centro || "Sta Juana"
                }))
            };

            // Save to browser cache
            localStorage.setItem('PISCICULTURA_CONSOLIDATED_RAW', JSON.stringify(RAW_DB));
            if (window.dbStore) {
                await window.dbStore.saveCachedDatabase(RAW_DB);
            }

            console.log("Base de datos sincronizada con Google Sheets.");
            
            // Re-initialize state and refresh UI
            STATE.allEquipment = RAW_DB.Equipos;
            
            updateTenantFiltering();
            renderKPIs();
            renderTabContent();
            
            showToast("Base de datos sincronizada con Sheets", "success");
        } else {
            console.warn("Fallo en getDatabase:", result.error);
        }
    } catch (err) {
        console.error("Error al sincronizar con el servidor:", err);
    } finally {
        hideSyncBadge();
    }
}

// Process Offline Transactions Queue
async function processOfflineQueue() {
    if (!window.dbStore) return;

    const queue = await window.dbStore.getSyncQueue();
    if (queue.length === 0) return;

    console.log(`Procesando ${queue.length} transacciones en cola offline...`);
    showSyncBadge(`Sincronizando ${queue.length} cambios...`);

    const token = localStorage.getItem("mti_session_token");
    if (!token) {
        hideSyncBadge();
        return;
    }

    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
            let payload = item.payload;
            
            // Add auth token and action to payload
            const body = {
                ...payload,
                token: token,
                action: item.action
            };

            // Send transaction to Google Apps Script
            const response = await fetch(window.API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(body)
            });

            const result = await response.json();
            if (result.success) {
                await window.dbStore.deleteFromSyncQueue(item.id);
            } else {
                console.error("Error al sincronizar transacción:", result.error);
                break;
            }
        } catch (err) {
            console.error("Error de conexión durante sincronización de cola:", err);
            break;
        }
    }

    hideSyncBadge();
}

// ===================================================================
// MÓDULO DE PROYECTOS VIVOS (MESA DE TRABAJO & BITÁCORA EN TIEMPO REAL)
// ===================================================================

STATE.activeFilterState = 'ABIERTO';
STATE.activeProjectId = null;

function getProjectsData() {
    if (!RAW_DB) RAW_DB = {};
    if (!RAW_DB.Proyectos) {
        RAW_DB.Proyectos = [
            {
                id: "PRY-2026-001",
                titulo: "Overhaul y Mantención Mayor Bomba Smolt 1",
                cliente: "Cermaq",
                centro: "Sta Juana",
                equipoId: "SMO_001",
                equipoNombre: "Bomba de presion 1",
                tecnicoLider: "Juan Pérez (MTI)",
                estado: "ABIERTO",
                fechaInicio: "2026-07-20",
                diagnostico: "Desgaste de rodamientos 6308 y filtración por sello mecánico.",
                bitacora: [
                    {
                        id: "EVT-101",
                        fechaHora: "2026-07-20T09:30:00",
                        tipo: "Desarme",
                        tecnico: "Juan Pérez",
                        descripcion: "Desmonte completo de tapa frontal y retiro de impulsor.",
                        fotoUrl: ""
                    },
                    {
                        id: "EVT-102",
                        fechaHora: "2026-07-20T14:15:00",
                        tipo: "Repuesto",
                        tecnico: "Carlos Silva",
                        descripcion: "Retiro del stock e instalación de 2 rodamientos 6308-2RS y sello HQQE 12mm.",
                        fotoUrl: ""
                    }
                ],
                repuestos: [
                    { nombre: "Rodamiento SKF 6308-2RS", cantidad: 2 },
                    { nombre: "Sello Mecánico HQQE 12mm", cantidad: 1 }
                ]
            }
        ];
    }
    return RAW_DB.Proyectos;
}

function renderProyectosTab() {
    const gridContainer = document.getElementById("grid-proyectos-vivos");
    const cantActivosEl = document.getElementById("cant-proyectos-activos");
    const cantCerradosEl = document.getElementById("cant-proyectos-cerrados");
    
    if (!gridContainer) return;

    const allProjects = getProjectsData();
    const centroActual = STATE.selectedCenter || "Sta Juana";
    
    // Filter by center and active status filter
    const centroProjects = allProjects.filter(p => p.centro === centroActual || !p.centro);
    const activos = centroProjects.filter(p => p.estado === "ABIERTO");
    const cerrados = centroProjects.filter(p => p.estado === "CERRADO");

    if (cantActivosEl) cantActivosEl.innerText = activos.length;
    if (cantCerradosEl) cantCerradosEl.innerText = cerrados.length;

    const displayList = STATE.activeFilterState === 'ABIERTO' ? activos : cerrados;

    if (displayList.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-hover); border-radius: 10px; border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-folder-open" style="font-size: 36px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="margin: 0; color: var(--text-primary);">No hay proyectos ${STATE.activeFilterState === 'ABIERTO' ? 'en curso (mesa abierta)' : 'cerrados'}</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-top: 6px;">
                    ${STATE.activeFilterState === 'ABIERTO' ? 'Haga clic en "Abrir Nuevo Proyecto" para iniciar el seguimiento de un servicio.' : 'Los proyectos concluidos aparecerán aquí.'}
                </p>
            </div>
        `;
        return;
    }

    gridContainer.innerHTML = displayList.map(p => {
        const cantEventos = (p.bitacora || []).length;
        const ultimoEvento = cantEventos > 0 ? p.bitacora[cantEventos - 1] : null;
        
        return `
            <div class="dashboard-panel" style="padding: 20px; border: 1px solid var(--border-color); border-radius: 10px; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <span class="badge" style="background: ${p.estado === 'ABIERTO' ? '#10b981' : '#64748b'}; color: white; font-weight: 700; font-size: 11px;">
                            ${p.estado === 'ABIERTO' ? '⚡ EN CURSO' : '✓ CERRADO'}
                        </span>
                        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">ID: ${p.id}</span>
                    </div>
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary); cursor: pointer;" onclick="openModalDetalleProyecto('${p.id}')">
                        ${p.titulo}
                    </h3>
                    <p style="margin: 0 0 12px 0; font-size: 12px; color: var(--accent-blue-glow); font-weight: 600;">
                        <i class="fa-solid fa-plug-circle-bolt"></i> ${p.equipoNombre || 'Equipo Electromecánico'}
                    </p>
                    
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
                        <div><i class="fa-solid fa-user-gear" style="width: 16px;"></i> Líder: <strong>${p.tecnicoLider}</strong></div>
                        <div><i class="fa-solid fa-calendar-day" style="width: 16px;"></i> Inicio: ${p.fechaInicio}</div>
                        <div><i class="fa-solid fa-list-check" style="width: 16px;"></i> Hitos Bitácora: <strong>${cantEventos} entradas</strong></div>
                    </div>

                    ${ultimoEvento ? `
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; font-size: 11px; margin-bottom: 14px;">
                            <span style="color: #10b981; font-weight: 700;">Última Acción:</span> ${ultimoEvento.descripcion}
                        </div>
                    ` : ''}
                </div>

                <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button class="btn-primary" onclick="openModalDetalleProyecto('${p.id}')" style="flex: 1; font-size: 12px; padding: 8px;">
                        <i class="fa-solid fa-eye"></i> Ver Bitácora (${cantEventos})
                    </button>
                    ${p.dossierUrl ? `
                        <a href="${p.dossierUrl}" target="_blank" class="btn-secondary" style="font-size: 12px; padding: 8px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.2); border-color: #3b82f6; color: #60a5fa;" title="Ver Dossier PDF en Google Drive">
                            <i class="fa-solid fa-file-pdf"></i> PDF Drive
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function filtrarEstadoProyecto(estado) {
    STATE.activeFilterState = estado;
    const btnActivos = document.getElementById("btn-proyectos-activos");
    const btnCerrados = document.getElementById("btn-proyectos-cerrados");
    if (btnActivos) btnActivos.classList.toggle("active", estado === 'ABIERTO');
    if (btnCerrados) btnCerrados.classList.toggle("active", estado === 'CERRADO');
    renderProyectosTab();
}

function openModalNuevoProyecto() {
    const modal = document.getElementById("modal-nuevo-proyecto");
    const selectEquipo = document.getElementById("np-equipo");
    const form = document.getElementById("form-nuevo-proyecto");
    
    if (form) form.reset();

    if (selectEquipo) {
        const equiposCentro = (STATE.allEquipment || []).filter(e => e.centro === (STATE.selectedCenter || "Sta Juana"));
        selectEquipo.innerHTML = '<option value="">-- Seleccionar Equipo --</option>' + 
            equiposCentro.map(e => `<option value="${e.id}">${e.nombre} (${e.marca || ''} ${e.modelo || ''})</option>`).join('');
    }

    if (modal) modal.style.display = "flex";
}

function closeModalNuevoProyecto() {
    const modal = document.getElementById("modal-nuevo-proyecto");
    if (modal) modal.style.display = "none";
}

async function guardarNuevoProyecto() {
    const titulo = document.getElementById("np-titulo").value.trim();
    const equipoId = document.getElementById("np-equipo").value;
    const tecnico = document.getElementById("np-tecnico").value.trim();
    const diagnostico = document.getElementById("np-diagnostico").value.trim();

    if (!titulo || !equipoId || !tecnico) {
        if (window.showToast) showToast("Complete todos los campos requeridos", "warning");
        return;
    }

    const equipoObj = (STATE.allEquipment || []).find(e => e.id === equipoId);
    const nuevoProyecto = {
        id: "PRY-" + Date.now().toString().slice(-6),
        titulo: titulo,
        cliente: STATE.selectedClient || "Cermaq",
        centro: STATE.selectedCenter || "Sta Juana",
        equipoId: equipoId,
        equipoNombre: equipoObj ? equipoObj.nombre : "Equipo Industrial",
        tecnicoLider: tecnico,
        estado: "ABIERTO",
        fechaInicio: new Date().toISOString().substring(0, 10),
        diagnostico: diagnostico,
        bitacora: [
            {
                id: "EVT-" + Date.now(),
                fechaHora: new Date().toISOString(),
                tipo: "Inspección",
                tecnico: tecnico,
                descripcion: "Apertura de proyecto y registro de diagnostico inicial: " + (diagnostico || "Sin detalles adicionales.")
            }
        ],
        repuestos: []
    };

    const proyectos = getProjectsData();
    proyectos.unshift(nuevoProyecto);

    if (window.dbStore && window.dbStore.saveOfflineProject) {
        await window.dbStore.saveOfflineProject(nuevoProyecto);
    }

    if (window.syncWithSheets) {
        window.syncWithSheets("addProject", { project: nuevoProyecto });
    }

    closeModalNuevoProyecto();
    renderProyectosTab();
    if (window.showToast) showToast("¡Proyecto abierto exitosamente!", "success");
}

function openModalDetalleProyecto(projectId) {
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === projectId);
    if (!p) return;

    STATE.activeProjectId = projectId;

    const modal = document.getElementById("modal-detalle-proyecto");
    const badgeEstado = document.getElementById("dp-badge-estado");
    const tituloEl = document.getElementById("dp-titulo");
    const subtituloEl = document.getElementById("dp-subtitulo");
    const timelineEl = document.getElementById("dp-timeline");
    const repuestosEl = document.getElementById("dp-lista-repuestos");
    const btnCerrar = document.getElementById("btn-cerrar-proyecto-dossier");

    if (badgeEstado) {
        badgeEstado.innerText = p.estado === 'ABIERTO' ? '⚡ EN CURSO (MESA ABIERTA)' : '✓ CERRADO';
        badgeEstado.style.background = p.estado === 'ABIERTO' ? '#10b981' : '#64748b';
    }
    if (tituloEl) tituloEl.innerText = p.titulo;
    if (subtituloEl) subtituloEl.innerText = `Equipo: ${p.equipoNombre} | Centro: ${p.centro} | Líder: ${p.tecnicoLider}`;
    if (btnCerrar) btnCerrar.style.display = p.estado === 'ABIERTO' ? 'inline-flex' : 'none';

    // Render Timeline
    if (timelineEl) {
        const bitacora = p.bitacora || [];
        timelineEl.innerHTML = bitacora.length === 0 ? '<p style="color: var(--text-muted); font-size: 13px;">No hay eventos en la bitácora aún.</p>' :
            bitacora.map(evt => `
                <div class="timeline-item ${ (evt.tipo || '').toLowerCase() }" style="background: rgba(255,255,255,0.02); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                        <span><strong style="color: var(--text-primary);">${evt.tipo || 'Acción'}</strong> por ${evt.tecnico}</span>
                        <span>${new Date(evt.fechaHora).toLocaleString()}</span>
                    </div>
                    <p style="margin: 0; font-size: 13px; color: var(--text-primary); line-height: 1.4;">${evt.descripcion}</p>
                    ${evt.fotoUrl ? `
                        <div style="margin-top: 8px;">
                            <a href="${evt.fotoUrl}" target="_blank">
                                <img src="${evt.fotoUrl}" style="max-height: 100px; border-radius: 6px; border: 1px solid var(--border-color);" alt="Evidencia">
                            </a>
                        </div>
                    ` : ''}
                </div>
            `).join('');
    }

    // Render Repuestos
    if (repuestosEl) {
        const reps = p.repuestos || [];
        repuestosEl.innerHTML = reps.length === 0 ? '<p style="color: var(--text-muted); margin: 0;">Sin repuestos registrados.</p>' :
            reps.map(r => `<div><i class="fa-solid fa-gears" style="color: #10b981;"></i> ${r.nombre} (x${r.cantidad})</div>`).join('');
    }

    if (modal) modal.style.display = "flex";
}

function closeModalDetalleProyecto() {
    const modal = document.getElementById("modal-detalle-proyecto");
    if (modal) modal.style.display = "none";
}

function compressImageFile(file, maxWidth = 1600, quality = 0.75) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

async function guardarHitoBitacora() {
    if (!STATE.activeProjectId) return;
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === STATE.activeProjectId);
    if (!p) return;

    const tipo = document.getElementById("nh-tipo").value;
    const tecnico = document.getElementById("nh-tecnico").value.trim();
    const descripcion = document.getElementById("nh-descripcion").value.trim();
    const fotoInput = document.getElementById("nh-foto-input");

    if (!tecnico || !descripcion) {
        if (window.showToast) showToast("Ingrese el técnico y el detalle de la acción", "warning");
        return;
    }

    let fotoBase64 = null;
    if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        try {
            fotoBase64 = await compressImageFile(fotoInput.files[0], 1600, 0.75);
        } catch (err) {
            console.error("Error al comprimir imagen:", err);
        }
    }

    const nuevoHito = {
        id: "EVT-" + Date.now(),
        fechaHora: new Date().toISOString(),
        tipo: tipo,
        tecnico: tecnico,
        descripcion: descripcion,
        fotoBase64: fotoBase64,
        fotoUrl: fotoBase64 ? null : ""
    };

    if (!p.bitacora) p.bitacora = [];
    p.bitacora.push(nuevoHito);

    // If type is Repuesto, append to materials
    if (tipo === "Repuesto") {
        if (!p.repuestos) p.repuestos = [];
        p.repuestos.push({ nombre: descripcion, cantidad: 1 });
    }

    // Save offline
    if (window.dbStore && window.dbStore.saveOfflineProject) {
        await window.dbStore.saveOfflineProject(p);
    }

    // Sync online to Google Drive & Sheets
    if (window.syncWithSheets) {
        window.syncWithSheets("addProjectEvent", { projectId: p.id, event: nuevoHito });
    }

    document.getElementById("form-nuevo-hito").reset();
    openModalDetalleProyecto(p.id);
    renderProyectosTab();
    if (window.showToast) showToast("Hito añadido a la bitácora", "success");
}

function abrirEditorDossier() {
    if (!STATE.activeProjectId) return;
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === STATE.activeProjectId);
    if (!p) return;

    closeModalDetalleProyecto();

    const modal = document.getElementById("modal-editor-dossier");
    const codEl = document.getElementById("ed-codigo-dossier");
    const clienteEl = document.getElementById("ed-cliente");
    const centroEl = document.getElementById("ed-centro");
    const equipoEl = document.getElementById("ed-equipo");
    const tecnicoEl = document.getElementById("ed-tecnico");
    const firmaTecnicoEl = document.getElementById("ed-firma-tecnico");

    const inTitulo = document.getElementById("ed-input-titulo");
    const inConclusiones = document.getElementById("ed-input-conclusiones");
    const inRecomendaciones = document.getElementById("ed-input-recomendaciones");
    const tablaBitacora = document.getElementById("ed-tabla-bitacora");

    if (codEl) codEl.innerText = p.id;
    if (clienteEl) clienteEl.innerText = p.cliente || "Cermaq";
    if (centroEl) centroEl.innerText = p.centro || "Sta Juana";
    if (equipoEl) equipoEl.innerText = p.equipoNombre;
    if (tecnicoEl) tecnicoEl.innerText = p.tecnicoLider;
    if (firmaTecnicoEl) firmaTecnicoEl.innerText = p.tecnicoLider;

    if (inTitulo) inTitulo.value = p.titulo;
    if (inConclusiones) inConclusiones.value = `Se completó satisfactoriamente el proyecto ${p.titulo} para el equipo ${p.equipoNombre}. Se realizaron ${ (p.bitacora || []).length } actividades en la bitácora con pruebas operacionales conformes.`;
    if (inRecomendaciones) inRecomendaciones.value = "Realizar inspección periódica de temperatura y vibraciones según plan preventivo.";

    if (tablaBitacora) {
        tablaBitacora.innerHTML = (p.bitacora || []).map(b => `
            <tr>
                <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${new Date(b.fechaHora).toLocaleDateString()}</td>
                <td style="padding: 6px 10px; border: 1px solid #cbd5e1;"><strong>${b.tipo}</strong></td>
                <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${b.tecnico}</td>
                <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${b.descripcion}</td>
            </tr>
        `).join('');
    }

    if (modal) modal.style.display = "flex";
}

function closeModalEditorDossier() {
    const modal = document.getElementById("modal-editor-dossier");
    if (modal) modal.style.display = "none";
}

async function confirmarYCerrarProyectoConDrive() {
    if (!STATE.activeProjectId) return;
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === STATE.activeProjectId);
    if (!p) return;

    const tituloEditado = document.getElementById("ed-input-titulo").value.trim();
    const conclusionesEditadas = document.getElementById("ed-input-conclusiones").value.trim();
    const recomendacionesEditadas = document.getElementById("ed-input-recomendaciones").value.trim();

    p.estado = "CERRADO";
    p.fechaCierre = new Date().toISOString().substring(0, 10);
    p.titulo = tituloEditado || p.titulo;
    p.conclusionesDossier = conclusionesEditadas;
    p.recomendacionesDossier = recomendacionesEditadas;

    // Save locally
    if (window.dbStore && window.dbStore.saveOfflineProject) {
        await window.dbStore.saveOfflineProject(p);
    }

    // Sync to Apps Script to save status & PDF link in Drive
    if (window.syncWithSheets) {
        window.syncWithSheets("closeProject", {
            projectId: p.id,
            dossier: {
                centro: p.centro,
                titulo: p.titulo,
                conclusiones: conclusionesEditadas,
                recomendaciones: recomendacionesEditadas,
                pdfBase64: null // PDF can be compiled natively or saved via Drive API
            }
        });
    }

    // Append to equipment maintenance history
    if (!RAW_DB.Historial) RAW_DB.Historial = [];
    RAW_DB.Historial.push({
        fecha: p.fechaCierre,
        tipo: "Proyecto / Overhaul",
        trabajo: `${p.titulo} - ${conclusionesEditadas}`,
        tecnico: p.tecnicoLider,
        cliente: p.cliente,
        centro: p.centro,
        equipoId: p.equipoId
    });

    closeModalEditorDossier();
    renderProyectosTab();
    if (window.showToast) showToast("¡Proyecto Cerrado y Dossier guardado exitosamente!", "success");
}

// Global Exports for Window
window.exportDatabaseJSON = exportDatabaseJSON;
window.importDatabaseJSON = importDatabaseJSON;
window.openAddEquipmentModal = openAddEquipmentModal;
window.handleTerrainFormSubmit = handleTerrainFormSubmit;
window.switchModalTab = switchModalTab;
window.submitWorkOrder = submitWorkOrder;
window.addUrlPhoto = addUrlPhoto;
window.removeModalImage = removeModalImage;
window.renderModalImages = renderModalImages;
window.exportEquipmentExcel = exportEquipmentExcel;
window.saveCustomRepuesto = saveCustomRepuesto;
window.deleteCustomRepuesto = deleteCustomRepuesto;
window.saveTrabajoExtraordinario = saveTrabajoExtraordinario;
window.deleteTrabajoExtraordinario = deleteTrabajoExtraordinario;
window.saveTarifaHH = saveTarifaHH;
window.renderHistorialTab = renderHistorialTab;
window.printUnifiedHistoryReport = printUnifiedHistoryReport;
window.switchTerrainTab = switchTerrainTab;
window.renderInfoGeneralTab = renderInfoGeneralTab;
window.showManualDetails = showManualDetails;
window.getMaintenanceChecklist = getMaintenanceChecklist;
window.syncWithSheets = syncWithSheets;
window.showSyncBadge = showSyncBadge;
window.hideSyncBadge = hideSyncBadge;

function switchMobileTab(tabName) {
    STATE.activeTab = tabName;
    
    // Update desktop nav menu active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update mobile bottom nav active state
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`panel-${tabName}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // Trigger tab specific rendering
    if (typeof window.renderTabContent === 'function') {
        window.renderTabContent();
    } else if (tabName === 'trabajo-actual') {
        renderProyectosTab();
    } else if (tabName === 'dashboard' && typeof renderDashboardTab === 'function') {
        renderDashboardTab();
    }
}

// Proyectos Vivos & Mobile window exports
window.renderProyectosTab = renderProyectosTab;
window.filtrarEstadoProyecto = filtrarEstadoProyecto;
window.openModalNuevoProyecto = openModalNuevoProyecto;
window.closeModalNuevoProyecto = closeModalNuevoProyecto;
window.guardarNuevoProyecto = guardarNuevoProyecto;
window.openModalDetalleProyecto = openModalDetalleProyecto;
window.closeModalDetalleProyecto = closeModalDetalleProyecto;
window.guardarHitoBitacora = guardarHitoBitacora;
window.abrirEditorDossier = abrirEditorDossier;
window.closeModalEditorDossier = closeModalEditorDossier;
window.confirmarYCerrarProyectoConDrive = confirmarYCerrarProyectoConDrive;
window.switchMobileTab = switchMobileTab;
window.compressImageFile = compressImageFile;


