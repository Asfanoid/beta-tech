"use client";

import { useCallback, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  AllowableStatuses,
  Part,
  UpdatePartInput,
} from "@/domains/parts/types";
import type { PartCatalogModel } from "@/features/api-explorer/hooks/use-part-catalog";
import {
  BrowserApiError,
  requestJson,
} from "@/lib/api/browser-client";
import { getUserFacingApiError } from "@/lib/api/user-facing-error";

// Status choices are only usable when they were returned for the part as currently displayed.
function statusChoicesDescribePart(
  statuses: AllowableStatuses | null,
  part: Part | null,
): boolean {
  return Boolean(
    statuses &&
      part &&
      statuses.partUuid === part.uuid &&
      statuses.currentStatus === part.status,
  );
}

// An update whose response was lost. It stays recorded across selection changes so that
// no further write is allowed until a read shows whether it was applied.
export type UncertainUpdate = {
  partUuid: string;
  partLabel: string;
  input: UpdatePartInput;
};

export type VerificationMessage = {
  tone: "success" | "error";
  text: string;
};

export function usePartWorkbench(
  partCatalog: Pick<
    PartCatalogModel,
    "loadPart" | "refreshPart" | "replacePart"
  >,
) {
  const { loadPart, refreshPart, replacePart } = partCatalog;
  const [selectedPartUuid, setSelectedPartUuid] = useState<string | null>(
    null,
  );
  const [part, setPart] = useState<Part | null>(null);
  const [partLoading, setPartLoading] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);
  const [allowableStatuses, setAllowableStatuses] =
    useState<AllowableStatuses | null>(null);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusesError, setStatusesError] = useState<string | null>(null);
  const [unitDraft, setUnitDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<Part["status"] | "">("");
  const [editMode, setEditMode] = useState<"status" | "unit" | null>(null);
  const [confirmSharedUpdate, setConfirmSharedUpdate] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [uncertainUpdate, setUncertainUpdate] =
    useState<UncertainUpdate | null>(null);
  const [verificationMessage, setVerificationMessage] =
    useState<VerificationMessage | null>(null);
  const [outcomeCheckPending, setOutcomeCheckPending] = useState(false);
  const partRequestId = useRef(0);
  const statusesRequestId = useRef(0);
  const mutationLock = useRef(false);
  const outcomeCheckLock = useRef(false);
  const displayedPartUuid = useRef<string | null>(null);
  const statusChoicesCurrent = statusChoicesDescribePart(
    allowableStatuses,
    part,
  );

  const resetPartState = useCallback(() => {
    partRequestId.current++;
    statusesRequestId.current++;
    setPart(null);
    setPartLoading(false);
    setPartError(null);
    setAllowableStatuses(null);
    setStatusesLoading(false);
    setStatusesError(null);
    setUnitDraft("");
    setStatusDraft("");
    setEditMode(null);
    setConfirmSharedUpdate(false);
    setUpdatePending(false);
    setUpdateError(null);
    setUpdateSuccess(null);
    setVerificationMessage(null);
    displayedPartUuid.current = null;
  }, []);

  const loadAllowableStatuses = useCallback(async (uuid: string) => {
    const requestId = ++statusesRequestId.current;
    setAllowableStatuses(null);
    setStatusesLoading(true);
    setStatusesError(null);

    try {
      const result = await requestJson<AllowableStatuses>(
        `/api/parts/${encodeURIComponent(uuid)}/allowable-statuses`,
      );
      if (requestId === statusesRequestId.current) {
        setAllowableStatuses(result);
        return true;
      }
      return false;
    } catch (error) {
      if (requestId === statusesRequestId.current) {
        setAllowableStatuses(null);
        setStatusesError(
          getUserFacingApiError(error, "status-choices"),
        );
      }
      return false;
    } finally {
      if (requestId === statusesRequestId.current) {
        setStatusesLoading(false);
      }
    }
  }, []);

  const lookupPart = useCallback(
    async (partUuid: string, forceRefresh = false) => {
      resetPartState();
      const requestId = partRequestId.current;
      displayedPartUuid.current = partUuid;
      setSelectedPartUuid(partUuid);
      setPartLoading(true);

      try {
        const result = await (forceRefresh
          ? refreshPart(partUuid)
          : loadPart(partUuid));
        if (requestId !== partRequestId.current) {
          return;
        }

        setPart(result);
        setUnitDraft(result.unit);
        void loadAllowableStatuses(result.uuid);
      } catch (error) {
        if (requestId === partRequestId.current) {
          setPartError(getUserFacingApiError(error, "part"));
        }
      } finally {
        if (requestId === partRequestId.current) {
          setPartLoading(false);
        }
      }
    },
    [loadAllowableStatuses, loadPart, refreshPart, resetPartState],
  );

  const clearSelection = useCallback(() => {
    resetPartState();
    setSelectedPartUuid(null);
  }, [resetPartState]);

  const refreshPartAndStatuses = useCallback(() => {
    if (selectedPartUuid) {
      void lookupPart(selectedPartUuid, true);
    }
  }, [lookupPart, selectedPartUuid]);

  const changeUnit = useCallback((value: string) => {
    setUnitDraft(value);
    setUpdateError(null);
    setUpdateSuccess(null);
  }, []);

  const beginStatusChange = useCallback(
    async (status: Part["status"]) => {
      if (
        !part ||
        partLoading ||
        statusesLoading ||
        updatePending ||
        uncertainUpdate ||
        outcomeCheckPending ||
        statusesError ||
        !statusChoicesCurrent ||
        !allowableStatuses?.allowableStatuses.includes(status) ||
        status === part.status
      ) {
        return;
      }

      const selectedPart = part;
      const partRequest = ++partRequestId.current;
      const statusesRequest = ++statusesRequestId.current;
      setPartLoading(true);
      setPartError(null);
      setAllowableStatuses(null);
      setStatusesLoading(true);
      setStatusesError(null);
      setEditMode("status");
      setStatusDraft(status);
      setConfirmSharedUpdate(false);
      setUpdateError(null);
      setUpdateSuccess(null);

      try {
        const [partResult, statusesResult] = await Promise.allSettled([
          refreshPart(selectedPart.uuid),
          requestJson<AllowableStatuses>(
            `/api/parts/${encodeURIComponent(selectedPart.uuid)}/allowable-statuses`,
          ),
        ]);
        if (
          partRequest !== partRequestId.current ||
          statusesRequest !== statusesRequestId.current
        ) {
          return;
        }

        if (partResult.status === "fulfilled") {
          replacePart(partResult.value);
          setPart(partResult.value);
          setUnitDraft(partResult.value.unit);
        } else {
          setPartError(getUserFacingApiError(partResult.reason, "part"));
        }

        if (statusesResult.status === "fulfilled") {
          setAllowableStatuses(statusesResult.value);
        } else {
          setAllowableStatuses(null);
          setStatusesError(
            getUserFacingApiError(statusesResult.reason, "status-choices"),
          );
        }

        if (
          partResult.status === "rejected" ||
          statusesResult.status === "rejected"
        ) {
          if (
            partResult.status === "rejected" &&
            statusesResult.status === "fulfilled"
          ) {
            setAllowableStatuses(null);
            setStatusesError(
              "Refresh the part details before using status choices.",
            );
          }
          return;
        }

        const refreshedPart = partResult.value;
        const refreshedStatuses = statusesResult.value;
        if (!statusChoicesDescribePart(refreshedStatuses, refreshedPart)) {
          setStatusesError(
            "The refreshed part details and allowed statuses do not match. Refresh both before choosing a transition.",
          );
          return;
        }

        if (refreshedPart.status !== selectedPart.status) {
          setUpdateError(
            "The part status changed since it was loaded. Review the refreshed details and choose a current transition.",
          );
          return;
        }

        if (
          status === refreshedPart.status ||
          !refreshedStatuses.allowableStatuses.includes(status)
        ) {
          setUpdateError(
            "That status is no longer available. Review the refreshed transitions and choose a current option.",
          );
          return;
        }

        setConfirmSharedUpdate(true);
      } finally {
        if (
          partRequest === partRequestId.current &&
          statusesRequest === statusesRequestId.current
        ) {
          setPartLoading(false);
          setStatusesLoading(false);
        }
      }
    },
    [
      allowableStatuses,
      outcomeCheckPending,
      part,
      partLoading,
      refreshPart,
      replacePart,
      statusChoicesCurrent,
      statusesError,
      statusesLoading,
      uncertainUpdate,
      updatePending,
    ],
  );

  const beginUnitChange = useCallback(() => {
    if (!part) {
      return;
    }
    setEditMode("unit");
    setUnitDraft(part.unit);
    setConfirmSharedUpdate(false);
    setUpdateError(null);
    setUpdateSuccess(null);
  }, [part]);

  const cancelUpdate = useCallback(() => {
    setEditMode(null);
    setStatusDraft("");
    setUnitDraft(part?.unit ?? "");
    setConfirmSharedUpdate(false);
    setUpdateError(null);
  }, [part]);

  const checkUpdateOutcome = useCallback(
    async (update: UncertainUpdate | null = uncertainUpdate) => {
      if (!update || outcomeCheckLock.current) {
        return;
      }

      outcomeCheckLock.current = true;
      setOutcomeCheckPending(true);

      try {
        const currentPart = await refreshPart(update.partUuid);
        replacePart(currentPart);
        const updateIsVisible =
          (update.input.status === undefined ||
            currentPart.status === update.input.status) &&
          (update.input.unit === undefined ||
            currentPart.unit === update.input.unit);

        setUncertainUpdate(null);
        setVerificationMessage(
          updateIsVisible
            ? {
                tone: "success",
                text: `The current details of ${update.partLabel} confirm the update was applied.`,
              }
            : {
                tone: "error",
                text: `The latest details of ${update.partLabel} do not reflect the requested update. Review the current values before deciding whether to try again.`,
              },
        );

        if (displayedPartUuid.current === update.partUuid) {
          setPart(currentPart);
          setUnitDraft(currentPart.unit);
          setEditMode(null);
          setStatusDraft("");
          setConfirmSharedUpdate(false);
          await loadAllowableStatuses(currentPart.uuid);
        }
      } catch (error) {
        setVerificationMessage({
          tone: "error",
          text: `The update is still unverified. ${getUserFacingApiError(error, "part")} Retry the check before making another change.`,
        });
      } finally {
        outcomeCheckLock.current = false;
        setOutcomeCheckPending(false);
      }
    },
    [loadAllowableStatuses, refreshPart, replacePart, uncertainUpdate],
  );

  const reviewUpdate = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!part || editMode !== "unit") {
        return;
      }

      const unit = unitDraft.trim();
      if (unit === "" || unit === part.unit) {
        setUpdateError("Enter a different unit of measure.");
        return;
      }

      setUpdateError(null);
      setConfirmSharedUpdate(true);
    },
    [
      editMode,
      part,
      unitDraft,
    ],
  );

  const submitUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!part || !editMode || !confirmSharedUpdate || updatePending) {
        return;
      }
      if (mutationLock.current || uncertainUpdate || outcomeCheckPending) {
        return;
      }

      const input: UpdatePartInput = {};
      const unit = unitDraft.trim();
      if (editMode === "unit" && unit !== "" && unit !== part.unit) {
        input.unit = unit;
      }

      if (editMode === "status" && statusDraft) {
        if (
          !statusChoicesCurrent ||
          !allowableStatuses?.allowableStatuses.includes(statusDraft)
        ) {
          setUpdateError(
            "Refresh the available status changes before confirming this update.",
          );
          return;
        }
        if (statusDraft !== part.status) {
          input.status = statusDraft;
        }
      }

      if (Object.keys(input).length === 0) {
        setUpdateError("Review a valid part-definition change before confirming.");
        return;
      }

      const requestId = partRequestId.current;
      mutationLock.current = true;
      setUpdatePending(true);
      setUpdateError(null);
      setUpdateSuccess(null);

      try {
        const updatedPart = await requestJson<Part>(
          `/api/parts/${encodeURIComponent(part.uuid)}`,
          {
            method: "PUT",
            body: JSON.stringify(input),
          },
        );

        if (requestId !== partRequestId.current) {
          return;
        }

        replacePart(updatedPart);
        setPart(updatedPart);
        setUnitDraft(updatedPart.unit);
        setStatusDraft("");
        setEditMode(null);
        setConfirmSharedUpdate(false);
        setUpdateSuccess("The service confirmed the part update.");
        void loadAllowableStatuses(updatedPart.uuid);
      } catch (error) {
        const requestError =
          error instanceof BrowserApiError ? error : null;
        if (
          requestError &&
          (requestError.status === 0 || requestError.status >= 500)
        ) {
          const update: UncertainUpdate = {
            partUuid: part.uuid,
            partLabel: `${part.name} (${part.partNo})`,
            input,
          };
          setUncertainUpdate(update);
          if (requestId === partRequestId.current) {
            setEditMode(null);
            setStatusDraft("");
            setUnitDraft(part.unit);
            setConfirmSharedUpdate(false);
          }
          await checkUpdateOutcome(update);
          return;
        }

        if (requestId !== partRequestId.current) {
          return;
        }

        setUpdateError(
          input.status && requestError?.status === 400
            ? "The status change was rejected. Refreshing the available transitions."
            : getUserFacingApiError(error, "part-update"),
        );
        setConfirmSharedUpdate(false);
        if (input.status && requestError?.status === 400) {
          setEditMode("status");
          setStatusDraft("");
          void loadAllowableStatuses(part.uuid);
        } else {
          setEditMode(input.status ? "status" : "unit");
        }
      } finally {
        mutationLock.current = false;
        if (requestId === partRequestId.current) {
          setUpdatePending(false);
        }
      }
    },
    [
      allowableStatuses,
      confirmSharedUpdate,
      checkUpdateOutcome,
      editMode,
      loadAllowableStatuses,
      part,
      replacePart,
      statusChoicesCurrent,
      statusDraft,
      unitDraft,
      uncertainUpdate,
      outcomeCheckPending,
      updatePending,
    ],
  );

  return {
    part,
    partLoading,
    partError,
    allowableStatuses,
    statusChoicesCurrent,
    statusesLoading,
    statusesError,
    unitDraft,
    statusDraft,
    editMode,
    confirmSharedUpdate,
    updatePending,
    updateError,
    updateSuccess,
    uncertainUpdate,
    verificationMessage,
    outcomeCheckPending,
    lookupPart,
    checkUpdateOutcome,
    refreshPartAndStatuses,
    changeUnit,
    beginStatusChange,
    beginUnitChange,
    cancelUpdate,
    reviewUpdate,
    clearSelection,
    submitUpdate,
  };
}

export type PartWorkbenchModel = ReturnType<typeof usePartWorkbench>;
