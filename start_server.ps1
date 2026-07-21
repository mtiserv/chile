# start_server.ps1
# Servidor web local ligero para Piscicultura Sta Juana
# Permite guardar cambios directamente en el archivo database.js desde el navegador.

$port = 8080
$prefix = "http://localhost:$port/"
$basePath = $PSScriptRoot

# Kill existing listeners on port 8080 if any
$existingListeners = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($existingListeners) {
    Write-Host "Limpiando conexiones previas en el puerto $port..." -ForegroundColor Yellow
    foreach ($conn in $existingListeners) {
        if ($conn.OwningProcess -gt 0) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  SERVIDOR DE DESARROLLO INICIADO" -ForegroundColor Green
    Write-Host "  Dirección: http://localhost:$port/" -ForegroundColor Cyan
    Write-Host "  Los cambios se guardarán directamente en la carpeta." -ForegroundColor Yellow
    Write-Host "  Para detener el servidor, cierra esta ventana o presiona Ctrl+C" -ForegroundColor DarkGray
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Error "No se pudo iniciar el servidor. Verifica que el puerto $port no esté ocupado."
    exit 1
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }
    
    $request = $context.Request
    $response = $context.Response
    
    # Configurar CORS
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
    
    if ($request.HttpMethod -eq "OPTIONS") {
        $response.StatusCode = 200
        $response.Close()
        continue
    }
    
    # Endpoint de Status
    if ($request.Url.LocalPath -eq "/api/status" -and $request.HttpMethod -eq "GET") {
        $response.StatusCode = 200
        $response.ContentType = "text/plain"
        $buffer = [System.Text.Encoding]::UTF8.GetBytes("OK")
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.Close()
        continue
    }
    
    # Endpoint de Guardado Directo
    if ($request.Url.LocalPath -eq "/api/save" -and $request.HttpMethod -eq "POST") {
        Write-Host "[API] Recibiendo actualización de base de datos..." -ForegroundColor Cyan
        try {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd()
            
            $jsContent = "window.DB_PISCICULTURA = $body;"
            $outputFile = Join-Path $basePath "database.js"
            
            $jsContent | Out-File $outputFile -Encoding utf8 -Force
            
            Write-Host "[SISTEMA] Base de datos guardada en disco: $outputFile" -ForegroundColor Green
            
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("Guardado exitoso en disco")
            $response.ContentLength64 = $buffer.Length
            $response.ContentType = "text/plain"
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } catch {
            Write-Host "[ERROR] Fallo al guardar en disco: $_" -ForegroundColor Red
            $response.StatusCode = 500
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("Error interno al escribir en disco")
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
        continue
    }
    
    # Endpoint de Guardado de Imagen
    if ($request.Url.LocalPath -eq "/api/upload-image" -and $request.HttpMethod -eq "POST") {
        Write-Host "[API] Recibiendo carga de imagen..." -ForegroundColor Cyan
        try {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $bodyJson = $reader.ReadToEnd()
            
            # Convert JSON to PowerShell object
            $imgData = ConvertFrom-Json $bodyJson
            
            $filename = $imgData.filename
            $base64 = $imgData.base64
            
            # Strip the data:image/jpeg;base64, prefix if present
            if ($base64 -match '^data:image\/[a-zA-Z]+;base64,(.+)$') {
                $base64 = $Matches[1]
            }
            
            $imageBytes = [System.Convert]::FromBase64String($base64)
            
            # Create folder if it doesn't exist
            $folderPath = Join-Path $basePath "fotos_equipos"
            if (-not (Test-Path $folderPath)) {
                New-Item -ItemType Directory -Force -Path $folderPath | Out-Null
            }
            
            $outputFile = Join-Path $folderPath $filename
            [System.IO.File]::WriteAllBytes($outputFile, $imageBytes)
            
            Write-Host "[SISTEMA] Imagen guardada en disco: $outputFile" -ForegroundColor Green
            
            # Respond with the relative URL of the saved image
            $relativeUrl = "fotos_equipos/$filename"
            $responseJson = "{`"url`":`"$relativeUrl`"}"
            
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseJson)
            $response.ContentLength64 = $buffer.Length
            $response.ContentType = "application/json"
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } catch {
            Write-Host "[ERROR] Fallo al guardar imagen: $_" -ForegroundColor Red
            $response.StatusCode = 500
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"Fallo al guardar imagen en disco`"}")
            $response.ContentLength64 = $buffer.Length
            $response.ContentType = "application/json"
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
        continue
    }
    
    # Servir Archivos Estáticos
    $urlPath = $request.Url.LocalPath
    if ($urlPath -eq "/") {
        $urlPath = "/index.html"
    }
    
    $sanitizedPath = $urlPath.Replace('/', '\').TrimStart('\')
    $filePath = Join-Path $basePath $sanitizedPath
    
    if (Test-Path $filePath -PathType Leaf) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            
            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "text/javascript; charset=utf-8" }
            elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) { $response.ContentType = "image/jpeg" }
            elseif ($filePath.EndsWith(".png")) { $response.ContentType = "image/png" }
            
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {
            $response.StatusCode = 500
            Write-Host "[ERROR] Error al servir ${urlPath}: $_" -ForegroundColor Red
        }
    } else {
        $response.StatusCode = 404
        Write-Host "[HTTP 404] No encontrado: ${urlPath}" -ForegroundColor Yellow
    }
    $response.Close()
}

$listener.Close()
