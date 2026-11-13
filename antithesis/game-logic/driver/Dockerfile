# Build context: the repository root.
# hegeltest 0.4.3 ships wheels for CPython 3.11-3.14 only
FROM python:3.14-slim-trixie
RUN apt-get update && apt-get install -y --no-install-recommends curl jq && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir hegeltest==0.4.3 antithesis==0.4.1
WORKDIR /driver
COPY antithesis/game-logic/driver/workload.py /driver/
COPY antithesis/game-logic/driver/first_start_workload /opt/antithesis/test/v1/main/
RUN chmod 755 /opt/antithesis/test/v1/main/first_start_workload \
 && ln -s /driver /opt/antithesis/catalog
CMD ["python", "-u", "/driver/workload.py"]
