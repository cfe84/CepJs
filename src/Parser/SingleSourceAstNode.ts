import { IAstNode } from "./IAstNode";

export class SingleSourceAstNode implements IAstNode {
  static type = "SINGLE_SOURCE"
  type = SingleSourceAstNode.type
  constructor(public source: string) { }
}