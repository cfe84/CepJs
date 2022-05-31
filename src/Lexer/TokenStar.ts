import { IToken } from "./IToken";

export class TokenStar implements IToken {
  static type: string = "STAR";
  type = TokenStar.type;
}