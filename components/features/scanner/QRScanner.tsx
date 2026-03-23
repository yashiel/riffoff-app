"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CameraOff } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  scanning: boolean;
}

export function QRScanner({ onScan, scanning }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const startScanner = useCallback(async () => {
    if (scannerRef.current || !containerRef.current) return;
    setError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScanRef.current(decodedText);
        },
        () => {
          // Ignore scan failures (no QR detected in frame)
        },
      );

      setIsStarted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera access denied";
      setError(msg);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Already stopped
      }
      scannerRef.current = null;
      setIsStarted(false);
    }
  }, []);

  // Auto-start/stop based on scanning prop
  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [scanning, startScanner, stopScanner]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      {/* Camera viewport */}
      <div
        id="qr-reader"
        ref={containerRef}
        className="aspect-square w-full"
        style={{ minHeight: 300 }}
      />

      {/* Overlay when not scanning */}
      {!isStarted && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1c1c]">
          <Camera className="size-12 text-muted-foreground" />
          <p className="mt-3 text-[14px] text-muted-foreground">
            {scanning ? "Starting camera..." : "Press Start to begin scanning"}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1c1c] p-6">
          <CameraOff className="size-12 text-red-400" />
          <p className="mt-3 text-center text-[14px] text-red-400">{error}</p>
          <button
            onClick={startScanner}
            className="btn-primary mt-4 !py-2 !text-[12px]"
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* Scanning indicator */}
      {isStarted && scanning && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-coral" />
            <span className="text-[12px] font-medium text-white">Scanning...</span>
          </div>
        </div>
      )}
    </div>
  );
}
