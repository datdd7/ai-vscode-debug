# Makefile for Engine Cooling System ECU (Debug Training)

CC       = gcc
CFLAGS   = -Wall -Wextra -g -O0 -std=c99 -Wno-unused-variable -Wno-unused-parameter
LDFLAGS  =

# Project root
PROJDIR  = .
BUILDDIR = build

# Source directories
SRCDIRS  = platform mcal ecual services rte app utils

# Find all .c files
SOURCES  = $(wildcard $(PROJDIR)/main.c) \
           $(foreach dir,$(SRCDIRS),$(wildcard $(PROJDIR)/$(dir)/*.c))

# Object files
OBJECTS  = $(patsubst $(PROJDIR)/%.c,$(BUILDDIR)/%.o,$(SOURCES))

# Target
TARGET   = $(BUILDDIR)/cooling_ecu

.PHONY: all clean run debug count

all: $(TARGET)

$(TARGET): $(OBJECTS)
	@mkdir -p $(dir $@)
	$(CC) $(OBJECTS) -o $@ $(LDFLAGS)
	@echo "Build complete: $@"

$(BUILDDIR)/%.o: $(PROJDIR)/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -I$(PROJDIR) -c $< -o $@

clean:
	rm -rf $(BUILDDIR)
	@echo "Clean complete"

run: $(TARGET)
	@echo "Running ECU simulation..."
	@./$(TARGET)

debug: $(TARGET)
	gdb -tui ./$(TARGET)

# Count project files
count:
	@echo "Total source files:"
	@find . -name "*.c" -o -name "*.h" | grep -v build | wc -l
	@echo "C source files (.c):"
	@find . -name "*.c" | grep -v build | wc -l
	@echo "Header files (.h):"
	@find . -name "*.h" | grep -v build | wc -l
