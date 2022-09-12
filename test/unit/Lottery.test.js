
const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")


!developmentChains.includes(network.name) ? describe.skip
    : describe("Lottery Unit Tests", function () {
        let lottery, Lottery, vrfCoordinatorV2Mock, deployer, entranceFee, interval
        const chainId = network.config.chainId
        beforeEach(async function () {
            const { deployer } = await getNamedAccounts()
            //get all accounts ===> does the same thing as getNamedAccounts
            accounts = await ethers.getSigners()   
            //deploy all contracts
            await deployments.fixture('all')
            //get contracts
            Lottery = await ethers.getContract('Lottery', deployer)
            vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock', deployer)
            entranceFee = await Lottery.getEntranceFee()
            interval = await Lottery.getInterval()
        })

        describe('Constructor', function () {
            it('initializes the Lottery contact correctly', async function () {
                const lotteryState = await Lottery.getLotteryState()
                assert.equal(lotteryState.toString(), '0');
                assert.equal(interval.toString(), networkConfig[chainId]['interval']);
            })
        })
        describe('Enter Lottery', function () {
            it('revert when the entrance fee is low', async function () {
                await expect(Lottery.enterLottery()).to.be.revertedWith("Raffle__NotEnoughFunds")
            })
            //to know if players are recorded as they enter. the plan is to equate the deployer which is the player[0] to players array
            it('records when the player enters a lottery', async function () {
                //enter lottery 
                await Lottery.enterLottery({ value: entranceFee })
                deployer = (await getNamedAccounts()).deployer
                const getRecordedPlayer = await Lottery.getPlayers(0)
                assert.equal(getRecordedPlayer, deployer)
            })
            //emits an event when players enter lottery 
            it('emmits an event on enter', async function () {
                await expect(Lottery.enterLottery({ value: entranceFee })).to.emit(Lottery, 'LotteryEnter')
            })
            it('does not allow entrance when raffle is calculating', async function () {
                await Lottery.enterLottery({ value: entranceFee })
                //increase time so that the lottery state can be closed
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                //perform upkeep and pretend to be chainlink keepers
                await Lottery.performUpkeep([])
                await expect(Lottery.enterLottery({ value: entranceFee })).to.be.revertedWith("Raffle__NotOpen")
            })
        })

        describe('Check Upkeep', function () {
            it('should return false when no Eth is been sent', async function () {
                //increase time so that the lottery state can be closed
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep([])
                assert(!upkeepNeeded)
            })
            it('should return false if the lottery is not open', async function () {
                await Lottery.enterLottery({ value: entranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                await Lottery.performUpkeep([])
                const lotteryState = await Lottery.getLotteryState()
                const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep([])
                assert.equal(lotteryState.toString(), 1)
                assert.equal(upkeepNeeded, false)
            })
            it("returns false if enough time hasn't passed", async () => {
                await Lottery.enterLottery({ value: entranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() - 5])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x")
                assert(!upkeepNeeded)
            })
            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await Lottery.enterLottery({ value: entranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await Lottery.callStatic.checkUpkeep("0x")
                assert(upkeepNeeded)
            })
        })

        describe('performUpkeep', function () {
            it('can only run if check upkeep is true', async function () {
                await Lottery.enterLottery({ value: entranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const transaction = await Lottery.performUpkeep([])
                assert(transaction)
            })
            it('reverts if checkup is false', async function () {
                await expect(Lottery.performUpkeep([])).to.be.revertedWith("Lottery__UpkeepNotNeeded")
            })
            it('updates the raffle state and emits a requestId', async function () {
                await Lottery.enterLottery({ value: entranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const transaction = await Lottery.performUpkeep([])
                const transactionReceipt = await transaction.wait(1)
                const requestId = transactionReceipt.events[1].args.requestId
                const lotteryState = await Lottery.getLotteryState()
                assert(requestId.toNumber() > 0)
                assert(lotteryState.toString() == 1)
            })
        })

        describe("fulfillRandomWords", function () {
            beforeEach(async () => {
                await Lottery.enterLottery({ value: entranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
            })
            it('can only be called after performupkeep', async function () {
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, Lottery.address)).to.be.revertedWith('nonexistent request')
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, Lottery.address)).to.be.revertedWith('nonexistent request')
            })
            it('picks a winner ,reset the lottery and withdraw the money', async function () {
                const additionalEntrances = 3 // to test with
                const startingIndex = 1 //since index 0 is the deployer
                // const accounts = ethers.getSigners()
                for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                    // Returns a new instance of the Raffle contract connected to player
                    lottery = Lottery.connect(accounts[i])
                    await lottery.enterLottery({ value: entranceFee })
                }
                // stores starting timestamp (before we fire our event)
                const startingTimeStamp = await Lottery.getLatestTimeStamp()

                await new Promise(async (resolve, reject) => {
                    Lottery.once('WinnerPicked', async () => {
                        console.log('event found!!!!!!')
                        try {
                            const recentWinner = await Lottery.getRecentWinner()
                            const lotteryState = await Lottery.getLotteryState()
                            const endingTimeStamp = await Lottery.getLatestTimeStamp()
                            const numPlayers = await Lottery.getNumPlayers()
                            const winnerEndingBalance = await accounts[1].getBalance()
                            assert.equal(numPlayers.toString(), 0)
                            assert.equal(lotteryState.toString(), 0)
                            await expect(Lottery.getPlayers(0)).to.be.reverted
                            assert(endingTimeStamp > startingTimeStamp)
                            assert.equal(recentWinner.toString(), accounts[1].address)
                            assert.equal(
                                winnerEndingBalance.toString(), 
                                winnerStartingBalance 
                                    .add(
                                        entranceFee
                                            .mul(additionalEntrances)
                                            .add(entranceFee)
                                    )
                                    .toString()
                            )
                        } catch (err) {
                            reject(err)
                        }
                        resolve()
                    })
                    const transaction = await Lottery.performUpkeep([]);
                    const transactionReceipt = await transaction.wait(1)
                    const winnerStartingBalance = await accounts[1].getBalance()
                    await vrfCoordinatorV2Mock.fulfillRandomWords(transactionReceipt.events[1].args.requestId, Lottery.address)
                })
            })
        })
    })