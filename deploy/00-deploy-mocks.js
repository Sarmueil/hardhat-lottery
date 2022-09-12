const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")



module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    // const chainId = network.config.chainId

    // "250000000000000000"

    const BASE_FEE = ethers.utils.parseEther('0.25') // 0.25 is this the premium in LINK?
    const GAS_PRICE_LINK = 1e9 // link per gas, is this the gas lane? // 0.000000001 LINK per gas

    const args = [BASE_FEE, GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)) {
        log('local network detected, deploying .....')
        await deploy('VRFCoordinatorV2Mock', {
            from: deployer,
            log: true,
            args: args,
        })
        log('mock deployed.......')
        log('------------------------------------')
    }
}

module.exports.tags = ["all", "mocks"]