const hre = require("hardhat");

async function main() {
  console.log("Deploying TimelineAnchor contract...");

  const TimelineAnchor = await hre.ethers.getContractFactory("TimelineAnchor");
  const contract = await TimelineAnchor.deploy();

  await contract.deployed(); // <-- ethers v5

  console.log("Contract deployed to:", contract.address);
  console.log("\nAdd to your .env file:");
  console.log(`ETHEREUM_CONTRACT_ADDRESS=${contract.address}`);

  const fs = require("fs");
  fs.writeFileSync(
    ".deployed-contract",
    `DEPLOYED_CONTRACT_ADDRESS=${contract.address}\nNETWORK=${hre.network.name}\n`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
