import { IToken } from "../Lexer/IToken";
import { TokenComma } from "../Lexer/TokenComma";
import { TokenComparator } from "../Lexer/TokenComparator";
import { TokenDot } from "../Lexer/TokenDot";
import { TokenFrom } from "../Lexer/TokenFrom";
import { TokenGroupBy } from "../Lexer/TokenGroupBy";
import { TokenInto } from "../Lexer/TokenInto";
import { TokenName } from "../Lexer/TokenName";
import { TokenNumericValue } from "../Lexer/TokenNumericValue";
import { TokenSelect } from "../Lexer/TokenSelect";
import { TokenStar } from "../Lexer/TokenStar";
import { TokenStringValue } from "../Lexer/TokenStringValue";
import { TokenWhere } from "../Lexer/TokenWhere";
import { FieldAstNode } from "./FieldAstNode";
import { FieldQualifier } from "./FieldQualifer";
import { FilterClauseAstNode } from "./FilterClauseAstNode";
import { FilterField } from "./FilterField";
import { SourceClauseAstNode, SOURCE_TYPE } from "./SourceClauseAst";
import { OutputClauseAstNode } from "./OutputClauseAst";
import { QueryAst } from "./QueryAst";
import { SelectionClauseAstNode } from "./SelectionClauseAstNode";
import { TokenJoin } from "../Lexer/TokenJoin";
import { JoinAstNode } from "./JoinAstNode";
import { TokenOn } from "../Lexer/TokenOn";
import { SingleSourceAstNode } from "./SingleSourceAstNode";

/**
 * Create an unexpected token error
 * @param tokens 
 * @param expected Token that was expected
 * @returns 
 */
function unexpectedToken(tokens: IToken[], expected: string) {
  if (tokens.length === 0) {
    return Error(`Unexpected end of stream. Expected: ${expected}`)
  }
  return Error(`Unexpected token: ${tokens[0].type}. Expected: ${expected}`);
}

/**
 * Validates that next token is of type {expectedType}
 * @param tokens 
 * @param expectedType 
 * @returns 
 */
function nextIsType(tokens: IToken[], expectedType: string) {
  return tokens.length && tokens[0].type === expectedType
}

/**
 * Pops next token and returns it if it's of type ExpectedType
 * @param tokens 
 * @param expectedType 
 * @returns Returns next token or null if it doesn't match expected type
 */
function popIfType<ExpectedType extends IToken>(tokens: IToken[], expectedType: string): ExpectedType | null {
  if (nextIsType(tokens, expectedType)) {
    return tokens.shift() as ExpectedType;
  }
  return null
}

/**
 * Pops next token if it matches or throws an exception if it doesn't
 * @param tokens 
 * @param expectedType 
 * @returns 
 */
function popIfTypeThrowElse<ExpectedType extends IToken>(tokens: IToken[], expectedType: string): ExpectedType {
  const res = popIfType<ExpectedType>(tokens, expectedType)
  if (!res) {
    throw unexpectedToken(tokens, expectedType);
  }
  return res;
}

/**
 * Parses a list of tokens and returns the corresponding AST.
 */
export class Parser {
  static ParseQuery(tokens: IToken[]): QueryAst {
    const selectionClause = this.parseSelectionClause(tokens);
    const fromClause = this.parseSourceClause(tokens);
    const outputClause = this.parseOutputClause(tokens);
    const whereClause = this.parseWhereClause(tokens);
    return new QueryAst(selectionClause, fromClause, outputClause, whereClause);
  }

  /**
   * Parse the SELECT clause
   * @param tokens 
   * @returns 
   */
  private static parseSelectionClause(tokens: IToken[]): SelectionClauseAstNode {
    popIfTypeThrowElse(tokens, TokenSelect.type)
    return new SelectionClauseAstNode(Array.from(this.parseFields(tokens)));
  }

  /**
   * Parses the fields after "SELECT"
   * @param tokens 
   * @returns fields as a generator
   */
  private static *parseFields(tokens: IToken[]): Generator<FieldAstNode> {
    while (true) {
      const field = this.parseField(tokens)
      if (field) {
        yield field
      } else {
        return
      }
      popIfType(tokens, TokenComma.type)
    }
  }

  /**
   * Parses a single field, including "*"
   * @param tokens 
   * @returns 
   */
  private static parseField(tokens: IToken[]): FieldAstNode | null {
    if (popIfType(tokens, TokenStar.type)) {
      return new FieldAstNode("*")
    }
    const fieldQualifier = this.parseFieldQualifier(tokens)
    if (fieldQualifier === null) {
      return null;
    }
    return new FieldAstNode("qualified", fieldQualifier)
  }

  /**
   * Parses a field qualifier, i.e. a field name (e.g. input.fieldname)
   * @param tokens 
   * @returns 
   */
  private static parseFieldQualifier(tokens: IToken[]): FieldQualifier | null {
    const inputName = popIfType<TokenName>(tokens, TokenName.type)
    if (!inputName) {
      return null
    }
    const qualifiers: string[] = []
    while (popIfType(tokens, TokenDot.type)) {
      const qualifier = popIfTypeThrowElse<TokenName>(tokens, TokenName.type)
      qualifiers.push(qualifier.value)
    }
    return new FieldQualifier(inputName.value.toLowerCase(), qualifiers);
  }

  /**
   * Parses source clause made of FROM/JOIN
   * 
   * @param tokens 
   * @returns 
   */
  private static parseSourceClause(tokens: IToken[]): SourceClauseAstNode {
    popIfTypeThrowElse(tokens, TokenFrom.type)
    //TODO: Thoughts: we might have to move away from that, I don't think the
    // concept of main input actually makes sense, the model might be wrong.
    let fromInput = this.parseInput(tokens);
    const joins: JoinAstNode[] = []
    while (popIfType(tokens, TokenJoin.type)) {
      const toInput = this.parseInput(tokens);
      popIfTypeThrowElse(tokens, TokenOn.type);
      const filter = this.parseFilterClause(tokens);
      // TODO: This is wrong, fromInput should be determed using the filter.
      // This assumes that we're doing a JOIN doing A -> B -> C, but we might
      // actually do A -> B, A -> C.
      joins.push(new JoinAstNode(fromInput, toInput, filter));
      fromInput = toInput;
    }
    if (joins.length) {
      return new SourceClauseAstNode(SOURCE_TYPE.join, joins)
    } else {
      return new SourceClauseAstNode(SOURCE_TYPE.singleSource, new SingleSourceAstNode(fromInput));
    }
  }

  /**
   * I anticipate that this might change to an "input" class instead
   * but for now simplify by using a string
   * @param tokens 
   */
  private static parseInput(tokens: IToken[]): string {
    const input = popIfTypeThrowElse<TokenName>(tokens, TokenName.type);
    return input.value.toLowerCase()
  }

  /**
   * Parses INTO clause.
   * 
   * @param tokens 
   * @returns 
   */
  private static parseOutputClause(tokens: IToken[]): OutputClauseAstNode {
    popIfTypeThrowElse(tokens, TokenInto.type)
    const output = popIfTypeThrowElse<TokenName>(tokens, TokenName.type);
    return new OutputClauseAstNode(output.value.toLowerCase())
  }

  private static parseWhereClause(tokens: IToken[]): FilterClauseAstNode | null {
    if (!popIfType(tokens, TokenWhere.type)) {
      return null
    }
    return this.parseFilterClause(tokens);
  }

  /**
   * Parses a filter clause, such as WHERE or ON
   * 
   * For now limited to a simple x = y, where x an y can be a value or a field name.
   * 
   * @param tokens 
   * @returns 
   */
  private static parseFilterClause(tokens: IToken[]): FilterClauseAstNode {
    const partA = this.parseFilterElement(tokens);
    const comparator = popIfTypeThrowElse<TokenComparator>(tokens, TokenComparator.type)
    const partB = this.parseFilterElement(tokens);

    return new FilterClauseAstNode(partA, comparator.comparator, partB)
  }

  /**
   * Parse a single filter element. In x == y, x.
   * @param tokens 
   * @returns 
   */
  private static parseFilterElement(tokens: IToken[]): FilterField {
    const stringValue = popIfType<TokenStringValue>(tokens, TokenStringValue.type)
    if (stringValue) {
      return new FilterField("stringValue", stringValue.value)
    }
    const numericValue = popIfType<TokenNumericValue>(tokens, TokenNumericValue.type)
    if (numericValue) {
      return new FilterField("numericValue", numericValue.value)
    }
    const fieldQualifier = this.parseFieldQualifier(tokens)
    if (!fieldQualifier) {
      throw unexpectedToken(tokens, "a comparison element (number, string or field qualifier)")
    }
    return new FilterField("field", fieldQualifier)
  }

}