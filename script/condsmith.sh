#!/bash/sh

npx ts-node src/index.ts $1 && sh script/forging.sh "$1" && echo -e "\e[34mcondsmith is done.\e[0m"
