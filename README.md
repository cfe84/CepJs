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
  const heatWarning = cep.createInputStream("tempReadings");
```

Create query:
```ts
  const query = cep.createQuery("SELECT * FROM input1 INTO output1 WHERE input1.heat > 50");
```

Send some events:
```ts
  tempReadings.pushEvent(inputEvent1);
  tempReadings.pushEvent(inputEvent2);
  tempReadings.pushEvents([inputEvent3, inputEvent4]);

```

# Query

SELECT * FROM input1 INTO output1

SELECT input1.name, input1.value FROM input1 INTO output1 WHERE input1.someValue > 10

SELECT input1.name, count(*) as total FROM input1 INTO output1 WHERE input1.someValue > 10 GROUP BY input1.name, TumblingWindow(seconds, 10)

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