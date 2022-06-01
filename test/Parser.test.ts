import * as should from "should"
import { IToken } from "../src/Lexer/IToken"
import { TokenComma } from "../src/Lexer/TokenComma"
import { TokenComparator } from "../src/Lexer/TokenComparator"
import { TokenDot } from "../src/Lexer/TokenDot"
import { TokenFrom } from "../src/Lexer/TokenFrom"
import { TokenInto } from "../src/Lexer/TokenInto"
import { TokenName } from "../src/Lexer/TokenName"
import { TokenSelect } from "../src/Lexer/TokenSelect"
import { TokenStar } from "../src/Lexer/TokenStar"
import { TokenStringValue } from "../src/Lexer/TokenStringValue"
import { TokenWhere } from "../src/Lexer/TokenWhere"
import { FieldAstNode } from "../src/Parser/FieldAstNode"
import { FieldQualifier } from "../src/Parser/FieldQualifer"
import { FilterClauseAstNode } from "../src/Parser/FilterClauseAstNode"
import { FilterField } from "../src/Parser/FilterField"
import { SourceClauseAstNode } from "../src/Parser/SourceClauseAst"
import { OutputClauseAstNode } from "../src/Parser/OutputClauseAst"

import { Parser } from "../src/Parser/Parser"
import { SelectionClauseAstNode } from "../src/Parser/SelectionClauseAstNode"
import { TokenJoin } from "../src/Lexer/TokenJoin"
import { TokenOn } from "../src/Lexer/TokenOn"
import { JoinAstNode } from "../src/Parser/JoinAstNode"

describe("Parsing queries", function () {
  it("Parses star select", function () {
    // given
    const tokens: IToken[] = [
      new TokenSelect,
      new TokenStar,
      new TokenFrom,
      new TokenName("input"),
      new TokenInto,
      new TokenName("output")
    ]

    // when
    const queryAst = Parser.ParseQuery(tokens)

    // then
    should(queryAst.selectionClause).be.deepEqual(new SelectionClauseAstNode([new FieldAstNode("*")]))
    should(queryAst.fromClause).deepEqual(new SourceClauseAstNode("input", []))
    should(queryAst.outputClause).deepEqual(new OutputClauseAstNode("output"))
  })

  it("Parses several fields", function () {
    // given
    const tokens: IToken[] = [
      new TokenSelect,
      new TokenName("input1"),
      new TokenDot,
      new TokenName("attribute1"),
      new TokenComma,
      new TokenName("input1"),
      new TokenDot,
      new TokenName("attribute2"),
      new TokenComma,
      new TokenFrom,
      new TokenName("input1"),
      new TokenInto,
      new TokenName("output")
    ]

    // when
    const queryAst = Parser.ParseQuery(tokens)

    // then
    should(queryAst.selectionClause).be.deepEqual(new SelectionClauseAstNode([
      new FieldAstNode("qualified", new FieldQualifier("input1", ["attribute1"])),
      new FieldAstNode("qualified", new FieldQualifier("input1", ["attribute2"]))]))
    should(queryAst.fromClause).deepEqual(new SourceClauseAstNode("input1", []))
    should(queryAst.outputClause).deepEqual(new OutputClauseAstNode("output"))
  })

  // TODO: Failure cases.

  it("Parses a selection clause", function () {
    // given
    const tokens: IToken[] = [
      new TokenSelect, new TokenStar,
      new TokenFrom, new TokenName("input"),
      new TokenInto, new TokenName("output"),
      new TokenWhere, new TokenName("input"), new TokenDot, new TokenName("field"), new TokenComparator("=="), new TokenStringValue("something")

    ]

    // when
    const queryAst = Parser.ParseQuery(tokens)

    // then
    should(queryAst.filterClause).deepEqual(new FilterClauseAstNode(new FilterField("field", new FieldQualifier("input", ["field"])), "==", new FilterField("stringValue", "something")))
  })

  it("Parses joins", function () {
    // given
    const tokens: IToken[] = [
      new TokenSelect,
      new TokenStar,
      new TokenFrom, new TokenName("input1"),
      new TokenJoin, new TokenName("input2"),
      new TokenOn,
      new TokenName("input1"), new TokenDot, new TokenName("field"),
      new TokenComparator("=="),
      new TokenName("input2"), new TokenDot, new TokenName("field"),
      new TokenInto,
      new TokenName("output")
    ]

    // when
    const queryAst = Parser.ParseQuery(tokens)

    // then
    should(queryAst.fromClause).deepEqual(new SourceClauseAstNode("input1", [
      new JoinAstNode("input2", new FilterClauseAstNode(
        new FilterField("field", new FieldQualifier("input1", ["field"])),
        "==",
        new FilterField("field", new FieldQualifier("input2", ["field"]))
      ))
    ]))
  })
})