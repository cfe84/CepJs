import { IAstNode } from "./IAstNode";
import { JoinAstNode } from "./JoinAstNode";

export class SourceClauseAstNode implements IAstNode {
  static type = "SOURCE_CLAUSE"
  type = SourceClauseAstNode.type
  // mainInput might go at some point. Also I think we'll need a qualifier class
  // to support aliases and such.
  constructor(public mainInput: string, public joins: JoinAstNode[]) { }
}