import { IToken } from "./IToken";

export class TokenStringValue implements IToken {
  static type: string = "STRING_VALUE";
  type = TokenStringValue.type;

  constructor(public value: string) { }
}