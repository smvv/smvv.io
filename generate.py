#!/usr/bin/env python
"""
Generate an index file of all blog posts. Extract the page titles from the
markdown files and create an unordered list of HTML anchors to each blog post.

Usage: ./generate.py FILE

where FILE is for example "index.md".
"""

import glob

blog_post_files = glob.glob('./posts/*.md')
blog_post_files.sort()

recent_posts_tag = '%recent_posts%'
all_posts_tag = '%all_posts%'


def extract_post(filename):
    """
    Return the page title and URL from a markdown file.
    """
    title = None

    for line in file(filename):
        line = line.strip()

        if line.startswith('%'):
            title = line[line.find('%') + 1:].strip()
            break

    url = filename.replace('.md', '.html')
    return url, title


def generate_post_list(post_files):
    """
    Return a list tuples where each tuple consists of the blog post title and
    URL to the blog post.
    """

    return [extract_post(f) for f in post_files]


def generate_posts_html(posts):
    """
    Return an unordered list of HTML anchors where each anchors points to a
    blog post.
    """

    items = []

    for post in posts:
        items.append('<li><a href="%s">%s</a></li>' % post)

    return '<ul>\n' + '\n'.join(items) + '\n</ul>'


def generate_output(input_file, post_files):
    posts = generate_post_list(post_files)

    out = file(input_file).read()

    recent_posts = reversed(posts[:5])
    posts = reversed(posts)

    out = out.replace(recent_posts_tag, generate_posts_html(recent_posts))
    out = out.replace(all_posts_tag, generate_posts_html(posts))

    return out

if __name__ == '__main__':
    import sys
    print generate_output(sys.argv[1], blog_post_files)
