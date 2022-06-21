const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");
describe("FundMe", () => {
  let fundMe;
  let deployer;
  const sendValue = ethers.utils.parseEther("1"); // 1e18 wei
  beforeEach(async function () {
    deployer = (await getNamedAccounts()).deployer;
    // runs all deploy folder
    await deployments.fixture(["all"]);
    fundMe = await ethers.getContract("FundMe", deployer);
    mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  describe("constructor", () => {
    it("should set the aggregator address correctly", async () => {
      const aggregatorAddress = await fundMe.priceFeed();
      assert.equal(aggregatorAddress, mockV3Aggregator.address);
    });
  });

  describe("fund", () => {
    it("should fail if you dont send enough ETH", async () => {
      await expect(fundMe.fund()).to.be.revertedWith(
        "You need to spend more ETH!"
      );
    });
    it("should update the funded amount data structure", async () => {
      await fundMe.fund({ value: sendValue });
      const fundedAmount = await fundMe.addressToAmountFunded(deployer);
      assert.equal(fundedAmount.toString(), sendValue.toString());
    });
    it("should add funder to funders array", async () => {
      await fundMe.fund({ value: sendValue });
      const funder = await fundMe.funders("0");
      assert.equal(funder, deployer);
    });
  });
  describe("withdraw", () => {
    beforeEach(async () => {
      await fundMe.fund({ value: sendValue });
    });
    it("withdraw ETH from a single funder", async () => {
      // Arrange
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      // Act
      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );
    });
    it("should allow us to withdraw with multiple funders", async () => {
      // Arrange
      // find all accounts
      const accounts = await ethers.getSigners();
      // fund with accounts from 1 to 6
      for (let i = 1; i < 6; i++) {
        // we need to connect with different accounts to contract otherwise deployer would call
        const fundMeConnectedContract = await fundMe.connect(accounts[i]);
        await fundMeConnectedContract.fund({ value: sendValue });
      }
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );
      // Act
      const txResponse = await fundMe.withdraw();
      const txReceipt = await txResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = txReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);
      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

      // Assert
      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );
      // Make sure that the funders are reset properly
      await expect(fundMe.funders(0)).to.be.reverted;
      for (let i = 1; i < 6; i++) {
        assert.equal(
          await fundMe.addressToAmountFunded(accounts[i].address),
          0
        );
      }
    });
    it("should only allow the owner to withdraw", async () => {
      const accounts = await ethers.getSigners();
      const fundMeConnectedContract = await fundMe.connect(accounts[1]);
      await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
        "FUNDME_NotOwner"
      );
    });
  });
});
