import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

const MIN_DELAY = 30 * 24 * 60 * 60;

async function setUp() {
    let factory: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;
    [owner, heir, feeRecipient, stranger] = await ethers.getSigners();
    factory = await ethers.deployContract("DeadManSwitchFactory", [feeRecipient.address], owner);
    return { factory, owner, heir, feeRecipient, stranger };
}

async function setUpWithSwitch() {
    let factory: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;
    ({ factory, owner, heir, feeRecipient, stranger } = await setUp());
    await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
    return { factory, owner, heir, feeRecipient, stranger };
}

//-----------------------------------
//-----DeadManSwitchFactory----------
//-----------------------------------
describe("DeadManSwitchFactory", function () {
    let factory: any;
    let owner: any, heir: any, feeRecipient: any, stranger: any;

    //-----------------------------------
    //-----Constructor-------------------
    //-----------------------------------
    describe("constructor(address payable _feeRecipient)", function () {
        beforeEach(async () => {
            ({ factory, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUp));
        });

        it("Should set feeRecipient correctly", async function () {
            expect(await factory.feeRecipient()).to.equal(feeRecipient.address);
        });

        it("Should revert with ZeroAddress if _feeRecipient is zero", async function () {
            await expect(
                ethers.deployContract("DeadManSwitchFactory", [ethers.ZeroAddress], owner)
            ).to.be.revertedWithCustomError(factory, "ZeroAddress");
        });
    });

    //-----------------------------------
    //-----createSwitch()----------------
    //-----------------------------------
    describe("createSwitch(address payable _heir, uint96 _delay)", function () {
        beforeEach(async () => {
            ({ factory, owner, heir, feeRecipient, stranger } = await networkHelpers.loadFixture(setUp));
        });

        it("Should deploy a new DeadManSwitch contract", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            const switchAddress = await factory.switches(owner.address);
            expect(switchAddress).to.not.equal(ethers.ZeroAddress);
        });

        it("Should register the switch in the mapping", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            const switchAddress = await factory.switches(owner.address);
            expect(switchAddress).to.not.equal(ethers.ZeroAddress);
            expect(await factory.switches(stranger.address)).to.equal(ethers.ZeroAddress);
        });

        it("Should set the caller as owner of the deployed switch", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            const switchAddress = await factory.switches(owner.address);
            const deployedSwitch = await ethers.getContractAt("DeadManSwitch", switchAddress);
            expect(await deployedSwitch.owner()).to.equal(owner.address);
        });

        it("Should set the correct heir on the deployed switch", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            const switchAddress = await factory.switches(owner.address);
            const deployedSwitch = await ethers.getContractAt("DeadManSwitch", switchAddress);
            expect(await deployedSwitch.heir()).to.equal(heir.address);
        });

        it("Should set the correct delay on the deployed switch", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            const switchAddress = await factory.switches(owner.address);
            const deployedSwitch = await ethers.getContractAt("DeadManSwitch", switchAddress);
            expect(await deployedSwitch.inactivityDelay()).to.equal(MIN_DELAY);
        });

        it("Should set the factory feeRecipient on the deployed switch", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            const switchAddress = await factory.switches(owner.address);
            const deployedSwitch = await ethers.getContractAt("DeadManSwitch", switchAddress);
            expect(await deployedSwitch.feeRecipient()).to.equal(feeRecipient.address);
        });

        it("Should emit SwitchCreated event", async function () {
            const tx = await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            const switchAddress = await factory.switches(owner.address);
            await expect(tx)
                .to.emit(factory, "SwitchCreated")
                .withArgs(owner.address, switchAddress);
        });

        it("Should allow different users to each create their own switch", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            await factory.connect(stranger).createSwitch(heir.address, MIN_DELAY);
            expect(await factory.switches(owner.address)).to.not.equal(ethers.ZeroAddress);
            expect(await factory.switches(stranger.address)).to.not.equal(ethers.ZeroAddress);
            expect(await factory.switches(owner.address)).to.not.equal(await factory.switches(stranger.address));
        });

        it("Should revert with AlreadyExists if owner already has a switch", async function () {
            await factory.connect(owner).createSwitch(heir.address, MIN_DELAY);
            await expect(
                factory.connect(owner).createSwitch(heir.address, MIN_DELAY)
            ).to.be.revertedWithCustomError(factory, "AlreadyExists");
        });

        it("Should revert with ZeroAddress if _heir is zero", async function () {
            await expect(
                factory.connect(owner).createSwitch(ethers.ZeroAddress, MIN_DELAY)
            ).to.be.revertedWithCustomError(factory, "ZeroAddress");
        });

        it("Should revert with InvalidDelay if _delay < MIN_DELAY", async function () {
            const switchFactory = await ethers.getContractFactory("DeadManSwitch");
            await expect(
                factory.connect(owner).createSwitch(heir.address, MIN_DELAY - 1)
            ).to.be.revertedWithCustomError(switchFactory, "InvalidDelay");
        });
    });
});
