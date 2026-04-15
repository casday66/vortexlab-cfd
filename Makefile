CC ?= cc
CFLAGS ?= -O2 -std=c99
LDFLAGS ?= -lm

.PHONY: all demo test clean open-web

all: build/lbm2d

build/lbm2d: core/lbm2d.c
	mkdir -p build
	$(CC) $(CFLAGS) core/lbm2d.c $(LDFLAGS) -o build/lbm2d

demo: build/lbm2d
	mkdir -p docs/demo
	./build/lbm2d --nx 260 --ny 120 --steps 6000 --re 100 --u 0.045 --angle 0 --obstacle circle --output docs/demo/circle_re100_seeded
	python3 python/analyze_wake.py docs/demo/circle_re100_seeded_timeseries.csv --length 34.2 --velocity 0.045 --signal cl_proxy --smooth 101 --json docs/demo/circle_re100_seeded_analysis.json

test:
	python3 -m unittest discover -s tests -v
	node --check web/app.js
	node --check web/lbm.js
	node --check web/geometry.js
	node --check web/renderer.js
	node --check web/exporter.js
	node --check web/presets.js

open-web:
	open web/index.html

clean:
	rm -rf build

