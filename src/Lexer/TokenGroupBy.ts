import { IToken } from "./IToken";

export class TokenGroupBy implements IToken {
  static type: string = "GROUPBY";
  type = TokenGroupBy.type;
}