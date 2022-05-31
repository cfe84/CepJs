import { IToken } from "./IToken";

export class TokenWhere implements IToken {
  static type: string = "WHERE";
  type = TokenWhere.type;
}