const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")


developmentChains.includes(network.name) ? describe.skip
    : describe("Lottery Unit Tests", function () {
        let Lottery, deployer, entranceFee

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer
            //get contracts
            Lottery = await ethers.getContract('Lottery', deployer)
            entranceFee = await Lottery.getEntranceFee()
        })
        describe("fulfillRandomWords", function () {
            it('works with live Chainlink Keepers and Chainlink VRF, we get a random winner', async function () {
                // entering the Lottery
                console.log("Setting up test...")
                const startingTimeStamp = await Lottery.getLatestTimeStamp()
                const accounts = await ethers.getSigners()

                console.log("Setting up Listener...")


                await new Promise(async (resolve, reject) => {

                    Lottery.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!")
                        try {
                            // add asserts here
                            const recentWinner = await Lottery.getRecentWinner()
                            const lotteryState = await Lottery.getLotteryState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const endingTimeStamp = await Lottery.getLatestTimeStamp()

                            await expect(Lottery.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(lotteryState, 0)
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add(entranceFee).toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                            resolve()
                        } catch (error) {
                            console.log(error)
                            reject(error)
                        }
                    })
                    // Then entering the raffle
                    console.log("Entering Raffle...")
                    const transaction = await lottery.enterLottery({ value: entranceFee })
                    await transaction.wait(1)
                    console.log("wait.....")
                    const winnerStartingBalance = await accounts[0].getBalance()
                })

            })

        })
    })