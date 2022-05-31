import { IToken } from "./IToken";

export class TokenSelect implements IToken {
  static type: string = "SELECT";
  type = TokenSelect.type;
}