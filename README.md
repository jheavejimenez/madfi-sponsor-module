# madfi-sponsor-module
A [Lens](https://lens.dev) Reference Module that enables real-time monetization of your content.

## setup
first - clone and install `lens-protocol` repo, then create a symlink
```
git clone git@github.com:aave/lens-protocol.git
npm link
```

then clone this repo and link
```
nvm use
yarn
npm link lens-protocol
```

## compile contracts
```
yarn compile
```

## deploy contracts
```
yarn deploy:mumbai
```
