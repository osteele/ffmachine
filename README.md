# Flip-flop Machine Simulator

This project is a simulator for a particular machine configuration built with DEC Laboratory Digital Modules.

The simulator is running at osteele.github.io/ffmachine/.
You can build and simulate your own machine configuration there and see machines that others have built.

This simulator simulates the following modules:

- Type 110 Diode Gate, containing two diode gates and two clamp loads
- Type 201 Flip-Flop, containing one flip-flop and two inverters
- Type 401 Clock
- Type 402 Clock
- Type 602 Pulse Amplifier

References:

- [DEC Digital Logic Handbook (PDF)][handbook:2nd-edition], 2nd edition
- [DEC Digital Logic Handbook (PDF)][handbook:3rd-edition], 3nd edition
- [Type 201 Flip Flop][history:flip-flop] at the Computer History Museum
- [Type 3602 Pulse Amplifier][history:pulse-amplifier] at the Computer History Museum
- [PDP-1][history:pdp-1], including images and talks, at the Computer History Museum.
(The PDP-1 was also built from these modules.)


## Local Installation

1. Install [npm][npm]:
  1. From [here][npm download].
  2. Or `apt-get install nodejs` (Linux)
  3. Or `brew install npm` (Mac OS X with [Homebrew][homebrew] installed).
2. `cd` to this (the project) directory.
3. Run `npm install`.

## Running Locally

1. Run `grunt` on the command line. This starts a server at localhost:8000.
2. Visit http://localhost:8000/ to see a list of documents.

## Development

`grunt` with no arguments copies / transcodes sources into the `build` directory, runs a server at port `8000`,
watches files, and copies / transcodes them again if they change.

`grunt build` forces a re-build and copy of all files from `app` into the `build` directory.

`grunt server` runs a [LiveReload server][LiveReload]. Install and activate the [LiveReload extension (Safari, Chrome, or Firefox)][LiveReload extensions] to reload the web page when the sources are changed.

## Deployment

1. Create and configure the `release` directory: `git clone -b gh-pages git@github.com:osteele/ffmachine.git release`.
You only need to do this once.
2. Run `grunt deploy`.
3. Visit http://osteele.github.io/ffmachine/.

## Credits

This project uses the following tools and libraries:

- [AngularJS](http://angularjs.org/) application framework and data binding
- [Bootstrap](http://getbootstrap.com/) for HTML components and CSS default styles
- [CDNJS](http://cdnjs.com/) for hosting vendored assets
- [Coffeescript](http://coffeescript.org/) compiles to Javascript
- [D3](http://d3js.org/) for binding to the graphics and wiring interaction
- [Font Awesome](http://fortawesome.github.io/Font-Awesome/) icons
- [Firebase](https://www.firebase.com/) for data storage and synchronization, and for Persona intergration
- [Github Buttons](https://github.com/mdo/github-buttons)
- [Github Pages](http://pages.github.com/) for hosting
- [Google Fonts](http://www.google.com/fonts) for web fonts
- [Grunt](http://gruntjs.com/) build system
- [Jade](http://jade-lang.com/) compiles to HTML
- [Mozilla Persona](https://www.mozilla.org/en-US/persona/) for login and authentication
- [Sass](http://sass-lang.com/) compiles to CSS
- Additional Grunt components listed in the [package.json](./package.json) file.

[npm]: https://npmjs.org/
[npm download]: http://nodejs.org/download/
[homebrew]: http://brew.sh/
[LiveReload]: http://livereload.com/
[LiveReload extensions]: http://feedback.livereload.com/knowledgebase/articles/86242-how-do-i-install-and-use-the-browser-extensions-
[grunt-github-pages]: https://github.com/thanpolas/grunt-github-pages

[handbook:2nd-edition]: http://ed-thelen.org/comp-hist/DECbuildingBlockLogic2ndEd.pdf
[handbook:3rd-edition]: http://www.soemtron.org/downloads/decinfo/logichandbookmar61.pdf
[wiki:modules]: https://en.wikipedia.org/wiki/Digital_Equipment_Corporation#Digital_modules
[history:flip-flop]: http://www.computerhistory.org/collections/catalog/102633142
[history:pulse-amplifier]: http://www.computerhistory.org/collections/catalog/102696323
[history:pdp-1]: http://pdp-1.computerhistory.org/pdp-1/?f=theme&s=2
