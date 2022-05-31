import { IToken } from "./IToken";

export class TokenWhiteSpace implements IToken {
  static type: string = "WHITESPACE";
  type = TokenWhiteSpace.type;
}