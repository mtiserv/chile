// js/planner.js - Módulo de Planificación Anual Licitada (Plan 1 Año 2026-2027) MTI

function getMonthName(monthNum) {
    const monthObj = (window.PLANNER_MONTHS || []).find(m => m.num === parseInt(monthNum, 10));
    return monthObj ? monthObj.name : `Mes ${monthNum}`;
}

window.getMonthName = getMonthName;
