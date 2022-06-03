import { IAstNode } from "./IAstNode";
import { JoinAstNode } from "./JoinAstNode";
import { SingleSourceAstNode } from "./SingleSourceAstNode";

export enum SOURCE_TYPE {
  join = "join",
  singleSource = "single source"
}

export class SourceClauseAstNode implements IAstNode {
  static type = "SOURCE_CLAUSE"

  type = SourceClauseAstNode.type
  // mainInput might go at some point. Also I think we'll need a qualifier class
  // to support aliases and such.
  constructor(public sourceType: SOURCE_TYPE, public value: SingleSourceAstNode | (JoinAstNode[])) { }
}