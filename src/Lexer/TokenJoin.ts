import { IToken } from "./IToken";

export class TokenJoin implements IToken {
  static type: string = "JOIN";
  type = TokenJoin.type;
}