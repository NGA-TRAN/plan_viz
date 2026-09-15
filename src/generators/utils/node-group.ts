import { ExcalidrawElement, ExcalidrawText } from '../../types/excalidraw.types';

/**
 * Adds `groupId` to an element if it is not already a member.
 */
export function addGroupId(element: ExcalidrawElement, groupId: string): void {
  if (!element.groupIds.includes(groupId)) {
    element.groupIds = [...element.groupIds, groupId];
  }
}

function isText(element: ExcalidrawElement): element is ExcalidrawText {
  return element.type === 'text';
}

/**
 * Groups a node rectangle with its in-box visuals (title, details, hash
 * tables, DynamicFilter). Arrows stay ungrouped so Excalidraw bindings can
 * stretch them when a box is dragged.
 */
export function groupNodeVisuals(
  elements: ExcalidrawElement[],
  rectId: string,
  groupId: string
): void {
  const rect = elements.find((element) => element.id === rectId);
  if (!rect) {
    return;
  }

  const pad = 2;
  const left = rect.x - pad;
  const right = rect.x + rect.width + pad;
  const top = rect.y - pad;
  const bottom = rect.y + rect.height + pad;

  for (const element of elements) {
    if (element.type === 'arrow') {
      continue;
    }
    if (element.id === rectId) {
      addGroupId(element, groupId);
      continue;
    }
    if (isText(element) && element.containerId === rectId) {
      addGroupId(element, groupId);
      continue;
    }
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    if (centerX >= left && centerX <= right && centerY >= top && centerY <= bottom) {
      addGroupId(element, groupId);
    }
  }
}
