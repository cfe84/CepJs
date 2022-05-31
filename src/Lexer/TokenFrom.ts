import { IToken } from "./IToken";

export class TokenFrom implements IToken {
  static type: string = "FROM";
  type = TokenFrom.type;
}