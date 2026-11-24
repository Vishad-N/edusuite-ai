# Backup and restore tool (plan §11, Phase 6; DN-063): pg_dump 17 + restic + rclone.
# Debian bookworm packages; the Postgres image already carries the matching client tools.
FROM postgres:17
RUN apt-get update \
 && apt-get install -y --no-install-recommends restic rclone ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY backup.sh restore.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh
WORKDIR /work
ENTRYPOINT ["/bin/bash"]
CMD ["/usr/local/bin/backup.sh"]
