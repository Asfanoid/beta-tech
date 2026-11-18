# Interaction Design

## Design goal

Help a technician answer, in order: **Which machine? Where is the component? What is it? What change is safe?**

Use one Assembly Explorer for field and production work. On wide screens, keep the assembly and part details together. On narrow screens, show details without losing the selected machine or occurrence context.

## Machine and assembly

- Identify machines by serial number and make clear that search filters the machines already returned by the service.
- Show human-readable part names and numbers with the quantity used at that occurrence. Keep UUIDs in secondary technical details.
- Treat configuration rows as occurrences. Repeated occurrences of the same part remain independently selectable and keep their own quantity and assembly path.
- Keep selection separate from expand/collapse. When a node has no children, show a leaf indicator without shifting the row's content.
- Keep a failed child request local to its branch and provide retry without discarding the rest of the tree.

## Part inspection and updates

- Start with read-only part details. Label the part's current status separately from service-provided available transitions.
- A selected transition triggers a fresh part and transition read before confirmation. If the status changed or the transition is no longer available, do not open confirmation; show the current information and let the technician choose again.
- Place the unit-change action beside the displayed unit. Let the technician edit, review, cancel, and explicitly confirm.
- Before either update, name the shared part definition and explain that the change may affect every configuration that references it. Keep the selected machine and occurrence visible during confirmation.
- If an update response is lost, explain that the outcome is unknown. Verify current part details before allowing another write; never silently repeat the mutation. Technicians may keep browsing while writes are paused.

## Accessibility and feedback

- Support keyboard operation, visible focus, meaningful labels, and comfortable touch targets. Do not rely on hover or color alone.
- Show loading, empty, success, and error states where they occur. Distinguish an empty result from a failed request.
- Keep errors actionable and preserve unrelated machine and assembly context.
- Keep the service health check in a collapsed diagnostics area; it must not require IDs or API knowledge.
