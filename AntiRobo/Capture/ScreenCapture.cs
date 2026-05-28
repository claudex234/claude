using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Runtime.Versioning;

namespace AntiRobo.Capture;

[SupportedOSPlatform("windows")]
public static class ScreenCapture
{
    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int nIndex);

    private const int SM_CXSCREEN = 0;
    private const int SM_CYSCREEN = 1;

    // Captura la pantalla principal y devuelve un JPEG en memoria.
    public static byte[] CaptureJpeg()
    {
        int width = GetSystemMetrics(SM_CXSCREEN);
        int height = GetSystemMetrics(SM_CYSCREEN);

        using var bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(bmp))
        {
            g.CopyFromScreen(0, 0, 0, 0, bmp.Size, CopyPixelOperation.SourceCopy);
        }

        using var ms = new MemoryStream();
        bmp.Save(ms, ImageFormat.Jpeg);
        return ms.ToArray();
    }
}
