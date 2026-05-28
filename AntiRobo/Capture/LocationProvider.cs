using System.Text.Json;

namespace AntiRobo.Capture;

public static class LocationProvider
{
    private static readonly HttpClient Http = new();

    // Ubicacion aproximada por IP (sin clave, gratis).
    // NOTA: esto da la ubicacion de la conexion a internet, no GPS exacto.
    // Para GPS/WiFi real de Windows habria que usar Windows.Devices.Geolocation
    // (lo dejamos para una segunda version).
    public static async Task<string> GetApproximateAsync(CancellationToken ct)
    {
        var json = await Http.GetStringAsync(
            "http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon,isp,query",
            ct);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (root.GetProperty("status").GetString() != "success")
            return "No se pudo obtener la ubicacion por IP.";

        string City(string k) => root.TryGetProperty(k, out var v) ? v.ToString() : "?";
        double lat = root.GetProperty("lat").GetDouble();
        double lon = root.GetProperty("lon").GetDouble();

        return
            $"Ubicacion aproximada (por IP):\n" +
            $"Pais: {City("country")}\n" +
            $"Region: {City("regionName")}\n" +
            $"Ciudad: {City("city")}\n" +
            $"ISP: {City("isp")}\n" +
            $"IP: {City("query")}\n" +
            $"Coordenadas: {lat}, {lon}\n" +
            $"Mapa: https://www.google.com/maps?q={lat},{lon}";
    }
}
