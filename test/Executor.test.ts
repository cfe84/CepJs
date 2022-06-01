import { FieldAstNode } from "../src/Parser/FieldAstNode";
import { FromClauseAstNode } from "../src/Parser/FromClauseAst";
import { OutputClauseAstNode } from "../src/Parser/OutputClauseAst";
import { QueryAst } from "../src/Parser/QueryAst"
import { SelectionClauseAstNode } from "../src/Parser/SelectionClauseAstNode";
import { InputStream } from "../src/IO/InputStream"
import { OutputStream } from "../src/IO/OutputStream"
import { Job } from "../src/Execution/Job";
import * as should from "should";
import { FieldQualifier } from "../src/Parser/FieldQualifer";

describe("Job", function () {
  it("Pipes events", function () {
    // given
    const query = new QueryAst(new SelectionClauseAstNode([new FieldAstNode("*")]),
      new FromClauseAstNode("input"),
      new OutputClauseAstNode("output"),
      null);
    const input = new InputStream({ name: "input" })
    const output = new OutputStream("output")

    const res: any[] = []
    output.registerCallback((evt) => res.push(evt))

    const job = new Job(query, [input], [output])

    // when
    const evt = {
      something: "Hello!",
      somethingElse: "Goodbye!"
    }
    input.pushEvent(evt)

    // then
    should(res).have.length(1)
    should(res[0]).be.deepEqual(evt)
  })
})