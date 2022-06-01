import { FilterClauseAstNode } from "./FilterClauseAstNode";
import { IAstNode } from "./IAstNode";

export class JoinAstNode implements IAstNode {
  static type = "JOIN"
  type = JoinAstNode.type

  constructor(public input: string, public on: FilterClauseAstNode) { }
}