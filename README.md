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

## local lens protocol setup
1. clone [my forked lens repo](https://github.com/imthatcarlos/lens-protocol/tree/feature/madfi-sponsor-module) (branch: `feature/madfi-sponsor-module`)

2. spin up the docker container with their contracts env, and run hardhat node in there
```
export USERID=root && docker-compose build && docker-compose -p 8545:8545 run contracts-env bash

...

npx hardhat node
```

3. find the docker container name with `docker ps` and run another bash session
```
export USERID=root && docker exec -it <docker-container-name> bash
```

4. deploy their contracts `npm run compile && npm run full-deploy-local`

6. come back here and deploy the superfluid protocol + sponsor module `yarn compile && npx hardhat deploy-superfluid --network docker && yarn deploy:docker`

7. back in the docker container, whitelist the deployed sponsor module with `npx hardhat whitelist-sponsor-module --network localhost`

8. assuming that worked, you have to unpause the lens protocol with `npx hardhat unpause --network localhost`

9. back in this repo, you can create a profile (make sure to set some ENV variables defined in `tasks/create-profile.js`  by running `npx hardhat create-profile --network docker`. also create another profile for the sponsor by changing the handle and using the signer for `sponsor` (line 24)

10. finally, create a post and attach our deployed `SponsorModule` as the reference module `npx hardhat create-post --network docker`

11. create a money stream between the sponsor and the user for the user's latest publication, and then the sponsor attempts to mirror it `npx hardhat create-mirror --network docker`
