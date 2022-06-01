import { IToken } from "./IToken";

export class TokenComma implements IToken {
  static type: string = "COMMA";
  type = TokenComma.type;
}