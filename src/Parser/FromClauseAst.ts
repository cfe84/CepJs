import { IAstNode } from "./IAstNode";

export class FromClauseAstNode implements IAstNode {
  static type = "FROM_CLAUSE"
  type = FromClauseAstNode.type
  constructor(public input: string) { }
}