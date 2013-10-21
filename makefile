SHELL := /bin/bash

PANDOC_TEMPLATE := template.html5

PANDOC := pandoc
PANDOC_FLAGS := --normalize --smart --standalone --toc \
	--highlight-style pygments --template $(PANDOC_TEMPLATE)

PANDOC_DEPS := $(PANDOC_TEMPLATE)

TYPESET_DEPS := \
	typeset/linked-list.js \
	typeset/linebreak.js \
	typeset/hypher.js \
	typeset/en-us.js \
	typeset/adjust.js \

.PHONY: all

POSTS := \
	$(patsubst %.md,static/%.html,$(wildcard posts/*.md))

PAGES := \
	static/index.html \
	static/blog.html \
	static/about.html \
	static/cv.html \
	$(POSTS)

DIRS := \
	static/posts

STATIC_FILES := \
	static/typeset.js \

all: $(PAGES) $(STATIC_FILES)
$(PAGES): $(PANDOC_DEPS)

$(POSTS): PANDOC_FLAGS += -V comments

$(DIRS):
	mkdir -p $(DIRS)

static/index.html: index.md
static/blog.html: blog.md

static/index.html static/blog.html: $(POSTS) ./generate.py | $(DIRS)
	./generate.py $(@F:.html=.md) \
		| $(PANDOC) $(PANDOC_FLAGS) -f markdown -t html5 -o $@

static/%.html: %.md | $(DIRS)
	$(PANDOC) $(PANDOC_FLAGS) -f markdown -t html5 -o $@ $<

static/typeset.js: $(TYPESET_DEPS)
	cat $(TYPESET_DEPS) > $@
