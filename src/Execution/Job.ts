import { EventEnvelope } from "../IO/EventEnvelope";
import { InputStream } from "../IO/InputStream";
import { OutputStream } from "../IO/OutputStream";
import { FieldQualifier } from "../Parser/FieldQualifer";
import { FilterClauseAstNode } from "../Parser/FilterClauseAstNode";
import { FilterField } from "../Parser/FilterField";
import { FromClauseAstNode } from "../Parser/FromClauseAst";
import { OutputClauseAstNode } from "../Parser/OutputClauseAst";
import { QueryAst } from "../Parser/QueryAst";
import { SelectionClauseAstNode } from "../Parser/SelectionClauseAstNode";

type Dictionary<T> = { [key: string]: T }

type Projector = (sources: Dictionary<any>) => any
type Filter = (sources: Dictionary<any>) => boolean

function copyObject(obj: any, res: any): any {
  Object.keys(obj).forEach(key => res[key] = obj[key])
}

function copyFromSources(sources: Dictionary<any>, res: any): any {
  Object.values(sources).forEach(obj => copyObject(obj, res))
}

export class Job {
  constructor(query: QueryAst, private inputs: InputStream[], private outputs: OutputStream[]) {
    const filter = this.generateFilter(query.filterClause)
    const projector = this.generateProjector(query.selectionClause)
    const output = this.generateOutput(query.outputClause)
    this.getInputs(query.fromClause).forEach(input => {
      input.addListener((evt) => {
        const sources: Dictionary<any> = {}
        sources[input.params.name] = evt.body;
        if (filter(sources)) {
          output(projector(sources))
        }
      })
    })
  }

  private generateOutput(outputClause: OutputClauseAstNode) {
    const output = this.outputs.find(output => outputClause.output === output.name)
    if (!output) {
      throw Error(`Output not found: "${outputClause.output}"`)
    }
    return (evt: any) => output.pushEvent(evt)
  }

  private getInputs(fromClause: FromClauseAstNode): InputStream[] {
    const input = this.inputs.find(input => input.params.name === fromClause.input)
    if (!input) {
      throw Error(`Input not found: "${fromClause.input}"`)
    }
    return [input]
  }

  private generateFilter(filterClause: FilterClauseAstNode | null): Filter {
    if (!filterClause) {
      return () => true
    }
    const valueA = this.generateValueSelector(filterClause.partA)
    const valueB = this.generateValueSelector(filterClause.partB)
    const operators = {
      ">": (a: any, b: any) => a > b,
      ">=": (a: any, b: any) => a >= b,
      "<": (a: any, b: any) => a < b,
      "<=": (a: any, b: any) => a <= b,
      "==": (a: any, b: any) => a == b,
      "!=": (a: any, b: any) => a != b,
    }
    const operator = operators[filterClause.comparator]
    return (sources: Dictionary<any>) => {
      const a = valueA(sources);
      const b = valueB(sources);
      return operator(a, b)
    }
  }

  private generateValueSelector(field: FilterField) {
    if (field.type === "numericValue") {
      return () => field.value as number
    } else if (field.type === "stringValue") {
      return () => field.value as string
    } else {
      const fieldQualifier = field.value as FieldQualifier
      return (sources: Dictionary<any>) => sources[fieldQualifier.input][fieldQualifier.qualifiers[0]]
    }
  }

  private generateProjector(selectionClause: SelectionClauseAstNode): Projector {
    let projectors: ((sources: Dictionary<any>, res: any) => void)[] = [];

    for (let field of selectionClause.fields) {
      const input = field.fieldQualifier?.input
      const fieldName = field.fieldQualifier?.qualifiers[0]
      if (input && !this.inputs.find(input => input.params.name === field.fieldQualifier?.input)) {
        throw Error(`Input stream not found: ${field.fieldQualifier?.input}`)
      }
      if (field.fieldType === "*") {
        projectors.push((sources: Dictionary<any>, res: any) => copyFromSources(sources, res))
      } else if (field.fieldQualifier?.qualifiers[0] === "*") {
        projectors.push((sources: Dictionary<any>, res: any) => copyObject(sources[input as string], res))
      } else {
        projectors.push((sources: Dictionary<any>, res: any) => {
          res[fieldName as string] = sources[input as string][fieldName as string]
        })
      }
    }
    return (sources: Dictionary<any>) => {
      const res = {}
      projectors.forEach(projector => projector(sources, res))
      return res;
    }
  }
}