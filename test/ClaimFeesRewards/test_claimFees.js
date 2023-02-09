const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { abi } = require("../../artifacts/contracts/DBXenERC20.sol/DBXenERC20.json")
const { abiLib } = require("../../artifacts/contracts/MathX.sol/MathX.json")
const { NumUtils } = require("../utils/NumUtils.ts");

describe("Test claim fee functionality", async function() {
    let DBXenContract, DBXENViewContract, DBXenERC20, XENContract, aliceInstance, bobInstance, deanInstance;
    let alice, bob, carol, dean;
    beforeEach("Set enviroment", async() => {
        [alice, bob, carol, dean, messageReceiver, feeReceiver] = await ethers.getSigners();

        const lib = await ethers.getContractFactory("MathX");
        const library = await lib.deploy();

        const xenContract = await ethers.getContractFactory("MockXENCrypto", {
            libraries: {
                MathX: library.address
            }
        });

        XENContract = await xenContract.deploy();
        await XENContract.deployed();

        const Deb0x = await ethers.getContractFactory("DBXen");
        DBXenContract = await Deb0x.deploy(ethers.constants.AddressZero, XENContract.address);
        await DBXenContract.deployed();

        const Deb0xViews = await ethers.getContractFactory("DBXenViews");
        DBXENViewContract = await Deb0xViews.deploy(DBXenContract.address);
        await DBXENViewContract.deployed();

        const dbxAddress = await DBXenContract.dxn()
        DBXenERC20 = new ethers.Contract(dbxAddress, abi, hre.ethers.provider)

        aliceInstance = XENContract.connect(alice);
        bobInstance = XENContract.connect(bob);
        deanInstance = XENContract.connect(dean);
        carolInstance = XENContract.connect(carol);
    });

    it("Claim fees", async() => {
        const lib = await ethers.getContractFactory("MathX");
        const libraryLocal = await lib.deploy();

        const xenContractLocal = await ethers.getContractFactory("MockXENCrypto", {
            libraries: {
                MathX: libraryLocal.address
            }
        });

        XENContractLocal = await xenContractLocal.deploy();
        await XENContractLocal.deployed();

        aliceInstance = XENContractLocal.connect(alice);
        bobInstance = XENContractLocal.connect(bob);
        deanInstance = XENContractLocal.connect(dean);
        carolInstance = XENContractLocal.connect(carol);

        await aliceInstance.claimRank(100);
        await bobInstance.claimRank(100);
        await carolInstance.claimRank(100);
        await deanInstance.claimRank(100);
        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 102 * 24])
        await hre.ethers.provider.send("evm_mine")
        await aliceInstance.claimMintReward();
        await bobInstance.claimMintReward();
        await carolInstance.claimMintReward();
        await deanInstance.claimMintReward();

        const DBXenLocal = await ethers.getContractFactory("DBXen");
        DBXenContractLocal = await DBXenLocal.deploy(ethers.constants.AddressZero, XENContractLocal.address);
        await DBXenContractLocal.deployed();

        const Deb0xViewsLocal = await ethers.getContractFactory("DBXenViews");
        DBXENViewContractLocal = await Deb0xViewsLocal.deploy(DBXenContractLocal.address);
        await DBXENViewContractLocal.deployed();

        const dbxAddress = await DBXenContractLocal.dxn()
        DBXenERC20 = new ethers.Contract(dbxAddress, abi, hre.ethers.provider)

        await XENContractLocal.connect(alice).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(alice).burnBatch(1, { value: ethers.utils.parseEther("1") })

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        let unclaimedFeesAlice = await DBXENViewContractLocal.getUnclaimedFees(alice.address);

        await DBXenContractLocal.connect(alice).claimFees();
        const feesClaimed = await DBXenContractLocal.queryFilter("FeesClaimed")
        let totalFeesClaimed = BigNumber.from("0")
        for (let entry of feesClaimed) {
            totalFeesClaimed = totalFeesClaimed.add(entry.args.fees)
        }
        expect(unclaimedFeesAlice).to.equal(totalFeesClaimed);

        await XENContractLocal.connect(bob).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(bob).burnBatch(9900, { value: ethers.utils.parseEther("100") })

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24])
        await hre.ethers.provider.send("evm_mine")

        let unclaimedFeesBob = await DBXENViewContractLocal.getUnclaimedFees(bob.address);
        await DBXenContractLocal.connect(bob).claimFees();
        const feesClaimedForBob = await DBXenContractLocal.queryFilter("FeesClaimed")
        let totalFeesClaimedForBob = BigNumber.from("0")
        for (let entry of feesClaimedForBob) {
            totalFeesClaimedForBob = totalFeesClaimedForBob.add(entry.args.fees)
        }
        expect(unclaimedFeesBob).to.equal(BigNumber.from(totalFeesClaimedForBob).sub(BigNumber.from(unclaimedFeesAlice)));

        await XENContractLocal.connect(bob).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(bob).burnBatch(9900, { value: ethers.utils.parseEther("100") })

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24]);
        await hre.ethers.provider.send("evm_mine");

        await XENContractLocal.connect(alice).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(alice).burnBatch(9900, { value: ethers.utils.parseEther("100") })
        await XENContractLocal.connect(bob).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(bob).burnBatch(9900, { value: ethers.utils.parseEther("100") })

        await XENContractLocal.connect(dean).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(dean).burnBatch(9900, { value: ethers.utils.parseEther("100") })

        await XENContractLocal.connect(carol).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(carol).burnBatch(9900, { value: ethers.utils.parseEther("100") })

        await hre.ethers.provider.send("evm_increaseTime", [60 * 60 * 24]);
        await hre.ethers.provider.send("evm_mine");

        let unclaimedFeesBobCurrent = await DBXENViewContractLocal.getUnclaimedFees(bob.address);
        let unclaimedFeesAliceCurrent = await DBXENViewContractLocal.getUnclaimedFees(alice.address);
        let unclaimedFeesDeanCurrent = await DBXENViewContractLocal.getUnclaimedFees(dean.address);
        let unclaimedFeesCarolCurrent = await DBXENViewContractLocal.getUnclaimedFees(carol.address);

        await DBXenContractLocal.connect(alice).claimFees();
        await DBXenContractLocal.connect(bob).claimFees();
        await DBXenContractLocal.connect(dean).claimFees();
        await DBXenContractLocal.connect(carol).claimFees();

        let feeForActualCycle = BigNumber.from(unclaimedFeesBobCurrent).add(BigNumber.from(unclaimedFeesAliceCurrent)).add(BigNumber.from(unclaimedFeesDeanCurrent)).add(BigNumber.from(unclaimedFeesCarolCurrent))

        const feesClaimed2 = await DBXenContractLocal.queryFilter("FeesClaimed")
        let totalFeesClaimedForAll = BigNumber.from("0")
        for (let entry of feesClaimed2) {
            totalFeesClaimedForAll = totalFeesClaimedForAll.add(entry.args.fees)
        }
        expect(BigNumber.from(totalFeesClaimedForAll).sub(BigNumber.from(totalFeesClaimedForBob))).to.equal(feeForActualCycle);

        await XENContractLocal.connect(alice).approve(DBXenContractLocal.address, ethers.utils.parseEther("500000"))
        await DBXenContractLocal.connect(alice).burnBatch(9900, { value: ethers.utils.parseEther("100") })

    });


});