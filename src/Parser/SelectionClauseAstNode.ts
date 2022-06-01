import { FieldAstNode } from "./FieldAstNode";
import { IAstNode } from "./IAstNode";

/**
 * SELECTION_CLAUSE :=
 * /select/i FIELDS
 */
export class SelectionClauseAstNode implements IAstNode {
  static type = "SELECTION_CLAUSE"
  type = SelectionClauseAstNode.type
  constructor(private fields: FieldAstNode[]) { }
}