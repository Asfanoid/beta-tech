"use client";

import { useCallback, useRef, useState } from "react";
import type { Part } from "@/domains/parts/types";
import { requestJson } from "@/lib/api/browser-client";
import { getUserFacingApiError } from "@/lib/api/user-facing-error";

const MAX_CONCURRENT_PART_LOOKUPS = 4;

export function usePartCatalog() {
  const [partsByUuid, setPartsByUuid] = useState<Record<string, Part>>({});
  const [loadingPartsByUuid, setLoadingPartsByUuid] = useState<
    Record<string, boolean>
  >({});
  const [partErrorsByUuid, setPartErrorsByUuid] = useState<
    Record<string, string>
  >({});
  const partCache = useRef(new Map<string, Part>());
  const partRequests = useRef(new Map<string, Promise<Part>>());
  const activeRequests = useRef(0);
  const requestQueue = useRef<Array<() => void>>([]);

  const acquireRequestSlot = useCallback(async () => {
    if (activeRequests.current < MAX_CONCURRENT_PART_LOOKUPS) {
      activeRequests.current += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      requestQueue.current.push(resolve);
    });
  }, []);

  const releaseRequestSlot = useCallback(() => {
    const nextRequest = requestQueue.current.shift();
    if (nextRequest) {
      nextRequest();
    } else {
      activeRequests.current -= 1;
    }
  }, []);

  const loadPart = useCallback(
    (partUuid: string): Promise<Part> => {
      const cached = partCache.current.get(partUuid);
      if (cached) {
        return Promise.resolve(cached);
      }

      const pending = partRequests.current.get(partUuid);
      if (pending) {
        return pending;
      }

      setLoadingPartsByUuid((current) => ({ ...current, [partUuid]: true }));
      setPartErrorsByUuid((current) => {
        const next = { ...current };
        delete next[partUuid];
        return next;
      });

      const request = (async () => {
        await acquireRequestSlot();
        try {
          const part = await requestJson<Part>(
            `/api/parts/${encodeURIComponent(partUuid)}`,
          );
          if (part.uuid !== partUuid) {
            throw new Error(
              "The returned part did not match the requested component.",
            );
          }
          partCache.current.set(partUuid, part);
          setPartsByUuid((current) => ({ ...current, [partUuid]: part }));
          return part;
        } catch (error) {
          setPartErrorsByUuid((current) => ({
            ...current,
            [partUuid]: getUserFacingApiError(error, "part"),
          }));
          throw error;
        } finally {
          releaseRequestSlot();
          partRequests.current.delete(partUuid);
          setLoadingPartsByUuid((current) => ({
            ...current,
            [partUuid]: false,
          }));
        }
      })();
      partRequests.current.set(partUuid, request);
      return request;
    },
    [acquireRequestSlot, releaseRequestSlot],
  );

  const replacePart = useCallback((part: Part) => {
    partCache.current.set(part.uuid, part);
    setPartsByUuid((current) => ({ ...current, [part.uuid]: part }));
    setPartErrorsByUuid((current) => {
      const next = { ...current };
      delete next[part.uuid];
      return next;
    });
  }, []);

  const refreshPart = useCallback(
    (partUuid: string) => {
      if (!partRequests.current.has(partUuid)) {
        partCache.current.delete(partUuid);
        setPartsByUuid((current) => {
          const next = { ...current };
          delete next[partUuid];
          return next;
        });
      }
      return loadPart(partUuid);
    },
    [loadPart],
  );

  return {
    partsByUuid,
    loadingPartsByUuid,
    partErrorsByUuid,
    loadPart,
    refreshPart,
    replacePart,
  };
}

export type PartCatalogModel = ReturnType<typeof usePartCatalog>;
