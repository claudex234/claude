using NAudio.Wave;

namespace AntiRobo.Capture;

public static class AudioCapture
{
    // Graba 'seconds' segundos del microfono por defecto y devuelve un WAV.
    public static async Task<byte[]> RecordWavAsync(int seconds)
    {
        seconds = Math.Clamp(seconds, 1, 120);

        using var ms = new MemoryStream();
        using var waveIn = new WaveInEvent
        {
            WaveFormat = new WaveFormat(16000, 16, 1) // 16kHz mono, suficiente para voz
        };

        var tcs = new TaskCompletionSource();
        WaveFileWriter? writer = new(ms, waveIn.WaveFormat);

        waveIn.DataAvailable += (_, e) =>
        {
            writer?.Write(e.Buffer, 0, e.BytesRecorded);
        };
        waveIn.RecordingStopped += (_, _) =>
        {
            writer?.Flush();
            tcs.TrySetResult();
        };

        waveIn.StartRecording();
        await Task.Delay(TimeSpan.FromSeconds(seconds));
        waveIn.StopRecording();
        await tcs.Task;

        // Cerramos el writer SIN cerrar el MemoryStream subyacente.
        writer.Dispose();
        writer = null;

        return ms.ToArray();
    }
}
