FROM python:3.11-slim-trixie

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Check the assembled image, including inherited Debian packages.
RUN set -eu; \
    packages="$(dpkg-query -W -f='${Package}\n')"; \
    if command -v gs >/dev/null 2>&1 || printf '%s\n' "$packages" | grep -Eq '^(ghostscript($|-)|libgs[0-9]+($|-)|libgs-common$)'; then \
        echo 'Unexpected Ghostscript installation' >&2; exit 1; \
    fi

EXPOSE 8000

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8000}\""]
