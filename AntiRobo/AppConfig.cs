using System.Text.Json;
using System.Text.Json.Serialization;

namespace AntiRobo;

public sealed class AppConfig
{
    [JsonPropertyName("BotToken")]
    public string BotToken { get; set; } = "";

    // Tu chat ID personal. El bot SOLO responde a este chat.
    [JsonPropertyName("AllowedChatId")]
    public long AllowedChatId { get; set; }

    public static AppConfig Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "config.json");
        if (!File.Exists(path))
            throw new FileNotFoundException(
                "No se encontro config.json junto al ejecutable.", path);

        var json = File.ReadAllText(path);
        var cfg = JsonSerializer.Deserialize<AppConfig>(json)
                  ?? throw new InvalidOperationException("config.json invalido.");

        if (string.IsNullOrWhiteSpace(cfg.BotToken) ||
            cfg.BotToken.StartsWith("PEGA_AQUI"))
            throw new InvalidOperationException(
                "Falta el BotToken en config.json (pidelo a @BotFather).");

        return cfg;
    }
}
