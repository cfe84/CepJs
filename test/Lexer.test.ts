import * as should from "should";
import { Lexer } from "../src/Lexer/Lexer";
import { TokenSelect } from "../src/Lexer/TokenSelect";
import { TokenStar } from "../src/Lexer/TokenStar";
import { TokenComma } from "../src/Lexer/TokenComma";
import { TokenJoin } from "../src/Lexer/TokenJoin";
import { TokenOn } from "../src/Lexer/TokenOn";
import { TokenFrom } from "../src/Lexer/TokenFrom";
import { TokenName } from "../src/Lexer/TokenName";
import { TokenDot } from "../src/Lexer/TokenDot";
import { TokenWhere } from "../src/Lexer/TokenWhere";
import { Comparator, TokenComparator } from "../src/Lexer/TokenComparator";
import { TokenNumericValue } from "../src/Lexer/TokenNumericValue";
import { TokenStringValue } from "../src/Lexer/TokenStringValue";
import { TokenInto } from "../src/Lexer/TokenInto";
import { TokenGroupBy } from "../src/Lexer/TokenGroupBy";

describe("Lexer", function () {
  it("should parse simple SELECT", function () {
    // given
    const query = "SELECT * From input INTo output";

    // when
    const tokens = Array.from(Lexer.lex(query));

    // then
    should(tokens).be.deepEqual([
      new TokenSelect,
      new TokenStar,
      new TokenFrom,
      new TokenName("input"),
      new TokenInto,
      new TokenName("output"),
    ])
  })

  it("should parse SELECT with fields", function () {
    // given
    const query = "Select something.fieldname, else.* FROM input GROUP BY input.fieldname"

    // when
    const tokens = Array.from(Lexer.lex(query));

    // then
    should(tokens).be.deepEqual([
      new TokenSelect,
      new TokenName("something"),
      new TokenDot,
      new TokenName("fieldname"),
      new TokenComma,
      new TokenName("else"),
      new TokenDot,
      new TokenStar,
      new TokenFrom,
      new TokenName("input"),
      new TokenGroupBy,
      new TokenName("input"),
      new TokenDot(),
      new TokenName("fieldname"),
    ])
  })

  function testFilter(comparator: Comparator, value: string | number) {
    it(`should parse filter: ${comparator} ${typeof (value) === "string" ? `"${value}"` : value}`, function () {
      // given
      const query = `WHERE input.something ${comparator} ${typeof (value) === "string" ? `"${value}"` : value}`

      // when
      const tokens = Array.from(Lexer.lex(query));

      // then
      should(tokens).be.deepEqual([
        new TokenWhere,
        new TokenName("input"),
        new TokenDot,
        new TokenName("something"),
        new TokenComparator(comparator),
        typeof (value) === "string" ? new TokenStringValue(value) : new TokenNumericValue(value)
      ])
    })
  }

  testFilter(">", 6)
  testFilter("<=", 6.5)
  testFilter("==", "test")
  testFilter("!=", "")
  testFilter("==", "with escaped \"\"string\"\" within")

  it("should lex join", function () {
    //given
    const query = "From input1 JOIN input2 ON input1.something == input2.something"

    // when
    const tokens = Array.from(Lexer.lex(query))

    // then
    should(tokens).be.deepEqual([
      new TokenFrom,
      new TokenName("input1"),
      new TokenJoin,
      new TokenName("input2"),
      new TokenOn,
      new TokenName("input1"),
      new TokenDot,
      new TokenName("something"),
      new TokenComparator("=="),
      new TokenName("input2"),
      new TokenDot,
      new TokenName("something"),
    ])
  })
});
