const { networkConfig } = require("./helper-hardhat-config");
const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const { chainId } = network.config;
  const { ethUsdPriceFeed } = networkConfig[chainId];
  // when going for localhost or hardhat network we want to use a mock
  const fundMe = await deploy("FundMe", {
    from: deployer,
    args: [ethUsdPriceFeedn], // put price feed address,
    log: true,
  });
};
