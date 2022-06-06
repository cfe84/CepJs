import { FieldAstNode } from "../src/Parser/FieldAstNode";
import { SourceClauseAstNode, SOURCE_TYPE } from "../src/Parser/SourceClauseAst";
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
import { JoinAstNode } from "../src/Parser/JoinAstNode";
import { SingleSourceAstNode } from "../src/Parser/SingleSourceAstNode";

describe("Job", function () {
  function testPipe(selectFields: FieldAstNode) {
    it(`Pipes events with ${JSON.stringify(selectFields)}`, function () {
      // given
      const query = new QueryAst(new SelectionClauseAstNode([selectFields]),
        new SourceClauseAstNode(SOURCE_TYPE.singleSource, new SingleSourceAstNode("input")),
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
      new SourceClauseAstNode(SOURCE_TYPE.singleSource, new SingleSourceAstNode("input")),
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
      new SourceClauseAstNode(SOURCE_TYPE.singleSource, new SingleSourceAstNode("input")),
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

  it(`Joins event streams`, function () {
    // given
    const query = new QueryAst(new SelectionClauseAstNode(
      [
        new FieldAstNode("qualified", new FieldQualifier("input1", ["name"])),
        new FieldAstNode("qualified", new FieldQualifier("input1", ["temperature"])),
        new FieldAstNode("qualified", new FieldQualifier("input2", ["deviceName"]))
      ]),
      new SourceClauseAstNode(SOURCE_TYPE.join, [
        new JoinAstNode("input1", "input2", new FilterClauseAstNode(
          new FilterField("field", new FieldQualifier("input1", ["deviceId"])),
          "==",
          new FilterField("field", new FieldQualifier("input2", ["deviceId"]))
        ))
      ]),
      new OutputClauseAstNode("output"),
      new FilterClauseAstNode(new FilterField("field", new FieldQualifier("input1", ["temperature"])), ">", new FilterField("numericValue", 50)));
    const input1 = new InputStream({ name: "input1" })
    const input2 = new InputStream({ name: "input2" })
    const output = new OutputStream("output")

    const res: any[] = []
    output.registerCallback((evt) => res.push(evt))

    const job = new Job(query, [input1, input2], [output])

    // when

    // Note: in real life that could be reference data, but this will do for this test we have
    // group by and time windows
    const deviceEvt1 = { deviceName: "device 1", deviceId: 1 }
    const deviceEvt2 = { deviceName: "device 2", deviceId: 2 }
    const deviceEvt3 = { deviceName: "device 3", deviceId: 3 }

    const evt1No = { name: "c1", temperature: 29, deviceId: 1 }
    const evt2Yes = { name: "c2", temperature: 60, deviceId: 1 }
    const evt3No = { name: "c3", temperature: 39, deviceId: 2 }
    const evt4Yes = { name: "c3", temperature: 51, deviceId: 2 }
    const evt5No = { name: "c4", temperature: 75, deviceId: 0 }
    const evt6Yes = { name: "c5", temperature: 75, deviceId: 3 }

    input2.pushEvent([deviceEvt1, deviceEvt2])
    input1.pushEvents([evt1No, evt2Yes, evt3No, evt4Yes, evt5No, evt6Yes])
    input2.pushEvent(deviceEvt3)

    // then
    should(res).be.deepEqual([
      { name: evt2Yes.name, temperature: evt2Yes.temperature, deviceName: deviceEvt1.deviceName },
      { name: evt4Yes.name, temperature: evt4Yes.temperature, deviceName: deviceEvt2.deviceName },
      { name: evt6Yes.name, temperature: evt6Yes.temperature, deviceName: deviceEvt3.deviceName },
    ])
  })
})