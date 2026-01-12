wait_for_url() {
  local url="$1"
  local attempts="${2:-30}"
  local i=1
  while [[ "${i}" -le "${attempts}" ]]; do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}
