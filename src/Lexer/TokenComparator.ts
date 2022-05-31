import { IToken } from "./IToken";

export type Comparator = ">" | "<" | ">=" | "<=" | "==" | "!="

export class TokenComparator implements IToken {
  static type: string = "COMPARATOR";
  type = TokenComparator.type;
  constructor(public comparator: Comparator) { }
}