import { FilterClauseAstNode } from "./FilterClauseAstNode";
import { FromClauseAstNode } from "./FromClauseAst";
import { IAstNode } from "./IAstNode";
import { OutputClauseAstNode } from "./OutputClauseAst";
import { SelectionClauseAstNode } from "./SelectionClauseAstNode";

/**
 * QUERY := SELECTION_CLAUSE FROM_CLAUSE OUTPUT_CLAUSE [FILTER_CLAUSE] [GROUPBY_CLAUSE]
 */
export class QueryAst implements IAstNode {
  static type = "QUERY"
  type = QueryAst.type
  constructor(
    public selectionClause: SelectionClauseAstNode,
    public fromClause: FromClauseAstNode,
    public outputClause: OutputClauseAstNode,
    public filterClause: FilterClauseAstNode | null) { }
}