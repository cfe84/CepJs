import { IToken } from "./IToken";

export class TokenName implements IToken {
  static type: string = "NAME";
  type = TokenName.type;
  constructor(public value: string) { }
}