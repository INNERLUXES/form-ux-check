# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A UX check tempts a tool to look at the calendar: which version of the guidelines was current on a day, how long a
page has gone without a review, how old a finding is. Each of these would make the same files give a different result
on a different day, so a pipeline that passed yesterday could fail today with no change to the repository, and two
people reading the same commit could see two reports. The output could never be saved and compared.

The checks do not need a date. Whether a field has a label, which autocomplete token it carries and where an id is
named can all be read from the files as they are. The public pages the rules rest on are named by addresses that hold
no year: the W3C Understanding documents by their version (WCAG 2.2), the HTML Standard and MDN by their living pages.

## Decision

1. The tool reads no clock, no time zone and no locale. It never prints the current time and never says when a page or
   a guideline was published. The same files and configuration give the same output on every machine and on every day.
2. No file of this repository holds a date or a number that reads like a year: not the licence, not the changelog, not
   the documents, not the comments of the code, not the tests, not the examples. `npm run check` and a test fail on any
   word of four digits that starts with 19 or 20.
3. A version is not a year and is not caught: 1.0.0, WCAG 2.2 and the WCAG22 of the W3C addresses hold no word of four
   digits that starts with 19 or 20. A test of test/repo.test.js runs the pattern over such values and checks that none
   of them is caught, and that a year in the same place still is; the pattern is the same in the tests and in
   tools/check.mjs.
4. The sources are chosen with addresses that hold no year, and the notes on them name no publication date.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it does
  not move with the calendar.
- The report holds no date and no deadline; a team puts dates in its own plan.
- The limits of the tool are chosen so that none of them reads like a year, and a check catches one that does.
