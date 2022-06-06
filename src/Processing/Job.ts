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
type Join = (evt: any, eventInputStreamName: string, inputs: Dictionary<InputStream>) => ComplexEvent[]
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

const stringComparators = {
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

function getFieldFromEventEnvelope(evt: EventEnvelope, field: FieldQualifier): any {
  let res = evt.body
  for (let qualifier of field.qualifiers) {
    if (res === undefined) {
      return undefined
    }
    res = res[qualifier]
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
function flattenComplexEvent(complexEvent: ComplexEvent, target: any): any {
  Object.values(complexEvent).forEach(obj => copyObject(obj, target))
}

function copyComplexEvent(complexEvent: ComplexEvent): any {
  const res: ComplexEvent = {}
  for (let key of Object.keys(complexEvent)) {
    res[key] = complexEvent[key];
  }
  return res;
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
   * @param inputs 
   * @param outputs 
   */
  constructor(query: QueryAst, private inputs: InputStream[], private outputs: OutputStream[]) {
    const relevantInputs = this.getInputs(query.fromClause)
    const join = this.generateJoin(query.fromClause)
    const filter = this.generateFilter(query.filterClause)
    const project = this.generateProjector(query.selectionClause)
    const output = this.generateOutput(query.outputClause)

    Object.values(inputs).forEach(input => {
      input.addListener(this.createEventListener(input, relevantInputs, join, filter, output, project))
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
  private createEventListener(input: InputStream, inputs: Dictionary<InputStream>, join: Join, filter: Filter, output: Output, project: Projector): Listener {
    return (evt) => {
      // Join all complexEvent into complex events
      join(evt, input.params.name, inputs)
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
  private getInputs(fromClause: SourceClauseAstNode): Dictionary<InputStream> {
    const inputsInQuery = fromClause.sourceType === SOURCE_TYPE.singleSource
      ? [(fromClause.value as SingleSourceAstNode).source]
      : [(fromClause.value as JoinAstNode[])[0].from].concat((fromClause.value as JoinAstNode[]).map(join => join.to));
    const res: Dictionary<InputStream> = {}
    inputsInQuery.forEach(inputInQuery => {
      const input = this.inputs.find(input => input.params.name === inputInQuery);
      if (!input) {
        throw Error(`Input not found: "${inputInQuery}"`)
      }
      res[input.params.name] = input
    });
    return res
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
    const findJoinTo = (joinsToInput: string, joins: JoinAstNode[]) =>
      joins.filter((join) => join.to.toLowerCase() === joinsToInput.toLowerCase())
    const findJoinFrom = (joinsFromInput: string, joins: JoinAstNode[]) =>
      joins.filter((join) => join.from.toLowerCase() === joinsFromInput.toLowerCase())
    const allInputs = this.getInputs(sourceClause)

    return (evt, inputName) => {
      let res: ComplexEvent[] = getSeedEvents(evt, inputName)
      let inputsToBeJoinedFrom = [inputName];
      while (inputsToBeJoinedFrom.length) {
        const joinFromInput = inputsToBeJoinedFrom.shift() as string
        const joinsToBeProcessed = findJoinFrom(joinFromInput, joins)
        for (let join of joinsToBeProcessed) {
          let newRes: ComplexEvent[] = [];
          for (let ev of res) {
            const matcher = this.createMatcher(ev, join.to, join);
            const matchingEvents = allInputs[join.to].events.filter(matcher);
            for (let matchingEvent of matchingEvents) {
              const target: ComplexEvent = copyComplexEvent(ev);
              target[join.to] = matchingEvent
              newRes.push(target)
            }
          }
          res = newRes;
          inputsToBeJoinedFrom.push(join.to)
        }
      }

      // Todo: Factorize
      let inputsToBeJoinedTo = [inputName];
      while (inputsToBeJoinedTo.length) {
        const joinToInput = inputsToBeJoinedTo.shift() as string
        const joinsToBeProcessed = findJoinTo(joinToInput, joins)
        for (let join of joinsToBeProcessed) {
          let newRes: ComplexEvent[] = [];
          for (let ev of res) {
            const matcher = this.createMatcher(ev, join.from, join);
            const matchingEvents = allInputs[join.from].events.filter(matcher);
            for (let matchingEvent of matchingEvents) {
              const target: ComplexEvent = copyComplexEvent(ev)
              target[join.from] = matchingEvent
              newRes.push(target)
            }
          }
          res = newRes;
          inputsToBeJoinedFrom.push(join.from)
        }
      }

      return res;
    }
  }

  private createMatcher(ev: ComplexEvent, joinedStreamName: string, join: JoinAstNode) {
    const streamIsPartA = (join.on.partA.value as FieldQualifier).input === joinedStreamName
    const createFieldRetriever = (qual: FieldQualifier) => (ev: EventEnvelope) => getFieldFromEventEnvelope(ev, join.on.partA.value as FieldQualifier)
    const getPartA = streamIsPartA ? createFieldRetriever(join.on.partA.value as FieldQualifier) : () => getField(ev, join.on.partA.value as FieldQualifier)
    const getPartB = !streamIsPartA ? createFieldRetriever(join.on.partB.value as FieldQualifier) : () => getField(ev, join.on.partB.value as FieldQualifier)
    const op = stringComparators[join.on.comparator]
    return (ev: EventEnvelope) => {
      const valA = getPartA(ev)
      const valB = getPartB(ev)
      return op(valA, valB)
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
    const operator = stringComparators[filterClause.comparator]
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
      if (input && !this.inputs.find(input => input.params.name === field.fieldQualifier?.input)) {
        throw Error(`Input stream not found: ${field.fieldQualifier?.input}`)
      }
      if (field.fieldType === "*") {
        projectors.push((complexEvent: ComplexEvent, res: any) => flattenComplexEvent(complexEvent, res))
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