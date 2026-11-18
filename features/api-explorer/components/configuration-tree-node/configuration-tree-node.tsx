import { useEffect } from "react";
import type { Configuration } from "@/domains/configurations/types";
import type { Part } from "@/domains/parts/types";
import { cx } from "../class-names";
import controlStyles from "../controls.module.css";
import feedbackStyles from "../feedback.module.css";
import panelStyles from "../panel.module.css";
import styles from "./configuration-tree-node.module.css";

const classNames = {
  ...panelStyles,
  ...controlStyles,
  ...feedbackStyles,
  ...styles,
};

type ConfigurationTreeNodeProps = {
  node: Configuration;
  depth: number;
  path: string[];
  machineRootUuid: string;
  childrenByParent: Record<string, Configuration[]>;
  loadingByParent: Record<string, boolean>;
  errorsByParent: Record<string, string>;
  partsByUuid: Record<string, Part>;
  loadingPartsByUuid: Record<string, boolean>;
  partErrorsByUuid: Record<string, string>;
  expandedIds: Set<string>;
  selectedConfigurationUuid: string | null;
  interactionDisabled: boolean;
  onToggle: (node: Configuration) => void;
  onRetry: (parentUuid: string) => void;
  onLoadPart: (partUuid: string) => Promise<Part>;
  onRetryPart: (partUuid: string) => void;
  onUpdateSelectedPath: (path: string[]) => void;
  onSelect: (node: Configuration, path: string[]) => void;
};

export function ConfigurationTreeNode({
  node,
  depth,
  path,
  machineRootUuid,
  childrenByParent,
  loadingByParent,
  errorsByParent,
  partsByUuid,
  loadingPartsByUuid,
  partErrorsByUuid,
  expandedIds,
  selectedConfigurationUuid,
  interactionDisabled,
  onToggle,
  onRetry,
  onLoadPart,
  onRetryPart,
  onUpdateSelectedPath,
  onSelect,
}: ConfigurationTreeNodeProps) {
  const part = partsByUuid[node.partUuid];
  const partLoading = loadingPartsByUuid[node.partUuid] === true;
  const partError = partErrorsByUuid[node.partUuid];
  const isExpanded = expandedIds.has(node.uuid);
  const children = childrenByParent[node.uuid];
  const isLeaf = children !== undefined && children.length === 0;
  const isLoading = loadingByParent[node.uuid] === true;
  const hasChildren = children !== undefined && children.length > 0;
  const hasChildrenError = Boolean(errorsByParent[node.uuid]);
  const isUnknown = !isLeaf && !hasChildren && !isLoading && !hasChildrenError;
  const isMachineRoot = node.uuid === machineRootUuid;
  const title = isMachineRoot
    ? `Time Machine ${node.endUnitSerialNo ?? "(serial unavailable)"}`
    : part
      ? `${part.name} · ${part.partNo}`
      : partError
        ? "Component details unavailable"
        : "Loading component details";
  useEffect(() => {
    if (!part && !partError) {
      void onLoadPart(node.partUuid).catch(() => undefined);
    }
  }, [node.partUuid, onLoadPart, part, partError]);

  useEffect(() => {
    if (selectedConfigurationUuid === node.uuid && part) {
      onUpdateSelectedPath([...path, title]);
    }
  }, [
    node.uuid,
    onUpdateSelectedPath,
    path,
    part,
    selectedConfigurationUuid,
    title,
  ]);

  return (
    <li className={cx(classNames["configuration-tree-item"])}>
      <div
        className={cx(
          classNames["configuration-tree-row"],
          selectedConfigurationUuid === node.uuid &&
            classNames["configuration-tree-row-selected"],
        )}
        data-expansion-state={
          isLeaf
            ? "leaf"
            : isLoading
              ? "loading"
              : hasChildren
                ? "has-children"
                : isUnknown
                  ? "unknown"
                  : "error"
        }
        style={{ paddingLeft: `${depth * 18 + 10}px` }}
      >
        {isLeaf ? (
          <span
            className={cx(classNames["tree-leaf-indicator"])}
            role="img"
            aria-label="No further components"
            title="No further components"
          >
            <span aria-hidden="true" />
          </span>
        ) : (
          <button
            className={cx(classNames["tree-toggle"])}
            type="button"
            aria-label={
              isLoading
                ? `Checking assembly for ${title}`
                : hasChildren
                  ? `${isExpanded ? "Collapse" : "Expand"} ${title}`
                  : `Check for child components of ${title}`
            }
            title={
              isLoading
                ? "Checking assembly"
                : hasChildren
                  ? `${isExpanded ? "Collapse" : "Expand"} components`
                  : "Children not checked. Select to check for components."
            }
            aria-expanded={isExpanded}
            onClick={() => onToggle(node)}
            disabled={isLoading || interactionDisabled}
          >
            {isLoading ? (
              <span className={cx(classNames["tree-loading-indicator"])} aria-hidden="true" />
            ) : (
              <span
                className={cx(
                  classNames["tree-chevron"],
                  isExpanded && classNames["tree-chevron-expanded"],
                )}
                aria-hidden="true"
              />
            )}
          </button>
        )}
        <button
          className={cx(classNames["tree-select"])}
          type="button"
          aria-current={
            selectedConfigurationUuid === node.uuid ? "true" : undefined
          }
          onClick={() => onSelect(node, [...path, title])}
          disabled={interactionDisabled}
        >
          <span className={cx(classNames["tree-node-title"])}>{title}</span>
          <span className={cx(classNames["tree-node-meta"])}>
            {isMachineRoot && part ? `${part.name} · ${part.partNo} · ` : ""}
            Qty {node.quantity}
          </span>
        </button>
      </div>

      {partError && (
        <div
          className={cx(classNames["tree-error"])}
          style={{ paddingLeft: `${depth * 18 + 54}px` }}
        >
          <p role="alert">{partError}</p>
          <button
            className={cx(classNames["button"], classNames["button-quiet"])}
            type="button"
            onClick={() => onRetryPart(node.partUuid)}
            disabled={partLoading || interactionDisabled}
          >
            {partLoading ? "Retrying..." : "Retry part details"}
          </button>
        </div>
      )}

      {isLoading && (
        <p
          className={cx(classNames["tree-message"])}
          role="status"
          style={{ paddingLeft: `${depth * 18 + 54}px` }}
        >
          Checking assembly...
        </p>
      )}

      {errorsByParent[node.uuid] && (
        <div
          className={cx(classNames["tree-error"])}
          style={{ paddingLeft: `${depth * 18 + 54}px` }}
        >
          <p role="alert">{errorsByParent[node.uuid]}</p>
          <button
            className={cx(classNames["button"], classNames["button-quiet"])}
            type="button"
            onClick={() => onRetry(node.uuid)}
            disabled={interactionDisabled}
          >
            Retry
          </button>
        </div>
      )}

      {isExpanded && hasChildren && (
        <ul className={cx(classNames["configuration-tree-list"])}>
          {children.map((child) => (
            <ConfigurationTreeNode
              key={child.uuid}
              node={child}
              depth={depth + 1}
              path={[...path, title]}
              machineRootUuid={machineRootUuid}
              childrenByParent={childrenByParent}
              loadingByParent={loadingByParent}
              errorsByParent={errorsByParent}
              partsByUuid={partsByUuid}
              loadingPartsByUuid={loadingPartsByUuid}
              partErrorsByUuid={partErrorsByUuid}
              expandedIds={expandedIds}
              selectedConfigurationUuid={selectedConfigurationUuid}
              interactionDisabled={interactionDisabled}
              onToggle={onToggle}
              onRetry={onRetry}
              onLoadPart={onLoadPart}
              onRetryPart={onRetryPart}
              onUpdateSelectedPath={onUpdateSelectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
