import { IToken } from "./IToken";

export class TokenNumericValue implements IToken {
  static type: string = "NUMERIC_VALUE";
  type = TokenNumericValue.type;

  constructor(public value: number) { }
}