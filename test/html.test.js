import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HTML_LIMITS, HtmlError, VOID_ELEMENTS, attrOf, decodeHtml, parseHtml } from '../src/index.js';

// The safe HTML reader: tags and attributes in any case, void elements, comments, raw text, implied end tags, nested
// forms, text and limits.

const names = (html) => parseHtml(html).elements.map((e) => e.name);
const tree = (html) => parseHtml(html).elements.map((e, i, all) => `${e.name}<${e.parent < 0 ? '' : all[e.parent].name}`);
const text = (doc, k) => doc.chunks.slice(doc.elements[k].textStart, doc.elements[k].textEnd).join('').replace(/\s+/g, ' ').trim();

test('html: tags and attributes in any case, the first of two attributes kept, quoted and unquoted values, offsets', () => {
  const html = '<DIV Id="a" CLASS=x data-x=\'q"r\' hidden id="b"><Input TYPE=Text value=a&amp;b disabled/></DIV>';
  const { elements } = parseHtml(html);
  assert.deepEqual(elements.map((e) => e.name), ['div', 'input']);
  assert.equal(attrOf(elements[0], 'id'), 'a');
  assert.equal(attrOf(elements[0], 'class'), 'x');
  assert.equal(attrOf(elements[0], 'data-x'), 'q"r');
  assert.equal(attrOf(elements[0], 'hidden'), '');
  assert.equal(attrOf(elements[0], 'nothing'), null);
  assert.equal(attrOf(elements[1], 'type'), 'Text');
  assert.equal(attrOf(elements[1], 'value'), 'a&b');
  assert.equal(attrOf(elements[1], 'disabled'), '');
  assert.equal(elements[0].offset, 0);
  assert.equal(elements[0].attrs.get('class').offset, html.indexOf('CLASS'));
  assert.equal(elements[1].parent, 0);
  assert.equal(elements[0].end, 2);
  assert.ok(VOID_ELEMENTS.has('input'));
  assert.equal(attrOf(parseHtml('<a b = "c" =d / e>').elements[0], 'b'), 'c');
  assert.equal(attrOf(parseHtml('<a b = "c" =d / e>').elements[0], '=d'), '');
});

test('html: comments, a DOCTYPE, processing instructions, bogus end tags and raw text are passed over', () => {
  assert.deepEqual(names('<!DOCTYPE html><!-- <form> --><?php echo 1 ?><p>a</p><!--><b>x</b><!---><i>y</i>'), ['p', 'b', 'i']);
  assert.deepEqual(names('<script>var a = "<form><input>";</script ><style>p{}</style><input>'), ['script', 'style', 'input']);
  assert.deepEqual(names('<textarea><input name="x"></textarea><title><b></title><p>'), ['textarea', 'title', 'p']);
  assert.deepEqual(names('<script>never closed <input>'), ['script']);
  assert.deepEqual(names('<script>a</scripts></script><b>'), ['script', 'b']);
  assert.deepEqual(names('</ >x</3><a>'), ['a']);
  assert.deepEqual(names('a < b and <3 <a>'), ['a']);
  assert.deepEqual(names('<!-- never closed <input>'), []);
  assert.deepEqual(names('<!DOCTYPE never closed'), []);
  assert.deepEqual(names('<p>a</p'), ['p'], 'an end tag cut off by the end of the text');
  assert.deepEqual(names('</ never'), []);
  assert.deepEqual(names('<input name="cut off'), [], 'a tag cut off by the end of the text is dropped');
  assert.deepEqual(names('<input name=x'), []);
  assert.deepEqual(names('<input name'), []);
});

test('html: void elements, end tags that close what is left open, and start tags that close the element before', () => {
  assert.deepEqual(tree('<div><span><input></div><p>'), ['div<', 'span<div', 'input<span', 'p<']);
  assert.deepEqual(tree('<select><option>a<option>b<optgroup><option>c<optgroup></select>'), ['select<', 'option<select', 'option<select', 'optgroup<select', 'option<optgroup', 'optgroup<select']);
  assert.deepEqual(tree('<ul><li>a<li>b</ul><dl><dt>x<dd>y</dl>'), ['ul<', 'li<ul', 'li<ul', 'dl<', 'dt<dl', 'dd<dl']);
  assert.deepEqual(tree('<table><tr><td>a<td>b<tr><th>c</table>'), ['table<', 'tr<table', 'td<tr', 'td<tr', 'tr<table', 'th<tr']);
  assert.deepEqual(tree('<p>a<div>b</div><p>c<form></form>'), ['p<', 'div<', 'p<', 'form<']);
  assert.deepEqual(tree('<button>a<button>b</button>'), ['button<', 'button<']);
  assert.deepEqual(tree('<label/>x<input>'), ['label<', 'input<label'], 'a self-closing non-void element stays open');
  assert.deepEqual(tree('<svg><path/><rect/></svg><input>'), ['svg<', 'path<svg', 'rect<svg', 'input<']);
  assert.deepEqual(tree('<math/><input>'), ['math<', 'input<']);
  assert.deepEqual(tree('<p></span></br>x'), ['p<'], 'an end tag with no open element is ignored');
});

test('html: a select is closed by a field that cannot sit in it, and a form inside a form is left out', () => {
  assert.deepEqual(tree('<select><option>a<input name="x"></select>'), ['select<', 'option<select', 'input<']);
  assert.deepEqual(tree('<select><option>a<select><b>'), ['select<', 'option<select', 'b<']);
  const doc = parseHtml('<form id="a"><form id="b"><input></form><input>');
  assert.deepEqual(doc.elements.map((e) => [e.name, e.parent]), [['form', -1], ['input', 0], ['input', -1]]);
  assert.equal(doc.nestedForms, 1);
});

test('html: the text inside each element, image alt text included, option text and raw text left out', () => {
  const doc = parseHtml('<label>First <b>name</b> <img alt="(required)"><select><option>Yes</select></label><button><img alt="Search"></button><p>a&lt;b &copy; &#65;&#x42;&#0;</p>');
  assert.equal(text(doc, 0), 'First name (required)');
  assert.equal(text(doc, 5), "Search");
  assert.equal(text(doc, 7), 'a<b &copy; AB\ufffd');
  assert.equal(text(parseHtml('<p>a<textarea>hidden</textarea>b</p>'), 0), 'ab');
});

test('html: character references', () => {
  assert.equal(decodeHtml('plain'), 'plain');
  assert.equal(decodeHtml('&amp;&lt;&gt;&quot;&apos;&nbsp;'), '&<>"\'\u00a0');
  assert.equal(decodeHtml('&#38;&#x26;&#X26;&#xD800;&#1114112;'), '&&&\ufffd\ufffd');
  assert.equal(decodeHtml('&unknown; & &#; &amp'), '&unknown; & &#; &');
  assert.equal(decodeHtml(`&${'a'.repeat(40)};`), `&${'a'.repeat(40)};`);
});

test('html: a byte order mark, CRLF and CR change nothing but the offsets', () => {
  const lf = parseHtml('<form>\n<input name="a">\n</form>');
  for (const t of ['\ufeff<form>\n<input name="a">\n</form>', '<form>\r\n<input name="a">\r\n</form>', '<form>\r<input name="a">\r</form>']) {
    assert.deepEqual(parseHtml(t).elements.map((e) => [e.name, e.parent, attrOf(e, 'name')]), lf.elements.map((e) => [e.name, e.parent, attrOf(e, 'name')]));
  }
});

test('html: the limits of depth, elements, attributes, names and values stop the reader with the place', () => {
  const limit = (html, lim) => {
    try {
      parseHtml(html, lim);
    } catch (error) {
      assert.ok(error instanceof HtmlError);
      return [error.reason, error.offset];
    }
    return assert.fail('not stopped');
  };
  assert.deepEqual(limit('<a><a><a>', { maxHtmlDepth: 2 }), ['elements nested more than 2 deep', 6]);
  assert.deepEqual(limit('<br><br><br>', { maxHtmlElements: 2 }), ['more than 2 elements', 8]);
  assert.deepEqual(limit('<a b c d>', { maxHtmlAttributes: 2 }), ['an element with more than 2 attributes', 7]);
  assert.deepEqual(limit('<abcdef>', { maxHtmlNameLength: 3 }), ['a tag name longer than 3 characters', 0]);
  assert.deepEqual(limit('</abcdef>', { maxHtmlNameLength: 3 }), ['a tag name longer than 3 characters', 0]);
  assert.deepEqual(limit('<a bcdef>', { maxHtmlNameLength: 3 }), ['an attribute name longer than 3 characters', 3]);
  assert.deepEqual(limit('<a b="12345">', { maxHtmlValueLength: 3 }), ['an attribute value longer than 3 characters', 3]);
  assert.deepEqual(HTML_LIMITS, { maxHtmlDepth: 512, maxHtmlElements: 200000, maxHtmlAttributes: 256, maxHtmlNameLength: 256, maxHtmlValueLength: 65536 });
  assert.equal(parseHtml(`<b ${'x '.repeat(10)}>`, { maxHtmlAttributes: 10 }).elements.length, 1);
});
