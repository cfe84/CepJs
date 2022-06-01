import { IToken } from "./IToken";
import { Comparator, TokenComparator } from "./TokenComparator";
import { TokenDot } from "./TokenDot";
import { TokenFrom } from "./TokenFrom";
import { TokenComma } from "./TokenComma";
import { TokenGroupBy } from "./TokenGroupBy";
import { TokenInto } from "./TokenInto";
import { TokenName } from "./TokenName";
import { TokenNumericValue } from "./TokenNumericValue";
import { TokenSelect } from "./TokenSelect";
import { TokenStar } from "./TokenStar";
import { TokenStringValue } from "./TokenStringValue";
import { TokenWhere } from "./TokenWhere";
import { TokenWhiteSpace } from "./TokenWhiteSpace";
import { TokenJoin } from "./TokenJoin";
import { TokenOn } from "./TokenOn";

interface Cursor {
  query: string,
  index: number
}

/**
 * Pick next word and move cursor if it matches regex
 * @param cursor 
 * @param regex 
 * @returns Regex matches if any
 */
function nextWord(cursor: Cursor, regex: string): string[] | null {
  const re = new RegExp(`^${regex}`, "i");
  // Todo: optimize by keeping a cache of shortened query
  const res = re.exec(cursor.query.substring(cursor.index))
  return res;
}

function nextChar(cursor: Cursor, offset: number): string {
  return cursor.query.length > cursor.index + offset ? cursor.query[cursor.index + offset] : ""
}

function curChar(cursor: Cursor): string {
  return nextChar(cursor, 0)
}

function endOfStream(cursor: Cursor): boolean {
  return cursor.index >= cursor.query.length
}

function isDigit(char: string): boolean {
  return char.match(/\d/) !== null
}

function subStr(cursor: Cursor, from: number, to: number) {
  return cursor.query.substring(from, to)
}

/**
 * Converts a string into a series of tokens.
 */
export class Lexer {
  static *lex(query: string): Generator<IToken> {
    let cursor: Cursor = {
      index: 0,
      query: query
    }
    while (!endOfStream(cursor)) {
      // ignore whitespace
      if (this.parse_whitespace(cursor)) {
        continue;
      }
      // return the first matching token
      const match = this.parse_select(cursor)
        || this.parse_from(cursor)
        || this.parse_join(cursor)
        || this.parse_on(cursor)
        || this.parse_where(cursor)
        || this.parse_into(cursor)
        || this.parse_groupby(cursor)
        || this.parse_comma(cursor)
        || this.parse_dot(cursor)
        || this.parse_star(cursor)
        || this.parse_comparator(cursor)
        || this.parse_stringValue(cursor)
        || this.parse_numericValue(cursor)
        || this.parse_name(cursor)
      if (match) {
        yield match
      } else {
        // Todo: better error handling
        console.error(`Unexpected token "${cursor.query[cursor.index]}" at pos ${cursor.index}`);
        break;
      }
    }
  }

  static parse_whitespace(cursor: Cursor): TokenWhiteSpace | false {
    return this.parse_regex(cursor, "\\s+", () => new TokenWhiteSpace())
  }

  static parse_dot(cursor: Cursor): TokenDot | false {
    return this.parse_regex(cursor, "[.]", () => new TokenDot())
  }

  static parse_comma(cursor: Cursor): TokenComma | false {
    return this.parse_regex(cursor, ",", () => new TokenComma())
  }

  static parse_star(cursor: Cursor): TokenStar | false {
    return this.parse_regex(cursor, "[*]", () => new TokenStar())
  }

  static parse_select(cursor: Cursor): TokenSelect | false {
    return this.parse_regex(cursor, "select", () => new TokenSelect())
  }
  static parse_join(cursor: Cursor): IToken | false {
    return this.parse_regex(cursor, "join", () => new TokenJoin())
  }
  static parse_on(cursor: Cursor): IToken | false {
    return this.parse_regex(cursor, "on", () => new TokenOn())
  }

  static parse_from(cursor: Cursor): TokenFrom | false {
    return this.parse_regex(cursor, "from", () => new TokenFrom())
  }

  static parse_into(cursor: Cursor): TokenInto | false {
    return this.parse_regex(cursor, "into", () => new TokenInto())
  }

  static parse_groupby(cursor: Cursor): TokenGroupBy | false {
    return this.parse_regex(cursor, "group by", () => new TokenGroupBy())
  }

  static parse_where(cursor: Cursor): IToken | false {
    return this.parse_regex(cursor, "where", () => new TokenWhere())
  }

  static parse_comparator(cursor: Cursor): IToken | false {
    return this.parse_regex(cursor, "(<=|<|>=|>|==|!=)", (name: string[]) => new TokenComparator(name[1] as Comparator))
  }

  static parse_numericValue(cursor: Cursor): IToken | false {
    return this.parse_regex(cursor, "\\d+(\\.\\d*)?", (name: string[]) =>
      name[1]
        ? new TokenNumericValue(Number.parseFloat(name[0]))
        : new TokenNumericValue(Number.parseInt(name[0])))
  }

  static parse_stringValue(cursor: Cursor): IToken | false {
    return this.parse_regex(cursor, "\"((?:[^\"]|\"\")*)\"", (name: string[]) => new TokenStringValue(name[1]))
  }

  static parse_name(cursor: Cursor): IToken | false {
    return this.parse_regex(cursor, "\\w(?:\\w|\\d)*", (name: string[]) => new TokenName(name[0]))
  }

  static parse_regex(cursor: Cursor, regex: string, tokenGenerator: (regexRes: string[]) => IToken): IToken | false {
    const res = nextWord(cursor, regex);
    if (res) {
      if (res) {
        cursor.index += res[0].length;
      }
      return tokenGenerator(res);
    } else {
      return false;
    }
  }

}