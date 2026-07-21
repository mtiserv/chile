// js/proyectos.js - Módulo de Proyectos Vivos, Bitácora de Eventos, Compresión de Fotos y Editor de Dossiers MTI

function getProjectsData() {
    if (!window.RAW_DB) window.RAW_DB = {};
    if (!window.RAW_DB.Proyectos) {
        window.RAW_DB.Proyectos = [
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
    return window.RAW_DB.Proyectos;
}

function renderProyectosTab() {
    const gridContainer = document.getElementById("grid-proyectos-vivos");
    const cantActivosEl = document.getElementById("cant-proyectos-activos");
    const cantCerradosEl = document.getElementById("cant-proyectos-cerrados");
    
    if (!gridContainer) return;

    const allProjects = getProjectsData();
    const centroActual = window.STATE.selectedCenter || "Sta Juana";
    
    const centroProjects = allProjects.filter(p => p.centro === centroActual || !p.centro);
    const activos = centroProjects.filter(p => p.estado === "ABIERTO");
    const cerrados = centroProjects.filter(p => p.estado === "CERRADO");

    if (cantActivosEl) cantActivosEl.innerText = activos.length;
    if (cantCerradosEl) cantCerradosEl.innerText = cerrados.length;

    const displayList = window.STATE.activeFilterState === 'ABIERTO' ? activos : cerrados;

    if (displayList.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-hover); border-radius: 10px; border: 1px dashed var(--border-color);">
                <i class="fa-solid fa-folder-open" style="font-size: 36px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="margin: 0; color: var(--text-primary);">No hay proyectos ${window.STATE.activeFilterState === 'ABIERTO' ? 'en curso (mesa abierta)' : 'cerrados'}</h3>
                <p style="color: var(--text-secondary); font-size: 13px; margin-top: 6px;">
                    ${window.STATE.activeFilterState === 'ABIERTO' ? 'Haga clic en "Abrir Nuevo Proyecto" para iniciar el seguimiento de un servicio.' : 'Los proyectos concluidos aparecerán aquí.'}
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
    window.STATE.activeFilterState = estado;
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
        const equiposCentro = (window.STATE.allEquipment || []).filter(e => e.centro === (window.STATE.selectedCenter || "Sta Juana"));
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
        if (window.showToast) window.showToast("Complete todos los campos requeridos", "warning");
        return;
    }

    const equipoObj = (window.STATE.allEquipment || []).find(e => e.id === equipoId);
    const nuevoProyecto = {
        id: "PRY-" + Date.now().toString().slice(-6),
        titulo: titulo,
        cliente: window.STATE.selectedClient || "Cermaq",
        centro: window.STATE.selectedCenter || "Sta Juana",
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
    if (window.showToast) window.showToast("¡Proyecto abierto exitosamente!", "success");
}

function openModalDetalleProyecto(projectId) {
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === projectId);
    if (!p) return;

    window.STATE.activeProjectId = projectId;

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
    if (!window.STATE.activeProjectId) return;
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === window.STATE.activeProjectId);
    if (!p) return;

    const tipo = document.getElementById("nh-tipo").value;
    const tecnico = document.getElementById("nh-tecnico").value.trim();
    const descripcion = document.getElementById("nh-descripcion").value.trim();
    const fotoInput = document.getElementById("nh-foto-input");

    if (!tecnico || !descripcion) {
        if (window.showToast) window.showToast("Ingrese el técnico y el detalle de la acción", "warning");
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

    if (tipo === "Repuesto") {
        if (!p.repuestos) p.repuestos = [];
        p.repuestos.push({ nombre: descripcion, cantidad: 1 });
    }

    if (window.dbStore && window.dbStore.saveOfflineProject) {
        await window.dbStore.saveOfflineProject(p);
    }

    if (window.syncWithSheets) {
        window.syncWithSheets("addProjectEvent", { projectId: p.id, event: nuevoHito });
    }

    document.getElementById("form-nuevo-hito").reset();
    openModalDetalleProyecto(p.id);
    renderProyectosTab();
    if (window.showToast) window.showToast("Hito añadido a la bitácora", "success");
}

function abrirEditorDossier() {
    if (!window.STATE.activeProjectId) return;
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === window.STATE.activeProjectId);
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
    if (!window.STATE.activeProjectId) return;
    const proyectos = getProjectsData();
    const p = proyectos.find(item => item.id === window.STATE.activeProjectId);
    if (!p) return;

    const tituloEditado = document.getElementById("ed-input-titulo").value.trim();
    const conclusionesEditadas = document.getElementById("ed-input-conclusiones").value.trim();
    const recomendacionesEditadas = document.getElementById("ed-input-recomendaciones").value.trim();

    p.estado = "CERRADO";
    p.fechaCierre = new Date().toISOString().substring(0, 10);
    p.titulo = tituloEditado || p.titulo;
    p.conclusionesDossier = conclusionesEditadas;
    p.recomendacionesDossier = recomendacionesEditadas;

    if (window.dbStore && window.dbStore.saveOfflineProject) {
        await window.dbStore.saveOfflineProject(p);
    }

    if (window.syncWithSheets) {
        window.syncWithSheets("closeProject", {
            projectId: p.id,
            dossier: {
                centro: p.centro,
                titulo: p.titulo,
                conclusiones: conclusionesEditadas,
                recomendaciones: recomendacionesEditadas,
                pdfBase64: null
            }
        });
    }

    if (!window.RAW_DB.Historial) window.RAW_DB.Historial = [];
    window.RAW_DB.Historial.push({
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
    if (window.showToast) window.showToast("¡Proyecto Cerrado y Dossier guardado exitosamente!", "success");
}

// Global Exports to Window
window.getProjectsData = getProjectsData;
window.renderProyectosTab = renderProyectosTab;
window.filtrarEstadoProyecto = filtrarEstadoProyecto;
window.openModalNuevoProyecto = openModalNuevoProyecto;
window.closeModalNuevoProyecto = closeModalNuevoProyecto;
window.guardarNuevoProyecto = guardarNuevoProyecto;
window.openModalDetalleProyecto = openModalDetalleProyecto;
window.closeModalDetalleProyecto = closeModalDetalleProyecto;
window.compressImageFile = compressImageFile;
window.guardarHitoBitacora = guardarHitoBitacora;
window.abrirEditorDossier = abrirEditorDossier;
window.closeModalEditorDossier = closeModalEditorDossier;
window.confirmarYCerrarProyectoConDrive = confirmarYCerrarProyectoConDrive;
