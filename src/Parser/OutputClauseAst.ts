import { IAstNode } from "./IAstNode";

export class OutputClauseAstNode implements IAstNode {
  static type = "OUTPUT_CLAUSE"
  type = OutputClauseAstNode.type
  constructor(public output: string) { }
}