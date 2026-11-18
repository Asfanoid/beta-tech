"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Configuration } from "@/domains/configurations/types";
import { requestJson } from "@/lib/api/browser-client";
import { getUserFacingApiError } from "@/lib/api/user-facing-error";

export function useConfigurationExplorer(selectedMachineUuid: string | null) {
  const [roots, setRoots] = useState<Configuration[] | null>(null);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [rootsError, setRootsError] = useState<string | null>(null);
  const [childrenByParent, setChildrenByParent] = useState<
    Record<string, Configuration[]>
  >({});
  const [loadingByParent, setLoadingByParent] = useState<
    Record<string, boolean>
  >({});
  const [errorsByParent, setErrorsByParent] = useState<Record<string, string>>(
    {},
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const pendingChildren = useRef(new Set<string>());

  const loadRoots = useCallback(async () => {
    setRootsLoading(true);
    setRootsError(null);
    try {
      setRoots(await requestJson<Configuration[]>("/api/configs/children"));
    } catch (error) {
      setRootsError(getUserFacingApiError(error, "machine-list"));
    } finally {
      setRootsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoots();
  }, [loadRoots]);

  const loadChildren = useCallback(async (uuid: string) => {
    if (pendingChildren.current.has(uuid)) {
      return null;
    }

    pendingChildren.current.add(uuid);
    setLoadingByParent((current) => ({ ...current, [uuid]: true }));
    setErrorsByParent((current) => {
      const next = { ...current };
      delete next[uuid];
      return next;
    });

    try {
      const children = await requestJson<Configuration[]>(
        `/api/configs/children?parentUuid=${encodeURIComponent(uuid)}`,
      );
      setChildrenByParent((current) => ({ ...current, [uuid]: children }));
      return children;
    } catch (error) {
      setErrorsByParent((current) => ({
        ...current,
        [uuid]: getUserFacingApiError(error, "assembly"),
      }));
      return null;
    } finally {
      pendingChildren.current.delete(uuid);
      setLoadingByParent((current) => ({ ...current, [uuid]: false }));
    }
  }, []);

  useEffect(() => {
    if (!selectedMachineUuid) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const children =
        childrenByParent[selectedMachineUuid] ??
        (await loadChildren(selectedMachineUuid));
      if (!cancelled && children && children.length > 0) {
        setExpandedIds((current) =>
          new Set(current).add(selectedMachineUuid),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childrenByParent, loadChildren, selectedMachineUuid]);

  const toggleNode = useCallback(
    async (node: Configuration) => {
      if (expandedIds.has(node.uuid)) {
        setExpandedIds((current) => {
          const next = new Set(current);
          next.delete(node.uuid);
          return next;
        });
        return;
      }

      const children =
        childrenByParent[node.uuid] ?? (await loadChildren(node.uuid));
      if (children && children.length > 0) {
        setExpandedIds((current) => new Set(current).add(node.uuid));
      }
    },
    [childrenByParent, expandedIds, loadChildren],
  );

  const retryChildren = useCallback(
    async (uuid: string) => {
      const children = await loadChildren(uuid);
      if (children && children.length > 0) {
        setExpandedIds((current) => new Set(current).add(uuid));
      }
    },
    [loadChildren],
  );

  return {
    roots,
    rootsLoading,
    rootsError,
    loadRoots,
    childrenByParent,
    loadingByParent,
    errorsByParent,
    expandedIds,
    loadChildren,
    toggleNode,
    retryChildren,
  };
}
