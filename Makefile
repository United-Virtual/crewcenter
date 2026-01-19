REGISTRY = ghcr.io
OWNER    = united-virtual
IMAGE    = crewcenter
TAG      := $(shell date +%y%m%d)

TAGGED_IMAGE = $(REGISTRY)/$(OWNER)/$(IMAGE):$(TAG)
LATEST_IMAGE = $(REGISTRY)/$(OWNER)/$(IMAGE):latest

ifneq (,$(wildcard .env))
include .env
export
endif

# Default target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  make build        Build Docker image"
	@echo "  make login        Login to ghcr.io"
	@echo "  make upload       Upload docker image to ghcr.io"

# Build image locally
.PHONY: build
build:
	docker build -t $(TAGGED_IMAGE) .

login:
	@if [ -z "$(GHCR_USERNAME)" ] || [ -z "$(GHCR_TOKEN)" ]; then \
		echo "❌ GHCR_USERNAME or GHCR_TOKEN not set"; \
		exit 1; \
	fi
	@echo "$(GHCR_TOKEN)" | docker login ghcr.io -u "$(GHCR_USERNAME)" --password-stdin

# Load image on server
.PHONY: upload
upload:
	docker tag $(TAGGED_IMAGE) $(LATEST_IMAGE)
	docker push $(LATEST_IMAGE)
