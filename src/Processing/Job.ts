import { InputStream, Listener } from "../IO/InputStream";
import { OutputStream } from "../IO/OutputStream";
import { FieldQualifier } from "../Parser/FieldQualifer";
import { FilterClauseAstNode } from "../Parser/FilterClauseAstNode";
import { FilterField } from "../Parser/FilterField";
import { SourceClauseAstNode, SOURCE_TYPE } from "../Parser/SourceClauseAst";
import { OutputClauseAstNode } from "../Parser/OutputClauseAst";
import { QueryAst } from "../Parser/QueryAst";
import { SelectionClauseAstNode } from "../Parser/SelectionClauseAstNode";
import { EventEnvelope } from "../IO/EventEnvelope";
import { SingleSourceAstNode } from "../Parser/SingleSourceAstNode";
import { JoinAstNode } from "../Parser/JoinAstNode";

type Dictionary<T> = { [key: string]: T }
/**
 * An event composed of events from several complexEvent, using the source name
 * as a key.
 */
type ComplexEvent = Dictionary<EventEnvelope>
type Projector = (complexEvent: ComplexEvent) => any
type Filter = (complexEvent: ComplexEvent) => boolean
type Join = (evt: any, eventInputStreamName: string) => ComplexEvent[]
type Output = (evt: any) => void
interface JoinedEvent {
  fieldValue: any,
  type: "complexEvent" | "regularEvent",
  value: ComplexEvent | any
}

interface Input {
  name: string,
  events: EventEnvelope[]
}

const operators = {
  ">": (a: any, b: any) => a > b,
  ">=": (a: any, b: any) => a >= b,
  "<": (a: any, b: any) => a < b,
  "<=": (a: any, b: any) => a <= b,
  "==": (a: any, b: any) => a == b,
  "!=": (a: any, b: any) => a != b,
}

/**
 * Get field from an event composed from events from several inputs, using a field qualifier
 * @param complexEvent 
 * @param field 
 * @returns 
 */
function getField(complexEvent: ComplexEvent, field: FieldQualifier): any {
  let res = complexEvent[field.input]
  for (let qualifier of field.qualifiers) {
    if (res === undefined) {
      return undefined
    }
    res = res.body[qualifier]
  }
  return res;
}

/**
 * Copy all properties of object into target
 * @param from 
 * @param to 
 */
function copyObject(from: EventEnvelope, to: any): any {
  Object.keys(from.body).forEach(key => to[key] = from.body[key])
}

/**
 * Copy all properties in events constituting a complex event
 * into target
 * @param complexEvent 
 * @param target 
 */
function copyFromComplexEvent(complexEvent: ComplexEvent, target: any): any {
  Object.values(complexEvent).forEach(obj => copyObject(obj, target))
}

/**
 * Creates a job from a fully parsed query.
 */
export class Job {
  /**
   * Compiles the query, create a job from it. Registers all listeners.
   * 
   * Execution plan =
   * 0. Pre-FILTER for input sources, to optimize performance (NOT SUPPORTED YET)
   * 1. JOIN
   * 2. GROUP BY (NOT SUPPORTED YET)
   * 3. FILTER
   * 4. PROJECT
   * 5. OUTPUT
   * 
   * @param query 
   * @param availableInputs 
   * @param outputs 
   */
  constructor(query: QueryAst, private availableInputs: InputStream[], private outputs: OutputStream[]) {
    const inputs = this.getInputs(query.fromClause)
    const join = this.generateJoin(query.fromClause)
    const filter = this.generateFilter(query.filterClause)
    const project = this.generateProjector(query.selectionClause)
    const output = this.generateOutput(query.outputClause)

    inputs.forEach(input => {
      input.addListener(this.createEventListener(input, inputs, join, filter, output, project))
    })
  }

  /**
   * Compiled event listener to run everytime we run a new event.
   * 
   * This is where the pipeline if effectively ran.
   * 
   * @param input Input to which to attach
   * @param inputs Inputs matching the query
   * @param join 
   * @param filter 
   * @param output 
   * @param project 
   * @returns 
   */
  private createEventListener(input: InputStream, inputs: InputStream[], join: Join, filter: Filter, output: Output, project: Projector): Listener {
    return (evt) => {
      // Join all complexEvent into complex events
      join(evt, input.params.name)
        .filter(filter)
        .map(project)
        .forEach(output)
    }
  }

  /**
   * Retrieve all inputs matching the from clause, and registering to all of them
   * @param fromClause 
   * @returns 
   */
  private getInputs(fromClause: SourceClauseAstNode): InputStream[] {
    const inputsInQuery = fromClause.sourceType === SOURCE_TYPE.singleSource
      ? [(fromClause.value as SingleSourceAstNode).source]
      : (fromClause.value as JoinAstNode[]).map(join => join.to);
    return inputsInQuery.map(inputInQuery => {
      const input = this.availableInputs.find(input => input.params.name === inputInQuery);
      if (!input) {
        throw Error(`Input not found: "${inputInQuery}"`)
      }
      return input;
    });
  }

  /**
   * Performs a join
   * @param sourceClause 
   * @returns 
   */
  private generateJoin(sourceClause: SourceClauseAstNode): Join {
    const getSeedEvents = (evt: EventEnvelope, inputName: string): ComplexEvent[] => {
      const initialEvent: ComplexEvent = {}
      initialEvent[inputName] = evt;
      return [initialEvent]
    }

    if (sourceClause.sourceType === SOURCE_TYPE.singleSource) {
      return (getSeedEvents)
    }
    const joins = (sourceClause.value as JoinAstNode[])

    const allInputs = this.getInputs(sourceClause)

    let steps: ((evt: ComplexEvent[]) => ComplexEvent[])[] = []
    // Todo: sort clauses by eventsource size to make it more efficient
    for (let join of joins) {

      // get the missing input
      // create the field retrievers
      // create the comparator
      const join = (events: ComplexEvent[]) => {
        // foreach complex event
        // foreach event in the new input
        //   if the CE and the new input event match, create new CE, emit it.
        return []
      }
      steps.push(join)
    }

    return (evt, inputName) => {
      const inputs = allInputs.map(input => input.params.name === inputName ? ({ name: inputName, events: [evt] }) : { name: input.params.name, events: input.events })
      let res: ComplexEvent[] = getSeedEvents(evt, inputName)
      for (let join of steps) {
        res = join(res)
      }
      return res;
    }
  }

  private getFieldValues(complexEvents: ComplexEvent[], inputs: InputStream[], filterField: FilterField) {
    // fieldValue
    // type = 
    // value
    switch (filterField.type) {
      case "numericValue":
      case "stringValue":
        throw Error("JOIN not supported with variables")
      default:

    }
  }

  /**
   * Generate a filter function from the FILTER clause
   * @param filterClause 
   * @returns 
   */
  private generateFilter(filterClause: FilterClauseAstNode | null): Filter {
    if (!filterClause) {
      return () => true
    }
    const valueA = this.generateValueSelector(filterClause.partA)
    const valueB = this.generateValueSelector(filterClause.partB)
    const operator = operators[filterClause.comparator]
    return (complexEvent: ComplexEvent) => {
      const a = valueA(complexEvent);
      const b = valueB(complexEvent);
      return operator(a, b)
    }
  }

  /**
   * Generate a function that will select the value to be used in the filter.
   * @param field 
   * @returns 
   */
  private generateValueSelector(field: FilterField) {
    if (field.type === "numericValue") {
      return () => field.value as number
    } else if (field.type === "stringValue") {
      return () => field.value as string
    } else {
      const fieldQualifier = field.value as FieldQualifier
      return (complexEvent: ComplexEvent) => getField(complexEvent, fieldQualifier)
    }
  }

  /**
   * Generates a function to be used to map event to the output.
   * @param selectionClause 
   * @returns 
   */
  private generateProjector(selectionClause: SelectionClauseAstNode): Projector {
    let projectors: ((complexEvent: ComplexEvent, res: any) => void)[] = [];

    for (let field of selectionClause.fields) {
      const input = field.fieldQualifier?.input
      const fieldName = field.fieldQualifier?.qualifiers[0]
      if (input && !this.availableInputs.find(input => input.params.name === field.fieldQualifier?.input)) {
        throw Error(`Input stream not found: ${field.fieldQualifier?.input}`)
      }
      if (field.fieldType === "*") {
        projectors.push((complexEvent: ComplexEvent, res: any) => copyFromComplexEvent(complexEvent, res))
      } else if (field.fieldQualifier?.qualifiers[0] === "*") {
        projectors.push((complexEvent: ComplexEvent, res: any) => copyObject(complexEvent[input as string], res))
      } else {
        projectors.push((complexEvent: ComplexEvent, res: any) => {
          res[fieldName as string] = getField(complexEvent, field.fieldQualifier as FieldQualifier)
        })
      }
    }
    return (complexEvent: ComplexEvent) => {
      const res = {}
      projectors.forEach(projector => projector(complexEvent, res))
      return res;
    }
  }

  /**
   * Generate an output function where to push events generated by the query
   * @param outputClause 
   * @returns 
   */
  private generateOutput(outputClause: OutputClauseAstNode) {
    const output = this.outputs.find(output => outputClause.output === output.name)
    if (!output) {
      throw Error(`Output not found: "${outputClause.output}"`)
    }
    return (evt: any) => output.pushEvent(evt)
  }

}