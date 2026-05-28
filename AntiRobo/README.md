# AntiRobo (prueba)

Bot de Telegram en C# para tu propia PC con Windows 11. **Solo responde cuando
tú le mandas un comando**; nunca envía nada por su cuenta. Uso personal /
antirrobo en tu propio equipo.

## Comandos

- `/foto` — foto de la webcam
- `/pantalla` — captura de pantalla
- `/audio [segundos]` — graba audio del micrófono (10s por defecto)
- `/ubicacion` — ubicación aproximada por IP
- `/id` — muestra tu chat ID
- `/ayuda` — lista de comandos

## Configuración (una sola vez)

1. En Telegram, habla con **@BotFather** → `/newbot` → copia el **token**.
2. Pega el token en `config.json` (campo `BotToken`).
3. Ejecuta el bot (ver abajo), abre tu bot en Telegram y manda `/id`.
   Copia el número y ponlo en `config.json` (campo `AllowedChatId`).
   Así el bot **solo te obedecerá a ti**.

```json
{
  "BotToken": "123456:ABC-DEF...",
  "AllowedChatId": 987654321
}
```

## Compilar y ejecutar (en tu Windows 11)

Necesitas el SDK de .NET 8. Desde la carpeta `AntiRobo`:

```powershell
dotnet restore
dotnet run
```

Para generar un .exe suelto:

```powershell
dotnet publish -c Release -r win-x64 --self-contained false
# salida en bin\Release\net8.0-windows\win-x64\publish\
```

## Sobre el antivirus

Capturar cámara/mic/pantalla y enviarlo a Telegram tiene la misma firma que un
spyware, así que Defender puede marcarlo. Para uso propio:

1. Agrega la carpeta del .exe a **exclusiones** de Windows Defender.
2. **Firma el ejecutable** (al final, como acordamos) para que no se re-marque
   tras cada actualización de Defender.

## Pendiente / posible v2

- GPS real con `Windows.Devices.Geolocation` (en vez de ubicación por IP).
- Arranque automático con Windows (tarea programada o servicio).
- Firma del ejecutable con certificado.
