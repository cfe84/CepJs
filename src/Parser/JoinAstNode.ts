import { FilterClauseAstNode } from "./FilterClauseAstNode";
import { IAstNode } from "./IAstNode";

export class JoinAstNode implements IAstNode {
  static type = "JOIN_SOURCE"
  type = JoinAstNode.type

  constructor(public from: string, public to: string, public on: FilterClauseAstNode) { }
}