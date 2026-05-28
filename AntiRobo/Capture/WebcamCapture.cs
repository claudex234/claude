using OpenCvSharp;

namespace AntiRobo.Capture;

public static class WebcamCapture
{
    // Toma una foto de la webcam (camara 0 por defecto) y devuelve un JPEG.
    public static byte[] CaptureJpeg(int cameraIndex = 0)
    {
        using var capture = new VideoCapture(cameraIndex);
        if (!capture.IsOpened())
            throw new InvalidOperationException(
                $"No se pudo abrir la camara {cameraIndex}.");

        using var frame = new Mat();

        // Algunas camaras devuelven los primeros frames en negro mientras
        // ajustan exposicion; descartamos unos cuantos.
        for (int i = 0; i < 5; i++)
            capture.Read(frame);

        if (frame.Empty())
            throw new InvalidOperationException("La camara no devolvio imagen.");

        Cv2.ImEncode(".jpg", frame, out var buffer);
        return buffer;
    }
}
