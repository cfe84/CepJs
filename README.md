# CEPjs

Complex event processing for JS/TS.

Takes a stream of events, a query, reference data, produces a stream of events corresponding to the query.

# IO

Setup with:

```ts
  import { EventProcessor } from "CepJs";
  const cep = new EventProcessor();
```

Create io:

```ts
  const heatWarning = cep.createOutputStream("output1");
  heatWarning.registerCallback((outputEvent) => {
    console.log(`Warning! Temperature is too high: ${outputEvent}`);
  });
  const tempReadings = cep.createInputStream("tempReadings");
```

Create query:

```ts
  const query = cep.createQuery("SELECT input1.name FROM input1 INTO output1 WHERE input1.heat > 50");
```

Send some events:

```ts
  tempReadings.pushEvent({heat: 60, name: "evt1"});
  tempReadings.pushEvent({heat: 40, name: "evt2"});
  tempReadings.pushEvents([{heat: 39, name: "evt3"}, {heat: 54, name: "evt4"}]);
```

See output:
```ts
  // evt1
  // evt4
```

# Query

```sql
SELECT * FROM input1 INTO output1

SELECT input1.name, input2.value FROM input1 JOIN input2 ON input1.id == input2.id INTO output1 WHERE input1value > 10

# Unsupported yet:
SELECT input1.name, count(*) as total FROM input1 INTO output1 WHERE input1.someValue > 10 GROUP BY input1.name, TumblingWindow(seconds, 10)
```

# How it works

The entry point for CepJs is the [EventProcessor](./src/EventProcessor.ts). However the `EventProcessor` is mostly a facade composite the 
other elements of CepJs.

## Input

In [InputStream](./src/IO/InputStream.ts): push events, when new events arrived they are mapped to determine a timestamp. If events arrive out
of order then the stream is sorted. Events are expired from stream, by default after 1h. This can be changed with parameter `cacheExpiryInSeconds`

## Output

Output is done using callbacks. One callback is made per event output.

## Query parsing

Query is passed through a [lexer](./src/Lexer/Lexer.ts) and produces a series of [tokens](./src/Lexer/IToken.ts). This array of Tokens is then
passed to the [parser](./src/Parser/Parser.ts), which produces an Abstract Syntax Tree (AST) representation of the [query](./src/Parser/QueryAst.ts).

## Jobs

A [job](./src/Processing/Job.ts) is created through the EventProcess class. It is created using a list of inputs, outputs, and a query as a string.

Query is first passed through the parser. Then the job is assembled from the AST, and generates a set of functions corresponding to it. The goal
is to reduce re-computation when events are received, though a few more optimizations, in particular on JOIN, could still be made.

More details are described in the class itself, but the overview is as follows:

When the job is created, the job creates a listener on all inputs found in the query. For example if the query is `SELECT * FROM input1 JOIN input2 [...]`,
then the job registers to both input1 and input2.

When an event is received, the job uses this event as a scalar object, and considers all other inputs as array. JOIN operations are then ran starting
from this event: we find all other inputs that join "to" this event, that is, any JOIN operation that has this input in the ON operator _(Note: there's a
bug related to that that needs fixing)_. This is an INNER JOIN. A new event is created for each corresponding combination, that means, if the other input
has 2 matching entries, then 2 complex events will be sent in output.

Then events are filters using whatever is in the WHERE clause.

Finally, a projection is done, either selecting all fields using * (duplicates are overwritten, which means that if two sources have a field with same name, it will
appear only once). A single input might be starred as well, for example: `input1.*`. Finally, a list of fields might be specified. Similar restrictions currently apply
if the same field name is used several times. Aliases are not supported yet, but will be in the future.

Finally, output specified in the query is called for each output event.

# Improvements

- [ ] Reference data (for now, reference data can be inserted in a fake input event stream with expiry set to `MAX_SAFE_INTEGER`)
- [X] JOIN
- [ ] GROUP BY and support for time windows
- [ ] Aliases for SELECT
- [ ] More JOIN types (OUTER / ...)
- [ ] Testing for all exceptions
- [ ] Event sources can be made better, by both ~sorting~ (done) and partitioning them to make search and expiry more efficient.


# Grammar

```text
QUERY := 
  SELECTION_CLAUSE FROM_CLAUSE OUTPUT_CLAUSE [FILTER_CLAUSE] [GROUPBY_CLAUSE] [WHERE_CLAUSE]

SELECTION_CLAUSE :=
  /select/i FIELDS

FIELDS :=
| FIELD
| FIELD, FIELDS

FIELD :=
  *
| FIELD_NAME
| FIELD_NAME as ALIAS

FIELD_NAME := NAME /[.]./ FIELD_QUALIFIER

INPUT_NAME := NAME

FIELD_QUALIFIER := NAME | /[*]./

NAME := /\w(\w|\d)*/

FROM_CLAUSE := 
...

WHERE_CLAUSE := VALUE_FIELD COMPARATOR VALUE_FIELD

VALUE_FIELD :=
  VALUE
| FIELD_NAME
| NAME

```