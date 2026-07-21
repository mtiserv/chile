// js/equipos.js - Módulo de Catálogo de Equipos, Especificaciones Inteligentes y Formularios MTI

function getSmartDefaultSpecs(nombre, area) {
    const nameLower = nombre.toLowerCase();
    
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
    }

    return specs;
}

window.getSmartDefaultSpecs = getSmartDefaultSpecs;
