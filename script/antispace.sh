#!/bin/bash

in_namespace=0

while IFS= read -r line; do
  if [[ $line =~ ^namespace[[:space:]] ]]; then
    in_namespace=1
    echo "$line"
    continue
  fi

  if [[ $in_namespace -eq 1 ]]; then
    if [[ $line =~ ^\} ]]; then
      in_namespace=0
      echo "$line"
      continue
    fi

    echo "$line" | sed 's/^    //'
  else
    echo "$line"
  fi
done < "$1"
