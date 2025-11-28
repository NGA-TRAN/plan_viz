/**
 * Node information returned by node generators
 * Contains positioning, sizing, and connection information for a node
 */
export interface NodeInfo {
  /** X coordinate of the node */
  x: number;
  /** Y coordinate of the node (bottom of subtree) */
  y: number;
  /** Width of the node rectangle */
  width: number;
  /** Height of the node rectangle */
  height: number;
  /** ID of the rectangle element */
  rectId: string;
  /** Number of input arrows this node expects */
  inputArrowCount: number;
  /** X positions where input arrows connect to this node */
  inputArrowPositions: number[];
  /** Output columns produced by this node */
  outputColumns: string[];
  /** Output sort order (columns that are sorted) */
  outputSortOrder: string[];
}

