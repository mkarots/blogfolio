---
title: "Writing a tiny shell in C — Part 1: the loop that runs your programs"
description: "Build tinysh from scratch: a Read-Eval-Print loop in C that reads input, tokenizes commands, and runs programs with fork, execvp, and wait."
pubDate: 2026-07-07
project: 'tinysh'
---

*This is Part 1 of a series where we build a small shell in C from scratch. By the end of this post, you'll have a working shell that can run any program on your system. Later parts add builtins, redirection, chaining, and pipelines.*

Every developer has used a shell in their career. A shell is a program that lets you run other programs. It sits between you and the operating system kernel — the part that actually creates processes, opens files, and moves bytes around. I've always been curious about how one works, so I sat down and wrote a small one. This series explains how, one feature at a time.

The shell we're building is called **tinysh**. We'll grow it from a 20-line loop into something that handles `ls -la | grep tiny | wc -l` — but we start simple.

> 💡 A **terminal** is the *window* a shell runs in. On macOS you might use iTerm or the Terminal app, running a shell like `zsh` or `bash` inside it. The terminal draws text and captures keystrokes; the shell interprets and runs what you type. This series is about the shell, not the terminal.

## The mental model

A shell does two things in a loop: it **understands** what you typed, then **runs** it. This loop is the classic **REPL** (Read-Eval-Print-Loop) pattern. In a shell, "understand" covers Read + Eval, and "Print" is outsourced — the programs it launches write their own output straight to the terminal.

1. **Understand.** The user types a line. The shell reads it and figures out which command to run.
2. **Run.** The shell spawns a process to run that command and waits for it to finish.

```
   ╔═══════ 1. UNDERSTAND ═══════╗   ╔═══ 2. RUN ═══╗
   ║  READ ──▶ PARSE ──▶ tokens  ║──▶║ fork/exec/wait║──▶ output
   ╚═════════════════════════════╝   ╚══════════════╝
              ▲                              │
              └────────── loop ◀─────────────┘
                         │
                    EOF ─┘─▶ exit
```

That's the entire shell. Everything we add in later parts — builtins, redirection, pipes — is detail layered onto these two steps. Let's build the loop.

## Reading a line of input

First, we need a line of text from the user. C's `getline` is perfect for this: it allocates a buffer for us, so we never have to guess how long the input might be.

```c
char *read_line(void) {
    char *line = NULL;
    size_t cap = 0;
    ssize_t n = getline(&line, &cap, stdin);

    if (n < 0) {                  // EOF or error
        free(line);
        return NULL;
    }
    if (n > 0 && line[n - 1] == '\n')
        line[n - 1] = '\0';       // strip the trailing newline

    return line;
}
```

Two things to notice:

- **`getline` allocates for us.** Given a `NULL` pointer and `0` capacity, it `malloc`s a buffer big enough for the whole line — no fixed-size buffer, no overflow. We own that memory, so we must `free` it later.
- **`NULL` means "stop."** When the user presses `Ctrl-D` (or piped input runs out), `getline` returns `-1`. We turn that into `NULL`, which our loop will treat as the signal to exit.

## Understanding the line: tokens

A command like `ls -la` is just a string. To run it, we need to split it into an array of words — `argv` — because that's exactly what the system call for launching a program expects:

```c
["ls", "-la", NULL]
```

For now we'll split on spaces. (In a later part we'll handle operators like `|` and `>`; today, plain words are enough.)

```c
#define MAX_ARGS 64

void tokenize(char *line, char *argv[]) {
    int argc = 0;
    char *token = strtok(line, " \t");
    while (token != NULL && argc < MAX_ARGS - 1) {
        argv[argc++] = token;
        token = strtok(NULL, " \t");
    }
    argv[argc] = NULL;            // execvp needs a NULL-terminated array
}
```

The trailing `NULL` matters: it's how the launcher knows where the argument list ends.

## Running the program: fork, exec, wait

Here's the heart of it. To run a program, a Unix shell performs a little dance with three system calls:

- **`fork`** clones the current process into two: a *parent* (the shell) and a *child*. They're identical except for the return value — the child gets `0`, the parent gets the child's process ID.
- **`execvp`** replaces the child's program image with the requested command. It searches your `$PATH` to find the executable (the `p` in `execvp`), so we can type `ls` instead of `/bin/ls`.
- **`wait`** makes the parent pause until the child finishes.

```c
void run_command(char *argv[]) {
    pid_t pid = fork();

    if (pid == -1) {              // fork failed
        perror("fork");
        return;
    }

    if (pid == 0) {               // child: become the requested program
        execvp(argv[0], argv);
        // execvp only returns if it FAILED (e.g. command not found)
        perror(argv[0]);
        exit(EXIT_FAILURE);
    }

    // parent: wait for the child to finish
    int status;
    waitpid(pid, &status, 0);
}
```

The surprising part for most people is that **everything after `execvp` in the child is error-handling code.** When `execvp` succeeds, the child *becomes* `ls` — our code is gone, replaced by the `ls` program. So if execution continues past `execvp`, it can only mean the call failed (usually a typo'd command), and we print an error and exit the child.

Meanwhile the parent sits in `waitpid` until the child exits, then loops back for the next command.

## Putting it together: the loop

```c
int main(void) {
    while (1) {
        printf("> ");
        fflush(stdout);                 // make sure the prompt shows immediately

        char *line = read_line();       // READ
        if (line == NULL) break;        // Ctrl-D → exit

        char *argv[MAX_ARGS];
        tokenize(line, argv);           // UNDERSTAND

        if (argv[0] != NULL)            // skip empty lines
            run_command(argv);          // RUN

        free(line);
    }
    return 0;
}
```

## Build and run

Put all four snippets — the includes below, then `read_line`, `tokenize`, `run_command`, and `main` — into a single file called `main.c`. The functions must appear *before* `main` (or be forward-declared) so the compiler knows about them.

Start the file with the headers our system calls need:

```c
#include <stdio.h>      // printf, perror, getline
#include <stdlib.h>     // free, exit, EXIT_FAILURE
#include <string.h>     // strtok
#include <unistd.h>     // fork, execvp
#include <sys/wait.h>   // waitpid
```

Now add a `makefile` next to it:

```makefile
CC = cc
CFLAGS = -Wall -Wextra -Werror -g
TARGET = tinysh

all: $(TARGET)

$(TARGET): main.c
	$(CC) $(CFLAGS) -o $@ main.c

clean:
	rm -f $(TARGET)
```

The flags are worth keeping: `-Wall -Wextra -Werror` turn warnings into errors, which catches a lot of beginner C mistakes before they become runtime bugs.

Build and launch it:

```bash
make        # compiles ./tinysh
./tinysh    # starts the shell
```

You should land at a `> ` prompt. Try a few commands:

```bash
> ls -la
total 80
drwxr-xr-x  5 you  staff   160 Jun 28 21:00 .
-rw-r--r--  1 you  staff   812 Jun 28 20:55 main.c
-rw-r--r--  1 you  staff   118 Jun 28 20:58 makefile
-rwxr-xr-x  1 you  staff  33920 Jun 28 21:00 tinysh
> echo hello world
hello world
> date
Sun Jun 28 21:01:33 BST 2026
```

In about 40 lines of C, we have something that runs any program on the machine.

## The catch: try `cd`

Now type this:

```bash
> cd /tmp
> pwd
/Users/you/Projects/tinysh
```

The directory didn't change. That's not a bug in our code exactly — it's a consequence of the `fork`/`exec` model. `cd` ran in a *child* process, changed *that child's* directory, and then the child exited. The shell's own directory never moved.

Some commands have to run *inside the shell itself*. Those are called **builtins**, and they're the subject of Part 2 — where we'll also start turning our flat `argv` into a proper parsed command.

> 📦 **Get the code.** A working shell at the end of this chapter is tagged [`part-1-repl`](https://github.com/mkarots/tinysh/tree/part-1-repl) in the repo:
>
> ```bash
> git clone https://github.com/mkarots/tinysh.git
> cd tinysh
> git checkout part-1-repl
> make && ./tinysh
> ```
>
> Note: the repo organizes the code into multiple files as the series grows, so it's a bit more structured than the single `main.c` above — but it does exactly the same thing at this tag.

*Next: Part 2 — Builtins, and why `cd` is special.*
