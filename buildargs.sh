#!/bin/bash

args=()
while IFS= read -r line; do
  # Skip empty lines and lines starting with '#'
  if [[ ! $line || $line == \#* ]]; then
    continue
  fi
  args+=(--build-arg "$line")
done < .env

echo ${args[@]}
