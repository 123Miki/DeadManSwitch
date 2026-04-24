import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

const MIN_DELAY = 30 * 24 * 60 * 60;
const MAX_DELAY = 1095 * 24 * 60 * 60;
const FEE_HEIR_CHANGE = ethers.parseEther("0.001");
const DEPOSIT_AMOUNT = ethers.parseEther("1");
const DEPOSIT_FEE = DEPOSIT_AMOUNT * 10n / 10000n;
const NET_DEPOSIT = DEPOSIT_AMOUNT - DEPOSIT_FEE;

async function setUp() {
    let contract: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;
    [owner, heir, feeRecipient, stranger] = await ethers.getSigners();
    contract = await ethers.deployContract("DeadManSwitch", [
        owner.address,
        heir.address,
        MIN_DELAY,
        feeRecipient.address
    ], owner);
    return { contract, owner, heir, feeRecipient, stranger };
}

async function setUpWithDeposit() {
    let contract: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;
    ({ contract, owner, heir, feeRecipient, stranger } = await setUp());
    await contract.deposit({ value: DEPOSIT_AMOUNT });
    return { contract, owner, heir, feeRecipient, stranger };
}

async function setUpWithExpiredDelay() {
    let contract: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;
    ({ contract, owner, heir, feeRecipient, stranger } = await setUpWithDeposit());
    await networkHelpers.time.increase(MIN_DELAY + 1);
    return { contract, owner, heir, feeRecipient, stranger };
}

async function setUpExpiredNoFunds() {
    let contract: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;
    ({ contract, owner, heir, feeRecipient, stranger } = await setUp());
    await networkHelpers.time.increase(MIN_DELAY + 1);
    return { contract, owner, heir, feeRecipient, stranger };
}

//-----------------------------------
//-----DeadManSwitch Contract--------
//-----------------------------------
describe("DeadManSwitch", function () {
    let contract: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;

    //-----------------------------------
    //-----Constructor-------------------
    //-----------------------------------
    describe("constructor(address _owner, address payable _heir, uint96 _delay, address payable _feeRecipient)", function () {
        beforeEach(async () => {
            ({ contract, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUp));
        });

        it("Should set owner correctly", async function () {
            expect(await contract.owner()).to.equal(owner.address);
        });

        it("Should set heir correctly", async function () {
            expect(await contract.heir()).to.equal(heir.address);
        });

        it("Should set inactivityDelay correctly", async function () {
            expect(await contract.inactivityDelay()).to.equal(MIN_DELAY);
        });

        it("Should set feeRecipient correctly", async function () {
            expect(await contract.feeRecipient()).to.equal(feeRecipient.address);
        });

        it("Should set lastPing to block.timestamp on deployment", async function () {
            const lastPing = await contract.lastPing();
            const latest = BigInt(await networkHelpers.time.latest());
            expect(lastPing).to.equal(latest);
        });

        it("Should revert with ZeroAddress if _owner is zero", async function () {
            await expect(
                ethers.deployContract("DeadManSwitch", [ethers.ZeroAddress, heir.address, MIN_DELAY, feeRecipient.address], owner)
            ).to.be.revertedWithCustomError(contract, "ZeroAddress");
        });

        it("Should revert with ZeroAddress if _heir is zero", async function () {
            await expect(
                ethers.deployContract("DeadManSwitch", [owner.address, ethers.ZeroAddress, MIN_DELAY, feeRecipient.address], owner)
            ).to.be.revertedWithCustomError(contract, "ZeroAddress");
        });

        it("Should revert with ZeroAddress if _feeRecipient is zero", async function () {
            await expect(
                ethers.deployContract("DeadManSwitch", [owner.address, heir.address, MIN_DELAY, ethers.ZeroAddress], owner)
            ).to.be.revertedWithCustomError(contract, "ZeroAddress");
        });

        it("Should revert with InvalidDelay if _delay < MIN_DELAY", async function () {
            await expect(
                ethers.deployContract("DeadManSwitch", [owner.address, heir.address, MIN_DELAY - 1, feeRecipient.address], owner)
            ).to.be.revertedWithCustomError(contract, "InvalidDelay");
        });

        it("Should revert with InvalidDelay if _delay > MAX_DELAY", async function () {
            await expect(
                ethers.deployContract("DeadManSwitch", [owner.address, heir.address, MAX_DELAY + 1, feeRecipient.address], owner)
            ).to.be.revertedWithCustomError(contract, "InvalidDelay");
        });
    });

    //-----------------------------------
    //-----deposit()---------------------
    //-----------------------------------
    describe("deposit()", function () {
        beforeEach(async () => {
            ({ contract, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUp));
        });

        it("Should update contract balance with net amount", async function () {
            const before = await ethers.provider.getBalance(contract.target);
            await contract.deposit({ value: DEPOSIT_AMOUNT });
            const after = await ethers.provider.getBalance(contract.target);
            expect(after - before).to.equal(NET_DEPOSIT);
        });

        it("Should send fee to feeRecipient", async function () {
            const before = await ethers.provider.getBalance(feeRecipient.address);
            await contract.deposit({ value: DEPOSIT_AMOUNT });
            const after = await ethers.provider.getBalance(feeRecipient.address);
            expect(after - before).to.equal(DEPOSIT_FEE);
        });

        it("Should emit Deposited with net amount", async function () {
            await expect(contract.deposit({ value: DEPOSIT_AMOUNT }))
                .to.emit(contract, "Deposited")
                .withArgs(owner.address, NET_DEPOSIT);
        });

        it("Should allow multiple deposits", async function () {
            await contract.deposit({ value: DEPOSIT_AMOUNT });
            await contract.deposit({ value: DEPOSIT_AMOUNT });
            expect(await ethers.provider.getBalance(contract.target)).to.equal(NET_DEPOSIT * 2n);
        });

        it("Should allow anyone to deposit", async function () {
            const before = await ethers.provider.getBalance(contract.target);
            await contract.connect(stranger).deposit({ value: DEPOSIT_AMOUNT });
            const after = await ethers.provider.getBalance(contract.target);
            expect(after - before).to.equal(NET_DEPOSIT);
        });

        it("Should revert with NoFunds if msg.value is 0", async function () {
            await expect(contract.deposit({ value: 0 }))
                .to.be.revertedWithCustomError(contract, "NoFunds");
        });
    });

    //-----------------------------------
    //-----ping()------------------------
    //-----------------------------------
    describe("ping()", function () {
        beforeEach(async () => {
            ({ contract, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUp));
        });

        it("Should update lastPing", async function () {
            const initialPing = await contract.lastPing();
            await networkHelpers.time.increase(1000);
            await contract.ping();
            expect(await contract.lastPing()).to.be.gt(initialPing);
        });

        it("Should emit Pinged event", async function () {
            const nextTs = BigInt(await networkHelpers.time.latest()) + 1n;
            await networkHelpers.time.setNextBlockTimestamp(nextTs);
            await expect(contract.ping())
                .to.emit(contract, "Pinged")
                .withArgs(owner.address, nextTs);
        });

        it("Should revert with NotOwner if not owner", async function () {
            await expect(contract.connect(stranger).ping())
                .to.be.revertedWithCustomError(contract, "NotOwner");
        });
    });

    //-----------------------------------
    //-----setHeir()---------------------
    //-----------------------------------
    describe("setHeir(address payable _newHeir)", function () {
        beforeEach(async () => {
            ({ contract, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUp));
        });

        it("Should update heir", async function () {
            await contract.connect(owner).setHeir(stranger.address, { value: FEE_HEIR_CHANGE });
            expect(await contract.heir()).to.equal(stranger.address);
        });

        it("Should emit HeirChanged event", async function () {
            await expect(contract.connect(owner).setHeir(stranger.address, { value: FEE_HEIR_CHANGE }))
                .to.emit(contract, "HeirChanged")
                .withArgs(heir.address, stranger.address);
        });

        it("Should update lastPing", async function () {
            const initialPing = await contract.lastPing();
            await networkHelpers.time.increase(1000);
            await contract.connect(owner).setHeir(stranger.address, { value: FEE_HEIR_CHANGE });
            expect(await contract.lastPing()).to.be.gt(initialPing);
        });

        it("Should send fee to feeRecipient", async function () {
            const before = await ethers.provider.getBalance(feeRecipient.address);
            await contract.connect(owner).setHeir(stranger.address, { value: FEE_HEIR_CHANGE });
            const after = await ethers.provider.getBalance(feeRecipient.address);
            expect(after - before).to.equal(FEE_HEIR_CHANGE);
        });

        it("Should revert with ZeroAddress if _newHeir is zero", async function () {
            await expect(
                contract.connect(owner).setHeir(ethers.ZeroAddress, { value: FEE_HEIR_CHANGE })
            ).to.be.revertedWithCustomError(contract, "ZeroAddress");
        });

        it("Should revert with InsufficientFee if msg.value < FEE_HEIR_CHANGE", async function () {
            await expect(
                contract.connect(owner).setHeir(stranger.address, { value: FEE_HEIR_CHANGE - 1n })
            ).to.be.revertedWithCustomError(contract, "InsufficientFee");
        });

        it("Should refund surplus fee to sender", async function () {
            const overpay = FEE_HEIR_CHANGE + ethers.parseEther("0.5");
            const before = await ethers.provider.getBalance(feeRecipient.address);
            await contract.connect(owner).setHeir(stranger.address, { value: overpay });
            const after = await ethers.provider.getBalance(feeRecipient.address);
            expect(after - before).to.equal(FEE_HEIR_CHANGE);
        });

        it("Should revert with NotOwner if not owner", async function () {
            await expect(
                contract.connect(stranger).setHeir(stranger.address, { value: FEE_HEIR_CHANGE })
            ).to.be.revertedWithCustomError(contract, "NotOwner");
        });

        it("Should revert with SameHeir if _newHeir is current heir", async function () {
            await expect(
                contract.connect(owner).setHeir(heir.address, { value: FEE_HEIR_CHANGE })
            ).to.be.revertedWithCustomError(contract, "SameHeir");
        });
    });

    //-----------------------------------
    //-----setDelay()--------------------
    //-----------------------------------
    describe("setDelay(uint96 _newDelay)", function () {
        beforeEach(async () => {
            ({ contract, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUp));
        });

        it("Should update inactivityDelay", async function () {
            const newDelay = MIN_DELAY * 2;
            await contract.connect(owner).setDelay(newDelay);
            expect(await contract.inactivityDelay()).to.equal(newDelay);
        });

        it("Should emit DelayChanged event", async function () {
            const newDelay = MIN_DELAY * 2;
            await expect(contract.connect(owner).setDelay(newDelay))
                .to.emit(contract, "DelayChanged")
                .withArgs(MIN_DELAY, newDelay);
        });

        it("Should update lastPing", async function () {
            const initialPing = await contract.lastPing();
            await networkHelpers.time.increase(1000);
            await contract.connect(owner).setDelay(MIN_DELAY * 2);
            expect(await contract.lastPing()).to.be.gt(initialPing);
        });

        it("Should revert with InvalidDelay if _newDelay < MIN_DELAY", async function () {
            await expect(
                contract.connect(owner).setDelay(MIN_DELAY - 1)
            ).to.be.revertedWithCustomError(contract, "InvalidDelay");
        });

        it("Should revert with InvalidDelay if _newDelay > MAX_DELAY", async function () {
            await expect(
                contract.connect(owner).setDelay(MAX_DELAY + 1)
            ).to.be.revertedWithCustomError(contract, "InvalidDelay");
        });

        it("Should revert with NotOwner if not owner", async function () {
            await expect(
                contract.connect(stranger).setDelay(MIN_DELAY * 2)
            ).to.be.revertedWithCustomError(contract, "NotOwner");
        });
    });

    //-----------------------------------
    //-----claim()-----------------------
    //-----------------------------------
    describe("claim()", function () {
        beforeEach(async () => {
            ({ contract, owner, heir, feeRecipient, stranger } = await setUpWithExpiredDelay());
        });

        it("Should transfer all balance to heir", async function () {
            const before = await ethers.provider.getBalance(contract.target);
            await contract.connect(heir).claim();
            const after = await ethers.provider.getBalance(contract.target);
            expect(before).to.equal(NET_DEPOSIT);
            expect(after).to.equal(0n);
        });

        it("Should emit Claimed event", async function () {
            await expect(contract.connect(heir).claim())
                .to.emit(contract, "Claimed")
                .withArgs(heir.address, NET_DEPOSIT);
        });

        it("Should revert with NotHeir if not heir", async function () {
            await expect(contract.connect(stranger).claim())
                .to.be.revertedWithCustomError(contract, "NotHeir");
        });

        it("Should revert with NotYetExpired if delay not expired", async function () {
            ({ contract, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUpWithDeposit));
            await expect(contract.connect(heir).claim())
                .to.be.revertedWithCustomError(contract, "NotYetExpired");
        });

        it("Should revert with NoFunds if contract balance is 0", async function () {
            ({ contract, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUpExpiredNoFunds));
            await expect(contract.connect(heir).claim())
                .to.be.revertedWithCustomError(contract, "NoFunds");
        });
    });
});
