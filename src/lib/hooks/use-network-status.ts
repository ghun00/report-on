"use client";

import { useState, useEffect, useCallback } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  }));

  const updateStatus = useCallback(() => {
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
        downlink?: number;
      };
    }).connection;

    setStatus({
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
    });
  }, []);

  useEffect(() => {
    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    const connection = (navigator as Navigator & {
      connection?: EventTarget;
    }).connection;
    
    if (connection) {
      connection.addEventListener("change", updateStatus);
    }

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      if (connection) {
        connection.removeEventListener("change", updateStatus);
      }
    };
  }, [updateStatus]);

  return status;
}
