#!/usr/bin/env python
import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pentesthub.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Django not installed. Run `uv sync` inside apps/api or rebuild the api container."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
