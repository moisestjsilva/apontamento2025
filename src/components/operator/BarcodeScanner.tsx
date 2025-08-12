import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const BarcodeScanner = ({ onScan, onClose, isOpen }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      codeReader.current = new BrowserMultiFormatReader();
      
      const videoInputDevices = await codeReader.current.listVideoInputDevices();
      const selectedDeviceId = videoInputDevices[0]?.deviceId;

      if (videoRef.current && selectedDeviceId) {
        await codeReader.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              // Vibrate on successful scan
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
              onScan(result.getText());
              stopScanning();
              onClose();
            }
          }
        );
      }
    } catch (err) {
      setError("Erro ao acessar a câmera");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Escaneie o código</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex items-center justify-center p-4">
          {error ? (
            <Card className="w-full max-w-sm">
              <CardContent className="p-6 text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={startScanning} className="w-full">
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="relative w-full max-w-sm aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-lg border-2 border-primary"
                autoPlay
                playsInline
              />
              {/* Scan overlay */}
              <div className="absolute inset-4 border-2 border-primary/50 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-muted/30">
          <p className="text-center text-sm text-muted-foreground">
            Posicione o código de barras ou QR code dentro da área marcada
          </p>
        </div>
      </div>
    </div>
  );
};