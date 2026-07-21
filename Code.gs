// Code.gs - MTI Servicios Industriales Backend API (Google Apps Script)
// Deploy this script as a Web App: "Execute as me", "Who has access: Anyone".

// CONFIGURATION: Replace these with your Google Spreadsheet IDs if you want to use existing ones.
// If left as empty strings, the script will automatically create new spreadsheets in your Google Drive.
const SPREADSHEET_EQUIPOS_ID = "";
const SPREADSHEET_MANTENCIONES_ID = "";
const SPREADSHEET_TRABAJOS_ID = "";

// Credentials
const AUTH_USER = "mti";
const AUTH_PASS = "2026";

// Spreadsheet Default Names
const NAME_EQUIPOS = "MTI_DB_Equipos";
const NAME_MANTENCIONES = "MTI_Historial_Mantenciones";
const NAME_TRABAJOS = "MTI_Historial_Trabajos";

// CORS Handler
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "running", message: "API is active. Use POST requests." }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var requestData;
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      requestData = e.parameter;
    }
    
    var action = requestData.action;
    
    // Auth bypass for login
    if (action === "login") {
      if (requestData.username === AUTH_USER && requestData.password === AUTH_PASS) {
        var token = generateToken(AUTH_USER);
        return responseJSON({ success: true, token: token });
      } else {
        return responseJSON({ success: false, error: "Credenciales incorrectas" }, 401);
      }
    }
    
    // Token Validation for all other endpoints
    var token = requestData.token || e.parameter.token;
    if (!verifyToken(token)) {
      return responseJSON({ success: false, error: "No autorizado o sesión expirada" }, 401);
    }
    
    if (action === "verifyToken") {
      return responseJSON({ success: true });
    }
    
    switch (action) {
      case "getDatabase":
        return responseJSON(getDatabase());
        
      case "addCenter":
        return responseJSON(addCenter(requestData.centerName));
        
      case "addEquipment":
        return responseJSON(addEquipment(requestData.center, requestData.equipment));
        
      case "updateEquipment":
        return responseJSON(updateEquipment(requestData.center, requestData.equipmentId, requestData.field, requestData.value));
        
      case "addMaintenanceLog":
        return responseJSON(addMaintenanceLog(requestData.log));
        
      case "addWorkLog":
        return responseJSON(addWorkLog(requestData.log, requestData.isExtraordinary));
        
      case "addCustomRepuesto":
        return responseJSON(addCustomRepuesto(requestData.repuesto));
        
      case "deleteCustomRepuesto":
        return responseJSON(deleteCustomRepuesto(requestData.repuestoId));
        
      case "updateConfig":
        return responseJSON(updateConfig(requestData.clave, requestData.valor));
        
      case "importFullDatabase":
        return responseJSON(importFullDatabase(requestData.database));

      case "uploadImageToDrive":
        return responseJSON(uploadImageToDrive(requestData.base64Data, requestData.fileName, requestData.folderName));

      case "uploadPDFToDrive":
        return responseJSON(uploadPDFToDrive(requestData.base64Data, requestData.fileName, requestData.folderName));

      case "addProject":
        return responseJSON(addProject(requestData.project));

      case "addProjectEvent":
        return responseJSON(addProjectEvent(requestData.projectId, requestData.event));

      case "closeProject":
        return responseJSON(closeProject(requestData.projectId, requestData.dossier));

      default:
        return responseJSON({ success: false, error: "Acción no encontrada: " + action }, 400);
    }
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() }, 500);
  }
}

// Helper to return response as JSON
function responseJSON(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Authentication Helpers
function getOrCreateSecret() {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('AUTH_SECRET');
  if (!secret) {
    secret = Utilities.getUuid();
    props.setProperty('AUTH_SECRET', secret);
  }
  return secret;
}

function generateToken(username) {
  var secret = getOrCreateSecret();
  var expiry = new Date().getTime() + (24 * 60 * 60 * 1000 * 7); // Token valid for 7 days
  var payload = username + ":" + expiry;
  var signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, payload, secret);
  
  var signatureStr = signature.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  
  return Utilities.base64Encode(payload + ":" + signatureStr);
}

function verifyToken(token) {
  if (!token) return false;
  try {
    var decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var parts = decoded.split(":");
    if (parts.length !== 3) return false;
    var username = parts[0];
    var expiry = parseInt(parts[1], 10);
    var signatureStr = parts[2];
    
    if (new Date().getTime() > expiry) return false;
    
    var secret = getOrCreateSecret();
    var payload = username + ":" + expiry;
    var signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, payload, secret);
    var expectedSignatureStr = signature.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    return signatureStr === expectedSignatureStr && username === AUTH_USER;
  } catch (e) {
    return false;
  }
}

// Sheet Openers / Initializers
function getSpreadsheet(id, defaultName, initialSheets) {
  var ss;
  if (id && id.trim().length > 5) {
    try {
      ss = SpreadsheetApp.openById(id);
      return ss;
    } catch(e) {}
  }
  
  // Try to find by name in Drive
  var files = DriveApp.getFilesByName(defaultName);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  
  // Auto-create in Drive root
  ss = SpreadsheetApp.create(defaultName);
  
  // Setup default sheets
  if (initialSheets && initialSheets.length > 0) {
    for (var i = 0; i < initialSheets.length; i++) {
      var sheetName = initialSheets[i].name;
      var headers = initialSheets[i].headers;
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        if (i === 0) {
          sheet = ss.getSheets()[0];
          sheet.setName(sheetName);
        } else {
          sheet = ss.insertSheet(sheetName);
        }
      }
      sheet.clear();
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }
  }
  return ss;
}

// Technical database sheet configurations
const EQUIPOS_HEADERS = [
  "ID", "Nombre", "Area", "Designacion", "Cantidad", "HorasFuncionamiento", 
  "Criticidad", "Estado", "Imagen", "Marca", "Modelo", "Serie", 
  "Potencia", "Voltaje", "Amperaje", "Conexion", "Cos_fi", "Cable_awg", 
  "RPM", "Rodamientos", "Repuestos", "Ultima_Mantencion", "Proxima_Mantencion", 
  "Frecuencia_Meses"
];

const MANTENCIONES_HEADERS = [
  "Fecha", "ID_Equipo", "Nombre_Equipo", "Area", "Tipo_Mantencion", 
  "Descripcion", "Tecnico", "Estado_Final", "Proxima_Fecha", "Cliente", "Centro"
];

const TRABAJOS_MANT_HEADERS = [
  "Fecha", "ID_Equipo", "Nombre_Equipo", "Tipo_Trabajo", "Observaciones", 
  "Repuestos_Utilizados", "Materiales_Utilizados", "Horas_Trabajadas", "Tecnico", 
  "Costo_Repuestos", "Cliente", "Centro"
];

const TRABAJOS_EXTRA_HEADERS = [
  "Fecha", "Descripcion", "ID_Equipo", "Nombre_Equipo", "Horas_Trabajadas", 
  "Costo_Materiales", "Costo_Total", "Observaciones", "Cliente", "Centro"
];

const ANTECEDENTES_HEADERS = [
  "Fecha", "Tarea", "Rodamientos", "ID_Equipo", "Nombre_Equipo", "Area", "Fuente", "Tecnico"
];

const REPUESTOS_HEADERS = [
  "ID", "Nombre", "ID_Equipo", "Nombre_Equipo", "Cantidad", "Estado"
];

const CONFIG_HEADERS = [
  "Clave", "Valor"
];

// Core Data Service
function getDatabase() {
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS, [
    { name: "Sta Juana", headers: EQUIPOS_HEADERS },
    { name: "Rahue", headers: EQUIPOS_HEADERS },
    { name: "Trafun", headers: EQUIPOS_HEADERS },
    { name: "Repuestos", headers: REPUESTOS_HEADERS },
    { name: "Configuracion", headers: CONFIG_HEADERS }
  ]);
  
  var ssMaint = getSpreadsheet(SPREADSHEET_MANTENCIONES_ID, NAME_MANTENCIONES, [
    { name: "Historial", headers: MANTENCIONES_HEADERS },
    { name: "Antecedentes", headers: ANTECEDENTES_HEADERS }
  ]);
  
  var ssTrabajos = getSpreadsheet(SPREADSHEET_TRABAJOS_ID, NAME_TRABAJOS, [
    { name: "Trabajos_Mantenimiento", headers: TRABAJOS_MANT_HEADERS },
    { name: "Trabajos_Extraordinarios", headers: TRABAJOS_EXTRA_HEADERS }
  ]);
  
  // 1. Fetch Equipments grouped by Sheet tab (excluding Repuestos and Configuracion)
  var allEquipments = [];
  var centers = [];
  var sheets = ssEquipos.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var centerName = sheets[i].getName();
    if (centerName === "Repuestos" || centerName === "Configuracion") continue;
    centers.push(centerName);
    
    var data = sheets[i].getDataRange().getValues();
    if (data.length > 1) {
      var headers = data[0];
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var eq = { cliente: "Cermaq", centro: centerName };
        for (var c = 0; c < headers.length; c++) {
          var key = headers[c];
          var val = row[c];
          
          // Format specific data types
          if (key === "Ultima_Mantencion" || key === "Proxima_Mantencion") {
            val = val instanceof Date ? formatDate(val) : String(val);
          } else if (key === "Rodamientos") {
            val = val ? val.toString().split(",").map(function(s){ return s.trim(); }).filter(Boolean) : [];
          }
          eq[key] = val;
        }
        if (eq.ID) {
          allEquipments.push(eq);
        }
      }
    }
  }
  
  // 2. Fetch Maintenance Logs (Active MTI Contract)
  var maintLogs = [];
  var maintSheet = ssMaint.getSheetByName("Historial");
  var maintData = maintSheet.getDataRange().getValues();
  if (maintData.length > 1) {
    var headers = maintData[0];
    for (var r = 1; r < maintData.length; r++) {
      var row = maintData[r];
      var log = {};
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        var val = row[c];
        if (key === "Fecha" || key === "Proxima_Fecha") {
          val = val instanceof Date ? formatDate(val) : String(val);
        }
        log[key] = val;
      }
      if (log.Fecha) {
        maintLogs.push({
          id: log.ID_Equipo,
          eqId: log.ID_Equipo,
          fecha: log.Fecha,
          trabajo: log.Descripcion,
          tecnico: log.Tecnico,
          comentarios: log.Estado_Final ? "Estado final: " + log.Estado_Final : ""
        });
      }
    }
  }
  
  // 3. Fetch Work Logs (Active maintenance details)
  var workLogs = [];
  var workSheet = ssTrabajos.getSheetByName("Trabajos_Mantenimiento");
  var workData = workSheet.getDataRange().getValues();
  if (workData.length > 1) {
    var headers = workData[0];
    for (var r = 1; r < workData.length; r++) {
      var row = workData[r];
      var log = {};
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        var val = row[c];
        if (key === "Fecha") {
          val = val instanceof Date ? formatDate(val) : String(val);
        }
        log[key] = val;
      }
      if (log.Fecha) workLogs.push(log);
    }
  }
  
  // 4. Fetch Extraordinary Work Logs
  var extraLogs = [];
  var extraSheet = ssTrabajos.getSheetByName("Trabajos_Extraordinarios");
  var extraData = extraSheet.getDataRange().getValues();
  if (extraData.length > 1) {
    var headers = extraData[0];
    for (var r = 1; r < extraData.length; r++) {
      var row = extraData[r];
      var log = {};
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        var val = row[c];
        if (key === "Fecha") {
          val = val instanceof Date ? formatDate(val) : String(val);
        }
        log[key] = val;
      }
      if (log.Fecha) extraLogs.push(log);
    }
  }

  // 5. Fetch OtrosRepuestos from Repuestos tab
  var otrosRepuestos = [];
  var repSheet = ssEquipos.getSheetByName("Repuestos");
  if (repSheet) {
    var repData = repSheet.getDataRange().getValues();
    if (repData.length > 1) {
      var headers = repData[0];
      for (var r = 1; r < repData.length; r++) {
        var row = repData[r];
        var item = {};
        for (var c = 0; c < headers.length; c++) {
          item[headers[c]] = row[c];
        }
        if (item.Nombre) {
          otrosRepuestos.push({
            id: item.ID,
            nombre: item.Nombre,
            equipoId: item.ID_Equipo || null,
            equipoNombre: item.Nombre_Equipo || "Sin asociar",
            cantidad: parseInt(item.Cantidad) || 1,
            estado: item.Estado || "En Stock"
          });
        }
      }
    }
  }

  // 6. Fetch Configuration (TarifaHoraMTI and TareasCompletadas)
  var tarifaHora = 0;
  var tareasCompletadas = [];
  var configSheet = ssEquipos.getSheetByName("Configuracion");
  if (configSheet) {
    var configData = configSheet.getDataRange().getValues();
    for (var r = 1; r < configData.length; r++) {
      var clave = configData[r][0];
      var valor = configData[r][1];
      if (clave === "TarifaHoraMTI") {
        tarifaHora = parseFloat(valor) || 0;
      } else if (clave === "TareasCompletadas") {
        try {
          tareasCompletadas = JSON.parse(valor) || [];
        } catch(e) {}
      }
    }
  }

  // 7. Fetch AntecedentesGlobal (Legacy reference audit logs)
  var antecedentesGlobal = [];
  var antSheet = ssMaint.getSheetByName("Antecedentes");
  if (antSheet) {
    var antData = antSheet.getDataRange().getValues();
    if (antData.length > 1) {
      var headers = antData[0];
      for (var r = 1; r < antData.length; r++) {
        var row = antData[r];
        var log = {};
        for (var c = 0; c < headers.length; c++) {
          var key = headers[c];
          var val = row[c];
          if (key === "Fecha") {
            val = val instanceof Date ? formatDate(val) : String(val);
          } else if (key === "Rodamientos") {
            val = val ? val.toString().split(",").map(function(s){ return s.trim(); }).filter(Boolean) : [];
          }
          log[key] = val;
        }
        if (log.Fecha) {
          antecedentesGlobal.push({
            fecha: log.Fecha,
            tarea: log.Tarea || "",
            rodamientos: log.Rodamientos || [],
            eqId: log.ID_Equipo || "",
            eqName: log.Nombre_Equipo || "",
            area: log.Area || "",
            fuente: log.Fuente || "Bitácora de Referencia Anterior",
            tecnico: log.Tecnico || "Pre-MTI"
          });
        }
      }
    }
  }
  
  return {
    success: true,
    database: {
      Equipos: allEquipments,
      HistorialGlobal: maintLogs,
      AntecedentesGlobal: antecedentesGlobal,
      TrabajosMantenimiento: workLogs,
      TrabajosExtraordinarios: extraLogs,
      Clientes: ["Cermaq"],
      Centros: { "Cermaq": centers },
      TarifaHoraMTI: tarifaHora,
      TareasCompletadas: tareasCompletadas,
      OtrosRepuestos: otrosRepuestos
    }
  };
}

// Add a new tab (center) to the equipment sheet
function addCenter(centerName) {
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS);
  var sheet = ssEquipos.getSheetByName(centerName);
  if (sheet) {
    return { success: false, error: "El centro ya existe" };
  }
  
  sheet = ssEquipos.insertSheet(centerName);
  sheet.appendRow(EQUIPOS_HEADERS);
  sheet.getRange(1, 1, 1, EQUIPOS_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
  return { success: true };
}

// Update cell or entire row in Equipment Sheet
function updateEquipment(centerName, equipmentId, field, value) {
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS);
  var sheet = ssEquipos.getSheetByName(centerName);
  if (!sheet) return { success: false, error: "Centro no encontrado" };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // Find row index by ID
  var rowIndex = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(equipmentId)) {
      rowIndex = r + 1; // 1-indexed for sheets
      break;
    }
  }
  
  if (rowIndex === -1) return { success: false, error: "Equipo no encontrado" };
  
  if (field === "ALL_ROW") {
    // Overwrite the entire row
    var rowValues = [];
    for (var i = 0; i < headers.length; i++) {
      var key = headers[i];
      var val = value[key] !== undefined ? value[key] : "";
      if (key === "Rodamientos" && Array.isArray(val)) {
        val = val.join(", ");
      }
      rowValues.push(val);
    }
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
    return { success: true };
  }
  
  var colIndex = headers.indexOf(field);
  if (colIndex === -1) return { success: false, error: "Campo no encontrado: " + field };
  
  // Format before writing
  var cleanVal = value;
  if (field === "Rodamientos" && Array.isArray(value)) {
    cleanVal = value.join(", ");
  }
  
  sheet.getRange(rowIndex, colIndex + 1).setValue(cleanVal);
  return { success: true };
}

// Create new Equipment row
function addEquipment(centerName, equipment) {
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS);
  var sheet = ssEquipos.getSheetByName(centerName);
  if (!sheet) return { success: false, error: "Centro no encontrado" };
  
  var newRow = [];
  for (var i = 0; i < EQUIPOS_HEADERS.length; i++) {
    var key = EQUIPOS_HEADERS[i];
    var val = equipment[key] !== undefined ? equipment[key] : "";
    if (key === "Rodamientos" && Array.isArray(val)) {
      val = val.join(", ");
    }
    newRow.push(val);
  }
  
  sheet.appendRow(newRow);
  return { success: true, equipment: equipment };
}

// Append Maintenance Log to Sheet 2 and update equipment
function addMaintenanceLog(log) {
  var ssMaint = getSpreadsheet(SPREADSHEET_MANTENCIONES_ID, NAME_MANTENCIONES);
  var sheet = ssMaint.getSheetByName("Historial");
  
  var newRow = [];
  for (var i = 0; i < MANTENCIONES_HEADERS.length; i++) {
    var key = MANTENCIONES_HEADERS[i];
    newRow.push(log[key] !== undefined ? log[key] : "");
  }
  sheet.appendRow(newRow);
  
  // Update parent Equipment dates in sheet 1
  if (log.ID_Equipo && log.Centro) {
    updateEquipment(log.Centro, log.ID_Equipo, "Ultima_Mantencion", log.Fecha);
    if (log.Proxima_Fecha) {
      updateEquipment(log.Centro, log.ID_Equipo, "Proxima_Mantencion", log.Proxima_Fecha);
    }
    if (log.Estado_Final) {
      updateEquipment(log.Centro, log.ID_Equipo, "Estado", log.Estado_Final);
    }
  }
  
  return { success: true };
}

// Append Work Log to Sheet 3
function addWorkLog(log, isExtraordinary) {
  var ssTrabajos = getSpreadsheet(SPREADSHEET_TRABAJOS_ID, NAME_TRABAJOS);
  var sheetName = isExtraordinary ? "Trabajos_Extraordinarios" : "Trabajos_Mantenimiento";
  var headers = isExtraordinary ? TRABAJOS_EXTRA_HEADERS : TRABAJOS_MANT_HEADERS;
  
  var sheet = ssTrabajos.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: "Pestaña de trabajos no encontrada" };
  
  var newRow = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    newRow.push(log[key] !== undefined ? log[key] : "");
  }
  sheet.appendRow(newRow);
  return { success: true };
}

// Add custom spare parts
function addCustomRepuesto(rep) {
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS);
  var sheet = ssEquipos.getSheetByName("Repuestos");
  if (!sheet) return { success: false, error: "Pestaña Repuestos no encontrada" };
  
  var newRow = [
    rep.id || Utilities.getUuid(),
    rep.nombre || "",
    rep.equipoId || "",
    rep.equipoNombre || "",
    rep.cantidad || 1,
    rep.estado || "En Stock"
  ];
  sheet.appendRow(newRow);
  return { success: true };
}

// Delete custom spare parts
function deleteCustomRepuesto(repId) {
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS);
  var sheet = ssEquipos.getSheetByName("Repuestos");
  if (!sheet) return { success: false, error: "Pestaña Repuestos no encontrada" };
  
  var data = sheet.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(repId)) {
      sheet.deleteRow(r + 1);
      return { success: true };
    }
  }
  return { success: false, error: "Repuesto no encontrado" };
}

// Update configuration key-value
function updateConfig(clave, valor) {
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS);
  var sheet = ssEquipos.getSheetByName("Configuracion");
  if (!sheet) return { success: false, error: "Pestaña Configuracion no encontrada" };
  
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var r = 1; r < data.length; r++) {
    if (data[r][0] === clave) {
      rowIndex = r + 1;
      break;
    }
  }
  
  var stringVal = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 2).setValue(stringVal);
  } else {
    sheet.appendRow([clave, stringVal]);
  }
  return { success: true };
}

// Date helper: YYYY-MM-DD
function formatDate(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

// Batch import entire database to Sheets
function importFullDatabase(db) {
  if (!db) return { success: false, error: "Datos no provistos" };
  
  var ssEquipos = getSpreadsheet(SPREADSHEET_EQUIPOS_ID, NAME_EQUIPOS);
  var ssMaint = getSpreadsheet(SPREADSHEET_MANTENCIONES_ID, NAME_MANTENCIONES);
  var ssTrabajos = getSpreadsheet(SPREADSHEET_TRABAJOS_ID, NAME_TRABAJOS);
  
  // 1. Import Equipments
  var equips = db.Equipos || [];
  
  // First clear existing tabs or create center sheets if they don't exist
  var centerNames = [];
  equips.forEach(function(e) {
    if (e.centro && centerNames.indexOf(e.centro) === -1) {
      centerNames.push(e.centro);
    }
  });
  if (centerNames.indexOf("Sta Juana") === -1) centerNames.push("Sta Juana");
  if (centerNames.indexOf("Rahue") === -1) centerNames.push("Rahue");
  if (centerNames.indexOf("Trafun") === -1) centerNames.push("Trafun");
  
  centerNames.forEach(function(cName) {
    var sheet = ssEquipos.getSheetByName(cName);
    if (sheet) {
      sheet.clear();
    } else {
      sheet = ssEquipos.insertSheet(cName);
    }
    sheet.appendRow(EQUIPOS_HEADERS);
    sheet.getRange(1, 1, 1, EQUIPOS_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
  });
  
  // Append equipments rows
  for (var i = 0; i < equips.length; i++) {
    var eq = equips[i];
    var center = eq.centro || "Sta Juana";
    var sheet = ssEquipos.getSheetByName(center);
    
    var row = [];
    for (var j = 0; j < EQUIPOS_HEADERS.length; j++) {
      var key = EQUIPOS_HEADERS[j];
      var val = eq[key] !== undefined ? eq[key] : "";
      if (key === "Rodamientos" && Array.isArray(val)) {
        val = val.join(", ");
      }
      row.push(val);
    }
    sheet.appendRow(row);
  }
  
  // 2. Import Historial Global (Active MTI contract logs)
  var maintSheet = ssMaint.getSheetByName("Historial");
  if (maintSheet) {
    maintSheet.clear();
    maintSheet.appendRow(MANTENCIONES_HEADERS);
    maintSheet.getRange(1, 1, 1, MANTENCIONES_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
    
    var maintLogs = db.HistorialGlobal || [];
    for (var i = 0; i < maintLogs.length; i++) {
      var log = maintLogs[i];
      
      // Match active contract to MANTENCIONES headers format
      var eqObj = equips.find(function(e){ return e.id === (log.eqId || log.id); });
      var centroVal = log.centro || (eqObj ? eqObj.centro : "Sta Juana");
      var clientVal = log.cliente || (eqObj ? eqObj.cliente : "Cermaq");
      
      var row = [
        log.fecha || "",
        log.eqId || log.id || "",
        log.eqName || (eqObj ? eqObj.nombre : ""),
        log.area || (eqObj ? eqObj.area : ""),
        log.tipo || "Preventivo",
        log.tarea || log.trabajo || "",
        log.tecnico || "Técnico MTI",
        log.comentarios ? log.comentarios.replace("Estado final: ", "") : "Operativo",
        "", // Proxima_Fecha
        clientVal,
        centroVal
      ];
      maintSheet.appendRow(row);
    }
  }
  
  // 3. Import Works (Active maintenance details)
  var workSheet = ssTrabajos.getSheetByName("Trabajos_Mantenimiento");
  if (workSheet) {
    workSheet.clear();
    workSheet.appendRow(TRABAJOS_MANT_HEADERS);
    workSheet.getRange(1, 1, 1, TRABAJOS_MANT_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
    
    var workLogs = db.TrabajosMantenimiento || [];
    for (var i = 0; i < workLogs.length; i++) {
      var log = workLogs[i];
      var row = [];
      for (var j = 0; j < TRABAJOS_MANT_HEADERS.length; j++) {
        var key = TRABAJOS_MANT_HEADERS[j];
        row.push(log[key] !== undefined ? log[key] : "");
      }
      workSheet.appendRow(row);
    }
  }
  
  // 3b. Import Extraordinary Works
  var extraSheet = ssTrabajos.getSheetByName("Trabajos_Extraordinarios");
  if (extraSheet) {
    extraSheet.clear();
    extraSheet.appendRow(TRABAJOS_EXTRA_HEADERS);
    extraSheet.getRange(1, 1, 1, TRABAJOS_EXTRA_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
    
    var extraLogs = db.TrabajosExtraordinarios || [];
    for (var i = 0; i < extraLogs.length; i++) {
      var log = extraLogs[i];
      var row = [];
      for (var j = 0; j < TRABAJOS_EXTRA_HEADERS.length; j++) {
        var key = TRABAJOS_EXTRA_HEADERS[j];
        row.push(log[key] !== undefined ? log[key] : "");
      }
      extraSheet.appendRow(row);
    }
  }

  // 4. Import OtrosRepuestos
  var repSheet = ssEquipos.getSheetByName("Repuestos");
  if (repSheet) {
    repSheet.clear();
    repSheet.appendRow(REPUESTOS_HEADERS);
    repSheet.getRange(1, 1, 1, REPUESTOS_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
    var reps = db.OtrosRepuestos || [];
    for (var i = 0; i < reps.length; i++) {
      var r = reps[i];
      repSheet.appendRow([
        r.id || "",
        r.nombre || "",
        r.equipoId || "",
        r.equipoNombre || "Sin asociar",
        r.cantidad || 1,
        r.estado || "En Stock"
      ]);
    }
  }

  // 5. Import Configuracion
  var configSheet = ssEquipos.getSheetByName("Configuracion");
  if (configSheet) {
    configSheet.clear();
    configSheet.appendRow(CONFIG_HEADERS);
    configSheet.getRange(1, 1, 1, CONFIG_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
    configSheet.appendRow(["TarifaHoraMTI", String(db.TarifaHoraMTI || 0)]);
    configSheet.appendRow(["TareasCompletadas", JSON.stringify(db.TareasCompletadas || [])]);
  }

  // 6. Import Antecedentes Global (Legacy history)
  var antSheet = ssMaint.getSheetByName("Antecedentes");
  if (antSheet) {
    antSheet.clear();
    antSheet.appendRow(ANTECEDENTES_HEADERS);
    antSheet.getRange(1, 1, 1, ANTECEDENTES_HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
    var ants = db.AntecedentesGlobal || [];
    for (var i = 0; i < ants.length; i++) {
      var a = ants[i];
      antSheet.appendRow([
        a.fecha || "",
        a.tarea || "",
        Array.isArray(a.rodamientos) ? a.rodamientos.join(", ") : String(a.rodamientos || ""),
        a.eqId || "",
        a.eqName || "",
        a.area || "",
        a.fuente || "",
        a.tecnico || ""
      ]);
    }
  }
  
  return { success: true };
}

// ==========================================
// GOOGLE DRIVE & PROYECTOS VIVOS HELPERS
// ==========================================

function getOrCreateDriveFolder(folderPath) {
  var parts = folderPath.split("/");
  var parent = DriveApp.getRootFolder();
  for (var i = 0; i < parts.length; i++) {
    var name = parts[i].trim();
    if (!name) continue;
    var folders = parent.getFoldersByName(name);
    if (folders.hasNext()) {
      parent = folders.next();
    } else {
      parent = parent.createFolder(name);
    }
  }
  return parent;
}

function uploadImageToDrive(base64Data, fileName, folderName) {
  try {
    if (!base64Data) return { success: false, error: "No base64 data provided" };
    var folder = getOrCreateDriveFolder(folderName || "MTI_Fotos_Proyectos");
    var mimeType = "image/jpeg";
    var cleanBase64 = base64Data;
    if (base64Data.indexOf("data:") === 0) {
      var matches = base64Data.match(/^data:(.*?);base64,(.*)$/);
      if (matches) {
        mimeType = matches[1];
        cleanBase64 = matches[2];
      }
    }
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, mimeType, fileName || ("foto_" + Date.now() + ".jpg"));
    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    var fileUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
    return { success: true, url: fileUrl, fileId: file.getId() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function uploadPDFToDrive(base64Data, fileName, folderName) {
  try {
    if (!base64Data) return { success: false, error: "No base64 data provided" };
    var folder = getOrCreateDriveFolder(folderName || "MTI_Dossiers_PDF");
    var cleanBase64 = base64Data;
    if (base64Data.indexOf("data:") === 0) {
      cleanBase64 = base64Data.split(",")[1];
    }
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, "application/pdf", fileName || ("Dossier_" + Date.now() + ".pdf"));
    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    var fileUrl = file.getUrl();
    return { success: true, url: fileUrl, fileId: file.getId() };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function addProject(project) {
  try {
    var ss = getSpreadsheetTrabajos();
    var sheet = ss.getSheetByName("Proyectos");
    if (!sheet) {
      sheet = ss.insertSheet("Proyectos");
      sheet.appendRow(["ID", "Título", "Cliente", "Centro", "EquipoID", "EquipoNombre", "TécnicoLíder", "Estado", "FechaInicio", "FechaCierre", "Diagnóstico", "DossierURL"]);
    }
    sheet.appendRow([
      project.id || ("PRY-" + Date.now()),
      project.titulo || "",
      project.cliente || "",
      project.centro || "",
      project.equipoId || "",
      project.equipoNombre || "",
      project.tecnicoLider || "",
      project.estado || "EN CURSO",
      project.fechaInicio || new Date().toISOString().substring(0, 10),
      project.fechaCierre || "",
      project.diagnostico || "",
      project.dossierUrl || ""
    ]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function addProjectEvent(projectId, event) {
  try {
    var ss = getSpreadsheetTrabajos();
    var sheet = ss.getSheetByName("Bitacora_Eventos");
    if (!sheet) {
      sheet = ss.insertSheet("Bitacora_Eventos");
      sheet.appendRow(["ID", "ProyectoID", "FechaHora", "Técnico", "Tipo", "Descripción", "FotosURLs"]);
    }
    var photoUrl = event.fotoUrl || "";
    if (event.fotoBase64 && !photoUrl) {
      var res = uploadImageToDrive(event.fotoBase64, "foto_" + Date.now() + ".jpg", "MTI_Fotos_Proyectos/" + projectId);
      if (res.success) photoUrl = res.url;
    }
    sheet.appendRow([
      event.id || ("EVT-" + Date.now()),
      projectId || "",
      event.fechaHora || new Date().toISOString(),
      event.tecnico || "",
      event.tipo || "Inspección",
      event.descripcion || "",
      photoUrl
    ]);
    return { success: true, photoUrl: photoUrl };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function closeProject(projectId, dossier) {
  try {
    var ss = getSpreadsheetTrabajos();
    var sheet = ss.getSheetByName("Proyectos");
    var dossierUrl = "";
    if (dossier && dossier.pdfBase64) {
      var pdfRes = uploadPDFToDrive(dossier.pdfBase64, "Dossier_" + projectId + ".pdf", "MTI_Dossiers_PDF/" + (dossier.centro || "General"));
      if (pdfRes.success) dossierUrl = pdfRes.url;
    }
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === projectId) {
          sheet.getRange(i + 1, 8).setValue("CERRADO");
          sheet.getRange(i + 1, 10).setValue(new Date().toISOString().substring(0, 10));
          if (dossierUrl) sheet.getRange(i + 1, 12).setValue(dossierUrl);
          break;
        }
      }
    }
    return { success: true, dossierUrl: dossierUrl };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

