import { IToken } from "./IToken";

export class TokenOn implements IToken {
  static type: string = "ON";
  type = TokenOn.type;
}