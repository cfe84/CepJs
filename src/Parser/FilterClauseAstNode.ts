import { Comparator } from "../Lexer/TokenComparator";
import { FilterField } from "./FilterField";
import { IAstNode } from "./IAstNode";

export type FieldType = "*" | "qualified"

export class FilterClauseAstNode implements IAstNode {
  static type = "FILTER"
  type = FilterClauseAstNode.type;

  // Todo: Support actual boolean logic
  // This only for demo purposes
  constructor(public partA: FilterField, public comparator: Comparator, public partB: FilterField) {

  }
}