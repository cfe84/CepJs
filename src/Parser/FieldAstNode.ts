import { FieldQualifier } from "./FieldQualifer";
import { IAstNode } from "./IAstNode";

export type FieldType = "*" | "qualified"

export class FieldAstNode implements IAstNode {
  static type = "FIELD"
  type = FieldAstNode.type;

  constructor(public fieldType: FieldType, public fieldQualifier?: FieldQualifier) {
  }
}