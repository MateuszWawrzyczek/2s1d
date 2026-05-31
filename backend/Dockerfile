ARG PYTHON_VERSION=3.12-trixie-slim

FROM astral/uv:python${PYTHON_VERSION} AS base
WORKDIR /app
RUN addgroup --gid 1000 --system app && \
    adduser --system --uid 1000 --ingroup app app && \
    chown -R app:app /app
ENV UV_SYSTEM_PYTHON=1

FROM base AS deps
COPY pyproject.toml uv.lock  .
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    uv pip install -r pyproject.toml
RUN chown -R app:app /app

FROM deps AS dev-deps
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    uv pip install --group dev -r pyproject.toml
RUN chown -R app:app /app

FROM dev-deps AS development
COPY --chown=app:app . .
EXPOSE 8000
USER app
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
