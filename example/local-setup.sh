#!/bin/bash
# Configures tooling, downloading as required

denoversion=2.0.6

if [ -n "$ZSH_VERSION" ]; then
  # zsh is the default shell on osx
  rootdir="$( cd -- "${0:a:h}" >/dev/null 2>&1 ; pwd -P )"
else
   # assume Bash
  rootdir="$( cd -- "$(dirname "$BASH_SOURCE")" >/dev/null 2>&1 ; pwd -P )"
fi

localdir=$rootdir/.local
localbin=$localdir/bin

pathadd() {
    PATH="$1${PATH:+":$PATH"}"
}

pathadd $localbin


if [ "`uname`" = "Darwin" ]; then
  platform=osx
  if [ "`arch`" = "arm64" ]; then
    arch=aarch64-apple-darwin
  else
    arch=x86_64-apple-darwin
  fi
  cachedir=$HOME/Library/Caches/localtools
elif [ "$(expr substr $(uname -s) 1 5)" = "Linux" ]; then
  platform=linux
  arch=x86_64-unknown-linux-gnu
  cachedir=$HOME/.cache/localtools
else
  echo "ERROR: Unable to download tooling for platform"
  return 1
fi

#  Fetch deno if not already downloaded
release=https://github.com/denoland/deno/releases/download/v$denoversion/deno-$arch.zip
download=$cachedir/deno-v$denoversion-$arch.zip
if [ ! -f "$download" ]; then
  echo "fetching $release ..."
  mkdir -p $(dirname $download)
  (curl --silent --location $release --output $download || (echo "download failed"; exit 1))
fi

#  Install deno
if [ ! -f "$localdir/bin/deno" ]; then
  echo "unzipping $download ..."
  mkdir -p $localbin
  (cd $localbin; unzip -q -o $download)
fi

# Now use a deno script to install all other local tooling
deno run --quiet --allow-all $rootdir/local-setup.ts $denoversion $localdir
source $localdir/bin/local-env.sh

