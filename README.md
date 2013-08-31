# Installation

1. Install [npm][npm]:
  1. From [here][npm download].
  2. Or `apt-get install nodejs` (Linux)
  3. Or `brew install npm` (Mac OS X with [Homebrew][homebrew] installed).
2. `cd` to this (the project) directory.
3. Run `npm install`.

# Running

1. Run `grunt` on the command line. This starts a server at localhost:8000.
2. Visit http://localhost:8000/ to see a list of documents.

# Development

`grunt` with no arguments copies / transcodes sources into the `build` directory, runs a server at port 8000,
watches files, and copies / transcodes them again if they change.

Run `grunt build` to force a re-build and copy of all files from `public` into the `build` directory.

Optional: `grunt server` runs a [LiveReload server][LiveRelad]. Install and activate the [LiveReload extension (Safari, Chrome, or Firefox)][LiveReload extensions] to reload the web page when the sources are changed.

# Deployment

1. Create and configure the `release` directory: `git clone -b gh-pages git@github.com:osteele/ffmachine.git release`
2. Run `grunt deploy`.
3. Visit http://osteele.github.io/ffmachine/.

[npm]: https://npmjs.org/
[npm download]: http://nodejs.org/download/
[homebrew]: http://brew.sh/
[LiveReload]: http://livereload.com/
[LiveReload extensions]: http://feedback.livereload.com/knowledgebase/articles/86242-how-do-i-install-and-use-the-browser-extensions-
[grunt-github-pages]: https://github.com/thanpolas/grunt-github-pages