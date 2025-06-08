#!/bin/bash
# -*- coding: utf-8 -*-

dir="$1"
if [[ ! -d "$dir" ]]; then
  echo "Error: '$dir' is not a directory"
  exit 1
fi

find "$dir" -type f -name '*.ts' | while read -r file; do
  echo "🔨 $file"
  ./script/antispace.sh "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done
