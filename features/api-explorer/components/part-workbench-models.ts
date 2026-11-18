import type { FormEvent, ReactNode } from "react";
import type { Configuration } from "@/domains/configurations/types";
import type {
  AllowableStatuses,
  Part,
  PartStatus,
} from "@/domains/parts/types";

export type UnitEditorModel =
  | {
      state: "view";
      disabled: boolean;
      onBegin: () => void;
    }
  | {
      state: "editing";
      draft: string;
      error: string | null;
      disabled: boolean;
      canReview: boolean;
      onChange: (value: string) => void;
      onReview: (event: FormEvent<HTMLFormElement>) => void;
      onCancel: () => void;
    }
  | {
      state: "confirming";
      confirmation: ReactNode;
    };

export type TransitionViewModel = {
  choicesMatchPart: boolean;
  allowableStatuses: AllowableStatuses | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  selectionError: string | null;
  confirmation: ReactNode;
};

export type TransitionActions = {
  refreshChoices: () => void;
  retryChoices: () => void;
  refreshPart: () => void;
  select: (status: PartStatus) => void;
};

export type PartChangeIntent =
  | { kind: "status"; from: PartStatus; to: PartStatus }
  | { kind: "unit"; from: string; to: string };

export type SharedPartConfirmationModel = {
  part: Part;
  change: PartChangeIntent;
  machine: Configuration | null;
  occurrence: Configuration | null;
  path: string[];
  error: string | null;
  pending: boolean;
  canSubmit: boolean;
};

export type SharedPartConfirmationActions = {
  submit: (event: FormEvent<HTMLFormElement>) => void;
  cancel: () => void;
};
