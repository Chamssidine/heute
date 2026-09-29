// Minimal glob support: `**` (any depth), `*` (one segment), `{a,b}` (alternatives).
export function globToRegExp(glob: string): RegExp {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*") {
      // `**/` matches zero or more directories; a trailing `**` matches the rest.
      if (glob[i + 2] === "/") {
        source += "(?:.*/)?";
        i += 2;
      } else {
        source += ".*";
        i += 1;
      }
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "{") {
      const end = glob.indexOf("}", i);
      const options = glob
        .slice(i + 1, end)
        .split(",")
        .map(escapeRegExp);
      source += `(?:${options.join("|")})`;
      i = end;
    } else {
      source += escapeRegExp(char ?? "");
    }
  }
  return new RegExp(`^${source}$`);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.+?^$()|[\]\\]/g, "\\$&");
}

export function matchesAny(file: string, globs: readonly string[]): boolean {
  return globs.some((glob) => globToRegExp(glob).test(file));
}
