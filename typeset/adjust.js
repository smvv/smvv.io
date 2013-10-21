if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

// Justify the text after the font is loaded. Unfortunately, this means that
// the text cannot be justified until all content (e.g. images) is downloaded.
jQuery(function ($) {
$(window).load(function () {
    if (location.hash == '#justify') {
        $('p').css('text-align', 'justify');
        return;
    }

    var justifyElements = ['p'];

    var h = new Hypher(Hypher.en);

    var ruler = $('<p class="ruler">&nbsp;</p>').css({
        visibility: 'hidden',
        position: 'absolute',
        top: '-8000px',
        width: 'auto',
        display: 'inline',
        left: '-8000px'
    });

    $('body').append(ruler);

    function measureText(text, style) {
        // TODO: add a cache
        ruler.css(style);
        ruler.text(text);
        //ruler[0].fontWeight = style_id & 1 ? "bold" : "normal";
        //ruler[0].fontStyle = style_id & 2 ? "italic" : "normal";
        //ruler[0].firstChild.nodeValue = str;
        //cache[str] = ruler[0].offsetWidth;
        return ruler[0].offsetWidth;
    }

    function measureHTML(html, style) {
        // TODO: add a cache
        ruler.css(style);
        ruler.html(html);
        return ruler[0].offsetWidth;
    }

    function buildHTMLNode(node) {
        var html = '';

        if (node.element.nodeType == 1) { // HTML node
            var attrs = '';

            if (node.element.tagName.toLowerCase() == 'a') {
                attrs += ' href="' + node.element.href + '"';
                attrs += ' target="' + node.element.target + '"';
            }

            html += '<' + node.element.tagName + attrs + '>';
        }

        html += node.value;

        if (node.element.nodeType == 1) // HTML node
            html += '</' + node.element.tagName + '>';

        return html;
    }

    function hyphenate(word) {
        return h.hyphenate(word, 'en');
    }

    var linebreak = Typeset.linebreak;

    //var lineLength = $('.typeset').width();
    //    lineLengths = [];

    var hyphenPenalty = 100;

    function justifyParagraph(index, paragraph) {
        var $paragraph = $(paragraph);
        var $elements = $paragraph.contents();

        var lineLength = $paragraph.width();

        var nodes = [],
            breaks = [],
            lines = [],
            output = [],
            carryOver = null;

        $elements.each(function(elementIndex, element) {
            var $element = $(element);

            // Only TEXT and HTML nodes are supported at this moment.
            if (element.nodeType != 3 && element.nodeType != 1) {
                return;
            }

            // TODO: some HTML tags can/should not be split across two lines.
            // Think of inline <code> blocks, URLs in <a> tags, <span>s etc.

            var words = element.textContent.split(/\s+/);

            // TODO: add a cache to avoid recalculating all style properties.
            var styleNode;

            if (element.nodeType == 3) { // Text node
                styleNode = $(element.parentNode);
                console.log('TEXT', words.join(', '));
            } else if (element.nodeType == 1) { // HTML nodes
                styleNode = $element;
                console.log(element.tagName, words.join(', '));
            }

            var style = styleNode.css(['font-family', 'font-size',
                                       'font-weight', 'font-style',
                                       'padding', 'margin']);

            var hyphenWidth = measureText('-', style);

            // Calculate the space widths based on our font preferences
            var space = {};
            space.width = measureHTML('&nbsp;', style);
            space.stretch = (space.width * 3) / 6;
            space.shrink = (space.width * 3) / 9;

            var glue = linebreak.glue,
                box = linebreak.box,
                penalty = linebreak.penalty;

            words.forEach(function (word, wordIndex, wordArray) {
                var hyphenated = [];

                console.log("word", word);

                if (word.length > 6) {
                    hyphenated = hyphenate(word);
                }

                if (hyphenated.length > 1) {
                    hyphenated.forEach(function(part, partIndex, partArray) {
                        var width = measureText(part, style);
                        nodes.push(box(width, part, style, element));

                        if (partIndex !== partArray.length - 1) {
                            nodes.push(penalty(hyphenWidth, hyphenPenalty, 1));
                        }
                    });
                } else {
                    var width = measureText(word, style);
                    nodes.push(box(width, word, style, element));
                }

                // TODO: add glue after each element and pop the last glue once
                // all elements are processed, followed by pushing the infinity
                // glue and penalty.
                if (wordIndex === wordArray.length - 1) {
                    if (elementIndex === $elements.length - 1) {
                        nodes.push(glue(0, linebreak.infinity, 0));
                        nodes.push(penalty(0, -linebreak.infinity, 1));
                    }
                } else {
                    nodes.push(glue(space.width, space.stretch, space.shrink));
                }
            });
        });

        console.log("lineLength", lineLength);

        // Perform the line breaking. Repeat the line breaking at most three
        // times and increase the tolerance each time.
        var tolerance = 1;

        do {
            breaks = linebreak(nodes, [lineLength],
                               //lineLengths.length ? lineLengths : [lineLength],
                               {tolerance: tolerance});
        } while (!breaks && ++tolerance < 4);

        // TODO: the space.{width,stretch,shrink} properties are measured by
        // the paragraph's style. These properties do not necessary fit the
        // style of the paragraph's child elements.
        var style = $paragraph.css(['font-family', 'font-size',
                                    'font-weight', 'font-style',
                                    'padding', 'margin']);

        var space = {};
        space.width = measureHTML('&nbsp;', style);
        space.stretch = (space.width * 3) / 6;
        space.shrink = (space.width * 3) / 9;

        var lineStart = 0;

        // Build lines from the line breaks found.
        for (i = 1; i < breaks.length; i += 1) {
            var point = breaks[i].position,
                r = breaks[i].ratio;

            for (var j = lineStart; j < nodes.length; j += 1) {
                // After a line break, we skip any nodes unless they are boxes
                // or forced breaks.
                if (nodes[j].type === 'box' || (nodes[j].type === 'penalty' &&
                            nodes[j].penalty === -linebreak.infinity)) {
                    lineStart = j;
                    break;
                }
            }
            lines.push({ratio: r, nodes: nodes.slice(lineStart, point + 1), position: point});
            lineStart = point;
        }

        lines.forEach(function (line, lineIndex, lineArray) {
            var indent = false,
                spaces = 0,
                totalAdjustment = 0,
                wordSpace = line.ratio * (line.ratio < 0 ? space.shrink : space.stretch),
                integerWordSpace = Math.round(wordSpace),
                adjustment = wordSpace - integerWordSpace,
                integerAdjustment = adjustment < 0 ? Math.floor(adjustment) : Math.ceil(adjustment),
                tmp = [];

            // Iterate over the nodes in each line and build a temporary array
            // containing just words, spaces, and soft-hyphens.
            line.nodes.forEach(function (n, index, array) {
                if (n.type === 'box') {
                    // // normal boxes
                    // if (n.value !== '') {
                        var html = buildHTMLNode(n);

                        if (tmp.length !== 0 && tmp[tmp.length - 1] !== '&nbsp;') {
                            tmp[tmp.length - 1] += html;
                        } else {
                            tmp.push(html);
                        }
                    // // empty boxes (indentation for example)
                    // } else {
                    //     output.push('<span style="margin-left: 30px;"></span>');
                    // }
                } else if (n.type === 'glue') {
                    // glue inside a line
                    if (index !== array.length - 1) {
                        tmp.push('&nbsp;');
                        spaces += 1;
                    // glue at the end of a line
                    } else {
                        tmp.push(' ');
                    }
                } else if (n.type === 'penalty') {
                    // hyphenated word at the end of a line
                    if (n.penalty === hyphenPenalty && index === array.length - 1) {
                        tmp.push('&shy;');
                    // Remove trailing space at the end of a paragraph
                    } else if (index === array.length - 1 && tmp[tmp.length - 1] === '&nbsp;') {
                        tmp.pop();
                    }
                }
            });

            totalAdjustment = Math.round(adjustment * spaces);

            // If the line ends at a soft hyphen we need to do something
            // special as Webkit doesn't properly handle
            // <span>hy&shy;</span><span>phen</span>.
            if (tmp[tmp.length - 1] === '&shy;') {
                if (totalAdjustment !== 0) {
                    output.push('<span style="word-spacing: ' + (integerWordSpace + integerAdjustment) + 'px;">' + (carryOver ? carryOver : '') + tmp.slice(0, Math.abs(totalAdjustment) * 2).join('') + '</span>');
                    output.push('<span style="word-spacing: ' + integerWordSpace + 'px;">' + tmp.slice((Math.abs(totalAdjustment) * 2), -2).join('') + '</span>');
                } else {
                    output.push('<span style="word-spacing: ' + integerWordSpace + 'px;">' + (carryOver ? carryOver : '') + tmp.slice(0, -2).join('') + "</span>");
                }
                carryOver = tmp.slice(-2).join('');
            } else {
                if (totalAdjustment !== 0) {
                    output.push('<span style="word-spacing: ' + (integerWordSpace + integerAdjustment) + 'px;">' + (carryOver ? carryOver : '') + tmp.slice(0, Math.abs(totalAdjustment) * 2).join('') + '</span>');
                    output.push('<span style="word-spacing: ' + integerWordSpace + 'px;">' + tmp.slice(Math.abs(totalAdjustment) * 2).join('') + '</span>');
                } else {
                    output.push('<span style="word-spacing: ' + integerWordSpace + 'px;">' + (carryOver ? carryOver : '') + tmp.join('') + "</span>");
                }
                carryOver = null;
            }
        });

        console.log('output', output);

        $paragraph.empty();
        $paragraph.append(output.join(''));
        //currentWidth = lineLength;

        //lineLengths = lineLengths.slice(lines.length);

        console.log('nodes', nodes);
        console.log('breaks', breaks);
        console.log('lines', lines);
    }

    $('.typeset').each(function () {
        $(this).find(justifyElements.join(',')).each(justifyParagraph);
    });
});
});
