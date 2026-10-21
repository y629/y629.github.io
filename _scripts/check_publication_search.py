#!/usr/bin/env python3
"""Check that publication search controls survive the Markdown build."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
import sys


class SearchControls(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inputs = []
        self.filters = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "input" and attrs.get("id") == "bibsearch":
            self.inputs.append(attrs)
        if tag == "div" and attrs.get("id") == "bib-filters":
            self.filters += 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site_directory", nargs="?", type=Path, default=Path("_site"))
    args = parser.parse_args()
    errors = []
    pages = {
        "publications/index.html": "Type to filter",
        "ja/publications/index.html": "キーワードで絞り込み",
    }
    for relative_path, placeholder in pages.items():
        path = args.site_directory / relative_path
        controls = SearchControls()
        try:
            controls.feed(path.read_text(encoding="utf-8"))
            controls.close()
        except (OSError, UnicodeError) as error:
            errors.append(f"{path}: cannot read HTML: {error}")
            continue
        if len(controls.inputs) != 1:
            errors.append(f"{path}: expected one input#bibsearch, found {len(controls.inputs)}")
        else:
            for attribute, expected in (("type", "text"), ("placeholder", placeholder)):
                actual = controls.inputs[0].get(attribute)
                if actual != expected:
                    errors.append(f"{path}: input#bibsearch {attribute} is {actual!r}, expected {expected!r}")
        if controls.filters != 1:
            errors.append(f"{path}: expected one div#bib-filters, found {controls.filters}")
    if errors:
        sys.exit("Publication search check failed:\n" + "\n".join(errors))
    print("Publication search controls verified on English and Japanese pages.")


if __name__ == "__main__":
    main()
