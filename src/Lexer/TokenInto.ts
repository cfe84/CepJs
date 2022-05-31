import { IToken } from "./IToken";

export class TokenInto implements IToken {
  static type: string = "INTO";
  type = TokenInto.type;
}