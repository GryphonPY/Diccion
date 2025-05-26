// node_modules/marked/lib/marked.esm.js
function getDefaults() {
  return {
    async: false,
    baseUrl: null,
    breaks: false,
    extensions: null,
    gfm: true,
    headerIds: true,
    headerPrefix: "",
    highlight: null,
    hooks: null,
    langPrefix: "language-",
    mangle: true,
    pedantic: false,
    renderer: null,
    sanitize: false,
    sanitizer: null,
    silent: false,
    smartypants: false,
    tokenizer: null,
    walkTokens: null,
    xhtml: false
  };
}
var defaults = getDefaults();
function changeDefaults(newDefaults) {
  defaults = newDefaults;
}
var escapeTest = /[&<>"']/;
var escapeReplace = new RegExp(escapeTest.source, "g");
var escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
var escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, "g");
var escapeReplacements = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var getEscapeReplacement = (ch) => escapeReplacements[ch];
function escape(html, encode) {
  if (encode) {
    if (escapeTest.test(html)) {
      return html.replace(escapeReplace, getEscapeReplacement);
    }
  } else {
    if (escapeTestNoEncode.test(html)) {
      return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
    }
  }
  return html;
}
var unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
function unescape(html) {
  return html.replace(unescapeTest, (_, n) => {
    n = n.toLowerCase();
    if (n === "colon") return ":";
    if (n.charAt(0) === "#") {
      return n.charAt(1) === "x" ? String.fromCharCode(parseInt(n.substring(2), 16)) : String.fromCharCode(+n.substring(1));
    }
    return "";
  });
}
var caret = /(^|[^\[])\^/g;
function edit(regex, opt) {
  regex = typeof regex === "string" ? regex : regex.source;
  opt = opt || "";
  const obj = {
    replace: (name, val) => {
      val = val.source || val;
      val = val.replace(caret, "$1");
      regex = regex.replace(name, val);
      return obj;
    },
    getRegex: () => {
      return new RegExp(regex, opt);
    }
  };
  return obj;
}
var nonWordAndColonTest = /[^\w:]/g;
var originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
function cleanUrl(sanitize, base, href) {
  if (sanitize) {
    let prot;
    try {
      prot = decodeURIComponent(unescape(href)).replace(nonWordAndColonTest, "").toLowerCase();
    } catch (e) {
      return null;
    }
    if (prot.indexOf("javascript:") === 0 || prot.indexOf("vbscript:") === 0 || prot.indexOf("data:") === 0) {
      return null;
    }
  }
  if (base && !originIndependentUrl.test(href)) {
    href = resolveUrl(base, href);
  }
  try {
    href = encodeURI(href).replace(/%25/g, "%");
  } catch (e) {
    return null;
  }
  return href;
}
var baseUrls = {};
var justDomain = /^[^:]+:\/*[^/]*$/;
var protocol = /^([^:]+:)[\s\S]*$/;
var domain = /^([^:]+:\/*[^/]*)[\s\S]*$/;
function resolveUrl(base, href) {
  if (!baseUrls[" " + base]) {
    if (justDomain.test(base)) {
      baseUrls[" " + base] = base + "/";
    } else {
      baseUrls[" " + base] = rtrim(base, "/", true);
    }
  }
  base = baseUrls[" " + base];
  const relativeBase = base.indexOf(":") === -1;
  if (href.substring(0, 2) === "//") {
    if (relativeBase) {
      return href;
    }
    return base.replace(protocol, "$1") + href;
  } else if (href.charAt(0) === "/") {
    if (relativeBase) {
      return href;
    }
    return base.replace(domain, "$1") + href;
  } else {
    return base + href;
  }
}
var noopTest = { exec: function noopTest2() {
} };
function splitCells(tableRow, count) {
  const row = tableRow.replace(/\|/g, (match, offset, str) => {
    let escaped = false, curr = offset;
    while (--curr >= 0 && str[curr] === "\\") escaped = !escaped;
    if (escaped) {
      return "|";
    } else {
      return " |";
    }
  }), cells = row.split(/ \|/);
  let i = 0;
  if (!cells[0].trim()) {
    cells.shift();
  }
  if (cells.length > 0 && !cells[cells.length - 1].trim()) {
    cells.pop();
  }
  if (cells.length > count) {
    cells.splice(count);
  } else {
    while (cells.length < count) cells.push("");
  }
  for (; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(/\\\|/g, "|");
  }
  return cells;
}
function rtrim(str, c, invert) {
  const l = str.length;
  if (l === 0) {
    return "";
  }
  let suffLen = 0;
  while (suffLen < l) {
    const currChar = str.charAt(l - suffLen - 1);
    if (currChar === c && !invert) {
      suffLen++;
    } else if (currChar !== c && invert) {
      suffLen++;
    } else {
      break;
    }
  }
  return str.slice(0, l - suffLen);
}
function findClosingBracket(str, b) {
  if (str.indexOf(b[1]) === -1) {
    return -1;
  }
  const l = str.length;
  let level = 0, i = 0;
  for (; i < l; i++) {
    if (str[i] === "\\") {
      i++;
    } else if (str[i] === b[0]) {
      level++;
    } else if (str[i] === b[1]) {
      level--;
      if (level < 0) {
        return i;
      }
    }
  }
  return -1;
}
function checkSanitizeDeprecation(opt) {
  if (opt && opt.sanitize && !opt.silent) {
    console.warn("marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options");
  }
}
function repeatString(pattern, count) {
  if (count < 1) {
    return "";
  }
  let result = "";
  while (count > 1) {
    if (count & 1) {
      result += pattern;
    }
    count >>= 1;
    pattern += pattern;
  }
  return result + pattern;
}
function outputLink(cap, link, raw, lexer2) {
  const href = link.href;
  const title = link.title ? escape(link.title) : null;
  const text = cap[1].replace(/\\([\[\]])/g, "$1");
  if (cap[0].charAt(0) !== "!") {
    lexer2.state.inLink = true;
    const token = {
      type: "link",
      raw,
      href,
      title,
      text,
      tokens: lexer2.inlineTokens(text)
    };
    lexer2.state.inLink = false;
    return token;
  }
  return {
    type: "image",
    raw,
    href,
    title,
    text: escape(text)
  };
}
function indentCodeCompensation(raw, text) {
  const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
  if (matchIndentToCode === null) {
    return text;
  }
  const indentToCode = matchIndentToCode[1];
  return text.split("\n").map((node) => {
    const matchIndentInNode = node.match(/^\s+/);
    if (matchIndentInNode === null) {
      return node;
    }
    const [indentInNode] = matchIndentInNode;
    if (indentInNode.length >= indentToCode.length) {
      return node.slice(indentToCode.length);
    }
    return node;
  }).join("\n");
}
var Tokenizer = class {
  constructor(options2) {
    this.options = options2 || defaults;
  }
  space(src) {
    const cap = this.rules.block.newline.exec(src);
    if (cap && cap[0].length > 0) {
      return {
        type: "space",
        raw: cap[0]
      };
    }
  }
  code(src) {
    const cap = this.rules.block.code.exec(src);
    if (cap) {
      const text = cap[0].replace(/^ {1,4}/gm, "");
      return {
        type: "code",
        raw: cap[0],
        codeBlockStyle: "indented",
        text: !this.options.pedantic ? rtrim(text, "\n") : text
      };
    }
  }
  fences(src) {
    const cap = this.rules.block.fences.exec(src);
    if (cap) {
      const raw = cap[0];
      const text = indentCodeCompensation(raw, cap[3] || "");
      return {
        type: "code",
        raw,
        lang: cap[2] ? cap[2].trim().replace(this.rules.inline._escapes, "$1") : cap[2],
        text
      };
    }
  }
  heading(src) {
    const cap = this.rules.block.heading.exec(src);
    if (cap) {
      let text = cap[2].trim();
      if (/#$/.test(text)) {
        const trimmed = rtrim(text, "#");
        if (this.options.pedantic) {
          text = trimmed.trim();
        } else if (!trimmed || / $/.test(trimmed)) {
          text = trimmed.trim();
        }
      }
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[1].length,
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  hr(src) {
    const cap = this.rules.block.hr.exec(src);
    if (cap) {
      return {
        type: "hr",
        raw: cap[0]
      };
    }
  }
  blockquote(src) {
    const cap = this.rules.block.blockquote.exec(src);
    if (cap) {
      const text = cap[0].replace(/^ *>[ \t]?/gm, "");
      const top = this.lexer.state.top;
      this.lexer.state.top = true;
      const tokens = this.lexer.blockTokens(text);
      this.lexer.state.top = top;
      return {
        type: "blockquote",
        raw: cap[0],
        tokens,
        text
      };
    }
  }
  list(src) {
    let cap = this.rules.block.list.exec(src);
    if (cap) {
      let raw, istask, ischecked, indent, i, blankLine, endsWithBlankLine, line, nextLine, rawLine, itemContents, endEarly;
      let bull = cap[1].trim();
      const isordered = bull.length > 1;
      const list = {
        type: "list",
        raw: "",
        ordered: isordered,
        start: isordered ? +bull.slice(0, -1) : "",
        loose: false,
        items: []
      };
      bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
      if (this.options.pedantic) {
        bull = isordered ? bull : "[*+-]";
      }
      const itemRegex = new RegExp(`^( {0,3}${bull})((?:[	 ][^\\n]*)?(?:\\n|$))`);
      while (src) {
        endEarly = false;
        if (!(cap = itemRegex.exec(src))) {
          break;
        }
        if (this.rules.block.hr.test(src)) {
          break;
        }
        raw = cap[0];
        src = src.substring(raw.length);
        line = cap[2].split("\n", 1)[0].replace(/^\t+/, (t) => " ".repeat(3 * t.length));
        nextLine = src.split("\n", 1)[0];
        if (this.options.pedantic) {
          indent = 2;
          itemContents = line.trimLeft();
        } else {
          indent = cap[2].search(/[^ ]/);
          indent = indent > 4 ? 1 : indent;
          itemContents = line.slice(indent);
          indent += cap[1].length;
        }
        blankLine = false;
        if (!line && /^ *$/.test(nextLine)) {
          raw += nextLine + "\n";
          src = src.substring(nextLine.length + 1);
          endEarly = true;
        }
        if (!endEarly) {
          const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`);
          const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
          const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
          const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
          while (src) {
            rawLine = src.split("\n", 1)[0];
            nextLine = rawLine;
            if (this.options.pedantic) {
              nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, "  ");
            }
            if (fencesBeginRegex.test(nextLine)) {
              break;
            }
            if (headingBeginRegex.test(nextLine)) {
              break;
            }
            if (nextBulletRegex.test(nextLine)) {
              break;
            }
            if (hrRegex.test(src)) {
              break;
            }
            if (nextLine.search(/[^ ]/) >= indent || !nextLine.trim()) {
              itemContents += "\n" + nextLine.slice(indent);
            } else {
              if (blankLine) {
                break;
              }
              if (line.search(/[^ ]/) >= 4) {
                break;
              }
              if (fencesBeginRegex.test(line)) {
                break;
              }
              if (headingBeginRegex.test(line)) {
                break;
              }
              if (hrRegex.test(line)) {
                break;
              }
              itemContents += "\n" + nextLine;
            }
            if (!blankLine && !nextLine.trim()) {
              blankLine = true;
            }
            raw += rawLine + "\n";
            src = src.substring(rawLine.length + 1);
            line = nextLine.slice(indent);
          }
        }
        if (!list.loose) {
          if (endsWithBlankLine) {
            list.loose = true;
          } else if (/\n *\n *$/.test(raw)) {
            endsWithBlankLine = true;
          }
        }
        if (this.options.gfm) {
          istask = /^\[[ xX]\] /.exec(itemContents);
          if (istask) {
            ischecked = istask[0] !== "[ ] ";
            itemContents = itemContents.replace(/^\[[ xX]\] +/, "");
          }
        }
        list.items.push({
          type: "list_item",
          raw,
          task: !!istask,
          checked: ischecked,
          loose: false,
          text: itemContents
        });
        list.raw += raw;
      }
      list.items[list.items.length - 1].raw = raw.trimRight();
      list.items[list.items.length - 1].text = itemContents.trimRight();
      list.raw = list.raw.trimRight();
      const l = list.items.length;
      for (i = 0; i < l; i++) {
        this.lexer.state.top = false;
        list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
        if (!list.loose) {
          const spacers = list.items[i].tokens.filter((t) => t.type === "space");
          const hasMultipleLineBreaks = spacers.length > 0 && spacers.some((t) => /\n.*\n/.test(t.raw));
          list.loose = hasMultipleLineBreaks;
        }
      }
      if (list.loose) {
        for (i = 0; i < l; i++) {
          list.items[i].loose = true;
        }
      }
      return list;
    }
  }
  html(src) {
    const cap = this.rules.block.html.exec(src);
    if (cap) {
      const token = {
        type: "html",
        raw: cap[0],
        pre: !this.options.sanitizer && (cap[1] === "pre" || cap[1] === "script" || cap[1] === "style"),
        text: cap[0]
      };
      if (this.options.sanitize) {
        const text = this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]);
        token.type = "paragraph";
        token.text = text;
        token.tokens = this.lexer.inline(text);
      }
      return token;
    }
  }
  def(src) {
    const cap = this.rules.block.def.exec(src);
    if (cap) {
      const tag = cap[1].toLowerCase().replace(/\s+/g, " ");
      const href = cap[2] ? cap[2].replace(/^<(.*)>$/, "$1").replace(this.rules.inline._escapes, "$1") : "";
      const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline._escapes, "$1") : cap[3];
      return {
        type: "def",
        tag,
        raw: cap[0],
        href,
        title
      };
    }
  }
  table(src) {
    const cap = this.rules.block.table.exec(src);
    if (cap) {
      const item = {
        type: "table",
        header: splitCells(cap[1]).map((c) => {
          return { text: c };
        }),
        align: cap[2].replace(/^ *|\| *$/g, "").split(/ *\| */),
        rows: cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, "").split("\n") : []
      };
      if (item.header.length === item.align.length) {
        item.raw = cap[0];
        let l = item.align.length;
        let i, j, k, row;
        for (i = 0; i < l; i++) {
          if (/^ *-+: *$/.test(item.align[i])) {
            item.align[i] = "right";
          } else if (/^ *:-+: *$/.test(item.align[i])) {
            item.align[i] = "center";
          } else if (/^ *:-+ *$/.test(item.align[i])) {
            item.align[i] = "left";
          } else {
            item.align[i] = null;
          }
        }
        l = item.rows.length;
        for (i = 0; i < l; i++) {
          item.rows[i] = splitCells(item.rows[i], item.header.length).map((c) => {
            return { text: c };
          });
        }
        l = item.header.length;
        for (j = 0; j < l; j++) {
          item.header[j].tokens = this.lexer.inline(item.header[j].text);
        }
        l = item.rows.length;
        for (j = 0; j < l; j++) {
          row = item.rows[j];
          for (k = 0; k < row.length; k++) {
            row[k].tokens = this.lexer.inline(row[k].text);
          }
        }
        return item;
      }
    }
  }
  lheading(src) {
    const cap = this.rules.block.lheading.exec(src);
    if (cap) {
      return {
        type: "heading",
        raw: cap[0],
        depth: cap[2].charAt(0) === "=" ? 1 : 2,
        text: cap[1],
        tokens: this.lexer.inline(cap[1])
      };
    }
  }
  paragraph(src) {
    const cap = this.rules.block.paragraph.exec(src);
    if (cap) {
      const text = cap[1].charAt(cap[1].length - 1) === "\n" ? cap[1].slice(0, -1) : cap[1];
      return {
        type: "paragraph",
        raw: cap[0],
        text,
        tokens: this.lexer.inline(text)
      };
    }
  }
  text(src) {
    const cap = this.rules.block.text.exec(src);
    if (cap) {
      return {
        type: "text",
        raw: cap[0],
        text: cap[0],
        tokens: this.lexer.inline(cap[0])
      };
    }
  }
  escape(src) {
    const cap = this.rules.inline.escape.exec(src);
    if (cap) {
      return {
        type: "escape",
        raw: cap[0],
        text: escape(cap[1])
      };
    }
  }
  tag(src) {
    const cap = this.rules.inline.tag.exec(src);
    if (cap) {
      if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
        this.lexer.state.inLink = true;
      } else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
        this.lexer.state.inLink = false;
      }
      if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
        this.lexer.state.inRawBlock = true;
      } else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
        this.lexer.state.inRawBlock = false;
      }
      return {
        type: this.options.sanitize ? "text" : "html",
        raw: cap[0],
        inLink: this.lexer.state.inLink,
        inRawBlock: this.lexer.state.inRawBlock,
        text: this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0]
      };
    }
  }
  link(src) {
    const cap = this.rules.inline.link.exec(src);
    if (cap) {
      const trimmedUrl = cap[2].trim();
      if (!this.options.pedantic && /^</.test(trimmedUrl)) {
        if (!/>$/.test(trimmedUrl)) {
          return;
        }
        const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), "\\");
        if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
          return;
        }
      } else {
        const lastParenIndex = findClosingBracket(cap[2], "()");
        if (lastParenIndex > -1) {
          const start = cap[0].indexOf("!") === 0 ? 5 : 4;
          const linkLen = start + cap[1].length + lastParenIndex;
          cap[2] = cap[2].substring(0, lastParenIndex);
          cap[0] = cap[0].substring(0, linkLen).trim();
          cap[3] = "";
        }
      }
      let href = cap[2];
      let title = "";
      if (this.options.pedantic) {
        const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
        if (link) {
          href = link[1];
          title = link[3];
        }
      } else {
        title = cap[3] ? cap[3].slice(1, -1) : "";
      }
      href = href.trim();
      if (/^</.test(href)) {
        if (this.options.pedantic && !/>$/.test(trimmedUrl)) {
          href = href.slice(1);
        } else {
          href = href.slice(1, -1);
        }
      }
      return outputLink(cap, {
        href: href ? href.replace(this.rules.inline._escapes, "$1") : href,
        title: title ? title.replace(this.rules.inline._escapes, "$1") : title
      }, cap[0], this.lexer);
    }
  }
  reflink(src, links) {
    let cap;
    if ((cap = this.rules.inline.reflink.exec(src)) || (cap = this.rules.inline.nolink.exec(src))) {
      let link = (cap[2] || cap[1]).replace(/\s+/g, " ");
      link = links[link.toLowerCase()];
      if (!link) {
        const text = cap[0].charAt(0);
        return {
          type: "text",
          raw: text,
          text
        };
      }
      return outputLink(cap, link, cap[0], this.lexer);
    }
  }
  emStrong(src, maskedSrc, prevChar = "") {
    let match = this.rules.inline.emStrong.lDelim.exec(src);
    if (!match) return;
    if (match[3] && prevChar.match(/[\p{L}\p{N}]/u)) return;
    const nextChar = match[1] || match[2] || "";
    if (!nextChar || nextChar && (prevChar === "" || this.rules.inline.punctuation.exec(prevChar))) {
      const lLength = match[0].length - 1;
      let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
      const endReg = match[0][0] === "*" ? this.rules.inline.emStrong.rDelimAst : this.rules.inline.emStrong.rDelimUnd;
      endReg.lastIndex = 0;
      maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
      while ((match = endReg.exec(maskedSrc)) != null) {
        rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!rDelim) continue;
        rLength = rDelim.length;
        if (match[3] || match[4]) {
          delimTotal += rLength;
          continue;
        } else if (match[5] || match[6]) {
          if (lLength % 3 && !((lLength + rLength) % 3)) {
            midDelimTotal += rLength;
            continue;
          }
        }
        delimTotal -= rLength;
        if (delimTotal > 0) continue;
        rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
        const raw = src.slice(0, lLength + match.index + (match[0].length - rDelim.length) + rLength);
        if (Math.min(lLength, rLength) % 2) {
          const text2 = raw.slice(1, -1);
          return {
            type: "em",
            raw,
            text: text2,
            tokens: this.lexer.inlineTokens(text2)
          };
        }
        const text = raw.slice(2, -2);
        return {
          type: "strong",
          raw,
          text,
          tokens: this.lexer.inlineTokens(text)
        };
      }
    }
  }
  codespan(src) {
    const cap = this.rules.inline.code.exec(src);
    if (cap) {
      let text = cap[2].replace(/\n/g, " ");
      const hasNonSpaceChars = /[^ ]/.test(text);
      const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
      if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
        text = text.substring(1, text.length - 1);
      }
      text = escape(text, true);
      return {
        type: "codespan",
        raw: cap[0],
        text
      };
    }
  }
  br(src) {
    const cap = this.rules.inline.br.exec(src);
    if (cap) {
      return {
        type: "br",
        raw: cap[0]
      };
    }
  }
  del(src) {
    const cap = this.rules.inline.del.exec(src);
    if (cap) {
      return {
        type: "del",
        raw: cap[0],
        text: cap[2],
        tokens: this.lexer.inlineTokens(cap[2])
      };
    }
  }
  autolink(src, mangle2) {
    const cap = this.rules.inline.autolink.exec(src);
    if (cap) {
      let text, href;
      if (cap[2] === "@") {
        text = escape(this.options.mangle ? mangle2(cap[1]) : cap[1]);
        href = "mailto:" + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  url(src, mangle2) {
    let cap;
    if (cap = this.rules.inline.url.exec(src)) {
      let text, href;
      if (cap[2] === "@") {
        text = escape(this.options.mangle ? mangle2(cap[0]) : cap[0]);
        href = "mailto:" + text;
      } else {
        let prevCapZero;
        do {
          prevCapZero = cap[0];
          cap[0] = this.rules.inline._backpedal.exec(cap[0])[0];
        } while (prevCapZero !== cap[0]);
        text = escape(cap[0]);
        if (cap[1] === "www.") {
          href = "http://" + cap[0];
        } else {
          href = cap[0];
        }
      }
      return {
        type: "link",
        raw: cap[0],
        text,
        href,
        tokens: [
          {
            type: "text",
            raw: text,
            text
          }
        ]
      };
    }
  }
  inlineText(src, smartypants2) {
    const cap = this.rules.inline.text.exec(src);
    if (cap) {
      let text;
      if (this.lexer.state.inRawBlock) {
        text = this.options.sanitize ? this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape(cap[0]) : cap[0];
      } else {
        text = escape(this.options.smartypants ? smartypants2(cap[0]) : cap[0]);
      }
      return {
        type: "text",
        raw: cap[0],
        text
      };
    }
  }
};
var block = {
  newline: /^(?: *(?:\n|$))+/,
  code: /^( {4}[^\n]+(?:\n(?: *(?:\n|$))*)?)+/,
  fences: /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,
  hr: /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,
  heading: /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,
  blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
  list: /^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/,
  html: "^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n *)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n *)+\\n|$))",
  def: /^ {0,3}\[(label)\]: *(?:\n *)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n *)?| *\n *)(title))? *(?:\n+|$)/,
  table: noopTest,
  lheading: /^((?:.|\n(?!\n))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  // regex template, placeholders will be replaced according to different paragraph
  // interruption rules of commonmark and the original markdown spec:
  _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,
  text: /^[^\n]+/
};
block._label = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
block.def = edit(block.def).replace("label", block._label).replace("title", block._title).getRegex();
block.bullet = /(?:[*+-]|\d{1,9}[.)])/;
block.listItemStart = edit(/^( *)(bull) */).replace("bull", block.bullet).getRegex();
block.list = edit(block.list).replace(/bull/g, block.bullet).replace("hr", "\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))").replace("def", "\\n+(?=" + block.def.source + ")").getRegex();
block._tag = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
block._comment = /<!--(?!-?>)[\s\S]*?(?:-->|$)/;
block.html = edit(block.html, "i").replace("comment", block._comment).replace("tag", block._tag).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
block.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
block.blockquote = edit(block.blockquote).replace("paragraph", block.paragraph).getRegex();
block.normal = { ...block };
block.gfm = {
  ...block.normal,
  table: "^ *([^\\n ].*\\|.*)\\n {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)"
  // Cells
};
block.gfm.table = edit(block.gfm.table).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("blockquote", " {0,3}>").replace("code", " {4}[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
block.gfm.paragraph = edit(block._paragraph).replace("hr", block.hr).replace("heading", " {0,3}#{1,6} ").replace("|lheading", "").replace("table", block.gfm.table).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", block._tag).getRegex();
block.pedantic = {
  ...block.normal,
  html: edit(
    `^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`
  ).replace("comment", block._comment).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
  heading: /^(#{1,6})(.*)(?:\n+|$)/,
  fences: noopTest,
  // fences not supported
  lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
  paragraph: edit(block.normal._paragraph).replace("hr", block.hr).replace("heading", " *#{1,6} *[^\n]").replace("lheading", block.lheading).replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").getRegex()
};
var inline = {
  escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
  autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
  url: noopTest,
  tag: "^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>",
  // CDATA section
  link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
  reflink: /^!?\[(label)\]\[(ref)\]/,
  nolink: /^!?\[(ref)\](?:\[\])?/,
  reflinkSearch: "reflink|nolink(?!\\()",
  emStrong: {
    lDelim: /^(?:\*+(?:([punct_])|[^\s*]))|^_+(?:([punct*])|([^\s_]))/,
    //        (1) and (2) can only be a Right Delimiter. (3) and (4) can only be Left.  (5) and (6) can be either Left or Right.
    //          () Skip orphan inside strong                                      () Consume to delim     (1) #***                (2) a***#, a***                             (3) #***a, ***a                 (4) ***#              (5) #***#                 (6) a***a
    rDelimAst: /^(?:[^_*\\]|\\.)*?\_\_(?:[^_*\\]|\\.)*?\*(?:[^_*\\]|\\.)*?(?=\_\_)|(?:[^*\\]|\\.)+(?=[^*])|[punct_](\*+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\*+)(?=[punct_\s]|$)|[punct_\s](\*+)(?=[^punct*_\s])|[\s](\*+)(?=[punct_])|[punct_](\*+)(?=[punct_])|(?:[^punct*_\s\\]|\\.)(\*+)(?=[^punct*_\s])/,
    rDelimUnd: /^(?:[^_*\\]|\\.)*?\*\*(?:[^_*\\]|\\.)*?\_(?:[^_*\\]|\\.)*?(?=\*\*)|(?:[^_\\]|\\.)+(?=[^_])|[punct*](\_+)(?=[\s]|$)|(?:[^punct*_\s\\]|\\.)(\_+)(?=[punct*\s]|$)|[punct*\s](\_+)(?=[^punct*_\s])|[\s](\_+)(?=[punct*])|[punct*](\_+)(?=[punct*])/
    // ^- Not allowed for _
  },
  code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
  br: /^( {2,}|\\)\n(?!\s*$)/,
  del: noopTest,
  text: /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,
  punctuation: /^([\spunctuation])/
};
inline._punctuation = "!\"#$%&'()+\\-.,/:;<=>?@\\[\\]`^{|}~";
inline.punctuation = edit(inline.punctuation).replace(/punctuation/g, inline._punctuation).getRegex();
inline.blockSkip = /\[[^\]]*?\]\([^\)]*?\)|`[^`]*?`|<[^>]*?>/g;
inline.escapedEmSt = /(?:^|[^\\])(?:\\\\)*\\[*_]/g;
inline._comment = edit(block._comment).replace("(?:-->|$)", "-->").getRegex();
inline.emStrong.lDelim = edit(inline.emStrong.lDelim).replace(/punct/g, inline._punctuation).getRegex();
inline.emStrong.rDelimAst = edit(inline.emStrong.rDelimAst, "g").replace(/punct/g, inline._punctuation).getRegex();
inline.emStrong.rDelimUnd = edit(inline.emStrong.rDelimUnd, "g").replace(/punct/g, inline._punctuation).getRegex();
inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;
inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
inline.autolink = edit(inline.autolink).replace("scheme", inline._scheme).replace("email", inline._email).getRegex();
inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;
inline.tag = edit(inline.tag).replace("comment", inline._comment).replace("attribute", inline._attribute).getRegex();
inline._label = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
inline._href = /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/;
inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;
inline.link = edit(inline.link).replace("label", inline._label).replace("href", inline._href).replace("title", inline._title).getRegex();
inline.reflink = edit(inline.reflink).replace("label", inline._label).replace("ref", block._label).getRegex();
inline.nolink = edit(inline.nolink).replace("ref", block._label).getRegex();
inline.reflinkSearch = edit(inline.reflinkSearch, "g").replace("reflink", inline.reflink).replace("nolink", inline.nolink).getRegex();
inline.normal = { ...inline };
inline.pedantic = {
  ...inline.normal,
  strong: {
    start: /^__|\*\*/,
    middle: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
    endAst: /\*\*(?!\*)/g,
    endUnd: /__(?!_)/g
  },
  em: {
    start: /^_|\*/,
    middle: /^()\*(?=\S)([\s\S]*?\S)\*(?!\*)|^_(?=\S)([\s\S]*?\S)_(?!_)/,
    endAst: /\*(?!\*)/g,
    endUnd: /_(?!_)/g
  },
  link: edit(/^!?\[(label)\]\((.*?)\)/).replace("label", inline._label).getRegex(),
  reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", inline._label).getRegex()
};
inline.gfm = {
  ...inline.normal,
  escape: edit(inline.escape).replace("])", "~|])").getRegex(),
  _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
  url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
  _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
  del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
  text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/
};
inline.gfm.url = edit(inline.gfm.url, "i").replace("email", inline.gfm._extended_email).getRegex();
inline.breaks = {
  ...inline.gfm,
  br: edit(inline.br).replace("{2,}", "*").getRegex(),
  text: edit(inline.gfm.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
};
function smartypants(text) {
  return text.replace(/---/g, "\u2014").replace(/--/g, "\u2013").replace(/(^|[-\u2014/(\[{"\s])'/g, "$1\u2018").replace(/'/g, "\u2019").replace(/(^|[-\u2014/(\[{\u2018\s])"/g, "$1\u201C").replace(/"/g, "\u201D").replace(/\.{3}/g, "\u2026");
}
function mangle(text) {
  let out = "", i, ch;
  const l = text.length;
  for (i = 0; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = "x" + ch.toString(16);
    }
    out += "&#" + ch + ";";
  }
  return out;
}
var Lexer = class _Lexer {
  constructor(options2) {
    this.tokens = [];
    this.tokens.links = /* @__PURE__ */ Object.create(null);
    this.options = options2 || defaults;
    this.options.tokenizer = this.options.tokenizer || new Tokenizer();
    this.tokenizer = this.options.tokenizer;
    this.tokenizer.options = this.options;
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = {
      inLink: false,
      inRawBlock: false,
      top: true
    };
    const rules = {
      block: block.normal,
      inline: inline.normal
    };
    if (this.options.pedantic) {
      rules.block = block.pedantic;
      rules.inline = inline.pedantic;
    } else if (this.options.gfm) {
      rules.block = block.gfm;
      if (this.options.breaks) {
        rules.inline = inline.breaks;
      } else {
        rules.inline = inline.gfm;
      }
    }
    this.tokenizer.rules = rules;
  }
  /**
   * Expose Rules
   */
  static get rules() {
    return {
      block,
      inline
    };
  }
  /**
   * Static Lex Method
   */
  static lex(src, options2) {
    const lexer2 = new _Lexer(options2);
    return lexer2.lex(src);
  }
  /**
   * Static Lex Inline Method
   */
  static lexInline(src, options2) {
    const lexer2 = new _Lexer(options2);
    return lexer2.inlineTokens(src);
  }
  /**
   * Preprocessing
   */
  lex(src) {
    src = src.replace(/\r\n|\r/g, "\n");
    this.blockTokens(src, this.tokens);
    let next;
    while (next = this.inlineQueue.shift()) {
      this.inlineTokens(next.src, next.tokens);
    }
    return this.tokens;
  }
  /**
   * Lexing
   */
  blockTokens(src, tokens = []) {
    if (this.options.pedantic) {
      src = src.replace(/\t/g, "    ").replace(/^ +$/gm, "");
    } else {
      src = src.replace(/^( *)(\t+)/gm, (_, leading, tabs) => {
        return leading + "    ".repeat(tabs.length);
      });
    }
    let token, lastToken, cutSrc, lastParagraphClipped;
    while (src) {
      if (this.options.extensions && this.options.extensions.block && this.options.extensions.block.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.space(src)) {
        src = src.substring(token.raw.length);
        if (token.raw.length === 1 && tokens.length > 0) {
          tokens[tokens.length - 1].raw += "\n";
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.code(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.fences(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.heading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.hr(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.blockquote(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.list(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.html(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.def(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.type === "paragraph" || lastToken.type === "text")) {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.raw;
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else if (!this.tokens.links[token.tag]) {
          this.tokens.links[token.tag] = {
            href: token.href,
            title: token.title
          };
        }
        continue;
      }
      if (token = this.tokenizer.table(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.lheading(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startBlock) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startBlock.forEach(function(getStartIndex) {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
        lastToken = tokens[tokens.length - 1];
        if (lastParagraphClipped && lastToken.type === "paragraph") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        lastParagraphClipped = cutSrc.length !== src.length;
        src = src.substring(token.raw.length);
        continue;
      }
      if (token = this.tokenizer.text(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += "\n" + token.raw;
          lastToken.text += "\n" + token.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    this.state.top = true;
    return tokens;
  }
  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }
  /**
   * Lexing/Compiling
   */
  inlineTokens(src, tokens = []) {
    let token, lastToken, cutSrc;
    let maskedSrc = src;
    let match;
    let keepPrevChar, prevChar;
    if (this.tokens.links) {
      const links = Object.keys(this.tokens.links);
      if (links.length > 0) {
        while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
          if (links.includes(match[0].slice(match[0].lastIndexOf("[") + 1, -1))) {
            maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
          }
        }
      }
    }
    while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index) + "[" + repeatString("a", match[0].length - 2) + "]" + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
    }
    while ((match = this.tokenizer.rules.inline.escapedEmSt.exec(maskedSrc)) != null) {
      maskedSrc = maskedSrc.slice(0, match.index + match[0].length - 2) + "++" + maskedSrc.slice(this.tokenizer.rules.inline.escapedEmSt.lastIndex);
      this.tokenizer.rules.inline.escapedEmSt.lastIndex--;
    }
    while (src) {
      if (!keepPrevChar) {
        prevChar = "";
      }
      keepPrevChar = false;
      if (this.options.extensions && this.options.extensions.inline && this.options.extensions.inline.some((extTokenizer) => {
        if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
          src = src.substring(token.raw.length);
          tokens.push(token);
          return true;
        }
        return false;
      })) {
        continue;
      }
      if (token = this.tokenizer.escape(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.tag(src)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.link(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.reflink(src, this.tokens.links)) {
        src = src.substring(token.raw.length);
        lastToken = tokens[tokens.length - 1];
        if (lastToken && token.type === "text" && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.codespan(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.br(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.del(src)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (token = this.tokenizer.autolink(src, mangle)) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      if (!this.state.inLink && (token = this.tokenizer.url(src, mangle))) {
        src = src.substring(token.raw.length);
        tokens.push(token);
        continue;
      }
      cutSrc = src;
      if (this.options.extensions && this.options.extensions.startInline) {
        let startIndex = Infinity;
        const tempSrc = src.slice(1);
        let tempStart;
        this.options.extensions.startInline.forEach(function(getStartIndex) {
          tempStart = getStartIndex.call({ lexer: this }, tempSrc);
          if (typeof tempStart === "number" && tempStart >= 0) {
            startIndex = Math.min(startIndex, tempStart);
          }
        });
        if (startIndex < Infinity && startIndex >= 0) {
          cutSrc = src.substring(0, startIndex + 1);
        }
      }
      if (token = this.tokenizer.inlineText(cutSrc, smartypants)) {
        src = src.substring(token.raw.length);
        if (token.raw.slice(-1) !== "_") {
          prevChar = token.raw.slice(-1);
        }
        keepPrevChar = true;
        lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "text") {
          lastToken.raw += token.raw;
          lastToken.text += token.text;
        } else {
          tokens.push(token);
        }
        continue;
      }
      if (src) {
        const errMsg = "Infinite loop on byte: " + src.charCodeAt(0);
        if (this.options.silent) {
          console.error(errMsg);
          break;
        } else {
          throw new Error(errMsg);
        }
      }
    }
    return tokens;
  }
};
var Renderer = class {
  constructor(options2) {
    this.options = options2 || defaults;
  }
  code(code, infostring, escaped) {
    const lang = (infostring || "").match(/\S*/)[0];
    if (this.options.highlight) {
      const out = this.options.highlight(code, lang);
      if (out != null && out !== code) {
        escaped = true;
        code = out;
      }
    }
    code = code.replace(/\n$/, "") + "\n";
    if (!lang) {
      return "<pre><code>" + (escaped ? code : escape(code, true)) + "</code></pre>\n";
    }
    return '<pre><code class="' + this.options.langPrefix + escape(lang) + '">' + (escaped ? code : escape(code, true)) + "</code></pre>\n";
  }
  /**
   * @param {string} quote
   */
  blockquote(quote) {
    return `<blockquote>
${quote}</blockquote>
`;
  }
  html(html) {
    return html;
  }
  /**
   * @param {string} text
   * @param {string} level
   * @param {string} raw
   * @param {any} slugger
   */
  heading(text, level, raw, slugger) {
    if (this.options.headerIds) {
      const id = this.options.headerPrefix + slugger.slug(raw);
      return `<h${level} id="${id}">${text}</h${level}>
`;
    }
    return `<h${level}>${text}</h${level}>
`;
  }
  hr() {
    return this.options.xhtml ? "<hr/>\n" : "<hr>\n";
  }
  list(body, ordered, start) {
    const type = ordered ? "ol" : "ul", startatt = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + type + startatt + ">\n" + body + "</" + type + ">\n";
  }
  /**
   * @param {string} text
   */
  listitem(text) {
    return `<li>${text}</li>
`;
  }
  checkbox(checked) {
    return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox"' + (this.options.xhtml ? " /" : "") + "> ";
  }
  /**
   * @param {string} text
   */
  paragraph(text) {
    return `<p>${text}</p>
`;
  }
  /**
   * @param {string} header
   * @param {string} body
   */
  table(header, body) {
    if (body) body = `<tbody>${body}</tbody>`;
    return "<table>\n<thead>\n" + header + "</thead>\n" + body + "</table>\n";
  }
  /**
   * @param {string} content
   */
  tablerow(content) {
    return `<tr>
${content}</tr>
`;
  }
  tablecell(content, flags) {
    const type = flags.header ? "th" : "td";
    const tag = flags.align ? `<${type} align="${flags.align}">` : `<${type}>`;
    return tag + content + `</${type}>
`;
  }
  /**
   * span level renderer
   * @param {string} text
   */
  strong(text) {
    return `<strong>${text}</strong>`;
  }
  /**
   * @param {string} text
   */
  em(text) {
    return `<em>${text}</em>`;
  }
  /**
   * @param {string} text
   */
  codespan(text) {
    return `<code>${text}</code>`;
  }
  br() {
    return this.options.xhtml ? "<br/>" : "<br>";
  }
  /**
   * @param {string} text
   */
  del(text) {
    return `<del>${text}</del>`;
  }
  /**
   * @param {string} href
   * @param {string} title
   * @param {string} text
   */
  link(href, title, text) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + title + '"';
    }
    out += ">" + text + "</a>";
    return out;
  }
  /**
   * @param {string} href
   * @param {string} title
   * @param {string} text
   */
  image(href, title, text) {
    href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
    if (href === null) {
      return text;
    }
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }
    out += this.options.xhtml ? "/>" : ">";
    return out;
  }
  text(text) {
    return text;
  }
};
var TextRenderer = class {
  // no need for block level renderers
  strong(text) {
    return text;
  }
  em(text) {
    return text;
  }
  codespan(text) {
    return text;
  }
  del(text) {
    return text;
  }
  html(text) {
    return text;
  }
  text(text) {
    return text;
  }
  link(href, title, text) {
    return "" + text;
  }
  image(href, title, text) {
    return "" + text;
  }
  br() {
    return "";
  }
};
var Slugger = class {
  constructor() {
    this.seen = {};
  }
  /**
   * @param {string} value
   */
  serialize(value) {
    return value.toLowerCase().trim().replace(/<[!\/a-z].*?>/ig, "").replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "").replace(/\s/g, "-");
  }
  /**
   * Finds the next safe (unique) slug to use
   * @param {string} originalSlug
   * @param {boolean} isDryRun
   */
  getNextSafeSlug(originalSlug, isDryRun) {
    let slug = originalSlug;
    let occurenceAccumulator = 0;
    if (this.seen.hasOwnProperty(slug)) {
      occurenceAccumulator = this.seen[originalSlug];
      do {
        occurenceAccumulator++;
        slug = originalSlug + "-" + occurenceAccumulator;
      } while (this.seen.hasOwnProperty(slug));
    }
    if (!isDryRun) {
      this.seen[originalSlug] = occurenceAccumulator;
      this.seen[slug] = 0;
    }
    return slug;
  }
  /**
   * Convert string to unique id
   * @param {object} [options]
   * @param {boolean} [options.dryrun] Generates the next unique slug without
   * updating the internal accumulator.
   */
  slug(value, options2 = {}) {
    const slug = this.serialize(value);
    return this.getNextSafeSlug(slug, options2.dryrun);
  }
};
var Parser = class _Parser {
  constructor(options2) {
    this.options = options2 || defaults;
    this.options.renderer = this.options.renderer || new Renderer();
    this.renderer = this.options.renderer;
    this.renderer.options = this.options;
    this.textRenderer = new TextRenderer();
    this.slugger = new Slugger();
  }
  /**
   * Static Parse Method
   */
  static parse(tokens, options2) {
    const parser2 = new _Parser(options2);
    return parser2.parse(tokens);
  }
  /**
   * Static Parse Inline Method
   */
  static parseInline(tokens, options2) {
    const parser2 = new _Parser(options2);
    return parser2.parseInline(tokens);
  }
  /**
   * Parse Loop
   */
  parse(tokens, top = true) {
    let out = "", i, j, k, l2, l3, row, cell, header, body, token, ordered, start, loose, itemBody, item, checked, task, checkbox, ret;
    const l = tokens.length;
    for (i = 0; i < l; i++) {
      token = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
        ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
        if (ret !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(token.type)) {
          out += ret || "";
          continue;
        }
      }
      switch (token.type) {
        case "space": {
          continue;
        }
        case "hr": {
          out += this.renderer.hr();
          continue;
        }
        case "heading": {
          out += this.renderer.heading(
            this.parseInline(token.tokens),
            token.depth,
            unescape(this.parseInline(token.tokens, this.textRenderer)),
            this.slugger
          );
          continue;
        }
        case "code": {
          out += this.renderer.code(
            token.text,
            token.lang,
            token.escaped
          );
          continue;
        }
        case "table": {
          header = "";
          cell = "";
          l2 = token.header.length;
          for (j = 0; j < l2; j++) {
            cell += this.renderer.tablecell(
              this.parseInline(token.header[j].tokens),
              { header: true, align: token.align[j] }
            );
          }
          header += this.renderer.tablerow(cell);
          body = "";
          l2 = token.rows.length;
          for (j = 0; j < l2; j++) {
            row = token.rows[j];
            cell = "";
            l3 = row.length;
            for (k = 0; k < l3; k++) {
              cell += this.renderer.tablecell(
                this.parseInline(row[k].tokens),
                { header: false, align: token.align[k] }
              );
            }
            body += this.renderer.tablerow(cell);
          }
          out += this.renderer.table(header, body);
          continue;
        }
        case "blockquote": {
          body = this.parse(token.tokens);
          out += this.renderer.blockquote(body);
          continue;
        }
        case "list": {
          ordered = token.ordered;
          start = token.start;
          loose = token.loose;
          l2 = token.items.length;
          body = "";
          for (j = 0; j < l2; j++) {
            item = token.items[j];
            checked = item.checked;
            task = item.task;
            itemBody = "";
            if (item.task) {
              checkbox = this.renderer.checkbox(checked);
              if (loose) {
                if (item.tokens.length > 0 && item.tokens[0].type === "paragraph") {
                  item.tokens[0].text = checkbox + " " + item.tokens[0].text;
                  if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === "text") {
                    item.tokens[0].tokens[0].text = checkbox + " " + item.tokens[0].tokens[0].text;
                  }
                } else {
                  item.tokens.unshift({
                    type: "text",
                    text: checkbox
                  });
                }
              } else {
                itemBody += checkbox;
              }
            }
            itemBody += this.parse(item.tokens, loose);
            body += this.renderer.listitem(itemBody, task, checked);
          }
          out += this.renderer.list(body, ordered, start);
          continue;
        }
        case "html": {
          out += this.renderer.html(token.text);
          continue;
        }
        case "paragraph": {
          out += this.renderer.paragraph(this.parseInline(token.tokens));
          continue;
        }
        case "text": {
          body = token.tokens ? this.parseInline(token.tokens) : token.text;
          while (i + 1 < l && tokens[i + 1].type === "text") {
            token = tokens[++i];
            body += "\n" + (token.tokens ? this.parseInline(token.tokens) : token.text);
          }
          out += top ? this.renderer.paragraph(body) : body;
          continue;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return;
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
  /**
   * Parse Inline Tokens
   */
  parseInline(tokens, renderer) {
    renderer = renderer || this.renderer;
    let out = "", i, token, ret;
    const l = tokens.length;
    for (i = 0; i < l; i++) {
      token = tokens[i];
      if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[token.type]) {
        ret = this.options.extensions.renderers[token.type].call({ parser: this }, token);
        if (ret !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(token.type)) {
          out += ret || "";
          continue;
        }
      }
      switch (token.type) {
        case "escape": {
          out += renderer.text(token.text);
          break;
        }
        case "html": {
          out += renderer.html(token.text);
          break;
        }
        case "link": {
          out += renderer.link(token.href, token.title, this.parseInline(token.tokens, renderer));
          break;
        }
        case "image": {
          out += renderer.image(token.href, token.title, token.text);
          break;
        }
        case "strong": {
          out += renderer.strong(this.parseInline(token.tokens, renderer));
          break;
        }
        case "em": {
          out += renderer.em(this.parseInline(token.tokens, renderer));
          break;
        }
        case "codespan": {
          out += renderer.codespan(token.text);
          break;
        }
        case "br": {
          out += renderer.br();
          break;
        }
        case "del": {
          out += renderer.del(this.parseInline(token.tokens, renderer));
          break;
        }
        case "text": {
          out += renderer.text(token.text);
          break;
        }
        default: {
          const errMsg = 'Token with "' + token.type + '" type was not found.';
          if (this.options.silent) {
            console.error(errMsg);
            return;
          } else {
            throw new Error(errMsg);
          }
        }
      }
    }
    return out;
  }
};
var Hooks = class {
  constructor(options2) {
    this.options = options2 || defaults;
  }
  static passThroughHooks = /* @__PURE__ */ new Set([
    "preprocess",
    "postprocess"
  ]);
  /**
   * Process markdown before marked
   */
  preprocess(markdown) {
    return markdown;
  }
  /**
   * Process HTML after marked is finished
   */
  postprocess(html) {
    return html;
  }
};
function onError(silent, async, callback) {
  return (e) => {
    e.message += "\nPlease report this to https://github.com/markedjs/marked.";
    if (silent) {
      const msg = "<p>An error occurred:</p><pre>" + escape(e.message + "", true) + "</pre>";
      if (async) {
        return Promise.resolve(msg);
      }
      if (callback) {
        callback(null, msg);
        return;
      }
      return msg;
    }
    if (async) {
      return Promise.reject(e);
    }
    if (callback) {
      callback(e);
      return;
    }
    throw e;
  };
}
function parseMarkdown(lexer2, parser2) {
  return (src, opt, callback) => {
    if (typeof opt === "function") {
      callback = opt;
      opt = null;
    }
    const origOpt = { ...opt };
    opt = { ...marked.defaults, ...origOpt };
    const throwError = onError(opt.silent, opt.async, callback);
    if (typeof src === "undefined" || src === null) {
      return throwError(new Error("marked(): input parameter is undefined or null"));
    }
    if (typeof src !== "string") {
      return throwError(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(src) + ", string expected"));
    }
    checkSanitizeDeprecation(opt);
    if (opt.hooks) {
      opt.hooks.options = opt;
    }
    if (callback) {
      const highlight = opt.highlight;
      let tokens;
      try {
        if (opt.hooks) {
          src = opt.hooks.preprocess(src);
        }
        tokens = lexer2(src, opt);
      } catch (e) {
        return throwError(e);
      }
      const done = function(err) {
        let out;
        if (!err) {
          try {
            if (opt.walkTokens) {
              marked.walkTokens(tokens, opt.walkTokens);
            }
            out = parser2(tokens, opt);
            if (opt.hooks) {
              out = opt.hooks.postprocess(out);
            }
          } catch (e) {
            err = e;
          }
        }
        opt.highlight = highlight;
        return err ? throwError(err) : callback(null, out);
      };
      if (!highlight || highlight.length < 3) {
        return done();
      }
      delete opt.highlight;
      if (!tokens.length) return done();
      let pending = 0;
      marked.walkTokens(tokens, function(token) {
        if (token.type === "code") {
          pending++;
          setTimeout(() => {
            highlight(token.text, token.lang, function(err, code) {
              if (err) {
                return done(err);
              }
              if (code != null && code !== token.text) {
                token.text = code;
                token.escaped = true;
              }
              pending--;
              if (pending === 0) {
                done();
              }
            });
          }, 0);
        }
      });
      if (pending === 0) {
        done();
      }
      return;
    }
    if (opt.async) {
      return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src).then((src2) => lexer2(src2, opt)).then((tokens) => opt.walkTokens ? Promise.all(marked.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens).then((tokens) => parser2(tokens, opt)).then((html) => opt.hooks ? opt.hooks.postprocess(html) : html).catch(throwError);
    }
    try {
      if (opt.hooks) {
        src = opt.hooks.preprocess(src);
      }
      const tokens = lexer2(src, opt);
      if (opt.walkTokens) {
        marked.walkTokens(tokens, opt.walkTokens);
      }
      let html = parser2(tokens, opt);
      if (opt.hooks) {
        html = opt.hooks.postprocess(html);
      }
      return html;
    } catch (e) {
      return throwError(e);
    }
  };
}
function marked(src, opt, callback) {
  return parseMarkdown(Lexer.lex, Parser.parse)(src, opt, callback);
}
marked.options = marked.setOptions = function(opt) {
  marked.defaults = { ...marked.defaults, ...opt };
  changeDefaults(marked.defaults);
  return marked;
};
marked.getDefaults = getDefaults;
marked.defaults = defaults;
marked.use = function(...args) {
  const extensions = marked.defaults.extensions || { renderers: {}, childTokens: {} };
  args.forEach((pack) => {
    const opts = { ...pack };
    opts.async = marked.defaults.async || opts.async || false;
    if (pack.extensions) {
      pack.extensions.forEach((ext) => {
        if (!ext.name) {
          throw new Error("extension name required");
        }
        if (ext.renderer) {
          const prevRenderer = extensions.renderers[ext.name];
          if (prevRenderer) {
            extensions.renderers[ext.name] = function(...args2) {
              let ret = ext.renderer.apply(this, args2);
              if (ret === false) {
                ret = prevRenderer.apply(this, args2);
              }
              return ret;
            };
          } else {
            extensions.renderers[ext.name] = ext.renderer;
          }
        }
        if (ext.tokenizer) {
          if (!ext.level || ext.level !== "block" && ext.level !== "inline") {
            throw new Error("extension level must be 'block' or 'inline'");
          }
          if (extensions[ext.level]) {
            extensions[ext.level].unshift(ext.tokenizer);
          } else {
            extensions[ext.level] = [ext.tokenizer];
          }
          if (ext.start) {
            if (ext.level === "block") {
              if (extensions.startBlock) {
                extensions.startBlock.push(ext.start);
              } else {
                extensions.startBlock = [ext.start];
              }
            } else if (ext.level === "inline") {
              if (extensions.startInline) {
                extensions.startInline.push(ext.start);
              } else {
                extensions.startInline = [ext.start];
              }
            }
          }
        }
        if (ext.childTokens) {
          extensions.childTokens[ext.name] = ext.childTokens;
        }
      });
      opts.extensions = extensions;
    }
    if (pack.renderer) {
      const renderer = marked.defaults.renderer || new Renderer();
      for (const prop in pack.renderer) {
        const prevRenderer = renderer[prop];
        renderer[prop] = (...args2) => {
          let ret = pack.renderer[prop].apply(renderer, args2);
          if (ret === false) {
            ret = prevRenderer.apply(renderer, args2);
          }
          return ret;
        };
      }
      opts.renderer = renderer;
    }
    if (pack.tokenizer) {
      const tokenizer = marked.defaults.tokenizer || new Tokenizer();
      for (const prop in pack.tokenizer) {
        const prevTokenizer = tokenizer[prop];
        tokenizer[prop] = (...args2) => {
          let ret = pack.tokenizer[prop].apply(tokenizer, args2);
          if (ret === false) {
            ret = prevTokenizer.apply(tokenizer, args2);
          }
          return ret;
        };
      }
      opts.tokenizer = tokenizer;
    }
    if (pack.hooks) {
      const hooks = marked.defaults.hooks || new Hooks();
      for (const prop in pack.hooks) {
        const prevHook = hooks[prop];
        if (Hooks.passThroughHooks.has(prop)) {
          hooks[prop] = (arg) => {
            if (marked.defaults.async) {
              return Promise.resolve(pack.hooks[prop].call(hooks, arg)).then((ret2) => {
                return prevHook.call(hooks, ret2);
              });
            }
            const ret = pack.hooks[prop].call(hooks, arg);
            return prevHook.call(hooks, ret);
          };
        } else {
          hooks[prop] = (...args2) => {
            let ret = pack.hooks[prop].apply(hooks, args2);
            if (ret === false) {
              ret = prevHook.apply(hooks, args2);
            }
            return ret;
          };
        }
      }
      opts.hooks = hooks;
    }
    if (pack.walkTokens) {
      const walkTokens2 = marked.defaults.walkTokens;
      opts.walkTokens = function(token) {
        let values = [];
        values.push(pack.walkTokens.call(this, token));
        if (walkTokens2) {
          values = values.concat(walkTokens2.call(this, token));
        }
        return values;
      };
    }
    marked.setOptions(opts);
  });
};
marked.walkTokens = function(tokens, callback) {
  let values = [];
  for (const token of tokens) {
    values = values.concat(callback.call(marked, token));
    switch (token.type) {
      case "table": {
        for (const cell of token.header) {
          values = values.concat(marked.walkTokens(cell.tokens, callback));
        }
        for (const row of token.rows) {
          for (const cell of row) {
            values = values.concat(marked.walkTokens(cell.tokens, callback));
          }
        }
        break;
      }
      case "list": {
        values = values.concat(marked.walkTokens(token.items, callback));
        break;
      }
      default: {
        if (marked.defaults.extensions && marked.defaults.extensions.childTokens && marked.defaults.extensions.childTokens[token.type]) {
          marked.defaults.extensions.childTokens[token.type].forEach(function(childTokens) {
            values = values.concat(marked.walkTokens(token[childTokens], callback));
          });
        } else if (token.tokens) {
          values = values.concat(marked.walkTokens(token.tokens, callback));
        }
      }
    }
  }
  return values;
};
marked.parseInline = parseMarkdown(Lexer.lexInline, Parser.parseInline);
marked.Parser = Parser;
marked.parser = Parser.parse;
marked.Renderer = Renderer;
marked.TextRenderer = TextRenderer;
marked.Lexer = Lexer;
marked.lexer = Lexer.lex;
marked.Tokenizer = Tokenizer;
marked.Slugger = Slugger;
marked.Hooks = Hooks;
marked.parse = marked;
var options = marked.options;
var setOptions = marked.setOptions;
var use = marked.use;
var walkTokens = marked.walkTokens;
var parseInline = marked.parseInline;
var parser = Parser.parse;
var lexer = Lexer.lex;

// index.tsx
var LIVE_WAVEFORM_SAMPLES = 256;
var NETLIFY_FUNCTION_PATH = "/.netlify/functions/gemini-proxy";
var App = class {
  constructor() {
    this.liveWaveformContext = null;
    this.currentDeleteNoteId = null;
    this.pendingAudioFile = null;
    this.pendingAudioUploadEventTarget = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyserNode = null;
    this.microphoneSource = null;
    this.waveformDataArray = null;
    this.waveformAnimationId = null;
    this.liveRecordingStartTime = 0;
    this.liveRecordingTimerIntervalId = null;
    this.currentNote = null;
    this.notes = [];
    this.currentPolishMode = "standard";
    this.currentCustomPolishPrompt = "";
    this.autosaveTimeout = null;
    this.statusClearTimeout = null;
    this.promptTemplates = [
      { name: "Seleccionar plantilla...", value: "" },
      { name: "Resumir para email", value: "Resume el siguiente texto para incluirlo en un email conciso. Enf\xF3cate en los puntos principales y acciones requeridas. Formatea en markdown. Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol." },
      { name: "Extraer puntos clave (Vi\xF1etas)", value: "Extrae los puntos clave m\xE1s importantes del siguiente texto en formato de lista de vi\xF1etas (markdown). Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol." },
      { name: "Corregir gram\xE1tica y estilo", value: "Revisa y corrige la gram\xE1tica, ortograf\xEDa y estilo del siguiente texto para que sea claro y profesional. Mant\xE9n el formato original si es posible. Formatea en markdown. Aseg\xFArate de que la respuesta est\xE9 en espa\xF1ol." },
      { name: "Traducir a Ingl\xE9s", value: "Translate the following text to English. Preserve original formatting if possible. Respond only with the translation." },
      { name: "Traducir a Espa\xF1ol", value: "Traduce el siguiente texto al espa\xF1ol. Conserva el formato original si es posible. Responde \xFAnicamente con la traducci\xF3n." },
      { name: "Explicar como si tuviera 5 a\xF1os", value: "Explain the following concept or text as if I were 5 years old. Use simple words and short sentences. Format in markdown. Ensure the response is in Spanish." }
    ];
    this.markdownParser = marked;
    this.editorTitle = document.querySelector(".editor-title");
    this.polishedNote = document.getElementById("polishedNote");
    this.rawTranscription = document.getElementById("rawTranscription");
    this.recordButton = document.getElementById("recordButton");
    this.newButton = document.getElementById("newButton");
    this.polishTextButton = document.getElementById("polishTextButton");
    this.retryPolishButton = document.getElementById("retryPolishButton");
    this.themeToggleButton = document.getElementById("themeToggleButton");
    this.recordingStatus = document.getElementById("recordingStatus");
    this.liveRecordingTitle = document.getElementById("liveRecordingTitle");
    this.liveWaveformCanvas = document.getElementById("liveWaveformCanvas");
    this.liveRecordingTimerDisplay = document.getElementById("liveRecordingTimerDisplay");
    this.recordingInterface = document.querySelector(".recording-interface");
    this.mainContent = document.querySelector(".main-content");
    this.historyButton = document.getElementById("historyButton");
    this.historyPanel = document.getElementById("historyPanel");
    this.closeHistoryPanelButton = document.getElementById("closeHistoryPanelButton");
    this.historyList = document.getElementById("historyList");
    this.historySearchInput = document.getElementById("historySearchInput");
    this.exportHistoryButton = document.getElementById("exportHistoryButton");
    this.importHistoryButton = document.getElementById("importHistoryButton");
    this.importHistoryInput = document.getElementById("importHistoryInput");
    this.audioUploadInput = document.getElementById("audioUploadInput");
    this.audioUploadButton = document.getElementById("audioUploadButton");
    this.polishOptionsModal = document.getElementById("polishOptionsModal");
    this.closePolishOptionsModalButton = document.getElementById("closePolishOptionsModalButton");
    this.polishModeSelect = document.getElementById("polishModeSelect");
    this.customPromptContainer = document.getElementById("customPromptContainer");
    this.customPromptTemplateContainer = document.getElementById("customPromptTemplateContainer");
    this.customPromptTemplateSelect = document.getElementById("customPromptTemplateSelect");
    this.customPromptTextarea = document.getElementById("customPromptTextarea");
    this.applyPolishOptionsButton = document.getElementById("applyPolishOptionsButton");
    this.currentNotePolishModeSelect = document.getElementById("currentNotePolishModeSelect");
    this.topCopyPolishedButton = document.getElementById("topCopyPolishedButton");
    this.copyPolishedButton = document.getElementById("copyPolishedButton");
    this.exportPolishedTxtButton = document.getElementById("exportPolishedTxtButton");
    this.exportPolishedMdButton = document.getElementById("exportPolishedMdButton");
    this.copyRawButton = document.getElementById("copyRawButton");
    this.exportRawTxtButton = document.getElementById("exportRawTxtButton");
    this.exportRawMdButton = document.getElementById("exportRawMdButton");
    this.polishedCounters = document.getElementById("polishedCounters");
    this.rawCounters = document.getElementById("rawCounters");
    this.confirmDeleteModal = document.getElementById("confirmDeleteModal");
    this.confirmDeleteMessageElement = document.getElementById("confirmDeleteModalMessage");
    this.confirmDeleteConfirmButton = document.getElementById("confirmDeleteConfirmButton");
    this.confirmDeleteCancelButton = document.getElementById("confirmDeleteCancelButton");
    this.confirmAudioUploadModal = document.getElementById("confirmAudioUploadModal");
    this.confirmAudioUploadMessageElement = document.getElementById("confirmAudioUploadModalMessage");
    this.confirmAudioUploadOverwriteButton = document.getElementById("confirmAudioUploadOverwriteButton");
    this.confirmAudioUploadCreateNewButton = document.getElementById("confirmAudioUploadCreateNewButton");
    this.confirmAudioUploadCancelButton = document.getElementById("confirmAudioUploadCancelButton");
    this.polishedNotePlaceholder = this.polishedNote.getAttribute("placeholder") || "Tus notas pulidas aparecer\xE1n aqu\xED...";
    this.rawTranscriptionPlaceholder = this.rawTranscription.getAttribute("placeholder") || "La transcripci\xF3n en bruto aparecer\xE1 aqu\xED...";
    this.editorTitlePlaceholder = this.editorTitle.getAttribute("placeholder") || "Nota sin T\xEDtulo";
    if (this.liveWaveformCanvas) {
      this.liveWaveformContext = this.liveWaveformCanvas.getContext("2d");
    }
    this.populatePromptTemplates();
    this.loadNotesFromStorage();
    this.initEventListeners();
    this.initConfirmDeleteModalListeners();
    this.initConfirmAudioUploadModalListeners();
    this.initializePlaceholders();
    this.checkInitialTheme();
    this.loadInitialNote();
    this.updateAllButtonStates();
    this.updateAllWordCharCounts();
  }
  showFatalError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.top = "0";
    errorDiv.style.left = "0";
    errorDiv.style.width = "100%";
    errorDiv.style.padding = "20px";
    errorDiv.style.backgroundColor = "red";
    errorDiv.style.color = "white";
    errorDiv.style.textAlign = "center";
    errorDiv.style.fontSize = "20px";
    errorDiv.style.zIndex = "9999";
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    const appContainer = document.querySelector(".app-container");
    if (appContainer) appContainer.style.display = "none";
  }
  initializePlaceholders() {
    this.setupPlaceholder(this.editorTitle, this.editorTitlePlaceholder);
    this.setupPlaceholder(this.polishedNote, this.polishedNotePlaceholder);
    this.setupPlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
  }
  setupPlaceholder(element, placeholderText) {
    if (!element.textContent?.trim() && placeholderText) {
      element.textContent = placeholderText;
      element.classList.add("placeholder-active");
    }
    element.addEventListener("focus", () => {
      if (element.classList.contains("placeholder-active")) {
        element.textContent = "";
        element.classList.remove("placeholder-active");
      }
    });
    element.addEventListener("blur", () => {
      if (!element.textContent?.trim()) {
        element.textContent = placeholderText;
        element.classList.add("placeholder-active");
      }
      this.handleAutoSave();
    });
  }
  clearPlaceholder(element) {
    const placeholderText = element.getAttribute("placeholder");
    if (element.classList.contains("placeholder-active") && placeholderText && element.textContent === placeholderText) {
      element.textContent = "";
    }
    element.classList.remove("placeholder-active");
  }
  restorePlaceholder(element, placeholderText) {
    const isEmpty = element.isContentEditable ? !element.innerHTML?.trim() || element.innerHTML === "<br>" || element.innerHTML === "<p><br></p>" : !element.textContent?.trim();
    if (isEmpty) {
      element.textContent = placeholderText;
      element.classList.add("placeholder-active");
    } else if (!element.classList.contains("placeholder-active") && element.textContent === placeholderText) {
      element.classList.add("placeholder-active");
    }
  }
  populatePromptTemplates() {
    this.promptTemplates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.value;
      option.textContent = template.name;
      this.customPromptTemplateSelect.appendChild(option);
    });
  }
  initEventListeners() {
    this.recordButton.addEventListener("click", () => this.toggleRecording());
    this.newButton.addEventListener("click", () => this.createNewNoteUIAction());
    this.polishTextButton.addEventListener("click", () => this.handleManualPolishWithCurrentSettings());
    this.retryPolishButton.addEventListener("click", () => this.handleRetryPolish());
    this.themeToggleButton.addEventListener("click", () => this.toggleTheme());
    this.historyButton.addEventListener("click", () => this.toggleHistoryPanel());
    this.closeHistoryPanelButton.addEventListener("click", () => this.toggleHistoryPanel(false));
    this.historySearchInput.addEventListener("input", () => this.renderHistoryList());
    this.exportHistoryButton.addEventListener("click", () => this.exportHistory());
    this.importHistoryButton.addEventListener("click", () => this.importHistoryInput.click());
    this.importHistoryInput.addEventListener("change", (event) => this.importHistory(event));
    this.audioUploadButton.addEventListener("click", () => this.audioUploadInput.click());
    this.audioUploadInput.addEventListener("change", (event) => this.handleAudioFileUpload(event));
    this.closePolishOptionsModalButton.addEventListener("click", () => this.togglePolishOptionsModal(false));
    this.polishModeSelect.addEventListener("change", () => this.handlePolishModeChangeInModal());
    this.customPromptTemplateSelect.addEventListener("change", () => this.handlePromptTemplateChange());
    this.applyPolishOptionsButton.addEventListener("click", () => this.applyAndPolishFromModal());
    this.currentNotePolishModeSelect.addEventListener("change", () => this.handleCurrentNotePolishModeChange());
    this.topCopyPolishedButton.addEventListener("click", () => this.copyContentToClipboard(this.polishedNote, "Nota Pulida"));
    this.copyPolishedButton.addEventListener("click", () => this.copyContentToClipboard(this.polishedNote, "Nota Pulida"));
    this.exportPolishedTxtButton.addEventListener("click", () => this.exportNoteContent("polished", "txt"));
    this.exportPolishedMdButton.addEventListener("click", () => this.exportNoteContent("polished", "md"));
    this.copyRawButton.addEventListener("click", () => this.copyContentToClipboard(this.rawTranscription, "Borrador"));
    this.exportRawTxtButton.addEventListener("click", () => this.exportNoteContent("raw", "txt"));
    this.exportRawMdButton.addEventListener("click", () => this.exportNoteContent("raw", "md"));
    this.editorTitle.addEventListener("input", () => this.handleContentChange(this.editorTitle, "title"));
    this.polishedNote.addEventListener("input", () => {
      this.handleContentChange(this.polishedNote, "polished");
      requestAnimationFrame(() => {
        this.updateWordCharCount("polished");
        this.updateTopCopyButtonVisibility();
      });
    });
    this.rawTranscription.addEventListener("input", () => {
      this.handleContentChange(this.rawTranscription, "raw");
      requestAnimationFrame(() => {
        this.updateAllButtonStates();
        this.updateWordCharCount("raw");
      });
    });
    this.editorTitle.addEventListener("blur", () => this.updateDocumentTitle());
  }
  initConfirmDeleteModalListeners() {
    this.confirmDeleteCancelButton.addEventListener("click", () => this.hideConfirmDeleteModal());
    this.confirmDeleteConfirmButton.addEventListener("click", () => {
      if (this.currentDeleteNoteId) {
        this.deleteNoteById(this.currentDeleteNoteId);
      }
      this.hideConfirmDeleteModal();
    });
  }
  initConfirmAudioUploadModalListeners() {
    this.confirmAudioUploadOverwriteButton.addEventListener("click", () => {
      this.hideConfirmAudioUploadModal();
      if (this.pendingAudioFile && this.pendingAudioUploadEventTarget) {
        this.proceedWithAudioProcessing(this.pendingAudioFile, this.pendingAudioUploadEventTarget);
      }
    });
    this.confirmAudioUploadCreateNewButton.addEventListener("click", () => {
      this.hideConfirmAudioUploadModal();
      if (this.pendingAudioFile && this.pendingAudioUploadEventTarget) {
        this.createNewNoteUIAction();
        this.proceedWithAudioProcessing(this.pendingAudioFile, this.pendingAudioUploadEventTarget);
      }
    });
    this.confirmAudioUploadCancelButton.addEventListener("click", () => {
      this.hideConfirmAudioUploadModal();
      this.clearPendingAudioUpload();
    });
  }
  handleContentChange(element, fieldType) {
    if (element.classList.contains("placeholder-active")) {
      element.classList.remove("placeholder-active");
    }
    if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
    this.autosaveTimeout = window.setTimeout(() => {
      this.updateCurrentNoteFromUI();
      this.saveCurrentNote(false);
    }, 750);
  }
  handleAutoSave() {
    if (this.autosaveTimeout) clearTimeout(this.autosaveTimeout);
    this.updateCurrentNoteFromUI();
    this.saveCurrentNote(false);
  }
  loadNotesFromStorage() {
    const storedNotes = localStorage.getItem("dictationAppNotes");
    if (storedNotes) {
      try {
        this.notes = JSON.parse(storedNotes);
        this.notes = this.notes.filter((note) => note && typeof note.id === "string" && typeof note.title === "string");
        this.notes.sort((a, b) => b.lastModified - a.lastModified);
      } catch (error) {
        console.error("Error al parsear notas del localStorage:", error);
        this.notes = [];
        localStorage.removeItem("dictationAppNotes");
      }
    } else {
      this.notes = [];
    }
    this.renderHistoryList();
  }
  saveNotesToStorage() {
    try {
      localStorage.setItem("dictationAppNotes", JSON.stringify(this.notes));
    } catch (error) {
      console.error("Error al guardar notas en localStorage:", error);
      this.updateStatus("Error al guardar notas. Puede que el almacenamiento est\xE9 lleno.", "error", 5e3);
    }
  }
  generateUUID() {
    return crypto.randomUUID();
  }
  createNewNoteObject() {
    const timestamp = Date.now();
    return {
      id: this.generateUUID(),
      title: "",
      rawText: "",
      polishedHTML: "",
      polishedMarkdown: "",
      polishModeUsed: "standard",
      customPromptUsed: void 0,
      createdAt: timestamp,
      lastModified: timestamp
    };
  }
  loadInitialNote() {
    if (this.notes.length > 0) {
      this.loadNoteIntoUI(this.notes[0].id, true);
    } else {
      this.currentNote = this.createNewNoteObject();
      this.notes.push(this.currentNote);
      this.saveNotesToStorage();
      this.renderHistoryList();
      this.updateUIFromCurrentNote();
    }
  }
  createNewNoteUIAction() {
    if (this.currentNote) {
      this.updateCurrentNoteFromUI();
      this.saveCurrentNote(false);
    }
    this.currentNote = this.createNewNoteObject();
    this.notes.unshift(this.currentNote);
    this.saveNotesToStorage();
    this.renderHistoryList();
    this.updateUIFromCurrentNote();
    this.updateStatus("Nueva nota creada.", "success", 2e3);
    const polishedTabButton = document.querySelector('.tab-button[data-tab="note"]');
    if (polishedTabButton && typeof window.setActiveTab === "function") {
      window.setActiveTab(polishedTabButton, true);
    }
    this.editorTitle.focus();
  }
  updateCurrentNoteFromUI() {
    if (!this.currentNote) return;
    this.currentNote.title = this.editorTitle.classList.contains("placeholder-active") ? "" : this.editorTitle.textContent || "";
    this.currentNote.rawText = this.rawTranscription.classList.contains("placeholder-active") ? "" : this.rawTranscription.innerHTML;
    this.currentNote.polishedHTML = this.polishedNote.classList.contains("placeholder-active") ? "" : this.polishedNote.innerHTML;
    const selectedModeInHeader = this.currentNotePolishModeSelect.value;
    this.currentNote.polishModeUsed = selectedModeInHeader;
    this.currentPolishMode = selectedModeInHeader;
    if (selectedModeInHeader === "custom") {
      this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
    } else {
      delete this.currentNote.customPromptUsed;
    }
    this.currentNote.lastModified = Date.now();
  }
  saveCurrentNote(showStatus = true) {
    if (!this.currentNote) return;
    const noteIndex = this.notes.findIndex((note) => note.id === this.currentNote.id);
    if (noteIndex > -1) {
      this.notes[noteIndex] = { ...this.currentNote };
    } else {
      this.notes.unshift({ ...this.currentNote });
    }
    this.notes.sort((a, b) => b.lastModified - a.lastModified);
    this.saveNotesToStorage();
    this.renderHistoryList();
    if (showStatus) {
      this.updateStatus("Nota guardada \u2713", "success", 1500);
    }
  }
  loadNoteIntoUI(noteId, isInitialLoad = false) {
    const noteToLoad = this.notes.find((note) => note.id === noteId);
    if (noteToLoad) {
      if (this.currentNote && this.currentNote.id !== noteId && !isInitialLoad) {
        this.updateCurrentNoteFromUI();
        this.saveCurrentNote(false);
      }
      this.currentNote = JSON.parse(JSON.stringify(noteToLoad));
      this.updateUIFromCurrentNote();
      if (!isInitialLoad) {
        this.updateStatus(`Nota "${this.currentNote.title || "Sin T\xEDtulo"}" cargada.`, "success", 2e3);
      }
      if (this.historyPanel.classList.contains("active")) {
        this.toggleHistoryPanel(false);
      }
    } else {
      console.warn(`No se encontr\xF3 la nota con ID: ${noteId}`);
      if (!isInitialLoad) this.loadInitialNote();
    }
  }
  updateUIFromCurrentNote() {
    if (!this.currentNote) {
      this.editorTitle.innerHTML = "";
      this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
      this.rawTranscription.innerHTML = "";
      this.restorePlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
      this.polishedNote.innerHTML = "";
      this.restorePlaceholder(this.polishedNote, this.polishedNotePlaceholder);
      this.currentNotePolishModeSelect.value = "standard";
      this.currentPolishMode = "standard";
      this.currentCustomPolishPrompt = "";
      this.updateDocumentTitle();
      this.updateAllButtonStates();
      this.updateAllWordCharCounts();
      this.updateTopCopyButtonVisibility();
      return;
    }
    if (this.currentNote.title && this.currentNote.title.trim() !== "" && this.currentNote.title !== this.editorTitlePlaceholder) {
      this.editorTitle.textContent = this.currentNote.title;
      this.clearPlaceholder(this.editorTitle);
    } else {
      this.editorTitle.innerHTML = "";
      this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
    }
    if (this.currentNote.rawText && this.getPlainText(this.currentNote.rawText).trim() !== "") {
      this.rawTranscription.innerHTML = this.currentNote.rawText;
      this.clearPlaceholder(this.rawTranscription);
    } else {
      this.rawTranscription.innerHTML = "";
      this.restorePlaceholder(this.rawTranscription, this.rawTranscriptionPlaceholder);
    }
    if (this.currentNote.polishedHTML && this.getPlainText(this.currentNote.polishedHTML).trim() !== "") {
      this.polishedNote.innerHTML = this.currentNote.polishedHTML;
      this.clearPlaceholder(this.polishedNote);
    } else {
      this.polishedNote.innerHTML = "";
      this.restorePlaceholder(this.polishedNote, this.polishedNotePlaceholder);
    }
    this.currentNotePolishModeSelect.value = this.currentNote.polishModeUsed || "standard";
    this.currentPolishMode = this.currentNote.polishModeUsed || "standard";
    this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || "";
    this.updateDocumentTitle();
    this.updateAllButtonStates();
    this.updateAllWordCharCounts();
    this.updateTopCopyButtonVisibility();
    this.polishModeSelect.value = this.currentPolishMode;
    this.customPromptTextarea.value = this.currentCustomPolishPrompt;
    this.customPromptTemplateSelect.value = "";
    this.handlePolishModeChangeInModal();
  }
  updateDocumentTitle() {
    if (this.currentNote && this.currentNote.title && !this.editorTitle.classList.contains("placeholder-active")) {
      document.title = `App de Dictado - ${this.currentNote.title}`;
    } else {
      document.title = "App de Dictado Avanzada";
    }
  }
  toggleHistoryPanel(forceOpen) {
    const isActive = this.historyPanel.classList.contains("active");
    let openPanel;
    if (typeof forceOpen === "boolean") {
      openPanel = forceOpen;
    } else {
      openPanel = !isActive;
    }
    if (openPanel) {
      this.historyPanel.classList.add("active");
      this.mainContent.classList.add("history-panel-active");
      this.historyButton.setAttribute("aria-expanded", "true");
      this.historySearchInput.focus();
    } else {
      this.historyPanel.classList.remove("active");
      this.mainContent.classList.remove("history-panel-active");
      this.historyButton.setAttribute("aria-expanded", "false");
    }
  }
  renderHistoryList() {
    this.historyList.innerHTML = "";
    const searchTerm = this.historySearchInput.value.toLowerCase().trim();
    const filteredNotes = this.notes.filter(
      (note) => (note.title || "Nota sin T\xEDtulo").toLowerCase().includes(searchTerm) || note.rawText && this.getPlainText(note.rawText).toLowerCase().includes(searchTerm) || note.polishedHTML && this.getPlainText(note.polishedHTML).toLowerCase().includes(searchTerm)
    );
    if (filteredNotes.length === 0) {
      const li = document.createElement("li");
      li.textContent = searchTerm ? "No hay notas que coincidan con tu b\xFAsqueda." : "No hay notas guardadas.";
      li.classList.add("history-empty-message");
      this.historyList.appendChild(li);
      return;
    }
    filteredNotes.forEach((note) => {
      const li = document.createElement("li");
      li.classList.add("history-item");
      li.dataset.noteId = note.id;
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.setAttribute("aria-label", `Cargar nota: ${note.title || "Nota sin T\xEDtulo"}`);
      const mainDiv = document.createElement("div");
      mainDiv.classList.add("history-item-main");
      const titleSpan = document.createElement("span");
      titleSpan.classList.add("history-item-title");
      titleSpan.textContent = note.title || "Nota sin T\xEDtulo";
      const dateSpan = document.createElement("span");
      dateSpan.classList.add("history-item-date");
      dateSpan.textContent = new Date(note.lastModified).toLocaleString("es-ES", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
      mainDiv.appendChild(titleSpan);
      mainDiv.appendChild(dateSpan);
      const controlsDiv = document.createElement("div");
      controlsDiv.classList.add("history-item-controls");
      const editButton = document.createElement("button");
      editButton.classList.add("history-item-button", "edit-button");
      editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
      editButton.title = "Editar t\xEDtulo";
      editButton.setAttribute("aria-label", `Editar t\xEDtulo de la nota: ${note.title || "Nota sin T\xEDtulo"}`);
      editButton.onclick = (e) => {
        e.stopPropagation();
        this.handleEditHistoryItemTitle(note.id, titleSpan, mainDiv);
      };
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("history-item-button", "delete-button");
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteButton.title = "Eliminar nota";
      deleteButton.setAttribute("aria-label", `Eliminar nota: ${note.title || "Nota sin T\xEDtulo"}`);
      deleteButton.onclick = (e) => {
        e.stopPropagation();
        this.confirmDeleteNote(note.id);
      };
      controlsDiv.appendChild(editButton);
      controlsDiv.appendChild(deleteButton);
      li.appendChild(mainDiv);
      li.appendChild(controlsDiv);
      li.onclick = () => this.loadNoteIntoUI(note.id);
      li.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") this.loadNoteIntoUI(note.id);
      };
      this.historyList.appendChild(li);
    });
  }
  handleEditHistoryItemTitle(noteId, titleElement, mainDiv) {
    const currentTitle = titleElement.textContent || "";
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentTitle;
    input.classList.add("history-item-title-input");
    input.setAttribute("aria-label", "Nuevo t\xEDtulo de la nota");
    titleElement.style.display = "none";
    mainDiv.insertBefore(input, titleElement.nextSibling);
    input.focus();
    input.select();
    const saveTitle = () => {
      const newTitle = input.value.trim();
      this.handleSaveHistoryItemTitle(noteId, newTitle);
      titleElement.textContent = newTitle || "Nota sin T\xEDtulo";
      titleElement.style.display = "";
      if (input.parentNode) input.parentNode.removeChild(input);
    };
    input.onblur = saveTitle;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveTitle();
      } else if (e.key === "Escape") {
        titleElement.style.display = "";
        if (input.parentNode) input.parentNode.removeChild(input);
      }
    };
  }
  handleSaveHistoryItemTitle(noteId, newTitle) {
    const noteIndex = this.notes.findIndex((n) => n.id === noteId);
    if (noteIndex > -1) {
      this.notes[noteIndex].title = newTitle;
      this.notes[noteIndex].lastModified = Date.now();
      if (this.currentNote && this.currentNote.id === noteId) {
        this.currentNote.title = newTitle;
        this.currentNote.lastModified = this.notes[noteIndex].lastModified;
        this.updateDocumentTitle();
        this.editorTitle.textContent = newTitle || "";
        if (newTitle && newTitle !== this.editorTitlePlaceholder) this.clearPlaceholder(this.editorTitle);
        else this.restorePlaceholder(this.editorTitle, this.editorTitlePlaceholder);
      }
      this.saveNotesToStorage();
      this.renderHistoryList();
      this.updateStatus("T\xEDtulo de la nota actualizado.", "success", 1500);
    }
  }
  showConfirmDeleteModal(noteId, noteTitle) {
    this.currentDeleteNoteId = noteId;
    this.confirmDeleteMessageElement.textContent = `\xBFEst\xE1s seguro de que quieres eliminar la nota "${noteTitle || "Sin T\xEDtulo"}"? Esta acci\xF3n no se puede deshacer.`;
    this.confirmDeleteModal.style.display = "flex";
    this.confirmDeleteModal.setAttribute("aria-hidden", "false");
    this.confirmDeleteConfirmButton.focus();
  }
  hideConfirmDeleteModal() {
    this.confirmDeleteModal.style.display = "none";
    this.confirmDeleteModal.setAttribute("aria-hidden", "true");
    this.currentDeleteNoteId = null;
  }
  confirmDeleteNote(noteId) {
    const noteToDelete = this.notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;
    this.showConfirmDeleteModal(noteId, noteToDelete.title);
  }
  deleteNoteById(noteId) {
    const noteWasCurrent = this.currentNote && this.currentNote.id === noteId;
    this.notes = this.notes.filter((note) => note.id !== noteId);
    this.saveNotesToStorage();
    if (noteWasCurrent) {
      this.loadInitialNote();
    }
    this.renderHistoryList();
    this.updateStatus("Nota eliminada.", "success", 2e3);
  }
  exportHistory() {
    if (this.notes.length === 0) {
      this.updateStatus("No hay notas para exportar.", "active", 2e3);
      return;
    }
    try {
      const jsonData = JSON.stringify(this.notes, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      a.href = url;
      a.download = `dictado_app_historial_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.updateStatus("Historial exportado exitosamente.", "success", 2500);
    } catch (error) {
      console.error("Error al exportar historial:", error);
      this.updateStatus("Error al exportar el historial.", "error", 4e3);
    }
  }
  importHistory(event) {
    const input = event.target;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedNotes = JSON.parse(e.target?.result);
        if (!Array.isArray(importedNotes)) {
          throw new Error("El archivo JSON no contiene un array de notas.");
        }
        const validImportedNotes = importedNotes.filter(
          (note) => note && typeof note.id === "string" && typeof note.title === "string" && typeof note.createdAt === "number" && typeof note.lastModified === "number"
        );
        if (validImportedNotes.length === 0 && importedNotes.length > 0) {
          throw new Error("Ninguna nota v\xE1lida encontrada en el archivo. Verifica el formato.");
        }
        const newNotesMap = /* @__PURE__ */ new Map();
        this.notes.forEach((note) => newNotesMap.set(note.id, note));
        validImportedNotes.forEach((note) => newNotesMap.set(note.id, note));
        this.notes = Array.from(newNotesMap.values());
        this.notes.sort((a, b) => b.lastModified - a.lastModified);
        this.saveNotesToStorage();
        this.renderHistoryList();
        if (this.notes.length > 0 && (!this.currentNote || !this.notes.find((n) => n.id === this.currentNote.id))) {
          this.loadInitialNote();
        } else if (this.currentNote) {
          const updatedCurrentNote = this.notes.find((n) => n.id === this.currentNote.id);
          if (updatedCurrentNote) {
            this.currentNote = JSON.parse(JSON.stringify(updatedCurrentNote));
            this.updateUIFromCurrentNote();
          } else {
            this.loadInitialNote();
          }
        }
        this.updateStatus(`Historial importado. ${validImportedNotes.length} notas cargadas/actualizadas.`, "success", 3e3);
      } catch (error) {
        console.error("Error al importar historial:", error);
        this.updateStatus(`Error al importar: ${error.message}`, "error", 5e3);
      } finally {
        input.value = "";
      }
    };
    reader.onerror = () => {
      this.updateStatus("Error al leer el archivo.", "error", 3e3);
      input.value = "";
    };
    reader.readAsText(file);
  }
  isCurrentNoteEmpty() {
    if (!this.currentNote) return true;
    const titleEmpty = this.currentNote.title.trim() === "" || this.editorTitle.classList.contains("placeholder-active");
    const rawEmpty = this.getPlainText(this.currentNote.rawText).trim() === "" || this.rawTranscription.classList.contains("placeholder-active");
    const polishedEmpty = this.getPlainText(this.currentNote.polishedHTML).trim() === "" || this.polishedNote.classList.contains("placeholder-active");
    return titleEmpty && rawEmpty && polishedEmpty;
  }
  async handleAudioFileUpload(event) {
    const input = event.target;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    if (!this.isCurrentNoteEmpty()) {
      this.pendingAudioFile = file;
      this.pendingAudioUploadEventTarget = input;
      this.showConfirmAudioUploadModal();
      return;
    }
    this.proceedWithAudioProcessing(file, input);
  }
  async proceedWithAudioProcessing(file, inputTarget) {
    this.updateStatus(`Cargando archivo: ${file.name}...`, "active");
    try {
      const reader = new FileReader();
      const readResult = new Promise((resolve, reject) => {
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("FileReader no devolvi\xF3 una cadena."));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64data = await readResult;
      const base64Audio = base64data.split(",")[1];
      if (!base64Audio) {
        throw new Error("Error al extraer datos de audio base64 del archivo.");
      }
      this.updateStatus("Archivo cargado. Transcribiendo...", "active");
      const rawText = await this.getTranscription(base64Audio, file.type);
      if (!this.currentNote) {
        this.createNewNoteUIAction();
      }
      if (this.currentNote) {
        this.currentNote.rawText = rawText;
        this.currentNote.polishedHTML = "";
        this.currentNote.polishedMarkdown = "";
        if (!this.currentNote.title || this.currentNote.title === this.editorTitlePlaceholder) {
          this.currentNote.title = `Nota de ${file.name.split(".")[0]}`;
        }
        this.currentNote.lastModified = Date.now();
        this.saveCurrentNote(true);
        this.updateUIFromCurrentNote();
        this.updateStatus("Transcripci\xF3n del archivo completada.", "success", 3e3);
        const rawTabButton = document.querySelector('.tab-button[data-tab="raw"]');
        if (rawTabButton && typeof window.setActiveTab === "function") {
          window.setActiveTab(rawTabButton);
        }
      }
    } catch (error) {
      console.error("Error procesando archivo de audio:", error);
      this.updateStatus(`Error al cargar archivo: ${error.message}.`, "error", 5e3);
    } finally {
      this.clearPendingAudioUpload();
    }
  }
  showConfirmAudioUploadModal() {
    const currentTitle = this.currentNote?.title || "Sin T\xEDtulo";
    this.confirmAudioUploadMessageElement.textContent = `La nota actual ("${currentTitle}") ya tiene contenido. \xBFQu\xE9 deseas hacer con el archivo de audio subido?`;
    this.confirmAudioUploadModal.style.display = "flex";
    this.confirmAudioUploadModal.setAttribute("aria-hidden", "false");
    this.confirmAudioUploadOverwriteButton.focus();
  }
  hideConfirmAudioUploadModal() {
    this.confirmAudioUploadModal.style.display = "none";
    this.confirmAudioUploadModal.setAttribute("aria-hidden", "true");
  }
  clearPendingAudioUpload() {
    if (this.pendingAudioUploadEventTarget) {
      this.pendingAudioUploadEventTarget.value = "";
    }
    this.pendingAudioFile = null;
    this.pendingAudioUploadEventTarget = null;
  }
  togglePolishOptionsModal(show) {
    this.polishOptionsModal.style.display = show ? "flex" : "none";
    if (show) {
      this.polishOptionsModal.setAttribute("aria-hidden", "false");
      const modeToShow = this.currentNote ? this.currentNote.polishModeUsed : this.currentPolishMode;
      const promptToShow = this.currentNote ? this.currentNote.customPromptUsed || this.currentCustomPolishPrompt : this.currentCustomPolishPrompt;
      this.polishModeSelect.value = modeToShow || "standard";
      this.customPromptTextarea.value = promptToShow || "";
      this.customPromptTemplateSelect.value = "";
      this.handlePolishModeChangeInModal();
      this.polishModeSelect.focus();
    } else {
      this.polishOptionsModal.setAttribute("aria-hidden", "true");
    }
  }
  handlePolishModeChangeInModal() {
    const selectedModeInModal = this.polishModeSelect.value;
    const isCustom = selectedModeInModal === "custom";
    this.customPromptContainer.style.display = isCustom ? "block" : "none";
    this.customPromptTemplateContainer.style.display = isCustom ? "block" : "none";
    this.customPromptTextarea.setAttribute("aria-hidden", isCustom ? "false" : "true");
    this.customPromptTemplateSelect.setAttribute("aria-hidden", isCustom ? "false" : "true");
  }
  handleCurrentNotePolishModeChange() {
    if (!this.currentNote) return;
    const newMode = this.currentNotePolishModeSelect.value;
    this.currentPolishMode = newMode;
    if (newMode === "custom") {
      this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || "";
      this.polishModeSelect.value = "custom";
      this.customPromptTextarea.value = this.currentCustomPolishPrompt;
      this.handlePolishModeChangeInModal();
      this.togglePolishOptionsModal(true);
    } else {
      this.currentCustomPolishPrompt = "";
    }
    this.updateCurrentNoteFromUI();
    this.saveCurrentNote(false);
    this.updateAllButtonStates();
  }
  handlePromptTemplateChange() {
    const selectedValue = this.customPromptTemplateSelect.value;
    if (selectedValue) {
      this.customPromptTextarea.value = selectedValue;
      this.customPromptTextarea.focus();
      if (this.customPromptTextarea.classList.contains("placeholder-active")) {
        this.customPromptTextarea.classList.remove("placeholder-active");
      }
    }
  }
  handleRetryPolish() {
    if (this.isRawTranscriptionEmpty()) {
      this.updateStatus("Nada que pulir. Escribe o graba algo en 'Borrador'.", "active", 3e3);
      return;
    }
    const modeToPreload = this.currentNote?.polishModeUsed || this.currentPolishMode || "standard";
    const customPromptToPreload = (modeToPreload === "custom" ? this.currentNote?.customPromptUsed || this.currentCustomPolishPrompt : "") || "";
    this.polishModeSelect.value = modeToPreload;
    this.customPromptTextarea.value = customPromptToPreload;
    this.handlePolishModeChangeInModal();
    this.togglePolishOptionsModal(true);
  }
  applyAndPolishFromModal() {
    this.currentPolishMode = this.polishModeSelect.value;
    if (this.currentPolishMode === "custom") {
      this.currentCustomPolishPrompt = this.customPromptTextarea.value.trim();
      if (!this.currentCustomPolishPrompt) {
        this.updateStatus("El prompt personalizado no puede estar vac\xEDo para el modo personalizado.", "error", 3e3);
        return;
      }
    } else {
      this.currentCustomPolishPrompt = "";
    }
    this.togglePolishOptionsModal(false);
    this.handleManualPolishWithCurrentSettings();
  }
  getPlainText(htmlContent) {
    if (!htmlContent) return "";
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent.replace(/<br\s*\/?>/gi, "\n");
    return tempDiv.textContent || tempDiv.innerText || "";
  }
  copyContentToClipboard(element, type) {
    let textToCopy = this.getPlainText(element.innerHTML);
    if (element.classList.contains("placeholder-active") || !textToCopy.trim()) {
      this.updateStatus(`${type} est\xE1 vac\xEDo. Nada que copiar.`, "active", 2e3);
      return;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.updateStatus(`${type} copiado al portapapeles.`, "success", 2e3);
    }).catch((err) => {
      console.error(`Error al copiar ${type}:`, err);
      this.updateStatus(`Error al copiar ${type}. Intenta manually.`, "error", 4e3);
    });
  }
  exportNoteContent(contentSource, format) {
    if (!this.currentNote) {
      this.updateStatus("No hay nota actual para exportar.", "error", 3e3);
      return;
    }
    let content = "";
    let filename = (this.currentNote.title || "Nota_Sin_T\xEDtulo").replace(/[^\w\s.-]/gi, "_").replace(/\s+/g, "_");
    let mimeType = "text/plain;charset=utf-8";
    if (contentSource === "polished") {
      filename = `${filename}_pulida`;
      if (format === "md") {
        content = this.currentNote.polishedMarkdown || this.getPlainText(this.currentNote.polishedHTML);
        mimeType = "text/markdown;charset=utf-8";
        filename += ".md";
      } else {
        content = this.getPlainText(this.currentNote.polishedHTML);
        filename += ".txt";
      }
    } else {
      filename = `${filename}_borrador`;
      content = this.getPlainText(this.currentNote.rawText);
      if (format === "md") {
        mimeType = "text/markdown;charset=utf-8";
        filename += ".md";
      } else {
        filename += ".txt";
      }
    }
    if (!content.trim()) {
      const sourceName = contentSource === "polished" ? "la nota pulida" : "el borrador";
      this.updateStatus(`El contenido de ${sourceName} est\xE1 vac\xEDo.`, "active", 3e3);
      return;
    }
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.updateStatus(`Nota exportada como ${format.toUpperCase()}.`, "success", 2e3);
    } catch (error) {
      console.error("Error al exportar nota:", error);
      this.updateStatus("Error al exportar la nota.", "error", 4e3);
    }
  }
  checkInitialTheme() {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = localStorage.getItem("theme");
    const themeIcon = this.themeToggleButton.querySelector("i");
    if (currentTheme === "dark" || !currentTheme && prefersDark) {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
      if (themeIcon) themeIcon.className = "fas fa-moon";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema claro");
    } else {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
      if (themeIcon) themeIcon.className = "fas fa-sun";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema oscuro");
    }
  }
  toggleTheme() {
    document.body.classList.toggle("light-mode");
    document.body.classList.toggle("dark-mode");
    let theme = "light";
    const icon = this.themeToggleButton.querySelector("i");
    if (document.body.classList.contains("dark-mode")) {
      theme = "dark";
      if (icon) icon.className = "fas fa-moon";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema claro");
    } else {
      if (icon) icon.className = "fas fa-sun";
      this.themeToggleButton.setAttribute("aria-label", "Cambiar a tema oscuro");
    }
    localStorage.setItem("theme", theme);
  }
  async toggleRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.updateStatus("Grabando... Acceso al micr\xF3fono concedido.", "success", 3e3);
      this.recordButton.classList.add("recording");
      this.recordButton.querySelector("i").className = "fas fa-stop";
      this.recordButton.title = "Detener Grabaci\xF3n";
      this.recordButton.setAttribute("aria-label", "Detener grabaci\xF3n");
      this.setControlsDisabledState(true, true);
      this.recordingInterface.classList.add("is-live");
      this.mainContent.classList.add("has-live-panel");
      this.liveRecordingTitle.style.display = "block";
      this.liveWaveformCanvas.style.display = "block";
      this.liveRecordingTimerDisplay.style.display = "block";
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
      this.mediaRecorder.onstop = () => this.processAudio(stream);
      this.mediaRecorder.start();
      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = Math.max(256, LIVE_WAVEFORM_SAMPLES * 2);
      this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
      this.microphoneSource.connect(this.analyserNode);
      this.waveformDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
      this.drawLiveWaveform();
      this.liveRecordingStartTime = Date.now();
      if (this.liveRecordingTimerIntervalId) clearInterval(this.liveRecordingTimerIntervalId);
      this.liveRecordingTimerIntervalId = window.setInterval(() => this.updateLiveTimer(), 50);
    } catch (err) {
      console.error("Error al acceder al micr\xF3fono:", err);
      let message = "Acceso al micr\xF3fono denegado. Verifica los permisos en tu navegador.";
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        message = "No se encontr\xF3 un micr\xF3fono. Conecta uno e int\xE9ntalo de nuevo.";
      } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        message = "Permiso para usar el micr\xF3fono denegado.";
      }
      this.updateStatus(message, "error", 5e3);
      this.setControlsDisabledState(false, true);
    }
  }
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.stop();
      this.updateStatus("Grabaci\xF3n detenida. Procesando...", "active");
      this.recordButton.classList.remove("recording");
      this.recordButton.querySelector("i").className = "fas fa-microphone";
      this.recordButton.title = "Iniciar Grabaci\xF3n";
      this.recordButton.setAttribute("aria-label", "Iniciar grabaci\xF3n");
      this.recordingInterface.classList.remove("is-live");
      this.mainContent.classList.remove("has-live-panel");
      this.liveRecordingTitle.style.display = "none";
      this.liveWaveformCanvas.style.display = "none";
      this.liveRecordingTimerDisplay.style.display = "none";
      if (this.waveformAnimationId) cancelAnimationFrame(this.waveformAnimationId);
      if (this.microphoneSource) this.microphoneSource.disconnect();
      if (this.analyserNode) this.analyserNode.disconnect();
      if (this.audioContext && this.audioContext.state !== "closed") this.audioContext.close().catch(console.error);
      if (this.liveRecordingTimerIntervalId) clearInterval(this.liveRecordingTimerIntervalId);
      this.liveRecordingTimerIntervalId = null;
    }
  }
  setControlsDisabledState(disabled, isRecordingRelated = false) {
    this.newButton.disabled = disabled;
    this.audioUploadButton.disabled = disabled;
    this.historyButton.disabled = disabled;
    if (isRecordingRelated) {
      this.polishTextButton.disabled = disabled || this.isRawTranscriptionEmpty();
      this.retryPolishButton.disabled = disabled || this.isRawTranscriptionEmpty();
    } else {
      this.polishTextButton.disabled = this.isRawTranscriptionEmpty();
      this.retryPolishButton.disabled = this.isRawTranscriptionEmpty();
    }
  }
  updateAllButtonStates() {
    const isRecording = this.mediaRecorder?.state === "recording";
    this.setControlsDisabledState(isRecording, true);
    const rawIsEmpty = this.isRawTranscriptionEmpty();
    this.polishTextButton.disabled = rawIsEmpty || isRecording;
    this.retryPolishButton.disabled = rawIsEmpty || isRecording;
    this.updateTopCopyButtonVisibility();
    const polishedIsEmpty = this.isPolishedNoteEmpty();
    this.copyPolishedButton.disabled = polishedIsEmpty;
    this.exportPolishedTxtButton.disabled = polishedIsEmpty;
    this.exportPolishedMdButton.disabled = polishedIsEmpty;
    this.copyRawButton.disabled = rawIsEmpty;
    this.exportRawTxtButton.disabled = rawIsEmpty;
    this.exportRawMdButton.disabled = rawIsEmpty;
    this.currentNotePolishModeSelect.disabled = this.isRawTranscriptionEmpty() && this.isPolishedNoteEmpty();
  }
  isRawTranscriptionEmpty() {
    if (this.rawTranscription.classList.contains("placeholder-active")) {
      return true;
    }
    const liveText = this.getPlainText(this.rawTranscription.innerHTML);
    return liveText.trim() === "";
  }
  isPolishedNoteEmpty() {
    if (!this.currentNote) return true;
    return this.polishedNote.classList.contains("placeholder-active") || this.getPlainText(this.currentNote.polishedHTML).trim() === "";
  }
  updateTopCopyButtonVisibility() {
    const polishedIsEmpty = this.isPolishedNoteEmpty();
    this.topCopyPolishedButton.style.display = polishedIsEmpty ? "none" : "flex";
    this.topCopyPolishedButton.disabled = polishedIsEmpty;
  }
  drawLiveWaveform() {
    if (!this.liveWaveformContext || !this.analyserNode || !this.waveformDataArray || !this.liveWaveformCanvas) {
      return;
    }
    this.waveformAnimationId = requestAnimationFrame(() => this.drawLiveWaveform());
    this.analyserNode.getByteTimeDomainData(this.waveformDataArray);
    this.liveWaveformContext.fillStyle = getComputedStyle(document.body).getPropertyValue("--glass-recording-bg").trim();
    this.liveWaveformContext.fillRect(0, 0, this.liveWaveformCanvas.width, this.liveWaveformCanvas.height);
    this.liveWaveformContext.lineWidth = 2;
    this.liveWaveformContext.strokeStyle = getComputedStyle(document.body).getPropertyValue("--color-accent").trim();
    this.liveWaveformContext.beginPath();
    const sliceWidth = this.liveWaveformCanvas.width * 1 / this.analyserNode.frequencyBinCount;
    let x = 0;
    for (let i = 0; i < this.analyserNode.frequencyBinCount; i++) {
      const v = this.waveformDataArray[i] / 128;
      const y = v * this.liveWaveformCanvas.height / 2;
      if (i === 0) {
        this.liveWaveformContext.moveTo(x, y);
      } else {
        this.liveWaveformContext.lineTo(x, y);
      }
      x += sliceWidth;
    }
    this.liveWaveformContext.lineTo(this.liveWaveformCanvas.width, this.liveWaveformCanvas.height / 2);
    this.liveWaveformContext.stroke();
  }
  updateLiveTimer() {
    if (!this.liveRecordingStartTime) return;
    const elapsed = Date.now() - this.liveRecordingStartTime;
    const totalSeconds = Math.floor(elapsed / 1e3);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const milliseconds = Math.floor(elapsed % 1e3 / 10).toString().padStart(2, "0");
    this.liveRecordingTimerDisplay.textContent = `${minutes}:${seconds}.${milliseconds}`;
  }
  async processAudio(stream) {
    try {
      const audioBlob = new Blob(this.audioChunks, { type: this.audioChunks[0]?.type || "audio/webm" });
      const base64Audio = await this.blobToBase64(audioBlob);
      this.updateStatus("Audio grabado. Transcribiendo...", "active");
      const rawText = await this.getTranscription(base64Audio, audioBlob.type);
      if (!this.currentNote || this.isCurrentNoteEmpty()) {
        if (!this.currentNote) this.createNewNoteUIAction();
        if (this.currentNote && (!this.currentNote.title || this.currentNote.title === this.editorTitlePlaceholder)) {
          const newTitle = await this.generateTitleForNote(rawText.substring(0, 500));
          this.currentNote.title = newTitle || `Grabaci\xF3n ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`;
        }
      }
      if (this.currentNote) {
        this.currentNote.rawText = rawText;
        this.currentNote.polishedHTML = "";
        this.currentNote.polishedMarkdown = "";
        this.currentNote.lastModified = Date.now();
        this.saveCurrentNote(true);
        this.updateUIFromCurrentNote();
        this.updateStatus("Transcripci\xF3n completada.", "success", 2e3);
        const rawTabButton = document.querySelector('.tab-button[data-tab="raw"]');
        if (rawTabButton && typeof window.setActiveTab === "function") {
          window.setActiveTab(rawTabButton);
        }
      }
    } catch (error) {
      console.error("Error al procesar audio:", error);
      this.updateStatus(`Error procesando audio: ${error.message}`, "error", 5e3);
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      this.setControlsDisabledState(false, false);
      this.updateAllButtonStates();
    }
  }
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]);
        } else {
          reject(new Error("FileReader did not return a string."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  async callNetlifyFunction(payload) {
    try {
      const response = await fetch(NETLIFY_FUNCTION_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error llamando a la funci\xF3n Netlify:", error);
      this.updateStatus(`Error de comunicaci\xF3n: ${error.message}`, "error", 5e3);
      throw error;
    }
  }
  async getTranscription(base64Audio, audioMimeType) {
    this.updateStatus("Transcribiendo...", "active");
    try {
      const response = await this.callNetlifyFunction({
        action: "transcribe",
        audioData: base64Audio,
        mimeType: audioMimeType
      });
      if (!response.transcription || response.transcription.trim() === "") {
        this.updateStatus("No se pudo transcribir el audio o est\xE1 vac\xEDo.", "active", 3e3);
        return "";
      }
      this.updateStatus("Transcripci\xF3n recibida.", "success", 1500);
      return response.transcription;
    } catch (error) {
      throw error;
    }
  }
  async generateTitleForNote(textSample) {
    if (!textSample || textSample.trim().length < 10) {
      return `Nota ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`;
    }
    try {
      const response = await this.callNetlifyFunction({
        action: "generateTitle",
        text: textSample
      });
      return response.title.trim().replace(/^"|"$/g, "") || `Nota ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`;
    } catch (error) {
      console.error("Error generando t\xEDtulo v\xEDa Netlify function:", error);
      return `Nota ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`;
    }
  }
  handleManualPolishWithCurrentSettings() {
    if (!this.currentNote || this.isRawTranscriptionEmpty()) {
      this.updateStatus("Nada que pulir. Escribe o graba algo en 'Borrador'.", "active", 3e3);
      return;
    }
    const selectedModeInHeader = this.currentNotePolishModeSelect.value;
    this.currentPolishMode = selectedModeInHeader;
    this.currentNote.polishModeUsed = selectedModeInHeader;
    if (selectedModeInHeader === "custom") {
      if (!this.currentNote.customPromptUsed && !this.customPromptTextarea.value.trim()) {
        this.updateStatus("Modo personalizado seleccionado. Por favor, define un prompt.", "active", 3e3);
        this.polishModeSelect.value = "custom";
        this.customPromptTextarea.value = this.currentCustomPolishPrompt || "";
        this.handlePolishModeChangeInModal();
        this.togglePolishOptionsModal(true);
        return;
      }
      this.currentCustomPolishPrompt = this.currentNote.customPromptUsed || this.customPromptTextarea.value.trim();
      this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
    } else {
      this.currentCustomPolishPrompt = "";
      delete this.currentNote.customPromptUsed;
    }
    this.saveCurrentNote(false);
    this.polishText(this.currentNote.rawText);
  }
  async polishText(rawTextHTML) {
    if (!this.currentNote) return;
    const plainRawText = this.getPlainText(rawTextHTML);
    if (!plainRawText || plainRawText.trim() === "" || this.rawTranscription.classList.contains("placeholder-active")) {
      this.updateStatus("El borrador est\xE1 vac\xEDo. Nada que pulir.", "active", 3e3);
      return;
    }
    try {
      this.updateStatus("Puliendo...", "active");
      const polishedResult = await this.getPolishedNoteFromText(plainRawText, this.currentPolishMode, this.currentCustomPolishPrompt);
      if ((this.currentNote.title === "" || this.currentNote.title === this.editorTitlePlaceholder) && plainRawText.trim().length >= 10) {
        const newTitle = await this.generateTitleForNote(plainRawText.substring(0, 500));
        if (newTitle) {
          this.currentNote.title = newTitle;
        }
      }
      this.currentNote.polishedHTML = polishedResult.html;
      this.currentNote.polishedMarkdown = polishedResult.markdown;
      this.currentNote.polishModeUsed = this.currentPolishMode;
      if (this.currentPolishMode === "custom") {
        this.currentNote.customPromptUsed = this.currentCustomPolishPrompt;
      } else {
        delete this.currentNote.customPromptUsed;
      }
      this.currentNote.lastModified = Date.now();
      this.saveCurrentNote(true);
      this.updateUIFromCurrentNote();
      this.updateStatus("Nota pulida.", "success", 2e3);
      const polishedTabButton = document.querySelector('.tab-button[data-tab="note"]');
      if (polishedTabButton && typeof window.setActiveTab === "function") {
        window.setActiveTab(polishedTabButton);
      }
    } catch (error) {
      console.error("Error al pulir texto:", error);
    }
  }
  async getPolishedNoteFromText(text, mode, customPrompt) {
    try {
      const response = await this.callNetlifyFunction({
        action: "polish",
        text,
        polishMode: mode,
        customPolishPrompt: customPrompt
      });
      if (!response.polishedMarkdown || response.polishedMarkdown.trim() === "") {
        return { html: "<p>Gemini no gener\xF3 contenido pulido.</p>", markdown: "" };
      }
      const html = this.markdownParser.parse(response.polishedMarkdown);
      return { html, markdown: response.polishedMarkdown };
    } catch (error) {
      throw new Error(`Error obteniendo nota pulida: ${error.message || "Desconocido"}`);
    }
  }
  updateStatus(message, type = "active", duration = 3e3) {
    this.recordingStatus.textContent = message;
    this.recordingStatus.className = `status-text visible status-${type}`;
    if (this.statusClearTimeout) clearTimeout(this.statusClearTimeout);
    if (type === "success" || type === "error") {
      this.statusClearTimeout = window.setTimeout(() => {
        this.recordingStatus.className = "status-text";
      }, duration);
    } else if (type === "active") {
      if (duration !== Infinity && duration > 0) {
        this.statusClearTimeout = window.setTimeout(() => {
          this.recordingStatus.className = "status-text";
        }, duration);
      }
    }
  }
  updateWordCharCount(type) {
    const element = type === "polished" ? this.polishedNote : this.rawTranscription;
    const counterElement = type === "polished" ? this.polishedCounters : this.rawCounters;
    if (!element || !counterElement) return;
    const text = this.getPlainText(element.innerHTML);
    const isEmptyOrPlaceholder = element.classList.contains("placeholder-active") || !text.trim();
    if (isEmptyOrPlaceholder) {
      counterElement.textContent = "";
      return;
    }
    const words = text.match(/\b\w+\b/g)?.length || 0;
    const chars = text.length;
    counterElement.textContent = `${words} palabra${words !== 1 ? "s" : ""}, ${chars} caracter${chars !== 1 ? "es" : ""}`;
  }
  updateAllWordCharCounts() {
    this.updateWordCharCount("polished");
    this.updateWordCharCount("raw");
  }
};
new App();
