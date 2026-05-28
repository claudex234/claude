using Telegram.Bot;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using AntiRobo;
using AntiRobo.Capture;

internal class Program
{
    private static AppConfig _config = null!;

    private const string Help =
        "AntiRobo - comandos disponibles:\n" +
        "/foto - foto de la webcam\n" +
        "/pantalla - captura de pantalla\n" +
        "/audio [segundos] - graba audio del microfono (por defecto 10s)\n" +
        "/ubicacion - ubicacion aproximada por IP\n" +
        "/ayuda - muestra esta ayuda\n" +
        "/id - muestra tu chat ID";

    private static async Task Main()
    {
        _config = AppConfig.Load();
        var bot = new TelegramBotClient(_config.BotToken);

        using var cts = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };

        var me = await bot.GetMe(cts.Token);
        Console.WriteLine($"Bot @{me.Username} en marcha. Esperando comandos...");
        if (_config.AllowedChatId == 0)
            Console.WriteLine("AVISO: AllowedChatId = 0. Envia /id al bot para obtener tu " +
                              "chat ID y ponlo en config.json para restringir el acceso.");

        bot.StartReceiving(
            updateHandler: HandleUpdate,
            errorHandler: HandleError,
            receiverOptions: new ReceiverOptions { AllowedUpdates = [UpdateType.Message] },
            cancellationToken: cts.Token);

        Console.WriteLine("Presiona Ctrl+C para salir.");
        try { await Task.Delay(Timeout.Infinite, cts.Token); }
        catch (OperationCanceledException) { /* salida limpia */ }
    }

    private static async Task HandleUpdate(ITelegramBotClient bot, Update update, CancellationToken ct)
    {
        if (update.Message is not { Text: { } text } msg)
            return;

        long chatId = msg.Chat.Id;
        var parts = text.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var cmd = parts.Length > 0 ? parts[0].ToLowerInvariant() : "";

        // /id no requiere autorizacion: sirve para que conozcas tu chat ID.
        if (cmd == "/id")
        {
            await bot.SendMessage(chatId, $"Tu chat ID es: {chatId}", cancellationToken: ct);
            return;
        }

        // Seguridad: el bot solo obedece a TU chat.
        if (_config.AllowedChatId != 0 && chatId != _config.AllowedChatId)
        {
            Console.WriteLine($"Intento no autorizado desde chat {chatId}: {text}");
            return; // silencio total ante desconocidos
        }

        try
        {
            switch (cmd)
            {
                case "/start":
                case "/ayuda":
                    await bot.SendMessage(chatId, Help, cancellationToken: ct);
                    break;

                case "/pantalla":
                    await bot.SendMessage(chatId, "Capturando pantalla...", cancellationToken: ct);
                    var shot = ScreenCapture.CaptureJpeg();
                    await bot.SendPhoto(chatId, InputFile.FromStream(new MemoryStream(shot), "pantalla.jpg"),
                        cancellationToken: ct);
                    break;

                case "/foto":
                    await bot.SendMessage(chatId, "Tomando foto de la webcam...", cancellationToken: ct);
                    var pic = WebcamCapture.CaptureJpeg();
                    await bot.SendPhoto(chatId, InputFile.FromStream(new MemoryStream(pic), "webcam.jpg"),
                        cancellationToken: ct);
                    break;

                case "/audio":
                    int secs = parts.Length > 1 && int.TryParse(parts[1], out var s) ? s : 10;
                    await bot.SendMessage(chatId, $"Grabando {secs}s de audio...", cancellationToken: ct);
                    var wav = await AudioCapture.RecordWavAsync(secs);
                    await bot.SendAudio(chatId, InputFile.FromStream(new MemoryStream(wav), "audio.wav"),
                        cancellationToken: ct);
                    break;

                case "/ubicacion":
                    await bot.SendMessage(chatId, "Obteniendo ubicacion...", cancellationToken: ct);
                    var loc = await LocationProvider.GetApproximateAsync(ct);
                    await bot.SendMessage(chatId, loc, cancellationToken: ct);
                    break;

                default:
                    await bot.SendMessage(chatId, "Comando desconocido. Usa /ayuda", cancellationToken: ct);
                    break;
            }
        }
        catch (Exception ex)
        {
            await bot.SendMessage(chatId, $"Error: {ex.Message}", cancellationToken: ct);
            Console.WriteLine(ex);
        }
    }

    private static Task HandleError(ITelegramBotClient bot, Exception ex, CancellationToken ct)
    {
        Console.WriteLine($"Error de polling: {ex.Message}");
        return Task.CompletedTask;
    }
}
