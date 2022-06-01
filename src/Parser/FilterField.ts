import { FieldQualifier } from "./FieldQualifer";

export type FilterFieldType = "field" | "stringValue" | "numericValue"

export class FilterField {
  constructor(public type: FilterFieldType, public value: string | FieldQualifier | number) { }
}