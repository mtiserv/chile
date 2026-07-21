// js/state.js - Global State & System Configuration for MTI Servicios Industriales

window.STATE = {
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
    plannerFilterStatus: 'all',
    activeFilterState: 'ABIERTO',
    activeProjectId: null
};

// Raw database loaded from window or localStorage
window.RAW_DB = null;

// Mapping of Months for the 1-Year Tender Plan (Period: June 2026 - May 2027)
window.PLANNER_MONTHS = [
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
