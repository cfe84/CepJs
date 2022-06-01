import { FieldAstNode } from "../src/Parser/FieldAstNode";
import { SourceClauseAstNode } from "../src/Parser/SourceClauseAst";
import { OutputClauseAstNode } from "../src/Parser/OutputClauseAst";
import { QueryAst } from "../src/Parser/QueryAst"
import { SelectionClauseAstNode } from "../src/Parser/SelectionClauseAstNode";
import { InputStream } from "../src/IO/InputStream"
import { OutputStream } from "../src/IO/OutputStream"
import { Job } from "../src/Processing/Job";
import * as should from "should";
import { FieldQualifier } from "../src/Parser/FieldQualifer";
import { FilterClauseAstNode } from "../src/Parser/FilterClauseAstNode";
import { FilterField } from "../src/Parser/FilterField";

describe("Job", function () {
  function testPipe(selectFields: FieldAstNode) {
    it(`Pipes events with ${JSON.stringify(selectFields)}`, function () {
      // given
      const query = new QueryAst(new SelectionClauseAstNode([selectFields]),
        new SourceClauseAstNode("input", []),
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
  }

  testPipe(new FieldAstNode("*"))
  testPipe(new FieldAstNode("qualified", new FieldQualifier("input", ["*"])))

  it(`Selects a field`, function () {
    // given
    const query = new QueryAst(new SelectionClauseAstNode([new FieldAstNode("qualified", new FieldQualifier("input", ["somethingElse"]))]),
      new SourceClauseAstNode("input", []),
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
    should(res[0]).be.deepEqual({
      "somethingElse": evt.somethingElse
    })
  })

  it(`Filters based on query`, function () {
    // given
    const query = new QueryAst(new SelectionClauseAstNode(
      [
        new FieldAstNode("qualified", new FieldQualifier("input", ["name"])),
        new FieldAstNode("qualified", new FieldQualifier("input", ["temperature"]))
      ]),
      new SourceClauseAstNode("input", []),
      new OutputClauseAstNode("output"),
      new FilterClauseAstNode(new FilterField("field", new FieldQualifier("input", ["temperature"])), ">", new FilterField("numericValue", 50)));
    const input = new InputStream({ name: "input" })
    const output = new OutputStream("output")

    const res: any[] = []
    output.registerCallback((evt) => res.push(evt))

    const job = new Job(query, [input], [output])

    // when
    const evt1 = { name: "c1", temperature: 29 }
    const evt2 = { name: "c2", temperature: 60 }
    const evt3 = { name: "c3", temperature: 39 }
    const evt4 = { name: "c4", temperature: 75 }
    input.pushEvents([evt1, evt2, evt3, evt4])

    // then
    should(res).be.deepEqual([evt2, evt4])
  })
})